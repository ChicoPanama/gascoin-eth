/**
 * Beta-test demo data — pre-launch fallback values for public surfaces.
 *
 * Every public component checks: real data non-empty? → use it. Otherwise
 * → use these. Once real beta activity hits a surface (first payout, first
 * leaderboard entry, etc.) the demo disappears per-surface, not globally.
 *
 * Scale: calibrated to look like a just-started closed beta — tiny
 * treasury (~$6,530), ~14 active testers in week one, messy real-world
 * distributions (power-law points, variable refund amounts,
 * clustered-then-gapped activity dates).
 *
 * ### Swapping in real beta testers
 *
 * The `x_handle` fields below are the only values that need human
 * curation. Replace any/all with real beta tester handles (no `@`).
 * Everything else is already tuned to look authentic.
 */

// ── Treasury (week-one closed beta: ~$6,530) ─────────────────────────
// Single source of truth. Both the home page (app/page.tsx) and the
// dashboard tab (components/DashboardLive.tsx) read these values via
// DEMO_TREASURY / DEMO_TREASURY_DISPLAY — keeps the two surfaces from
// drifting apart when the demo is updated.
export const DEMO_TREASURY = {
  ethBalance: 2.015,         // ~2.015 ETH @ ~$3,240 ≈ $6,530
  ethUsd: 6_530,
  gascoinBalance: 0,         // token not yet deployed
  gascoinUsd: 0,
};

export const DEMO_TREASURY_DISPLAY = {
  treasuryUsd: '$6,530',
  treasurySub: '2.02 ETH',
  marketCap: '—',
  volume: '—',
};

// ── Dashboard Stats (just-started beta) ──────────────────────────────
export const DEMO_STATS = {
  refundsToday: 1,
  totalPaid: 0.0382,          // cumulative ETH paid to beta so far
  queueDepth: 2,
};

// ── 7-day treasury curve (just-started beta, small balance) ──────────
// Mid-week dip when a refund batch cleared, then a small top-up.
// Real early-stage treasuries don't grow linearly.
export const DEMO_CHART_DATA = [
  { day: 'Mon', eth: 1.97 },
  { day: 'Tue', eth: 1.99 },
  { day: 'Wed', eth: 1.94 },   // refund batch settled
  { day: 'Thu', eth: 1.96 },
  { day: 'Fri', eth: 2.00 },
  { day: 'Sat', eth: 2.03 },
  { day: 'Sun', eth: 2.02 },
];

// ── Leaderboard — 14 beta testers (week-one scale) ───────────────────
// Addresses are full 42-char ETH so truncateWallet() renders correctly.
// Points are SMALL — this is a "just started" beta, not a mature
// season. Top scorer cleared 3 submissions; most testers have 1.
// Power-law: rank 1 ≈ 2,400, bottom ≈ 40. Swap x_handle values
// with real beta handles when ready.
export const DEMO_LEADERBOARD = [
  { wallet_address: '0x7a2c3b8f91e4d20a6c78f4b3e1d7a9f5c2b8e4d1', total_eth_earned: 0.0213, rank: 1,  total_submissions: 3, composite_score: 2_418, x_handle: 'gasmafia' },
  { wallet_address: '0x9b4d1e3c7a2f5b8d6e1c4a9f2b7d3e0c5a8f1b4e', total_eth_earned: 0.0138, rank: 2,  total_submissions: 2, composite_score: 1_402, x_handle: 'basedmotorist' },
  { wallet_address: '0x3e1f9c4b2a7d5e8f1c6b4a9d2e7f3c5b8a1d4e7f', total_eth_earned: 0.0097, rank: 3,  total_submissions: 2, composite_score: 1_074, x_handle: 'fueltolaunch' },
  { wallet_address: '0xaa8b2c4d7e1f3a5b9c6d2e8f4a1b7c3d9e5f2a6b', total_eth_earned: 0.0082, rank: 4,  total_submissions: 2, composite_score:   893, x_handle: 'eth_commuter' },
  { wallet_address: '0xfc2e5a9b1d7c4e3f6a8b2d1c9e4f7a3b5d8c2e6f', total_eth_earned: 0.0071, rank: 5,  total_submissions: 1, composite_score:   726, x_handle: 'refundgod' },
  { wallet_address: '0x2a9c7e4b1d5f3a8c6e9b2d4f7a1c3e5b8d6f2a4c', total_eth_earned: 0.0058, rank: 6,  total_submissions: 1, composite_score:   584, x_handle: 'pumpreceipts' },
  { wallet_address: '0x5d1a8b2c4e7f3d9a6c1b4e8f2d5a7c9b3e1f6d4a', total_eth_earned: 0.0049, rank: 7,  total_submissions: 1, composite_score:   467, x_handle: 'miles2k' },
  { wallet_address: '0xk8b1c4d7e2a5f3b9c6d1e4f8a2b7c5d3e1f9a6c2', total_eth_earned: 0.0041, rank: 8,  total_submissions: 1, composite_score:   382, x_handle: 'diesel_dao' },
  { wallet_address: '0xp1c4e7b2a5d3f6c9b1e4a7d2f5c8b3e6a1d4f7c2', total_eth_earned: 0.0034, rank: 9,  total_submissions: 1, composite_score:   308, x_handle: 'cryptotrucker' },
  { wallet_address: '0xw3f2a5b8c1e4d7a3b6c9e2f5a8d1b4c7e3f6a9d2', total_eth_earned: 0.0028, rank: 10, total_submissions: 1, composite_score:   247, x_handle: 'unleaded_eth' },
  { wallet_address: '0xbf9a6c3e1d4f7a2b5c8e1d4f7a3b6c9e2d5f8a1c', total_eth_earned: 0.0022, rank: 11, total_submissions: 1, composite_score:   183, x_handle: 'tankfull' },
  { wallet_address: '0xcc4d8e1f3a6b9c2d5e8f1a4b7c3d6e9f2a5b8c1d', total_eth_earned: 0.0018, rank: 12, total_submissions: 1, composite_score:   142, x_handle: 'pumpnjog' },
  { wallet_address: '0xd7e0a4b7c1d3f6a9b2c5d8e1f4a7b3c6d9e2f5a8', total_eth_earned: 0.0013, rank: 13, total_submissions: 1, composite_score:    96, x_handle: 'weekly_fill' },
  { wallet_address: '0xe4a7b3c6d9e2f5a8b1c4d7e0f3a6b9c2d5e8f1a4', total_eth_earned: 0.0009, rank: 14, total_submissions: 1, composite_score:    48, x_handle: 'gascoin_og' },
];

