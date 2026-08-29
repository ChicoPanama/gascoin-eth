import { NextRequest, NextResponse } from 'next/server';
import {
  parseProjectGasTradeQuote,
  unavailableTradeQuote,
  validTradeInputAmount,
  type RawProjectGasTradeQuote,
  type TradeAsset,
  type TradeSide,
} from '@/lib/project-gas/trade-state';
import {
  getProjectGasReadSource,
  requestProjectGasReadSource,
} from '@/lib/project-gas/authoritative-read-source';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

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

export async function GET(request: NextRequest) {
  const input = queryParams(request);
  if (!input.side || !input.amount || !validTradeInputAmount(input.amount) || !input.payAsset || !input.receiveAsset || input.payAsset === input.receiveAsset) {
    return NextResponse.json(
      unavailableTradeQuote('A valid side, positive amount and distinct GAS/USDC asset pair are required for a quote.'),
      { status: 200, headers: NO_STORE_HEADERS },
    );
  }

  let source;
  try {
    source = getProjectGasReadSource('trade-quote');
  } catch {
    return NextResponse.json(
      unavailableTradeQuote('No approved Project GAS trade quote read source is configured.'),
      { status: 200, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const response = await requestProjectGasReadSource({
      source,
      searchParams: {
        side: input.side,
        amount: input.amount,
        payAsset: input.payAsset,
        receiveAsset: input.receiveAsset,
      },
    });
    if (response.status < 200 || response.status >= 300) {
      return NextResponse.json(
        unavailableTradeQuote(`Trade quote source returned HTTP ${response.status}.`),
        { status: 200, headers: NO_STORE_HEADERS },
      );
    }

    const raw = response.body as RawProjectGasTradeQuote;
    return NextResponse.json(parseProjectGasTradeQuote(raw), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch {
    return NextResponse.json(unavailableTradeQuote('Trade quote source could not be reconciled.'), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  }
}
