import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { isAuthorizedCron } from '../../../../lib/cron-auth';
import { mintCertificate, MILESTONES } from '../../../../lib/integrations/reach-certificate';

export const dynamic = 'force-dynamic';

/**
 * Gas Network Piece 4 — daily reach-certificate minter.
 *
 * Pulls creator_public_view, checks each (creator × milestone) pair
 * against certificate_mints for unminted hits, inserts a pending row,
 * calls the contract, updates the row to paid/failed.
 *
 * Idempotent per (wallet, milestone) via the UNIQUE constraint — the
 * scan can re-run safely even mid-run.
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

  const { data: creators } = await supabase
    .from('creator_public_view')
    .select('handle, wallet, total_impressions, total_eth_earned, total_paid_claims');

  if (!creators || creators.length === 0) {
    return NextResponse.json({ ok: true, minted: 0, scanned: 0 });
  }

  let minted = 0;
  let failed = 0;

  for (const c of creators) {
    const handle = String(c.handle || '').toLowerCase();
    const wallet = String(c.wallet || '');
    if (!handle || !wallet) continue;

    for (const m of MILESTONES) {
      const value = Number((c as Record<string, unknown>)[m.axis] || 0);
      if (value < m.threshold) continue;

      // Already minted or in-flight? Unique constraint catches the race.
      const { data: existing } = await supabase
        .from('certificate_mints')
        .select('id, status')
        .eq('wallet', wallet)
        .eq('milestone', m.slug)
        .maybeSingle();
      if (existing) continue;

      // Insert pending row (may race with another worker — unique violation is fine)
      const { data: inserted, error: insErr } = await supabase
        .from('certificate_mints')
        .insert({
          wallet,
          handle,
          milestone: m.slug,
          amount: value,
          status: 'pending',
        })
        .select('id')
        .single();
      if (insErr || !inserted) continue;

      // Amount for on-chain storage (clamped to uint256 range via bigint)
      const amountBi = BigInt(Math.floor(value));
      const result = await mintCertificate(wallet, m.slug, amountBi, handle);

      if (result.ok) {
        await supabase
          .from('certificate_mints')
          .update({
            tx_hash: result.txHash,
            token_id: result.tokenId ?? null,
            status: result.isDryRun ? 'pending' : 'paid',
            minted_at: new Date().toISOString(),
          })
          .eq('id', inserted.id);
        minted++;
      } else {
        await supabase
          .from('certificate_mints')
          .update({ status: 'failed', error: result.error ?? 'unknown' })
          .eq('id', inserted.id);
        failed++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: creators.length,
    milestones_checked: creators.length * MILESTONES.length,
    minted,
    failed,
  });
}
