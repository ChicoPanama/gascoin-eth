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
        <span>Preview mode · no funds move until live execution is verified</span>
        <span className={styles.prototypePill}>Play</span>
      </div>

      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>One machine · one choice · one action</div>
        <h1 className={styles.pageTitle}>PLAY</h1>
        <p className={styles.pageIntro}>GAS Original is the signature loop. Roulette is the first secondary social game. No casino lobby clutter.</p>
      </header>

      <div className={`${styles.cardGrid} ${responsive.contentGrid}`}>
        <Link href="/play/gas" className={`${styles.actionCard} ${responsive.primaryWide}`}>
          <span className={styles.actionCardMeta}>Signature game · Preview available</span>
          <span className={styles.actionCardTitle}>GAS ORIGINAL →</span>
          <p className={styles.actionCardBody}>CRUISE / BOOST / REDLINE → amount → IGNITION → GAS Gauge → result → replay.</p>
        </Link>

        <div className={styles.actionCard} aria-disabled="true">
          <span className={styles.actionCardMeta}>Secondary game · Coming later</span>
          <span className={styles.actionCardTitle}>ROULETTE</span>
          <p className={styles.actionCardBody}>Provably-fair roulette follows after the GAS Original money loop is live and verified.</p>
        </div>
      </div>
    </GasPrototypeShell>
  );
}
