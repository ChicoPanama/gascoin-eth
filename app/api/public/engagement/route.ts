import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';

// GET — fetch engagement score for a wallet
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json({ error: 'wallet param required' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('engagement_scores')
      .select('id, tweet_url, impressions, likes, retweets, replies, quote_tweets, score, fetched_at')
      .eq('wallet', wallet)
      .order('fetched_at', { ascending: false });

    if (error) throw error;

    const totalScore = (data || []).reduce((s: number, r: any) => s + Number(r.score || 0), 0);
    const totalImpressions = (data || []).reduce((s: number, r: any) => s + Number(r.impressions || 0), 0);

    return NextResponse.json({
      wallet,
      total_engagement_score: totalScore,
      total_impressions: totalImpressions,
      scored_tweets: (data || []).length,
      entries: data || [],
    });
  } catch {
    return NextResponse.json({ error: 'failed to fetch engagement' }, { status: 500 });
  }
}
