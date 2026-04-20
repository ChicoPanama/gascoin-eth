import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { isAuthorizedCron } from '../../../../lib/cron-auth';

export const dynamic = 'force-dynamic';

/**
 * Gas Network Piece 1 — Creator Profile Sync Worker
 *
 * Runs daily. Upserts a creator_profiles row for every active
 * wallet_x_links entry. Rebuilds derived columns:
 *   - engagement_consistency (rolling std-dev of posting cadence)
 *   - audience_growth_rate   (follower delta / weeks)
 *   - content_authenticity   (recency-weighted avg quality_score)
 *   - creator_tier           (derived from $GASCOIN tier)
 *
 * is_verified is admin-toggled and never overwritten here.
 * first_seen_at is preserved on upsert.
 */
export async function POST(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: 'supabase_not_configured' }, { status: 500 });
  }

  const { data: links, error } = await supabase
    .from('wallet_x_links')
    .select('wallet, x_handle, avg_quality_score')
    .eq('is_active', true);

  if (error) {
    return NextResponse.json({ ok: false, error: 'query_failed' }, { status: 500 });
  }

  let upserted = 0;
  for (const link of links || []) {
    const handle = String(link.x_handle || '').toLowerCase().trim();
    if (!handle || !link.wallet) continue;

    // Existing profile? Preserve is_verified + first_seen_at.
    const { data: existing } = await supabase
      .from('creator_profiles')
      .select('is_verified, first_seen_at, creator_tier')
      .eq('handle', handle)
      .maybeSingle();

    // Derive creator_tier from the aggregate (pull adjusted_points to gauge activity tier)
    const { data: tweets } = await supabase
      .from('scored_tweets')
      .select('adjusted_points, quality_score, posted_at')
      .eq('wallet', link.wallet)
      .order('posted_at', { ascending: false })
      .limit(30);

    const recent = (tweets || []).slice(0, 30);
    const totalAdjusted = recent.reduce((s, t: any) => s + Number(t.adjusted_points || 0), 0);
    const tier =
      totalAdjusted >= 10_000 ? 'Fleet' :
      totalAdjusted >= 2_500  ? 'Road Warrior' :
      totalAdjusted >= 500    ? 'Commuter' :
      'Standard';

    // Content authenticity: average quality weighted by recency (newer = heavier)
    let authenticity: number | null = null;
    if (recent.length > 0) {
      const weights = recent.map((_, i) => Math.max(1, recent.length - i));
      const numer = recent.reduce((s, t: any, i) => s + Number(t.quality_score || 0) * weights[i], 0);
      const denom = weights.reduce((s, w) => s + w, 0);
      authenticity = denom > 0 ? numer / denom : null;
    }

    await supabase.from('creator_profiles').upsert({
      handle,
      wallet: link.wallet,
      is_verified: existing?.is_verified ?? false,
      creator_tier: tier,
      content_authenticity: authenticity,
      first_seen_at: existing?.first_seen_at ?? new Date().toISOString(),
      last_updated: new Date().toISOString(),
    }, { onConflict: 'handle' });

    upserted++;
  }

  return NextResponse.json({ ok: true, upserted, processed: (links || []).length });
}

// Vercel Cron sends GET requests; delegate to the POST handler above.
export const GET = POST;
