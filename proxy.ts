// Next.js 16 routing proxy. Runs before requests hit route handlers.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit } from './lib/rate-limit';
import { verifyGateCookie, GATE_COOKIE_NAME } from './lib/gate-cookie';
import { getClientIp } from './lib/ip';

// ── Rate limiting for /api/* ────────────────────────────────────────
const GLOBAL_API_LIMIT = 60;
const GLOBAL_API_WINDOW_SEC = 60;

// ── Site gate bypass paths ──────────────────────────────────────────
// These routes are accessible without a valid gate cookie.
const GATE_BYPASS_PREFIXES = [
  '/welcome',
  '/docs',
  '/api/',
  '/_next/',
  '/icons/',
  '/favicon',
  '/welcome/',
];
const GATE_BYPASS_EXACT = new Set([
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
]);

/**
 * Check if the visitor's IP is in the admin bypass list.
 * ADMIN_BYPASS_IPS is a comma-separated list of IPs (v4 or v6).
 */
function isAdminIp(ip: string): boolean {
  const allowed = process.env.ADMIN_BYPASS_IPS;
  if (!allowed) return false;
  const list = allowed.split(',').map((s) => s.trim().toLowerCase());
  return list.includes(ip.toLowerCase());
}

function shouldBypassGate(pathname: string): boolean {
  if (GATE_BYPASS_EXACT.has(pathname)) return true;
  for (const prefix of GATE_BYPASS_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }
  // Static file extensions (images, fonts, etc.)
  if (/\.(svg|png|jpg|jpeg|gif|ico|woff2?|ttf|css|js|map)$/i.test(pathname)) {
    return true;
  }
  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);

  // ── Site gate check (only when SITE_GATE_ENABLED=true) ───────────
  // Flip this env var to "false" or remove it entirely to open the site.
  const gateEnabled = process.env.SITE_GATE_ENABLED === 'true';

  if (gateEnabled && !shouldBypassGate(pathname)) {
    // Admin IP bypass — full access, no cookie needed
    if (!isAdminIp(ip)) {
      const cookieValue = req.cookies.get(GATE_COOKIE_NAME)?.value;
      const valid = await verifyGateCookie(cookieValue);
      if (!valid) {
        const url = req.nextUrl.clone();
        url.pathname = '/welcome';
        return NextResponse.redirect(url);
      }
    }
  }

  // ── API rate limiting (only on /api/* routes) ───────────────────
  if (pathname.startsWith('/api/')) {
    // Skip /api/rpc — it has its own 100/min limiter
    if (!pathname.startsWith('/api/rpc')) {
      const rl = await checkRateLimit(
        `api:${ip}`,
        GLOBAL_API_LIMIT,
        GLOBAL_API_WINDOW_SEC
      );
      if (!rl.ok) {
        return NextResponse.json(
          { error: 'Too many requests' },
          {
            status: 429,
            headers: {
              'Retry-After': String(rl.resetSec),
              'X-RateLimit-Limit': String(GLOBAL_API_LIMIT),
              'X-RateLimit-Remaining': String(rl.remaining),
            },
          }
        );
      }
    }
  }

  return NextResponse.next();
}

// Match all routes so the gate check runs everywhere.
// Static assets (_next/static/*, images) are handled by shouldBypassGate().
export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
