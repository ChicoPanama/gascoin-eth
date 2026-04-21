import type { Metadata } from 'next';
import { GATE_COUNT } from '../../lib/policy';
import { WelcomeClient } from './welcome-client';

export const metadata: Metadata = {
  title: 'GASCOIN — Gas. Paid Back.',
  description:
    'GASCOIN is a community-funded Ethereum protocol that refunds real gas receipts in ETH. Burn gas. Post proof. Get paid in ETH.',
  openGraph: {
    title: 'GASCOIN — Gas. Paid Back.',
    description:
      'A community-funded Ethereum protocol that refunds real gas receipts in ETH. Verified by automated gates and a three-AI review pipeline.',
    url: 'https://gascoin.app/welcome',
    images: ['/welcome/pump.svg'],
  },
};

export const revalidate = 60;

/**
 * /welcome — single-viewport interactive pump landing page.
 *
 * The pump is rendered as a React SVG component (components/welcome/PumpSvg)
 * with native onClick props on every hotspot, so click events route through
 * React's synthetic event system and are guaranteed to fire. No more
 * server-side SVG file reading + innerHTML injection.
 *
 * Live stats (treasury + beta counter + claims count) come from the same
 * sources as app/page.tsx so nothing is hallucinated.
 */
export default async function Welcome() {
  let treasuryUsd = '—';
  let testersRedeemed = 0;
  let claimsSubmitted = 0;
  const isDryRun = process.env.ENABLE_LIVE_PAYOUT !== 'true';

  try {
    const { getTreasuryBalances } = await import('../../lib/integrations/ethereum');
    const t = await getTreasuryBalances();
    if (t.ethBalance > 0 || t.gascoinBalance > 0) {
      const total = t.ethUsd + t.gascoinUsd;
      treasuryUsd =
        total >= 1_000_000
          ? `$${(total / 1_000_000).toFixed(1)}M`
          : `$${Math.round(total).toLocaleString()}`;
    }
  } catch {}

  if (isDryRun) {
    try {
      const { getSupabaseAdmin } = await import('../../lib/supabase');
      const supabase = getSupabaseAdmin();
      const [invitesRes, claimsRes] = await Promise.all([
        supabase
          .from('invite_codes')
          .select('id', { count: 'exact', head: true })
          .not('used_by_x_user_id', 'is', null),
        supabase
          .from('claims')
          .select('id', { count: 'exact', head: true }),
      ]);
      testersRedeemed = invitesRes.count ?? 0;
      claimsSubmitted = claimsRes.count ?? 0;
    } catch {}
  }

  return (
    <WelcomeClient
      gateCount={GATE_COUNT}
      treasuryUsd={treasuryUsd}
      testersRedeemed={testersRedeemed}
      claimsSubmitted={claimsSubmitted}
      isDryRun={isDryRun}
    />
  );
}
