'use client';

import { usePathname } from 'next/navigation';
import { ChatAgent } from './ChatAgent';
import type { ChatPageHint } from './ChatAgent';

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
const ALIGN_LEFT_PATHS = new Set(['/welcome']);

// Route prefixes where the agent should not appear
const HIDDEN_PREFIXES = ['/admin'];

export function GlobalChatAgent() {
  const pathname = usePathname();

  if (HIDDEN_PREFIXES.some(p => pathname.startsWith(p))) return null;

  // Derive pageHint from the first path segment
  const base = '/' + (pathname.split('/')[1] ?? '');
  const pageHint = PAGE_HINTS[base];
  const autoOpen = AUTO_OPEN_PATHS.has(base);
  const align: 'left' | 'right' = ALIGN_LEFT_PATHS.has(base) ? 'left' : 'right';

  return <ChatAgent pageHint={pageHint} autoOpen={autoOpen} align={align} />;
}
