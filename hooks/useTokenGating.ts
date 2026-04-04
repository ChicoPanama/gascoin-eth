"use client";

import { useEffect, useState } from "react";
import { useGascoinWallet } from "./useGascoinWallet";
import { refreshTokenBalance, getCachedTokenData } from "../app/actions/token-gating";
import { getTierForBalance, getNextTier, tokensNeededForNextTier, TOKEN_TIERS, type TokenTier } from "../lib/token-tiers";

export interface TokenGatingState {
  balance: number;
  tier: TokenTier;
  nextTier: TokenTier | null;
  tokensToNextTier: number;
  progressToNextTier: number;
  loading: boolean;
  lastChecked: Date | null;
  error: string | null;
}

const REFRESH_MS = 5 * 60 * 1000;

export function useTokenGating(): TokenGatingState {
  const { publicKey, connected } = useGascoinWallet();
  const [state, setState] = useState<TokenGatingState>({
    balance: 0, tier: TOKEN_TIERS[0], nextTier: TOKEN_TIERS[1],
    tokensToNextTier: TOKEN_TIERS[1].min_tokens, progressToNextTier: 0,
    loading: false, lastChecked: null, error: null,
  });

  useEffect(() => {
    if (!connected || !publicKey) {
      setState((s) => ({ ...s, balance: 0, tier: TOKEN_TIERS[0], loading: false }));
      return;
    }

    const addr = publicKey.toBase58();
    let active = true;

    const load = async () => {
      setState((s) => ({ ...s, loading: true }));
      try {
        const cached = await getCachedTokenData(addr);
        const age = cached ? Date.now() - new Date(cached.last_checked_at).getTime() : Infinity;

        let balance: number;
        let tier: TokenTier;

        if (cached && age < REFRESH_MS) {
          balance = cached.gascoin_balance;
          tier = getTierForBalance(balance);
        } else {
          const fresh = await refreshTokenBalance(addr);
          balance = fresh.balance;
          tier = fresh.tier;
        }

        if (!active) return;
        const next = getNextTier(tier.id);
        const toNext = tokensNeededForNextTier(balance, tier.id);
        const progress = next ? Math.min(100, Math.round(((balance - tier.min_tokens) / (next.min_tokens - tier.min_tokens)) * 100)) : 100;

        setState({ balance, tier, nextTier: next, tokensToNextTier: toNext, progressToNextTier: progress, loading: false, lastChecked: new Date(), error: null });
      } catch {
        if (active) setState((s) => ({ ...s, loading: false, error: 'Failed to check token balance.' }));
      }
    };

    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { active = false; clearInterval(id); };
  }, [connected, publicKey]);

  return state;
}
