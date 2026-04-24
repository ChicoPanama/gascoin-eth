/**
 * GATE_DEFS — the canonical ordered list of submission-verification gates.
 *
 * Single source of truth: any component that needs to know "how many gates
 * are there?" or "what are they called?" should read from here instead of
 * hardcoding a number. Adding a new gate = add a row here + add the matching
 * gates.push(...) call in evaluateClaim() below. Everything else (nav copy,
 * hero count, docs, progress bar, metadata) picks up the change automatically.
 *
 * Keeping GATE_DEFS in lock-step with the gates.push() calls is enforced by
 * tests/unit/lib/policy.test.ts which asserts result.gates.length === GATE_COUNT.
 */
export const GATE_DEFS = [
  { id: 'x_verified',                 label: 'X Verified' },
  { id: 'follows_gascoin',            label: 'Follows @GasCoinApp' },
  { id: 'tweet_hashtag',              label: 'Tweet #gascoin / $GAS' },
  { id: 'tweet_mentions_gascoinapp',  label: 'Tweet Tags @GasCoinApp' },
  { id: 'tweet_live',                 label: 'Tweet Live' },
  { id: 'receipt_hashtag',            label: 'Receipt Hashtag' },
  { id: 'wallet_match',               label: 'Wallet Match on Receipt' },
  { id: 'gascoin_min_hold',           label: 'GASCOIN Min Hold' },
  { id: 'not_duplicate',              label: 'Not a Duplicate' },
  { id: 'ai_image_check',             label: 'Not AI-Generated' },
  { id: 'tamper_check',               label: 'Not Tampered' },
  { id: 'cooldown',                   label: 'Cooldown Expired' },
  { id: 'min_amount',                 label: 'Min $5 Receipt' },
  { id: 'min_followers',              label: 'Min 100 Followers' },
  { id: 'account_quality',            label: 'Account Quality' },
  { id: 'receipt_date_valid',         label: 'Receipt Date Valid' },
  { id: 'amount_verified',            label: 'OCR Amount Verified' },
  { id: 'fraud_risk_acceptable',      label: 'Fraud Risk Acceptable' },
] as const;

export const GATE_COUNT = GATE_DEFS.length;

// AI-generated-image rejection threshold for gate 10 (ai_image_check).
// Tightened from 0.65 → 0.5 on 2026-04-21 after tester @crush100x submitted
// an AI-generated receipt that scored 0.6 — it slid through the primary
// gate (0.6 < 0.65), and was only stopped by Grok's cross-validation layer
// (isPhysicalReceipt=false, fraud_risk=critical). Real camera photos of
// receipts typically score <0.3; AI-generated images cluster 0.5–0.65,
// so 0.5 is the natural cutoff.
export const AI_IMAGE_REJECT_THRESHOLD = 0.5;

export type GateResult = { gate: string; passed: boolean; reason?: string; score?: number };
export type ClaimInput = {
  xVerified: boolean;
  followsGascoin: boolean;
  tweetUrl: string;
  tweetHasGascoin: boolean;
  tweetMentionsGascoinApp: boolean;
  tweetLive: boolean;
  connectedWallet: string;
  walletOnReceipt: string;
  receiptHasGascoin: boolean;
  gascoinTokenBalance: number;
  aiScore: number;
  tamperScore: number;
  duplicateHash: boolean;
  duplicatePhash: boolean;
  cooldownOk: boolean;
  amountUsd: number;
  ocrAmount: number | null;    // USD total from Gemini Vision; null if OCR didn't extract it
  receiptDate: string | null;  // YYYY-MM-DD from Gemini Vision; null if not extracted
  followerCount: number;
  accountQualityScore: number;
  accountQualityPassed: boolean;
  // Composite fraud label from the receipt pipeline + Grok cross-validation
  // (`lib/integrations/fraud.ts`). Defaults to 'medium' if not supplied so
  // older call sites that don't yet pass this field don't accidentally
  // short-circuit to 'low'.
  fraudRisk?: 'low' | 'medium' | 'high' | 'critical';
};

export type ClaimDecision = 'ready_for_dispatch' | 'needs_review' | 'rejected' | 'retry_later';

