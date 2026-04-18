import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabase } from '@/tests/mocks/supabase';

// ── Mocks (must precede handler import) ──────────────────────────────────────

const mockStore = createMockSupabase().store;

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => createMockSupabase(mockStore),
}));

vi.mock('@/lib/ai-points-engine', () => ({
  detectReferralRing: vi.fn().mockResolvedValue({
    isSuspicious: false,
    ringType: 'none',
    confidence: 0,
    reason: '',
    wallets: [],
  }),
  calculateWalletTrust: vi.fn().mockReturnValue({
    score: 0.8,
    level: 'trusted',
    factors: [],
  }),
  awardVerifiedPoints: vi.fn().mockImplementation(async (_supabase: any, params: any) => {
    // Actually insert into engagement_points so the store reflects it
    await _supabase.from('engagement_points').insert({
      wallet: params.wallet,
      source: params.source,
      points: params.rawPoints,
      metadata_json: params.metadata || {},
    });
    return { awarded: true, points: params.rawPoints, heldForReview: false };
  }),
  generateAuditSummary: vi.fn().mockResolvedValue('All clean.'),
}));

vi.mock('@/lib/mem0', () => ({
  addMemory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/knowledge-base', () => ({
  writeIntelligence: vi.fn().mockResolvedValue(undefined),
}));

// Token tiers for holdings tests
vi.mock('@/lib/token-tiers', () => ({
  TOKEN_TIERS: [
    { id: 0, slug: 'standard', name: 'Standard', min_balance: 1, max_sol_refund: 0.01 },
    { id: 1, slug: 'commuter', name: 'Commuter', min_balance: 100000, max_sol_refund: 0.05 },
  ],
  getTierForBalance: vi.fn().mockReturnValue({
    id: 0,
    slug: 'standard',
    name: 'Standard',
    max_sol_refund: 0.01,
  }),
}));

// Ethereum integration — used inside the dynamic import in the worker for on-chain balance verification
vi.mock('@/lib/integrations/ethereum', () => ({
  getWalletGascoinBalance: vi.fn().mockResolvedValue(1),
  hasMinimumGascoin: vi.fn().mockResolvedValue({ ok: true, tokenBalance: 1 }),
}));

vi.mock('@/lib/engagement-rewards', () => ({
  POINTS_CONFIG: {
    POINTS_PER_APPROVED_SUBMISSION: 1000,
    POINTS_PER_STREAK_WINDOW: 250,
    MAX_STREAK_MULTIPLIER: 12,
    POINTS_PER_CYCLE_STANDARD: 100,
    POINTS_PER_CYCLE_COMMUTER: 500,
    POINTS_PER_CYCLE_ROAD_WARRIOR: 1500,
    POINTS_PER_CYCLE_FLEET: 5000,
    REFERRAL_PASSIVE_RATE: 0.02,
    REFERRAL_PASSIVE_CAP_MONTHLY: 10000,
  },
}));

// ── Import handler after mocks ────────────────────────────────────────────────

import { POST } from '@/app/api/workers/award-points/route';
import { awardVerifiedPoints } from '@/lib/ai-points-engine';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(authorized = true) {
  return new Request('http://localhost', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authorized ? { authorization: 'Bearer test-secret' } : {}),
    },
    body: JSON.stringify({}),
  });
}

