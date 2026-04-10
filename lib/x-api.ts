import { cacheGetOrFetch } from './cache';

const X_API_BASE = 'https://api.x.com/2';

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

// ─── Types ───

export interface XPublicMetrics {
  impression_count: number;
  like_count: number;
  retweet_count: number;
  quote_count: number;
  reply_count: number;
  bookmark_count: number;
}

export interface XTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics?: XPublicMetrics;
  entities?: { hashtags?: Array<{ tag: string }> };
}

export interface XUser {
  id: string;
  username: string;
  name: string;
  protected: boolean;
  created_at?: string;
  description?: string;
  profile_image_url?: string;
  verified?: boolean;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
}

export interface XSearchResult {
  tweets: XTweet[];
  users: XUser[];
  nextToken?: string;
}

// ─── Tweet operations ───

export async function getTweet(tweetId: string): Promise<{ tweet?: XTweet; notFound?: boolean; error?: string }> {
  const res = await xFetch(`/tweets/${tweetId}`, {
    'tweet.fields': 'created_at,author_id,entities,public_metrics,text',
    expansions: 'author_id',
    'user.fields': 'protected,username,public_metrics',
  });
  if (res.status === 404) return { notFound: true };
  if (!res.ok) { const err = await res.json().catch(() => ({})); return { error: (err as any)?.detail || `API ${res.status}` }; }
  const data = await res.json();
  return { tweet: data.data };
}

// ─── User operations ───

export async function getUser(userId: string): Promise<{ user?: XUser; error?: string }> {
  const res = await xFetch(`/users/${userId}`, { 'user.fields': 'protected,username,public_metrics,created_at,description,profile_image_url,verified' });
  if (!res.ok) { const err = await res.json().catch(() => ({})); return { error: (err as any)?.detail || `API ${res.status}` }; }
  const data = await res.json();
  return { user: data.data };
}

async function fetchUserByUsername(handle: string): Promise<{ user?: XUser; error?: string }> {
  const res = await xFetch(`/users/by/username/${handle}`, { 'user.fields': 'protected,username,public_metrics,created_at,description,profile_image_url,verified,location' });
  if (res.status === 404) return { error: 'user_not_found' };
  if (!res.ok) { const err = await res.json().catch(() => ({})); return { error: (err as any)?.detail || `API ${res.status}` }; }
  const data = await res.json();
  return { user: data.data };
}

export async function getUserByUsername(username: string): Promise<{ user?: XUser; error?: string }> {
  const handle = username.replace(/^@/, '').toLowerCase();
  return cacheGetOrFetch(`xuser:${handle}`, () => fetchUserByUsername(handle), 900);
}

// ─── Search ───

export async function searchRecentTweets(query: string, maxResults = 10, sinceId?: string): Promise<XSearchResult> {
  const params: Record<string, string> = {
    query,
    'tweet.fields': 'created_at,public_metrics,text,author_id,entities',
    'user.fields': 'public_metrics,username',
    expansions: 'author_id',
    max_results: String(Math.min(Math.max(maxResults, 10), 100)),
  };
  if (sinceId) params.since_id = sinceId;

  const res = await xFetch('/tweets/search/recent', params);

  if (!res.ok) {
    return { tweets: [], users: [] };
  }

  const data = await res.json() as any;
  return {
    tweets: data?.data || [],
    users: data?.includes?.users || [],
    nextToken: data?.meta?.next_token,
  };
}

// ─── Helpers ───

export function extractMetrics(tweet: XTweet) {
  const pm = tweet.public_metrics;
  return {
    impressions: Number(pm?.impression_count || 0),
    likes: Number(pm?.like_count || 0),
    retweets: Number(pm?.retweet_count || 0),
    quote_tweets: Number(pm?.quote_count || 0),
    replies: Number(pm?.reply_count || 0),
    bookmarks: Number(pm?.bookmark_count || 0),
  };
}
