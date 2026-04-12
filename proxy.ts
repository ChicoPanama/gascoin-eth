// Next.js 16 routing proxy. Runs before requests hit route handlers.
// Uses Node runtime by default in Next 16.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit } from './lib/rate-limit';

// Global rate limit: 60 requests / minute / IP on /api/*
// Exceptions:
//  - /api/rpc is rate-limited internally (100/min) — skip here to avoid double-counting
//
// The matcher below ensures we only run on /api/*. Static assets (_next/*, public files)
// are excluded via the matcher and never hit the proxy.
const GLOBAL_API_LIMIT = 60;
const GLOBAL_API_WINDOW_SEC = 60;

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip /api/rpc — it has its own 100/min limiter
  if (pathname.startsWith('/api/rpc')) {
    return NextResponse.next();
  }

  const ip = clientIp(req);
  const rl = await checkRateLimit(`api:${ip}`, GLOBAL_API_LIMIT, GLOBAL_API_WINDOW_SEC);

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
      },
    );
  }

  return NextResponse.next();
}

// Only run middleware on API routes. Static assets (_next/*, /public/*),
// pages, and images are NOT matched and never hit the rate limiter.
export const config = {
  matcher: ['/api/:path*'],
};
