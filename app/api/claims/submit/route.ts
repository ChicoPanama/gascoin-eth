import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { evaluateClaim } from '../../../../lib/policy';
import { verifyTweetProof } from '../../../../lib/integrations/x';
import { analyzeReceipt } from '../../../../lib/integrations/ocr';
import { runFraudChecks } from '../../../../lib/integrations/fraud';
import { hasMinimumGascoinUsd } from '../../../../lib/integrations/solana';
import { verifyPrivySession } from '../../../../lib/integrations/privy';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { hashRequestBody, resolveIdempotencyKey } from '../../../../lib/idempotency';
import { checkRateLimit } from '../../../../lib/rate-limit';

const SUBMIT_WINDOW_SEC = 60;
const SUBMIT_MAX_PER_WINDOW = 12;

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') || '';
  return xff.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req: Request){
  const ip = clientIp(req);
  const rl = await checkRateLimit(`submit:${ip}`, SUBMIT_MAX_PER_WINDOW, SUBMIT_WINDOW_SEC);
  if (!rl.ok) {
    return NextResponse.json({ ok:false, error:'rate_limited', mode: rl.mode, retryAfterSec: rl.resetSec }, { status: 429 });
  }

  const auth = req.headers.get('authorization');
  const session = await verifyPrivySession(auth, {
    xId: req.headers.get('x-privy-user-id') || '',
    xHandle: req.headers.get('x-privy-handle') || '',
    wallet: req.headers.get('x-privy-wallet') || ''
  }, req.headers.get('cookie'));
  if (!session) {
    return NextResponse.json({ ok:false, error:'unauthorized_privy_session_required' }, { status: 401 });
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ ok:false, error:'supabase_not_configured' }, { status: 500 });
  }

  const form = await req.formData();
  const tweetUrl = String(form.get('tweetUrl')||'');
  const walletInput = String(form.get('wallet')||'').trim();
  const wallet = session.wallet;
  if (!wallet) {
    return NextResponse.json({ ok:false, error:'wallet_not_connected_in_privy_session' }, { status: 400 });
  }
  if (walletInput && walletInput !== session.wallet) {
    return NextResponse.json({ ok:false, error:'wallet_mismatch_with_session' }, { status: 400 });
  }
  const walletOnReceiptInput = String(form.get('walletOnReceipt')||'');
  const amountUsd = Number(form.get('amountUsd')||0);
  const receipt = form.get('receipt');

  if (!(receipt instanceof File)) {
    return NextResponse.json({ ok:false, error:'receipt_required' }, { status: 400 });
  }

  const receiptBuffer = await receipt.arrayBuffer();
  const reqHash = hashRequestBody({ tweetUrl, wallet: session.wallet, amountUsd, walletOnReceiptInput, receiptSize: receiptBuffer.byteLength });
  const idemKey = resolveIdempotencyKey(req.headers, `submit:${tweetUrl}:${session.wallet}:${receiptBuffer.byteLength}`);

  const { data: idemExisting } = await supabase
    .from('idempotency_keys')
    .select('request_hash,status,response_json')
    .eq('key', idemKey)
    .eq('scope', 'claim_submit')
    .maybeSingle();

  if (idemExisting?.status === 'completed' && idemExisting.response_json) {
    return NextResponse.json(idemExisting.response_json);
  }
  if (idemExisting?.request_hash && idemExisting.request_hash !== reqHash) {
    return NextResponse.json({ ok:false, error:'idempotency_key_reused_with_different_payload' }, { status: 409 });
  }
  if (!idemExisting) {
    await supabase.from('idempotency_keys').insert({ key: idemKey, scope: 'claim_submit', request_hash: reqHash, status: 'processing' });
  }

  const [tweet, ocr, fraudBase, minHold] = await Promise.all([
    verifyTweetProof(tweetUrl, `@${session.xHandle}`),
    analyzeReceipt(receipt),
    runFraudChecks(receiptBuffer),
    hasMinimumGascoinUsd(wallet, 1)
  ]);

  const walletOnReceipt = walletOnReceiptInput || ocr.walletOnReceipt || '';

  const { data: dupRows, error: dupErr } = await supabase
    .from('claim_receipts')
    .select('claim_id,hash_sha256,phash')
    .or(`hash_sha256.eq.${fraudBase.hashSha256},phash.eq.${fraudBase.pHash}`)
    .limit(5);

  if (dupErr) {
    return NextResponse.json({ ok:false, error:'duplicate_lookup_failed', details: dupErr.message }, { status: 500 });
  }

  const duplicateHash = !!dupRows?.some((r:any) => r.hash_sha256 === fraudBase.hashSha256);
  const duplicatePhash = !!dupRows?.some((r:any) => r.phash === fraudBase.pHash);

  const result = evaluateClaim({
    xVerified: session.xVerified,
    tweetUrl,
    tweetHasGascoin: !!tweet.containsGascoin,
    tweetLive: !!tweet.live,
    connectedWallet: wallet,
    walletOnReceipt,
    receiptHasGascoin: !!ocr.receiptHasGascoin,
    gascoinUsdValue: minHold.usdValue,
    aiScore: fraudBase.aiScore,
    tamperScore: fraudBase.tamperScore,
    duplicateHash,
    duplicatePhash,
    cooldownOk: true,
    amountUsd
  });

  // upsert user and wallet linkage
  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .upsert({
      x_user_id: session.xId || `x_${session.xHandle}`,
      x_handle: `@${session.xHandle}`,
      x_verified: session.xVerified
    }, { onConflict: 'x_user_id' })
    .select('id')
    .single();

  if (userErr || !userRow?.id) {
    return NextResponse.json({ ok:false, error:'user_upsert_failed', details: userErr?.message }, { status: 500 });
  }

  const { data: banRow } = await supabase
    .from('user_bans')
    .select('id,reason')
    .eq('user_id', userRow.id)
    .eq('active', true)
    .maybeSingle();

  if (banRow?.id) {
    return NextResponse.json({ ok:false, error:'user_banned', reason: banRow.reason }, { status: 403 });
  }

  await supabase
    .from('wallet_links')
    .upsert({ user_id: userRow.id, wallet, is_primary: true, verified_at: new Date().toISOString() }, { onConflict: 'user_id,wallet' });

  const nonce = crypto.randomUUID();
  const { data: claimRow, error: claimErr } = await supabase
    .from('claims')
    .insert({
      user_id: userRow.id,
      wallet,
      tweet_url: tweetUrl,
      nonce,
      status: 'submitted',
      claimed_amount: amountUsd,
      parsed_amount: ocr.amountUsd ?? amountUsd,
      claim_currency: 'USD',
      risk_score: result.riskScore,
      decision_reason: result.failed.map(f => f.gate).join(',') || 'auto_approved'
    })
    .select('id,status')
    .single();

  if (claimErr || !claimRow?.id) {
    return NextResponse.json({ ok:false, error:'claim_insert_failed', details: claimErr?.message }, { status: 500 });
  }

  const claimId = claimRow.id;
  const sanitizedName = String(receipt.name || 'receipt.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `receipts/${claimId}/${Date.now()}_${sanitizedName}`;

  const { error: uploadErr } = await supabase
    .storage
    .from('receipts-private')
    .upload(storagePath, Buffer.from(receiptBuffer), {
      contentType: receipt.type || 'application/octet-stream',
      upsert: false
    });

  if (uploadErr) {
    await supabase.from('audit_logs').insert({
      actor_type: 'system',
      actor_id: 'submit_api',
      action: 'receipt_upload_failed',
      target_type: 'claim',
      target_id: claimId,
      payload_json: { error: uploadErr.message }
    });
    return NextResponse.json({ ok:false, error:'receipt_upload_failed', details: uploadErr.message, claimId }, { status: 500 });
  }

  const { error: receiptErr } = await supabase
    .from('claim_receipts')
    .insert({
      claim_id: claimId,
      storage_path_private: storagePath,
      hash_sha256: fraudBase.hashSha256,
      phash: fraudBase.pHash,
      ocr_text: ocr.text,
      ocr_confidence: ocr.confidence,
      ai_score: fraudBase.aiScore,
      tamper_score: fraudBase.tamperScore,
      metadata_json: {
        receiptHasGascoin: ocr.receiptHasGascoin,
        walletOnReceipt,
        amountUsdDetected: ocr.amountUsd,
        duplicateHash,
        duplicatePhash
      }
    });

  if (receiptErr) {
    return NextResponse.json({ ok:false, error:'receipt_insert_failed', details: receiptErr.message, claimId }, { status: 500 });
  }

  if (result.gates.length) {
    const gateRows = result.gates.map((g) => ({
      claim_id: claimId,
      gate_name: g.gate,
      passed: g.passed,
      score: g.score ?? null,
      reason_code: g.reason ?? null
    }));
    await supabase.from('gate_results').insert(gateRows);
  }

  await supabase.from('claims').update({
    status: result.decision,
    updated_at: new Date().toISOString(),
    decision_reason: result.failed.map(f => f.gate).join(',') || 'auto_approved'
  }).eq('id', claimId);

  await supabase.from('claim_status_events').insert({
    claim_id: claimId,
    from_status: 'submitted',
    to_status: result.decision,
    actor_type: 'system',
    actor_id: 'gate_engine',
    reason: result.failed.map(f => f.gate).join(',') || 'auto_approved'
  });

  await supabase.from('audit_logs').insert({
    actor_type: 'user',
    actor_id: session.xId || session.xHandle,
    action: 'claim_submitted',
    target_type: 'claim',
    target_id: claimId,
    payload_json: {
      tweetUrl,
      wallet,
      riskScore: result.riskScore,
      decision: result.decision,
      duplicateHash,
      duplicatePhash
    }
  });

  const response = {
    ok:true,
    claimId,
    session: { xHandle: session.xHandle, wallet: session.wallet, xVerified: session.xVerified },
    decision: result.decision,
    riskScore: result.riskScore,
    gates: result.gates,
    extracted: {
      ocrConfidence: ocr.confidence,
      parsedWallet: ocr.walletOnReceipt,
      minGascoinUsdValue: minHold.usdValue,
      tokenBalance: minHold.tokenBalance,
      hashSha256: fraudBase.hashSha256,
      pHash: fraudBase.pHash
    }
  };

  await supabase.from('idempotency_keys').update({
    status: 'completed',
    response_json: response,
    updated_at: new Date().toISOString()
  }).eq('key', idemKey).eq('scope', 'claim_submit');

  return NextResponse.json(response);
}
