'use client';

import { useQuery } from '@tanstack/react-query';
import {
  unavailableTradeQuote,
  validTradeInputAmount,
  type ProjectGasTradeQuote,
  type TradeAsset,
  type TradeSide,
} from '@/lib/project-gas/trade-state';

function isTradeQuote(value: unknown): value is ProjectGasTradeQuote {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return record.version === 1
    && typeof record.status === 'string'
    && typeof record.authority === 'string';
}

async function fetchTradeQuote({
  side,
  amount,
  payAsset,
  receiveAsset,
}: {
  side: TradeSide;
  amount: string;
  payAsset: TradeAsset;
  receiveAsset: TradeAsset;
}): Promise<ProjectGasTradeQuote> {
  try {
    const params = new URLSearchParams({ side, amount, payAsset, receiveAsset });
    const response = await fetch(`/api/project-gas/trade/quote?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return unavailableTradeQuote(`Trade quote endpoint returned HTTP ${response.status}.`);
    }

    const body = await response.json() as unknown;
    return isTradeQuote(body)
      ? body
      : unavailableTradeQuote('Trade quote endpoint returned an invalid canonical shape.');
  } catch {
    return unavailableTradeQuote('Trade quote endpoint is currently unreachable.');
  }
}

export function useProjectGasTradeQuote({
  side,
  amount,
}: {
  side: TradeSide;
  amount: string;
}) {
  const payAsset: TradeAsset = side === 'buy' ? 'USDC' : 'GAS';
  const receiveAsset: TradeAsset = side === 'buy' ? 'GAS' : 'USDC';
  const enabled = validTradeInputAmount(amount);

  return useQuery({
    queryKey: ['project-gas', 'trade-quote', 'v1', side, amount, payAsset, receiveAsset],
    queryFn: () => fetchTradeQuote({ side, amount, payAsset, receiveAsset }),
    enabled,
    staleTime: 5_000,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
