export interface LeaderboardEntry {
  wallet_address: string;
  total_submissions: number;
  total_eth_earned: number;
  last_submission_at: string;
  rank: number;
  gascoin_holdings: number;
  composite_score: number;
  referral_count: number;
  engagement_score: number;
  // X identity (from wallet_x_links)
  x_handle?: string;
  profile_image_url?: string;
}

export interface LeaderboardStats {
  total_earners: number;
  total_eth_paid: number;
  total_approved: number;
  largest_single_refund: number;
  avg_refund_amount: number;
  // New
  total_gascoin_held: number;
  total_referrals: number;
}

export interface WalletSubmissionHistory {
  id: string;
  sol_amount: number;
  created_at: string;
  gates_passed: number;
  status: string;
}
