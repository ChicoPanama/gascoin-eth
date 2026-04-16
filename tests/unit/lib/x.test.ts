import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks (must precede all imports) ────────────────────────────────────────

vi.mock('@/lib/cache', () => ({
  cacheGetOrFetch: vi.fn(),
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(true),
  cacheSetIsMember: vi.fn().mockResolvedValue(false),
  cacheSetExists: vi.fn().mockResolvedValue(false),
  cacheSetReplace: vi.fn().mockResolvedValue(10),
}));

vi.mock('@/lib/x-api', () => ({
  getUserByUsername: vi.fn().mockResolvedValue({ user: { id: 'gc_user_id_123' }, error: null }),
  getUserFollowers: vi.fn().mockResolvedValue({ ids: ['uid1', 'uid2', 'uid3'], error: null }),
}));

import {
  verifyTweetProof,
  getFollowerCount,
  isFollowingGascoin,
  getGascoinXUserId,
  isGascoinFollowersCacheWarm,
  refreshGascoinFollowersCache,
  recordXApiFailure,
  isXApiSustainedFailure,
} from '@/lib/integrations/x';
import {
  cacheGetOrFetch,
  cacheGet,
  cacheSet,
  cacheSetIsMember,
  cacheSetExists,
  cacheSetReplace,
} from '@/lib/cache';
import { getUserByUsername, getUserFollowers } from '@/lib/x-api';

// ─── HTTP fetch mock ──────────────────────────────────────────────────────────

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => headers[k] ?? null },
    json: vi.fn().mockResolvedValue(body),
  });
}

// ─── verifyTweetProof ─────────────────────────────────────────────────────────

describe('verifyTweetProof — invalid URL', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok=false for a non-X URL', async () => {
    const result = await verifyTweetProof('https://example.com/post/123', '@alice');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('invalid_tweet_url');
  });

  it('accepts twitter.com URLs', async () => {
    mockFetch(404, {});
    process.env.X_BEARER_TOKEN = 'test-token';
    const result = await verifyTweetProof('https://twitter.com/alice/status/9999', '@alice');
    expect(result.reason).toBe('tweet_not_found');
  });
});

describe('verifyTweetProof — X API path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.X_BEARER_TOKEN = 'test-token';
    process.env.X_STRICT_MODE = 'true';
  });

  it('returns ok=true when tweet has #gascoin, mentions @GasCoinApp, and author matches', async () => {
    mockFetch(200, {
      data: { text: '#gascoin @GasCoinApp great fuel today' },
      includes: { users: [{ username: 'alice', verified_type: 'none' }] },
    });
    const result = await verifyTweetProof('https://x.com/alice/status/123456', '@alice');
    expect(result.ok).toBe(true);
    expect(result.containsGascoin).toBe(true);
    expect(result.mentionsGascoinApp).toBe(true);
  });

  it('returns ok=false when tweet is missing #gascoin', async () => {
    mockFetch(200, {
      data: { text: '@GasCoinApp filled up today' },
      includes: { users: [{ username: 'alice' }] },
    });
    const result = await verifyTweetProof('https://x.com/alice/status/123456', '@alice');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('missing_hashtag');
  });

  it('returns ok=false when tweet is missing @GasCoinApp mention', async () => {
    mockFetch(200, {
      data: { text: '#gascoin filled up today' },
      includes: { users: [{ username: 'alice' }] },
    });
    const result = await verifyTweetProof('https://x.com/alice/status/123456', '@alice');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('missing_gascoinapp_mention');
  });

  it('returns ok=false on author mismatch', async () => {
    mockFetch(200, {
      data: { text: '#gascoin @GasCoinApp filled up' },
      includes: { users: [{ username: 'bob' }] },
    });
    const result = await verifyTweetProof('https://x.com/alice/status/123456', '@alice');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('author_mismatch');
  });

  it('returns ok=false with tweet_not_found on 404', async () => {
    mockFetch(404, {});
    const result = await verifyTweetProof('https://x.com/alice/status/999', '@alice');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('tweet_not_found');
    expect(result.live).toBe(false);
  });

  it('returns ok=false with reason code on non-404 API error', async () => {
    mockFetch(403, {});
    const result = await verifyTweetProof('https://x.com/alice/status/999', '@alice');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('x_api_403');
  });

  it('accepts $gascoin cashtag as well as #gascoin hashtag', async () => {
    mockFetch(200, {
      data: { text: '$gascoin @GasCoinApp pump is real' },
      includes: { users: [{ username: 'alice' }] },
    });
    const result = await verifyTweetProof('https://x.com/alice/status/123456', '@alice');
    expect(result.containsGascoin).toBe(true);
  });

  it('does not match @GasCoinAppBot (word boundary guard)', async () => {
    mockFetch(200, {
      data: { text: '#gascoin @GasCoinAppBot posted' },
      includes: { users: [{ username: 'alice' }] },
    });
    const result = await verifyTweetProof('https://x.com/alice/status/123456', '@alice');
    expect(result.mentionsGascoinApp).toBe(false);
  });

  it('blocks in strict mode when no X_BEARER_TOKEN and no tweet ID', async () => {
    delete process.env.X_BEARER_TOKEN;
    process.env.X_STRICT_MODE = 'true';
    // URL with no /status/ — parseTweetId returns null
    const result = await verifyTweetProof('https://x.com/alice', '@alice');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('x_api_required_in_strict_mode');
  });
});

