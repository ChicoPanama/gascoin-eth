import type { Metadata } from 'next';
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
    images: ['/welcome/pump.png'],
  },
};

export const revalidate = 60; // refresh live stats every minute

/**
 * /welcome — pre-entry landing page
 *
 * Interactive gas-pump hero. Five hotspots mapped to:
 *   top handle   → Docs (direct link to /docs)
 *   display      → Enter the protocol (→ /submit, invite gate lives there)
 *   pump body    → Manifesto modal
 *   nozzle       → How It Works modal
 *   base         → Roadmap modal
 *
 * No new backend — all interactive flows route to existing routes. Invite
 * redemption is handled by the existing InviteGate component at /submit
 * (see components/SubmitFlow.tsx::InviteGate) so we don't duplicate Privy
 * auth or /api/invites/redeem wiring on this page.
 *
 * All copy is grounded in the real engine:
 *   - 15 gates from lib/policy.ts::GATE_COUNT
 *   - Tier facts from lib/token-tiers.ts
 *   - AI pipeline from lib/prompts.ts and app/api/workers/pre-payout-verify
 *
 * Live stats (treasury, beta testers, claims submitted) come from the
 * same sources as app/page.tsx so the welcome page stays in sync with the
 * main site without duplicating fetch logic.
 */
export default async function Welcome() {
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
      gateCount={GATE_COUNT}
      treasuryUsd={treasuryUsd}
      testersRedeemed={testersRedeemed}
      claimsSubmitted={claimsSubmitted}
      isDryRun={isDryRun}
    />
  );
}
