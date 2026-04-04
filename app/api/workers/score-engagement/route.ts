import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';

// Worker: fetch tweet engagement metrics from X API and score them
// Run via cron or manually: POST /api/workers/score-engagement
//
// Engagement score formula per tweet:
//   score = impressions * 0.01 + likes * 1 + retweets * 3 + quote_tweets * 5 + replies * 2

function computeEngagementScore(metrics: {
  impressions: number;
  likes: number;
  retweets: number;
  quote_tweets: number;
  replies: number;
}): number {
  return (
    metrics.impressions * 0.01 +
    metrics.likes * 1 +
    metrics.retweets * 3 +
    metrics.quote_tweets * 5 +
    metrics.replies * 2
  );
}

function parseTweetId(url: string): string | null {
  const m = url.match(/status\/(\d+)/i);
  return m?.[1] || null;
}

export async function POST() {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'X_BEARER_TOKEN not configured' }, { status: 500 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Get all approved claims with tweet URLs that haven't been scored in the last 6 hours
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

    const { data: claims, error: claimErr } = await supabase
      .from('claims')
      .select('id, wallet, tweet_url')
      .eq('status', 'approved')
      .limit(50);

    if (claimErr) throw claimErr;
    if (!claims || claims.length === 0) {
      return NextResponse.json({ ok: true, scored: 0, message: 'no claims to score' });
    }

    let scored = 0;

    for (const claim of claims) {
      const tweetId = parseTweetId(claim.tweet_url);
      if (!tweetId) continue;

      // Check if already scored recently
      const { data: existing } = await supabase
        .from('engagement_scores')
        .select('id, fetched_at')
        .eq('claim_id', claim.id)
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing && existing.fetched_at > sixHoursAgo) continue;

      // Fetch tweet metrics from X API
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

        const score = computeEngagementScore(metrics);

        // Upsert engagement score
        if (existing) {
          await supabase
            .from('engagement_scores')
            .update({
              ...metrics,
              score,
              fetched_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('engagement_scores')
            .insert({
              wallet: claim.wallet,
              claim_id: claim.id,
              tweet_url: claim.tweet_url,
              ...metrics,
              score,
            });
        }

        scored++;
      } catch {
        // Skip individual tweet failures
        continue;
      }
    }

    return NextResponse.json({ ok: true, scored, total_claims: claims.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'worker failed' }, { status: 500 });
  }
}
