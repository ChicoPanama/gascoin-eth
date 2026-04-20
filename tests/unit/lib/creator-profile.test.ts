import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabase } from '../../mocks/supabase';

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => createMockSupabase(mockStore),
}));

const mockStore = createMockSupabase().store;

import {
  getCreatorProfile,
  getCreatorPosts,
  getCreatorImpact,
  truncateWallet,
} from '@/lib/creator-profile';

beforeEach(() => {
  mockStore.clear();
});

describe('getCreatorProfile', () => {
  it('returns null for an unknown handle', async () => {
    const p = await getCreatorProfile('nonexistent');
    expect(p).toBeNull();
  });

  it('returns a profile for a known handle', async () => {
    mockStore.seed('wallet_x_links', [
      {
        wallet: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        x_handle: 'alice',
        x_user_id: '123',
        profile_image_url: 'https://pbs.twimg.com/avatar.jpg',
        avg_quality_score: 82,
        bio: 'gas receipts and coffee',
        x_location: 'Austin, TX',
        linked_at: '2026-03-01T00:00:00Z',
        is_active: true,
      },
    ]);
    mockStore.seed('creator_profiles', [
      {
        handle: 'alice',
        wallet: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        is_verified: true,
        creator_tier: 'Commuter',
        first_seen_at: '2026-03-01T00:00:00Z',
      },
    ]);

    const p = await getCreatorProfile('alice');
    expect(p).not.toBeNull();
    expect(p?.handle).toBe('alice');
    expect(p?.wallet).toBe('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
    expect(p?.isVerified).toBe(true);
    expect(p?.tier).toBe('Commuter');
    expect(p?.walletShort).toBe('0x74...f44e');
  });

  it('handle lookup is case-insensitive', async () => {
    mockStore.seed('wallet_x_links', [
      {
        wallet: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        x_handle: 'Alice',
        is_active: true,
      },
    ]);
    mockStore.seed('creator_profiles', [
      { handle: 'alice', wallet: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' },
    ]);
    const p = await getCreatorProfile('ALICE');
    expect(p?.handle).toBe('alice');
  });
});

describe('getCreatorPosts', () => {
  it('returns empty array for unknown handle', async () => {
    const posts = await getCreatorPosts('nobody', 10);
    expect(posts).toEqual([]);
  });

  it('returns scored tweets for known wallet, ordered by posted_at desc', async () => {
    mockStore.seed('wallet_x_links', [
      { wallet: '0xABC', x_handle: 'bob', is_active: true },
    ]);
    mockStore.seed('scored_tweets', [
      { wallet: '0xABC', tweet_id: 't1', tweet_url: 'https://x.com/bob/status/t1', impressions: 5000, likes: 50, retweets: 10, replies: 3, quote_tweets: 1, adjusted_points: 120, quality_score: 0.8, posted_at: '2026-04-10T00:00:00Z' },
      { wallet: '0xABC', tweet_id: 't2', tweet_url: 'https://x.com/bob/status/t2', impressions: 1000, likes: 20, retweets: 5, replies: 1, quote_tweets: 0, adjusted_points: 40, quality_score: 0.5, posted_at: '2026-04-15T00:00:00Z' },
    ]);

    const posts = await getCreatorPosts('bob', 10);
    expect(posts).toHaveLength(2);
    expect(posts[0].tweetId).toBe('t2'); // newer first
    expect(posts[1].tweetId).toBe('t1');
    expect(posts[0].impressions).toBe(1000);
  });

  it('respects limit', async () => {
    mockStore.seed('wallet_x_links', [
      { wallet: '0xABC', x_handle: 'carol', is_active: true },
    ]);
    mockStore.seed('scored_tweets', Array.from({ length: 20 }, (_, i) => ({
      wallet: '0xABC',
      tweet_id: `t${i}`,
      tweet_url: `https://x.com/carol/status/t${i}`,
      impressions: 100 * i,
      likes: i,
      retweets: 0, replies: 0, quote_tweets: 0,
      adjusted_points: 10 * i,
      quality_score: 0.5,
      posted_at: new Date(Date.now() - i * 86400000).toISOString(),
    })));
    const posts = await getCreatorPosts('carol', 5);
    expect(posts).toHaveLength(5);
  });
});

describe('getCreatorImpact', () => {
  it('zero for unknown handle', async () => {
    const impact = await getCreatorImpact('ghost');
    expect(impact.totalEthEarned).toBe(0);
    expect(impact.totalPosts).toBe(0);
    expect(impact.totalImpressions).toBe(0);
  });

  it('aggregates across scored_tweets + payouts', async () => {
    mockStore.seed('wallet_x_links', [
      { wallet: '0xDEF', x_handle: 'dana', is_active: true },
    ]);
    mockStore.seed('scored_tweets', [
      { wallet: '0xDEF', tweet_id: 't1', impressions: 5000, adjusted_points: 100 },
      { wallet: '0xDEF', tweet_id: 't2', impressions: 10000, adjusted_points: 200 },
    ]);
    mockStore.seed('payouts', [
      { wallet: '0xDEF', amount_eth: 0.01, status: 'paid' },
      { wallet: '0xDEF', amount_eth: 0.02, status: 'paid' },
      { wallet: '0xDEF', amount_eth: 0.05, status: 'queued' }, // should NOT count
    ]);

    const impact = await getCreatorImpact('dana');
    expect(impact.totalPosts).toBe(2);
    expect(impact.totalImpressions).toBe(15000);
    expect(impact.totalEthEarned).toBeCloseTo(0.03);
  });
});

describe('truncateWallet', () => {
  it('returns 0x + 2 prefix + ... + last 4', () => {
    expect(truncateWallet('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe('0x74...f44e');
  });
  it('handles short input gracefully', () => {
    expect(truncateWallet('0xABC')).toBe('0xABC');
  });
  it('handles empty input', () => {
    expect(truncateWallet('')).toBe('');
  });
});
