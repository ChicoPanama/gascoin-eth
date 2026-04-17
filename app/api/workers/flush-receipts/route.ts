import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { isAuthorizedCron as isAuthorized } from '../../../../lib/cron-auth';

// Worker: auto-flush receipt images older than 90 days from paid/rejected claims
// Deletes from Supabase Storage, nullifies storage_path_private in DB
// Run weekly via Vercel cron
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();

    // Find receipts eligible for deletion
    const { data: receipts } = await supabase
      .from('claim_receipts')
      .select('id, storage_path_private, claim_id, claims(status)')
      .not('storage_path_private', 'is', null)
      .lt('created_at', ninetyDaysAgo)
      .limit(100);

    if (!receipts || receipts.length === 0) {
      return NextResponse.json({ ok: true, flushed: 0, message: 'no receipts to flush' });
    }

    // Filter to only paid/rejected claims
    const eligible = receipts.filter((r: any) => {
      const status = r.claims?.status;
      return status === 'paid' || status === 'rejected';
    });

    let deleted = 0;
    let errors = 0;

    for (const receipt of eligible) {
      const path = receipt.storage_path_private;
      if (!path) continue;

      // Delete from storage
      const { error: storageErr } = await supabase.storage
        .from('receipts-private')
        .remove([path]);

      if (storageErr) {
        errors++;
        continue;
      }

      // Nullify storage path and mark as redacted (D1: is_image_redacted was never set)
      await supabase
        .from('claim_receipts')
        .update({ storage_path_private: null, is_image_redacted: true })
        .eq('id', receipt.id);

      deleted++;
    }

    // Log the flush
    await supabase.from('audit_logs').insert({
      actor_type: 'system',
      actor_id: 'flush_worker',
      action: 'receipts_flushed',
      target_type: 'storage',
      target_id: 'receipts-private',
      payload_json: { deleted, errors, eligible: eligible.length, checked: receipts.length },
    });

    return NextResponse.json({ ok: true, flushed: deleted, errors, eligible: eligible.length });
  } catch (e: any) {
    return NextResponse.json({ error: 'flush_failed' }, { status: 500 });
  }
}
