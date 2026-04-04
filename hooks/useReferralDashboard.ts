"use client";

import { useEffect, useState, useCallback } from "react";
import { supabaseBrowser } from "../lib/supabase-client";
import { generateReferralCodeClient } from "../lib/referral-code-client";
import type { ReferralSummary, ReferralConversion, ReferralClickStats } from "../types/referral";

export function useReferralDashboard(walletAddress: string | null) {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [conversions, setConversions] = useState<ReferralConversion[]>([]);
  const [clickStats, setClickStats] = useState<ReferralClickStats | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [hasApprovedSubmission, setHasApprovedSubmission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!walletAddress) { setLoading(false); return; }

    try {
      const code = await generateReferralCodeClient(walletAddress);
      setReferralCode(code);

      // Check if referrer has approved submissions
      const { count } = await supabaseBrowser
        .from('payouts')
        .select('*', { count: 'exact', head: true })
        .eq('wallet', walletAddress)
        .eq('status', 'paid');
      setHasApprovedSubmission((count ?? 0) > 0);

      const [summaryRes, conversionsRes, clicksRes] = await Promise.all([
        supabaseBrowser.from('referral_summary_view').select('*').eq('referrer_wallet', walletAddress).maybeSingle(),
        supabaseBrowser.from('referral_conversions').select('*').eq('referrer_wallet', walletAddress).order('created_at', { ascending: false }),
        supabaseBrowser.from('referral_clicks').select('id, click_fingerprint, converted_submission_id').eq('referral_code', code),
      ]);

      setSummary(summaryRes.data ?? null);
      setConversions(conversionsRes.data ?? []);

      const clicks = clicksRes.data ?? [];
      const uniq = new Set(clicks.map((c: any) => c.click_fingerprint));
      const converted = clicks.filter((c: any) => c.converted_submission_id).length;

      setClickStats({
        total_clicks: clicks.length,
        unique_clicks: uniq.size,
        conversions: converted,
        conversion_rate_pct: uniq.size > 0 ? Math.round((converted / uniq.size) * 1000) / 10 : 0,
      });

      setError(null);
    } catch (err: any) {
      console.error('Referral dashboard error:', err);
      setError('Failed to load referral data.');
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchAll();
    if (!walletAddress) return;

    const channel = supabaseBrowser
      .channel(`referral-${walletAddress}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referral_conversions', filter: `referrer_wallet=eq.${walletAddress}` }, () => fetchAll())
      .subscribe();

    return () => { supabaseBrowser.removeChannel(channel); };
  }, [walletAddress, fetchAll]);

  return { summary, conversions, clickStats, referralCode, hasApprovedSubmission, loading, error, refetch: fetchAll };
}