const TODAY = new Date().toISOString().split('T')[0];
const RUN_KEY = `award-points:${TODAY}`;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/workers/award-points', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret';
    mockStore.clear();
  });

  it('returns 401 when unauthorized', async () => {
    const res = await POST(makeReq(false));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('unauthorized');
  });

  it('idempotency guard: second POST on same day returns already_ran_today without double-awarding', async () => {
    // Pre-seed the idempotency key as if the worker already ran today
    mockStore.seed('idempotency_keys', [
      {
        id: 'idem-run-1',
        key: RUN_KEY,
        scope: 'worker',
        status: 'processing',
        request_hash: `daily-${TODAY}`,
      },
    ]);

    const res = await POST(makeReq());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.skipped).toBe(true);
    expect(json.reason).toBe('already_ran_today');

    // awardVerifiedPoints must never be called
    expect(awardVerifiedPoints).not.toHaveBeenCalled();
  });

  it('happy path: paid payout with no prior submission points → 1000 base points inserted', async () => {
    mockStore.seed('payouts', [
      { id: 'pay-1', wallet: 'walletHappy', claim_id: 'claim-happy', status: 'paid', created_at: new Date().toISOString() },
    ]);
    // No existing engagement_points for this wallet/claim

    const res = await POST(makeReq());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.submissionPointsAwarded).toBe(1000);

    // Verify engagement_points row was inserted
    const pts = mockStore.getTable('engagement_points');
    const subPt = pts.find((p) => p.wallet === 'walletHappy' && p.source === 'submission_approved');
    expect(subPt).toBeDefined();
    expect(subPt?.points).toBe(1000);
  });

  it('holdings bonus: wallet in wallet_token_cache with tier_id=0 gets standard 100 pts', async () => {
    // No paid payouts so submission/streak loops are skipped
    mockStore.seed('wallet_token_cache', [
      { wallet_address: 'walletHolder', gascoin_balance: 1, tier_id: 0 },
    ]);

    const res = await POST(makeReq());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.holdingsPointsAwarded).toBe(100);

    const pts = mockStore.getTable('engagement_points');
    const holdPt = pts.find((p) => p.wallet === 'walletHolder' && p.source === 'holdings_bonus');
    expect(holdPt).toBeDefined();
    expect(holdPt?.points).toBe(100);
  });

  it('no double-award: if engagement_points already has a holdings row for today → skip', async () => {
    mockStore.seed('wallet_token_cache', [
      { wallet_address: 'walletDupe', gascoin_balance: 1, tier_id: 0 },
    ]);

    // Pre-seed an existing holdings_bonus row for today
    mockStore.seed('engagement_points', [
      {
        id: 'ep-existing',
        wallet: 'walletDupe',
        source: 'holdings_bonus',
        points: 100,
        created_at: `${TODAY}T06:00:00Z`,
        metadata_json: { awarded_date: TODAY },
      },
    ]);

    const res = await POST(makeReq());
    expect(res.status).toBe(200);

    const json = await res.json();
    // holdingsPointsAwarded should be 0 because the row was already there
    expect(json.holdingsPointsAwarded).toBe(0);

    // Only the pre-seeded row should exist — no duplicates
    const pts = mockStore.getTable('engagement_points').filter(
      (p) => p.wallet === 'walletDupe' && p.source === 'holdings_bonus',
    );
    expect(pts).toHaveLength(1);
  });

  it('no double-award: submission points skipped when same wallet+claim already has engagement_points row', async () => {
    mockStore.seed('payouts', [
      { id: 'pay-dupe', wallet: 'walletSub', claim_id: 'claim-sub-1', status: 'paid', created_at: new Date().toISOString() },
    ]);

    // The worker uses .ilike('metadata_json->>claim_id', payout.claim_id).
    // The mock store evaluates ilike against the literal column key 'metadata_json->>claim_id',
    // so we seed that key directly to make the dedup filter match.
    mockStore.seed('engagement_points', [
      {
        id: 'ep-sub-existing',
        wallet: 'walletSub',
        source: 'submission_approved',
        points: 1000,
        'metadata_json->>claim_id': 'claim-sub-1',
        metadata_json: { claim_id: 'claim-sub-1' },
        created_at: new Date().toISOString(),
      },
    ]);

    const res = await POST(makeReq());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.submissionPointsAwarded).toBe(0);

    // Still only 1 row for this wallet+source (the pre-seeded one, not a new duplicate)
    const pts = mockStore.getTable('engagement_points').filter(
      (p) => p.wallet === 'walletSub' && p.source === 'submission_approved',
    );
    expect(pts).toHaveLength(1);
  });
});
