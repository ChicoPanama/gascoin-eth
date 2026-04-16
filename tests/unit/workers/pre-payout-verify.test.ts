import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabase } from '@/tests/mocks/supabase';

// ── Mocks (must precede handler import) ──────────────────────────────────────

const mockStore = createMockSupabase().store;

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => createMockSupabase(mockStore),
}));

vi.mock('@/lib/integrations/x', () => ({
  verifyTweetProof: vi.fn().mockResolvedValue({ ok: true }),
  getFollowerCount: vi.fn().mockResolvedValue(500),
}));

vi.mock('@/lib/x-api', () => ({
  getUserByUsername: vi.fn().mockResolvedValue({
    user: { id: '123', verified_type: 'blue', username: 'testuser' },
    error: null,
  }),
}));

vi.mock('@/lib/account-quality', () => ({
  scoreAccountQuality: vi.fn().mockReturnValue({ score: 0.85, passed: true, flags: [] }),
}));

vi.mock('@/lib/metrics-snapshot', () => ({
  persistMetricsSnapshot: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/integrations/solana', () => ({
  hasMinimumGascoin: vi.fn().mockResolvedValue({ ok: true, tokenBalance: 1 }),
}));

vi.mock('@/lib/token-tiers', () => ({
  getTierForBalance: vi.fn().mockReturnValue({
    id: 'standard',
    slug: 'standard',
    max_sol_refund: 0.01,
  }),
}));

vi.mock('@/lib/mem0', () => ({
  addMemory: vi.fn().mockResolvedValue(undefined),
}));

// ── Import handler after mocks ────────────────────────────────────────────────

import { GET } from '@/app/api/workers/pre-payout-verify/route';
import { verifyTweetProof, getFollowerCount } from '@/lib/integrations/x';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(authorized = true) {
  return new Request('http://localhost', {
    method: 'GET',
    headers: {
      ...(authorized ? { authorization: 'Bearer test-secret' } : {}),
    },
  });
}

// Seed helpers
function makeClaim(overrides: Record<string, any> = {}) {
  return {
    id: `claim-${Math.random().toString(36).slice(2, 8)}`,
    status: 'approved',
    tweet_url: 'https://x.com/testuser/status/999',
    user_id: 'user-1',
    wallet: 'walletA',
    decision_reason: 'auto_approved_tier_standard',
    users: { x_handle: 'testuser' },
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/workers/pre-payout-verify', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret';
    mockStore.clear();
    vi.clearAllMocks();
    vi.mocked(verifyTweetProof).mockResolvedValue({ ok: true });
    vi.mocked(getFollowerCount).mockResolvedValue(500);
  });

  it('returns 401 when no auth header', async () => {
    const res = await GET(makeReq(false));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('unauthorized');
  });

  it('happy path: 3 approved claims all pass, response shows verified:3 reverted:0', async () => {
    mockStore.seed('claims', [
      makeClaim({ id: 'c1', wallet: 'w1' }),
      makeClaim({ id: 'c2', wallet: 'w2' }),
      makeClaim({ id: 'c3', wallet: 'w3' }),
    ]);

    const res = await GET(makeReq());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.verified).toBe(3);
    expect(json.reverted).toBe(0);
    expect(json.failures).toHaveLength(0);
  });

  it('tweet fails (tweet_deleted) → claim reverted to needs_review, claim_status_events has event, reverted:1', async () => {
    vi.mocked(verifyTweetProof).mockResolvedValueOnce({ ok: false, reason: 'tweet_deleted' });

    const claim = makeClaim({ id: 'c-del', wallet: 'wDelete' });
    mockStore.seed('claims', [claim]);

    const res = await GET(makeReq());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.reverted).toBe(1);
    expect(json.verified).toBe(0);
    expect(json.failures[0].claimId).toBe('c-del');
    expect(json.failures[0].reason).toContain('tweet_deleted');

    // Claim status updated to needs_review
    const claims = mockStore.getTable('claims');
    const updated = claims.find((c) => c.id === 'c-del');
    expect(updated?.status).toBe('needs_review');

    // Status event inserted
    const events = mockStore.getTable('claim_status_events');
    const evt = events.find((e) => e.claim_id === 'c-del');
    expect(evt).toBeDefined();
    expect(evt?.to_status).toBe('needs_review');
    expect(evt?.from_status).toBe('approved');
    expect(evt?.actor_id).toBe('pre_payout_verify');
  });

  it('follower count drops below 100 → claim reverted', async () => {
    vi.mocked(getFollowerCount).mockResolvedValueOnce(45);

    const claim = makeClaim({ id: 'c-lowfol', wallet: 'wLowFol' });
    mockStore.seed('claims', [claim]);

    const res = await GET(makeReq());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.reverted).toBe(1);
    expect(json.failures[0].reason).toContain('followers');

    const claims = mockStore.getTable('claims');
    expect(claims.find((c) => c.id === 'c-lowfol')?.status).toBe('needs_review');
  });

  it('admin-approved claims (decision_reason starts with admin_) are skipped, counted as verified', async () => {
    mockStore.seed('claims', [
      makeClaim({ id: 'c-admin', decision_reason: 'admin_dispatched_manual' }),
    ]);

    const res = await GET(makeReq());
    expect(res.status).toBe(200);

    const json = await res.json();
    // Admin claim skips all checks → counted as verified, no revert
    expect(json.verified).toBe(1);
    expect(json.reverted).toBe(0);

    // verifyTweetProof was never called for this admin claim
    expect(verifyTweetProof).not.toHaveBeenCalled();
  });
});
