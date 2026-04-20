/**
 * Verified Creator Profile data layer.
 *
 * Reads from existing tables — wallet_x_links (X handle + metadata),
 * scored_tweets (content + engagement), payouts (earnings), and the
 * new creator_profiles table (verification + tier) — and exposes a
 * clean typed surface for UI + API routes.
 *
 * All lookups are case-insensitive on x_handle and allow both active
 * and inactive links (profiles persist even if a link is marked stale).
 */

import { getSupabaseAdmin } from './supabase';

export interface CreatorProfile {
  handle: string;
  wallet: string;
  walletShort: string;
  isVerified: boolean;
  tier: string | null;
  profileImageUrl: string | null;
  bio: string | null;
  location: string | null;
  avgQualityScore: number | null;
  firstSeenAt: string | null;
  linkedAt: string | null;
  /** Composite Influence Score v2 — 0–100, null if not yet computed. */
  compositeScore: number | null;
}

export interface CreatorPost {
  tweetId: string;
  tweetUrl: string;
  postedAt: string | null;
  impressions: number;
  likes: number;
  retweets: number;
  replies: number;
  quoteTweets: number;
  adjustedPoints: number;
  qualityScore: number | null;
  impactScore: number | null;
  directPayoutEth: number | null;
  referralPayoutEth: number | null;
  referredWallets: number | null;
}

export interface CreatorImpact {
  totalPosts: number;
  totalImpressions: number;
  totalEthEarned: number;
  totalPaidClaims: number;
  bestPostImpressions: number;
}

export interface CreatorCertificate {
  milestone: string;
  amount: number;
  tokenId: number | null;
  txHash: string | null;
  mintedAt: string | null;
}

/** Normalize for case-insensitive handle lookup. */
function norm(handle: string): string {
  return (handle || '').trim().toLowerCase();
}

/**
 * Display-safe wallet truncation: 0x + 2 hex + … + last 4.
 * Safe with any input length; returns input unchanged if < 10 chars.
 */
