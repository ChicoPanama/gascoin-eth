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
        <span>Phase 9 read model · canonical source required · no fabricated backing ratio</span>
        <span className={styles.prototypePill}>Reserve</span>
      </div>
      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>External backing only · monetary truth first</div>
        <h1 className={styles.pageTitle}>RESERVE</h1>
        <p className={styles.pageIntro}>Circulation, adjusted external reserves, composition, freshness and rebase state come from one read-only authority boundary. GAS itself never counts as its own backing.</p>
      </header>
      <GasReserveReadModel />
    </GasPrototypeShell>
  );
}
