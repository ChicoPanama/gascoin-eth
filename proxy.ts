import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * SECURITY: Centralized proxy for CSP, security headers, and sensitive path blocking.
 * Hardened 2026-04-06.
 */
export function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  // --- Block access to sensitive files/paths ---
  if (/^\/(\.env|\.git|\.next)/.test(pathname)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // --- Content-Security-Policy ---
  // Solana wallet adapters require unsafe-eval for deserialization,
  // wss:// for RPC WebSockets, and external img sources for wallet icons.
  // Privy auth uses iframes from auth.privy.io.
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://auth.privy.io",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://*.walletconnect.com https://*.phantom.app https://*.solflare.com",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co https://auth.privy.io https://api.mainnet-beta.solana.com https://*.helius-rpc.com wss://*.helius-rpc.com https://*.upstash.io https://api.x.com wss://*.solana.com https://*.walletconnect.com wss://*.walletconnect.com https://*.phantom.app https://*.solflare.com",
    "frame-src 'self' https://auth.privy.io https://*.phantom.app https://*.solflare.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join('; ');

  res.headers.set('Content-Security-Policy', csp);

  return res;
}

export const proxyConfig = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