export function truncateWallet(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Look up a creator profile by X handle. Joins wallet_x_links (required)
 * with creator_profiles (optional — absence just means unverified).
 * Returns null if the handle has never been linked to a wallet.
 */
export async function getCreatorProfile(handle: string): Promise<CreatorProfile | null> {
  if (!handle) return null;
  const h = norm(handle);
  const supabase = getSupabaseAdmin();

  const { data: link } = await supabase
    .from('wallet_x_links')
    .select('wallet,x_handle,profile_image_url,avg_quality_score,bio,x_location,linked_at')
    .ilike('x_handle', h)
    .maybeSingle();

  if (!link) return null;

  const { data: profile } = await supabase
    .from('creator_profiles')
    .select('handle,wallet,is_verified,creator_tier,first_seen_at')
    .ilike('handle', h)
    .maybeSingle();

  const { data: composite } = await supabase
    .from('composite_scores')
    .select('composite')
    .eq('wallet', String(link.wallet).toLowerCase())
    .maybeSingle();

  return {
    handle: h,
    wallet: link.wallet,
    walletShort: truncateWallet(link.wallet),
    isVerified: Boolean(profile?.is_verified),
    tier: profile?.creator_tier ?? null,
    profileImageUrl: link.profile_image_url ?? null,
    bio: link.bio ?? null,
    location: link.x_location ?? null,
    avgQualityScore: link.avg_quality_score ?? null,
    firstSeenAt: profile?.first_seen_at ?? null,
    linkedAt: link.linked_at ?? null,
    compositeScore: composite?.composite != null ? Number(composite.composite) : null,
  };
}

/**
 * Return a creator's recent scored tweets, newest first.
 */
export async function getCreatorPosts(handle: string, limit = 20): Promise<CreatorPost[]> {
  if (!handle) return [];
  const h = norm(handle);
  const supabase = getSupabaseAdmin();

  const { data: link } = await supabase
    .from('wallet_x_links')
    .select('wallet')
    .ilike('x_handle', h)
    .maybeSingle();

  if (!link?.wallet) return [];

  const { data: tweets } = await supabase
    .from('scored_tweets')
    .select('tweet_id,tweet_url,posted_at,impressions,likes,retweets,replies,quote_tweets,adjusted_points,quality_score,impact_score,direct_payout_eth,referral_payout_eth,referred_wallets')
    .eq('wallet', link.wallet)
    .order('posted_at', { ascending: false })
    .limit(limit);

  return (tweets || []).map((t: any) => ({
    tweetId: t.tweet_id,
    tweetUrl: t.tweet_url ?? '',
    postedAt: t.posted_at ?? null,
    impressions: Number(t.impressions || 0),
    likes: Number(t.likes || 0),
    retweets: Number(t.retweets || 0),
    replies: Number(t.replies || 0),
    quoteTweets: Number(t.quote_tweets || 0),
    adjustedPoints: Number(t.adjusted_points || 0),
    qualityScore: t.quality_score ?? null,
    impactScore: t.impact_score != null ? Number(t.impact_score) : null,
    directPayoutEth: t.direct_payout_eth != null ? Number(t.direct_payout_eth) : null,
    referralPayoutEth: t.referral_payout_eth != null ? Number(t.referral_payout_eth) : null,
    referredWallets: t.referred_wallets != null ? Number(t.referred_wallets) : null,
  }));
}

/**
 * Aggregated impact for a creator: totals across posts + confirmed payouts.
 */
export async function getCreatorImpact(handle: string): Promise<CreatorImpact> {
  const empty: CreatorImpact = {
    totalPosts: 0,
    totalImpressions: 0,
    totalEthEarned: 0,
    totalPaidClaims: 0,
    bestPostImpressions: 0,
  };
  if (!handle) return empty;
  const h = norm(handle);
  const supabase = getSupabaseAdmin();

  const { data: link } = await supabase
    .from('wallet_x_links')
    .select('wallet')
    .ilike('x_handle', h)
    .maybeSingle();
  if (!link?.wallet) return empty;

  const wallet = link.wallet;
  const [tweetsRes, payoutsRes] = await Promise.all([
    supabase
      .from('scored_tweets')
      .select('impressions,adjusted_points')
      .eq('wallet', wallet),
    supabase
      .from('payouts')
      .select('amount_eth,status')
      .eq('wallet', wallet),
  ]);

  const tweets = tweetsRes.data || [];
  const paidPayouts = (payoutsRes.data || []).filter((p: any) => p.status === 'paid');

  const totalImpressions = tweets.reduce((s: number, t: any) => s + Number(t.impressions || 0), 0);
  const bestPostImpressions = tweets.reduce((m: number, t: any) => Math.max(m, Number(t.impressions || 0)), 0);
  const totalEthEarned = paidPayouts.reduce((s: number, p: any) => s + Number(p.amount_eth || 0), 0);

  return {
    totalPosts: tweets.length,
    totalImpressions,
    totalEthEarned,
    totalPaidClaims: paidPayouts.length,
    bestPostImpressions,
  };
}

/**
 * Fetch earned reach certificates for a creator. Only confirmed mints
 * (status=paid with tx_hash) are returned — in-flight/dry-run mints
 * don't surface to the public.
 */
export async function getCreatorCertificates(handle: string): Promise<CreatorCertificate[]> {
  if (!handle) return [];
  const h = norm(handle);
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from('certificate_mints_public')
    .select('milestone,amount,token_id,tx_hash,minted_at')
    .eq('handle', h)
    .order('minted_at', { ascending: false });

  return (data || []).map((c: any) => ({
    milestone: c.milestone,
    amount: Number(c.amount || 0),
    tokenId: c.token_id != null ? Number(c.token_id) : null,
    txHash: c.tx_hash ?? null,
    mintedAt: c.minted_at ?? null,
  }));
}
