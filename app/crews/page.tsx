import type { Metadata } from 'next';
import { GasPrototypeShell } from '@/components/gas/GasPrototypeShell';
import styles from '@/components/gas/gas-ui.module.css';
import responsive from '@/components/gas/GasResponsiveShell.module.css';

export const metadata: Metadata = {
  title: 'Crews — Project GAS',
  description: 'Project GAS social identity, Crews and rankings.',
};

export default function CrewsPage() {
  return (
    <GasPrototypeShell>
      <div className={styles.prototypeBanner} role="note">
        <span>Social shell · no fabricated crews or rankings</span>
        <span className={styles.prototypePill}>Crews</span>
      </div>
      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>One social graph · verified activity</div>
        <h1 className={styles.pageTitle}>CREWS</h1>
        <p className={styles.pageIntro}>Crews become competitive identity around real GAS activity. Membership never bundles a hidden wager, trade or financial permission.</p>
      </header>
      <div className={`${styles.cardGrid} ${responsive.contentGrid}`}>
        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Following</span>
          <span className={styles.actionCardTitle}>NO LIVE CREWS YET</span>
          <p className={styles.actionCardBody}>The prototype intentionally renders an honest empty state until the canonical social graph is wired.</p>
        </div>
        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Discovery contract</span>
          <span className={styles.actionCardTitle}>RANKINGS</span>
          <p className={styles.actionCardBody}>Player and Crew ranking metrics must be transparent, protocol-derived where possible and protected against Sybil manipulation.</p>
        </div>
      </div>
    </GasPrototypeShell>
  );
}
