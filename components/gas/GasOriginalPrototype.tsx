'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import {
  beginCommit,
  beginResolution,
  beginValidation,
  canBlindRetry,
  canIgnite,
  createReadyState,
  failBeforeSubmission,
  isActionPending,
  lockWager,
  repeatSameConfiguration,
  resolveRound,
  updateReadyDraft,
  type GameResult,
  type GasOriginalState,
  type PresentationMode,
  type ReadyState,
  type WagerAsset,
  type WagerDraft,
  type GasGameMode,
} from '@/lib/project-gas/game-state';
import { GasGauge } from './GasGauge';
import { RiskSelector } from './RiskSelector';
import { WagerComposer } from './WagerComposer';
import shared from './gas-ui.module.css';
import local from './GasOriginalPrototype.module.css';

const PRESENTATION: readonly { value: PresentationMode; label: string }[] = [
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'instant', label: 'Instant' },
  { value: 'reduced-motion', label: 'Reduced' },
];

const PROTOTYPE_RESULTS = [
  { outcome: 'win' as const, multiplier: 1.4 },
  { outcome: 'loss' as const, multiplier: 0 },
  { outcome: 'win' as const, multiplier: 2.2 },
  { outcome: 'push' as const, multiplier: 1 },
] as const;

function draftForState(state: GasOriginalState): WagerDraft {
  if (state.phase === 'ready' || state.phase === 'validating' || state.phase === 'committing') return state.draft;
  if (state.phase === 'locked' || state.phase === 'resolving' || state.phase === 'result') return state.wager;
  if (state.draft) return state.draft;
  if (state.wager) return state.wager;
  return createReadyState().draft;
}

function accountLabel(user: ReturnType<typeof usePrivy>['user']) {
  if (!user) return 'Prototype account';
  if (user.email?.address) return user.email.address;
  if (user.twitter?.username) return `@${user.twitter.username}`;
  if (user.wallet?.address) return `${user.wallet.address.slice(0, 6)}…${user.wallet.address.slice(-4)}`;
  return 'GAS account';
}

function statusLabel(state: GasOriginalState) {
  if (state.phase === 'ready') return 'Ready';
  if (state.phase === 'result') return 'Settled';
  if (state.phase === 'failed') return 'Needs attention';
  if (state.phase === 'validating' || state.phase === 'committing') return 'Locking';
  if (state.phase === 'locked') return 'Locked';
  return 'Resolving';
}

function makePrototypeResult(draft: WagerDraft, index: number, roundId: string): GameResult {
  const sample = PROTOTYPE_RESULTS[index % PROTOTYPE_RESULTS.length];
  const wager = Number(draft.amount || 0);
  const payout = Number.isFinite(wager) ? wager * sample.multiplier : 0;
  return {
    outcome: sample.outcome,
    multiplier: sample.multiplier.toFixed(2),
    payoutAmount: payout.toFixed(2),
    payoutAsset: draft.asset,
    settledAt: new Date().toISOString(),
    verificationHref: `/round/${roundId}`,
  };
}

function financialDelta(state: Extract<GasOriginalState, { phase: 'result' }>) {
  const wager = Number(state.wager.amount || 0);
  const payout = Number(state.result.payoutAmount || 0);
  const delta = payout - wager;
  if (!Number.isFinite(delta)) return '—';
  const prefix = delta > 0 ? '+' : '';
  return `${prefix}${delta.toFixed(2)} ${state.wager.asset}`;
}

