import type { Metadata } from 'next';
import { GasActivityDetail } from '@/components/gas/GasActivityDetail';
import { GasPrototypeShell } from '@/components/gas/GasPrototypeShell';
import styles from '@/components/gas/gas-ui.module.css';

type ActivityPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: ActivityPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Activity ${id} — Project GAS`,
    description: 'Project GAS canonical verified activity detail.',
  };
}

export default async function ActivityPage({ params }: ActivityPageProps) {
  const { id } = await params;

  return (
    <GasPrototypeShell>
      <div className={styles.prototypeBanner} role="note">
        <span>Verified activity only · source and confirmation stay visible</span>
        <span className={styles.prototypePill}>Activity</span>
      </div>
      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>Verified economic object</div>
        <h1 className={styles.pageTitle}>ACTIVITY</h1>
        <p className={styles.pageIntro}>{id}</p>
      </header>
      <GasActivityDetail activityId={id} />
    </GasPrototypeShell>
  );
}
