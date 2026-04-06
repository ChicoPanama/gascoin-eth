"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabaseBrowser } from "../lib/supabase-client";
import { getBatchSignedUrls } from "../app/actions/receipts";
import type { CommunityReceipt, FeedFilter, FeedSort } from "../types/community";

const PAGE_SIZE = 24;

function mapPayoutToReceipt(p: any, connectedWallet: string | null): CommunityReceipt {
  const claim = p.claims || {};
  const receipt = claim.claim_receipts?.[0] || {};
  return {
    id: p.id,
    wallet: p.wallet || '',
    sol_amount: Number(p.amount_sol || 0),
    country: claim.country || null,
    receipt_usd: claim.parsed_amount ? Number(claim.parsed_amount) : null,
    receipt_date: claim.created_at || p.created_at,
    storage_path: receipt.storage_path_private || null,
    is_featured: claim.is_featured || false,
    created_at: p.created_at,
    gates_passed: 10,
    is_redacted: receipt.is_image_redacted || false,
    is_own: p.wallet === connectedWallet,
  };
}

export function useCommunityFeed(
  connectedWallet: string | null,
  filter: FeedFilter,
  sort: FeedSort
) {
  const [receipts, setReceipts] = useState<CommunityReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const pendingNewRef = useRef<CommunityReceipt[]>([]);

  const fetchPage = useCallback(async (pageNum: number, append = false) => {
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      let query = supabaseBrowser
        .from('payouts')
        .select('id, wallet, amount_sol, status, created_at, claim_id, claims(parsed_amount, created_at, country, is_featured, claim_receipts(storage_path_private, is_image_redacted))')
        .eq('status', 'paid')
        .range(from, to);

      if (filter === 'own' && connectedWallet) {
        query = query.eq('wallet', connectedWallet);
      }

      switch (sort) {
        case 'oldest': query = query.order('created_at', { ascending: true }); break;
        case 'highest_sol': query = query.order('amount_sol', { ascending: false }); break;
        default: query = query.order('created_at', { ascending: false });
      }

      const { data, error: err } = await query;
      if (err) throw err;

      let mapped = (data || []).map((p: any) => mapPayoutToReceipt(p, connectedWallet));

      if (filter === 'featured') {
        mapped = mapped.filter((r) => r.is_featured);
      }

      // Hydrate with signed URLs for non-redacted receipts
      const paths = mapped
        .filter((r) => r.storage_path && !r.is_redacted)
        .map((r) => r.storage_path as string);

      let urlMap: Record<string, string> = {};
      try {
        urlMap = await getBatchSignedUrls(paths);
      } catch {}

      const hydrated = mapped.map((r) => ({
        ...r,
        image_url: r.is_redacted ? null : (r.storage_path ? urlMap[r.storage_path] || null : null),
      }));

      setReceipts((prev) => append ? [...prev, ...hydrated] : hydrated);
      setHasMore((data?.length ?? 0) === PAGE_SIZE);
      setError(null);
    } catch (err: any) {
      console.error('Feed fetch error:', err);
      setError('Failed to load community feed.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter, sort, connectedWallet]);

  useEffect(() => {
    setLoading(true);
    setPage(0);
    setReceipts([]);
    setNewCount(0);
    pendingNewRef.current = [];
    fetchPage(0);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const next = page + 1;
    setPage(next);
    fetchPage(next, true);
  }, [page, loadingMore, hasMore, fetchPage]);

  const flushNewReceipts = useCallback(() => {
    setReceipts((prev) => [...pendingNewRef.current, ...prev]);
    pendingNewRef.current = [];
    setNewCount(0);
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabaseBrowser
      .channel('community-feed-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payouts' },
        (payload) => {
          if ((payload.new as any)?.status === 'paid') {
            const r = mapPayoutToReceipt(payload.new, connectedWallet);
            pendingNewRef.current = [r, ...pendingNewRef.current];
            setNewCount((n) => n + 1);
          }
        }
      )
      .subscribe();

    return () => { supabaseBrowser.removeChannel(channel); };
  }, [connectedWallet]);

  return { receipts, loading, loadingMore, error, hasMore, newCount, loadMore, flushNewReceipts };
}
