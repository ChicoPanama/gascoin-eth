import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { calculateEngagementPoints } from '../../../../lib/engagement-rewards';
import { scoreTweetQuality, calculateWalletTrust, awardVerifiedPoints } from '../../../../lib/ai-points-engine';
import { searchRecentTweets, extractMetrics, getUserByUsername } from '../../../../lib/x-api';
import type { XTweet } from '../../../../lib/x-api';
import { isAuthorizedCron as isAuthorized } from '../../../../lib/cron-auth';
import { updateQualityTrend } from '../../../../lib/data-intelligence';
import { addMemory } from '../../../../lib/mem0';

// ═══════════════════════════════════════════
// Engagement Worker v3
//
// Scans ALL #gascoin tweets from linked X accounts.
// Changes from v2:
// - Uses searchRecentTweets helper (api.x.com, not api.twitter.com)
// - Reads bookmark_count from public_metrics
// - No artificial handle limit — paginates through all active links
// - Looks up real wallet trust data instead of hardcoded defaults
// - Uses extractMetrics helper for consistent metric parsing
//
// Runs every hour via Vercel cron
// ═══════════════════════════════════════════

const RESCORE_INTERVAL_MS = 1 * 3600000; // 1 hour — captures engagement velocity during peak growth window

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
    const rescoreCutoff = new Date(Date.now() - RESCORE_INTERVAL_MS).toISOString();

    let scored = 0;
    let totalPointsAwarded = 0;
    let heldForReview = 0;
    let tweetsFound = 0;
    let handlesScanned = 0;

    // ─── PHASE 1: Get ALL active wallet ↔ X handle pairs (no limit) ───
    const { data: links } = await supabase
      .from('wallet_x_links')
      .select('wallet, x_handle, x_user_id, last_tweet_scan')
      .eq('is_active', true);

    // Also get claim-linked tweets as fallback
    const { data: claims } = await supabase
      .from('claims')
      .select('id, wallet, tweet_url, status')
      .in('status', ['approved', 'paid', 'ready_for_dispatch'])
      .limit(200);

    // Build wallet → handle map from both sources
    const walletHandles = new Map<string, { handle: string; userId: string | null }>();

    for (const link of links || []) {
      walletHandles.set(link.wallet, { handle: link.x_handle, userId: link.x_user_id });
    }

    for (const claim of claims || []) {
      if (walletHandles.has(claim.wallet)) continue;
      const handleMatch = claim.tweet_url?.match(/x\.com\/([^/]+)\//);
      if (handleMatch) walletHandles.set(claim.wallet, { handle: handleMatch[1], userId: null });
    }

    // ─── Pre-fetch real wallet trust data for all wallets in batch ───
    const allWallets = [...walletHandles.keys()];
    const walletTrustCache = new Map<string, ReturnType<typeof calculateWalletTrust>>();

    if (allWallets.length > 0) {
      const { data: allClaims } = await supabase
        .from('claims')
        .select('wallet, status, created_at')
        .in('wallet', allWallets);

      const { data: allRefs } = await supabase
        .from('referral_conversions')
        .select('referrer_wallet, reward_status')
        .in('referrer_wallet', allWallets);

      const { data: allAnomalies } = await supabase
        .from('engagement_points')
        .select('wallet, metadata_json')
        .eq('source', 'tweet_engagement')
        .in('wallet', allWallets);

      for (const wallet of allWallets) {
        const wClaims = (allClaims || []).filter((c: any) => c.wallet === wallet);
        const wRefs = (allRefs || []).filter((r: any) => r.referrer_wallet === wallet);
        const wAnomalies = (allAnomalies || []).filter((e: any) => e.wallet === wallet);

        const aiFlags = wAnomalies.filter((e: any) => {
          const meta = e.metadata_json as any;
          return meta?.verification?.flags?.some?.((f: string) => f.includes('spam') || f.includes('bot'));
        }).length;

        const firstClaim = wClaims.sort((a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )[0] as any;
        const ageDays = firstClaim?.created_at
          ? Math.floor((Date.now() - new Date(firstClaim.created_at).getTime()) / 86400000)
          : 0;

        walletTrustCache.set(wallet, calculateWalletTrust({
          totalSubmissions: wClaims.length,
          approvedSubmissions: wClaims.filter((c: any) => ['approved', 'paid', 'ready_for_dispatch'].includes(c.status)).length,
          rejectedSubmissions: wClaims.filter((c: any) => c.status === 'rejected').length,
          referralConversions: wRefs.filter((r: any) => r.reward_status === 'verified').length,
          skippedReferrals: wRefs.filter((r: any) => r.reward_status === 'skipped').length,
          accountAgeDays: ageDays,
          anomalyCount: aiFlags,
        }));
      }
    }

    // ─── PHASE 2: For each handle, search for ALL #gascoin tweets ───
    for (const [wallet, { handle, userId }] of walletHandles) {
      handlesScanned++;

      try {
        const result = await searchRecentTweets(`from:${handle} #gascoin`, 10);

        if (result.tweets.length === 0) {
          // Fallback: score claim-linked tweets individually
          const claimTweets = (claims || []).filter((c: any) => c.wallet === wallet);
          for (const claim of claimTweets) {
            await scoreSingleTweet(supabase, token, wallet, handle, claim.tweet_url, claim.id);
            scored++;
          }
          continue;
        }

        const authorUser = result.users.find((u) => u.username.toLowerCase() === handle.toLowerCase());
        const followerCount = authorUser?.public_metrics?.followers_count || 0;

        tweetsFound += result.tweets.length;

        for (const tweet of result.tweets) {
          const scoreResult = await scoreTweet(supabase, wallet, handle, tweet, followerCount, rescoreCutoff, walletTrustCache.get(wallet));
          if (scoreResult.scored) scored++;
          if (scoreResult.pointsAwarded > 0) totalPointsAwarded += scoreResult.pointsAwarded;
          if (scoreResult.heldForReview) heldForReview++;
        }

        // Update last scan timestamp + persist X profile data
        const linkUpdate: Record<string, any> = { last_tweet_scan: new Date().toISOString() };
        if (authorUser) {
          if ((authorUser as any).location) linkUpdate.x_location = (authorUser as any).location;
          if ((authorUser as any).description) linkUpdate.bio = (authorUser as any).description;
          if ((authorUser as any).created_at) linkUpdate.x_account_created_at = (authorUser as any).created_at;
          if ((authorUser as any).protected !== undefined) linkUpdate.x_is_protected = !!(authorUser as any).protected;
        }
        await supabase.from('wallet_x_links')
          .update(linkUpdate)
          .eq('wallet', wallet)
          .eq('x_handle', handle);

        // Update rolling quality trend for this wallet (non-blocking)
        if (result.tweets.length > 0) {
          updateQualityTrend(supabase, wallet, result.tweets[0]?.public_metrics ? 0.5 : 0).catch(() => {});
        }

      } catch {
        continue;
      }
    }

    return NextResponse.json({
      ok: true,
      handlesScanned,
      tweetsFound,
      scored,
      totalPointsAwarded,
      heldForReview,
      aiVerified: true,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'worker_failed' }, { status: 500 });
  }
}

