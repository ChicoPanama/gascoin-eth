import { NextResponse } from 'next/server';
import { checkRateLimit } from '../../../lib/rate-limit';
import { getClientIp } from '../../../lib/ip';

const RPC_URL =
  process.env.ETH_RPC_URL ||
  (process.env.ALCHEMY_API_KEY
    ? `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : 'https://eth.llamarpc.com');

const ALLOWED_METHODS = new Set([
  'eth_blockNumber',
  'eth_getBalance',
  'eth_call',
  'eth_getTransactionCount',
  'eth_getTransactionByHash',
  'eth_getTransactionReceipt',
  'eth_sendRawTransaction',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_maxPriorityFeePerGas',
  'eth_feeHistory',
  'eth_getBlockByNumber',
  'eth_getBlockByHash',
  'eth_getLogs',
  'net_version',
  'eth_chainId',
]);

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`rpc:${ip}`, 100, 60);
  if (!rl.ok) {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32000, message: 'Rate limit exceeded.' }, id: null },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  try {
    const body = await req.text();
    let parsed: any;
    try { parsed = JSON.parse(body); } catch {
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

    if (method === 'eth_sendRawTransaction') {
      const stRl = await checkRateLimit(`rpc:sendtx:${ip}`, 10, 60);
      if (!stRl.ok) {
        return NextResponse.json(
          { jsonrpc: '2.0', error: { code: -32000, message: 'sendRawTransaction rate limit exceeded.' }, id: parsed?.id ?? null },
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
    return new NextResponse(data, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32000, message: 'RPC proxy error' }, id: null },
      { status: 502 },
    );
  }
}
