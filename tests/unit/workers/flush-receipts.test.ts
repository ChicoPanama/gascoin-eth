// vi.mock calls MUST come before imports
let mockReceipts: any[] = [];
const mockStorageRemove = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === 'claim_receipts') {
        return {
          select: () => ({
            not: () => ({
              lt: () => ({
                limit: () => Promise.resolve({ data: mockReceipts }),
              }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
          insert: () => Promise.resolve({ data: null, error: null }),
        };
      }
      // audit_logs and others
      return {
        insert: () => Promise.resolve({ data: null, error: null }),
      };
    },
    storage: {
      from: () => ({ remove: mockStorageRemove }),
    },
  }),
}));

vi.mock('@/lib/cron-auth', () => ({
  isAuthorizedCron: (req: Request) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    return req.headers.get('authorization') === `Bearer ${secret}`;
  },
}));

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/workers/flush-receipts/route';

function makeReq(authorized = true, method = 'POST') {
  return new Request('http://localhost', {
    method,
    headers: authorized ? { authorization: 'Bearer test-secret' } : {},
  });
}

const NINETY_DAYS_AGO = new Date(Date.now() - 91 * 86400000).toISOString();

describe('flush-receipts worker', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret';
    mockReceipts = [];
    mockStorageRemove.mockClear();
    mockStorageRemove.mockResolvedValue({ error: null });
  });

  it('returns 401 when unauthorized', async () => {
    const res = await POST(makeReq(false));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('returns ok with flushed: 0 when no receipts exist', async () => {
    mockReceipts = [];
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.flushed).toBe(0);
    expect(body.message).toBe('no receipts to flush');
  });

  it('flushes 2 paid/rejected receipts and records audit log', async () => {
    mockReceipts = [
      { id: 'r1', storage_path_private: 'path/r1.jpg', claim_id: 'c1', claims: { status: 'paid' } },
      { id: 'r2', storage_path_private: 'path/r2.jpg', claim_id: 'c2', claims: { status: 'rejected' } },
    ];
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.flushed).toBe(2);
    expect(mockStorageRemove).toHaveBeenCalledTimes(2);
    expect(mockStorageRemove).toHaveBeenCalledWith(['path/r1.jpg']);
    expect(mockStorageRemove).toHaveBeenCalledWith(['path/r2.jpg']);
  });

  it('skips receipts from approved (not yet paid) claims', async () => {
    mockReceipts = [
      { id: 'r3', storage_path_private: 'path/r3.jpg', claim_id: 'c3', claims: { status: 'approved' } },
    ];
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.flushed).toBe(0);
    expect(mockStorageRemove).not.toHaveBeenCalled();
  });

  it('records errors and skips receipt when storage delete fails', async () => {
    mockReceipts = [
      { id: 'r4', storage_path_private: 'path/r4.jpg', claim_id: 'c4', claims: { status: 'paid' } },
      { id: 'r5', storage_path_private: 'path/r5.jpg', claim_id: 'c5', claims: { status: 'paid' } },
    ];
    mockStorageRemove
      .mockResolvedValueOnce({ error: { message: 'storage error' } })
      .mockResolvedValueOnce({ error: null });

    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.flushed).toBe(1);
    expect(body.errors).toBe(1);
  });
});
