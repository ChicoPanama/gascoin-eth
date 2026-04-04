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
};

export function evaluateClaim(c: ClaimInput){
  const gates: GateResult[] = [];
  gates.push({ gate:'x_verified', passed:c.xVerified, reason:'X must be verified' });
  gates.push({ gate:'tweet_hashtag', passed:c.tweetHasGascoin, reason:'Tweet must include #gascoin' });
  gates.push({ gate:'tweet_live', passed:c.tweetLive, reason:'Tweet must remain live' });
  gates.push({ gate:'receipt_hashtag', passed:c.receiptHasGascoin, reason:'Receipt must include #gascoin' });
  gates.push({ gate:'wallet_match', passed:!!c.walletOnReceipt && c.walletOnReceipt===c.connectedWallet, reason:'Receipt wallet must match connected wallet' });
  gates.push({ gate:'gascoin_min_hold', passed:c.gascoinUsdValue>=1, reason:'Wallet must hold >= $1 GASCOIN' });
  gates.push({ gate:'not_duplicate', passed:!c.duplicateHash && !c.duplicatePhash, reason:'Receipt duplicate detected' });
  gates.push({ gate:'ai_image_check', passed:c.aiScore<0.65, score:c.aiScore, reason:'AI probability too high' });
  gates.push({ gate:'tamper_check', passed:c.tamperScore<0.55, score:c.tamperScore, reason:'Tamper risk too high' });
  gates.push({ gate:'cooldown', passed:c.cooldownOk, reason:'Cooldown window active' });
  gates.push({ gate:'min_followers', passed:c.followerCount >= 100, score:c.followerCount, reason:'Account must have at least 100 followers' });

  const failed = gates.filter(g=>!g.passed);
  const riskScore = Math.min(1, (failed.length * 0.09) + (c.aiScore*0.35) + (c.tamperScore*0.25) + (c.amountUsd>200?0.08:0));
  const decision = failed.length===0 && riskScore<0.35 ? 'ready_for_dispatch' : (riskScore<0.6 ? 'needs_review' : 'rejected');

  return { gates, failed, riskScore: +riskScore.toFixed(4), decision };
}
