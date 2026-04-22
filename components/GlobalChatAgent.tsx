'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ChatAgent } from './ChatAgent';
import type { ChatPageHint, ChatUserProfile } from './ChatAgent';

const PAGE_HINTS: Record<string, ChatPageHint> = {
  '/submit':       'submit',
  '/wallet':       'wallet',
  '/gates':        'gates',
  '/docs':         'docs',
  '/welcome':      'welcome',
};

// Pages where the agent opens automatically
const AUTO_OPEN_PATHS = new Set(['/submit']);

// Pages where the agent aligns left instead of right
const ALIGN_LEFT_PATHS = new Set<string>();

// Route prefixes where the agent should not appear
const HIDDEN_PREFIXES = ['/admin', '/welcome'];

export function GlobalChatAgent() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<ChatUserProfile | null>(null);
  // Track viewport class so we can skip auto-open on mobile. On a 390px
  // iPhone the expanded chat panel covers half the screen and buries the
  // sign-in / submit CTA — a beta tester reported they couldn't see the
  // primary action because the agent opened over it. Desktop UX is fine.
  //
  // null === "not yet determined, before hydration completes". We defer
  // the ChatAgent mount entirely until this resolves, because ChatAgent
  // reads `autoOpen` only on initial mount — a later prop flip from
  // true → false doesn't re-close an already-opened panel. The old fix
  // (boolean default false) still auto-opened on mobile because the
  // very first render of GlobalChatAgent used the default (!isNarrow =
  // true) → ChatAgent mounted open → the later resize-listener update
  // to true was ignored by the already-mounted panel.
  const [isNarrow, setIsNarrow] = useState<boolean | null>(null);

  // Fetch user profile once on mount (requires Privy session)
  useEffect(() => {
    fetch('/api/chat/profile', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && !data.isNewUser) setProfile(data); })
      .catch(() => {}); // silent — profile is optional
  }, []);

  useEffect(() => {
    // 768px lines up with our @media (max-width: 768px) tablet/mobile
    // breakpoint. Use matchMedia so we react to resize / rotation too.
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 768px)');
    const update = () => setIsNarrow(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  if (HIDDEN_PREFIXES.some(p => pathname.startsWith(p))) return null;

  // Wait for the viewport classifier before we mount ChatAgent. It
  // reads `autoOpen` once on mount, so we must supply the right value
  // the first time. The gap is a single post-hydration frame and user
  // won't notice — the floating button appears ~16ms after paint.
  if (isNarrow === null) return null;

  // Derive pageHint from the first path segment
  const base = '/' + (pathname.split('/')[1] ?? '');
  const pageHint = PAGE_HINTS[base];
  // Only auto-open when the viewport has room for the agent alongside
  // the page's primary content. On mobile the user taps the floating
  // Gas Attendant button to open it explicitly.
  const autoOpen = AUTO_OPEN_PATHS.has(base) && !isNarrow;
  const align: 'left' | 'right' = ALIGN_LEFT_PATHS.has(base) ? 'left' : 'right';

  return <ChatAgent pageHint={pageHint} autoOpen={autoOpen} align={align} userProfile={profile} />;
}
