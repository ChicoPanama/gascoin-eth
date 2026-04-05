import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { POINTS_CONFIG } from '../../../../lib/engagement-rewards';
import { TOKEN_TIERS, getTierForBalance } from '../../../../lib/token-tiers';

function isAuthorized(req: Request): boolean {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

// ═══════════════════════════════════════════
// Daily Points Worker
//
// Runs once per day. Awards:
// 1. Submission points — for newly approved receipts not yet awarded
// 2. Streak bonus — for wallets with consecutive 30-day submission windows
// 3. Holdings bonus — tier-based daily points for GASCOIN holders
// 4. AI audit — validates point integrity, flags anomalies
//
// Cron: 0 6 * * * (daily at 6am UTC)
// ═══════════════════════════════════════════
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const now = new Date();
    const todayKey = now.toISOString().split('T')[0]; // YYYY-MM-DD

    let submissionPointsAwarded = 0;
    let streakPointsAwarded = 0;
    let holdingsPointsAwarded = 0;
    let anomalies: string[] = [];

    // ─── 1. SUBMISSION POINTS ───
    // Find approved/paid claims that haven't received submission points yet
    const { data: paidPayouts } = await supabase
      .from('payouts')
      .select('id, wallet, claim_id, created_at')
      .eq('status', 'paid');

    for (const payout of paidPayouts || []) {
      // Check if already awarded
      const { data: existing } = await supabase
        .from('engagement_points')
        .select('id')
        .eq('wallet', payout.wallet)
        .eq('source', 'submission_approved')
        .ilike('metadata_json->>claim_id', payout.claim_id)
        .maybeSingle();

      if (existing) continue;

      await supabase.from('engagement_points').insert({
        wallet: payout.wallet,
        source: 'submission_approved',
        points: POINTS_CONFIG.POINTS_PER_APPROVED_SUBMISSION,
        metadata_json: { claim_id: payout.claim_id, payout_id: payout.id, awarded_date: todayKey },
      });
      submissionPointsAwarded += POINTS_CONFIG.POINTS_PER_APPROVED_SUBMISSION;
    }

    // ─── 2. STREAK BONUS ───
    // Check each wallet's consecutive 30-day submission windows
    const wallets = [...new Set((paidPayouts || []).map((p: any) => p.wallet))];

    for (const wallet of wallets) {
      // Check if already awarded streak today
      const { data: streakToday } = await supabase
        .from('engagement_points')
        .select('id')
        .eq('wallet', wallet)
        .eq('source', 'streak_bonus')
        .gte('created_at', `${todayKey}T00:00:00Z`)
        .maybeSingle();

      if (streakToday) continue;

      // Count consecutive 30-day windows with at least one paid payout
      const { data: walletPayouts } = await supabase
        .from('payouts')
        .select('created_at')
        .eq('wallet', wallet)
        .eq('status', 'paid')
        .order('created_at', { ascending: false });

      if (!walletPayouts || walletPayouts.length === 0) continue;

      let consecutiveWindows = 0;
      let checkDate = new Date();

      for (let i = 0; i < POINTS_CONFIG.MAX_STREAK_MULTIPLIER; i++) {
        const windowStart = new Date(checkDate.getTime() - 30 * 86400000);
        const hasPayoutInWindow = walletPayouts.some((p: any) => {
          const d = new Date(p.created_at);
          return d >= windowStart && d <= checkDate;
        });

        if (hasPayoutInWindow) {
          consecutiveWindows++;
          checkDate = windowStart;
        } else {
          break;
        }
      }

      if (consecutiveWindows >= 2) { // Need at least 2 consecutive windows for streak
        const streakPoints = consecutiveWindows * POINTS_CONFIG.POINTS_PER_STREAK_WINDOW;
        await supabase.from('engagement_points').insert({
          wallet,
          source: 'streak_bonus',
          points: streakPoints,
          metadata_json: { consecutive_windows: consecutiveWindows, awarded_date: todayKey },
        });
        streakPointsAwarded += streakPoints;
      }
    }

    // ─── 3. HOLDINGS BONUS ───
    // Award tier-based daily points to all cached wallets
    const { data: cachedWallets } = await supabase
      .from('wallet_token_cache')
      .select('wallet_address, gascoin_balance, tier_id');

    const tierPointsMap: Record<number, number> = {
      0: POINTS_CONFIG.POINTS_PER_CYCLE_STANDARD,
      1: POINTS_CONFIG.POINTS_PER_CYCLE_COMMUTER,
      2: POINTS_CONFIG.POINTS_PER_CYCLE_ROAD_WARRIOR,
      3: POINTS_CONFIG.POINTS_PER_CYCLE_FLEET,
    };

    for (const cached of cachedWallets || []) {
      const points = tierPointsMap[cached.tier_id] || 0;
      if (points <= 0) continue;

      // Check if already awarded today
      const { data: holdingsToday } = await supabase
        .from('engagement_points')
        .select('id')
        .eq('wallet', cached.wallet_address)
        .eq('source', 'holdings_bonus')
        .gte('created_at', `${todayKey}T00:00:00Z`)
        .maybeSingle();

      if (holdingsToday) continue;

      await supabase.from('engagement_points').insert({
        wallet: cached.wallet_address,
        source: 'holdings_bonus',
        points,
        metadata_json: {
          tier_id: cached.tier_id,
          gascoin_balance: cached.gascoin_balance,
          awarded_date: todayKey,
        },
      });
      holdingsPointsAwarded += points;
    }

    // ─── 4. AI AUDIT — Integrity Check ───
    // Check for anomalies in point distribution

    // 4a: Any wallet with >50,000 points in a single day? (suspicious)
    const { data: highEarners } = await supabase
      .from('engagement_points')
      .select('wallet, points')
      .gte('created_at', `${todayKey}T00:00:00Z`);

    const dailyTotals: Record<string, number> = {};
    for (const e of highEarners || []) {
      dailyTotals[e.wallet] = (dailyTotals[e.wallet] || 0) + Number(e.points);
    }

    for (const [wallet, total] of Object.entries(dailyTotals)) {
      if (total > 50000) {
        anomalies.push(`HIGH_DAILY: ${wallet.slice(0, 8)}... earned ${total} points today`);
      }
    }

    // 4b: Any wallet with duplicate submission points for same claim?
    const { data: dupeCheck } = await supabase
      .from('engagement_points')
      .select('wallet, metadata_json')
      .eq('source', 'submission_approved');

    const claimPointMap = new Map<string, number>();
    for (const entry of dupeCheck || []) {
      const key = `${entry.wallet}:${(entry.metadata_json as any)?.claim_id}`;
      claimPointMap.set(key, (claimPointMap.get(key) || 0) + 1);
    }

    for (const [key, count] of claimPointMap) {
      if (count > 1) {
        anomalies.push(`DUPE_SUBMISSION: ${key} has ${count} point entries`);
      }
    }

    // 4c: Any wallet earning holdings bonus without being in token cache?
    const cachedAddresses = new Set((cachedWallets || []).map((w: any) => w.wallet_address));
    const { data: holdingsEntries } = await supabase
      .from('engagement_points')
      .select('wallet')
      .eq('source', 'holdings_bonus')
      .gte('created_at', `${todayKey}T00:00:00Z`);

    for (const entry of holdingsEntries || []) {
      if (!cachedAddresses.has(entry.wallet)) {
        anomalies.push(`ORPHAN_HOLDINGS: ${entry.wallet.slice(0, 8)}... earned holdings points but not in token cache`);
      }
    }

    // Log audit results
    await supabase.from('audit_logs').insert({
      actor_type: 'system',
      actor_id: 'points_worker',
      action: 'daily_points_audit',
      target_type: 'engagement_points',
      target_id: todayKey,
      payload_json: {
        submissionPointsAwarded,
        streakPointsAwarded,
        holdingsPointsAwarded,
        totalPointsAwarded: submissionPointsAwarded + streakPointsAwarded + holdingsPointsAwarded,
        walletsProcessed: wallets.length,
        holdingsWallets: (cachedWallets || []).length,
        anomalies,
        anomalyCount: anomalies.length,
      },
    });

    return NextResponse.json({
      ok: true,
      date: todayKey,
      submissionPointsAwarded,
      streakPointsAwarded,
      holdingsPointsAwarded,
      totalPointsAwarded: submissionPointsAwarded + streakPointsAwarded + holdingsPointsAwarded,
      anomalies,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'worker failed' }, { status: 500 });
  }
}
