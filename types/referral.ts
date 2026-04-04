export interface ReferralSummary {
  referrer_wallet: string;
  total_conversions: number;
  paid_conversions: number;
  total_referral_sol_earned: number;
  last_conversion_at: string | null;
  referral_rank: number;
}

export interface ReferralConversion {
  id: string;
  referral_code: string;
  referrer_wallet: string;
  referred_wallet: string;
  submission_id: string;
  reward_sol: number;
  reward_status: string;
  reward_tx_signature: string | null;
  skip_reason: string | null;
  created_at: string;
  dispatched_at: string | null;
}

export interface ReferralClickStats {
  total_clicks: number;
  unique_clicks: number;
  conversions: number;
  conversion_rate_pct: number;
}

export interface EligibilityCheck {
  eligible: boolean;
  reason: string;
  conversions_this_month: number;
  rewards_this_month: number;
}
