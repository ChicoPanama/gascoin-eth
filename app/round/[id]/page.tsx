import type { Metadata } from 'next';
import Link from 'next/link';
import { GasPrototypeShell } from '@/components/gas/GasPrototypeShell';
import styles from '@/components/gas/gas-ui.module.css';

type RoundPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: RoundPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Round ${id} — Project GAS`,
    description: 'Project GAS canonical round and provably-fair verification surface.',
  };
}

export default async function RoundPage({ params }: RoundPageProps) {
  const { id } = await params;
  const isPrototype = id.startsWith('prototype-round-');

  return (
    <GasPrototypeShell>
      <div className={styles.prototypeBanner} role="note">
        <span>{isPrototype ? 'Prototype round · no live RNG or settlement proof exists' : 'Round adapter not connected'}</span>
        <span className={styles.prototypePill}>Verify</span>
      </div>
      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>GP11 ResultActionRail · canonical round object</div>
        <h1 className={styles.pageTitle}>ROUND</h1>
        <p className={styles.pageIntro}>{id}</p>
      </header>
      <div className={styles.cardGrid}>
        <div className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Verification state</span>
          <span className={styles.actionCardTitle}>{isPrototype ? 'PROTOTYPE ONLY' : 'UNAVAILABLE'}</span>
          <p className={styles.actionCardBody}>A production round will expose wager, outcome, canonical status, RNG commitment/proof and settlement references. The UX prototype does not fabricate any of those values.</p>
        </div>
        <Link href="/play/gas" className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Return to Play</span>
          <span className={styles.actionCardTitle}>GAS ORIGINAL →</span>
          <p className={styles.actionCardBody}>Verification is one disclosure layer away from the game and never blocks ordinary replay.</p>
        </Link>
      </div>
    </GasPrototypeShell>
  );
}
