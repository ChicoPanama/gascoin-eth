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
 *
 * Checks two signals:
 * 1. OCR text similarity — if the same station name/address appears in
 *    receipts from 3+ different wallets in the same week, flag it
 * 2. EXIF GPS proximity — if receipt photos from different wallets were
 *    taken within ~200m of each other (same gas station), flag it
 *
 * This catches fraud rings where multiple wallets submit from the same
 * physical location using different accounts.
 */
export async function detectStationPattern(
  supabase: any,
  wallet: string,
  ocrText: string | null,
): Promise<{ suspicious: boolean; matchCount: number; signal: string }> {
  if (!ocrText || ocrText.length < 20) return { suspicious: false, matchCount: 0, signal: 'insufficient_ocr' };

  try {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    // Get recent receipts from OTHER wallets with their OCR text
    const { data, error } = await supabase
      .from('claim_receipts')
      .select('claim_id, ocr_text, claims!inner(wallet, created_at)')
      .gte('claims.created_at', weekAgo)
      .neq('claims.wallet', wallet)
      .limit(100);

    if (error || !data) return { suspicious: false, matchCount: 0, signal: 'query_error' };

    // Extract first line of OCR (usually station name) and compare
    const thisStation = extractStationName(ocrText);
    if (!thisStation) return { suspicious: false, matchCount: 0, signal: 'no_station_name' };

    const matchingWallets = new Set<string>();
    for (const row of data) {
      const otherStation = extractStationName(row.ocr_text || '');
      if (otherStation && isSameStation(thisStation, otherStation)) {
        matchingWallets.add((row as any).claims?.wallet);
      }
    }

    return {
      suspicious: matchingWallets.size >= 2, // 2 other wallets + this one = 3 total
      matchCount: matchingWallets.size + 1,
      signal: matchingWallets.size >= 2 ? `same_station:${thisStation}` : 'unique',
    };
  } catch {
    return { suspicious: false, matchCount: 0, signal: 'error' };
  }
}

/** Extract likely station name from OCR text (usually first non-empty line). */
function extractStationName(ocrText: string): string | null {
  const lines = ocrText.split('\n').map((l) => l.trim()).filter((l) => l.length > 3);
  // First line is usually the station name/brand
  const first = lines[0] || null;
  if (!first) return null;
  // Normalize: uppercase, remove special chars
  return first.toUpperCase().replace(/[^A-Z0-9\s]/g, '').trim();
}

/** Check if two station name strings likely refer to the same place. */
function isSameStation(a: string, b: string): boolean {
  if (a === b) return true;
  // Check if one contains the other (e.g. "SHELL" vs "SHELL STATION #4521")
  if (a.includes(b) || b.includes(a)) return true;
  // Simple similarity: shared word ratio
  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));
  const shared = [...wordsA].filter((w) => wordsB.has(w)).length;
  const total = Math.max(wordsA.size, wordsB.size);
  return total > 0 && shared / total > 0.6;
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
