import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { verifyPrivySession } from '../../../lib/integrations/privy';
import { generateReferralCode } from '../../../lib/referral-code';

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const session = await verifyPrivySession(auth, undefined, req.headers.get('cookie'));
  if (!session || !session.xHandle) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const xHandle = session.xHandle;
  let wallet = session.wallet || '';
  const supabase = getSupabaseAdmin();

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
      claims: [],
      payouts: [],
      referral: { code: '', clicks: 0, uniqueClicks: 0, conversions: 0 },
      stats: { totalEarned: 0, approved: 0, pending: 0, rejected: 0 },
      networkImpact: emptyNetworkImpact,
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
      .select('id, amount_sol, status, tx_hash, created_at, claim_id')
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

  const clicks = clicksRes.data ?? [];
  const conversions = conversionsRes.data ?? [];
  const totalClicks = clicks.length;
  const uniqueClicks = new Set(clicks.map((c: any) => c.click_fingerprint)).size;
  const totalConversions = conversions.filter(
    (c: any) => c.reward_status === 'dispatched' || c.reward_status === 'pending',
  ).length;

  const totalEarned = payouts
    .filter((p: any) => p.status === 'paid')
    .reduce((s: number, p: any) => s + Number(p.amount_sol ?? 0), 0);

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

    // Get claims for referred submissions
    const { data: networkClaims } = await supabase
      .from('claims')
      .select('id, parsed_amount')
      .in('id', submissionIds);

    // Get payouts for referred submissions
    const { data: networkPayouts } = await supabase
      .from('payouts')
      .select('amount_sol, claim_id')
      .in('claim_id', submissionIds)
      .eq('status', 'paid');

    const networkUsdSaved = (networkClaims ?? [])
      .reduce((s: number, c: any) => s + Number(c.parsed_amount ?? 0), 0);
    const networkSolSaved = (networkPayouts ?? [])
      .reduce((s: number, p: any) => s + Number(p.amount_sol ?? 0), 0);

    networkImpact = {
      referredUsers: referredWallets.size,
      networkSolSaved,
      networkUsdSaved,
      combinedSol: totalEarned + networkSolSaved,
      combinedUsd: personalUsd + networkUsdSaved,
    };
  }

  return NextResponse.json({
    wallet,
    xHandle,
    claims,
    payouts,
    referral: {
      code: referralCode,
      clicks: totalClicks,
      uniqueClicks,
      conversions: totalConversions,
    },
    stats: { totalEarned, approved, pending, rejected },
    networkImpact,
  });
}
