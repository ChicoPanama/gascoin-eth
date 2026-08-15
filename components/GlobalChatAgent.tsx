'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ChatAgent } from './ChatAgent';
import type { ChatPageHint, ChatUserProfile } from './ChatAgent';

const PAGE_HINTS: Record<string, ChatPageHint> = {
  '/submit': 'submit',
  '/wallet': 'wallet',
  '/gates': 'gates',
  '/docs': 'docs',
  '/welcome': 'welcome',
};

const AUTO_OPEN_PATHS = new Set(['/submit']);
const ALIGN_LEFT_PATHS = new Set<string>();
const LEGACY_HIDDEN_PREFIXES = ['/admin', '/welcome'];
const PROJECT_GAS_PREFIXES = [
  '/play',
  '/trade',
  '/crews',
  '/account',
  '/reserve',
  '/search',
  '/notifications',
  '/profile',
  '/activity',
  '/round',
  '/transaction',
  '/rebase',
];

function isProjectGasRoute(pathname: string) {
  return pathname === '/' || PROJECT_GAS_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function GlobalChatAgent() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<ChatUserProfile | null>(null);
  const [isNarrow, setIsNarrow] = useState<boolean | null>(null);

  useEffect(() => {
    if (isProjectGasRoute(pathname)) return;
    fetch('/api/chat/profile', { credentials: 'include' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data && !data.isNewUser) setProfile(data); })
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => setIsNarrow(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  if (isProjectGasRoute(pathname)) return null;
  if (LEGACY_HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;
  if (isNarrow === null) return null;

  const base = '/' + (pathname.split('/')[1] ?? '');
  const pageHint = PAGE_HINTS[base];
  const autoOpen = AUTO_OPEN_PATHS.has(base) && !isNarrow;
  const align: 'left' | 'right' = ALIGN_LEFT_PATHS.has(base) ? 'left' : 'right';

  return <ChatAgent pageHint={pageHint} autoOpen={autoOpen} align={align} userProfile={profile} />;
}
