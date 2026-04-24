/**
 * Beta-test demo data — realistic fallback values for pre-launch surfaces.
 *
 * Every public component checks:
 *   if real data is non-empty → use it
 *   otherwise                 → use these demo values
 *
 * Once real beta activity hits each surface (first real payout, first real
 * leaderboard entry, etc.), demo data disappears automatically for that
 * surface. Per-surface, not all-or-nothing.
 *
 * Scale: tuned to look like a live closed beta with ~14 active testers,
 * a modest treasury (~$76K), and a handful of approved refunds. Easy to
 * edit in one place when the real numbers cross over.
 *
 * **Swap in real beta tester X handles** in DEMO_LEADERBOARD below —
 * just replace `@betaXX` placeholders with actual handles; keep the
 * wallets/points/ranks or tweak per-tester as you like.
 */

// ── Treasury (mock: $76K at beta scale) ──
export const DEMO_TREASURY = {
  ethBalance: 23.5,         // ~23.5 ETH (@ ~$3,200) ≈ $76K
  ethUsd: 76_000,
  gascoinBalance: 0,        // token not deployed yet
  gascoinUsd: 0,
};

export const DEMO_TREASURY_DISPLAY = {
  treasuryUsd: '$76K',
  treasurySub: '23.5 ETH',
  marketCap: '—',           // no token yet
  volume: '—',
};

// ── Dashboard Stats (beta-test scale) ──
export const DEMO_STATS = {
  refundsToday: 3,
  totalPaid: 0.42,          // ~0.42 ETH paid out in refunds to date
  queueDepth: 4,
};

// ── Chart (7-day treasury, approx flat during beta) ──
export const DEMO_CHART_DATA = [
  { day: 'Mon', eth: 23.20 },
  { day: 'Tue', eth: 23.28 },
  { day: 'Wed', eth: 23.35 },
  { day: 'Thu', eth: 23.38 },
  { day: 'Fri', eth: 23.42 },
  { day: 'Sat', eth: 23.47 },
  { day: 'Sun', eth: 23.50 },
];

// ── Leaderboard (14 beta testers) ──
// Replace the `x_handle` placeholders with real beta tester handles.
// Wallets are truncated ETH-style (0x…XYZW). Points decay naturally
// from the top down and match typical Season 1 early-tester activity.
export const DEMO_LEADERBOARD = [
  { wallet_address: '0x7a2c…m3Fv', total_eth_earned: 0.082, rank: 1,  total_submissions: 6, composite_score: 11_420, x_handle: 'beta01' },
  { wallet_address: '0x9b4d…kE2L', total_eth_earned: 0.071, rank: 2,  total_submissions: 5, composite_score: 9_840,  x_handle: 'beta02' },
  { wallet_address: '0x3e1f…pT8J', total_eth_earned: 0.063, rank: 3,  total_submissions: 5, composite_score: 8_720,  x_handle: 'beta03' },
  { wallet_address: '0xAa8b…v7Ks', total_eth_earned: 0.054, rank: 4,  total_submissions: 4, composite_score: 7_310,  x_handle: 'beta04' },
  { wallet_address: '0xFc2e…cR3P', total_eth_earned: 0.048, rank: 5,  total_submissions: 4, composite_score: 6_480,  x_handle: 'beta05' },
  { wallet_address: '0x2a9c…hW6D', total_eth_earned: 0.041, rank: 6,  total_submissions: 3, composite_score: 5_620,  x_handle: 'beta06' },
  { wallet_address: '0xJd5a…tM4A', total_eth_earned: 0.037, rank: 7,  total_submissions: 3, composite_score: 4_980,  x_handle: 'beta07' },
  { wallet_address: '0xK8b1…bY1G', total_eth_earned: 0.031, rank: 8,  total_submissions: 2, composite_score: 4_210,  x_handle: 'beta08' },
  { wallet_address: '0xP1c4…nQ5R', total_eth_earned: 0.026, rank: 9,  total_submissions: 2, composite_score: 3_540,  x_handle: 'beta09' },
  { wallet_address: '0xW3f2…jL9E', total_eth_earned: 0.022, rank: 10, total_submissions: 2, composite_score: 2_980,  x_handle: 'beta10' },
  { wallet_address: '0xBf9a…xU7T', total_eth_earned: 0.018, rank: 11, total_submissions: 1, composite_score: 2_340,  x_handle: 'beta11' },
  { wallet_address: '0xCc4d…yN2V', total_eth_earned: 0.015, rank: 12, total_submissions: 1, composite_score: 1_820,  x_handle: 'beta12' },
  { wallet_address: '0xD7e0…zK8Q', total_eth_earned: 0.012, rank: 13, total_submissions: 1, composite_score: 1_390,  x_handle: 'beta13' },
  { wallet_address: '0xE4a7…wH5M', total_eth_earned: 0.009, rank: 14, total_submissions: 1, composite_score: 980,    x_handle: 'beta14' },
];

