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
        <div className={styles.eyebrow}>Players · Crews · games · activity</div>
        <h1 className={styles.pageTitle}>SEARCH</h1>
        <p className={styles.pageIntro}>Find people, Crews, games and verified activity from one place. Every result keeps its type and available actions clear.</p>
      </header>
      <div className={styles.actionCard}>
        <span className={styles.actionCardMeta}>Search · Unavailable</span>
        <span className={styles.actionCardTitle}>NO SEARCH INDEX</span>
        <p className={styles.actionCardBody}>Results stay empty until a verified GAS search source is available.</p>
      </div>
    </GasPrototypeShell>
  );
}
