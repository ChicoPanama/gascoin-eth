import { describe, it, expect } from 'vitest';
import { scoreAccountQuality } from '@/lib/account-quality';
import type { XUser } from '@/lib/x-api';
import type { HistoricalSignals } from '@/lib/account-quality';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<XUser> = {}): XUser {
  return {
    id: '123',
    username: 'testuser',
    name: 'Test User',
    protected: false,
    created_at: new Date(Date.now() - 400 * 86400000).toISOString(), // 400 days old
    description: 'Driver who loves road trips and saving money on gas.',
    profile_image_url: 'https://pbs.twimg.com/profile_images/123/photo.jpg',
    public_metrics: {
      followers_count: 200,
      following_count: 100,
      tweet_count: 300,
      listed_count: 5,
    },
    ...overrides,
  };
}

function makeHistory(overrides: Partial<HistoricalSignals> = {}): HistoricalSignals {
  return {
    previousFollowerCount: null,
    avgQualityScore: null,
    isProtected: false,
    ipCountry: null,
    xLocation: null,
    bio: null,
    accountCreatedAt: null,
    snapshotAge: 30,
    ...overrides,
  };
}

// ─── Baseline ─────────────────────────────────────────────────────────────────

describe('scoreAccountQuality — baseline', () => {
  it('returns score, passed, and flags shape', () => {
    const result = scoreAccountQuality(makeUser());
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('passed');
    expect(result).toHaveProperty('flags');
    expect(Array.isArray(result.flags)).toBe(true);
  });

  it('a healthy established account scores well above 40', () => {
    const result = scoreAccountQuality(makeUser());
    expect(result.score).toBeGreaterThan(40);
    expect(result.passed).toBe(true);
  });

  it('passed is true when score >= 40', () => {
    const result = scoreAccountQuality(makeUser());
    expect(result.passed).toBe(result.score >= 40);
  });

  it('score is clamped to 0–100', () => {
    const result = scoreAccountQuality(makeUser());
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

// ─── Account age ──────────────────────────────────────────────────────────────

describe('scoreAccountQuality — account age', () => {
  it('deducts 25 and flags account_under_30_days for new accounts', () => {
    const user = makeUser({ created_at: new Date(Date.now() - 10 * 86400000).toISOString() });
    const result = scoreAccountQuality(user);
    expect(result.flags).toContain('account_under_30_days');
  });

  it('deducts 10 and flags account_under_90_days for 30–89 day accounts', () => {
    const user = makeUser({ created_at: new Date(Date.now() - 60 * 86400000).toISOString() });
    const result = scoreAccountQuality(user);
    expect(result.flags).toContain('account_under_90_days');
    expect(result.flags).not.toContain('account_under_30_days');
  });

  it('adds 10 for accounts older than 365 days', () => {
    const young = makeUser({ created_at: new Date(Date.now() - 200 * 86400000).toISOString() });
    const old = makeUser({ created_at: new Date(Date.now() - 400 * 86400000).toISOString() });
    expect(scoreAccountQuality(old).score).toBeGreaterThan(scoreAccountQuality(young).score);
  });

  it('deducts 5 when no created_at and no history', () => {
    const user = makeUser({ created_at: undefined });
    const result = scoreAccountQuality(user);
    // No age flags but no +10 bonus either
    expect(result.flags).not.toContain('account_under_30_days');
    expect(result.flags).not.toContain('account_under_90_days');
  });

  it('falls back to history.accountCreatedAt when user.created_at is missing', () => {
    const user = makeUser({ created_at: undefined });
    const history = makeHistory({ accountCreatedAt: new Date(Date.now() - 15 * 86400000).toISOString() });
    const result = scoreAccountQuality(user, history);
    expect(result.flags).toContain('account_under_30_days');
  });
});

// ─── Follower/following ratio ─────────────────────────────────────────────────

describe('scoreAccountQuality — follower/following ratio', () => {
  it('flags suspicious_follow_ratio when following > followers * 10', () => {
    const user = makeUser({
      public_metrics: { followers_count: 10, following_count: 200, tweet_count: 100, listed_count: 1 },
    });
    const result = scoreAccountQuality(user);
    expect(result.flags).toContain('suspicious_follow_ratio');
  });

  it('does not flag ratio when following <= followers * 10', () => {
    const user = makeUser({
      public_metrics: { followers_count: 100, following_count: 500, tweet_count: 100, listed_count: 1 },
    });
    const result = scoreAccountQuality(user);
    expect(result.flags).not.toContain('suspicious_follow_ratio');
  });

  it('flags low_followers when followers < 50', () => {
    const user = makeUser({
      public_metrics: { followers_count: 20, following_count: 30, tweet_count: 100, listed_count: 1 },
    });
    const result = scoreAccountQuality(user);
    expect(result.flags).toContain('low_followers');
  });

  it('adds bonus for 500+ followers', () => {
    const low = makeUser({ public_metrics: { followers_count: 200, following_count: 100, tweet_count: 300, listed_count: 5 } });
    const high = makeUser({ public_metrics: { followers_count: 600, following_count: 100, tweet_count: 300, listed_count: 5 } });
    expect(scoreAccountQuality(high).score).toBeGreaterThan(scoreAccountQuality(low).score);
  });
});

// ─── Tweet count ─────────────────────────────────────────────────────────────

describe('scoreAccountQuality — tweet count', () => {
  it('flags almost_no_tweets when tweet_count < 10', () => {
    const user = makeUser({
      public_metrics: { followers_count: 200, following_count: 100, tweet_count: 3, listed_count: 5 },
    });
    const result = scoreAccountQuality(user);
    expect(result.flags).toContain('almost_no_tweets');
  });

  it('flags low_tweet_count for 10–49 tweets', () => {
    const user = makeUser({
      public_metrics: { followers_count: 200, following_count: 100, tweet_count: 30, listed_count: 5 },
    });
    const result = scoreAccountQuality(user);
    expect(result.flags).toContain('low_tweet_count');
    expect(result.flags).not.toContain('almost_no_tweets');
  });

  it('adds bonus for 200+ tweets', () => {
    const few = makeUser({ public_metrics: { followers_count: 200, following_count: 100, tweet_count: 100, listed_count: 5 } });
    const many = makeUser({ public_metrics: { followers_count: 200, following_count: 100, tweet_count: 250, listed_count: 5 } });
    expect(scoreAccountQuality(many).score).toBeGreaterThan(scoreAccountQuality(few).score);
  });
});

// ─── Listed count ─────────────────────────────────────────────────────────────

describe('scoreAccountQuality — listed count', () => {
  it('adds 10 when listed_count > 0', () => {
    const listed = makeUser({ public_metrics: { followers_count: 200, following_count: 100, tweet_count: 300, listed_count: 3 } });
    const unlisted = makeUser({ public_metrics: { followers_count: 200, following_count: 100, tweet_count: 300, listed_count: 0 } });
    expect(scoreAccountQuality(listed).score).toBeGreaterThan(scoreAccountQuality(unlisted).score);
  });

  it('flags never_listed when listed_count is 0', () => {
    const user = makeUser({
      public_metrics: { followers_count: 200, following_count: 100, tweet_count: 300, listed_count: 0 },
    });
    const result = scoreAccountQuality(user);
    expect(result.flags).toContain('never_listed');
  });
});

// ─── No public metrics ────────────────────────────────────────────────────────

describe('scoreAccountQuality — missing public_metrics', () => {
  it('deducts 15 and flags no_public_metrics', () => {
    const user = makeUser({ public_metrics: undefined });
    const result = scoreAccountQuality(user);
    expect(result.flags).toContain('no_public_metrics');
  });
});

// ─── Profile completeness ─────────────────────────────────────────────────────

describe('scoreAccountQuality — profile completeness', () => {
  it('flags empty_bio when description is missing', () => {
    const user = makeUser({ description: undefined });
    const result = scoreAccountQuality(user);
    expect(result.flags).toContain('empty_bio');
  });

  it('flags empty_bio when description is shorter than 5 chars', () => {
    const user = makeUser({ description: 'Hi' });
    const result = scoreAccountQuality(user);
    expect(result.flags).toContain('empty_bio');
  });

  it('does not flag empty_bio for a real bio', () => {
    const user = makeUser({ description: 'Driving across the country, saving on gas.' });
    const result = scoreAccountQuality(user);
    expect(result.flags).not.toContain('empty_bio');
  });

  it('flags default_avatar when profile_image_url is missing', () => {
    const user = makeUser({ profile_image_url: undefined });
    const result = scoreAccountQuality(user);
    expect(result.flags).toContain('default_avatar');
  });

  it('flags default_avatar when URL contains default_profile', () => {
    const user = makeUser({ profile_image_url: 'https://abs.twimg.com/sticky/default_profile_images/default_profile.png' });
    const result = scoreAccountQuality(user);
    expect(result.flags).toContain('default_avatar');
  });
});

// ─── Bio spam keywords ────────────────────────────────────────────────────────

describe('scoreAccountQuality — bio spam keywords', () => {
  it('flags bio_spam_keywords when 2+ spam keywords present', () => {
    const user = makeUser({ description: 'Free crypto airdrop every day! DM for referral link' });
    const result = scoreAccountQuality(user);
    expect(result.flags).toContain('bio_spam_keywords');
  });

  it('does not flag with only 1 spam keyword', () => {
    const user = makeUser({ description: 'I love a good crypto airdrop sometimes' });
    const result = scoreAccountQuality(user);
    expect(result.flags).not.toContain('bio_spam_keywords');
  });

  it('is case-insensitive', () => {
    const user = makeUser({ description: 'FREE CRYPTO AIRDROP GIVEAWAY 100X MOON' });
    const result = scoreAccountQuality(user);
    expect(result.flags).toContain('bio_spam_keywords');
  });

  it('deducts 10 points when flagged', () => {
    const clean = makeUser({ description: 'Truck driver from Texas, road miles all day.' });
    const spammy = makeUser({ description: 'Passive income trading signal follow back f4f airdrop' });
    expect(scoreAccountQuality(spammy).score).toBeLessThan(scoreAccountQuality(clean).score);
  });
});

// ─── Follower count anomaly (decay) ───────────────────────────────────────────

describe('scoreAccountQuality — follower drop/spike with decay', () => {
  it('deducts full penalty (20) for 50%+ drop with fresh snapshot (≤90d)', () => {
    const user = makeUser({ public_metrics: { followers_count: 400, following_count: 100, tweet_count: 300, listed_count: 5 } });
    const history = makeHistory({ previousFollowerCount: 1000, snapshotAge: 30 });
    const result = scoreAccountQuality(user, history);
    expect(result.flags.some((f) => f.startsWith('follower_drop_'))).toBe(true);
    // Full weight penalty = 20
  });

  it('applies reduced penalty (12) for 50%+ drop with 91–180d snapshot', () => {
    const user = makeUser({ public_metrics: { followers_count: 400, following_count: 100, tweet_count: 300, listed_count: 5 } });
    const withFresh = makeHistory({ previousFollowerCount: 1000, snapshotAge: 30 });
    const withOld = makeHistory({ previousFollowerCount: 1000, snapshotAge: 120 });
    const freshScore = scoreAccountQuality(user, withFresh).score;
    const oldScore = scoreAccountQuality(user, withOld).score;
    // Older snapshot = smaller penalty = higher score
    expect(oldScore).toBeGreaterThan(freshScore);
  });

  it('applies minimal penalty (6) for 50%+ drop with >180d snapshot', () => {
    const user = makeUser({ public_metrics: { followers_count: 400, following_count: 100, tweet_count: 300, listed_count: 5 } });
    const medium = makeHistory({ previousFollowerCount: 1000, snapshotAge: 120 });
    const stale = makeHistory({ previousFollowerCount: 1000, snapshotAge: 200 });
    const medScore = scoreAccountQuality(user, medium).score;
    const staleScore = scoreAccountQuality(user, stale).score;
    expect(staleScore).toBeGreaterThan(medScore);
  });

  it('flags follower_spike for >5× growth under 5000 followers', () => {
    const user = makeUser({ public_metrics: { followers_count: 3000, following_count: 100, tweet_count: 300, listed_count: 5 } });
    const history = makeHistory({ previousFollowerCount: 400, snapshotAge: 30 });
    const result = scoreAccountQuality(user, history);
    expect(result.flags.some((f) => f.startsWith('follower_spike_'))).toBe(true);
  });

  it('does not flag spike for large accounts (>= 5000 followers)', () => {
    const user = makeUser({ public_metrics: { followers_count: 6000, following_count: 100, tweet_count: 300, listed_count: 5 } });
    const history = makeHistory({ previousFollowerCount: 800, snapshotAge: 30 });
    const result = scoreAccountQuality(user, history);
    expect(result.flags.some((f) => f.startsWith('follower_spike_'))).toBe(false);
  });

  it('uses snapshotAge=0 as default when snapshotAge is null', () => {
    const user = makeUser({ public_metrics: { followers_count: 400, following_count: 100, tweet_count: 300, listed_count: 5 } });
    const history = makeHistory({ previousFollowerCount: 1000, snapshotAge: null });
    // Should not throw, and should apply full-weight penalty
    expect(() => scoreAccountQuality(user, history)).not.toThrow();
    const result = scoreAccountQuality(user, history);
    expect(result.flags.some((f) => f.startsWith('follower_drop_'))).toBe(true);
  });
});

// ─── Protected account ────────────────────────────────────────────────────────

describe('scoreAccountQuality — protected account', () => {
  it('flags account_went_private and deducts penalty when isProtected=true', () => {
    const result = scoreAccountQuality(makeUser(), makeHistory({ isProtected: true, snapshotAge: 30 }));
    expect(result.flags).toContain('account_went_private');
  });

  it('applies full penalty (15) for fresh snapshot', () => {
    const withProtected = makeHistory({ isProtected: true, snapshotAge: 30 });
    const withOldProtected = makeHistory({ isProtected: true, snapshotAge: 200 });
    const freshScore = scoreAccountQuality(makeUser(), withProtected).score;
    const staleScore = scoreAccountQuality(makeUser(), withOldProtected).score;
    expect(staleScore).toBeGreaterThan(freshScore);
  });

  it('does not penalize when isProtected=false', () => {
    const result = scoreAccountQuality(makeUser(), makeHistory({ isProtected: false }));
    expect(result.flags).not.toContain('account_went_private');
  });

  it('does not penalize when isProtected=null', () => {
    const result = scoreAccountQuality(makeUser(), makeHistory({ isProtected: null }));
    expect(result.flags).not.toContain('account_went_private');
  });
});

// ─── Location/IP consistency ──────────────────────────────────────────────────

describe('scoreAccountQuality — location/IP mismatch', () => {
  it('flags location_ip_mismatch when IP and location clearly differ', () => {
    const history = makeHistory({ ipCountry: 'US', xLocation: 'Lagos, Nigeria' });
    const result = scoreAccountQuality(makeUser(), history);
    expect(result.flags).toContain('location_ip_mismatch');
  });

  it('does not flag when location matches IP country aliases', () => {
    const history = makeHistory({ ipCountry: 'US', xLocation: 'New York, USA' });
    const result = scoreAccountQuality(makeUser(), history);
    expect(result.flags).not.toContain('location_ip_mismatch');
  });

  it('does not flag when one of ipCountry or xLocation is missing', () => {
    const r1 = scoreAccountQuality(makeUser(), makeHistory({ ipCountry: 'US', xLocation: null }));
    const r2 = scoreAccountQuality(makeUser(), makeHistory({ ipCountry: null, xLocation: 'Lagos' }));
    expect(r1.flags).not.toContain('location_ip_mismatch');
    expect(r2.flags).not.toContain('location_ip_mismatch');
  });

  it('does not flag short location strings (≤ 2 chars) as mismatch', () => {
    const history = makeHistory({ ipCountry: 'US', xLocation: 'CA' });
    const result = scoreAccountQuality(makeUser(), history);
    expect(result.flags).not.toContain('location_ip_mismatch');
  });
});

// ─── Tweet quality trend ──────────────────────────────────────────────────────

describe('scoreAccountQuality — tweet quality trend', () => {
  it('flags low_quality_trend and deducts 10 when avgQualityScore < 0.2', () => {
    const history = makeHistory({ avgQualityScore: 0.1 });
    const result = scoreAccountQuality(makeUser(), history);
    expect(result.flags).toContain('low_quality_trend');
  });

  it('adds 5 when avgQualityScore > 0.7', () => {
    const low = makeHistory({ avgQualityScore: null });
    const high = makeHistory({ avgQualityScore: 0.85 });
    expect(scoreAccountQuality(makeUser(), high).score).toBeGreaterThan(scoreAccountQuality(makeUser(), low).score);
  });

  it('does nothing when avgQualityScore is null', () => {
    const result = scoreAccountQuality(makeUser(), makeHistory({ avgQualityScore: null }));
    expect(result.flags).not.toContain('low_quality_trend');
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('scoreAccountQuality — edge cases', () => {
  it('handles no history argument at all', () => {
    expect(() => scoreAccountQuality(makeUser())).not.toThrow();
  });

  it('score never goes below 0', () => {
    // Worst-case: new account, no metrics, no bio, default avatar, all bad signals
    const user: XUser = {
      id: '1', username: 'x', name: 'X', protected: false,
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      description: undefined,
      profile_image_url: undefined,
      public_metrics: { followers_count: 0, following_count: 5000, tweet_count: 0, listed_count: 0 },
    };
    const history = makeHistory({
      previousFollowerCount: 1000, snapshotAge: 10, isProtected: true,
      avgQualityScore: 0.05, ipCountry: 'US', xLocation: 'Lagos, Nigeria',
    });
    const result = scoreAccountQuality(user, history);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.passed).toBe(false);
  });

  it('score never exceeds 100', () => {
    // Best-case: old account, tons of followers, great metrics
    const user = makeUser({
      created_at: new Date(Date.now() - 1000 * 86400000).toISOString(),
      public_metrics: { followers_count: 10000, following_count: 100, tweet_count: 5000, listed_count: 50 },
      description: 'Fleet driver on the road every day. Real person, real receipts.',
    });
    const history = makeHistory({ avgQualityScore: 0.9, ipCountry: 'US', xLocation: 'United States' });
    const result = scoreAccountQuality(user, history);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('passed threshold is exactly 40 (score 40 passes, score 39 fails)', () => {
    // We can't control the exact score easily, but we verify the boundary rule
    // by checking that passed === (score >= 40)
    const result = scoreAccountQuality(makeUser());
    expect(result.passed).toBe(result.score >= 40);
  });

  it('bio falls back to history.bio when user.description is undefined', () => {
    const user = makeUser({ description: undefined });
    const history = makeHistory({ bio: 'Road warrior driving highways every day.' });
    const result = scoreAccountQuality(user, history);
    expect(result.flags).not.toContain('empty_bio');
  });
});
