'use client';

import '../../styles/me-sidebar.css';
import type { ReactNode } from 'react';
import { MeSidebar } from '../../components/me/MeSidebar';
import { useMeSession } from '../../hooks/useMeSession';

/**
 * /me shell — adds an X-style left sidebar on desktop (≥901px).
 * Mobile (≤900px) falls through to whatever chrome the child renders
 * (the page still imports <Nav />, which is hidden on desktop via CSS).
 */
export default function MeLayout({ children }: { children: ReactNode }) {
  const { xHandle, wallet } = useMeSession();
  return (
    <div className="me-layout">
      <MeSidebar xHandle={xHandle} wallet={wallet} />
      <main>{children}</main>
    </div>
  );
}
