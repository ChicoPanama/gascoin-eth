'use client';

import Link from 'next/link';
import { useProjectGasAccount } from '@/hooks/useProjectGasAccount';
import {
  formatProjectGasBalanceForDisplay,
  hasAuthoritativeSpendableBalance,
  projectGasAccountAuthorityLabel,
} from '@/lib/project-gas/account-state';
import styles from './gas-ui.module.css';

function statusClass(status: 'loading' | 'ready' | 'stale' | 'degraded' | 'unavailable') {
  if (status === 'ready' || status === 'stale') return styles.statusReady;
  if (status === 'loading') return styles.statusPending;
  return styles.statusFailed;
}

function balanceDetail(
  gasStatus: ReturnType<typeof useProjectGasAccount>['model']['spendable']['gas'],
  usdcStatus: ReturnType<typeof useProjectGasAccount>['model']['spendable']['usdc'],
) {
  const usdcReady = hasAuthoritativeSpendableBalance(usdcStatus);
  if (usdcReady) return `${formatProjectGasBalanceForDisplay(usdcStatus, 2)} available · wallet-chain read`;

  const primaryMessage = gasStatus.message || usdcStatus.message;
  if (primaryMessage) return primaryMessage;
  return 'Spendable wallet balances are unavailable until authoritative asset configuration is connected.';
}

export function GasAccountSummary({
  showAccountLink = false,
  compact = false,
}: {
  showAccountLink?: boolean;
  compact?: boolean;
}) {
  const { model, configuration } = useProjectGasAccount();
  const gas = model.spendable.gas;
  const usdc = model.spendable.usdc;
  const gasAuthoritative = hasAuthoritativeSpendableBalance(gas);
  const overallStatus = gas.status === 'loading' || usdc.status === 'loading'
    ? 'loading'
    : gasAuthoritative
      ? gas.status
      : gas.status === 'degraded' || usdc.status === 'degraded'
        ? 'degraded'
        : 'unavailable';

  return (
    <section
      className={styles.accountStrip}
      aria-label="GAS account summary"
      data-account-authority={gas.authority}
      data-gas-status={gas.status}
      data-usdc-status={usdc.status}
    >
      <div>
        <div className={styles.eyebrow}>Available to use</div>
        <div className={styles.balance}>
          {formatProjectGasBalanceForDisplay(gas)}
          <span className={styles.eyebrow}> {gasAuthoritative ? 'LIVE READ' : 'UNAVAILABLE'}</span>
        </div>
        <div className={styles.balanceSub}>
          {balanceDetail(gas, usdc)}
          {!configuration.gasConfigured || !configuration.usdcConfigured
            ? ' Project GAS asset addresses must be explicitly configured; legacy GASCOIN addresses are not used.'
            : ''}
        </div>
      </div>

      {showAccountLink ? (
        <Link href="/account" className={styles.secondaryButton}>Account</Link>
      ) : (
        <div className={`${styles.statusPill} ${statusClass(overallStatus)}`}>
          <span className={styles.statusDot} /> {projectGasAccountAuthorityLabel(model)}
        </div>
      )}

      {compact ? <span className={styles.eyebrow} hidden>Compact account summary</span> : null}
    </section>
  );
}
