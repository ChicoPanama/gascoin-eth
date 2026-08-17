'use client';

import Link from 'next/link';
import { useProjectGasCrews } from '@/hooks/useProjectGasCrews';
import { unavailableCrewSnapshot } from '@/lib/project-gas/crew-state';
import styles from './gas-ui.module.css';

export function GasCrewDetail({ slug }: { slug: string }) {
  const query = useProjectGasCrews();
  const snapshot = query.data ?? unavailableCrewSnapshot(
    query.isPending ? 'Reading canonical Crew state.' : 'Crew state is unavailable.',
  );
  const crew = snapshot.rows.find((candidate) => candidate.slug === slug);

  return (
    <div className={styles.cardGrid} data-crews-authority={snapshot.authority} data-crews-status={snapshot.status}>
      {!crew ? (
        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Canonical Crew detail · {snapshot.status}</span>
          <span className={styles.actionCardTitle}>UNAVAILABLE</span>
          <p className={styles.actionCardBody}>{snapshot.message || `Crew ${slug} was not found in the current canonical ranking projection.`}</p>
        </div>
      ) : (
        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>#{crew.rank} · score {crew.score} · {crew.members} members</span>
          <span className={styles.actionCardTitle}>{crew.name}</span>
          <p className={styles.actionCardBody}>Ignitions {crew.ignitions || '—'} · biggest hit {crew.biggestHitGas ? `${crew.biggestHitGas} GAS` : '—'}.</p>
          <p className={styles.actionCardBody}>Canonical ranking source as of {crew.sourceAsOf}. Formula: {snapshot.rankingFormula || 'unavailable'}.</p>
        </div>
      )}

      <Link href="/crews" className={styles.actionCard}>
        <span className={styles.actionCardMeta}>Return</span>
        <span className={styles.actionCardTitle}>CREWS →</span>
        <p className={styles.actionCardBody}>Crew detail and ranking list consume the same canonical source; this route does not invent a second Crew identity or score.</p>
      </Link>
    </div>
  );
}
