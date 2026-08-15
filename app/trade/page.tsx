import type { Metadata } from 'next';
import { GasPrototypeShell } from '@/components/gas/GasPrototypeShell';
import styles from '@/components/gas/gas-ui.module.css';

export const metadata: Metadata = {
  title: 'Trade — Project GAS',
  description: 'Project GAS simple Buy, Sell, Fund and Withdraw surface.',
};

export default function TradePage() {
  return (
    <GasPrototypeShell>
      <div className={styles.prototypeBanner} role="note">
        <span>Prototype shell · no quote or transaction adapter connected</span>
        <span className={styles.prototypePill}>Trade</span>
      </div>
      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>Simple by default · financial truth at confirmation</div>
        <h1 className={styles.pageTitle}>TRADE</h1>
        <p className={styles.pageIntro}>Buy, Sell, Fund and Withdraw share one account model. Advanced market depth will be progressive, never required for the ordinary path.</p>
      </header>
      <div className={styles.cardGrid}>
        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>GP17 QuickTradeSheet · wiring pending</span>
          <span className={styles.actionCardTitle}>BUY GAS</span>
          <p className={styles.actionCardBody}>A real quote must show amount, fee, estimated output, minimum received and meaningful price impact before confirmation.</p>
        </div>
        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Exit parity</span>
          <span className={styles.actionCardTitle}>SELL GAS</span>
          <p className={styles.actionCardBody}>The exit path is deliberately as visible as entry. No transaction is available in this Phase 7 interaction prototype.</p>
        </div>
        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Account rails</span>
          <span className={styles.actionCardTitle}>FUND / WITHDRAW</span>
          <p className={styles.actionCardBody}>Funding and withdrawal providers remain implementation decisions; sensitive actions will receive step-up authentication.</p>
        </div>
      </div>
    </GasPrototypeShell>
  );
}