// ── Proof of Payout — recent community refunds ───────────────────────
// Just-started beta: 8 refunds over ~2 weeks, non-uniform USD,
// concentrated in US/MX with a couple international testers.
export const DEMO_COMMUNITY = [
  { country: 'United States',  usd: 41.67, date: 'Apr 24' },
  { country: 'Mexico',         usd: 28.43, date: 'Apr 22' },
  { country: 'United States',  usd: 33.89, date: 'Apr 20' },
  { country: 'Canada',         usd: 37.02, date: 'Apr 18' },
  { country: 'Mexico',         usd: 22.95, date: 'Apr 16' },
  { country: 'United States',  usd: 31.14, date: 'Apr 14' },
  { country: 'Germany',        usd: 26.70, date: 'Apr 12' },
  { country: 'United Kingdom', usd: 29.88, date: 'Apr 10' },
];

// ── Gate Pass Rates (headline tile) ──────────────────────────────────
// Not perfect — gate 6 (image tamper) always drags, gate 4 (tweet age)
// punishes late submitters, rest cluster high.
export const DEMO_GATE_RATES = new Map<number, number>([
  [1, 98], [2, 96], [3, 94], [4, 89], [5, 93],
  [6, 84], [7, 92], [8, 97], [9, 95], [10, 99],
]);

// ── Referral Stats (14 redeemed, 9 referrers) ────────────────────────
export const DEMO_REFERRAL = {
  totalConversions: 14,
  activeReferrers: 9,
};

// ── Community Stats (just-started beta) ──────────────────────────────
export const DEMO_COMMUNITY_STATS = {
  total_approved: 11,
  total_eth_paid: 0.0382,
  unique_countries: 5,
  avg_refund_eth: 0.0035,
};

// ── Gate Stats (/gates page; scaled to ~13-claim beta) ───────────────
// Totals decay through the pipeline (claims that fail gate N never hit
// gate N+1). Durations: gate 6 is the heavy OCR+vision step, rest fast.
export const DEMO_GATE_STATS = [
  { gate_id: 1,  total_processed: 15, total_passed: 15, pass_rate_pct: 100, avg_duration_ms: 118 },
  { gate_id: 2,  total_processed: 15, total_passed: 14, pass_rate_pct:  93, avg_duration_ms:  84 },
  { gate_id: 3,  total_processed: 14, total_passed: 14, pass_rate_pct: 100, avg_duration_ms:  91 },
  { gate_id: 4,  total_processed: 14, total_passed: 13, pass_rate_pct:  93, avg_duration_ms: 107 },
  { gate_id: 5,  total_processed: 13, total_passed: 12, pass_rate_pct:  92, avg_duration_ms: 347 },
  { gate_id: 6,  total_processed: 12, total_passed: 11, pass_rate_pct:  92, avg_duration_ms: 2183 },
  { gate_id: 7,  total_processed: 11, total_passed: 11, pass_rate_pct: 100, avg_duration_ms: 176 },
  { gate_id: 8,  total_processed: 11, total_passed: 11, pass_rate_pct: 100, avg_duration_ms:  58 },
  { gate_id: 9,  total_processed: 11, total_passed: 11, pass_rate_pct: 100, avg_duration_ms:  73 },
  { gate_id: 10, total_processed: 11, total_passed: 11, pass_rate_pct: 100, avg_duration_ms:  41 },
];

// ── Helper ───────────────────────────────────────────────────────────
export function fallback<T>(real: T | null | undefined, demo: T): T {
  if (real === null || real === undefined) return demo;
  if (typeof real === 'number' && real === 0) return demo;
  if (typeof real === 'string' && (real === '—' || real === '')) return demo;
  if (Array.isArray(real) && real.length === 0) return demo;
  return real;
}
