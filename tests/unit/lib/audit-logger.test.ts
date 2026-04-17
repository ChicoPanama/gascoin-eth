import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabase } from '@/tests/mocks/supabase';

// ── Mocks (must precede all imports) ─────────────────────────────────────────

const mockStore = createMockSupabase().store;

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => createMockSupabase(mockStore),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { logAdminAction } from '@/lib/audit-logger';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ADMIN_WALLET = 'GAsAdminWallet1';
const TARGET_ID = 'claim-target-1';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('logAdminAction — happy path', () => {
  beforeEach(() => {
    mockStore.clear();
    vi.clearAllMocks();
  });

  it('inserts an audit_log row with correct actor fields', async () => {
    await logAdminAction({
      adminWallet: ADMIN_WALLET,
      action: 'claim_approved',
      targetType: 'claim',
      targetId: TARGET_ID,
    });

    const logs = mockStore.getTable('audit_logs');
    expect(logs).toHaveLength(1);
    expect(logs[0].actor_type).toBe('admin');
    expect(logs[0].actor_id).toBe(ADMIN_WALLET);
    expect(logs[0].action).toBe('claim_approved');
    expect(logs[0].target_type).toBe('claim');
    expect(logs[0].target_id).toBe(TARGET_ID);
  });

  it('includes before/after state in payload_json', async () => {
    const beforeState = { status: 'pending' };
    const afterState = { status: 'approved' };

    await logAdminAction({
      adminWallet: ADMIN_WALLET,
      action: 'claim_status_changed',
      targetType: 'claim',
      targetId: TARGET_ID,
      beforeState,
      afterState,
    });

    const logs = mockStore.getTable('audit_logs');
    expect(logs[0].payload_json.before).toEqual(beforeState);
    expect(logs[0].payload_json.after).toEqual(afterState);
  });

  it('spreads metadata into payload_json', async () => {
    await logAdminAction({
      adminWallet: ADMIN_WALLET,
      action: 'user_banned',
      targetType: 'user',
      targetId: 'user-123',
      metadata: { reason: 'sybil_attack', notes: 'Multiple duplicate receipts' },
    });

    const logs = mockStore.getTable('audit_logs');
    expect(logs[0].payload_json.reason).toBe('sybil_attack');
    expect(logs[0].payload_json.notes).toBe('Multiple duplicate receipts');
  });

  it('works without optional beforeState, afterState, metadata', async () => {
    await expect(
      logAdminAction({
        adminWallet: ADMIN_WALLET,
        action: 'admin_login',
        targetType: 'session',
        targetId: 'session-abc',
      })
    ).resolves.toBeUndefined();

    const logs = mockStore.getTable('audit_logs');
    expect(logs).toHaveLength(1);
    expect(logs[0].payload_json.before).toBeUndefined();
    expect(logs[0].payload_json.after).toBeUndefined();
  });
});

describe('logAdminAction — multiple actions', () => {
  beforeEach(() => {
    mockStore.clear();
    vi.clearAllMocks();
  });

  it('inserts separate rows for each action', async () => {
    await logAdminAction({
      adminWallet: ADMIN_WALLET,
      action: 'claim_approved',
      targetType: 'claim',
      targetId: 'claim-1',
    });

    await logAdminAction({
      adminWallet: ADMIN_WALLET,
      action: 'claim_rejected',
      targetType: 'claim',
      targetId: 'claim-2',
    });

    const logs = mockStore.getTable('audit_logs');
    expect(logs).toHaveLength(2);
    expect(logs.map((l) => l.action)).toContain('claim_approved');
    expect(logs.map((l) => l.action)).toContain('claim_rejected');
  });
});

describe('logAdminAction — idempotency', () => {
  beforeEach(() => {
    mockStore.clear();
    vi.clearAllMocks();
  });

  it('calling twice with same params inserts two rows (audit trail must be append-only)', async () => {
    const params = {
      adminWallet: ADMIN_WALLET,
      action: 'claim_approved',
      targetType: 'claim',
      targetId: TARGET_ID,
    };

    await logAdminAction(params);
    await logAdminAction(params);

    // Audit logs are intentionally non-deduped — every action creates a record
    const logs = mockStore.getTable('audit_logs');
    expect(logs).toHaveLength(2);
  });
});

describe('logAdminAction — payload merging edge cases', () => {
  beforeEach(() => {
    mockStore.clear();
    vi.clearAllMocks();
  });

  it('metadata keys do not override before/after keys', async () => {
    await logAdminAction({
      adminWallet: ADMIN_WALLET,
      action: 'test_action',
      targetType: 'claim',
      targetId: TARGET_ID,
      beforeState: { status: 'pending' },
      afterState: { status: 'approved' },
      metadata: { extra: 'info', arbitraryKey: 'value' },
    });

    const logs = mockStore.getTable('audit_logs');
    expect(logs[0].payload_json.before).toEqual({ status: 'pending' });
    expect(logs[0].payload_json.after).toEqual({ status: 'approved' });
    expect(logs[0].payload_json.extra).toBe('info');
  });
});
