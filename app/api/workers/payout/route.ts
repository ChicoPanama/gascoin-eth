import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { hashRequestBody, resolveIdempotencyKey } from '../../../../lib/idempotency';
import { processQueuedPayout } from '../../../../lib/payout-worker';

function isAuthorized(req: Request): boolean {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  const auth = req.headers.get('authorization') || '';
  return auth === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const claimId = String(body.claimId || '');
  const wallet = String(body.wallet || '');
  const amountSol = Number(body.amountSol || 0);
  if (!claimId || !wallet || amountSol <= 0) {
    return NextResponse.json({ ok: false, error: 'invalid_input' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ ok:false, error:'supabase_not_configured' }, { status: 500 });
  }

  const idemKey = resolveIdempotencyKey(req.headers, `${claimId}:${wallet}:${amountSol}`);
  const reqHash = hashRequestBody({ claimId, wallet, amountSol });

  const { data: idemExisting } = await supabase
    .from('idempotency_keys')
    .select('id,status,response_json,request_hash')
    .eq('key', idemKey)
    .eq('scope', 'payout_request')
    .maybeSingle();

  if (idemExisting?.status === 'completed' && idemExisting.response_json) {
    return NextResponse.json(idemExisting.response_json);
  }

  if (idemExisting?.request_hash && idemExisting.request_hash !== reqHash) {
    return NextResponse.json({ ok: false, error: 'idempotency_key_reused_with_different_payload' }, { status: 409 });
  }

  if (!idemExisting) {
    await supabase.from('idempotency_keys').insert({
      key: idemKey,
      scope: 'payout_request',
      request_hash: reqHash,
      status: 'processing'
    });
  }

  await supabase.from('payout_jobs').upsert({
    claim_id: claimId,
    wallet,
    amount_sol: amountSol,
    status: 'queued',
    idempotency_key: idemKey,
    updated_at: new Date().toISOString()
  }, { onConflict: 'claim_id' });

  const result = await processQueuedPayout(claimId);

  await supabase.from('idempotency_keys').update({
    status: 'completed',
    response_json: result,
    updated_at: new Date().toISOString()
  }).eq('key', idemKey).eq('scope', 'payout_request');

  if (!result.ok) {
    return NextResponse.json(result, { status: result.error === 'min_gascoin_not_met' ? 422 : 500 });
  }

  return NextResponse.json(result);
}
