import { NextResponse } from 'next/server';
import { gateRequest, filterForTier } from '../../../../../lib/api-gating';
import { getCreatorProfile, getCreatorPosts, getCreatorImpact } from '../../../../../lib/creator-profile';
import { signEnvelope } from '../../../../../lib/response-signer';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  ctx: { params: Promise<{ handle: string }> },
) {
  const gate = await gateRequest(req, 'free');
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status || 403 });
  }

  const { handle } = await ctx.params;
  const [profile, posts, impact] = await Promise.all([
    getCreatorProfile(handle),
    getCreatorPosts(handle, 20),
    getCreatorImpact(handle),
  ]);
  if (!profile) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const record = {
    handle: profile.handle,
    wallet: profile.wallet,
    wallet_short: profile.walletShort,
    is_verified: profile.isVerified,
    creator_tier: profile.tier,
    bio: profile.bio,
    x_location: profile.location,
    avg_quality_score: profile.avgQualityScore,
    first_seen_at: profile.firstSeenAt,
    linked_at: profile.linkedAt,
    total_posts: impact.totalPosts,
    total_impressions: impact.totalImpressions,
    total_eth_earned: impact.totalEthEarned,
    total_paid_claims: impact.totalPaidClaims,
    impact_score: posts.reduce((m, p) => Math.max(m, p.impactScore ?? 0), 0),
    recent_posts: posts.slice(0, 10).map((p) => ({
      tweet_id: p.tweetId,
      tweet_url: p.tweetUrl,
      posted_at: p.postedAt,
      impressions: p.impressions,
      impact_score: p.impactScore,
    })),
    history: null, // wired in future iteration; placeholder so agency+ shape is stable
    audience_signals: null,
  };

  const filtered = filterForTier(record, gate.tier!);
  const body = gate.tier === 'enterprise' ? signEnvelope(filtered) : filtered;

  return NextResponse.json(
    { tier: gate.tier, data: body },
    { headers: { 'x-gascoin-tier': gate.tier! } },
  );
}
