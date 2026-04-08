import { NextResponse } from 'next/server';

const RPC_URL = process.env.SOLANA_RPC_URL
  || process.env.NEXT_PUBLIC_SOLANA_RPC_URL
  || 'https://api.mainnet-beta.solana.com';

export async function POST(req: Request) {
  try {
    const body = await req.text();
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
