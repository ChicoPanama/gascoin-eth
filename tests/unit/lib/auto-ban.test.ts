import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabase } from '@/tests/mocks/supabase';

// ── Mocks (must precede all imports) ─────────────────────────────────────────

const mockStore = createMockSupabase().store;

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => createMockSupabase(mockStore),
}));

vi.mock('@/lib/mem0', () => ({
  writeBanState: vi.fn().mockResolvedValue(undefined),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { checkAndAutoBan } from '@/lib/auto-ban';
import { writeBanState } from '@/lib/mem0';

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER_ID = 'user-abc-123';
const WALLET = 'GAsWallet1Test';

function seedUserNotBanned() {
  mockStore.seed('user_bans', []);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('checkAndAutoBan — already banned', () => {
  beforeEach(() => {
    mockStore.clear();
    vi.clearAllMocks();
  });

  it('returns banned:true immediately if user already has an active ban', async () => {
    mockStore.seed('user_bans', [
      { id: 'ban-1', user_id: USER_ID, active: true, reason: 'prior ban' },
    ]);

    const result = await checkAndAutoBan(USER_ID, 'test_trigger');

    expect(result.banned).toBe(true);
    expect(result.reason).toBe('already_banned');
  });

  it('does NOT insert a second ban row when already banned', async () => {
    mockStore.seed('user_bans', [
      { id: 'ban-1', user_id: USER_ID, active: true, reason: 'prior ban' },
    ]);

    await checkAndAutoBan(USER_ID, 'test_trigger');

    // Only the original ban row should exist
    expect(mockStore.getTable('user_bans')).toHaveLength(1);
  });
});

describe('checkAndAutoBan — 30-day reject threshold', () => {
  beforeEach(() => {
    mockStore.clear();
    vi.clearAllMocks();
    seedUserNotBanned();
  });

  it('does NOT ban when rejections are below threshold (4 in 30d)', async () => {
    // Seed 4 rejected claims 15–18 days ago (within 30d but outside 14d zero-approval window)
    const recentClaims = Array.from({ length: 4 }, (_, i) => ({
      id: `claim-${i}`,
      user_id: USER_ID,
      status: 'rejected',
      created_at: new Date(Date.now() - (15 + i) * 86400000).toISOString(),
    }));
    mockStore.seed('claims', recentClaims);
    mockStore.seed('audit_logs', []);

    const result = await checkAndAutoBan(USER_ID, 'test_trigger');

    expect(result.banned).toBe(false);
    expect(mockStore.getTable('user_bans')).toHaveLength(0);
  });

  it('bans when recent rejections reach threshold (5 in 30d)', async () => {
    // Seed 5 rejected claims with recent dates (< 30 days)
    const recentClaims = Array.from({ length: 5 }, (_, i) => ({
      id: `claim-${i}`,
      user_id: USER_ID,
      status: 'rejected',
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
    }));
    mockStore.seed('claims', recentClaims);
    mockStore.seed('audit_logs', []);

    const result = await checkAndAutoBan(USER_ID, 'test_trigger');

    expect(result.banned).toBe(true);
    expect(result.reason).toContain('auto_ban');
    expect(result.reason).toContain('rejected claims in 30 days');
  });

  it('inserts a user_bans row on ban', async () => {
    const recentClaims = Array.from({ length: 5 }, (_, i) => ({
      id: `claim-${i}`,
      user_id: USER_ID,
      status: 'rejected',
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
    }));
    mockStore.seed('claims', recentClaims);
    mockStore.seed('audit_logs', []);

    await checkAndAutoBan(USER_ID, 'test_trigger');

    const bans = mockStore.getTable('user_bans');
    expect(bans).toHaveLength(1);
    expect(bans[0].user_id).toBe(USER_ID);
    expect(bans[0].active).toBe(true);
    expect(bans[0].created_by).toBe('auto_ban_system');
  });
});

describe('checkAndAutoBan — duplicate receipt threshold', () => {
  beforeEach(() => {
    mockStore.clear();
    vi.clearAllMocks();
    seedUserNotBanned();
    mockStore.seed('claims', []);
  });

  it('bans when duplicate receipt attempts reach threshold (3)', async () => {
    // Seed 3 audit_log entries with duplicateHash:true
    const dupeAttempts = Array.from({ length: 3 }, (_, i) => ({
      id: `log-${i}`,
      actor_id: USER_ID,
      action: 'claim_submitted',
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
      payload_json: { duplicateHash: true },
    }));
    mockStore.seed('audit_logs', dupeAttempts);

    const result = await checkAndAutoBan(USER_ID, 'dupe_test');

    expect(result.banned).toBe(true);
    expect(result.reason).toContain('duplicate receipt attempts');
  });

  it('does NOT ban with only 2 duplicate attempts', async () => {
    const dupeAttempts = Array.from({ length: 2 }, (_, i) => ({
      id: `log-${i}`,
      actor_id: USER_ID,
      action: 'claim_submitted',
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
      payload_json: { duplicateHash: true },
    }));
    mockStore.seed('audit_logs', dupeAttempts);

    const result = await checkAndAutoBan(USER_ID, 'dupe_test');

    expect(result.banned).toBe(false);
  });
});

describe('checkAndAutoBan — lifetime rejection threshold', () => {
  beforeEach(() => {
    mockStore.clear();
    vi.clearAllMocks();
    seedUserNotBanned();
    mockStore.seed('audit_logs', []);
  });

  it('bans when lifetime rejections reach threshold (10)', async () => {
    // 10 rejected claims across all time (some older than 30 days)
    const lifetimeClaims = Array.from({ length: 10 }, (_, i) => ({
      id: `old-claim-${i}`,
      user_id: USER_ID,
      status: 'rejected',
      created_at: new Date(Date.now() - (40 + i) * 86400000).toISOString(), // older than 30d
    }));
    mockStore.seed('claims', lifetimeClaims);

    const result = await checkAndAutoBan(USER_ID, 'lifetime_test');

    expect(result.banned).toBe(true);
    expect(result.reason).toContain('lifetime rejections');
  });

  it('does NOT ban with 9 lifetime rejections', async () => {
    const lifetimeClaims = Array.from({ length: 9 }, (_, i) => ({
      id: `old-claim-${i}`,
      user_id: USER_ID,
      status: 'rejected',
      created_at: new Date(Date.now() - (40 + i) * 86400000).toISOString(),
    }));
    mockStore.seed('claims', lifetimeClaims);

    const result = await checkAndAutoBan(USER_ID, 'lifetime_test');

    expect(result.banned).toBe(false);
  });
});

describe('checkAndAutoBan — audit log and mem0 side effects', () => {
  beforeEach(() => {
    mockStore.clear();
    vi.clearAllMocks();
    seedUserNotBanned();
  });

  it('inserts an audit_log entry on ban', async () => {
    const recentClaims = Array.from({ length: 5 }, (_, i) => ({
      id: `claim-${i}`,
      user_id: USER_ID,
      status: 'rejected',
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
    }));
    mockStore.seed('claims', recentClaims);
    mockStore.seed('audit_logs', []);

    await checkAndAutoBan(USER_ID, 'audit_test');

    const logs = mockStore.getTable('audit_logs');
    const banLog = logs.find((l) => l.action === 'user_auto_banned');
    expect(banLog).toBeDefined();
    expect(banLog?.target_id).toBe(USER_ID);
    expect(banLog?.actor_id).toBe('auto_ban_system');
  });

  it('calls writeBanState when wallet is provided', async () => {
    const recentClaims = Array.from({ length: 5 }, (_, i) => ({
      id: `claim-${i}`,
      user_id: USER_ID,
      status: 'rejected',
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
    }));
    mockStore.seed('claims', recentClaims);
    mockStore.seed('audit_logs', []);

    await checkAndAutoBan(USER_ID, 'wallet_test', WALLET);

    // writeBanState is fire-and-forget, give it a tick
    await new Promise((r) => setTimeout(r, 0));
    expect(writeBanState).toHaveBeenCalledWith(WALLET, expect.objectContaining({ state: 'banned' }));
  });

  it('does NOT call writeBanState when no wallet is provided', async () => {
    const recentClaims = Array.from({ length: 5 }, (_, i) => ({
      id: `claim-${i}`,
      user_id: USER_ID,
      status: 'rejected',
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
    }));
    mockStore.seed('claims', recentClaims);
    mockStore.seed('audit_logs', []);

    await checkAndAutoBan(USER_ID, 'no_wallet_test');

    await new Promise((r) => setTimeout(r, 0));
    expect(writeBanState).not.toHaveBeenCalled();
  });

  it('returns banned:false and writes nothing when user is clean', async () => {
    mockStore.seed('claims', []);
    mockStore.seed('audit_logs', []);

    const result = await checkAndAutoBan(USER_ID, 'clean_test');

    expect(result.banned).toBe(false);
    expect(mockStore.getTable('user_bans')).toHaveLength(0);
  });
});
