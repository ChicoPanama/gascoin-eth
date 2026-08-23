import type { Metadata } from 'next';
import { GasCrewRankings } from '@/components/gas/GasCrewRankings';
import { GasPrototypeShell } from '@/components/gas/GasPrototypeShell';
import styles from '@/components/gas/gas-ui.module.css';
import responsive from '@/components/gas/GasResponsiveShell.module.css';

export const metadata: Metadata = {
  title: 'Crews — Project GAS',
  description: 'Project GAS social identity, Crews and canonical rankings.',
};

export default function CrewsPage() {
  return (
    <GasPrototypeShell>
      <div className={styles.prototypeBanner} role="note">
        <span>Verified Crew activity only · unavailable rankings stay empty</span>
        <span className={styles.prototypePill}>Crews</span>
      </div>
      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>One social graph · verified activity</div>
        <h1 className={styles.pageTitle}>CREWS</h1>
        <p className={styles.pageIntro}>Crews become competitive identity around canonical GAS activity. Membership never bundles a hidden wager, trade or financial permission.</p>
      </header>
      <div className={`${styles.cardGrid} ${responsive.contentGrid}`}>
        <div className={responsive.primaryWide}>
          <GasCrewRankings />
        </div>
        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Following · Unavailable</span>
          <span className={styles.actionCardTitle}>ONE GAS IDENTITY</span>
          <p className={styles.actionCardBody}>Your GAS account will carry the same verified identity across Play, Trade, Crews and activity.</p>
        </div>
        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Ranking integrity</span>
          <span className={styles.actionCardTitle}>SOURCE + FORMULA</span>
          <p className={styles.actionCardBody}>A ranking becomes live only when its source timestamp and canonical formula are available. Missing data stays unavailable rather than being replaced with demo leaders.</p>
        </div>
      </div>
    </GasPrototypeShell>
  );
}
