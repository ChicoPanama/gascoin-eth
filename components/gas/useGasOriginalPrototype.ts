'use client';

import { useEffect, useRef, useState } from 'react';
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
  type GasGameMode,
  type GasOriginalState,
  type PresentationMode,
  type ReadyState,
  type WagerAsset,
  type WagerDraft,
} from '@/lib/project-gas/game-state';

export const PRESENTATION_OPTIONS: readonly { value: PresentationMode; label: string }[] = [
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

const PRESENTATION_SPEED: Record<PresentationMode, { commit: number; locked: number; resolving: number; result: number }> = {
  cinematic: { commit: 100, locked: 260, resolving: 520, result: 1350 },
  instant: { commit: 20, locked: 45, resolving: 75, result: 180 },
  'reduced-motion': { commit: 20, locked: 45, resolving: 75, result: 220 },
};

function draftForState(state: GasOriginalState): WagerDraft {
  if (state.phase === 'ready' || state.phase === 'validating' || state.phase === 'committing') return state.draft;
  if (state.phase === 'locked' || state.phase === 'resolving' || state.phase === 'result') return state.wager;
  if (state.draft) return state.draft;
  if (state.wager) return state.wager;
  return createReadyState().draft;
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

function resultDelta(state: Extract<GasOriginalState, { phase: 'result' }>) {
  const wager = Number(state.wager.amount || 0);
  const payout = Number(state.result.payoutAmount || 0);
  const delta = payout - wager;
  if (!Number.isFinite(delta)) return '—';
  return `${delta > 0 ? '+' : ''}${delta.toFixed(2)} ${state.wager.asset}`;
}

export function gasOriginalStatusLabel(state: GasOriginalState) {
  if (state.phase === 'ready') return 'Ready';
  if (state.phase === 'result') return 'Settled';
  if (state.phase === 'failed') return 'Needs attention';
  if (state.phase === 'validating' || state.phase === 'committing') return 'Locking';
  if (state.phase === 'locked') return 'Locked';
  return 'Resolving';
}

export function useGasOriginalPrototype() {
  const [state, setState] = useState<GasOriginalState>(() => createReadyState());
  const [presentation, setPresentation] = useState<PresentationMode>('cinematic');
  const [copyLabel, setCopyLabel] = useState('Copy result');
  const roundCounter = useRef(0);
  const pendingTimers = useRef(new Set<number>());

  const clearTimers = () => {
    pendingTimers.current.forEach((timer) => window.clearTimeout(timer));
    pendingTimers.current.clear();
  };

  const schedule = (fn: () => void, delayMs: number) => {
    const timer = window.setTimeout(() => {
      pendingTimers.current.delete(timer);
      fn();
    }, delayMs);
    pendingTimers.current.add(timer);
  };

  useEffect(() => clearTimers, []);

  const startRound = (readyState: ReadyState) => {
    if (!canIgnite(readyState)) {
      setState(failBeforeSubmission(readyState.draft, 'validation-failed', 'Enter a wager amount greater than zero.'));
      return;
    }

    clearTimers();
    roundCounter.current += 1;

    const roundNumber = roundCounter.current;
    const createdAt = new Date();
    const requestId = `prototype-intent-${roundNumber}`;
    const roundId = `prototype-round-${roundNumber}`;
    const expiresAt = new Date(createdAt.getTime() + 15_000).toISOString();

    const validating = beginValidation(readyState);
    const committing = beginCommit(validating, requestId, createdAt.toISOString(), expiresAt);
    const locked = lockWager(committing, { roundId, submittedAt: new Date().toISOString() });
    const resolving = beginResolution(locked);
    const result = resolveRound(resolving, makePrototypeResult(readyState.draft, roundNumber - 1, roundId));
    const speed = PRESENTATION_SPEED[presentation];

    setState(validating);
    schedule(() => setState(committing), speed.commit);
    schedule(() => setState(locked), speed.locked);
    schedule(() => setState(resolving), speed.resolving);
    schedule(() => setState(result), speed.result);
  };

  const handlePrimary = () => {
    if (state.phase === 'result') return startRound(repeatSameConfiguration(state));
    if (state.phase === 'ready') return startRound(state);
    if (state.phase === 'failed' && canBlindRetry(state)) return startRound(createReadyState(state.draft));
  };

  const updateDraft = (patch: Partial<WagerDraft>) => {
    if (state.phase === 'ready') return setState(updateReadyDraft(state, patch));
    if (state.phase === 'result') return setState(updateReadyDraft(repeatSameConfiguration(state), patch));
    if (state.phase === 'failed' && canBlindRetry(state)) {
      setState(updateReadyDraft(createReadyState(state.draft), patch));
    }
  };

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

  return {
    state,
    draft,
    pending,
    editable,
    primaryDisabled,
    primaryLabel,
    presentation,
    setPresentation,
    copyLabel,
    copyPrototypeResult,
    resultDelta: state.phase === 'result' ? resultDelta(state) : null,
    handlePrimary,
    handleModeChange: (mode: GasGameMode) => updateDraft({ mode }),
    handleAmountChange: (amount: string) => updateDraft({ amount }),
    handleAssetChange: (asset: WagerAsset) => updateDraft({ asset }),
  };
}
