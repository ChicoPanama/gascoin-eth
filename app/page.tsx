import Link from 'next/link';
import { GasPrototypeShell } from '@/components/gas/GasPrototypeShell';
import styles from '@/components/gas/gas-ui.module.css';
import responsive from '@/components/gas/GasResponsiveShell.module.css';

export default function Home() {
  return (
    <GasPrototypeShell>
      <div className={styles.prototypeBanner} role="note">
        <span>Project GAS UX prototype · protocol adapters not connected</span>
        <span className={styles.prototypePill}>Home</span>
      </div>

      <section className={styles.accountStrip} aria-label="Prototype account summary">
        <div>
          <div className={styles.eyebrow}>Available to use</div>
          <div className={styles.balance}>1,240.00 GAS <span className={styles.eyebrow}>DEMO</span></div>
          <div className={styles.balanceSub}>Spendable balance is separate from locked wagers, reserves and future positions.</div>
        </div>
        <Link href="/account" className={styles.secondaryButton}>Account</Link>
      </section>

      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>Elastic money · live game · social network</div>
        <h1 className={styles.pageTitle}>GAS</h1>
        <p className={styles.pageIntro}>Play is immediate. Monetary state stays understandable. Social activity becomes useful without exposing protocol plumbing first.</p>
      </header>

      <div className={`${styles.cardGrid} ${responsive.contentGrid}`}>
        <Link href="/play/gas" className={`${styles.actionCard} ${responsive.primaryWide}`}>
          <span className={styles.actionCardMeta}>Primary action</span>
          <span className={styles.actionCardTitle}>IGNITION →</span>
          <p className={styles.actionCardBody}>Resume GAS Original with CRUISE, BOOST or REDLINE. The prototype loop is interactive and moves no funds.</p>
        </Link>

        <Link href="/trade" className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Trade</span>
          <span className={styles.actionCardTitle}>BUY GAS</span>
          <p className={styles.actionCardBody}>Simple Buy/Sell/Fund/Withdraw shell. Fees and minimum-received become mandatory before a real confirmation.</p>
        </Link>

        <Link href="/reserve" className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Rebase + reserve · data not connected</span>
          <span className={styles.actionCardTitle}>MONETARY STATE —</span>
          <p className={styles.actionCardBody}>No fabricated backing ratio or countdown is shown. Live index/reserve adapters will replace this unavailable state.</p>
        </Link>

        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Following / live · intentionally empty</span>
          <span className={styles.actionCardTitle}>ACTIVITY</span>
          <p className={styles.actionCardBody}>No fake players, wins or transactions. The canonical verified activity contract is implemented; live data wiring comes in the real-state phase.</p>
        </div>
      </div>
    </GasPrototypeShell>
  );
}
