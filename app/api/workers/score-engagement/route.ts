import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import pLimit from 'p-limit';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { calculateEngagementPoints } from '../../../../lib/engagement-rewards';
import { scoreTweetQuality, calculateWalletTrust, awardVerifiedPoints } from '../../../../lib/ai-points-engine';
import { searchRecentTweets, extractMetrics, getTweet } from '../../../../lib/x-api';
import type { XTweet, XMedia } from '../../../../lib/x-api';
import { isAuthorizedCron as isAuthorized } from '../../../../lib/cron-auth';
import { updateQualityTrend } from '../../../../lib/data-intelligence';
import { addMemory } from '../../../../lib/mem0';
import { writeIntelligence } from '../../../../lib/knowledge-base';
import { isAiGatewayAvailable } from '../../../../lib/integrations/ai-gateway';
import { chunkedIn } from '../../../../lib/supabase-utils';
import { recordAttributionEvent } from '../../../../lib/attribution';

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

// AI quality scoring + X API paginated reads can take time; bump timeout to 60s
export const maxDuration = 60;

const RESCORE_INTERVAL_MS = 1 * 3600000; // 1 hour — captures engagement velocity during peak growth window

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'X_BEARER_TOKEN not configured' }, { status: 500 });
  }

  // R5: Alert when AI Gateway is unavailable — high-value awards will be held for review
  if (!isAiGatewayAvailable()) {
    writeIntelligence({
      entry_type: 'ai_gateway_unavailable',
      entity_type: 'system',
      entity_id: 'score_engagement_worker',
      summary: 'AI Gateway unavailable during engagement scoring — high-value awards held for review',
      detail_json: {},
      severity: 'high',
      pipeline_source: 'score_engagement',
    }).catch(() => {});
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

    // ─── Handle dedup: only score each X handle once (most recent active wallet) ───
    const handleToWallet = new Map<string, string>();
    for (const [wallet, { handle }] of walletHandles) {
      const h = handle.toLowerCase();
      // Last entry wins — walletHandles is built with links first (newer), claims second
      if (!handleToWallet.has(h)) handleToWallet.set(h, wallet);
    }
    // Rebuild walletHandles keeping only deduplicated entries
    const deduped = new Map<string, { handle: string; userId: string | null }>();
    for (const [handle, wallet] of handleToWallet) {
      const entry = walletHandles.get(wallet);
      if (entry) deduped.set(wallet, entry);
    }
    const originalCount = walletHandles.size;
    // Replace with deduplicated map
    walletHandles.clear();
    for (const [k, v] of deduped) walletHandles.set(k, v);

    // ─── Pre-fetch real wallet trust data for all wallets in batch ───
    const allWallets = [...walletHandles.keys()];
    const walletTrustCache = new Map<string, ReturnType<typeof calculateWalletTrust>>();
    const pointTotalsCache = new Map<string, { today: number; allTime: number; month: number }>();

    if (allWallets.length > 0) {
      // `.in('wallet', allWallets)` silently truncates once the URL crosses
      // ~180 Ethereum addresses. chunkedIn slices the list and concatenates.
      type ClaimRow = { wallet: string; status: string; created_at: string };
      type RefRow = { referrer_wallet: string; reward_status: string };
      type AnomRow = { wallet: string; metadata_json: any };
      type EngPtRow = { wallet: string; points: number; source: string; created_at: string };

      const allClaims = await chunkedIn<ClaimRow>(
        () => supabase.from('claims').select('wallet, status, created_at'),
        'wallet',
        allWallets,
      );
      const allRefs = await chunkedIn<RefRow>(
        () => supabase.from('referral_conversions').select('referrer_wallet, reward_status'),
        'referrer_wallet',
        allWallets,
      );
      const allAnomalies = await chunkedIn<AnomRow>(
        () => supabase.from('engagement_points').select('wallet, metadata_json').eq('source', 'tweet_engagement'),
        'wallet',
        allWallets,
      );

      // Pre-aggregate point totals (today / month / all-time) for every wallet
      // that awardVerifiedPoints may be called for. Skips the per-award N+1.
      const monthStart = `${new Date().toISOString().slice(0, 7)}-01T00:00:00Z`;
      const todayStart = `${new Date().toISOString().slice(0, 10)}T00:00:00Z`;
      const allPoints = await chunkedIn<EngPtRow>(
        () => supabase.from('engagement_points').select('wallet, points, source, created_at'),
        'wallet',
        allWallets,
      );

      // Build O(1)-lookup index Maps — replaces per-wallet .filter() over
      // the full arrays (was O(wallets × records)).
      const claimsByWallet = new Map<string, ClaimRow[]>();
      for (const c of allClaims) {
        const arr = claimsByWallet.get(c.wallet) || [];
        arr.push(c);
        claimsByWallet.set(c.wallet, arr);
      }
      const refsByWallet = new Map<string, RefRow[]>();
      for (const r of allRefs) {
        const arr = refsByWallet.get(r.referrer_wallet) || [];
        arr.push(r);
        refsByWallet.set(r.referrer_wallet, arr);
      }
      const anomaliesByWallet = new Map<string, AnomRow[]>();
      for (const e of allAnomalies) {
        const arr = anomaliesByWallet.get(e.wallet) || [];
        arr.push(e);
        anomaliesByWallet.set(e.wallet, arr);
      }

      for (const pt of allPoints) {
        const cur = pointTotalsCache.get(pt.wallet) || { today: 0, allTime: 0, month: 0 };
        const pts = Number(pt.points || 0);
        cur.allTime += pts;
        if (pt.created_at >= todayStart) cur.today += pts;
        if (pt.created_at >= monthStart && pt.source === 'tweet_engagement') cur.month += pts;
        pointTotalsCache.set(pt.wallet, cur);
      }

      for (const wallet of allWallets) {
        const wClaims = claimsByWallet.get(wallet) || [];
        const wRefs = refsByWallet.get(wallet) || [];
        const wAnomalies = anomaliesByWallet.get(wallet) || [];

        const aiFlags = wAnomalies.filter((e) => {
          const meta = e.metadata_json as any;
          return meta?.verification?.flags?.some?.((f: string) => f.includes('spam') || f.includes('bot'));
        }).length;

        const firstClaim = [...wClaims].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )[0];
        const ageDays = firstClaim?.created_at
          ? Math.floor((Date.now() - new Date(firstClaim.created_at).getTime()) / 86400000)
          : 0;

        walletTrustCache.set(wallet, calculateWalletTrust({
          totalSubmissions: wClaims.length,
          approvedSubmissions: wClaims.filter((c) => ['approved', 'paid', 'ready_for_dispatch'].includes(c.status)).length,
          rejectedSubmissions: wClaims.filter((c) => c.status === 'rejected').length,
          referralConversions: wRefs.filter((r) => r.reward_status === 'verified').length,
          skippedReferrals: wRefs.filter((r) => r.reward_status === 'skipped').length,
          accountAgeDays: ageDays,
          anomalyCount: aiFlags,
        }));
      }
    }

    // ─── PHASE 2: For each handle, search for ALL #gascoin tweets ───
    // Sort stale handles first so that if the X API rate-limit cuts us off
    // mid-run, the handles we did score are the ones most overdue.
    const sortedEntries = [...walletHandles.entries()].sort((a, b) => {
      const aLink = (links || []).find((l: any) => l.wallet === a[0]);
      const bLink = (links || []).find((l: any) => l.wallet === b[0]);
      const aTime = aLink?.last_tweet_scan ? new Date(aLink.last_tweet_scan).getTime() : 0;
      const bTime = bLink?.last_tweet_scan ? new Date(bLink.last_tweet_scan).getTime() : 0;
      return aTime - bTime;
    });

    // Within one handle, tweets are scored in parallel (DB + AI round-trips
    // dominate; X API rate-limits are per-app, not per-tweet). Across handles
    // we stay sequential so we don't burst the X search endpoint.
    const tweetLimit = pLimit(3);

    for (const [wallet, { handle }] of sortedEntries) {
      handlesScanned++;

      try {
        const result = await searchRecentTweets(`from:${handle} #gascoin`, 10);

        if (result.tweets.length === 0) {
          // Fallback: re-score claim-linked tweets through the SAME pipeline
          // used for search-found tweets. An earlier shortcut bypassed AI
          // quality scoring + verification — legacy path left in by accident.
          const claimTweets = (claims || []).filter((c: any) => c.wallet === wallet);
          for (const claim of claimTweets) {
            const idMatch = claim.tweet_url?.match(/status\/(\d+)/);
            if (!idMatch) continue;
            const fetched = await getTweet(idMatch[1]);
            if (!fetched.tweet) continue;
            const scoreResult = await scoreTweet(
              supabase,
              wallet,
              handle,
              fetched.tweet,
              0,
              rescoreCutoff,
              walletTrustCache.get(wallet),
              [],
              pointTotalsCache.get(wallet),
            );
            if (scoreResult.scored) scored++;
            if (scoreResult.pointsAwarded > 0) totalPointsAwarded += scoreResult.pointsAwarded;
            if (scoreResult.heldForReview) heldForReview++;
          }
          continue;
        }

        const authorUser = result.users.find((u) => u.username.toLowerCase() === handle.toLowerCase());
        const followerCount = authorUser?.public_metrics?.followers_count || 0;

        tweetsFound += result.tweets.length;

        const scorePromises = result.tweets.map((tweet) =>
          tweetLimit(() =>
            scoreTweet(
              supabase,
              wallet,
              handle,
              tweet,
              followerCount,
              rescoreCutoff,
              walletTrustCache.get(wallet),
              result.media,
              pointTotalsCache.get(wallet),
            ),
          ),
        );
        const settled = await Promise.allSettled(scorePromises);
        for (const r of settled) {
          if (r.status !== 'fulfilled') continue;
          if (r.value.scored) scored++;
          if (r.value.pointsAwarded > 0) totalPointsAwarded += r.value.pointsAwarded;
          if (r.value.heldForReview) heldForReview++;
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
          updateQualityTrend(supabase, wallet).catch(() => {});
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
  mediaIncludes: XMedia[] = [],
  precomputedTotals?: { today: number; allTime: number; month: number },
): Promise<{ scored: boolean; pointsAwarded: number; heldForReview: boolean }> {
  // Check if already scored recently — also pull metrics_history so we can
  // append the current snapshot for engagement-velocity analysis.
  const { data: existingScored } = await supabase
    .from('scored_tweets')
    .select('id, last_scored_at, adjusted_points, score_count, metrics_history, last_scored_impressions')
    .eq('tweet_id', tweet.id)
    .maybeSingle();

  if (existingScored && existingScored.last_scored_at > rescoreCutoff) {
    return { scored: false, pointsAwarded: 0, heldForReview: false };
  }

  const metrics = extractMetrics(tweet, mediaIncludes);
  const rawPoints = calculateEngagementPoints(metrics);
  const tweetText = tweet.text || '';

  // ─── Content dedup: prevent delete-and-repost gaming ───
  const contentHash = createHash('sha256').update(tweetText.toLowerCase().trim()).digest('hex');
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: dupeContent } = await supabase
    .from('scored_tweets')
    .select('tweet_id')
    .eq('wallet', wallet)
    .eq('content_hash', contentHash)
    .neq('tweet_id', tweet.id)
    .gte('posted_at', thirtyDaysAgo)
    .limit(1);

  if (dupeContent && dupeContent.length > 0) {
    return { scored: false, pointsAwarded: 0, heldForReview: false };
  }

  // AI quality scoring
  const qualityScore = await scoreTweetQuality({
    tweetText,
    impressions: metrics.impressions,
    likes: metrics.likes,
    retweets: metrics.retweets,
    replies: metrics.replies,
    followerCount,
    contentType: metrics.content_type,
  });

  const points = Math.round(rawPoints * qualityScore.multiplier);

  // Append current metrics snapshot to the tweet's history ring. 24 entries
  // = ~24h at hourly rescore cadence; old snapshots fall off. Velocity jumps
  // between adjacent entries signal purchased engagement.
  const existingHistory: Array<Record<string, unknown>> = Array.isArray(existingScored?.metrics_history)
    ? (existingScored!.metrics_history as Array<Record<string, unknown>>)
    : [];
  const metricsSnapshot = {
    ts: new Date().toISOString(),
    impressions: metrics.impressions,
    likes: metrics.likes,
    retweets: metrics.retweets,
    replies: metrics.replies,
    bookmarks: metrics.bookmarks,
  };
  const updatedHistory = [...existingHistory, metricsSnapshot].slice(-24);

  // Upsert scored tweet record (now includes bookmarks + content_type)
  await supabase.from('scored_tweets').upsert({
    wallet,
    x_handle: handle,
    tweet_id: tweet.id,
    tweet_url: `https://x.com/${handle}/status/${tweet.id}`,
    tweet_text: tweetText.slice(0, 500),
    posted_at: tweet.created_at,
    impressions: metrics.impressions,
    likes: metrics.likes,
    retweets: metrics.retweets,
    quote_tweets: metrics.quote_tweets,
    replies: metrics.replies,
    bookmarks: metrics.bookmarks,
    content_type: metrics.content_type,
    content_hash: contentHash,
    raw_points: rawPoints,
    adjusted_points: points,
    quality_score: qualityScore.quality,
    quality_multiplier: qualityScore.multiplier,
    metrics_history: updatedHistory,
    last_scored_at: new Date().toISOString(),
    last_scored_impressions: metrics.impressions,
    score_count: existingScored ? existingScored.score_count + 1 : 1,
  }, { onConflict: 'tweet_id' });

  // Gas Network Piece 5.5 — impression attribution signal. Delta = current
  // - last_scored. Fire-and-forget. Zero events on first-ever score
  // (existingScored is null → treat as seed, not a delta).
  const priorImpressions = existingScored
    ? Number((existingScored as Record<string, unknown>).last_scored_impressions || 0)
    : 0;
  const impressionDelta = existingScored
    ? Math.max(0, Number(metrics.impressions || 0) - priorImpressions)
    : 0;
  if (impressionDelta > 0) {
    recordAttributionEvent(tweet.id, 'impression', null, {
      delta: impressionDelta,
      snapshot: Number(metrics.impressions || 0),
    }).catch(() => {});
  }

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
      content_type: metrics.content_type,
      isClaimLinked: false, isDelta: !!existingScored,
    },
    walletTrust: trust,
    tweetQuality: qualityScore,
    precomputedTotals,
  });

  // Record notable engagement signals in mem0
  if (qualityScore.isSpam || qualityScore.isBotEngagement || (result.awarded && result.points > 500)) {
    addMemory('wallet', wallet,
      `Engagement: tweet ${tweet.id} type=${metrics.content_type} quality=${qualityScore.quality.toFixed(2)}, ` +
      `spam=${qualityScore.isSpam}, bot=${qualityScore.isBotEngagement}, points=${result.awarded ? result.points : 0}`,
      { pipeline: 'engagement', tweet_id: tweet.id, content_type: metrics.content_type, points: result.awarded ? result.points : 0 },
    ).catch(() => {});
  }

  return {
    scored: true,
    pointsAwarded: result.awarded ? result.points : 0,
    heldForReview: result.heldForReview,
  };
}

