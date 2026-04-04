export interface ParsedTweetUrl {
  tweetId: string;
  handle: string;
  isValid: boolean;
}

export function parseTweetUrl(url: string): ParsedTweetUrl {
  const invalid = { tweetId: '', handle: '', isValid: false };
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('x.com') && !parsed.hostname.includes('twitter.com')) return invalid;
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 3 || parts[1] !== 'status') return invalid;
    const tweetId = parts[2].split('?')[0];
    if (!/^\d+$/.test(tweetId)) return invalid;
    const handle = parts[0];
    if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) return invalid;
    return { tweetId, handle, isValid: true };
  } catch {
    return invalid;
  }
}
