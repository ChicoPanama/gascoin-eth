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

const VALID_BODY = { claimId: 'claim-1', wallet: 'walletABC', amountSol: 0.01 };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/workers/payout', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret';
    mockStore.clear();
    vi.clearAllMocks();
    vi.mocked(processQueuedPayout).mockResolvedValue({ ok: true, txHash: 'mock-tx-123' });
  });

  it('returns 401 when no auth header', async () => {
    const res = await POST(makeReq(VALID_BODY, false));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('unauthorized');
  });

  it('returns 400 when body is missing claimId', async () => {
    const res = await POST(makeReq({ wallet: 'walletABC', amountSol: 0.01 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('invalid_input');
  });

  it('returns 400 when amountSol is zero', async () => {
    const res = await POST(makeReq({ claimId: 'claim-1', wallet: 'walletABC', amountSol: 0 }));
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
    expect(jobs[0].amount_sol).toBe(0.01);
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
