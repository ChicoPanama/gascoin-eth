import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * GASCOIN Edge Proxy — Next.js 16
 *
 * Handles: geoblocking, bot detection, worker route protection,
 * sensitive path blocking, and geo header forwarding.
 *
 * CSP intentionally omitted — wallet browser extensions inject scripts from
 * chrome-extension:// and brave:// origins that cannot be allowlisted.
 * Security headers (HSTS, X-Frame-Options, etc.) are set in next.config.js.
 */

// Country geoblocking — keep in sync with lib/geo-config.ts
const BLOCKED_COUNTRIES = new Set<string>([
  // Add country codes when fraud patterns emerge from submission data
  // Example: 'XX', 'YY'
]);

const BOT_USER_AGENTS = [
  'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python-requests',
  'go-http-client', 'java/', 'libwww', 'lwp-trivial', 'httpunit',
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const country = req.headers.get('x-vercel-ip-country') || '';
  const ua = (req.headers.get('user-agent') || '').toLowerCase();

  // 1. Block access to sensitive files/paths
  if (/^\/(\.env|\.git|\.next)/.test(pathname)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // 2. Country geoblocking
  if (country && BLOCKED_COUNTRIES.has(country.toUpperCase())) {
    return new NextResponse(
      JSON.stringify({ error: 'service_unavailable_in_region' }),
      { status: 451, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 3. Bot detection — block known bot user-agents on API routes
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/workers/') && !pathname.startsWith('/api/public/')) {
    const isBot = BOT_USER_AGENTS.some((b) => ua.includes(b));
    if (isBot) {
      return new NextResponse(
        JSON.stringify({ error: 'automated_access_denied' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }
  }

  // 4. Protect worker routes from casual browser access
  if (pathname.startsWith('/api/workers/') && req.method === 'GET') {
    const hasAuth = req.headers.get('authorization') || req.headers.get('x-cron-secret');
    if (!hasAuth) {
      return new NextResponse(null, { status: 404 });
    }
  }

  // 5. Pass through with geo headers for downstream use
  const res = NextResponse.next();
  if (country) res.headers.set('x-gc-ip-country', country);
  const city = req.headers.get('x-vercel-ip-city') || '';
  if (city) res.headers.set('x-gc-ip-city', city);

  return res;
}

export const proxyConfig = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|logo/|docs/diagrams/).*)',
  ],
};
