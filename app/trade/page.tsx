import type { Metadata } from 'next';
import { GasPrototypeShell } from '@/components/gas/GasPrototypeShell';
import { GasTradeQuotePreview } from '@/components/gas/GasTradeQuotePreview';
import styles from '@/components/gas/gas-ui.module.css';
import responsive from '@/components/gas/GasResponsiveShell.module.css';

export const metadata: Metadata = {
  title: 'Trade — Project GAS',
  description: 'Project GAS read-only quote truth for Buy and Sell.',
};

export default function TradePage() {
  return (
    <GasPrototypeShell>
      <div className={styles.prototypeBanner} role="note">
        <span>Phase 9 quote read model · no transaction submission or wallet signing</span>
        <span className={styles.prototypePill}>Trade</span>
      </div>
      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>Simple by default · financially material quote truth first</div>
        <h1 className={styles.pageTitle}>TRADE</h1>
        <p className={styles.pageIntro}>Buy and Sell share one quote model. Amount, fee, output, minimum received, price impact, expiry and source must be canonical before any future confirmation layer is allowed.</p>
      </header>

      <div className={`${styles.cardGrid} ${responsive.contentGrid}`}>
        <div className={responsive.primaryWide}>
          <GasTradeQuotePreview />
        </div>

        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Exit parity</span>
          <span className={styles.actionCardTitle}>SELL = FIRST-CLASS</span>
          <p className={styles.actionCardBody}>The same read-only quote contract powers Buy and Sell. Exit information is not hidden behind a separate terminal or advanced mode.</p>
        </div>

        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Account rails · not connected</span>
          <span className={styles.actionCardTitle}>FUND / WITHDRAW</span>
          <p className={styles.actionCardBody}>Funding and withdrawal remain unavailable until an approved provider, bounded permission model, reconciliation path and step-up security are connected.</p>
        </div>
      </div>
    </GasPrototypeShell>
  );
}
