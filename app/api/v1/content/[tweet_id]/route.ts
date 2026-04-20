import { NextResponse } from 'next/server';
import { gateRequest, filterForTier } from '../../../../../lib/api-gating';
import { getSupabaseAdmin } from '../../../../../lib/supabase';
import { signEnvelope } from '../../../../../lib/response-signer';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/content/[tweet_id]
 * Returns impact-scored content metrics for a single scored tweet.
 * Builder+ sees the payout breakdown; Agency+ sees claim linkage.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ tweet_id: string }> },
) {
  const gate = await gateRequest(req, 'builder');
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status || 403 });
  }

  const { tweet_id } = await ctx.params;
  const supabase = getSupabaseAdmin();

  const { data: tweet } = await supabase
    .from('scored_tweets')
    .select('tweet_id,tweet_url,wallet,x_handle,posted_at,impressions,likes,retweets,replies,quote_tweets,quality_score,adjusted_points,impact_score,direct_payout_eth,referral_payout_eth,referred_wallets,content_type')
    .eq('tweet_id', tweet_id)
    .maybeSingle();

  if (!tweet) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const record = {
    tweet_id: tweet.tweet_id,
    tweet_url: tweet.tweet_url,
    handle: tweet.x_handle,
    wallet: tweet.wallet,
    posted_at: tweet.posted_at,
    impressions: tweet.impressions,
    likes: tweet.likes,
    retweets: tweet.retweets,
    replies: tweet.replies,
    quote_tweets: tweet.quote_tweets,
    quality_score: tweet.quality_score,
    adjusted_points: tweet.adjusted_points,
    impact_score: tweet.impact_score,
    direct_payout_eth: tweet.direct_payout_eth,
    referral_payout_eth: tweet.referral_payout_eth,
    referred_wallets: tweet.referred_wallets,
    content_type: tweet.content_type,
  };

  const filtered = filterForTier(record, gate.tier!);
  const body = gate.tier === 'enterprise' ? signEnvelope(filtered) : filtered;

  return NextResponse.json(
    { tier: gate.tier, data: body },
    { headers: { 'x-gascoin-tier': gate.tier! } },
  );
}
