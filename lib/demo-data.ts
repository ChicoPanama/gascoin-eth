/**
 * Pre-launch demo data — realistic fallback values.
 * Every component checks: if real data is non-empty, use it. Otherwise, use these.
 * When the first real payout lands, demo data disappears automatically.
 */

// ── Treasury ──
export const DEMO_TREASURY = {
  solBalance: 12847,
  solUsd: 2_180_000,
  gascoinBalance: 8_500_000,
  gascoinUsd: 1_950_000,
};

export const DEMO_TREASURY_DISPLAY = {
  treasuryUsd: '$2.2M',
  treasurySub: '12,847 SOL',
  marketCap: '$4.2M',
  volume: '$180K',
};

// ── Dashboard Stats ──
export const DEMO_STATS = {
  refundsToday: 23,
  totalPaid: 4821.5,
  queueDepth: 12,
};

// ── Chart (7-day treasury) ──
export const DEMO_CHART_DATA = [
  { day: 'Mon', sol: 12200 },
  { day: 'Tue', sol: 12350 },
  { day: 'Wed', sol: 12510 },
  { day: 'Thu', sol: 12480 },
  { day: 'Fri', sol: 12690 },
  { day: 'Sat', sol: 12770 },
  { day: 'Sun', sol: 12847 },
];

// ── Leaderboard (10 anonymized entries) ──
export const DEMO_LEADERBOARD = [
  { wallet_address: '7xKp...m3Fv', total_sol_earned: 2.847, rank: 1, total_submissions: 8 },
  { wallet_address: '9bRq...kE2L', total_sol_earned: 2.134, rank: 2, total_submissions: 6 },
  { wallet_address: '3mWx...pT8J', total_sol_earned: 1.892, rank: 3, total_submissions: 5 },
  { wallet_address: 'Ah4N...v7Ks', total_sol_earned: 1.456, rank: 4, total_submissions: 4 },
  { wallet_address: 'Fm9B...cR3P', total_sol_earned: 1.201, rank: 5, total_submissions: 4 },
  { wallet_address: '2qLv...hW6D', total_sol_earned: 0.987, rank: 6, total_submissions: 3 },
  { wallet_address: 'Jn5X...tM4A', total_sol_earned: 0.743, rank: 7, total_submissions: 2 },
  { wallet_address: 'Ks8H...bY1G', total_sol_earned: 0.512, rank: 8, total_submissions: 2 },
  { wallet_address: 'Pv2C...nQ5R', total_sol_earned: 0.234, rank: 9, total_submissions: 1 },
  { wallet_address: 'Wt6F...jL9E', total_sol_earned: 0.089, rank: 10, total_submissions: 1 },
];

// ── Proof of Payout (4 recent receipts) ──
export const DEMO_COMMUNITY = [
  { country: 'United States', sol: 0.42, date: 'Apr 6' },
  { country: 'Mexico', sol: 0.31, date: 'Apr 5' },
  { country: 'Canada', sol: 0.55, date: 'Apr 4' },
  { country: 'United Kingdom', sol: 0.28, date: 'Apr 3' },
];

// ── Gate Pass Rates (10 gates) ──
export const DEMO_GATE_RATES = new Map<number, number>([
  [1, 98],   // Tweet Detected
  [2, 97],   // Tweet Public
  [3, 96],   // #gascoin Hashtag
  [4, 92],   // Tweet Age
  [5, 95],   // Wallet on Receipt
  [6, 88],   // Receipt Legible
  [7, 94],   // Receipt Date Valid
  [8, 97],   // No Duplicate Wallet
  [9, 96],   // No Duplicate Receipt
  [10, 99],  // Treasury Solvent
]);

// ── Referral Stats ──
export const DEMO_REFERRAL = {
  totalConversions: 847,
  activeReferrers: 142,
};

// ── Helper ──
export function fallback<T>(real: T | null | undefined, demo: T): T {
  if (real === null || real === undefined) return demo;
  if (typeof real === 'number' && real === 0) return demo;
  if (typeof real === 'string' && (real === '—' || real === '')) return demo;
  if (Array.isArray(real) && real.length === 0) return demo;
  return real;
}
