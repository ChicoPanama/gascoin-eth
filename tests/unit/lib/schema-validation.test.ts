import { describe, it, expect } from 'vitest';
import { validateSelect, SCHEMA, VIEWS } from '../../mocks/schema';
import { GATES } from '@/lib/gates';

/**
 * Schema validation tests — catch column/table mismatches at test time
 * instead of discovering them in production.
 *
 * These tests parse the actual select strings used in production code
 * and validate them against the real Supabase schema.
 */

describe('Schema: admin/treasury queries', () => {
  it('payout_jobs select uses only valid columns', () => {
    const errors = validateSelect(
      'payout_jobs',
      'id, claim_id, wallet, amount_sol, status, created_at'
    );
    expect(errors).toEqual([]);
  });

  it('payout_jobs does NOT have tx_signature (belongs to payouts.tx_hash)', () => {
    expect(SCHEMA.payout_jobs).not.toContain('tx_signature');
    expect(SCHEMA.payouts).toContain('tx_hash');
  });

  it('referral_conversions count query is valid', () => {
    expect(SCHEMA.referral_conversions).toContain('reward_status');
  });
});

describe('Schema: admin/receipts queries', () => {
  it('claim_receipts nested select uses only valid columns', () => {
    const errors = validateSelect(
      'claims',
      `id, wallet, status, created_at, claim_receipts (id, storage_path_private, is_image_redacted, ocr_confidence, created_at)`
    );
    expect(errors).toEqual([]);
  });

  it('claim_receipts does NOT have storage_path, file_name, or mime_type', () => {
    expect(SCHEMA.claim_receipts).not.toContain('storage_path');
    expect(SCHEMA.claim_receipts).not.toContain('file_name');
    expect(SCHEMA.claim_receipts).not.toContain('mime_type');
    expect(SCHEMA.claim_receipts).toContain('storage_path_private');
  });
});

describe('Schema: gate views', () => {
  it('gate_stats_view exists with expected columns', () => {
    expect(VIEWS.gate_stats_view).toBeDefined();
    expect(VIEWS.gate_stats_view).toContain('gate_id');
    expect(VIEWS.gate_stats_view).toContain('total_processed');
    expect(VIEWS.gate_stats_view).toContain('total_passed');
    expect(VIEWS.gate_stats_view).toContain('total_failed');
    expect(VIEWS.gate_stats_view).toContain('pass_rate_pct');
  });

  it('gate_failure_reasons_view exists with expected columns', () => {
    expect(VIEWS.gate_failure_reasons_view).toBeDefined();
    expect(VIEWS.gate_failure_reasons_view).toContain('gate_id');
    expect(VIEWS.gate_failure_reasons_view).toContain('failure_reason');
    expect(VIEWS.gate_failure_reasons_view).toContain('occurrence_count');
    expect(VIEWS.gate_failure_reasons_view).toContain('pct_of_gate_failures');
  });
});

describe('Schema: GATES policyGate mapping', () => {
  const VALID_POLICY_GATES = [
    'x_verified', 'tweet_hashtag', 'tweet_live', 'receipt_hashtag',
    'wallet_match', 'gascoin_min_hold', 'not_duplicate',
    'ai_image_check', 'tamper_check', 'cooldown',
    'min_followers', 'account_quality',
  ];

  it('every GATE has a policyGate field', () => {
    for (const gate of GATES) {
      expect(gate.policyGate, `Gate ${gate.id} (${gate.slug}) missing policyGate`).toBeTruthy();
    }
  });

  it('every policyGate maps to a real policy engine gate', () => {
    for (const gate of GATES) {
      expect(
        VALID_POLICY_GATES,
        `Gate ${gate.id} policyGate "${gate.policyGate}" is not a valid policy gate`
      ).toContain(gate.policyGate);
    }
  });

  it('policyGate values are unique across GATES', () => {
    const policyGates = GATES.map((g) => g.policyGate);
    expect(new Set(policyGates).size).toBe(policyGates.length);
  });
});

describe('Schema: claims table', () => {
  it('has ip_country column', () => {
    expect(SCHEMA.claims).toContain('ip_country');
  });

  it('submit route select uses valid columns', () => {
    const errors = validateSelect('claims', 'id, user_id, wallet, status, created_at, ip_country');
    expect(errors).toEqual([]);
  });
});

describe('Schema: wallet_x_links table', () => {
  it('has all enrichment columns from metrics migration', () => {
    expect(SCHEMA.wallet_x_links).toContain('x_location');
    expect(SCHEMA.wallet_x_links).toContain('bio');
    expect(SCHEMA.wallet_x_links).toContain('avg_quality_score');
    expect(SCHEMA.wallet_x_links).toContain('x_account_created_at');
    expect(SCHEMA.wallet_x_links).toContain('x_is_protected');
  });
});

describe('Schema: user_metrics_history table', () => {
  it('exists with expected columns', () => {
    expect(SCHEMA.user_metrics_history).toBeDefined();
    expect(SCHEMA.user_metrics_history).toContain('user_id');
    expect(SCHEMA.user_metrics_history).toContain('wallet');
    expect(SCHEMA.user_metrics_history).toContain('follower_count');
    expect(SCHEMA.user_metrics_history).toContain('snapshot_source');
  });

  it('insert uses valid columns', () => {
    const errors = validateSelect(
      'user_metrics_history',
      'user_id, wallet, x_handle, follower_count, following_count, tweet_count, listed_count, account_quality_score, account_quality_passed, gascoin_balance, tier_id, ip_country, x_location, snapshot_source'
    );
    expect(errors).toEqual([]);
  });
});

describe('Schema: x_handle_history table', () => {
  it('exists with expected columns', () => {
    expect(SCHEMA.x_handle_history).toBeDefined();
    expect(SCHEMA.x_handle_history).toContain('x_user_id');
    expect(SCHEMA.x_handle_history).toContain('old_handle');
    expect(SCHEMA.x_handle_history).toContain('new_handle');
  });
});

describe('validateSelect utility', () => {
  it('catches invalid columns', () => {
    const errors = validateSelect('payout_jobs', 'id, tx_signature, wallet');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('tx_signature');
  });

  it('catches invalid tables', () => {
    const errors = validateSelect('nonexistent_table', 'id');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Unknown table');
  });

  it('validates nested relations', () => {
    const errors = validateSelect(
      'claims',
      'id, claim_receipts (id, fake_column)'
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('fake_column');
  });

  it('passes wildcard select', () => {
    const errors = validateSelect('claims', '*');
    expect(errors).toEqual([]);
  });
});