export function GasOriginalPrototype() {
  const { ready: authReady, authenticated, login, user } = usePrivy();
  const [state, setState] = useState<GasOriginalState>(() => createReadyState());
  const [presentation, setPresentation] = useState<PresentationMode>('cinematic');
  const [copyLabel, setCopyLabel] = useState('Copy result');
  const roundCounter = useRef(0);
  const pendingTimers = useRef<number[]>([]);

  useEffect(() => () => {
    pendingTimers.current.forEach((timer) => window.clearTimeout(timer));
    pendingTimers.current = [];
  }, []);

  const schedule = (fn: () => void, delayMs: number) => {
    const timer = window.setTimeout(fn, delayMs);
    pendingTimers.current.push(timer);
  };

  const startPrototypeRound = (readyState: ReadyState) => {
    if (!canIgnite(readyState)) {
      setState(failBeforeSubmission(readyState.draft, 'validation-failed', 'Enter a wager amount greater than zero.'));
      return;
    }

    pendingTimers.current.forEach((timer) => window.clearTimeout(timer));
    pendingTimers.current = [];

    roundCounter.current += 1;
    const roundNumber = roundCounter.current;
    const createdAt = new Date();
    const requestId = `prototype-intent-${roundNumber}`;
    const roundId = `prototype-round-${roundNumber}`;
    const expiresAt = new Date(createdAt.getTime() + 15_000).toISOString();

    const validating = beginValidation(readyState);
    const committing = beginCommit(validating, requestId, createdAt.toISOString(), expiresAt);
    const locked = lockWager(committing, {
      roundId,
      submittedAt: new Date().toISOString(),
    });
    const resolving = beginResolution(locked);
    const result = resolveRound(resolving, makePrototypeResult(readyState.draft, roundNumber - 1, roundId));

    const speed = presentation === 'cinematic'
      ? { commit: 100, locked: 260, resolving: 520, result: 1350 }
      : presentation === 'instant'
        ? { commit: 20, locked: 45, resolving: 75, result: 180 }
        : { commit: 20, locked: 45, resolving: 75, result: 220 };

    setState(validating);
    schedule(() => setState(committing), speed.commit);
    schedule(() => setState(locked), speed.locked);
    schedule(() => setState(resolving), speed.resolving);
    schedule(() => setState(result), speed.result);
  };

  const handlePrimary = () => {
    if (state.phase === 'result') {
      startPrototypeRound(repeatSameConfiguration(state));
      return;
    }
    if (state.phase === 'ready') {
      startPrototypeRound(state);
      return;
    }
    if (state.phase === 'failed' && canBlindRetry(state)) {
      startPrototypeRound(createReadyState(state.draft));
    }
  };

  const updateDraft = (patch: Partial<WagerDraft>) => {
    if (state.phase === 'ready') {
      setState(updateReadyDraft(state, patch));
      return;
    }
    if (state.phase === 'result') {
      setState(updateReadyDraft(repeatSameConfiguration(state), patch));
      return;
    }
    if (state.phase === 'failed' && canBlindRetry(state)) {
      setState(updateReadyDraft(createReadyState(state.draft), patch));
    }
  };

  const handleModeChange = (mode: GasGameMode) => updateDraft({ mode });
  const handleAmountChange = (amount: string) => updateDraft({ amount });
  const handleAssetChange = (asset: WagerAsset) => updateDraft({ asset });

  const copyPrototypeResult = async () => {
    if (state.phase !== 'result') return;
    const text = `GAS UX prototype — ${state.wager.mode} · ${state.result.outcome.toUpperCase()} · ${state.result.multiplier}×. No real wager or payout occurred.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyLabel('Copied');
      schedule(() => setCopyLabel('Copy result'), 1400);
    } catch {
      setCopyLabel('Copy unavailable');
    }
  };

  const draft = draftForState(state);
  const pending = isActionPending(state);
  const editable = state.phase === 'ready' || state.phase === 'result' || (state.phase === 'failed' && canBlindRetry(state));
  const primaryDisabled = pending || (state.phase === 'failed' && !canBlindRetry(state));
  const primaryLabel = state.phase === 'result'
    ? 'IGNITION AGAIN'
    : state.phase === 'failed'
      ? canBlindRetry(state) ? 'TRY AGAIN' : 'RECONCILING'
      : state.phase === 'ready'
        ? 'IGNITION'
        : state.phase === 'resolving'
          ? 'RESOLVING'
          : 'LOCKING';

  const statusClass = state.phase === 'failed'
    ? shared.statusFailed
    : pending
      ? shared.statusPending
      : shared.statusReady;

  return (
    <>
      <div className={`${shared.prototypeBanner} ${local.compactBanner}`} role="note">
        <span>UI prototype · no funds move · no live RNG</span>
        <span className={`${shared.prototypePill} ${local.compactBannerPill}`}>Phase 7</span>
      </div>

      <section className={`${shared.accountStrip} ${local.compactAccount}`} aria-label="Prototype GAS account">
        <div>
          <div className={shared.eyebrow}>{authenticated ? 'GAS account' : 'Explore before sign-in'}</div>
          <div className={`${shared.balance} ${local.compactBalance}`}>1,240.00 GAS <span className={shared.eyebrow}>DEMO</span></div>
          <div className={`${shared.balanceSub} ${local.compactBalanceSub}`}>{authenticated ? accountLabel(user) : 'Prototype balance · not connected to funds'}</div>
        </div>
        {!authenticated ? (
          <button
            type="button"
            className={local.accountAction}
            disabled={!authReady}
            onClick={() => login()}
          >
            {authReady ? 'Enter GAS' : 'Loading'}
          </button>
        ) : (
          <div className={`${shared.statusPill} ${local.compactStatus} ${shared.statusReady}`}>
            <span className={shared.statusDot} /> Account ready
          </div>
        )}
      </section>

      <section className={`${shared.gameCard} ${local.compactGame}`} aria-labelledby="gas-original-heading">
        <div className={`${shared.gameHeader} ${local.compactGameHeader}`}>
          <div>
            <h1 id="gas-original-heading" className={`${shared.gameTitle} ${local.compactGameTitle}`}>GAS ORIGINAL</h1>
            <p className={`${shared.gameDescription} ${local.compactGameDescription}`}>Choose risk. Choose amount. IGNITION. Protocol detail stays one layer deeper.</p>
          </div>
          <div className={`${shared.statusPill} ${local.compactStatus} ${statusClass}`}>
            <span className={shared.statusDot} /> {statusLabel(state)}
          </div>
        </div>

        <GasGauge state={state} compact />

        <RiskSelector value={draft.mode} disabled={!editable} compact onChange={handleModeChange} />

        <WagerComposer
          draft={draft}
          disabled={!editable}
          compact
          onAmountChange={handleAmountChange}
          onAssetChange={handleAssetChange}
        />

        <div className={local.presentationRow}>
          <span className={shared.eyebrow}>Presentation</span>
          <div className={local.presentationButtons} role="group" aria-label="Result presentation mode">
            {PRESENTATION.map((option) => (
              <button
                key={option.value}
                type="button"
                className={local.presentationButton}
                aria-pressed={presentation === option.value}
                disabled={pending}
                onClick={() => setPresentation(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {state.phase === 'failed' ? (
          <div className={shared.errorNotice} role="alert">
            <span className={shared.errorTitle}>Money state first</span>
            <strong>{state.fundsMoved === 'no' ? 'No funds moved.' : state.fundsMoved === 'yes' ? 'A wager exists.' : 'Wager status is unknown.'}</strong>
            <span>{state.message}</span>
          </div>
        ) : null}

        {state.phase === 'result' ? (
          <div className={local.resultSummary} aria-live="polite">
            <div>
              <div className={shared.eyebrow}>Prototype account delta</div>
              <div className={`${local.resultAmount} ${state.result.outcome === 'win' ? local.resultPositive : state.result.outcome === 'loss' ? local.resultNegative : local.resultNeutral}`}>
                {financialDelta(state)}
              </div>
            </div>
            <div className={local.resultMeta}>
              {state.wager.mode}<br />{state.wager.amount} {state.wager.asset}<br />illustrative result
            </div>
          </div>
        ) : null}

        <button
          type="button"
          className={`${shared.ignition} ${local.compactIgnition}`}
          disabled={primaryDisabled}
          onClick={handlePrimary}
          aria-describedby="gas-ignition-trust"
        >
          {primaryLabel}
        </button>

        <div id="gas-ignition-trust" className={local.trustLine}>
          <span className={local.trustStrong}>{presentation === 'instant' ? 'Instant presentation' : presentation === 'reduced-motion' ? 'Reduced motion' : 'Cinematic presentation'}</span>
          <span>Canonical state stays explicit</span>
        </div>

        {state.phase === 'result' ? (
          <div className={shared.resultRail}>
            <button type="button" className={shared.secondaryButton} onClick={copyPrototypeResult}>{copyLabel}</button>
            <Link className={shared.secondaryButton} href={state.result.verificationHref}>Verify round</Link>
          </div>
        ) : (
          <p className={local.prototypeNote}>Prototype outcomes are illustrative UX data only. Final payout curves, RNG and bankroll settlement are not represented here.</p>
        )}
      </section>
    </>
  );
}
