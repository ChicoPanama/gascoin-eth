import { NextResponse } from 'next/server';
import { gateRequest } from '../../../../../lib/api-gating';
import { getCreatorProfile, getCreatorImpact } from '../../../../../lib/creator-profile';
import { getSupabaseAdmin } from '../../../../../lib/supabase';
import { signEnvelope } from '../../../../../lib/response-signer';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/reach/[handle]
 * Agency+ only. Returns a signed reach certificate payload suitable for
 * downstream systems (e.g. Piece 4's on-chain reach certificates).
 * Enterprise tier gets the signed envelope; Agency gets the raw JSON.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ handle: string }> },
) {
  const gate = await gateRequest(req, 'agency');
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status || 403 });
  }

  const { handle } = await ctx.params;
  const profile = await getCreatorProfile(handle);
  if (!profile) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const impact = await getCreatorImpact(handle);

  // Top 5 posts by impact
  const supabase = getSupabaseAdmin();
  const { data: topPosts } = await supabase
    .from('scored_tweets')
    .select('tweet_id,impact_score,impressions,direct_payout_eth,referred_wallets')
    .eq('wallet', profile.wallet)
    .order('impact_score', { ascending: false, nullsFirst: false })
    .limit(5);

  const payload = {
    handle: profile.handle,
    wallet: profile.wallet,
    verified_at: new Date().toISOString(),
    total_impressions: impact.totalImpressions,
    total_posts: impact.totalPosts,
    total_eth_earned: impact.totalEthEarned,
    top_posts: topPosts || [],
    issuer: 'gascoin.app',
  };

  const body = gate.tier === 'enterprise' ? signEnvelope(payload) : payload;

  return NextResponse.json(
    { tier: gate.tier, data: body },
    { headers: { 'x-gascoin-tier': gate.tier! } },
  );
}
