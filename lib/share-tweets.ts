const BASE_URL = typeof window !== 'undefined'
  ? window.location.origin
  : process.env.NEXT_PUBLIC_BASE_URL || 'https://platform-ebon-nine.vercel.app';

export function composeDashboardTweet(params: {
  networkUsd: number;
  referredCount: number;
  referralUrl: string;
}): string {
  const usd = Math.round(params.networkUsd);
  if (usd > 0) {
    return `My network has saved $${usd} in gas fees through GASCOIN. ${params.referredCount} people refunded so far.\n\nGet your gas money back too → ${params.referralUrl}\n\n#gascoin`;
  }
  return `I'm earning gas refunds in SOL with GASCOIN. Submit a receipt and get your gas money back → ${params.referralUrl}\n\n#gascoin`;
}

export function composePostApprovalTweet(params: {
  referralUrl: string;
}): string {
  return `Just submitted my gas receipt to GASCOIN for a SOL refund. Get your gas money back too → ${params.referralUrl}\n\n#gascoin`;
}

export function buildReferralUrl(referralCode: string): string {
  return `${BASE_URL}/submit?ref=${referralCode}`;
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