// ─── Score a single tweet from search results ───
async function scoreTweet(
  supabase: any,
  wallet: string,
  handle: string,
  tweet: XTweet,
  followerCount: number,
  rescoreCutoff: string,
  walletTrust?: ReturnType<typeof calculateWalletTrust>,
): Promise<{ scored: boolean; pointsAwarded: number; heldForReview: boolean }> {
  // Check if already scored recently
  const { data: existingScored } = await supabase
    .from('scored_tweets')
    .select('id, last_scored_at, adjusted_points, score_count')
    .eq('tweet_id', tweet.id)
    .maybeSingle();

  if (existingScored && existingScored.last_scored_at > rescoreCutoff) {
    return { scored: false, pointsAwarded: 0, heldForReview: false };
  }

  const metrics = extractMetrics(tweet);
  const rawPoints = calculateEngagementPoints(metrics);
  const tweetText = tweet.text || '';

  // AI quality scoring
  const qualityScore = await scoreTweetQuality({
    tweetText,
    impressions: metrics.impressions,
    likes: metrics.likes,
    retweets: metrics.retweets,
    replies: metrics.replies,
    followerCount,
  });

  const points = Math.round(rawPoints * qualityScore.multiplier);

  // Upsert scored tweet record (now includes bookmarks)
  await supabase.from('scored_tweets').upsert({
    wallet,
    x_handle: handle,
    tweet_id: tweet.id,
    tweet_url: `https://x.com/${handle}/status/${tweet.id}`,
    tweet_text: tweetText.slice(0, 500),
    posted_at: tweet.created_at,
    ...metrics,
    raw_points: rawPoints,
    adjusted_points: points,
    quality_score: qualityScore.quality,
    quality_multiplier: qualityScore.multiplier,
    last_scored_at: new Date().toISOString(),
    score_count: existingScored ? existingScored.score_count + 1 : 1,
  }, { onConflict: 'tweet_id' });

  // Calculate delta points (only new engagement since last score)
  const previousPoints = existingScored ? Number(existingScored.adjusted_points || 0) : 0;
  const deltaPoints = existingScored ? Math.max(0, points - previousPoints) : points;

  if (deltaPoints <= 0) {
    return { scored: true, pointsAwarded: 0, heldForReview: false };
  }

  // Use real wallet trust (pre-fetched) or fallback
  const trust = walletTrust || calculateWalletTrust({
    totalSubmissions: 1, approvedSubmissions: 1, rejectedSubmissions: 0,
    referralConversions: 0, skippedReferrals: 0, accountAgeDays: 30, anomalyCount: 0,
  });

  const result = await awardVerifiedPoints(supabase, {
    wallet,
    source: 'tweet_engagement',
    rawPoints: deltaPoints,
    metadata: {
      tweet_id: tweet.id, x_handle: handle, metrics, tweetText: tweetText.slice(0, 200),
      quality: qualityScore.quality, multiplier: qualityScore.multiplier,
      isClaimLinked: false, isDelta: !!existingScored,
    },
    walletTrust: trust,
    tweetQuality: qualityScore,
  });

  // Record notable engagement signals in mem0
  if (qualityScore.isSpam || qualityScore.isBotEngagement || (result.awarded && result.points > 500)) {
    addMemory('wallet', wallet,
      `Engagement: tweet ${tweet.id} quality=${qualityScore.quality.toFixed(2)}, ` +
      `spam=${qualityScore.isSpam}, bot=${qualityScore.isBotEngagement}, points=${result.awarded ? result.points : 0}`,
      { pipeline: 'engagement', tweet_id: tweet.id, points: result.awarded ? result.points : 0 },
    ).catch(() => {});
  }

  return {
    scored: true,
    pointsAwarded: result.awarded ? result.points : 0,
    heldForReview: result.heldForReview,
  };
}

