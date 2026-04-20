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
  '/welcome/',
  '/api/',
  '/api/v1/',     // Gas Network Intelligence API — key-gated, no site-cookie needed
  '/_next/',
  '/icons/',
  '/favicon',
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

// ── AI scraper / abusive UA block ────────────────────────────────────
// Hard block BEFORE gate/rate-limit. robots.txt is politeness — this
// enforces. Returns 403 to any request whose UA matches a known AI
// training crawler or hostile scraper. Case-insensitive match.
const BLOCKED_UA_PATTERNS = [
  'GPTBot', 'ChatGPT-User', 'OAI-SearchBot',
  'ClaudeBot', 'Claude-Web', 'anthropic-ai',
  'Google-Extended', 'GoogleOther',
  'CCBot', 'PerplexityBot', 'Perplexity-User',
  'cohere-ai', 'Cohere-AI',
  'FacebookBot', 'Meta-ExternalAgent', 'Meta-ExternalFetcher',
  'Bytespider', 'ByteDance',
  'Amazonbot', 'Applebot-Extended',
  'YouBot', 'DuckAssistBot',
  'diffbot', 'PetalBot', 'Omgilibot', 'Omgili',
  'ImagesiftBot', 'Timpibot', 'AI2Bot',
  'Scrapy', 'SemrushBot', 'AhrefsBot', 'MJ12bot',
  'DataForSeoBot', 'magpie-crawler',
];
const BLOCKED_UA_RE = new RegExp(
  BLOCKED_UA_PATTERNS.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'i',
);

function isBlockedUserAgent(ua: string | null): boolean {
  if (!ua) return true; // No UA = curl/script/scraper. Block.
  if (ua.length < 10) return true; // Suspiciously short
  return BLOCKED_UA_RE.test(ua);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);
  const ua = req.headers.get('user-agent');

  // ── UA hard block (runs first; ignores admin bypass to avoid false
  //    positives from any internal tooling that might share the IP) ──
  if (isBlockedUserAgent(ua)) {
    return new NextResponse('Forbidden', {
      status: 403,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Robots-Tag': 'noindex, nofollow, nosnippet, noarchive, noai, noimageai',
      },
    });
  }

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
