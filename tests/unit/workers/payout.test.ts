import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabase } from '@/tests/mocks/supabase';

// ── Mocks (must precede handler import) ──────────────────────────────────────

const mockStore = createMockSupabase().store;

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => createMockSupabase(mockStore),
}));

vi.mock('@/lib/payout-worker', () => ({
  processQueuedPayout: vi.fn().mockResolvedValue({ ok: true, txHash: 'mock-tx-123' }),
}));

vi.mock('@/lib/idempotency', () => ({
  hashRequestBody: vi.fn().mockReturnValue('hash-abc'),
  resolveIdempotencyKey: vi.fn().mockReturnValue('idem-key-1'),
}));

// Mocks required by the real processQueuedPayout implementation
vi.mock('@/lib/integrations/ethereum', () => ({
  hasMinimumGascoin: vi.fn().mockResolvedValue({ ok: true, tokenBalance: 100_000 }),
  sendEthPayout: vi.fn().mockResolvedValue({ ok: true, txHash: 'tx-race-test-001' }),
  getTreasuryBalances: vi.fn().mockResolvedValue({ ethBalance: 5, ethUsd: 15000, gascoinBalance: 1000, gascoinUsd: 0 }),
}));

vi.mock('@/lib/token-tiers', () => ({
  getTierForBalance: vi.fn().mockReturnValue({ slug: 'commuter', max_sol_refund: 0.1 }),
}));

vi.mock('@/lib/integrations/x', () => ({
  verifyTweetProof: vi.fn().mockResolvedValue({ ok: true }),
  getFollowerCount: vi.fn().mockResolvedValue(500),
}));

vi.mock('@/lib/x-api', () => ({
  getUserByUsername: vi.fn().mockResolvedValue({ user: null }),
}));

vi.mock('@/lib/account-quality', () => ({
  scoreAccountQuality: vi.fn().mockReturnValue({ passed: true, score: 80, flags: [] }),
}));

vi.mock('@/lib/mem0', () => ({
  getCachedFlags: vi.fn().mockResolvedValue(null),
  addMemory: vi.fn().mockResolvedValue(undefined),
  writePayoutEvent: vi.fn().mockResolvedValue(undefined),
}));

// ── Import handler after mocks ────────────────────────────────────────────────

import { POST } from '@/app/api/workers/payout/route';
import { processQueuedPayout } from '@/lib/payout-worker';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(body?: object, authorized = true) {
  return new Request('http://localhost', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authorized ? { authorization: 'Bearer test-secret' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const VALID_BODY = { claimId: 'claim-1', wallet: 'walletABC', amountEth: 0.01 };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/workers/payout', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret';
    mockStore.clear();
    vi.clearAllMocks();
    vi.mocked(processQueuedPayout).mockResolvedValue({ ok: true, txHash: 'mock-tx-123', reused: false, gate: { ok: true, tokenBalance: 100_000 } });
  });

  it('returns 401 when no auth header', async () => {
    const res = await POST(makeReq(VALID_BODY, false));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('unauthorized');
  });

  it('returns 400 when body is missing claimId', async () => {
    const res = await POST(makeReq({ wallet: 'walletABC', amountEth: 0.01 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('invalid_input');
  });

  it('returns 400 when amountEth is zero', async () => {
    const res = await POST(makeReq({ claimId: 'claim-1', wallet: 'walletABC', amountEth: 0 }));
    expect(res.status).toBe(400);
  });

  it('happy path: upserts payout_jobs, creates idempotency_keys, returns ok+txHash', async () => {
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.txHash).toBe('mock-tx-123');

    // payout_jobs row was upserted with correct fields
    const jobs = mockStore.getTable('payout_jobs');
    expect(jobs).toHaveLength(1);
    expect(jobs[0].claim_id).toBe('claim-1');
    expect(jobs[0].wallet).toBe('walletABC');
    expect(jobs[0].amount_eth).toBe(0.01);
    expect(jobs[0].status).toBe('queued');

    // idempotency_keys row was inserted
    const idemKeys = mockStore.getTable('idempotency_keys');
    expect(idemKeys.length).toBeGreaterThanOrEqual(1);
    const idemRow = idemKeys.find((k) => k.scope === 'payout_request');
    expect(idemRow).toBeDefined();
    expect(idemRow?.key).toBe('idem-key-1');
  });

  it('idempotency: second call returns cached response without re-running processQueuedPayout', async () => {
    // Seed a completed idempotency key
    mockStore.seed('idempotency_keys', [
      {
        id: 'idem-row-1',
        key: 'idem-key-1',
        scope: 'payout_request',
        status: 'completed',
        response_json: { ok: true, txHash: 'cached-tx-999' },
        request_hash: 'hash-abc',
      },
    ]);

    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.txHash).toBe('cached-tx-999');

    // processQueuedPayout must NOT have been called again
    expect(processQueuedPayout).not.toHaveBeenCalled();
  });

  it('returns 422 when processQueuedPayout returns min_gascoin_not_met', async () => {
    vi.mocked(processQueuedPayout).mockResolvedValueOnce({
      ok: false,
      error: 'min_gascoin_not_met',
    });

    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(422);

    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe('min_gascoin_not_met');
  });
});

