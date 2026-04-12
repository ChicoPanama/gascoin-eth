import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { evaluateClaim } from '../../../../lib/policy';
import { getTierForBalance } from '../../../../lib/token-tiers';
import { verifyTweetProof, getFollowerCount } from '../../../../lib/integrations/x';
import { analyzeReceipt } from '../../../../lib/integrations/ocr';
import { runFraudChecks } from '../../../../lib/integrations/fraud';
import { hasMinimumGascoin } from '../../../../lib/integrations/solana';
import { verifyPrivySession } from '../../../../lib/integrations/privy';
import { getUserByUsername } from '../../../../lib/x-api';
import { scoreAccountQuality } from '../../../../lib/account-quality';
import { checkAndAutoBan } from '../../../../lib/auto-ban';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { hashRequestBody, resolveIdempotencyKey } from '../../../../lib/idempotency';
import { checkRateLimit } from '../../../../lib/rate-limit';
import { persistMetricsSnapshot } from '../../../../lib/metrics-snapshot';
import { bustBalanceCache } from '../../../../lib/integrations/solana';
import { recordGasPrice, detectStationPattern } from '../../../../lib/data-intelligence';
import { getCachedFlags, addMemory } from '../../../../lib/mem0';

// Fraud + OCR + AI calls can take 30s+; bump function timeout to 60s
export const maxDuration = 60;

const SUBMIT_WINDOW_SEC = 60;
const SUBMIT_MAX_PER_WINDOW = 12;

