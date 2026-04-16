// vi.mock calls MUST come before imports
let mockLinks: any[] = [];
let mockClaims: any[] = [];

// A chainable no-op builder that resolves to { data: [], error: null }
function chainable(data: any[] = []): any {
  const p = Promise.resolve({ data, error: null });
  const self: any = {
    eq: () => self,
    neq: () => self,
    in: () => self,
    gt: () => self,
    gte: () => self,
    lt: () => self,
    not: () => self,
    order: () => self,
    limit: () => Promise.resolve({ data, error: null }),
    select: () => self,
    then: p.then.bind(p),
    catch: p.catch.bind(p),
  };
  return self;
}

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      const getData = () => {
        if (table === 'wallet_x_links') return mockLinks;
        if (table === 'claims') return mockClaims;
        return [];
      };
      return {
        select: () => chainable(getData()),
        update: () => chainable(),
        insert: () => Promise.resolve({ data: null, error: null }),
        upsert: () => Promise.resolve({ data: null, error: null }),
      };
    },
  }),
}));

vi.mock('@/lib/x-api', () => ({
  searchRecentTweets: vi.fn().mockResolvedValue({ tweets: [], users: [], media: [], meta: {} }),
  extractMetrics: vi.fn().mockReturnValue({ likes: 0, retweets: 0, replies: 0, bookmarks: 0, impressions: 0 }),
  getUserByUsername: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/engagement-rewards', () => ({
  calculateEngagementPoints: vi.fn().mockReturnValue(0),
}));

vi.mock('@/lib/ai-points-engine', () => ({
  scoreTweetQuality: vi.fn().mockResolvedValue({ score: 0.5, flags: [], isSpam: false, isBotEngagement: false }),
  calculateWalletTrust: vi.fn().mockReturnValue({ trustScore: 0.8, tier: 'standard' }),
  awardVerifiedPoints: vi.fn().mockResolvedValue({ ok: true, points: 0 }),
}));

vi.mock('@/lib/data-intelligence', () => ({
  updateQualityTrend: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/mem0', () => ({
  addMemory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/cron-auth', () => ({
  isAuthorizedCron: (req: Request) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    return req.headers.get('authorization') === `Bearer ${secret}`;
  },
}));

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/workers/score-engagement/route';
import { searchRecentTweets } from '@/lib/x-api';

function makeReq(authorized = true) {
  return new Request('http://localhost', {
    method: 'POST',
    headers: authorized ? { authorization: 'Bearer test-secret' } : {},
  });
}

describe('score-engagement worker', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret';
    process.env.X_BEARER_TOKEN = 'mock-bearer';
    mockLinks = [];
    mockClaims = [];
    vi.clearAllMocks();
    (searchRecentTweets as any).mockResolvedValue({ tweets: [], users: [], media: [], meta: {} });
  });

  it('returns 401 when unauthorized', async () => {
    const res = await POST(makeReq(false));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('returns ok with 0 scored when no wallet_x_links exist', async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.scored).toBe(0);
  });

  it('processes an active link and reports handlesScanned >= 1', async () => {
    mockLinks = [{ wallet: 'wallet1', x_handle: 'testuser', x_user_id: 'u1', last_tweet_scan: null }];
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.handlesScanned).toBeGreaterThanOrEqual(1);
  });

  it('continues processing remaining wallets when X API errors for one', async () => {
    mockLinks = [
      { wallet: 'wallet1', x_handle: 'user1', x_user_id: 'u1', last_tweet_scan: null },
      { wallet: 'wallet2', x_handle: 'user2', x_user_id: 'u2', last_tweet_scan: null },
    ];
    (searchRecentTweets as any)
      .mockRejectedValueOnce(new Error('X API error'))
      .mockResolvedValueOnce({ tweets: [], users: [], media: [], meta: {} });

    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.handlesScanned).toBe(2);
  });
});
