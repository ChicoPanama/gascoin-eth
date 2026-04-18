// ═══════════════════════════════════════════
// GASCOIN Referral System
// Referrals earn POINTS, not SOL
// ETH payouts are for gas receipts ONLY
// ═══════════════════════════════════════════

export const REFERRAL_CONFIG = {
  // Welcome bonus: one-time when referred user's first claim approved
  // Ongoing passive income (2%) handled by daily award-points worker
  POINTS_PER_CONVERSION: 100,  // Welcome bonus (was 500 flat)

  // Monthly caps (30-day rolling window)
  MAX_CONVERSIONS_30D: 20,
  MAX_POINTS_30D: 2000,  // 20 × 100 welcome bonuses

  // Requirements
  REQUIRE_FULL_APPROVAL: true,
  REQUIRE_REFERRER_APPROVED: true,
  BLOCK_SELF_REFERRAL: true,

  // Attribution
  REFERRAL_BASE_PATH: '/submit',
  REFERRAL_PARAM: 'ref',
  CODE_LENGTH: 8,
  ATTRIBUTION_WINDOW_SECONDS: 604800, // 7 days
} as const;

export const SKIP_REASON_LABELS: Record<string, string> = {
  self_referral: 'Self-referral blocked',
  referrer_not_approved: 'Referrer not approved at time of conversion',
  max_conversions_reached: 'Monthly conversion limit reached',
  max_points_reached: 'Monthly points cap reached',
};
