function getBaseUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://gascoin.app';
}

export function composeDashboardTweet(params: {
  networkUsd: number;
  referredCount: number;
  referralUrl: string;
}): string {
  const usd = Math.round(params.networkUsd);
  if (usd > 0) {
    return `My network has saved $${usd} in gas fees through GASCOIN. ${params.referredCount} people refunded so far.\n\nGet your gas money back too → ${params.referralUrl}\n\n@GasCoinApp $GAS #gascoin`;
  }
  return `I'm earning gas refunds in ETH with GASCOIN. Submit a receipt and get your gas money back → ${params.referralUrl}\n\n@GasCoinApp $GAS #gascoin`;
}

export function composePostApprovalTweet(params: {
  referralUrl: string;
}): string {
  return `Just submitted my gas receipt to GASCOIN for a ETH refund. Get your gas money back too → ${params.referralUrl}\n\n@GasCoinApp $GAS #gascoin`;
}

/**
 * Build the canonical share URL for a referral code.
 * @param tweetId  Optional source X tweet id. When present, is attached as
 *                 `&src=<id>` so the /api/referral/click handler can write
 *                 a `wallet_connect` attribution event tied to the post.
 */
export function buildReferralUrl(referralCode: string, tweetId?: string): string {
  const base = `${getBaseUrl()}/submit?ref=${encodeURIComponent(referralCode)}`;
  return tweetId ? `${base}&src=${encodeURIComponent(tweetId)}` : base;
}

export function buildTwitterIntentUrl(text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export function openShareIntent(text: string, url?: string) {
  if (typeof navigator !== 'undefined' && navigator.share) {
    navigator.share({
      title: 'GASCOIN',
      text,
      ...(url ? { url } : {}),
    }).catch(() => {
      // User cancelled or share API unavailable — fall through to twitter
      window.open(buildTwitterIntentUrl(text), '_blank');
    });
  } else {
    window.open(buildTwitterIntentUrl(text), '_blank');
  }
}
