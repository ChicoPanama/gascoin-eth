import type { Metadata } from 'next';
import { GasPrototypeShell } from '@/components/gas/GasPrototypeShell';
import styles from '@/components/gas/gas-ui.module.css';

export const metadata: Metadata = {
  title: 'Notifications — Project GAS',
  description: 'Project GAS canonical notification and deep-link surface.',
};

export default function NotificationsPage() {
  return (
    <GasPrototypeShell>
      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>Rounds · Crews · rebases · permissions</div>
        <h1 className={styles.pageTitle}>NOTIFICATIONS</h1>
        <p className={styles.pageIntro}>Open a settlement, Crew event, rebase or permission change directly from the alert that matters.</p>
      </header>
      <div className={styles.actionCard}>
        <span className={styles.actionCardMeta}>Notifications · Up to date</span>
        <span className={styles.actionCardTitle}>ALL QUIET</span>
        <p className={styles.actionCardBody}>There are no verified alerts to show. GAS never fills this space with sample activity.</p>
      </div>
    </GasPrototypeShell>
  );
}
