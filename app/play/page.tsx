import type { Metadata } from 'next';
import Link from 'next/link';
import { GasPrototypeShell } from '@/components/gas/GasPrototypeShell';
import styles from '@/components/gas/gas-ui.module.css';
import responsive from '@/components/gas/GasResponsiveShell.module.css';

export const metadata: Metadata = {
  title: 'Play — Project GAS',
  description: 'Project GAS games: GAS Original and provably-fair roulette.',
};

export default function PlayPage() {
  return (
    <GasPrototypeShell>
      <div className={styles.prototypeBanner} role="note">
        <span>Phase 8 responsive prototype · no funds move</span>
        <span className={styles.prototypePill}>Play</span>
      </div>

      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>One machine · one choice · one action</div>
        <h1 className={styles.pageTitle}>PLAY</h1>
        <p className={styles.pageIntro}>GAS Original is the signature loop. Roulette is the first secondary social game. No casino lobby clutter.</p>
      </header>

      <div className={`${styles.cardGrid} ${responsive.contentGrid}`}>
        <Link href="/play/gas" className={`${styles.actionCard} ${responsive.primaryWide}`}>
          <span className={styles.actionCardMeta}>Signature · Prototype ready</span>
          <span className={styles.actionCardTitle}>GAS ORIGINAL →</span>
          <p className={styles.actionCardBody}>CRUISE / BOOST / REDLINE → amount → IGNITION → GAS Gauge → result → replay.</p>
        </Link>

        <div className={styles.actionCard} aria-disabled="true">
          <span className={styles.actionCardMeta}>Secondary · Interface pending</span>
          <span className={styles.actionCardTitle}>ROULETTE</span>
          <p className={styles.actionCardBody}>Provably-fair roulette remains in Phase 1 protocol scope. Its interaction surface follows after the GAS Original loop is benchmarked.</p>
        </div>
      </div>
    </GasPrototypeShell>
  );
}
