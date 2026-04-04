const X_API_BASE = 'https://api.twitter.com/2';

function getBearer() {
  return process.env.X_API_BEARER_TOKEN || process.env.X_BEARER_TOKEN || '';
}

async function xFetch(endpoint: string, params: Record<string, string> = {}): Promise<Response> {
  const url = new URL(`${X_API_BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${getBearer()}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (res.status === 429) {
    const reset = res.headers.get('x-rate-limit-reset');
    throw new Error(`X API rate limit. Resets: ${reset ? new Date(parseInt(reset) * 1000).toISOString() : 'unknown'}`);
  }

  return res;
}

export interface XTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  entities?: { hashtags?: Array<{ tag: string }> };
}

export interface XUser {
  id: string;
  username: string;
  name: string;
  protected: boolean;
}

export async function getTweet(tweetId: string): Promise<{ tweet?: XTweet; notFound?: boolean; error?: string }> {
  const res = await xFetch(`/tweets/${tweetId}`, {
    'tweet.fields': 'created_at,author_id,entities',
    expansions: 'author_id',
    'user.fields': 'protected,username',
  });
  if (res.status === 404) return { notFound: true };
  if (!res.ok) { const err = await res.json().catch(() => ({})); return { error: (err as any)?.detail || `API ${res.status}` }; }
  const data = await res.json();
  return { tweet: data.data };
}

export async function getUser(userId: string): Promise<{ user?: XUser; error?: string }> {
  const res = await xFetch(`/users/${userId}`, { 'user.fields': 'protected,username' });
  if (!res.ok) { const err = await res.json().catch(() => ({})); return { error: (err as any)?.detail || `API ${res.status}` }; }
  const data = await res.json();
  return { user: data.data };
}
