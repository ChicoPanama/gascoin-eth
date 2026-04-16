// vi.mock MUST come before imports. Factory functions cannot reference outer const — use vi.fn() inline.
vi.mock('@/lib/integrations/x', () => ({
  refreshGascoinFollowersCache: vi.fn(),
}));

vi.mock('@/lib/cron-auth', () => ({
  isAuthorizedCron: (req: Request) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    return req.headers.get('authorization') === `Bearer ${secret}`;
  },
}));

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST, GET } from '@/app/api/workers/sync-gascoin-followers/route';
import { refreshGascoinFollowersCache } from '@/lib/integrations/x';

function makeReq(authorized = true, method = 'POST') {
  return new Request('http://localhost', {
    method,
    headers: authorized ? { authorization: 'Bearer test-secret' } : {},
  });
}

const mockRefresh = refreshGascoinFollowersCache as ReturnType<typeof vi.fn>;

describe('sync-gascoin-followers worker', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret';
    process.env.X_BEARER_TOKEN = 'mock-bearer';
    vi.clearAllMocks();
  });

  it('POST returns 401 when unauthorized', async () => {
    const res = await POST(makeReq(false));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('GET returns 401 when unauthorized', async () => {
    const res = await GET(makeReq(false, 'GET'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('POST returns 500 when X_BEARER_TOKEN is missing', async () => {
    delete process.env.X_BEARER_TOKEN;
    const res = await POST(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/X_BEARER_TOKEN/);
  });

  it('POST returns ok with cached count on success', async () => {
    mockRefresh.mockResolvedValueOnce({ count: 1500 });
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.cached).toBe(1500);
  });

  it('POST returns 503 when cache refresh fails', async () => {
    mockRefresh.mockResolvedValueOnce({ count: -1, error: 'x_api_error' });
    const res = await POST(makeReq());
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('x_api_error');
  });

  it('GET authorized returns 200 with note about POST', async () => {
    const res = await GET(makeReq(true, 'GET'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.note).toBe('string');
  });
});
