'use client';

import Link from 'next/link';
import { useProjectGasCrews } from '@/hooks/useProjectGasCrews';
import { unavailableCrewSnapshot } from '@/lib/project-gas/crew-state';
import styles from './gas-ui.module.css';

export function GasCrewRankings() {
  const query = useProjectGasCrews();
  const snapshot = query.data ?? unavailableCrewSnapshot(
    query.isPending ? 'Reading canonical Crew ranking state.' : 'Crew ranking state is unavailable.',
  );

  return (
    <section
      className={styles.actionCard}
      aria-label="GAS Crew rankings"
      data-crews-authority={snapshot.authority}
      data-crews-status={snapshot.status}
    >
      <span className={styles.actionCardMeta}>Canonical rankings · {snapshot.status}</span>
      <span className={styles.actionCardTitle}>{snapshot.rows.length > 0 ? 'RANKINGS' : 'NO LIVE RANKINGS'}</span>

      {snapshot.rows.length === 0 ? (
        <p className={styles.actionCardBody}>{snapshot.message || 'No canonical Crew ranking data is available.'} Synthetic Crew names, scores, members and rank movement are not inserted.</p>
      ) : (
        <div className={styles.cardGrid}>
          {snapshot.rows.slice(0, 10).map((crew) => (
            <Link key={crew.crewId} href={`/crews/${encodeURIComponent(crew.slug)}`} className={styles.actionCard}>
              <span className={styles.actionCardMeta}>#{crew.rank} · {crew.members} members · score {crew.score}</span>
              <span className={styles.actionCardTitle}>{crew.name}</span>
              <p className={styles.actionCardBody}>Ignitions {crew.ignitions || '—'} · biggest hit {crew.biggestHitGas ? `${crew.biggestHitGas} GAS` : '—'} · as of {crew.sourceAsOf}</p>
            </Link>
          ))}
        </div>
      )}

      <p className={styles.actionCardBody}>Ranking formula: {snapshot.rankingFormula || 'unavailable until a canonical ranking source is connected.'}</p>
    </section>
  );
}
