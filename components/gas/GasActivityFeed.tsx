'use client';

import Link from 'next/link';
import { useProjectGasActivity } from '@/hooks/useProjectGasActivity';
import {
  canonicalActivityHref,
  unavailableActivitySnapshot,
} from '@/lib/project-gas/activity-state';
import { publicIdentityLabel, type LiveEvent } from '@/lib/project-gas/live-events';
import styles from './gas-ui.module.css';

function eventTitle(event: LiveEvent): string {
  if (event.kind === 'game-result') return `${event.outcome.toUpperCase()} · ${event.game === 'gas-original' ? 'GAS ORIGINAL' : 'ROULETTE'}`;
  if (event.kind === 'trade') return `${event.side.toUpperCase()} · ${event.receive.asset}`;
  if (event.kind === 'rebase') return `${event.direction.toUpperCase()} REBASE`;
  if (event.kind === 'reserve') return `RESERVE ${event.action.toUpperCase()}`;
  return `CREW ${event.milestone.replace('-', ' ').toUpperCase()}`;
}

function eventSummary(event: LiveEvent): string {
  if (event.kind === 'game-result') return `${event.wager.amount} ${event.wager.asset} → ${event.payout.amount} ${event.payout.asset} · ${event.multiplier}x`;
  if (event.kind === 'trade') return `${event.pay.amount} ${event.pay.asset} → ${event.receive.amount} ${event.receive.asset}`;
  if (event.kind === 'rebase') return `${event.percent}% · index ${event.indexBefore} → ${event.indexAfter}`;
  if (event.kind === 'reserve') return `${event.asset.amount} ${event.asset.asset}${event.backingRatio ? ` · backing ${event.backingRatio}×` : ''}`;
  return `${event.crewName} · ${event.value}`;
}

export function GasActivityFeed({ limit = 6 }: { limit?: number }) {
  const query = useProjectGasActivity();
  const snapshot = query.data ?? unavailableActivitySnapshot(
    query.isPending ? 'Reading canonical activity state.' : 'Activity state is unavailable.',
  );

  return (
    <section
      className={styles.actionCard}
      aria-label="GAS canonical activity"
      data-activity-authority={snapshot.authority}
      data-activity-status={snapshot.status}
    >
      <span className={styles.actionCardMeta}>Canonical activity · {snapshot.status}</span>
      <span className={styles.actionCardTitle}>{snapshot.events.length > 0 ? 'ACTIVITY' : 'NO LIVE ACTIVITY'}</span>

      {snapshot.events.length === 0 ? (
        <p className={styles.actionCardBody}>{snapshot.message || 'No canonical verified economic activity is available.'} No synthetic players, wins, trades or Crew events are inserted.</p>
      ) : (
        <div className={styles.cardGrid}>
          {snapshot.events.slice(0, limit).map((event) => (
            <Link key={event.id} href={canonicalActivityHref(event)} className={styles.actionCard}>
              <span className={styles.actionCardMeta}>{publicIdentityLabel(event.identity)} · {event.confirmation} · {event.authority}</span>
              <span className={styles.actionCardTitle}>{eventTitle(event)}</span>
              <p className={styles.actionCardBody}>{eventSummary(event)}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
