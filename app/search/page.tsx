import type { Metadata } from 'next';
import { GasPrototypeShell } from '@/components/gas/GasPrototypeShell';
import styles from '@/components/gas/gas-ui.module.css';

export const metadata: Metadata = {
  title: 'Search — Project GAS',
  description: 'Unified Project GAS discovery for players, Crews, games and future markets.',
};

export default function SearchPage() {
  return (
    <GasPrototypeShell>
      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>GP22 UnifiedDiscovery · data wiring pending</div>
        <h1 className={styles.pageTitle}>SEARCH</h1>
        <p className={styles.pageIntro}>One discovery surface will cover Players, Crews, Games, canonical activity and future Bracket events. Result types stay visibly distinct.</p>
      </header>
      <div className={styles.actionCard}>
        <span className={styles.actionCardMeta}>Honest zero state</span>
        <span className={styles.actionCardTitle}>NO INDEX CONNECTED</span>
        <p className={styles.actionCardBody}>The Phase 7 shell does not invent search results. Search indexing and typed result actions enter with real social/application state.</p>
      </div>
    </GasPrototypeShell>
  );
}
