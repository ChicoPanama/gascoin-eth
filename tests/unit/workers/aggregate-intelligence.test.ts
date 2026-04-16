// vi.mock MUST come before imports. Factory functions cannot reference outer const — use vi.fn() inline.
let mockClaims: any[] = [];
let mockPayouts: any[] = [];
let mockPoints: any[] = [];
let mockIntel: any[] = [];

// Deeply chainable query builder for select chains
function chainable(getDataFn: () => any[]): any {
  const resolve = () => Promise.resolve({ data: getDataFn(), error: null });
  const self: any = {
    eq: () => self,
    neq: () => self,
    gte: () => self,
    gt: () => self,
    lt: () => self,
    in: () => self,
    not: () => self,
    order: () => ({
      limit: () => resolve(),
      then: (r: any) => resolve().then(r),
    }),
    limit: () => resolve(),
    select: () => self,
    then: (r: any) => resolve().then(r),
    catch: (r: any) => resolve().catch(r),
  };
  return self;
}

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => ({
      select: () => {
        if (table === 'claims') return chainable(() => mockClaims);
        if (table === 'payouts') return chainable(() => mockPayouts);
        if (table === 'engagement_points') return chainable(() => mockPoints);
        if (table === 'intelligence_entries') return chainable(() => mockIntel);
        return chainable(() => []);
      },
      upsert: () => Promise.resolve({ data: null, error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
    }),
  }),
}));

vi.mock('@/lib/mem0', () => ({
  addMemory: vi.fn().mockResolvedValue(undefined),
  searchMemories: vi.fn().mockResolvedValue([]),
  refreshFlagCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/knowledge-base', () => ({
  writeIntelligence: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/integrations/grok', () => ({
  callGrok: vi.fn().mockResolvedValue({ ok: false, content: '' }),
  isGrokAvailable: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/cron-auth', () => ({
  isAuthorizedCron: (req: Request) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    return req.headers.get('authorization') === `Bearer ${secret}`;
  },
}));

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '@/app/api/workers/aggregate-intelligence/route';
import { addMemory, refreshFlagCache } from '@/lib/mem0';
import { writeIntelligence } from '@/lib/knowledge-base';
import { isGrokAvailable } from '@/lib/integrations/grok';

function makeReq(authorized = true) {
  return new Request('http://localhost', {
    method: 'POST',
    headers: authorized ? { authorization: 'Bearer test-secret' } : {},
  });
}

describe('aggregate-intelligence worker', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret';
    mockClaims = [];
    mockPayouts = [];
    mockPoints = [];
    mockIntel = [];
    vi.clearAllMocks();
    (isGrokAvailable as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 401 when unauthorized', async () => {
    const res = await POST(makeReq(false));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('synthesizes 2 active wallets from claims and calls addMemory twice', async () => {
    mockClaims = [
      { wallet: 'wallet1', status: 'paid', risk_score: 0.1 },
      { wallet: 'wallet2', status: 'approved', risk_score: 0.2 },
    ];
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.synthesized).toBe(2);
    expect(addMemory).toHaveBeenCalledTimes(2);
  });

  it('calls writeIntelligence with cross_pipeline_alert for entity with 2+ signal types', async () => {
    mockIntel = [
      { entry_type: 'fraud_signal', entity_type: 'wallet', entity_id: 'walletX', summary: 'fraud', severity: 'critical' },
      { entry_type: 'velocity_alert', entity_type: 'wallet', entity_id: 'walletX', summary: 'velocity', severity: 'warning' },
    ];
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.crossPipelineAlerts).toBe(1);
    expect(writeIntelligence).toHaveBeenCalledWith(
      expect.objectContaining({ entry_type: 'cross_pipeline_alert' }),
    );
  });

  it('skips weekly report on a non-Sunday (Monday)', async () => {
    // 2026-04-13 is a Monday
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-13T07:00:00Z'));
    (isGrokAvailable as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.weeklyReport).toBe('skipped');
  });

  it('calls refreshFlagCache once per active wallet (3 wallets)', async () => {
    mockClaims = [
      { wallet: 'w1', status: 'paid', risk_score: 0 },
      { wallet: 'w2', status: 'paid', risk_score: 0 },
      { wallet: 'w3', status: 'paid', risk_score: 0 },
    ];
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cacheRefreshed).toBe(3);
    expect(refreshFlagCache).toHaveBeenCalledTimes(3);
  });
});
