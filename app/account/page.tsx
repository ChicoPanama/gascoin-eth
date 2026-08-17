import type { Metadata } from 'next';
import { GasPrototypeShell } from '@/components/gas/GasPrototypeShell';
import { GasWalletAccess } from '@/components/gas/GasWalletAccess';
import styles from '@/components/gas/gas-ui.module.css';
import responsive from '@/components/gas/GasResponsiveShell.module.css';

export const metadata: Metadata = {
  title: 'Account — Project GAS',
  description: 'Project GAS account, available funds, linked wallets, permissions and security.',
};

export default function AccountPage() {
  return (
    <GasPrototypeShell>
      <div className={styles.prototypeBanner} role="note">
        <span>Prototype balances remain demo · wallet connection state is real when Privy is configured</span>
        <span className={styles.prototypePill}>Account</span>
      </div>

      <section className={styles.accountStrip}>
        <div>
          <div className={styles.eyebrow}>Available to use</div>
          <div className={styles.balance}>1,240.00 GAS <span className={styles.eyebrow}>DEMO</span></div>
          <div className={styles.balanceSub}>Available is intentionally distinct from locked wagers, marked positions and protocol reserves.</div>
        </div>
        <div className={`${styles.statusPill} ${styles.statusReady}`}>
          <span className={styles.statusDot} /> Prototype
        </div>
      </section>

      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>GP02 TruthfulUnifiedAccount</div>
        <h1 className={styles.pageTitle}>ACCOUNT</h1>
        <p className={styles.pageIntro}>One consumer account shell, without collapsing financially different things into one misleading balance.</p>
      </header>

      <div className={`${styles.cardGrid} ${responsive.contentGrid}`}>
        <div className={responsive.primaryWide}><GasWalletAccess /></div>
        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Spendable</span>
          <span className={styles.actionCardTitle}>GAS / USDC</span>
          <p className={styles.actionCardBody}>Real balances will come from canonical account adapters. Internal ReserveVault and GameBankroll balances never appear as user money.</p>
        </div>
        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Play permission</span>
          <span className={styles.actionCardTitle}>NOT AUTHORIZED</span>
          <p className={styles.actionCardBody}>Future permission UI exposes token, bounded amount/scope and expiry with a visible revoke path.</p>
        </div>
        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Activity</span>
          <span className={styles.actionCardTitle}>NO LIVE HISTORY</span>
          <p className={styles.actionCardBody}>Pending and settled actions will reconcile through canonical transaction/round IDs rather than optimistic local history.</p>
        </div>
      </div>
    </GasPrototypeShell>
  );
}
