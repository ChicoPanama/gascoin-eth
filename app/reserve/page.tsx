import type { Metadata } from 'next';
import { GasPrototypeShell } from '@/components/gas/GasPrototypeShell';
import { GasReserveReadModel } from '@/components/gas/GasReserveReadModel';
import styles from '@/components/gas/gas-ui.module.css';

export const metadata: Metadata = {
  title: 'Reserve — Project GAS',
  description: 'Project GAS external backing, reserve composition and rebase transparency.',
};

export default function ReservePage() {
  return (
    <GasPrototypeShell>
      <div className={styles.prototypeBanner} role="note">
        <span>Live reserve values appear only when a verified source is available</span>
        <span className={styles.prototypePill}>Reserve</span>
      </div>
      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>External backing only · monetary truth first</div>
        <h1 className={styles.pageTitle}>RESERVE</h1>
        <p className={styles.pageIntro}>See circulation, adjusted external reserves, composition, freshness and rebase state. GAS never counts as its own backing.</p>
      </header>
      <GasReserveReadModel />
    </GasPrototypeShell>
  );
}
