import type { Metadata } from 'next';
import { GasPrototypeShell } from '@/components/gas/GasPrototypeShell';
import styles from '@/components/gas/gas-ui.module.css';
import responsive from '@/components/gas/GasResponsiveShell.module.css';

export const metadata: Metadata = {
  title: 'Reserve — Project GAS',
  description: 'Project GAS external backing, reserve composition and rebase transparency.',
};

export default function ReservePage() {
  return (
    <GasPrototypeShell>
      <div className={styles.prototypeBanner} role="note">
        <span>Reserve adapter not connected · no fabricated backing ratio</span>
        <span className={styles.prototypePill}>Reserve</span>
      </div>
      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>External backing only · monetary truth first</div>
        <h1 className={styles.pageTitle}>RESERVE</h1>
        <p className={styles.pageIntro}>The trust surface will show circulation, adjusted external reserves, composition, freshness and verification without counting GAS itself as backing.</p>
      </header>
      <div className={`${styles.cardGrid} ${responsive.contentGrid}`}>
        <div className={`${styles.actionCard} ${responsive.primaryWide}`}>
          <span className={styles.actionCardMeta}>Coverage</span>
          <span className={styles.actionCardTitle}>—</span>
          <p className={styles.actionCardBody}>Unavailable until ReserveVault/index/oracle adapters provide canonical values. Stale or unavailable data is labeled rather than guessed.</p>
        </div>
        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>What never counts as external backing</span>
          <span className={styles.actionCardTitle}>GAS ≠ RESERVE</span>
          <p className={styles.actionCardBody}>GAS, wGAS, the self-issued side of POL, GameBankroll and future Bracket collateral cannot be presented as external monetary backing.</p>
        </div>
        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Rebase moment</span>
          <span className={styles.actionCardTitle}>NEXT REBASE —</span>
          <p className={styles.actionCardBody}>A real countdown, direction, personal before/after balance and reserve context will appear only when the rebase controller/index data is connected.</p>
        </div>
      </div>
    </GasPrototypeShell>
  );
}
