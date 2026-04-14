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

export type ContentType = 'original_video' | 'original_image' | 'text_only' | 'repost' | 'quote' | 'has_external_link';

export interface XMedia {
  media_key: string;
  type: 'photo' | 'video' | 'animated_gif';
  url?: string;
}

export interface XTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics?: XPublicMetrics;
  entities?: { hashtags?: Array<{ tag: string }>; urls?: Array<{ expanded_url: string; display_url: string }> };
  attachments?: { media_keys?: string[] };
  referenced_tweets?: Array<{ type: 'retweeted' | 'quoted' | 'replied_to'; id: string }>;
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
  verified_type?: 'none' | 'blue' | 'business' | 'government';
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
  media: XMedia[];
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
  const res = await xFetch(`/users/${userId}`, { 'user.fields': 'protected,username,public_metrics,created_at,description,profile_image_url,verified,verified_type' });
  if (!res.ok) { const err = await res.json().catch(() => ({})); return { error: (err as any)?.detail || `API ${res.status}` }; }
  const data = await res.json();
  return { user: data.data };
}

async function fetchUserByUsername(handle: string): Promise<{ user?: XUser; error?: string }> {
  const res = await xFetch(`/users/by/username/${handle}`, { 'user.fields': 'protected,username,public_metrics,created_at,description,profile_image_url,verified,verified_type,location' });
  if (res.status === 404) return { error: 'user_not_found' };
  if (!res.ok) { const err = await res.json().catch(() => ({})); return { error: (err as any)?.detail || `API ${res.status}` }; }
  const data = await res.json();
  return { user: data.data };
}

export async function getUserByUsername(username: string): Promise<{ user?: XUser; error?: string }> {
  const handle = username.replace(/^@/, '').toLowerCase();
  return cacheGetOrFetch(`xuser:${handle}`, () => fetchUserByUsername(handle), 900);
}

/**
 * Paginate a user's followers from the X API v2.
 *
 * Used by the sync-gascoin-followers worker to rebuild the `gascoin:x_followers`
 * Redis SET that backs the `follows_gascoin` gate. Returns the full list of
 * follower X user IDs (strings), or an error if the API is unreachable.
 *
 * Pagination: `/2/users/:id/followers?max_results=1000` caps at 1000 per page.
 * `maxPages` bounds worst-case cost — for a new brand account this is usually
 * 1 page, so we default to a generous 20 (up to 20k followers) before bailing.
 */
export async function getUserFollowers(
  userId: string,
  opts?: { maxPages?: number },
): Promise<{ ids: string[]; error?: string; truncated?: boolean }> {
  const maxPages = opts?.maxPages ?? 20;
  const ids: string[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  while (pages < maxPages) {
    const params: Record<string, string> = {
      max_results: '1000',
      'user.fields': 'id',
    };
    if (pageToken) params.pagination_token = pageToken;

    const res = await xFetch(`/users/${userId}/followers`, params);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ids, error: (err as any)?.detail || `API ${res.status}` };
    }
    const data = await res.json() as any;
    const page = Array.isArray(data?.data) ? data.data : [];
    for (const u of page) {
      if (u?.id) ids.push(String(u.id));
    }
    pageToken = data?.meta?.next_token;
    pages += 1;
    if (!pageToken) return { ids };
  }

  // Hit the page cap — caller should widen maxPages or accept truncation
  return { ids, truncated: true };
}

// ─── Search ───

export async function searchRecentTweets(query: string, maxResults = 10, sinceId?: string): Promise<XSearchResult> {
  const params: Record<string, string> = {
    query,
    'tweet.fields': 'created_at,public_metrics,text,author_id,entities,attachments,referenced_tweets',
    'user.fields': 'public_metrics,username',
    'media.fields': 'type,url,media_key',
    expansions: 'author_id,attachments.media_keys',
    max_results: String(Math.min(Math.max(maxResults, 10), 100)),
  };
  if (sinceId) params.since_id = sinceId;

  const res = await xFetch('/tweets/search/recent', params);

  if (!res.ok) {
    return { tweets: [], users: [], media: [] };
  }

  const data = await res.json() as any;
  return {
    tweets: data?.data || [],
    users: data?.includes?.users || [],
    media: data?.includes?.media || [],
    nextToken: data?.meta?.next_token,
  };
}

// ─── Helpers ───

export function classifyContentType(tweet: XTweet, mediaIncludes: XMedia[] = []): ContentType {
  // Check for retweet first (referenced_tweets with type "retweeted")
  if (tweet.referenced_tweets?.some((r) => r.type === 'retweeted')) {
    return 'repost';
  }

  // Check for quote tweet
  if (tweet.referenced_tweets?.some((r) => r.type === 'quoted')) {
    return 'quote';
  }

  // Check for native media attachments
  const mediaKeys = tweet.attachments?.media_keys || [];
  if (mediaKeys.length > 0) {
    const tweetMedia = mediaIncludes.filter((m) => mediaKeys.includes(m.media_key));
    if (tweetMedia.some((m) => m.type === 'video' || m.type === 'animated_gif')) {
      return 'original_video';
    }
    if (tweetMedia.some((m) => m.type === 'photo')) {
      return 'original_image';
    }
  }

  // Check for external links (non-X URLs in entities)
  const urls = tweet.entities?.urls || [];
  const hasExternalLink = urls.some((u) => {
    const domain = u.display_url?.split('/')[0]?.toLowerCase() || '';
    return !domain.includes('x.com') && !domain.includes('twitter.com') && !domain.includes('t.co');
  });
  if (hasExternalLink) {
    return 'has_external_link';
  }

  return 'text_only';
}

export function extractMetrics(tweet: XTweet, mediaIncludes: XMedia[] = []) {
  const pm = tweet.public_metrics;
  return {
    impressions: Number(pm?.impression_count || 0),
    likes: Number(pm?.like_count || 0),
    retweets: Number(pm?.retweet_count || 0),
    quote_tweets: Number(pm?.quote_count || 0),
    replies: Number(pm?.reply_count || 0),
    bookmarks: Number(pm?.bookmark_count || 0),
    content_type: classifyContentType(tweet, mediaIncludes),
  };
}