// Check rolling cooldown per X account — returns true if eligible
async function checkCooldown(supabase: any, xUserId: string, cooldownDays: number): Promise<boolean> {
  try {
    const cutoff = new Date(Date.now() - cooldownDays * 86400000).toISOString();
    // Check claims (not just payouts) — prevents rapid resubmission
    const { data } = await supabase
      .from('claims')
      .select('id')
      .eq('user_id', xUserId)
      .in('status', ['submitted', 'auto_review', 'ready_for_dispatch', 'needs_review', 'approved', 'paid'])
      .gte('created_at', cutoff)
      .limit(1)
      .maybeSingle();
    return !data;
  } catch {
    return true; // fail open — don't block on DB error
  }
}

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') || '';
  return xff.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req: Request){
  const ip = clientIp(req);
  const ipCountry = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || null;
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

  // SECURITY: Verify this wallet isn't registered to a different X account
  const { data: walletOwner } = await supabase
    .from('wallet_links')
    .select('user_id')
    .eq('wallet', wallet)
    .eq('is_primary', true)
    .not('user_id', 'is', null)
    .maybeSingle();

  if (walletOwner && walletOwner.user_id) {
    // Check if it belongs to a different user
    const { data: ownerUser } = await supabase
      .from('users')
      .select('x_user_id')
      .eq('id', walletOwner.user_id)
      .single();

    if (ownerUser && ownerUser.x_user_id !== session.xId && ownerUser.x_user_id !== `x_${session.xHandle}`) {
      return NextResponse.json({ ok:false, error:'wallet_registered_to_another_account' }, { status: 409 });
    }
  }
  const walletOnReceiptInput = String(form.get('walletOnReceipt')||'');
  const amountUsdRaw = Number(form.get('amountUsd') || 0);
  if (isNaN(amountUsdRaw) || !isFinite(amountUsdRaw) || amountUsdRaw < 0 || amountUsdRaw > 10000) {
    return NextResponse.json({ ok: false, error: 'invalid_amount' }, { status: 400 });
  }
  const amountUsd = amountUsdRaw;
  const receipt = form.get('receipt');

  if (!(receipt instanceof File)) {
    return NextResponse.json({ ok:false, error:'receipt_required' }, { status: 400 });
  }

  // File size limit: 15MB (covers 48MP iPhone photos)
  const MAX_FILE_SIZE = 15 * 1024 * 1024;
  if (receipt.size > MAX_FILE_SIZE) {
    return NextResponse.json({ ok:false, error:'file_too_large', maxMb: 15 }, { status: 400 });
  }

  // Validate file type
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'application/pdf'];
  if (receipt.type && !ALLOWED_TYPES.includes(receipt.type)) {
    return NextResponse.json({ ok:false, error:'invalid_file_type', allowed: ALLOWED_TYPES }, { status: 400 });
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

  // Run tweet verification, OCR, balance check, follower check, and account quality in parallel
  const [tweet, ocr, minHold, followerCount, userLookup] = await Promise.all([
    verifyTweetProof(tweetUrl, `@${session.xHandle}`),
    analyzeReceipt(receipt),
    hasMinimumGascoin(wallet, 1),
    getFollowerCount(session.xHandle),
    getUserByUsername(session.xHandle)
  ]);

  // Fetch historical signals for enhanced account quality scoring
  const { data: walletLink } = await supabase
    .from('wallet_x_links')
    .select('avg_quality_score, x_is_protected, x_location, bio, x_account_created_at')
    .eq('wallet', wallet)
    .maybeSingle();

  const { data: lastMetrics } = await supabase
    .from('user_metrics_history')
    .select('follower_count, created_at')
    .eq('wallet', wallet)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const snapshotAgeDays = lastMetrics?.created_at
    ? Math.floor((Date.now() - new Date(lastMetrics.created_at).getTime()) / 86400000)
    : null;

  const accountQuality = userLookup.user ? scoreAccountQuality(userLookup.user, {
    previousFollowerCount: lastMetrics?.follower_count ?? null,
    avgQualityScore: walletLink?.avg_quality_score ?? null,
    isProtected: walletLink?.x_is_protected ?? null,
    ipCountry: ipCountry,
    xLocation: walletLink?.x_location ?? null,
    bio: walletLink?.bio ?? null,
    accountCreatedAt: walletLink?.x_account_created_at ?? null,
    snapshotAge: snapshotAgeDays,
  }) : { score: 0, passed: false, flags: ['user_lookup_failed'] };

  // Pass OCR pipeline data to fraud checks to avoid redundant processing
  const fraudBase = await runFraudChecks(receiptBuffer, ocr.pipeline);

  const walletOnReceipt = walletOnReceiptInput || ocr.walletOnReceipt || '';

  const { data: dupRows, error: dupErr } = await supabase
    .from('claim_receipts')
    .select('claim_id,hash_sha256,phash')
    .or(`hash_sha256.eq.${fraudBase.hashSha256},phash.eq.${fraudBase.pHash}`)
    .limit(5);

  if (dupErr) {
    // SECURITY: Do not leak DB error details to client
    return NextResponse.json({ ok:false, error:'duplicate_lookup_failed' }, { status: 500 });
  }

  const duplicateHash = !!dupRows?.some((r:any) => r.hash_sha256 === fraudBase.hashSha256);
  const duplicatePhash = !!dupRows?.some((r:any) => r.phash === fraudBase.pHash);

  // Determine tier from token balance for tier-based cooldown
  const userTier = getTierForBalance(minHold.tokenBalance ?? 0);

  // Cooldown is per X account (user_id), not per wallet — duration depends on tier
  const { data: userRowForCooldown } = await supabase
    .from('users')
    .select('id')
    .eq('x_user_id', session.xId || `x_${session.xHandle}`)
    .maybeSingle();

  const cooldownOk = userRowForCooldown?.id
    ? await checkCooldown(supabase, userRowForCooldown.id, userTier.cooldown_days)
    : true; // new user, no cooldown

  // Read cached mem0 flags (Redis only — never hits mem0 API on hot path)
  const mem0Flags = await getCachedFlags(wallet);

  const result = evaluateClaim({
    xVerified: session.xVerified,
    tweetUrl,
    tweetHasGascoin: !!tweet.containsGascoin,
    tweetLive: !!tweet.live,
    connectedWallet: wallet,
    walletOnReceipt,
    receiptHasGascoin: !!ocr.receiptHasGascoin,
    gascoinTokenBalance: minHold.tokenBalance ?? 0,
    aiScore: fraudBase.aiScore,
    tamperScore: fraudBase.tamperScore,
    duplicateHash,
    duplicatePhash,
    cooldownOk,
    amountUsd,
    followerCount,
    accountQualityScore: accountQuality.score,
    accountQualityPassed: accountQuality.passed,
  });

  // If X API failed, tell user to retry — don't penalize them
  if (result.decision === 'retry_later') {
    return NextResponse.json({
      ok: false,
      error: 'api_unavailable',
      retryable: true,
      message: 'Social verification temporarily unavailable. Please try again in a few minutes.',
      gates: result.gates,
    }, { status: 503 });
  }

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
    // SECURITY: Do not leak DB error details to client
    return NextResponse.json({ ok:false, error:'user_upsert_failed' }, { status: 500 });
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
      decision_reason: result.failed.map(f => f.gate).join(',') || 'auto_approved',
      ip_country: ipCountry
    })
    .select('id,status')
    .single();

  if (claimErr || !claimRow?.id) {
    return NextResponse.json({ ok:false, error:'claim_insert_failed' }, { status: 500 });
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
    // SECURITY: Do not leak storage error details to client
    return NextResponse.json({ ok:false, error:'receipt_upload_failed', claimId }, { status: 500 });
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
        duplicatePhash,
        // Pipeline fraud signals
        authenticityScore: fraudBase.authenticityScore,
        fraudRisk: fraudBase.fraudRisk,
        flags: fraudBase.flags,
        exifScore: fraudBase.exifScore,
        dimensionScore: fraudBase.dimensionScore,
        // Privacy-first: country only, no station name/city/state
        country: ocr.pipeline?.extraction?.station_country ?? null,
        receiptDate: ocr.pipeline?.extraction?.receipt_date ?? null,
        isPhysicalReceipt: ocr.pipeline?.extraction?.is_physical_receipt ?? null,
        isDigitallyManipulated: ocr.pipeline?.extraction?.is_digitally_manipulated ?? null,
        fraudNotes: ocr.pipeline?.extraction?.fraud_notes ?? null,
      }
    });

  if (receiptErr) {
    // SECURITY: Do not leak DB error details to client
    return NextResponse.json({ ok:false, error:'receipt_insert_failed', claimId }, { status: 500 });
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
      duplicatePhash,
      ...(result.clampFlags ? { clampFlags: result.clampFlags } : {}),
      ...(mem0Flags ? { mem0Flags: mem0Flags.riskFlags, mem0Trust: mem0Flags.trustLevel } : {}),
    }
  });

  // Fire-and-forget: record submission signal in mem0
  addMemory('wallet', wallet,
    `Submitted claim ${claimId}: decision=${result.decision}, risk=${result.riskScore}, ` +
    `failed=[${result.failed.map((f: any) => f.gate).join(',')}], tier=${userTier.slug}, amount=$${amountUsd}`,
    { pipeline: 'submission', decision: result.decision, riskScore: result.riskScore },
  ).catch(() => {});

  // Snapshot metrics for historical tracking (non-blocking)
  if (userRow?.id) {
    persistMetricsSnapshot(supabase, {
      userId: userRow.id,
      wallet,
      xHandle: session.xHandle,
      xUser: userLookup.user ?? null,
      accountQualityScore: accountQuality.score,
      accountQualityPassed: accountQuality.passed,
      gascoinBalance: minHold.tokenBalance ?? 0,
      tierId: userTier.id,
      ipCountry: ipCountry ?? undefined,
      source: 'submission',
    }).catch(() => {});
  }

  // Record gas price data for intelligence (non-blocking)
  recordGasPrice(supabase, {
    country: ocr.country ?? null,
    currency: (ocr.pipeline?.extraction as any)?.currency ?? null,
    amountUsd,
  }).catch(() => {});

  // Bust balance cache so next lookup gets fresh data
  bustBalanceCache(wallet).catch(() => {});

  // Auto-ban check: if claim was rejected, check if user should be banned
  if (result.decision === 'rejected' && userRow?.id) {
    const banResult = await checkAndAutoBan(userRow.id, `claim_rejected:${claimId}`, wallet);
    if (banResult.banned) {
      return NextResponse.json({
        ok: false,
        claimId,
        error: 'account_banned',
        reason: 'Your account has been suspended due to repeated policy violations.',
      }, { status: 403 });
    }
  }

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
      tokenBalance: minHold.tokenBalance,
      tierSlug: userTier.slug,
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