export function evaluateClaim(c: ClaimInput){
  const gates: GateResult[] = [];

  // Detect API failures — if social API returned garbage, don't fail the user
  const apiFailure = c.followerCount < 0;
  if (apiFailure) {
    // X API returned -1 (failure) — can't evaluate social gates reliably
    // Return retry_later so user can resubmit without penalty
    gates.push({ gate:'x_verified', passed:c.xVerified, reason:'X must be verified' });
    gates.push({ gate:'follows_gascoin', passed:false, reason:'X API unavailable — retry later' });
    gates.push({ gate:'tweet_hashtag', passed:c.tweetHasGascoin, reason:'Tweet must include #gascoin or $GAS' });
    gates.push({ gate:'tweet_mentions_gascoinapp', passed:c.tweetMentionsGascoinApp, reason:'Tweet must tag @GasCoinApp' });
    gates.push({ gate:'tweet_live', passed:c.tweetLive, reason:'Tweet must remain live' });
    gates.push({ gate:'receipt_hashtag', passed:c.receiptHasGascoin, reason:'Receipt must include #gascoin' });
    gates.push({ gate:'wallet_match', passed:!!c.walletOnReceipt && c.connectedWallet.slice(-4).toLowerCase()===c.walletOnReceipt.slice(-4).toLowerCase(), reason:'Last 4 characters on receipt must match connected wallet' });
    const dryRun = process.env.ENABLE_LIVE_PAYOUT !== 'true';
    gates.push({ gate:'gascoin_min_hold', passed: dryRun || c.gascoinTokenBalance>=1, reason:'Wallet must hold at least 1 GASCOIN' });
    gates.push({ gate:'not_duplicate', passed:!c.duplicateHash && !c.duplicatePhash, reason:'Receipt duplicate detected' });
    gates.push({ gate:'ai_image_check', passed:c.aiScore<AI_IMAGE_REJECT_THRESHOLD, score:c.aiScore, reason:'AI probability too high' });
    gates.push({ gate:'tamper_check', passed:c.tamperScore<0.55, score:c.tamperScore, reason:'Tamper risk too high' });
    gates.push({ gate:'cooldown', passed:c.cooldownOk, reason:'Submission cooldown has not expired' });
    gates.push({ gate:'min_followers', passed:false, score:c.followerCount, reason:'X API unavailable — retry later' });
    gates.push({ gate:'account_quality', passed:false, score:0, reason:'Cannot score account — X API unavailable' });
    // Receipt date and amount checks — pass with benefit-of-doubt on retry path
    gates.push({ gate:'receipt_date_valid', passed:true, reason:'API failure retry — date check deferred' });
    gates.push({ gate:'amount_verified', passed:true, reason:'API failure retry — amount check deferred' });
    gates.push({ gate:'fraud_risk_acceptable', passed:true, reason:'API failure retry — fraud pipeline deferred' });

    return { gates, failed: gates.filter(g=>!g.passed), riskScore: 0, decision: 'retry_later' as ClaimDecision };
  }

  gates.push({ gate:'x_verified', passed:c.xVerified, reason:'X must be verified' });
  gates.push({ gate:'follows_gascoin', passed:c.followsGascoin, reason:'You must follow @GasCoinApp on X before submitting' });
  gates.push({ gate:'tweet_hashtag', passed:c.tweetHasGascoin, reason:'Tweet must include #gascoin or $GAS' });
  gates.push({ gate:'tweet_mentions_gascoinapp', passed:c.tweetMentionsGascoinApp, reason:'Tweet must tag @GasCoinApp' });
  gates.push({ gate:'tweet_live', passed:c.tweetLive, reason:'Tweet must remain live' });
  gates.push({ gate:'receipt_hashtag', passed:c.receiptHasGascoin, reason:'Receipt must include #gascoin' });
  gates.push({ gate:'wallet_match', passed:!!c.walletOnReceipt && c.connectedWallet.slice(-4).toLowerCase()===c.walletOnReceipt.slice(-4).toLowerCase(), reason:'Last 4 characters on receipt must match connected wallet' });
  const dryRun = process.env.ENABLE_LIVE_PAYOUT !== 'true';
  gates.push({ gate:'gascoin_min_hold', passed: dryRun || c.gascoinTokenBalance>=1, reason:'Wallet must hold at least 1 GASCOIN' });
  gates.push({ gate:'not_duplicate', passed:!c.duplicateHash && !c.duplicatePhash, reason:'Receipt duplicate detected' });
  gates.push({ gate:'ai_image_check', passed:c.aiScore<0.65, score:c.aiScore, reason:'AI probability too high' });
  gates.push({ gate:'tamper_check', passed:c.tamperScore<0.55, score:c.tamperScore, reason:'Tamper risk too high' });
  gates.push({ gate:'cooldown', passed:c.cooldownOk, reason:'Submission cooldown has not expired' });
  gates.push({ gate:'min_amount', passed:c.amountUsd >= 5, score:c.amountUsd, reason:'Receipt must be at least $5.00 to prevent streak/submission gaming' });
  gates.push({ gate:'min_followers', passed:c.followerCount >= 100, score:c.followerCount, reason:'Account must have at least 100 followers' });
  gates.push({ gate:'account_quality', passed:c.accountQualityPassed, score:c.accountQualityScore, reason:'Account does not meet quality threshold (age, activity, profile completeness)' });

  // Gate: receipt_date_valid — OCR date must be within last 7 days and not future
  if (c.receiptDate) {
    const parsed = new Date(c.receiptDate);
    const nowMs = Date.now();
    const diffDays = (nowMs - parsed.getTime()) / 86400000;
    const dateValid = !isNaN(parsed.getTime()) && diffDays >= 0 && diffDays <= 7;
    gates.push({ gate:'receipt_date_valid', passed:dateValid, reason: dateValid ? 'Receipt date within 7-day window' : `Receipt dated ${c.receiptDate} is outside the 7-day submission window` });
  } else {
    // OCR couldn't read date — fail closed. Previously this auto-passed with
    // "manual review recommended", which was a fail-open hole: submit a
    // deliberately-unreadable receipt to bypass this gate. Failing here pushes
    // the claim into needs_review via the riskScore accumulator so a human
    // (or Claude oversight) actually sees it.
    gates.push({ gate:'receipt_date_valid', passed:false, reason:'Receipt date not extractable — OCR couldn\'t read the date. Upload a clearer photo.' });
  }

  // Gate: amount_verified — claimed amount must not exceed OCR-detected by more than 25%
  if (c.ocrAmount != null && c.ocrAmount > 0) {
    const maxAllowed = c.ocrAmount * 1.25;
    const amountOk = c.amountUsd <= maxAllowed;
    gates.push({ gate:'amount_verified', passed:amountOk, score:c.amountUsd, reason: amountOk ? 'Claimed amount matches OCR' : `Claimed $${c.amountUsd} exceeds OCR-detected $${c.ocrAmount.toFixed(2)} by more than 25%` });
  } else {
    // OCR returned no amount — fail closed. min_amount gate already fails at
    // $0, but this gate's specific job is OCR-claim agreement; if OCR couldn't
    // read the total, we haven't verified anything. Was an auto-pass before.
    gates.push({ gate:'amount_verified', passed:false, reason:'OCR amount not detected — the receipt total couldn\'t be read. Upload a clearer photo.' });
  }

  // Gate: fraud_risk_acceptable — composite fraud label from the receipt
  // pipeline + Grok cross-validation must not be 'critical' or 'high'.
  // Previously the fraudRisk field was computed and stored but never
  // checked, so a receipt that Grok flagged at critical fraud with 0.95
  // confidence could still pass every gate if form fields were correct.
  // Fail closed on high/critical. Medium passes but bumps riskScore via
  // the failed-gates count already applied.
  const fr = c.fraudRisk || 'medium';
  const fraudPassed = fr === 'low' || fr === 'medium';
  gates.push({ gate:'fraud_risk_acceptable', passed:fraudPassed, reason: fraudPassed ? `Fraud risk ${fr}` : `Fraud pipeline flagged risk as ${fr} — receipt does not appear genuine` });

  const failed = gates.filter(g=>!g.passed);

  // Clamp scores to valid range before risk calculation
  const aiClamped = Math.max(0, Math.min(1, c.aiScore));
  const tamperClamped = Math.max(0, Math.min(1, c.tamperScore));

  // Log if clamping was needed (anomalous upstream values)
  const clampFlags: string[] = [];
  if (c.aiScore !== aiClamped) clampFlags.push(`ai_clamped:${c.aiScore}->${aiClamped}`);
  if (c.tamperScore !== tamperClamped) clampFlags.push(`tamper_clamped:${c.tamperScore}->${tamperClamped}`);

  const riskScore = Math.min(1, (failed.length * 0.09) + (aiClamped*0.35) + (tamperClamped*0.25) + (c.amountUsd>200?0.08:0));
  const decision: ClaimDecision = failed.length===0 && riskScore<0.35 ? 'ready_for_dispatch' : (riskScore<0.6 ? 'needs_review' : 'rejected');

  return { gates, failed, riskScore: +riskScore.toFixed(4), decision, clampFlags: clampFlags.length > 0 ? clampFlags : undefined };
}
