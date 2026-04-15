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
  { id: 'x_verified',       label: 'X Verified' },
  { id: 'follows_gascoin',  label: 'Follows @GasCoinApp' },
  { id: 'tweet_hashtag',    label: 'Tweet #gascoin / $GASCOIN' },
  { id: 'tweet_live',       label: 'Tweet Live' },
  { id: 'receipt_hashtag',  label: 'Receipt Hashtag' },
  { id: 'wallet_match',     label: 'Wallet Match on Receipt' },
  { id: 'gascoin_min_hold', label: 'GASCOIN Min Hold' },
  { id: 'not_duplicate',    label: 'Not a Duplicate' },
  { id: 'ai_image_check',   label: 'Not AI-Generated' },
  { id: 'tamper_check',     label: 'Not Tampered' },
  { id: 'cooldown',         label: 'Cooldown Expired' },
  { id: 'min_amount',       label: 'Min $5 Receipt' },
  { id: 'min_followers',    label: 'Min 100 Followers' },
  { id: 'account_quality',  label: 'Account Quality' },
] as const;

export const GATE_COUNT = GATE_DEFS.length;

export type GateResult = { gate: string; passed: boolean; reason?: string; score?: number };
export type ClaimInput = {
  xVerified: boolean;
  followsGascoin: boolean;
  tweetUrl: string;
  tweetHasGascoin: boolean;
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
  followerCount: number;
  accountQualityScore: number;
  accountQualityPassed: boolean;
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
    gates.push({ gate:'tweet_hashtag', passed:c.tweetHasGascoin, reason:'Tweet must include #gascoin' });
    gates.push({ gate:'tweet_live', passed:c.tweetLive, reason:'Tweet must remain live' });
    gates.push({ gate:'receipt_hashtag', passed:c.receiptHasGascoin, reason:'Receipt must include #gascoin' });
    gates.push({ gate:'wallet_match', passed:!!c.walletOnReceipt && c.connectedWallet.slice(-4).toLowerCase()===c.walletOnReceipt.slice(-4).toLowerCase(), reason:'Last 4 characters on receipt must match connected wallet' });
    const dryRun = process.env.ENABLE_LIVE_PAYOUT !== 'true';
    gates.push({ gate:'gascoin_min_hold', passed: dryRun || c.gascoinTokenBalance>=1, reason:'Wallet must hold at least 1 GASCOIN' });
    gates.push({ gate:'not_duplicate', passed:!c.duplicateHash && !c.duplicatePhash, reason:'Receipt duplicate detected' });
    gates.push({ gate:'ai_image_check', passed:c.aiScore<0.65, score:c.aiScore, reason:'AI probability too high' });
    gates.push({ gate:'tamper_check', passed:c.tamperScore<0.55, score:c.tamperScore, reason:'Tamper risk too high' });
    gates.push({ gate:'cooldown', passed:c.cooldownOk, reason:'Submission cooldown has not expired' });
    gates.push({ gate:'min_followers', passed:false, score:c.followerCount, reason:'X API unavailable — retry later' });
    gates.push({ gate:'account_quality', passed:false, score:0, reason:'Cannot score account — X API unavailable' });

    return { gates, failed: gates.filter(g=>!g.passed), riskScore: 0, decision: 'retry_later' as ClaimDecision };
  }

  gates.push({ gate:'x_verified', passed:c.xVerified, reason:'X must be verified' });
  gates.push({ gate:'follows_gascoin', passed:c.followsGascoin, reason:'You must follow @GasCoinApp on X before submitting' });
  gates.push({ gate:'tweet_hashtag', passed:c.tweetHasGascoin, reason:'Tweet must include #gascoin' });
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
