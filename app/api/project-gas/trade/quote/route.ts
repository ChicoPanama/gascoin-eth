import { NextRequest, NextResponse } from 'next/server';
import {
  parseProjectGasTradeQuote,
  unavailableTradeQuote,
  validTradeInputAmount,
  type RawProjectGasTradeQuote,
  type TradeAsset,
  type TradeSide,
} from '@/lib/project-gas/trade-state';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

function quoteSourceUrl(): URL | undefined {
  const raw = process.env.PROJECT_GAS_TRADE_QUOTE_READ_URL?.trim();
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    const localDevelopment = process.env.NODE_ENV !== 'production'
      && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    if (url.protocol !== 'https:' && !localDevelopment) return undefined;
    return url;
  } catch {
    return undefined;
  }
}

function queryParams(request: NextRequest): {
  side?: TradeSide;
  amount?: string;
  payAsset?: TradeAsset;
  receiveAsset?: TradeAsset;
} {
  const side = request.nextUrl.searchParams.get('side');
  const amount = request.nextUrl.searchParams.get('amount')?.trim();
  const payAsset = request.nextUrl.searchParams.get('payAsset');
  const receiveAsset = request.nextUrl.searchParams.get('receiveAsset');

  return {
    side: side === 'buy' || side === 'sell' ? side : undefined,
    amount,
    payAsset: payAsset === 'GAS' || payAsset === 'USDC' ? payAsset : undefined,
    receiveAsset: receiveAsset === 'GAS' || receiveAsset === 'USDC' ? receiveAsset : undefined,
  };
}

async function fetchQuoteSource(url: URL): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);

  try {
    const token = process.env.PROJECT_GAS_TRADE_QUOTE_READ_TOKEN?.trim();
    return await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  const input = queryParams(request);
  if (!input.side || !input.amount || !validTradeInputAmount(input.amount) || !input.payAsset || !input.receiveAsset || input.payAsset === input.receiveAsset) {
    return NextResponse.json(
      unavailableTradeQuote('A valid side, positive amount and distinct GAS/USDC asset pair are required for a quote.'),
      { status: 200, headers: NO_STORE_HEADERS },
    );
  }

  const source = quoteSourceUrl();
  if (!source) {
    return NextResponse.json(
      unavailableTradeQuote('No approved Project GAS trade quote read source is configured.'),
      { status: 200, headers: NO_STORE_HEADERS },
    );
  }

  source.searchParams.set('side', input.side);
  source.searchParams.set('amount', input.amount);
  source.searchParams.set('payAsset', input.payAsset);
  source.searchParams.set('receiveAsset', input.receiveAsset);

  try {
    const response = await fetchQuoteSource(source);
    if (!response.ok) {
      return NextResponse.json(
        unavailableTradeQuote(`Trade quote source returned HTTP ${response.status}.`),
        { status: 200, headers: NO_STORE_HEADERS },
      );
    }

    const raw = await response.json() as RawProjectGasTradeQuote;
    return NextResponse.json(parseProjectGasTradeQuote(raw), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'Trade quote source timed out.'
      : 'Trade quote source could not be reconciled.';

    return NextResponse.json(unavailableTradeQuote(message), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  }
}
