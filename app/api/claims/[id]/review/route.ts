import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabase';
import { requireReviewer } from '../../../../../lib/reviewer-auth';

type ReviewAction = 'approve' | 'reject' | 'ban';

function nextStatus(action: ReviewAction) {
  if (action === 'approve') return 'approved';
  if (action === 'reject') return 'rejected';
  return 'rejected';
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: any = {};
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    body = await req.json().catch(() => ({}));
  } else if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
    const fd = await req.formData();
    body = {
      action: fd.get('action'),
      reason: fd.get('reason'),
      actorId: fd.get('actorId')
    };
  }

  const action = String(body.action || '').toLowerCase() as ReviewAction;
  const reason = String(body.reason || '').trim();
  const actorId = String(body.actorId || 'admin');
  // SECURITY: Break-glass token in request body removed — only accept via header.
  // Hardened 2026-04-06 — body token was non-standard and bypassable.
  const reviewer = await requireReviewer(req);

  if (!reviewer) {
    return NextResponse.json({ ok: false, error: 'unauthorized_reviewer' }, { status: 401 });
  }

  if (!['approve', 'reject', 'ban'].includes(action)) {
    return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });
  }
  if ((action === 'reject' || action === 'ban') && !reason) {
    return NextResponse.json({ ok: false, error: 'reason_required' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ ok:false, error:'supabase_not_configured' }, { status: 500 });
  }

  const { data: claim, error: claimErr } = await supabase
    .from('claims')
    .select('id,status,user_id,wallet')
    .eq('id', id)
    .single();

  if (claimErr || !claim) {
    return NextResponse.json({ ok: false, error: 'claim_not_found' }, { status: 404 });
  }

  if (['paid', 'rejected'].includes(String(claim.status || ''))) {
    return NextResponse.json({ ok: false, error: 'terminal_status', status: claim.status }, { status: 409 });
  }

  const toStatus = nextStatus(action);
  const { error: updErr } = await supabase
    .from('claims')
    .update({ status: toStatus, decision_reason: reason || `${action}_by_reviewer`, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (updErr) {
    // SECURITY: Do not leak DB error details to client
    return NextResponse.json({ ok: false, error: 'claim_update_failed' }, { status: 500 });
  }

  await supabase.from('claim_status_events').insert({
    claim_id: id,
    from_status: claim.status,
    to_status: toStatus,
    actor_type: 'reviewer',
    actor_id: reviewer.xId || actorId,
    reason: reason || `${action}_by_reviewer`
  });

  if (action === 'ban') {
    await supabase.from('user_bans').insert({
      user_id: claim.user_id,
      reason,
      active: true,
      created_by: reviewer.xId || actorId
    });
  }

  await supabase.from('audit_logs').insert({
    actor_type: 'reviewer',
    actor_id: reviewer.xId || actorId,
    action: `claim_${action}`,
    target_type: 'claim',
    target_id: id,
    payload_json: {
      reason,
      wallet: claim.wallet,
      fromStatus: claim.status,
      toStatus,
      banned: action === 'ban'
    }
  });

  return NextResponse.json({ ok: true, id, action, status: toStatus, reviewer: { xId: reviewer.xId, role: reviewer.role, via: reviewer.via } });
}
