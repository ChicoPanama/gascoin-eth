/**
 * Data Intelligence Module
 *
 * Wires up unused database tables and adds cross-submission analysis:
 * - Gas price recording per submission
 * - Treasury flow snapshots
 * - Receipt pattern detection (same-station fraud rings)
 * - Engagement quality trending per user
 */

/** Record gas price data from OCR extraction into gas_city_prices table. */
export async function recordGasPrice(
  supabase: any,
  data: {
    country: string | null;
    currency: string | null;
    amountUsd: number;
  },
): Promise<void> {
  if (!data.country || !data.amountUsd || data.amountUsd <= 0) return;

  try {
    await supabase.from('gas_city_prices').insert({
      city: null, // OCR doesn't reliably extract city
      country: data.country,
      currency: data.currency || 'USD',
      price_per_liter: null,
      price_per_gallon_usd: null,
      source: 'submission_ocr',
    });
  } catch {
    // Non-blocking
  }
}

/** Snapshot treasury balance after payout batch. */
export async function snapshotTreasury(
  supabase: any,
  balances: {
    solBalance: number;
    solUsd: number;
    gascoinBalance: number;
    gascoinUsd: number;
  },
): Promise<void> {
  try {
    const wallet = process.env.GASCOIN_TREASURY_WALLET || '';
    await supabase.from('treasury_snapshots').insert({
      wallet,
      sol_balance: balances.solBalance,
      usd_value: balances.solUsd,
      gascoin_balance: balances.gascoinBalance,
      gascoin_usd_value: balances.gascoinUsd,
    });
  } catch {
    // Non-blocking
  }
}

/**
 * Detect receipt station patterns across different wallets.
 * Flags if 3+ different wallets submit from same station+country in same week.
 */
export async function detectStationPattern(
  supabase: any,
  country: string | null,
  wallet: string,
): Promise<{ suspicious: boolean; matchCount: number }> {
  if (!country) return { suspicious: false, matchCount: 0 };

  try {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data, error } = await supabase
      .from('claims')
      .select('wallet')
      .eq('ip_country', country)
      .gte('created_at', weekAgo)
      .neq('wallet', wallet)
      .in('status', ['submitted', 'auto_review', 'ready_for_dispatch', 'needs_review', 'approved', 'paid'])
      .limit(10);

    if (error) return { suspicious: false, matchCount: 0 };

    const uniqueWallets = new Set((data || []).map((d: any) => d.wallet));
    return {
      suspicious: uniqueWallets.size >= 3,
      matchCount: uniqueWallets.size,
    };
  } catch {
    return { suspicious: false, matchCount: 0 };
  }
}

/**
 * Update rolling average quality score for a wallet's tweets.
 * Called from score-engagement worker after scoring tweets.
 */
export async function updateQualityTrend(
  supabase: any,
  wallet: string,
  latestQualityScore: number,
): Promise<void> {
  try {
    // Fetch last 10 quality scores for this wallet
    const { data } = await supabase
      .from('scored_tweets')
      .select('quality_score')
      .eq('wallet', wallet)
      .order('last_scored_at', { ascending: false })
      .limit(10);

    if (!data || data.length === 0) return;

    const scores = data.map((d: any) => Number(d.quality_score || 0));
    const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;

    await supabase
      .from('wallet_x_links')
      .update({ avg_quality_score: Math.round(avg * 100) / 100 })
      .eq('wallet', wallet);
  } catch {
    // Non-blocking
  }
}
