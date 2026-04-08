import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Nav } from '../../components/Nav';
import { getSupabaseAdmin } from '../../lib/supabase';
import { verifyPrivySession } from '../../lib/integrations/privy';
import { generateReferralCode } from '../../lib/referral-code';
import { DashboardClient } from './DashboardClient';

export const metadata = { title: 'GASCOIN — My Dashboard' };

export default async function MeDashboardPage() {
  const hdrs = await headers();
  const session = await verifyPrivySession(
    hdrs.get('authorization'),
    undefined,
    hdrs.get('cookie'),
  );
  if (!session || !session.wallet) redirect('/submit');

  const wallet = session.wallet;
  const xHandle = session.xHandle || null;
  const supabase = getSupabaseAdmin();

  const [claimsRes, payoutsRes, clicksRes, conversionsRes] = await Promise.all([
    // Claims with related receipts + gate results
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

    // Payouts
    supabase
      .from('payouts')
      .select('id, amount_sol, status, tx_hash, created_at, claim_id')
      .eq('wallet', wallet)
      .order('created_at', { ascending: false })
      .limit(25),

    // Referral clicks (total + unique)
    supabase
      .from('referral_clicks')
      .select('id, click_fingerprint')
      .eq('referrer_wallet', wallet),

    // Referral conversions
    supabase
      .from('referral_conversions')
      .select('id, reward_status')
      .eq('referrer_wallet', wallet),
  ]);

  const claims = claimsRes.data ?? [];
  const payouts = payoutsRes.data ?? [];

  // Compute referral stats
  const clicks = clicksRes.data ?? [];
  const conversions = conversionsRes.data ?? [];
  const referralCode = generateReferralCode(wallet);
  const totalClicks = clicks.length;
  const uniqueClicks = new Set(clicks.map((c: any) => c.click_fingerprint)).size;
  const totalConversions = conversions.filter(
    (c: any) => c.reward_status === 'dispatched' || c.reward_status === 'pending',
  ).length;

  // Compute stats
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

  return (
    <div className="container">
      <Nav />
      <DashboardClient
        wallet={wallet}
        xHandle={xHandle}
        claims={claims}
        payouts={payouts}
        referral={{
          code: referralCode,
          clicks: totalClicks,
          uniqueClicks,
          conversions: totalConversions,
        }}
        stats={{ totalEarned, approved, pending, rejected }}
      />
    </div>
  );
}