// ─── Fallback: score a single claim-linked tweet by URL ───
async function scoreSingleTweet(supabase: any, token: string, wallet: string, handle: string, tweetUrl: string, claimId: string) {
  const tweetIdMatch = tweetUrl?.match(/status\/(\d+)/);
  if (!tweetIdMatch) return;

  const tweetId = tweetIdMatch[1];
  const endpoint = new URL(`https://api.x.com/2/tweets/${tweetId}`);
  endpoint.searchParams.set('tweet.fields', 'public_metrics,text,created_at');

  try {
    const res = await fetch(endpoint.toString(), {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return;

    const json = (await res.json()) as any;
    const pm = json?.data?.public_metrics;
    if (!pm) return;

    const metrics = {
      impressions: Number(pm.impression_count || 0),
      likes: Number(pm.like_count || 0),
      retweets: Number(pm.retweet_count || 0),
      quote_tweets: Number(pm.quote_count || 0),
      replies: Number(pm.reply_count || 0),
      bookmarks: Number(pm.bookmark_count || 0),
    };

    // Legacy engagement_scores entry
    await supabase.from('engagement_scores').upsert({
      wallet, claim_id: claimId, tweet_url: tweetUrl,
      ...metrics,
      score: metrics.impressions * 0.01 + metrics.likes + metrics.retweets * 3 + metrics.quote_tweets * 5 + metrics.replies * 2 + metrics.bookmarks * 2,
      fetched_at: new Date().toISOString(),
    }, { onConflict: 'claim_id' });
  } catch {}
}
