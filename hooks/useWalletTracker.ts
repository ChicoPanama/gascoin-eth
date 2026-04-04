"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabaseBrowser } from "../lib/supabase-client";
import { getOwnSubmissions, getPublicSubmissions, getWalletSummary, getCooldownStatus } from "../app/actions/wallet-tracker";
import type { WalletSubmission, WalletSummary, CooldownStatus, TrackerMode } from "../types/wallet-tracker";

export function useWalletTracker(connectedWallet: string | null, lookupAddress: string | null) {
  const [mode, setMode] = useState<TrackerMode>('idle');
  const [address, setAddress] = useState<string | null>(null);
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [submissions, setSubmissions] = useState<WalletSubmission[]>([]);
  const [cooldown, setCooldown] = useState<CooldownStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabaseBrowser.channel> | null>(null);

  const load = useCallback(async (addr: string, isOwner: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const [subs, sum, cd] = await Promise.all([
        isOwner ? getOwnSubmissions(addr) : getPublicSubmissions(addr),
        getWalletSummary(addr),
        isOwner ? getCooldownStatus(addr) : Promise.resolve(null),
      ]);
      setMode(isOwner ? 'connected' : 'lookup');
      setAddress(addr);
      setSubmissions(subs);
      setSummary(sum);
      setCooldown(cd);
    } catch (e: any) {
      console.error('WalletTracker error:', e);
      setError('Failed to load wallet data.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Connected wallet
  useEffect(() => {
    if (connectedWallet) {
      load(connectedWallet, true);
    } else if (!lookupAddress) {
      setMode('idle');
      setAddress(null);
      setSummary(null);
      setSubmissions([]);
      setCooldown(null);
    }
  }, [connectedWallet, load, lookupAddress]);

  // Lookup address
  useEffect(() => {
    if (lookupAddress && !connectedWallet) {
      load(lookupAddress, false);
    }
  }, [lookupAddress, connectedWallet, load]);

  // Realtime
  useEffect(() => {
    const addr = connectedWallet ?? lookupAddress;
    if (!addr) return;

    if (channelRef.current) supabaseBrowser.removeChannel(channelRef.current);

    const channel = supabaseBrowser
      .channel(`wallet-tracker-${addr}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims', filter: `wallet=eq.${addr}` },
        () => load(addr, !!connectedWallet))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payouts', filter: `wallet=eq.${addr}` },
        () => load(addr, !!connectedWallet))
      .subscribe();

    channelRef.current = channel;
    return () => { supabaseBrowser.removeChannel(channel); };
  }, [connectedWallet, lookupAddress, load]);

  const reset = useCallback(() => {
    setMode('idle');
    setAddress(null);
    setSummary(null);
    setSubmissions([]);
    setCooldown(null);
    setError(null);
  }, []);

  return { mode, address, summary, submissions, cooldown, loading, error, reset, reload: () => address && load(address, mode === 'connected') };
}
