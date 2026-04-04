export const REFERRAL_CONFIG = {
  REWARD_PER_CONVERSION_SOL: 0.005,
  MAX_REFERRAL_REWARDS_30D_SOL: 0.10,
  MAX_CONVERSIONS_30D: 20,
  REQUIRE_FULL_APPROVAL: true,
  REQUIRE_REFERRER_APPROVED: true,
  BLOCK_SELF_REFERRAL: true,
  REFERRAL_BASE_PATH: '/submit',
  REFERRAL_PARAM: 'ref',
  CODE_LENGTH: 8,
  ATTRIBUTION_WINDOW_SECONDS: 604800,
} as const;

export const SKIP_REASON_LABELS: Record<string, string> = {
  self_referral: 'Self-referral blocked',
  referrer_not_approved: 'Referrer not approved at time of conversion',
  max_conversions_reached: 'Monthly conversion limit reached',
  max_rewards_reached: 'Monthly SOL cap reached',
};
