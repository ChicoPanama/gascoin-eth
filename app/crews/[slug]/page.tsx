import type { Metadata } from 'next';
import { GasCrewDetail } from '@/components/gas/GasCrewDetail';
import { GasPrototypeShell } from '@/components/gas/GasPrototypeShell';
import styles from '@/components/gas/gas-ui.module.css';

type CrewPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: CrewPageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Crew ${slug} — Project GAS`,
    description: 'Project GAS canonical Crew detail.',
  };
}

export default async function CrewPage({ params }: CrewPageProps) {
  const { slug } = await params;

  return (
    <GasPrototypeShell>
      <div className={styles.prototypeBanner} role="note">
        <span>Canonical Crew deep link · one identity/ranking projection</span>
        <span className={styles.prototypePill}>Crew</span>
      </div>
      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>One social graph · one ranking source</div>
        <h1 className={styles.pageTitle}>CREW</h1>
        <p className={styles.pageIntro}>{slug}</p>
      </header>
      <GasCrewDetail slug={slug} />
    </GasPrototypeShell>
  );
}
