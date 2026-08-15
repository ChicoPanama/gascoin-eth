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
        <div className={styles.eyebrow}>GP23 DeepLinkedNotification</div>
        <h1 className={styles.pageTitle}>NOTIFICATIONS</h1>
        <p className={styles.pageIntro}>Round settlement, followed activity, Crew events, rebases and permission state should return directly to the exact relevant object.</p>
      </header>
      <div className={styles.actionCard}>
        <span className={styles.actionCardMeta}>Honest empty state</span>
        <span className={styles.actionCardTitle}>ALL QUIET</span>
        <p className={styles.actionCardBody}>No synthetic alerts are generated for the prototype. Real notification events will reconcile their target state before presenting an action.</p>
      </div>
    </GasPrototypeShell>
  );
}