// ─── getFollowerCount — cache hit/miss ───────────────────────────────────────

describe('getFollowerCount', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns cached value on cache hit (cacheGetOrFetch calls fn)', async () => {
    vi.mocked(cacheGetOrFetch).mockResolvedValueOnce(500);
    const count = await getFollowerCount('@alice');
    expect(cacheGetOrFetch).toHaveBeenCalledWith(
      'xfollowers:alice',
      expect.any(Function),
      900,
    );
    expect(count).toBe(500);
  });

  it('returns -1 on cache miss when X_BEARER_TOKEN is missing', async () => {
    delete process.env.X_BEARER_TOKEN;
    vi.mocked(cacheGetOrFetch).mockImplementationOnce(async (_key, fn) => fn());
    const count = await getFollowerCount('@alice');
    expect(count).toBe(-1);
  });

  it('normalises handle (strips @ and lowercases) for cache key', async () => {
    vi.mocked(cacheGetOrFetch).mockResolvedValueOnce(100);
    await getFollowerCount('@Alice');
    expect(vi.mocked(cacheGetOrFetch).mock.calls[0][0]).toBe('xfollowers:alice');
  });
});

// ─── isFollowingGascoin — Redis paths ────────────────────────────────────────

describe('isFollowingGascoin — warm cache', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns ok=true when cache is warm and user is a member', async () => {
    vi.mocked(cacheSetExists).mockResolvedValueOnce(true);
    vi.mocked(cacheSetIsMember).mockResolvedValueOnce(true);
    const result = await isFollowingGascoin('uid1');
    expect(result.ok).toBe(true);
    expect(result.apiFailure).toBe(false);
  });

  it('returns ok=false when cache is warm and user is NOT a member', async () => {
    vi.mocked(cacheSetExists).mockResolvedValueOnce(true);
    vi.mocked(cacheSetIsMember).mockResolvedValueOnce(false);
    const result = await isFollowingGascoin('uid999');
    expect(result.ok).toBe(false);
    expect(result.apiFailure).toBe(false);
  });
});

describe('isFollowingGascoin — cold cache rebuild', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('rebuilds cache and returns ok=true when user is in refreshed set', async () => {
    vi.mocked(cacheSetExists).mockResolvedValueOnce(false);
    vi.mocked(cacheGet).mockResolvedValueOnce('gc_user_id_123'); // GASCOIN_X_ID_KEY cached
    vi.mocked(cacheSetReplace).mockResolvedValueOnce(3);
    vi.mocked(cacheSetIsMember).mockResolvedValueOnce(true);
    const result = await isFollowingGascoin('uid1');
    expect(result.ok).toBe(true);
    expect(result.apiFailure).toBe(false);
  });

  it('returns apiFailure=true when user lookup fails', async () => {
    vi.mocked(cacheSetExists).mockResolvedValueOnce(false);
    vi.mocked(cacheGet).mockResolvedValueOnce(null); // no cached ID
    vi.mocked(getUserByUsername).mockResolvedValueOnce({ user: null, error: 'not_found' } as any);
    const result = await isFollowingGascoin('uid1');
    expect(result.ok).toBe(false);
    expect(result.apiFailure).toBe(true);
  });

  it('returns apiFailure=true when follower fetch fails', async () => {
    vi.mocked(cacheSetExists).mockResolvedValueOnce(false);
    vi.mocked(cacheGet).mockResolvedValueOnce('gc_user_id_123');
    vi.mocked(getUserFollowers).mockResolvedValueOnce({ ids: [], error: 'rate_limited' } as any);
    const result = await isFollowingGascoin('uid1');
    expect(result.ok).toBe(false);
    expect(result.apiFailure).toBe(true);
  });

  it('returns apiFailure=true when Redis SET write fails', async () => {
    vi.mocked(cacheSetExists).mockResolvedValueOnce(false);
    vi.mocked(cacheGet).mockResolvedValueOnce('gc_user_id_123');
    vi.mocked(getUserFollowers).mockResolvedValueOnce({ ids: ['uid1'], error: null } as any);
    vi.mocked(cacheSetReplace).mockResolvedValueOnce(-1);
    const result = await isFollowingGascoin('uid1');
    expect(result.ok).toBe(false);
    expect(result.apiFailure).toBe(true);
  });

  it('returns ok=false without apiFailure for empty userId', async () => {
    const result = await isFollowingGascoin('');
    expect(result.ok).toBe(false);
    expect(result.apiFailure).toBe(false);
  });
});

