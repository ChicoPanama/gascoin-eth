import Link from 'next/link';
import { GasAccountSummary } from '@/components/gas/GasAccountSummary';
import { GasActivityFeed } from '@/components/gas/GasActivityFeed';
import { GasBrand } from '@/components/gas/GasBrand';
import { GasPrototypeShell } from '@/components/gas/GasPrototypeShell';
import styles from '@/components/gas/gas-ui.module.css';
import responsive from '@/components/gas/GasResponsiveShell.module.css';

export default function Home() {
  return (
    <GasPrototypeShell>
      <div className={styles.prototypeBanner} role="note">
        <span>Play · hold · trade · Crew — live features stay clearly labeled</span>
        <span className={styles.prototypePill}>Home</span>
      </div>

      <GasAccountSummary showAccountLink />

      <header className={styles.pageHeader}>
        <h1 className={styles.brandHeading}>
          <GasBrand variant="hero" sublabel="Elastic money · live game · social network" />
        </h1>
        <p className={styles.pageIntro}>Enter with USDC, play GAS Original, then hold, trade and build your Crew. Every money state remains explicit.</p>
      </header>

      <div className={`${styles.cardGrid} ${responsive.contentGrid}`}>
        <Link href="/play/gas" className={`${styles.actionCard} ${responsive.primaryWide}`}>
          <span className={styles.actionCardMeta}>GAS Original · Play with USDC</span>
          <span className={styles.actionCardTitle}>IGNITION →</span>
          <p className={styles.actionCardBody}>Choose CRUISE, BOOST or REDLINE. Preview mode moves no funds until live execution is verified.</p>
        </Link>

        <Link href="/trade" className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Buy & sell GAS</span>
          <span className={styles.actionCardTitle}>BUY GAS</span>
          <p className={styles.actionCardBody}>Review amount, fees, minimum received, price impact, expiry and source before anything can move.</p>
        </Link>

        <Link href="/reserve" className={styles.actionCard}>
          <span className={styles.actionCardMeta}>Holdings · rebase · reserve</span>
          <span className={styles.actionCardTitle}>MONETARY STATE →</span>
          <p className={styles.actionCardBody}>See circulation, external backing, freshness and rebase state. Missing values remain unavailable rather than estimated.</p>
        </Link>

        <GasActivityFeed />
      </div>
    </GasPrototypeShell>
  );
}