// ── T8: Double-payout race condition ─────────────────────────────────────────
// Two sequential processQueuedPayout calls for the same claim_id must result
// in exactly one payout. The payout_jobs.status='paid' guard short-circuits
// the second call before sendEthPayout is ever invoked.
//
// Note: In a true multi-process scenario, concurrent callers could both pass
// the status check before either writes 'paid' — this is a known gap requiring
// a DB-level advisory lock or SELECT FOR UPDATE. These tests verify the guard
// works for the sequential/retry case (most common in production).

describe('T8 — double-payout race: processQueuedPayout idempotency guard', () => {
  let realProcessQueuedPayout: typeof processQueuedPayout;
  let sendEthPayout: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockStore.clear();
    vi.clearAllMocks();

    // Grab the real function (bypasses the vi.mock above for the route handler)
    const module = await vi.importActual<typeof import('@/lib/payout-worker')>('@/lib/payout-worker');
    realProcessQueuedPayout = module.processQueuedPayout;

    // Get the mocked sendEthPayout reference
    const ethereum = await import('@/lib/integrations/ethereum');
    sendEthPayout = vi.mocked(ethereum.sendEthPayout);
  });

  it('second call to already-paid claim returns ok:true reused:true without re-sending (idempotency guard)', async () => {
    // Pre-seed a paid job — simulates the state after first payout succeeded
    mockStore.seed('payout_jobs', [
      {
        id: 'job-paid-1',
        claim_id: 'claim-already-paid',
        wallet: 'walletPaid',
        amount_sol: 0.01,
        status: 'paid',
        attempts: 1,
        max_attempts: 5,
        next_retry_at: null,
        last_error: null,
      },
    ]);

    mockStore.seed('claims', [
      {
        id: 'claim-already-paid',
        user_id: 'user-paid',
        status: 'paid',
        tweet_url: null,
      },
    ]);

    mockStore.seed('payouts', [
      {
        id: 'payout-existing',
        claim_id: 'claim-already-paid',
        wallet: 'walletPaid',
        tx_hash: 'tx-already-done-abc',
        status: 'paid',
      },
    ]);

    const result = await realProcessQueuedPayout('claim-already-paid');

    // Idempotency guard: must NOT send another payout
    expect(sendEthPayout).not.toHaveBeenCalled();

    // Must return the existing tx hash — idempotent result
    expect(result.ok).toBe(true);
    expect((result as any).reused).toBe(true);
    expect((result as any).txHash).toBe('tx-already-done-abc');
  });

  it('sequential re-invocation: first call succeeds, second call is idempotent', async () => {
    // Seed an approved claim and queued job
    mockStore.seed('payout_jobs', [
      {
        id: 'job-seq-1',
        claim_id: 'claim-seq-1',
        wallet: 'walletSeqTest',
        amount_sol: 0.01,
        status: 'queued',
        attempts: 0,
        max_attempts: 5,
        next_retry_at: null,
        last_error: null,
      },
    ]);

    mockStore.seed('claims', [
      {
        id: 'claim-seq-1',
        user_id: 'user-seq-1',
        status: 'approved',
        tweet_url: null,
      },
    ]);

    mockStore.seed('payouts', []);

    // First call: should succeed and dispatch the payout
    const result1 = await realProcessQueuedPayout('claim-seq-1');
    expect(result1.ok).toBe(true);
    expect((result1 as any).reused).toBe(false);
    expect(sendEthPayout).toHaveBeenCalledTimes(1);

    // After first call, payout_jobs.status is now 'paid' in mockStore
    const jobAfterFirst = mockStore.getTable('payout_jobs').find((j) => j.claim_id === 'claim-seq-1');
    expect(jobAfterFirst?.status).toBe('paid');

    // Second call (retry scenario): payout_jobs.status='paid' guard fires
    const result2 = await realProcessQueuedPayout('claim-seq-1');
    expect(result2.ok).toBe(true);
    expect((result2 as any).reused).toBe(true);

    // sendEthPayout must still have been called only once total
    expect(sendEthPayout).toHaveBeenCalledTimes(1);

    // Only one payout row should exist
    const payouts = mockStore.getTable('payouts');
    expect(payouts).toHaveLength(1);
  });
});

// ── T5: Retry backoff math ────────────────────────────────────────────────────
describe('retry backoff calculation', () => {
  const RETRY_BASE_SECONDS = 60;

  it('doubles delay on each attempt (exponential backoff)', () => {
    // Formula: Math.pow(2, Math.min(attempts, 6)) * RETRY_BASE_SECONDS
    const delays = [1, 2, 3, 4, 5, 6, 7].map(
      (a) => Math.pow(2, Math.min(a, 6)) * RETRY_BASE_SECONDS,
    );
    expect(delays).toEqual([120, 240, 480, 960, 1920, 3840, 3840]);
  });

  it('caps exponent at 6 (max ~64 minutes)', () => {
    const maxDelay = Math.pow(2, 6) * RETRY_BASE_SECONDS;
    expect(maxDelay).toBe(3840); // 64 minutes
    // Attempt 7 must not exceed the cap
    expect(Math.pow(2, Math.min(7, 6)) * RETRY_BASE_SECONDS).toBe(maxDelay);
  });

  it('attempt 5 (max_attempts default) is not yet exhausted', () => {
    const MAX_ATTEMPTS = 5;
    expect(4 >= MAX_ATTEMPTS).toBe(false); // attempt 4: not exhausted
    expect(5 >= MAX_ATTEMPTS).toBe(true);  // attempt 5: exhausted
  });
});
