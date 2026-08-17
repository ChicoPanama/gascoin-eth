import type { Metadata } from 'next';
import { GasAccountSummary } from '@/components/gas/GasAccountSummary';
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
        <span>Phase 9 account transition · wallet state may be live while game/reserve remain prototype or unavailable</span>
        <span className={styles.prototypePill}>Account</span>
      </div>

      <GasAccountSummary />

      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>GP02 TruthfulUnifiedAccount</div>
        <h1 className={styles.pageTitle}>ACCOUNT</h1>
        <p className={styles.pageIntro}>One consumer account shell, without collapsing financially different things into one misleading balance.</p>
      </header>

      <div className={`${styles.cardGrid} ${responsive.contentGrid}`}>
        <div className={responsive.primaryWide}><GasWalletAccess /></div>
        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Spendable · configured wallet-chain assets only</span>
          <span className={styles.actionCardTitle}>GAS / USDC</span>
          <p className={styles.actionCardBody}>Spendable balances become authoritative only from the explicitly configured Project GAS contracts. ReserveVault and GameBankroll balances never appear as user money.</p>
        </div>
        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Play permission · not connected</span>
          <span className={styles.actionCardTitle}>NOT AUTHORIZED</span>
          <p className={styles.actionCardBody}>Future permission UI exposes token, bounded amount/scope and expiry with a visible revoke path.</p>
        </div>
        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Activity · not connected</span>
          <span className={styles.actionCardTitle}>NO LIVE HISTORY</span>
          <p className={styles.actionCardBody}>Pending and settled actions will reconcile through canonical intent/transaction/round IDs rather than optimistic local history.</p>
        </div>
      </div>
    </GasPrototypeShell>
  );
}
