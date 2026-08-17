'use client';

import { useProjectGasReserve } from '@/hooks/useProjectGasReserve';
import {
  reserveCoverageLabel,
  unavailableReserveSnapshot,
} from '@/lib/project-gas/reserve-state';
import styles from './gas-ui.module.css';
import responsive from './GasResponsiveShell.module.css';

function groupDecimal(value: string | undefined): string {
  if (!value) return '—';
  const [whole, fraction] = value.split('.');
  const sign = whole.startsWith('-') ? '-' : '';
  const digits = sign ? whole.slice(1) : whole;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${grouped}${fraction ? `.${fraction}` : ''}`;
}

function freshnessLabel(dataAsOf: string | undefined) {
  if (!dataAsOf) return 'No canonical timestamp';
  return `As of ${dataAsOf}`;
}

export function GasReserveReadModel() {
  const query = useProjectGasReserve();
  const snapshot = query.data ?? unavailableReserveSnapshot(
    query.isPending ? 'Reading canonical reserve state.' : 'Reserve state is unavailable.',
  );

  const authorityLabel = snapshot.authority === 'unavailable'
    ? 'UNAVAILABLE'
    : snapshot.status.toUpperCase();

  return (
    <div data-reserve-authority={snapshot.authority} data-reserve-status={snapshot.status}>
      <section className={styles.accountStrip} aria-label="GAS reserve summary">
        <div>
          <div className={styles.eyebrow}>Adjusted external backing coverage</div>
          <div className={styles.balance}>{reserveCoverageLabel(snapshot)} <span className={styles.eyebrow}>{authorityLabel}</span></div>
          <div className={styles.balanceSub}>
            {snapshot.message || `${freshnessLabel(snapshot.dataAsOf)} · source: ${snapshot.source || 'unknown'}`}
          </div>
        </div>
        <div className={`${styles.statusPill} ${snapshot.status === 'ready' ? styles.statusReady : snapshot.status === 'stale' ? styles.statusPending : styles.statusFailed}`}>
          <span className={styles.statusDot} /> {snapshot.status}
        </div>
      </section>

      <div className={`${styles.cardGrid} ${responsive.contentGrid}`}>
        <div className={`${styles.actionCard} ${responsive.primaryWide}`}>
          <span className={styles.actionCardMeta}>Adjusted external reserve · {snapshot.authority}</span>
          <span className={styles.actionCardTitle}>{snapshot.adjustedExternalReserveUsd ? `$${groupDecimal(snapshot.adjustedExternalReserveUsd)}` : '—'}</span>
          <p className={styles.actionCardBody}>Required peg reserve: {snapshot.requiredPegReserveUsd ? `$${groupDecimal(snapshot.requiredPegReserveUsd)}` : '—'} · {freshnessLabel(snapshot.dataAsOf)}. Missing or stale canonical data is shown as such rather than estimated.</p>
        </div>

        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Excess-backing firewall</span>
          <span className={styles.actionCardTitle}>{snapshot.excessBackingUsd ? `$${groupDecimal(snapshot.excessBackingUsd)}` : '—'}</span>
          <p className={styles.actionCardBody}>Only backing above required peg reserve, insurance buffer and liquidity floor can become economically available to downstream protocol facilities. No amount is inferred when the source is unavailable.</p>
        </div>

        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Rebase state</span>
          <span className={styles.actionCardTitle}>{snapshot.rebase.status === 'unavailable' ? 'NEXT REBASE —' : snapshot.rebase.direction?.toUpperCase() || snapshot.rebase.status.toUpperCase()}</span>
          <p className={styles.actionCardBody}>{snapshot.rebase.status === 'unavailable' ? 'No canonical rebase schedule is connected.' : `${snapshot.rebase.percent || '—'}% · ${snapshot.rebase.effectiveAt || snapshot.rebase.completedAt || 'timestamp unavailable'}`}</p>
        </div>

        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Backing exclusions · policy invariant</span>
          <span className={styles.actionCardTitle}>GAS ≠ RESERVE</span>
          <div className={styles.actionCardBody}>
            {snapshot.exclusions.map((exclusion) => (
              <p key={exclusion.id}><strong>{exclusion.label}</strong> — {exclusion.reason}</p>
            ))}
          </div>
        </div>

        {snapshot.components.length > 0 ? snapshot.components.map((component) => (
          <div key={component.id} className={styles.actionCard}>
            <span className={styles.actionCardMeta}>{component.class} · haircut {component.haircutBps} bps</span>
            <span className={styles.actionCardTitle}>{component.symbol} · ${groupDecimal(component.adjustedUsd)}</span>
            <p className={styles.actionCardBody}>Gross ${groupDecimal(component.grossUsd)} · source {component.source} · as of {component.sourceAsOf}</p>
          </div>
        )) : null}
      </div>
    </div>
  );
}
