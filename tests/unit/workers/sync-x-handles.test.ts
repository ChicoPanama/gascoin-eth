// vi.mock calls MUST come before imports
let mockLinks: any[] = [];

// Deeply chainable update mock: .update().eq().eq() must all work
function chainableUpdate(): any {
  const p = Promise.resolve({ data: null, error: null });
  const self: any = {
    eq: () => self,
    then: p.then.bind(p),
    catch: p.catch.bind(p),
  };
  return self;
}

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => ({
      select: (..._args: any[]) => ({
        eq: () => Promise.resolve({ data: mockLinks }),
      }),
      update: () => chainableUpdate(),
    }),
  }),
}));

vi.mock('@/lib/x-api', () => ({
  getUserByUsername: vi.fn(),
}));

vi.mock('@/lib/mem0', () => ({
  addMemory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/metrics-snapshot', () => ({
  persistHandleChange: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/cron-auth', () => ({
  isAuthorizedCron: (req: Request) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    return req.headers.get('authorization') === `Bearer ${secret}`;
  },
}));

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/workers/sync-x-handles/route';
import { getUserByUsername } from '@/lib/x-api';
import { addMemory } from '@/lib/mem0';

function makeReq(authorized = true) {
  return new Request('http://localhost', {
    method: 'POST',
    headers: authorized ? { authorization: 'Bearer test-secret' } : {},
  });
}

describe('sync-x-handles worker', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret';
    process.env.X_BEARER_TOKEN = 'mock-bearer';
    mockLinks = [];
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns 401 when unauthorized', async () => {
    const res = await POST(makeReq(false));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('returns 500 when X_BEARER_TOKEN is missing', async () => {
    delete process.env.X_BEARER_TOKEN;
    const res = await POST(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/X_BEARER_TOKEN/);
  });

  it('returns updated: 0 when handle is unchanged', async () => {
    mockLinks = [{ id: 'link1', wallet: 'wallet1', x_handle: 'myuser', x_user_id: 'u123', is_active: true }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { username: 'myuser' } }),
    }));
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updated).toBe(0);
  });

  it('updates handle and calls mem0 when username has changed', async () => {
    mockLinks = [{ id: 'link1', wallet: 'wallet1', x_handle: 'oldhandle', x_user_id: 'u123', is_active: true }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { username: 'newhandle' } }),
    }));
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updated).toBe(1);
    expect(body.changes).toHaveLength(1);
    expect(body.changes[0].new_handle).toBe('newhandle');
    expect(addMemory).toHaveBeenCalled();
  });

  it('marks link inactive and increments stale on 404', async () => {
    mockLinks = [{ id: 'link2', wallet: 'wallet2', x_handle: 'gone_user', x_user_id: 'u999', is_active: true }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    }));
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stale).toBe(1);
  });

  it('backfills x_user_id for link without one', async () => {
    mockLinks = [{ id: 'link3', wallet: 'wallet3', x_handle: 'legacyuser', x_user_id: null, is_active: true }];
    // Route destructures: const { user, error } = await getUserByUsername(...)
    (getUserByUsername as any).mockResolvedValueOnce({ user: { id: 'u777', username: 'legacyuser' }, error: null });
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.backfilled).toBe(1);
  });
});
