import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { calculateEngagementPoints } from '../../../../lib/engagement-rewards';
import { scoreTweetQuality } from '../../../../lib/ai-points-engine';

function isAuthorized(req: Request): boolean {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

function parseTweetId(url: string): string | null {
  const m = url.match(/status\/(\d+)/i);
  return m?.[1] || null;
}

// Worker: fetch tweet engagement metrics from X API, compute scores + award points
// Runs every 6 hours via Vercel cron
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'X_BEARER_TOKEN not configured' }, { status: 500 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const sixHoursAgo = new Date(Date.now() - 6 * 3600000).toISOString();

    // Get approved/paid claims with tweet URLs
    const { data: claims } = await supabase
      .from('claims')
      .select('id, wallet, tweet_url, status')
      .in('status', ['approved', 'paid', 'ready_for_dispatch'])
      .limit(50);

    if (!claims || claims.length === 0) {
      return NextResponse.json({ ok: true, scored: 0, pointsAwarded: 0 });
    }

    let scored = 0;
    let totalPointsAwarded = 0;

    for (const claim of claims) {
      const tweetId = parseTweetId(claim.tweet_url);
      if (!tweetId) continue;

      // Skip if scored recently
      const { data: existing } = await supabase
        .from('engagement_scores')
        .select('id, fetched_at, score')
        .eq('claim_id', claim.id)
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing && existing.fetched_at > sixHoursAgo) continue;

      try {
        const endpoint = new URL(`https://api.x.com/2/tweets/${tweetId}`);
        endpoint.searchParams.set('tweet.fields', 'public_metrics');

        const res = await fetch(endpoint.toString(), {
          headers: { authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (!res.ok) continue;

        const json = (await res.json()) as any;
        const pm = json?.data?.public_metrics;
        if (!pm) continue;

        const metrics = {
          impressions: Number(pm.impression_count || 0),
          likes: Number(pm.like_count || 0),
          retweets: Number(pm.retweet_count || 0),
          quote_tweets: Number(pm.quote_count || 0),
          replies: Number(pm.reply_count || 0),
        };

        // Calculate points using the engagement rewards formula
        const rawPoints = calculateEngagementPoints(metrics);

        // AI quality scoring — adjusts points based on tweet authenticity
        const tweetText = json?.data?.text || '';
        const qualityScore = await scoreTweetQuality({
          tweetText,
          impressions: metrics.impressions,
          likes: metrics.likes,
          retweets: metrics.retweets,
          replies: metrics.replies,
          followerCount: json?.includes?.users?.[0]?.public_metrics?.followers_count || 0,
        });

        // Apply quality multiplier: spam/bots get penalized, genuine content rewarded
        const points = Math.round(rawPoints * qualityScore.multiplier);

        // Legacy score for backward compatibility
        const legacyScore = metrics.impressions * 0.01 + metrics.likes * 1 +
          metrics.retweets * 3 + metrics.quote_tweets * 5 + metrics.replies * 2;

        // Upsert engagement score
        if (existing) {
          const previousScore = Number(existing.score || 0);
          await supabase.from('engagement_scores').update({
            ...metrics, score: legacyScore, fetched_at: new Date().toISOString(),
          }).eq('id', existing.id);

          // Award delta points (only new engagement since last check)
          const previousPoints = calculateEngagementPoints({
            impressions: 0, likes: 0, retweets: 0, quote_tweets: 0, replies: 0,
          }); // We don't have previous metrics, so award based on score delta
          const pointsDelta = Math.max(0, points - (previousScore * 10)); // Rough conversion
          if (pointsDelta > 0) {
            await supabase.from('engagement_points').insert({
              wallet: claim.wallet,
              source: 'tweet_engagement',
              points: pointsDelta,
              metadata_json: { claim_id: claim.id, tweet_id: tweetId, metrics, delta: true, ai: { quality: qualityScore.quality, multiplier: qualityScore.multiplier, isSpam: qualityScore.isSpam, isBotEngagement: qualityScore.isBotEngagement } },
            });
            totalPointsAwarded += pointsDelta;
          }
        } else {
          await supabase.from('engagement_scores').insert({
            wallet: claim.wallet, claim_id: claim.id, tweet_url: claim.tweet_url,
            ...metrics, score: legacyScore,
          });

          // Award full points for first score
          if (points > 0) {
            await supabase.from('engagement_points').insert({
              wallet: claim.wallet,
              source: 'tweet_engagement',
              points,
              metadata_json: { claim_id: claim.id, tweet_id: tweetId, metrics, ai: { quality: qualityScore.quality, multiplier: qualityScore.multiplier, isSpam: qualityScore.isSpam, isBotEngagement: qualityScore.isBotEngagement } },
            });
            totalPointsAwarded += points;
          }
        }

        scored++;
      } catch {
        continue;
      }
    }

    return NextResponse.json({
      ok: true,
      scored,
      totalPointsAwarded,
      pointsOnly: true, // SOL payouts are for receipts only
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'worker failed' }, { status: 500 });
  }
}
