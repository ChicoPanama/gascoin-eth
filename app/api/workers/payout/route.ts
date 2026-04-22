import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { hashRequestBody, resolveIdempotencyKey } from '../../../../lib/idempotency';
import { processQueuedPayout } from '../../../../lib/payout-worker';
import { isAuthorizedCron as isAuthorized } from '../../../../lib/cron-auth';
import { expireTags } from '../../../../lib/runtime-cache';

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const claimId = String(body.claimId || '');
  const wallet = String(body.wallet || '');
  const amountEth = Number(body.amountEth || 0);
  if (!claimId || !wallet || amountEth <= 0) {
    return NextResponse.json({ ok: false, error: 'invalid_input' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ ok:false, error:'supabase_not_configured' }, { status: 500 });
  }

  const idemKey = resolveIdempotencyKey(req.headers, `${claimId}:${wallet}:${amountEth}`);
  const reqHash = hashRequestBody({ claimId, wallet, amountEth });

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
    amount_eth: amountEth,
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

  // Successful payout moved ETH out of treasury — bust the Runtime Cache
  // tag so the next /api/public/treasury hit reflects the new balance.
  await expireTags('treasury');

  return NextResponse.json(result);
}
