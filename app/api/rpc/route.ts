import { NextResponse } from 'next/server';
import { checkRateLimit } from '../../../lib/rate-limit';
import { getClientIp } from '../../../lib/ip';

// Server-side only. Never fall through to NEXT_PUBLIC_* — that would defeat the proxy.
// Fallback chain matches lib/integrations/solana.ts:7 — explicit URL first, then
// Helius via the API key, then public mainnet as last resort. Empty SOLANA_RPC_URL
// in production no longer drops us straight to the rate-limited public endpoint.
const RPC_URL = process.env.SOLANA_RPC_URL
  || (process.env.HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : 'https://api.mainnet-beta.solana.com');

// SECURITY: Only allow read methods + sendTransaction. Block admin/debug methods.
const ALLOWED_METHODS = new Set([
  'getBalance',
  'getTokenAccountsByOwner',
  'getAccountInfo',
  'getMultipleAccounts',
  'getLatestBlockhash',
  'sendTransaction',
  'getSignatureStatuses',
  'getTransaction',
  'getSlot',
  'getBlockHeight',
  'getMinimumBalanceForRentExemption',
  'getRecentPrioritizationFees',
]);

export async function POST(req: Request) {
  // Rate limit: 100 requests per minute per IP (per security hardening spec)
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`rpc:${ip}`, 100, 60);
  if (!rl.ok) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Rate limit exceeded. Try again in a moment.' },
        id: null,
      },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  try {
    const body = await req.text();

    // SECURITY: Parse and validate the RPC method
    let parsed: any;
    try {
      parsed = JSON.parse(body);
    } catch {
      return NextResponse.json(
        { jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null },
        { status: 400 },
      );
    }

    const method = parsed?.method;
    if (!method || !ALLOWED_METHODS.has(method)) {
      return NextResponse.json(
        { jsonrpc: '2.0', error: { code: -32601, message: 'Method not allowed' }, id: parsed?.id ?? null },
        { status: 403 },
      );
    }

    // Tighter limit for sendTransaction — 10/min/IP prevents relay abuse
    // while still supporting normal wallet operations.
    if (method === 'sendTransaction') {
      const stRl = await checkRateLimit(`rpc:sendtx:${ip}`, 10, 60);
      if (!stRl.ok) {
        return NextResponse.json(
          { jsonrpc: '2.0', error: { code: -32000, message: 'sendTransaction rate limit exceeded.' }, id: parsed?.id ?? null },
          { status: 429, headers: { 'Retry-After': '60' } },
        );
      }
    }

    const res = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32000, message: 'RPC proxy error' }, id: null },
      { status: 502 },
    );
  }
}