// ── Proof of Payout (recent beta refunds) ──
// USD shown to the user; on-chain settlement is in ETH.
export const DEMO_COMMUNITY = [
  { country: 'United States', usd: 38.00, date: 'Apr 22' },
  { country: 'Mexico',        usd: 29.00, date: 'Apr 21' },
  { country: 'Canada',        usd: 41.00, date: 'Apr 20' },
  { country: 'Germany',       usd: 33.00, date: 'Apr 19' },
  { country: 'United Kingdom',usd: 27.00, date: 'Apr 18' },
  { country: 'Brazil',        usd: 35.00, date: 'Apr 17' },
  { country: 'Australia',     usd: 30.00, date: 'Apr 16' },
  { country: 'Japan',         usd: 44.00, date: 'Apr 14' },
];

// ── Gate Pass Rates (closed-beta scale) ──
export const DEMO_GATE_RATES = new Map<number, number>([
  [1, 98], [2, 97], [3, 95], [4, 91], [5, 94],
  [6, 86], [7, 93], [8, 96], [9, 95], [10, 99],
]);

// ── Referral Stats (14 redeemed beta testers) ──
export const DEMO_REFERRAL = {
  totalConversions: 14,
  activeReferrers: 9,
};

// ── Community Stats (modest beta totals) ──
export const DEMO_COMMUNITY_STATS = {
  total_approved: 38,
  total_eth_paid: 0.42,
  unique_countries: 8,
  avg_refund_eth: 0.011,
};

// ── Gate Stats (beta-scale, proportional to ~40 claims) ──
export const DEMO_GATE_STATS = [
  { gate_id: 1,  total_processed: 52, total_passed: 51, pass_rate_pct: 98, avg_duration_ms: 120 },
  { gate_id: 2,  total_processed: 51, total_passed: 49, pass_rate_pct: 97, avg_duration_ms: 85 },
  { gate_id: 3,  total_processed: 49, total_passed: 47, pass_rate_pct: 95, avg_duration_ms: 90 },
  { gate_id: 4,  total_processed: 47, total_passed: 43, pass_rate_pct: 91, avg_duration_ms: 110 },
  { gate_id: 5,  total_processed: 43, total_passed: 41, pass_rate_pct: 94, avg_duration_ms: 340 },
  { gate_id: 6,  total_processed: 41, total_passed: 35, pass_rate_pct: 86, avg_duration_ms: 2100 },
  { gate_id: 7,  total_processed: 35, total_passed: 33, pass_rate_pct: 93, avg_duration_ms: 180 },
  { gate_id: 8,  total_processed: 33, total_passed: 32, pass_rate_pct: 96, avg_duration_ms: 60 },
  { gate_id: 9,  total_processed: 32, total_passed: 30, pass_rate_pct: 95, avg_duration_ms: 75 },
  { gate_id: 10, total_processed: 30, total_passed: 30, pass_rate_pct: 99, avg_duration_ms: 40 },
];

// ── Helper ──
export function fallback<T>(real: T | null | undefined, demo: T): T {
  if (real === null || real === undefined) return demo;
  if (typeof real === 'number' && real === 0) return demo;
  if (typeof real === 'string' && (real === '—' || real === '')) return demo;
  if (Array.isArray(real) && real.length === 0) return demo;
  return real;
}
