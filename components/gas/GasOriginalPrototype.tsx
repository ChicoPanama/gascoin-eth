'use client';

import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useProjectGasAccount } from '@/hooks/useProjectGasAccount';
import {
  formatProjectGasBalanceForDisplay,
  hasAuthoritativeSpendableBalance,
  projectGasAccountAuthorityLabel,
} from '@/lib/project-gas/account-state';
import { GasGauge } from './GasGauge';
import { RiskSelector } from './RiskSelector';
import { WagerComposer } from './WagerComposer';
import {
  PRESENTATION_OPTIONS,
  gasOriginalStatusLabel,
} from './useGasOriginalPrototype';
import { useGasOriginalController } from './useGasOriginalController';
import shared from './gas-ui.module.css';
import local from './GasOriginalPrototype.module.css';

function DesktopTrustContext({ live }: { live: boolean }) {
  return (
    <aside className={local.desktopContextPanel} aria-label="Round trust context">
      <span className={shared.eyebrow}>Round truth</span>
      <h2 className={local.desktopContextTitle}>VERIFY WHAT MATTERS</h2>
      <p className={local.desktopContextBody}>Wager state, randomness and settlement stay visible without adding another step to Play.</p>
      <dl className={local.desktopContextList}>
        <div><dt>State</dt><dd>Explicit</dd></div>
        <div><dt>Live RNG</dt><dd>{live ? 'Authoritative' : 'Not connected'}</dd></div>
        <div><dt>Funds</dt><dd>{live ? 'Explicit state' : 'Do not move'}</dd></div>
        <div><dt>Verification</dt><dd>One action after result</dd></div>
      </dl>
    </aside>
  );
}

function DesktopSessionContext({ live }: { live: boolean }) {
  return (
    <aside className={local.desktopContextPanel} aria-label="Session context">
      <span className={shared.eyebrow}>Session context</span>
      <h2 className={local.desktopContextTitle}>VERIFIED ACTIVITY ONLY</h2>
      <p className={local.desktopContextBody}>{live
        ? 'Authoritative wager and round state comes from the configured Base execution source. Missing history or bankroll data stays unavailable.'
        : 'History, players and bankroll settlement remain unavailable until a verified execution source is available.'}</p>
      <dl className={local.desktopContextList}>
        <div><dt>Recent rounds</dt><dd>{live ? 'Per-round proof' : 'Unavailable'}</dd></div>
        <div><dt>Live players</dt><dd>Unavailable</dd></div>
        <div><dt>Bankroll</dt><dd>Not connected</dd></div>
        <div><dt>Primary action</dt><dd>IGNITION</dd></div>
      </dl>
    </aside>
  );
}

export function GasOriginalPrototype() {
  const { ready: authReady, authenticated, login } = usePrivy();
  const { model: accountModel } = useProjectGasAccount();
  const entryBalance = accountModel.spendable.usdc;
  const entryBalanceAuthoritative = hasAuthoritativeSpendableBalance(entryBalance);
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
    executionMode,
  } = useGasOriginalController();
  const live = executionMode === 'live';

  const statusClass = state.phase === 'failed'
    ? shared.statusFailed
    : pending
      ? shared.statusPending
      : shared.statusReady;

  return (
    <>
      <div className={`${shared.prototypeBanner} ${local.compactBanner}`} role="note">
        <span>{live
          ? 'USDC entry · automatic GAS sourcing · GAS payout · authoritative Base execution mode'
          : 'USDC entry · automatic GAS sourcing · GAS payout · preview moves no funds · no live RNG'}</span>
        <span className={`${shared.prototypePill} ${local.compactBannerPill}`}>{live ? 'Live' : 'Preview'}</span>
      </div>

      <section
        className={`${shared.accountStrip} ${local.compactAccount}`}
        aria-label="GAS account state"
        data-account-authority={entryBalance.authority}
        data-entry-asset="USDC"
        data-usdc-status={entryBalance.status}
      >
        <div>
          <div className={shared.eyebrow}>{authenticated ? 'Available to enter' : 'Explore before sign-in'}</div>
          <div className={`${shared.balance} ${local.compactBalance}`}>
            {formatProjectGasBalanceForDisplay(entryBalance)} <span className={shared.eyebrow}>{entryBalanceAuthoritative ? 'LIVE READ' : 'UNAVAILABLE'}</span>
          </div>
          <div className={`${shared.balanceSub} ${local.compactBalanceSub}`}>
            {authenticated
              ? accountModel.identity.label || entryBalance.message || 'GAS account'
              : entryBalance.message || 'Sign in or activate a wallet to read configured Project GAS USDC.'}
          </div>
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
          <div className={`${shared.statusPill} ${local.compactStatus} ${entryBalance.status === 'degraded' ? shared.statusFailed : entryBalance.status === 'loading' ? shared.statusPending : shared.statusReady}`}>
            <span className={shared.statusDot} /> {projectGasAccountAuthorityLabel(accountModel)}
          </div>
        )}
      </section>

      <div className={local.desktopPlayLayout}>
        <DesktopTrustContext live={live} />

        <section className={`${shared.gameCard} ${local.compactGame} ${local.desktopGame}`} aria-labelledby="gas-original-heading">
          <div className={`${shared.gameHeader} ${local.compactGameHeader}`}>
            <div>
              <h1 id="gas-original-heading" className={`${shared.gameTitle} ${local.compactGameTitle}`}>GAS ORIGINAL</h1>
              <p className={`${shared.gameDescription} ${local.compactGameDescription}`}>Choose risk. Enter USDC. IGNITION. GAS is sourced automatically and payouts are GAS.</p>
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
          />

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
                <div className={shared.eyebrow}>{live ? 'Settled result delta' : 'Illustrative result delta'}</div>
                <div className={`${local.resultAmount} ${state.result.outcome === 'win' ? local.resultPositive : state.result.outcome === 'loss' ? local.resultNegative : local.resultNeutral}`}>
                  {resultDelta}
                </div>
              </div>
              <div className={local.resultMeta}>
                <span>{state.wager.mode}</span>
                <span>{state.wager.entryAmount} USDC ENTRY</span>
                <span>GAS-NATIVE ROUND</span>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            className={`${shared.ignition} ${local.compactIgnition}`}
            disabled={primaryDisabled || (!authenticated && !authReady)}
            onClick={() => authenticated || !live ? handlePrimary() : login()}
            aria-describedby="gas-ignition-trust"
          >
            {primaryLabel}
          </button>

          <div id="gas-ignition-trust" className={local.trustLine}>
            <span className={local.trustStrong}>{presentation === 'instant' ? 'Instant presentation' : presentation === 'reduced-motion' ? 'Reduced motion' : 'Cinematic presentation'}</span>
            <span>Canonical state stays explicit</span>
          </div>

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

          {state.phase === 'result' ? (
            <div className={shared.resultRail}>
              <button type="button" className={shared.secondaryButton} onClick={copyPrototypeResult}>{copyLabel}</button>
              <Link className={shared.secondaryButton} href={state.result.verificationHref}>Verify round</Link>
            </div>
          ) : (
            <p className={local.prototypeNote}>{live
              ? 'A stable intent is stored before submission. Unknown money state must be reconciled before another wager can be sent.'
              : 'Results and GAS amounts are preview data only. No live sourcing quote, RNG or bankroll settlement is represented.'}</p>
          )}
        </section>

        <DesktopSessionContext live={live} />
      </div>
    </>
  );
}
