import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabase } from '@/tests/mocks/supabase';

// ── Mocks (must precede handler import) ──────────────────────────────────────

const mockStore = createMockSupabase().store;

const getSupabaseAdminSpy = vi.fn(() => createMockSupabase(mockStore));

vi.mock('@/lib/supabase', () => ({
  get getSupabaseAdmin() {
    return getSupabaseAdminSpy;
  },
}));

vi.mock('@/lib/integrations/ethereum', () => ({
  hasMinimumGascoin: vi.fn().mockResolvedValue({ ok: true, tokenBalance: 1000000 }),
  bustTreasuryCache: vi.fn().mockResolvedValue(undefined),
  getTreasuryBalances: vi.fn().mockResolvedValue({ ethBalance: 10, ethUsd: 30000, gascoinBalance: 0, gascoinUsd: 0 }),
}));

vi.mock('@/lib/integrations/claude', () => ({
  reviewClaim: vi.fn().mockResolvedValue({
    verdict: 'approve',
    confidence: 0.9,
    narrative: 'Clean',
    concerns: [],
  }),
}));

vi.mock('@/lib/payout-worker', () => ({
  processQueuedPayout: vi.fn().mockResolvedValue({ ok: true, txHash: 'tx-abc' }),
}));

vi.mock('@/lib/token-tiers', () => ({
  getTierForBalance: vi.fn().mockReturnValue({
    id: 'standard',
    slug: 'standard',
    name: 'Standard',
    max_sol_refund: 0.01,
  }),
}));

vi.mock('@/lib/data-intelligence', () => ({
  snapshotTreasury: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/knowledge-base', () => ({
  writeIntelligence: vi.fn().mockResolvedValue(undefined),
}));

// ── Import handler after mocks ────────────────────────────────────────────────

import { POST } from '@/app/api/workers/process-claims/route';
import { reviewClaim } from '@/lib/integrations/claude';

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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/workers/process-claims', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret';
    mockStore.clear();
    vi.clearAllMocks();
    // Restore default spy implementations after vi.clearAllMocks()
    getSupabaseAdminSpy.mockImplementation(() => createMockSupabase(mockStore));
    vi.mocked(reviewClaim).mockResolvedValue({
      verdict: 'approve',
      confidence: 0.9,
      narrative: 'Clean',
      concerns: [],
    });
  });

  it('returns 401 when unauthorized', async () => {
    const res = await POST(makeReq(false));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('unauthorized');
  });

  it('transitions submitted claims to auto_review and inserts claim_status_events', async () => {
    mockStore.seed('claims', [
      { id: 'c1', status: 'submitted', wallet: 'wallet1', user_id: 'u1', risk_score: 0 },
      { id: 'c2', status: 'submitted', wallet: 'wallet2', user_id: 'u2', risk_score: 0 },
    ]);

    const res = await POST(makeReq());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.transitionedClaims).toBe(2);

    // Both claims moved to auto_review
    const claims = mockStore.getTable('claims').filter((c) => c.status === 'auto_review');
    expect(claims).toHaveLength(2);

    // Two status events recorded
    const events = mockStore.getTable('claim_status_events').filter((e) => e.to_status === 'auto_review');
    expect(events).toHaveLength(2);
    expect(events[0].from_status).toBe('submitted');
    expect(events[0].actor_id).toBe('claims_worker');
  });

  it('auto-approves ready_for_dispatch claim (Claude approves): upserts payout_jobs, inserts engagement_points, audit log', async () => {
    mockStore.seed('claims', [
      {
        id: 'c-ready',
        status: 'ready_for_dispatch',
        wallet: 'walletX',
        user_id: 'u10',
        risk_score: 0.1,
        ip_country: 'US',
      },
    ]);

    const res = await POST(makeReq());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.autoApprovedClaims).toBe(1);

    // payout_jobs row created
    const jobs = mockStore.getTable('payout_jobs');
    expect(jobs.some((j) => j.claim_id === 'c-ready')).toBe(true);

    // engagement_points inserted
    const pts = mockStore.getTable('engagement_points');
    expect(pts.some((p) => p.wallet === 'walletX' && p.source === 'submission_approved')).toBe(true);
    expect(pts.find((p) => p.wallet === 'walletX')?.points).toBe(1000);

    // audit_logs has claim_auto_approved
    const logs = mockStore.getTable('audit_logs');
    expect(logs.some((l) => l.action === 'claim_auto_approved' && l.target_id === 'c-ready')).toBe(true);
  });

  it('Claude flags claim → reverted to needs_review, no payout_jobs row created', async () => {
    vi.mocked(reviewClaim).mockResolvedValueOnce({
      verdict: 'flag',
      confidence: 0.6,
      narrative: 'Suspicious activity',
      concerns: ['anomalous_pattern'],
    });

    mockStore.seed('claims', [
      {
        id: 'c-flagged',
        status: 'ready_for_dispatch',
        wallet: 'walletSusp',
        user_id: 'u20',
        risk_score: 0.8,
        ip_country: 'XX',
      },
    ]);

    const res = await POST(makeReq());
    expect(res.status).toBe(200);

    // Claim was reverted to needs_review
    const claims = mockStore.getTable('claims');
    const flaggedClaim = claims.find((c) => c.id === 'c-flagged');
    expect(flaggedClaim?.status).toBe('needs_review');

    // No payout job created
    const jobs = mockStore.getTable('payout_jobs');
    expect(jobs.some((j) => j.claim_id === 'c-flagged')).toBe(false);

    // Status event from approved → needs_review
    const events = mockStore.getTable('claim_status_events');
    const revertEvent = events.find((e) => e.claim_id === 'c-flagged' && e.to_status === 'needs_review');
    expect(revertEvent).toBeDefined();
    expect(revertEvent?.actor_id).toBe('claude_oversight');
  });

  it('returns 500 when submitted claims DB query fails', async () => {
    // Override the spy once to return a supabase-like object whose claims query fails
    const errorSupabase = {
      from: (table: string) => {
        if (table === 'claims') {
          return {
            select: () => ({
              eq: () => ({
                limit: () =>
                  Promise.resolve({ data: null, error: { message: 'DB error', code: '500' } }),
              }),
            }),
          };
        }
        return createMockSupabase(mockStore).from(table);
      },
    };

    getSupabaseAdminSpy.mockReturnValueOnce(errorSupabase as any);

    const res = await POST(makeReq());
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toBe('submitted_query_failed');
  });
});
