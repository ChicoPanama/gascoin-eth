import Link from 'next/link';
import { GasAccountSummary } from '@/components/gas/GasAccountSummary';
import { GasPrototypeShell } from '@/components/gas/GasPrototypeShell';
import styles from '@/components/gas/gas-ui.module.css';
import responsive from '@/components/gas/GasResponsiveShell.module.css';

export default function Home() {
  return (
    <GasPrototypeShell>
      <div className={styles.prototypeBanner} role="note">
        <span>Phase 9 transition · each surface labels its own authority</span>
        <span className={styles.prototypePill}>Home</span>
      </div>

      <GasAccountSummary showAccountLink />

      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>Elastic money · live game · social network</div>
        <h1 className={styles.pageTitle}>GAS</h1>
        <p className={styles.pageIntro}>Play is immediate. Monetary state stays understandable. Social activity becomes useful without exposing protocol plumbing first.</p>
      </header>

      <div className={`${styles.cardGrid} ${responsive.contentGrid}`}>
        <Link href="/play/gas" className={`${styles.actionCard} ${responsive.primaryWide}`}>
          <span className={styles.actionCardMeta}>Primary action · game adapter still prototype</span>
          <span className={styles.actionCardTitle}>IGNITION →</span>
          <p className={styles.actionCardBody}>Resume GAS Original with CRUISE, BOOST or REDLINE. Until Phase 9 game execution is authoritative, the game continues to move no funds.</p>
        </Link>

        <Link href="/trade" className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Trade · adapter not connected</span>
          <span className={styles.actionCardTitle}>BUY GAS</span>
          <p className={styles.actionCardBody}>Simple Buy/Sell/Fund/Withdraw shell. Fees, quote expiry and minimum received become mandatory before a real confirmation.</p>
        </Link>

        <Link href="/reserve" className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Rebase + reserve · data not connected</span>
          <span className={styles.actionCardTitle}>MONETARY STATE —</span>
          <p className={styles.actionCardBody}>No fabricated backing ratio or countdown is shown. Authoritative reserve/index/oracle adapters will replace this unavailable state.</p>
        </Link>

        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Following / live · intentionally empty</span>
          <span className={styles.actionCardTitle}>ACTIVITY</span>
          <p className={styles.actionCardBody}>No fake players, wins or transactions. Live activity remains empty until the canonical Phase 9 activity projection is connected.</p>
        </div>
      </div>
    </GasPrototypeShell>
  );
}
