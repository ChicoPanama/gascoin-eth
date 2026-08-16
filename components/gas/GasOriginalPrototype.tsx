'use client';

import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { GasGauge } from './GasGauge';
import { RiskSelector } from './RiskSelector';
import { WagerComposer } from './WagerComposer';
import {
  PRESENTATION_OPTIONS,
  gasOriginalStatusLabel,
  useGasOriginalPrototype,
} from './useGasOriginalPrototype';
import shared from './gas-ui.module.css';
import local from './GasOriginalPrototype.module.css';

function accountLabel(user: ReturnType<typeof usePrivy>['user']) {
  if (!user) return 'Prototype account';
  if (user.email?.address) return user.email.address;
  if (user.twitter?.username) return `@${user.twitter.username}`;
  if (user.wallet?.address) return `${user.wallet.address.slice(0, 6)}…${user.wallet.address.slice(-4)}`;
  return 'GAS account';
}

export function GasOriginalPrototype() {
  const { ready: authReady, authenticated, login, user } = usePrivy();
  const {
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
    resultDelta,
    handlePrimary,
    handleModeChange,
    handleAmountChange,
    handleAssetChange,
  } = useGasOriginalPrototype();

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
            <span className={shared.statusDot} /> {gasOriginalStatusLabel(state)}
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
            {PRESENTATION_OPTIONS.map((option) => (
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
                {resultDelta}
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
