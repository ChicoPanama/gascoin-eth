import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * SECURITY: Proxy for sensitive path blocking.
 * CSP intentionally omitted — wallet browser extensions inject scripts from
 * chrome-extension:// and brave:// origins that cannot be allowlisted.
 * Security headers (HSTS, X-Frame-Options, etc.) are set in next.config.js.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Block access to sensitive files/paths
  if (/^\/(\.env|\.git|\.next)/.test(pathname)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  return NextResponse.next();
}

export const proxyConfig = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
