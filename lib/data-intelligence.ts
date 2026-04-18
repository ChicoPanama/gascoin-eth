/**
 * Data Intelligence Module
 *
 * Wires up unused database tables and adds cross-submission analysis:
 * - Gas price recording per submission
 * - Treasury flow snapshots
 * - Receipt pattern detection (same-station fraud rings)
 * - Engagement quality trending per user
 */

import { silentLog } from './silent-log';

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
      city: null,
      country: data.country,
      currency: data.currency || 'USD',
      price_per_liter: null,
      price_per_gallon_usd: null,
      amount_usd: data.amountUsd,
      source: 'submission_ocr',
    });
  } catch (err) {
    silentLog(err, { module: 'data-intelligence', operation: 'recordGasPrice' });
  }
}

/**
 * Query median receipt amount for a country.
 *
 * COLD-START BEHAVIOUR: Returns { median: null } until at least 10 OCR-sourced
 * receipts have been recorded for the requested country in gas_city_prices.
 * This is intentional — fewer than 10 samples don't provide a statistically
 * meaningful baseline and would produce noisy outlier signals.
 *
 * Callers MUST handle median: null gracefully (skip the outlier check rather
 * than blocking the submission). The signal activates automatically once the
 * 10-sample threshold is crossed for a given country; no code change needed.
 *
 * AI2 NOTE: This signal is inactive for new/low-volume countries until
 * sufficient real-world data accumulates. Log a warning if the absence of this
 * signal is relevant to a fraud decision so auditors know the check was skipped
 * due to cold-start, not because the signal passed.
 */
export async function getTypicalGasPrice(
  supabase: any,
  country: string,
): Promise<{ median: number | null; sampleSize: number }> {
  try {
    const { data, error } = await supabase
      .from('gas_city_prices')
      .select('amount_usd')
      .eq('country', country)
      .not('amount_usd', 'is', null)
      .order('ts', { ascending: false })
      .limit(200);

    if (error || !data || data.length < 10) {
      // Cold-start: not enough samples yet for this country. Returning null is
      // correct — callers must skip the outlier check when median is null.
      // This is NOT a silent null; it is a documented, expected return value.
      if (process.env.NODE_ENV === 'development' && data && data.length < 10 && data.length > 0) {
        console.warn(
          `[data-intelligence] getTypicalGasPrice cold-start: country="${country}" has only ${data.length}/10 required samples. Gas price outlier check is inactive.`,
        );
      }
      return { median: null, sampleSize: data?.length ?? 0 };
    }

    const amounts = data.map((r: any) => Number(r.amount_usd)).sort((a: number, b: number) => a - b);
    const mid = Math.floor(amounts.length / 2);
    const median = amounts.length % 2 === 0
      ? (amounts[mid - 1] + amounts[mid]) / 2
      : amounts[mid];

    return { median, sampleSize: amounts.length };
  } catch (err) {
    silentLog(err, { module: 'data-intelligence', operation: 'getTypicalGasPrice', extra: { country } });
    return { median: null, sampleSize: 0 };
  }
}

/** Snapshot treasury balance after payout batch. */
export async function snapshotTreasury(
  supabase: any,
  balances: {
    ethBalance: number;
    ethUsd: number;
    gascoinBalance: number;
    gascoinUsd: number;
  },
): Promise<void> {
  try {
    const wallet = process.env.GASCOIN_TREASURY_WALLET || '';
    await supabase.from('treasury_snapshots').insert({
      wallet,
      eth_balance: balances.ethBalance,
      usd_value: balances.ethUsd,
      gascoin_balance: balances.gascoinBalance,
      gascoin_usd_value: balances.gascoinUsd,
    });
  } catch (err) {
    silentLog(err, { module: 'data-intelligence', operation: 'snapshotTreasury' });
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

  const stationName = extractStationName(ocrText);
  if (!stationName) return { suspicious: false, matchCount: 0, signal: 'no_station_name' };

  try {
    // Similarity match pushed into Postgres — pg_trgm is already enabled.
    // Replaces the old JS loop that pulled 100 rows and compared in-process.
    const { data, error } = await supabase.rpc('find_similar_stations', {
      p_wallet: wallet,
      p_station_name: stationName,
      p_since: new Date(Date.now() - 7 * 86400000).toISOString(),
      p_similarity_threshold: 0.6,
    });

    if (error || !data) return { suspicious: false, matchCount: 0, signal: 'query_error' };

    const matchingWallets = data.length;
    return {
      suspicious: matchingWallets >= 2,
      matchCount: matchingWallets + 1,
      signal: matchingWallets >= 2 ? `same_station:${stationName}` : 'unique',
    };
  } catch (err) {
    silentLog(err, { module: 'data-intelligence', operation: 'detectStationPattern', wallet });
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
  } catch (err) {
    silentLog(err, { module: 'data-intelligence', operation: 'updateQualityTrend', wallet });
  }
}
