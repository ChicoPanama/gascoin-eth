export interface LeaderboardEntry {
  wallet_address: string;
  total_submissions: number;
  total_sol_earned: number;
  last_submission_at: string;
  rank: number;
  // GASCOIN holdings — on-chain lookup
  gascoin_holdings: number;
  // Composite score used for ranking
  composite_score: number;
  // Referrals (skeleton — not yet implemented)
  referral_count: number;
  // Tweet engagement (skeleton — not yet implemented)
  engagement_score: number;
}

export interface LeaderboardStats {
  total_earners: number;
  total_sol_paid: number;
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
