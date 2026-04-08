import { NextResponse } from 'next/server';
import { checkRateLimit } from '../../../lib/rate-limit';

const RPC_URL = process.env.SOLANA_RPC_URL
  || process.env.NEXT_PUBLIC_SOLANA_RPC_URL
  || 'https://api.mainnet-beta.solana.com';

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

function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export async function POST(req: Request) {
  // Rate limit: 60 requests per minute per IP
  const rl = await checkRateLimit(`rpc:${clientIp(req)}`, 60, 60);
  if (!rl.ok) {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32000, message: 'rate_limited' }, id: null },
      { status: 429 },
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
