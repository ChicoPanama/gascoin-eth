import Link from 'next/link';
import type { ReactNode } from 'react';
import { GasBrand } from './GasBrand';
import { GasDesktopNav } from './GasDesktopNav';
import { GasMobileNav } from './GasMobileNav';
import styles from './gas-ui.module.css';
import responsive from './GasResponsiveShell.module.css';

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>;
}

function BellIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 16h12l-1.5-2.5V10a4.5 4.5 0 0 0-9 0v3.5z" /><path d="M10 19h4" /></svg>;
}

function AccountIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6" /></svg>;
}

export function GasPrototypeShell({ children }: { children: ReactNode }) {
  return (
    <div className={`${styles.shell} ${responsive.shell}`}>
      <GasDesktopNav />

      <div className={responsive.shellBody}>
        <header className={`${styles.topBar} ${responsive.topBar}`}>
          <Link href="/" className={`${styles.brand} ${responsive.mobileBrand}`} aria-label="GAS home">
            <GasBrand variant="compact" sublabel="Standalone app" />
          </Link>

          <div className={responsive.desktopContext} aria-hidden>
            <span className={styles.eyebrow}>Project GAS</span>
            <span className={responsive.desktopContextText}>Consumer application</span>
          </div>

          <div className={styles.utilityRow} aria-label="GAS utilities">
            <Link href="/search" className={styles.iconButton} aria-label="Search GAS">
              <SearchIcon />
            </Link>
            <Link href="/notifications" className={styles.iconButton} aria-label="Notifications">
              <BellIcon />
            </Link>
            <Link href="/account" className={`${styles.iconButton} ${responsive.desktopAccountUtility}`} aria-label="Account">
              <AccountIcon />
            </Link>
          </div>
        </header>

        <main id="main-content" className={`${styles.main} ${responsive.main}`}>
          <div className={styles.routeStage}>{children}</div>
        </main>
      </div>

      <GasMobileNav />
    </div>
  );
}
