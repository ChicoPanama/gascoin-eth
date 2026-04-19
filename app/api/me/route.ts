import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { verifyPrivySession } from '../../../lib/integrations/privy';
import { generateReferralCode } from '../../../lib/referral-code';
import { getMarketSnapshot } from '../../../lib/integrations/pricing';

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const session = await verifyPrivySession(auth, undefined, req.headers.get('cookie'));
  if (!session || !session.xHandle) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const xHandle = session.xHandle;
  let wallet = session.wallet || '';
  const supabase = getSupabaseAdmin();
  const market = await getMarketSnapshot().catch(() => ({ ethPriceUsd: 170 } as any));
  const ethPriceUsd = Number(market?.ethPriceUsd || 170);

  // If no wallet from Privy session, look it up from wallet_x_links
  if (!wallet) {
    const handle = xHandle.replace(/^@/, '').toLowerCase();
    const { data: link } = await supabase
      .from('wallet_x_links')
      .select('wallet')
      .eq('x_handle', handle)
      .eq('is_active', true)
      .maybeSingle();

    wallet = link?.wallet || '';
  }

  const emptyNetworkImpact = {
    referredUsers: 0,
    networkSolSaved: 0,
    networkUsdSaved: 0,
    combinedSol: 0,
    combinedUsd: 0,
  };

  // Even without a wallet, show the dashboard (empty state)
  if (!wallet) {
    return NextResponse.json({
      wallet: '',
      xHandle,
      isDryRun: process.env.ENABLE_LIVE_PAYOUT !== 'true',
      claims: [],
      payouts: [],
      referral: { code: '', clicks: 0, uniqueClicks: 0, conversions: 0 },
      stats: { totalEarned: 0, totalEarnedUsdc: 0, approved: 0, pending: 0, rejected: 0 },
      pricing: { ethPriceUsd },
      networkImpact: emptyNetworkImpact,
      points: { total: 0, bySource: {} },
      tier: { current: { id: 0, name: 'Standard', max_eth_refund: 0.10 }, next: { id: 1, name: 'Commuter', min_tokens: 100000 }, gascoinBalance: 0, tokensToNext: 100000 },
      leaderboard: { rank: 0, totalRanked: 0 },
      engagement: { topTweets: [], contentTypeDist: {}, totalScoredTweets: 0 },
      streak: { consecutiveWindows: 0, maxMultiplier: 5 },
      cooldown: { days: 7, endsAt: null, remainingMs: 0 },
      analytics: { approvalRate: 0, avgRefundEth: 0, avgRefundUsd: 0, topGateFailures: [], conversionRate: 0, percentile: 0, pointsLast30: 0, pointsPrior30: 0, pointsTrend: 0 },
    });
  }

  const referralCode = generateReferralCode(wallet);

  const [claimsRes, payoutsRes, clicksRes, conversionsRes, networkConversionsRes] = await Promise.all([
    supabase
      .from('claims')
      .select(`
        id, status, created_at, parsed_amount, country, city, state,
        tweet_url, wallet,
        claim_receipts ( storage_path_private, is_image_redacted ),
        gate_results ( gate, passed, reason, score, created_at )
      `)
      .eq('wallet', wallet)
      .order('created_at', { ascending: false })
      .limit(25),

    supabase
      .from('payouts')
      .select('id, amount_eth, status, tx_hash, created_at, claim_id')
      .eq('wallet', wallet)
      .order('created_at', { ascending: false })
      .limit(25),

    supabase
      .from('referral_clicks')
      .select('id, click_fingerprint')
      .eq('referrer_wallet', wallet),

    supabase
      .from('referral_conversions')
      .select('id, reward_status')
      .eq('referrer_wallet', wallet),

    // Network impact: get dispatched conversions with submission details
    supabase
      .from('referral_conversions')
      .select('submission_id, referred_wallet')
      .eq('referrer_wallet', wallet)
      .eq('reward_status', 'dispatched'),
  ]);

  const claims = claimsRes.data ?? [];
  const payouts = payoutsRes.data ?? [];
  const payoutsWithUsd = payouts.map((p: any) => ({
    ...p,
    amount_usdc: Number(p.amount_eth || 0) * ethPriceUsd,
  }));

  const clicks = clicksRes.data ?? [];
  const conversions = conversionsRes.data ?? [];
  const totalClicks = clicks.length;
  const uniqueClicks = new Set(clicks.map((c: any) => c.click_fingerprint)).size;
  const totalConversions = conversions.filter(
    (c: any) => c.reward_status === 'dispatched' || c.reward_status === 'pending',
  ).length;

  const totalEarned = payouts
    .filter((p: any) => p.status === 'paid')
    .reduce((s: number, p: any) => s + Number(p.amount_eth ?? 0), 0);

  const approved = claims.filter(
    (c: any) => c.status === 'approved' || c.status === 'paid',
  ).length;
  const pending = claims.filter(
    (c: any) =>
      c.status === 'submitted' ||
      c.status === 'auto_review' ||
      c.status === 'needs_manual_review' ||
      c.status === 'ready_for_dispatch',
  ).length;
  const rejected = claims.filter((c: any) => c.status === 'rejected').length;

  // Personal USD total from own claims
  const personalUsd = claims
    .filter((c: any) => c.status === 'approved' || c.status === 'paid')
    .reduce((s: number, c: any) => s + Number(c.parsed_amount ?? 0), 0);

  // Compute network impact from dispatched referral conversions
  let networkImpact = emptyNetworkImpact;
  const networkConversions = networkConversionsRes.data ?? [];

  if (networkConversions.length > 0) {
    const submissionIds = networkConversions.map((c: any) => c.submission_id).filter(Boolean);
    const referredWallets = new Set(networkConversions.map((c: any) => c.referred_wallet));

    let networkUsdSaved = 0;
    let networkSolSaved = 0;

    if (submissionIds.length > 0) {
      const [networkClaimsRes, networkPayoutsRes] = await Promise.all([
        supabase
          .from('claims')
          .select('id, parsed_amount')
          .in('id', submissionIds),
        supabase
          .from('payouts')
          .select('amount_eth, claim_id')
          .in('claim_id', submissionIds)
          .eq('status', 'paid'),
      ]);

      networkUsdSaved = (networkClaimsRes.data ?? [])
        .reduce((s: number, c: any) => s + Number(c.parsed_amount ?? 0), 0);
      networkSolSaved = (networkPayoutsRes.data ?? [])
        .reduce((s: number, p: any) => s + Number(p.amount_eth ?? 0), 0);
    }

    networkImpact = {
      referredUsers: referredWallets.size,
      networkSolSaved,
      networkUsdSaved,
      combinedSol: totalEarned + networkSolSaved,
      combinedUsd: personalUsd + networkUsdSaved,
    };
  }

  // ─── Points breakdown by source ───
  const { data: pointsRaw } = await supabase
    .from('engagement_points')
    .select('source, points')
    .eq('wallet', wallet);

  const pointsBySource: Record<string, number> = {};
  let totalPoints = 0;
  for (const p of pointsRaw || []) {
    const src = String(p.source || 'unknown');
    pointsBySource[src] = (pointsBySource[src] || 0) + Number(p.points || 0);
    totalPoints += Number(p.points || 0);
  }

  // ─── Tier info ───
  const { data: cachedTier } = await supabase
    .from('wallet_token_cache')
    .select('gascoin_balance, tier_id')
    .eq('wallet_address', wallet)
    .maybeSingle();

  const { TOKEN_TIERS } = await import('../../../lib/token-tiers');
  const currentTierId = cachedTier?.tier_id ?? 0;
  const currentTier = TOKEN_TIERS[currentTierId] || TOKEN_TIERS[0];
  const nextTier = TOKEN_TIERS[currentTierId + 1] || null;
  const gascoinBalance = Number(cachedTier?.gascoin_balance || 0);

  // ─── Leaderboard rank ───
  // Capped at 5 000 rows — enough for an accurate percentile on a sub-10k user
  // base while preventing a full-table scan that could time out at scale.
  const { data: allPayouts } = await supabase
    .from('payouts')
    .select('wallet, amount_eth')
    .eq('status', 'paid')
    .limit(5000);

  const walletScores = new Map<string, number>();
  for (const p of allPayouts || []) {
    walletScores.set(p.wallet, (walletScores.get(p.wallet) || 0) + Number(p.amount_eth || 0));
  }
  // Simple rank by total points (approximate — full composite uses holdings + engagement weights)
  const allWalletPoints = new Map<string, number>();
  const { data: allPoints } = await supabase
    .from('engagement_points')
    .select('wallet, points')
    .limit(5000);
  for (const p of allPoints || []) {
    allWalletPoints.set(p.wallet, (allWalletPoints.get(p.wallet) || 0) + Number(p.points || 0));
  }
  const sorted = [...allWalletPoints.entries()].sort((a, b) => b[1] - a[1]);
  const rank = sorted.findIndex(([w]) => w === wallet) + 1;
  const totalRanked = sorted.length;

  // ─── Top engagement tweets ───
  const { data: topTweets } = await supabase
    .from('scored_tweets')
    .select('tweet_id, tweet_url, tweet_text, impressions, likes, retweets, replies, bookmarks, adjusted_points, quality_score, content_type, posted_at')
    .eq('wallet', wallet)
    .order('adjusted_points', { ascending: false })
    .limit(5);

  // ─── Streak info ───
  const paidPayouts = payouts.filter((p: any) => p.status === 'paid');
  let consecutiveWindows = 0;
  if (paidPayouts.length > 0) {
    let checkDate = new Date();
    for (let i = 0; i < 5; i++) {
      const windowStart = new Date(checkDate.getTime() - 30 * 86400000);
      const hasInWindow = paidPayouts.some((p: any) => {
        const d = new Date(p.created_at);
        return d >= windowStart && d <= checkDate;
      });
      if (hasInWindow) { consecutiveWindows++; checkDate = windowStart; }
      else break;
    }
  }

  // ─── Cooldown status ───
  const lastClaim = claims[0];
  const cooldownDays = currentTier.cooldown_days;
  const lastClaimDate = lastClaim ? new Date(lastClaim.created_at) : null;
  const cooldownEnds = lastClaimDate ? new Date(lastClaimDate.getTime() + cooldownDays * 86400000) : null;
  const cooldownRemaining = cooldownEnds ? Math.max(0, cooldownEnds.getTime() - Date.now()) : 0;

  // ─── Analytics: approval rate, avg refund, gate failures ───
  const approvalRate = claims.length > 0 ? (approved / claims.length * 100) : 0;
  const avgRefund = paidPayouts.length > 0
    ? paidPayouts.reduce((s: number, p: any) => s + Number(p.amount_eth || 0), 0) / paidPayouts.length
    : 0;

  // Gate failure analysis — which gates fail most
  const gateFailCounts: Record<string, number> = {};
  for (const claim of claims) {
    for (const g of (claim as any).gate_results || []) {
      if (!g.passed) gateFailCounts[g.gate] = (gateFailCounts[g.gate] || 0) + 1;
    }
  }
  const topGateFailures = Object.entries(gateFailCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([gate, count]) => ({ gate, count }));

  // Content type distribution from scored tweets
  const { data: allScoredTweets } = await supabase
    .from('scored_tweets')
    .select('content_type, adjusted_points')
    .eq('wallet', wallet);

  const contentTypeDist: Record<string, { count: number; points: number }> = {};
  for (const t of allScoredTweets || []) {
    const ct = t.content_type || 'text_only';
    if (!contentTypeDist[ct]) contentTypeDist[ct] = { count: 0, points: 0 };
    contentTypeDist[ct].count++;
    contentTypeDist[ct].points += Number(t.adjusted_points || 0);
  }

  // Referral funnel
  const conversionRate = referralCode && uniqueClicks > 0 ? (totalConversions / uniqueClicks * 100) : 0;

  // Percentile rank
  const percentile = totalRanked > 0 ? Math.round((1 - (rank - 1) / totalRanked) * 100) : 0;

  // Monthly points breakdown (last 30 days vs prior 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();
  const { data: recentPoints } = await supabase
    .from('engagement_points')
    .select('points')
    .eq('wallet', wallet)
    .gte('created_at', thirtyDaysAgo);
  const { data: priorPoints } = await supabase
    .from('engagement_points')
    .select('points')
    .eq('wallet', wallet)
    .gte('created_at', sixtyDaysAgo)
    .lt('created_at', thirtyDaysAgo);

  const pointsLast30 = (recentPoints || []).reduce((s: number, e: any) => s + Number(e.points || 0), 0);
  const pointsPrior30 = (priorPoints || []).reduce((s: number, e: any) => s + Number(e.points || 0), 0);
  const pointsTrend = pointsPrior30 > 0 ? Math.round((pointsLast30 - pointsPrior30) / pointsPrior30 * 100) : (pointsLast30 > 0 ? 100 : 0);

  const isDryRun = process.env.ENABLE_LIVE_PAYOUT !== 'true';

  return NextResponse.json({
    wallet,
    xHandle,
    isDryRun,
    claims,
    payouts: payoutsWithUsd,
    referral: {
      code: referralCode,
      clicks: totalClicks,
      uniqueClicks,
      conversions: totalConversions,
    },
    stats: { totalEarned, totalEarnedUsdc: totalEarned * ethPriceUsd, approved, pending, rejected },
    pricing: { ethPriceUsd },
    networkImpact,
    // New enriched data
    points: {
      total: totalPoints,
      bySource: pointsBySource,
    },
    tier: {
      current: { id: currentTier.id, name: currentTier.name, max_eth_refund: currentTier.max_eth_refund },
      next: nextTier ? { id: nextTier.id, name: nextTier.name, min_tokens: nextTier.min_tokens } : null,
      gascoinBalance,
      tokensToNext: nextTier ? Math.max(0, nextTier.min_tokens - gascoinBalance) : 0,
    },
    leaderboard: {
      rank: rank || totalRanked + 1,
      totalRanked,
    },
    engagement: {
      topTweets: topTweets || [],
      contentTypeDist,
      totalScoredTweets: (allScoredTweets || []).length,
    },
    streak: {
      consecutiveWindows,
      maxMultiplier: 5,
    },
    cooldown: {
      days: cooldownDays,
      endsAt: cooldownEnds?.toISOString() || null,
      remainingMs: cooldownRemaining,
    },
    analytics: {
      approvalRate: +approvalRate.toFixed(1),
      avgRefundEth: +avgRefund.toFixed(4),
      avgRefundUsd: +(avgRefund * ethPriceUsd).toFixed(2),
      topGateFailures,
      conversionRate: +conversionRate.toFixed(1),
      percentile,
      pointsLast30,
      pointsPrior30,
      pointsTrend,
    },
  });
}
