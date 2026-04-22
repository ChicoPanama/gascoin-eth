export interface CommunityReceipt {
  id: string;
  wallet: string;
  eth_amount: number;
  country: string | null;
  receipt_usd: number | null;
  receipt_date: string | null;
  storage_path: string | null;
  is_featured: boolean;
  created_at: string;
  gates_passed: number;
  is_redacted: boolean;
  // Client-side
  image_url?: string | null;
  is_own?: boolean;
}

export type FeedFilter = 'all' | 'featured' | 'own';
export type FeedSort = 'newest' | 'oldest' | 'highest_eth' | 'highest_usd';

export interface CommunityStats {
  total_approved: number;
  total_eth_paid: number;
  total_usd_paid: number;
  unique_countries: number;
  avg_refund_eth: number;
  avg_refund_usd: number;
  eth_price_usd: number;
}
