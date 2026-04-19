import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { isValidEthereumAddress } from '../../../../lib/validate-wallet';
import { checkRateLimit } from '../../../../lib/rate-limit';
import { getClientIp } from '../../../../lib/ip';

// GET — fetch complete engagement data for a wallet
// Queries scored_tweets (per-tweet metrics) + engagement_points (all point sources)
export async function GET(req: Request) {
  const rl = await checkRateLimit(`pub_engagement:${getClientIp(req)}`, 20, 60);
  if (!rl.ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json({ error: 'wallet param required' }, { status: 400 });
  }

  // SECURITY: Validate wallet format
  if (!isValidEthereumAddress(wallet)) {
    return NextResponse.json({ error: 'invalid_wallet_address' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Fetch scored tweets (individual tweet records with full metrics)
    const { data: scoredTweets } = await supabase
      .from('scored_tweets')
      .select('tweet_id, tweet_url, tweet_text, posted_at, impressions, likes, retweets, quote_tweets, replies, bookmarks, raw_points, adjusted_points, quality_score, quality_multiplier, last_scored_at, score_count')
      .eq('wallet', wallet)
      .order('posted_at', { ascending: false });

    // Fetch all engagement points by source
    const { data: pointEntries } = await supabase
      .from('engagement_points')
      .select('source, points, created_at')
      .eq('wallet', wallet)
      .not('source', 'like', 'pending_%');

    // Aggregate by source
    const pointsBySource: Record<string, number> = {};
    for (const entry of pointEntries || []) {
      pointsBySource[entry.source] = (pointsBySource[entry.source] || 0) + Number(entry.points || 0);
    }

    // Aggregate tweet-level metrics
    const tweets = scoredTweets || [];
    const totalImpressions = tweets.reduce((s, t: any) => s + Number(t.impressions || 0), 0);
    const totalLikes = tweets.reduce((s, t: any) => s + Number(t.likes || 0), 0);
    const totalRetweets = tweets.reduce((s, t: any) => s + Number(t.retweets || 0), 0);
    const totalQuotes = tweets.reduce((s, t: any) => s + Number(t.quote_tweets || 0), 0);
    const totalReplies = tweets.reduce((s, t: any) => s + Number(t.replies || 0), 0);
    const totalBookmarks = tweets.reduce((s, t: any) => s + Number(t.bookmarks || 0), 0);
    const totalTweetPoints = tweets.reduce((s, t: any) => s + Number(t.adjusted_points || 0), 0);
    const totalAllPoints = Object.values(pointsBySource).reduce((s, v) => s + v, 0);

    // Legacy engagement_scores fallback
    const { data: legacyScores } = await supabase
      .from('engagement_scores')
      .select('id, tweet_url, impressions, likes, retweets, replies, quote_tweets, score, fetched_at')
      .eq('wallet', wallet)
      .order('fetched_at', { ascending: false });

    return NextResponse.json({
      wallet,
      // Aggregated totals
      total_points: totalAllPoints,
      points_by_source: pointsBySource,
      // Tweet-level aggregates
      tweet_metrics: {
        scored_tweets: tweets.length,
        total_impressions: totalImpressions,
        total_likes: totalLikes,
        total_retweets: totalRetweets,
        total_quotes: totalQuotes,
        total_replies: totalReplies,
        total_bookmarks: totalBookmarks,
        total_tweet_points: totalTweetPoints,
      },
      // Detailed tweet entries
      tweets,
      // Legacy data (for backwards compat)
      legacy_entries: legacyScores || [],
    });
  } catch {
    return NextResponse.json({ error: 'failed to fetch engagement' }, { status: 500 });
  }
}
