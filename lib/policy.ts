export type GateResult = { gate: string; passed: boolean; reason?: string; score?: number };
export type ClaimInput = {
  xVerified: boolean;
  tweetUrl: string;
  tweetHasGascoin: boolean;
  tweetLive: boolean;
  connectedWallet: string;
  walletOnReceipt: string;
  receiptHasGascoin: boolean;
  gascoinUsdValue: number;
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

// Cooldown is now 7 days per X account (not 30 days per wallet)
export const COOLDOWN_DAYS = 7;

export function evaluateClaim(c: ClaimInput){
  const gates: GateResult[] = [];
  gates.push({ gate:'x_verified', passed:c.xVerified, reason:'X must be verified' });
  gates.push({ gate:'tweet_hashtag', passed:c.tweetHasGascoin, reason:'Tweet must include #gascoin' });
  gates.push({ gate:'tweet_live', passed:c.tweetLive, reason:'Tweet must remain live' });
  gates.push({ gate:'receipt_hashtag', passed:c.receiptHasGascoin, reason:'Receipt must include #gascoin' });
  gates.push({ gate:'wallet_match', passed:!!c.walletOnReceipt && c.connectedWallet.slice(-4).toLowerCase()===c.walletOnReceipt.slice(-4).toLowerCase(), reason:'Last 4 characters on receipt must match connected wallet' });
  // In dry-run mode (ENABLE_LIVE_PAYOUT=false), bypass the token hold gate for testing
  const dryRun = process.env.ENABLE_LIVE_PAYOUT !== 'true';
  gates.push({ gate:'gascoin_min_hold', passed: dryRun || c.gascoinUsdValue>=1, reason:'Wallet must hold >= $1 GASCOIN' });
  gates.push({ gate:'not_duplicate', passed:!c.duplicateHash && !c.duplicatePhash, reason:'Receipt duplicate detected' });
  gates.push({ gate:'ai_image_check', passed:c.aiScore<0.65, score:c.aiScore, reason:'AI probability too high' });
  gates.push({ gate:'tamper_check', passed:c.tamperScore<0.55, score:c.tamperScore, reason:'Tamper risk too high' });
  gates.push({ gate:'cooldown', passed:c.cooldownOk, reason:'You can only submit once every 7 days' });
  gates.push({ gate:'min_followers', passed:c.followerCount >= 100, score:c.followerCount, reason:'Account must have at least 100 followers' });
  gates.push({ gate:'account_quality', passed:c.accountQualityPassed, score:c.accountQualityScore, reason:'Account does not meet quality threshold (age, activity, profile completeness)' });

  const failed = gates.filter(g=>!g.passed);
  const riskScore = Math.min(1, (failed.length * 0.09) + (c.aiScore*0.35) + (c.tamperScore*0.25) + (c.amountUsd>200?0.08:0));
  const decision = failed.length===0 && riskScore<0.35 ? 'ready_for_dispatch' : (riskScore<0.6 ? 'needs_review' : 'rejected');

  return { gates, failed, riskScore: +riskScore.toFixed(4), decision };
}
