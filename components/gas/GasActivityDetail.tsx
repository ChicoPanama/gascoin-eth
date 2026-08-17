'use client';

import Link from 'next/link';
import { useProjectGasActivity } from '@/hooks/useProjectGasActivity';
import { unavailableActivitySnapshot } from '@/lib/project-gas/activity-state';
import { publicIdentityLabel } from '@/lib/project-gas/live-events';
import styles from './gas-ui.module.css';

export function GasActivityDetail({ activityId }: { activityId: string }) {
  const query = useProjectGasActivity();
  const snapshot = query.data ?? unavailableActivitySnapshot(
    query.isPending ? 'Reading canonical activity state.' : 'Activity state is unavailable.',
  );
  const event = snapshot.events.find((candidate) => candidate.id === activityId);

  return (
    <div className={styles.cardGrid} data-activity-authority={snapshot.authority} data-activity-status={snapshot.status}>
      {!event ? (
        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Canonical activity detail · {snapshot.status}</span>
          <span className={styles.actionCardTitle}>UNAVAILABLE</span>
          <p className={styles.actionCardBody}>{snapshot.message || `Activity ${activityId} was not found in the current canonical projection.`}</p>
        </div>
      ) : (
        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>{event.kind} · {event.confirmation} · {event.authority}</span>
          <span className={styles.actionCardTitle}>{publicIdentityLabel(event.identity)}</span>
          <p className={styles.actionCardBody}>Activity ID: {event.id}</p>
          <p className={styles.actionCardBody}>Occurred: {event.occurredAt}</p>
          {event.txHash ? <p className={styles.actionCardBody}>Transaction: {event.txHash}</p> : null}
          {event.commentary ? <p className={styles.actionCardBody}>Commentary: {event.commentary.body}</p> : null}
          {event.kind === 'game-result' ? <Link href={event.verificationHref} className={styles.secondaryButton}>Verify round</Link> : null}
        </div>
      )}

      <Link href="/" className={styles.actionCard}>
        <span className={styles.actionCardMeta}>Return</span>
        <span className={styles.actionCardTitle}>HOME →</span>
        <p className={styles.actionCardBody}>The same canonical activity object can be projected into Home, profiles, Crews, notifications and search without duplicating economic truth.</p>
      </Link>
    </div>
  );
}
