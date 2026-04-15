import type { Metadata } from 'next';
import fs from 'node:fs/promises';
import path from 'node:path';
import { GATE_COUNT } from '../../lib/policy';
import { WelcomeClient } from './welcome-client';

export const metadata: Metadata = {
  title: 'GASCOIN — Gas. Paid Back.',
  description:
    'GASCOIN is a community-funded Solana protocol that refunds real gas receipts in SOL. Burn gas. Post proof. Get paid in SOL.',
  openGraph: {
    title: 'GASCOIN — Gas. Paid Back.',
    description:
      'A community-funded Solana protocol that refunds real gas receipts in SOL. Verified by 15 automated gates and a three-AI review pipeline.',
    url: 'https://gascoin.app/welcome',
    images: ['/welcome/pump.svg'],
  },
};

export const revalidate = 60;

/**
 * /welcome — single-viewport interactive pump landing page.
 *
 * The pump IS the page. No below-the-fold marketing. Click the display
 * screen to enter the protocol (routes to /submit where the existing
 * InviteGate handles Privy X auth + GC-XXXX-XXXX code redemption).
 *
 * The pump is a hand-authored SVG at public/welcome/pump.svg. We read
 * it server-side and pass the raw string to the client. The SVG is a
 * repo-committed static asset authored by us (not user input), so
 * injecting it is safe.
 *
 * Live stats (treasury + beta counter) come from the same sources as
 * app/page.tsx so nothing is hallucinated.
 */
export default async function Welcome() {
  const svgPath = path.join(process.cwd(), 'public', 'welcome', 'pump.svg');
  const pumpSvg = await fs.readFile(svgPath, 'utf-8');

  let treasuryUsd = '—';
  let testersRedeemed = 0;
  let claimsSubmitted = 0;
  const isDryRun = process.env.ENABLE_LIVE_PAYOUT !== 'true';

  try {
    const { getTreasuryBalances } = await import('../../lib/integrations/solana');
    const t = await getTreasuryBalances();
    if (t.solBalance > 0 || t.gascoinBalance > 0) {
      const total = t.solUsd + t.gascoinUsd;
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
      pumpSvg={pumpSvg}
      gateCount={GATE_COUNT}
      treasuryUsd={treasuryUsd}
      testersRedeemed={testersRedeemed}
      claimsSubmitted={claimsSubmitted}
      isDryRun={isDryRun}
    />
  );
}