// ─── recordXApiFailure / isXApiSustainedFailure ───────────────────────────────

describe('recordXApiFailure', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 1 on first failure (no prior count)', async () => {
    vi.mocked(cacheGet).mockResolvedValueOnce(null);
    const count = await recordXApiFailure();
    expect(count).toBe(1);
    expect(cacheSet).toHaveBeenCalledWith('x_api:fail_count', 1, 300);
  });

  it('increments existing count', async () => {
    vi.mocked(cacheGet).mockResolvedValueOnce(2);
    const count = await recordXApiFailure();
    expect(count).toBe(3);
    expect(cacheSet).toHaveBeenCalledWith('x_api:fail_count', 3, 300);
  });
});

describe('isXApiSustainedFailure', () => {
  it('returns false for count < 3', () => {
    expect(isXApiSustainedFailure(2)).toBe(false);
  });

  it('returns true at threshold (3)', () => {
    expect(isXApiSustainedFailure(3)).toBe(true);
  });

  it('returns true above threshold', () => {
    expect(isXApiSustainedFailure(10)).toBe(true);
  });
});

// ─── isGascoinFollowersCacheWarm / getGascoinXUserId ─────────────────────────

describe('isGascoinFollowersCacheWarm', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns true when Redis SET exists', async () => {
    vi.mocked(cacheSetExists).mockResolvedValueOnce(true);
    expect(await isGascoinFollowersCacheWarm()).toBe(true);
  });

  it('returns false when Redis SET does not exist', async () => {
    vi.mocked(cacheSetExists).mockResolvedValueOnce(false);
    expect(await isGascoinFollowersCacheWarm()).toBe(false);
  });
});

describe('getGascoinXUserId', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns cached ID when available', async () => {
    vi.mocked(cacheGet).mockResolvedValueOnce('cached_id_999');
    const id = await getGascoinXUserId();
    expect(id).toBe('cached_id_999');
    expect(getUserByUsername).not.toHaveBeenCalled();
  });

  it('fetches and caches ID when not cached', async () => {
    vi.mocked(cacheGet).mockResolvedValueOnce(null);
    const id = await getGascoinXUserId();
    expect(id).toBe('gc_user_id_123');
    expect(cacheSet).toHaveBeenCalled();
  });

  it('returns null when user lookup fails', async () => {
    vi.mocked(cacheGet).mockResolvedValueOnce(null);
    vi.mocked(getUserByUsername).mockResolvedValueOnce({ user: null, error: 'not_found' } as any);
    const id = await getGascoinXUserId();
    expect(id).toBeNull();
  });
});

// ─── refreshGascoinFollowersCache ────────────────────────────────────────────

describe('refreshGascoinFollowersCache', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns count on success', async () => {
    vi.mocked(cacheGet).mockResolvedValueOnce('gc_id_1');
    vi.mocked(cacheSetReplace).mockResolvedValueOnce(42);
    const result = await refreshGascoinFollowersCache();
    expect(result.count).toBe(42);
    expect(result.error).toBeUndefined();
  });

  it('returns error when GasCoin user ID lookup fails', async () => {
    vi.mocked(cacheGet).mockResolvedValueOnce(null);
    vi.mocked(getUserByUsername).mockResolvedValueOnce({ user: null, error: 'lookup_failed' } as any);
    const result = await refreshGascoinFollowersCache();
    expect(result.count).toBe(-1);
    expect(result.error).toBe('gascoin_user_lookup_failed');
  });

  it('returns error when follower fetch fails', async () => {
    vi.mocked(cacheGet).mockResolvedValueOnce('gc_id_1');
    vi.mocked(getUserFollowers).mockResolvedValueOnce({ ids: [], error: 'x_api_error' } as any);
    const result = await refreshGascoinFollowersCache();
    expect(result.count).toBe(-1);
    expect(result.error).toBe('x_api_error');
  });
});
