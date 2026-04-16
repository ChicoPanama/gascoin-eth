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
  awardVerifiedPoints: vi.fn().mockResolvedValue({ awarded: true, points: 100, heldForReview: false }),
}));

vi.mock('@/lib/mem0', () => ({
  addMemory: vi.fn().mockResolvedValue(undefined),
  writeReferralRingFlag: vi.fn().mockResolvedValue(undefined),
  writePayoutEvent: vi.fn().mockResolvedValue(undefined),
  searchMemories: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/knowledge-base', () => ({
  writeIntelligence: vi.fn().mockResolvedValue(undefined),
}));

// ── Import handler after mocks ────────────────────────────────────────────────

import { POST } from '@/app/api/workers/verify-referrals/route';
import { REFERRAL_CONFIG } from '@/lib/referral-config';

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

// A referred wallet that has a paid payout (triggers processing)
const REFERRED_WALLET = 'walletB';
const REFERRER_WALLET = 'walletA';

function seedHappyPath() {
  // pending referral
  mockStore.seed('referrals', [
    {
      id: 'ref-1',
      referrer_wallet: REFERRER_WALLET,
      referred_wallet: REFERRED_WALLET,
      status: 'pending',
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
  ]);

  // referred wallet has a paid payout → triggers referral processing
  mockStore.seed('payouts', [
    { id: 'pay-1', wallet: REFERRED_WALLET, status: 'paid' },
    // referrer also has a paid payout (for referrer_approved check)
    { id: 'pay-2', wallet: REFERRER_WALLET, status: 'paid' },
  ]);

  // referred wallet's first claim is older than 7 days
  mockStore.seed('claims', [
    {
      id: 'claim-ref-1',
      wallet: REFERRED_WALLET,
      status: 'paid',
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    {
      id: 'claim-ref-2',
      wallet: REFERRER_WALLET,
      status: 'paid',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
  ]);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/workers/verify-referrals', () => {
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

  it('self-referral: conversion inserted with skip_reason=self_referral, pointsAwarded=0', async () => {
    mockStore.seed('referrals', [
      {
        id: 'ref-self',
        referrer_wallet: 'sameWallet',
        referred_wallet: 'sameWallet',
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    ]);
    // referred wallet has paid payout to pass the first filter
    mockStore.seed('payouts', [{ id: 'pay-self', wallet: 'sameWallet', status: 'paid' }]);
    mockStore.seed('claims', [
      {
        id: 'claim-self',
        wallet: 'sameWallet',
        status: 'paid',
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
    ]);

    const res = await POST(makeReq());
    expect(res.status).toBe(200);

    const conversions = mockStore.getTable('referral_conversions');
    const selfConv = conversions.find((c) => c.referrer_wallet === 'sameWallet');
    expect(selfConv).toBeDefined();
    expect(selfConv?.skip_reason).toBe('self_referral');
    expect(selfConv?.reward_status).toBe('skipped');

    const json = await res.json();
    expect(json.pointsAwarded).toBe(0);
  });

  it('referrer has no paid payout → conversion skipped with referrer_not_approved', async () => {
    mockStore.seed('referrals', [
      {
        id: 'ref-nopay',
        referrer_wallet: 'referrerNoPay',
        referred_wallet: 'referredHasPay',
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    ]);
    // Only referred wallet has a payout; referrer does not
    mockStore.seed('payouts', [{ id: 'pay-ref', wallet: 'referredHasPay', status: 'paid' }]);
    mockStore.seed('claims', [
      {
        id: 'claim-no',
        wallet: 'referredHasPay',
        status: 'paid',
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
    ]);

    const res = await POST(makeReq());
    expect(res.status).toBe(200);

    const conversions = mockStore.getTable('referral_conversions');
    const conv = conversions.find((c) => c.referrer_wallet === 'referrerNoPay');
    expect(conv?.skip_reason).toBe('referrer_not_approved');
  });

  it('happy path: referrer has paid payout, referred wallet not in conversions → conversion inserted + points awarded', async () => {
    seedHappyPath();

    const res = await POST(makeReq());
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.verified).toBeGreaterThanOrEqual(1);

    // Conversion record inserted
    const conversions = mockStore.getTable('referral_conversions');
    const conv = conversions.find(
      (c) => c.referrer_wallet === REFERRER_WALLET && c.referred_wallet === REFERRED_WALLET,
    );
    expect(conv).toBeDefined();
    expect(conv?.reward_status).toBe('verified');
    expect(conv?.skip_reason).toBeNull();
  });

  it('monthly cap reached → new conversion skipped with max_conversions_reached', async () => {
    // Seed referral
    mockStore.seed('referrals', [
      {
        id: 'ref-cap',
        referrer_wallet: REFERRER_WALLET,
        referred_wallet: REFERRED_WALLET,
        status: 'pending',
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
    ]);

    // referred/referrer have paid payouts
    mockStore.seed('payouts', [
      { id: 'pay-r', wallet: REFERRED_WALLET, status: 'paid' },
      { id: 'pay-rr', wallet: REFERRER_WALLET, status: 'paid' },
    ]);

    mockStore.seed('claims', [
      {
        id: 'claim-cap-1',
        wallet: REFERRED_WALLET,
        status: 'paid',
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
      {
        id: 'claim-cap-2',
        wallet: REFERRER_WALLET,
        status: 'paid',
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
    ]);

    // Pre-fill 20 conversions for the referrer in the last 30 days (at the cap)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const capConversions = Array.from({ length: REFERRAL_CONFIG.MAX_CONVERSIONS_30D }, (_, i) => ({
      id: `cap-conv-${i}`,
      referrer_wallet: REFERRER_WALLET,
      referred_wallet: `wallet-cap-${i}`,
      reward_status: 'verified',
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
    }));
    mockStore.seed('referral_conversions', capConversions);

    const res = await POST(makeReq());
    expect(res.status).toBe(200);

    // A new conversion row should exist for walletB, skipped
    const conversions = mockStore.getTable('referral_conversions');
    const newConv = conversions.find(
      (c) => c.referrer_wallet === REFERRER_WALLET && c.referred_wallet === REFERRED_WALLET,
    );
    expect(newConv).toBeDefined();
    expect(newConv?.skip_reason).toBe('max_conversions_reached');
    expect(newConv?.reward_status).toBe('skipped');
  });
});
