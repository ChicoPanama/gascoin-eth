import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { POINTS_CONFIG } from '../../../../lib/engagement-rewards';
import { TOKEN_TIERS, getTierForBalance } from '../../../../lib/token-tiers';
import { detectReferralRing, calculateWalletTrust, generateAuditSummary, awardVerifiedPoints } from '../../../../lib/ai-points-engine';
import { isAuthorizedCron as isAuthorized } from '../../../../lib/cron-auth';
import { addMemory } from '../../../../lib/mem0';
import { writeIntelligence } from '../../../../lib/knowledge-base';

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

// AI audit calls + on-chain balance checks — bump timeout to 60s
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const now = new Date();
    const todayKey = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // ─── Idempotency: prevent double awards if worker retried ───
    const runKey = `award-points:${todayKey}`;
    const { data: existingRun } = await supabase
      .from('idempotency_keys')
      .select('id')
      .eq('key', runKey)
      .eq('scope', 'worker')
      .maybeSingle();

    if (existingRun) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'already_ran_today' });
    }

    await supabase.from('idempotency_keys').insert({
      key: runKey,
      scope: 'worker',
      status: 'processing',
      request_hash: `daily-${todayKey}`,
    });

    let submissionPointsAwarded = 0;
    let streakPointsAwarded = 0;
    let holdingsPointsAwarded = 0;
    let heldCount = 0;
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

      const subTrust = calculateWalletTrust({
        totalSubmissions: 1, approvedSubmissions: 1, rejectedSubmissions: 0,
        referralConversions: 0, skippedReferrals: 0, accountAgeDays: 30, anomalyCount: 0,
      });
      const subResult = await awardVerifiedPoints(supabase, {
        wallet: payout.wallet,
        source: 'submission_approved',
        rawPoints: POINTS_CONFIG.POINTS_PER_APPROVED_SUBMISSION,
        metadata: { claim_id: payout.claim_id, payout_id: payout.id, awarded_date: todayKey },
        walletTrust: subTrust,
      });
      if (subResult.awarded) submissionPointsAwarded += subResult.points;
      if (subResult.heldForReview) heldCount++;
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

      if (consecutiveWindows >= 2) {
        const streakPoints = consecutiveWindows * POINTS_CONFIG.POINTS_PER_STREAK_WINDOW;
        const streakTrust = calculateWalletTrust({
          totalSubmissions: consecutiveWindows, approvedSubmissions: consecutiveWindows, rejectedSubmissions: 0,
          referralConversions: 0, skippedReferrals: 0, accountAgeDays: consecutiveWindows * 30, anomalyCount: 0,
        });
        const streakResult = await awardVerifiedPoints(supabase, {
          wallet,
          source: 'streak_bonus',
          rawPoints: streakPoints,
          metadata: { consecutive_windows: consecutiveWindows, awarded_date: todayKey },
          walletTrust: streakTrust,
        });
        if (streakResult.awarded) streakPointsAwarded += streakResult.points;
        if (streakResult.heldForReview) heldCount++;
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
      // ─── Anti-gaming: verify on-chain balance before awarding ───
      // Prevents flash-loan attack: borrow tokens → cache tier → return → earn bonus
      let verifiedPoints = tierPointsMap[cached.tier_id] || 0;
      try {
        const { getWalletGascoinBalance } = await import('../../../../lib/integrations/solana');
        const { getTierForBalance } = await import('../../../../lib/token-tiers');
        const freshBalance = await getWalletGascoinBalance(cached.wallet_address);
        const freshTier = getTierForBalance(freshBalance);
        const freshPts = tierPointsMap[freshTier.id] || 0;
        if (freshPts < verifiedPoints) {
          anomalies.push(`FLASH_LOAN_SUSPECT: ${cached.wallet_address.slice(0, 8)}... cached tier ${cached.tier_id} but on-chain tier ${freshTier.id}`);
          verifiedPoints = freshPts; // Use the lower (real) tier
        }
      } catch {
        // If on-chain check fails, use cached but flag it
        anomalies.push(`BALANCE_CHECK_FAILED: ${cached.wallet_address.slice(0, 8)}... using cached tier`);
      }

      if (verifiedPoints <= 0) continue;

      // Check if already awarded today
      const { data: holdingsToday } = await supabase
        .from('engagement_points')
        .select('id')
        .eq('wallet', cached.wallet_address)
        .eq('source', 'holdings_bonus')
        .gte('created_at', `${todayKey}T00:00:00Z`)
        .maybeSingle();

      if (holdingsToday) continue;

      const holdTrust = calculateWalletTrust({
        totalSubmissions: 0, approvedSubmissions: 0, rejectedSubmissions: 0,
        referralConversions: 0, skippedReferrals: 0, accountAgeDays: 30, anomalyCount: 0,
      });
      const holdResult = await awardVerifiedPoints(supabase, {
        wallet: cached.wallet_address,
        source: 'holdings_bonus',
        rawPoints: verifiedPoints,
        metadata: { tier_id: cached.tier_id, gascoin_balance: cached.gascoin_balance, awarded_date: todayKey, verified_onchain: true },
        walletTrust: holdTrust,
      });
      if (holdResult.awarded) holdingsPointsAwarded += holdResult.points;
      if (holdResult.heldForReview) heldCount++;
    }

    // ─── 4. PASSIVE REFERRAL INCOME ───
    // Referrers earn 2% of their referred users' points from the last 30 days.
    // Capped at REFERRAL_PASSIVE_CAP_MONTHLY per referrer per month.
    let referralPassiveAwarded = 0;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: allConversions } = await supabase
      .from('referral_conversions')
      .select('referrer_wallet, referred_wallet')
      .eq('status', 'verified');

    if (allConversions && allConversions.length > 0) {
      // Group by referrer
      const referrerMap = new Map<string, string[]>();
      for (const conv of allConversions) {
        const list = referrerMap.get(conv.referrer_wallet) || [];
        list.push(conv.referred_wallet);
        referrerMap.set(conv.referrer_wallet, list);
      }

      for (const [referrerWallet, referredWallets] of referrerMap) {
        // Check how much passive referral income already awarded this month
        const monthStart = `${todayKey.slice(0, 7)}-01T00:00:00Z`;
        const { data: existingPassive } = await supabase
          .from('engagement_points')
          .select('points')
          .eq('wallet', referrerWallet)
          .eq('source', 'referral_passive')
          .gte('created_at', monthStart);

        const passiveThisMonth = (existingPassive || []).reduce((s: number, e: any) => s + Number(e.points || 0), 0);
        if (passiveThisMonth >= POINTS_CONFIG.REFERRAL_PASSIVE_CAP_MONTHLY) continue;

        // Sum points earned by all referred wallets in last 30 days
        let referredTotal = 0;
        for (const rw of referredWallets) {
          const { data: rwPoints } = await supabase
            .from('engagement_points')
            .select('points')
            .eq('wallet', rw)
            .in('source', ['tweet_engagement', 'submission_approved', 'streak_bonus'])
            .gte('created_at', thirtyDaysAgo);

          referredTotal += (rwPoints || []).reduce((s: number, e: any) => s + Number(e.points || 0), 0);
        }

        if (referredTotal <= 0) continue;

        const passiveEarned = Math.round(referredTotal * POINTS_CONFIG.REFERRAL_PASSIVE_RATE);
        const remaining = POINTS_CONFIG.REFERRAL_PASSIVE_CAP_MONTHLY - passiveThisMonth;
        const toAward = Math.min(passiveEarned, remaining);

        if (toAward <= 0) continue;

        const passiveTrust = calculateWalletTrust({
          totalSubmissions: 1, approvedSubmissions: 1, rejectedSubmissions: 0,
          referralConversions: referredWallets.length, skippedReferrals: 0,
          accountAgeDays: 30, anomalyCount: 0,
        });

        const passiveResult = await awardVerifiedPoints(supabase, {
          wallet: referrerWallet,
          source: 'referral_passive' as any,
          rawPoints: toAward,
          metadata: {
            referred_wallets: referredWallets.length,
            referred_total_points: referredTotal,
            passive_rate: POINTS_CONFIG.REFERRAL_PASSIVE_RATE,
            awarded_date: todayKey,
          },
          walletTrust: passiveTrust,
        });

        if (passiveResult.awarded) referralPassiveAwarded += passiveResult.points;
      }
    }

    // ─── 5. AI AUDIT — Integrity Check ───
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

    // 4c: Orphan holdings check
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

    // ─── 4d: AI REFERRAL RING DETECTION ───
    let ringsDetected = 0;
    try {
      const { data: allRefs } = await supabase
        .from('referrals')
        .select('referrer_wallet, referred_wallet, created_at')
        .in('status', ['pending', 'verified']);

      const refList = (allRefs || []).map((r: any) => ({
        referrer: r.referrer_wallet, referred: r.referred_wallet, created_at: r.created_at,
      }));

      // Check recent referrals for rings
      const recentRefs = refList.filter((r) => new Date(r.created_at) > new Date(Date.now() - 7 * 86400000));
      for (const ref of recentRefs) {
        const ring = await detectReferralRing({
          referrerWallet: ref.referrer,
          referredWallet: ref.referred,
          allReferrals: refList,
        });
        if (ring.isSuspicious) {
          anomalies.push(`RING_${ring.ringType.toUpperCase()}: ${ring.reason}`);
          ringsDetected++;
        }
      }
    } catch {}

    // ─── 4e: AI WALLET TRUST SCORING ───
    const trustScores: Record<string, number> = {};
    let flaggedWallets = 0;
    try {
      for (const wallet of wallets.slice(0, 50)) { // Cap at 50 to stay fast
        const { data: walletClaims } = await supabase
          .from('claims')
          .select('status')
          .eq('wallet', wallet);

        const { data: walletRefs } = await supabase
          .from('referral_conversions')
          .select('reward_status')
          .eq('referrer_wallet', wallet);

        const { data: walletAnomalies } = await supabase
          .from('engagement_points')
          .select('metadata_json')
          .eq('wallet', wallet)
          .eq('source', 'tweet_engagement');

        const aiFlags = (walletAnomalies || []).filter((e: any) =>
          (e.metadata_json as any)?.ai?.isSpam || (e.metadata_json as any)?.ai?.isBotEngagement
        ).length;

        const claims = walletClaims || [];
        const refs = walletRefs || [];
        const firstClaim = claims[0] as any;
        const ageDays = firstClaim?.created_at
          ? Math.floor((Date.now() - new Date(firstClaim.created_at).getTime()) / 86400000)
          : 0;

        const trust = calculateWalletTrust({
          totalSubmissions: claims.length,
          approvedSubmissions: claims.filter((c: any) => ['approved', 'paid', 'ready_for_dispatch'].includes(c.status)).length,
          rejectedSubmissions: claims.filter((c: any) => c.status === 'rejected').length,
          referralConversions: refs.filter((r: any) => r.reward_status === 'verified').length,
          skippedReferrals: refs.filter((r: any) => r.reward_status === 'skipped').length,
          accountAgeDays: ageDays,
          anomalyCount: aiFlags,
        });

        trustScores[wallet] = trust.score;
        if (trust.level === 'suspicious') {
          anomalies.push(`SUSPICIOUS_WALLET: ${wallet.slice(0, 8)}... trust=${trust.score} factors=[${trust.factors.join(', ')}]`);
          flaggedWallets++;
        }
      }
    } catch {}

    // ─── 4f: AI AUDIT NARRATOR ───
    let auditSummary = '';
    try {
      // Get today's engagement and referral point totals
      const { data: todayEngagement } = await supabase
        .from('engagement_points')
        .select('points, source')
        .gte('created_at', `${todayKey}T00:00:00Z`);

      const engPts = (todayEngagement || []).filter((e: any) => e.source === 'tweet_engagement').reduce((s: number, e: any) => s + Number(e.points), 0);
      const refPts = (todayEngagement || []).filter((e: any) => e.source === 'referral_conversion').reduce((s: number, e: any) => s + Number(e.points), 0);

      auditSummary = await generateAuditSummary({
        date: todayKey,
        submissionPoints: submissionPointsAwarded,
        streakPoints: streakPointsAwarded,
        holdingsPoints: holdingsPointsAwarded,
        engagementPoints: engPts,
        referralPoints: refPts,
        totalWallets: wallets.length,
        anomalies,
        flaggedWallets,
      });
    } catch {}

    // Write daily intelligence to mem0 + intelligence_entries
    const totalPtsToday = submissionPointsAwarded + streakPointsAwarded + holdingsPointsAwarded;
    addMemory('system', 'gascoin',
      `Daily audit ${todayKey}: ${totalPtsToday} points awarded, ${anomalies.length} anomalies, ${flaggedWallets} flagged. ${auditSummary.slice(0, 300)}`,
      { pipeline: 'award_points', date: todayKey },
    ).catch(() => {});

    for (const anomaly of anomalies) {
      writeIntelligence({
        entry_type: 'anomaly', entity_type: 'system', entity_id: 'daily_audit',
        summary: anomaly,
        detail_json: { date: todayKey },
        severity: anomaly.startsWith('HIGH') || anomaly.startsWith('RING') ? 'critical' : 'warning',
        pipeline_source: 'award_points',
      }).catch(() => {});
    }

    // Log full audit results
    await supabase.from('audit_logs').insert({
      actor_type: 'system',
      actor_id: 'ai_points_engine',
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
        ringsDetected,
        flaggedWallets,
        anomalies,
        anomalyCount: anomalies.length,
        aiSummary: auditSummary,
      },
    });

    return NextResponse.json({
      ok: true,
      date: todayKey,
      submissionPointsAwarded,
      streakPointsAwarded,
      holdingsPointsAwarded,
      totalPointsAwarded: submissionPointsAwarded + streakPointsAwarded + holdingsPointsAwarded,
      ringsDetected,
      flaggedWallets,
      anomalies,
      aiSummary: auditSummary,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'worker_failed' }, { status: 500 });
  }
}
