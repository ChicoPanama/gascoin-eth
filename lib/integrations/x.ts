export type TweetProofResult = {
  ok: boolean;
  reason?: string;
  authorHandle?: string;
  containsGascoin?: boolean;
  live?: boolean;
};

function parseTweetId(url: string): string | null {
  const m = url.match(/status\/(\d+)/i);
  return m?.[1] || null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, init: RequestInit, retries = 3): Promise<Response> {
  let lastErr: any;
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url, init);
      if (r.status >= 500 || r.status === 429) {
        const wait = Number(r.headers.get('retry-after') || 0) * 1000 || (300 * Math.pow(2, i));
        await sleep(wait);
      }
      return r;
    } catch (e) {
      lastErr = e;
      await sleep(300 * Math.pow(2, i));
    }
  }
  throw lastErr || new Error('x_fetch_failed');
}

async function verifyViaXApi(tweetId: string, expectedHandle: string): Promise<TweetProofResult> {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) return { ok: false, reason: 'x_token_missing' };

  const endpoint = new URL(`https://api.x.com/2/tweets/${tweetId}`);
  endpoint.searchParams.set('expansions', 'author_id');
  endpoint.searchParams.set('tweet.fields', 'text');
  endpoint.searchParams.set('user.fields', 'username,verified');

  const r = await fetchWithRetry(endpoint.toString(), {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store'
  }, 3);

  if (!r.ok) {
    if (r.status === 404) return { ok: false, reason: 'tweet_not_found', live: false };
    return { ok: false, reason: `x_api_${r.status}` };
  }

  const j = (await r.json()) as any;
  const text = String(j?.data?.text || '');
  const user = j?.includes?.users?.[0] || {};
  const username = String(user?.username || '').toLowerCase();
  const expected = expectedHandle.replace(/^@/, '').toLowerCase();
  const containsGascoin = /#gascoin\b/i.test(text);
  const authorMatch = !!expected && username === expected;

  return {
    ok: containsGascoin && authorMatch,
    reason: !containsGascoin ? 'missing_hashtag' : (authorMatch ? undefined : 'author_mismatch'),
    authorHandle: username ? `@${username}` : undefined,
    containsGascoin,
    live: true
  };
}

async function verifyViaOEmbed(tweetUrl: string, expectedHandle: string): Promise<TweetProofResult> {
  const endpoint = new URL('https://publish.twitter.com/oembed');
  endpoint.searchParams.set('url', tweetUrl);

  const r = await fetchWithRetry(endpoint.toString(), { cache: 'no-store' }, 2);
  if (!r.ok) return { ok: false, reason: `oembed_${r.status}` };

  const j = (await r.json()) as any;
  const html = String(j?.html || '');
  const containsGascoin = /#gascoin\b/i.test(html);
  const handleMatch = html.match(/twitter\.com\/([A-Za-z0-9_]+)/i);
  const found = handleMatch?.[1] ? `@${handleMatch[1]}` : undefined;
  const authorMatch = !!found && found.toLowerCase() === expectedHandle.toLowerCase();

  return {
    ok: containsGascoin && authorMatch,
    reason: !containsGascoin ? 'missing_hashtag' : (authorMatch ? undefined : 'author_mismatch'),
    authorHandle: found,
    containsGascoin,
    live: true
  };
}

export async function getFollowerCount(handle: string): Promise<number> {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) return -1;

  const username = handle.replace(/^@/, '');
  const endpoint = new URL(`https://api.x.com/2/users/by/username/${username}`);
  endpoint.searchParams.set('user.fields', 'public_metrics');

  try {
    const r = await fetchWithRetry(endpoint.toString(), {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store'
    }, 2);
    if (!r.ok) return -1;
    const j = (await r.json()) as any;
    return Number(j?.data?.public_metrics?.followers_count ?? -1);
  } catch {
    return -1;
  }
}

export async function verifyTweetProof(tweetUrl: string, expectedHandle: string): Promise<TweetProofResult> {
  if (!tweetUrl.includes('x.com') && !tweetUrl.includes('twitter.com')) {
    return { ok: false, reason: 'invalid_tweet_url' };
  }

  const strict = (process.env.X_STRICT_MODE || 'true').toLowerCase() === 'true';
  const id = parseTweetId(tweetUrl);

  if (id && process.env.X_BEARER_TOKEN) {
    const viaApi = await verifyViaXApi(id, expectedHandle);
    return viaApi;
  }

  if (strict) {
    return { ok: false, reason: 'x_api_required_in_strict_mode' };
  }

  return verifyViaOEmbed(tweetUrl, expectedHandle);
}
