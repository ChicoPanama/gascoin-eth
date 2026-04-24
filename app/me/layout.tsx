'use client';

import '../../styles/me-sidebar.css';
import { Suspense, type ReactNode } from 'react';
import { MeSidebar } from '../../components/me/MeSidebar';
import { useMeSession } from '../../hooks/useMeSession';

/**
 * /me shell — adds an X-style left sidebar on desktop (≥901px).
 * Mobile (≤900px) falls through to whatever chrome the child renders
 * (the page still imports <Nav />, which is hidden on desktop via CSS).
 *
 * MeSidebar reads ?tab via useSearchParams; Next.js requires a Suspense
 * boundary around any use of that hook.
 */
export default function MeLayout({ children }: { children: ReactNode }) {
  const { xHandle, wallet } = useMeSession();
  return (
    <div className="me-layout">
      <Suspense fallback={<aside className="me-sidebar" aria-hidden />}>
        <MeSidebar xHandle={xHandle} wallet={wallet} />
      </Suspense>
      <main>{children}</main>
    </div>
  );
}
