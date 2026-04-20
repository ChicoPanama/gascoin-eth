import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { computeCompositeForWallet, persistComposite } from '../../../../lib/composite-score';
import { isAuthorizedCron } from '../../../../lib/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Gas Network — Composite Influence Score recompute worker.
 * Daily at 08:00 UTC. Scans every wallet with an active X link and
 * recomputes its per-account Composite score.
 */
export async function POST(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: links } = await supabase
    .from('wallet_x_links')
    .select('wallet')
    .eq('is_active', true)
    .limit(2000);

  const wallets = Array.from(
    new Set((links || []).map((l: any) => String(l.wallet || '').toLowerCase()).filter(Boolean)),
  );

  let scored = 0;
  let errors = 0;
  for (const w of wallets) {
    try {
      const result = await computeCompositeForWallet(w, { client: supabase });
      if (result) {
        await persistComposite(w, result, supabase);
        scored++;
      }
    } catch {
      errors++;
    }
  }

  return NextResponse.json({ ok: true, scanned: wallets.length, scored, errors });
}
