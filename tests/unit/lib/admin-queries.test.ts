import { describe, it, expect } from 'vitest';
import { validateSelect, SCHEMA } from '../../mocks/schema';
import {
  fakePayoutJob,
  fakeClaim,
  fakePayout,
} from '../../factories/index';

/**
 * Admin query validation — validates the exact select strings used in
 * production admin pages against the real Supabase schema.
 *
 * When you change a query in an admin page, update the corresponding
 * test here. This catches column mismatches BEFORE deployment.
 */

describe('Admin Treasury page queries', () => {
  it('payout_jobs count query is valid', () => {
    // from('payout_jobs').select('*', { count: 'exact', head: true }).eq('status', 'queued')
    expect(SCHEMA.payout_jobs).toContain('status');
  });

  it('referral_conversions count query is valid', () => {
    // from('referral_conversions').select('*', { count: 'exact', head: true }).eq('reward_status', 'pending')
    expect(SCHEMA.referral_conversions).toContain('reward_status');
  });

  it('payout_jobs detail select uses only valid columns', () => {
    // from('payout_jobs').select('id, claim_id, wallet, amount_eth, status, created_at')
    const errors = validateSelect(
      'payout_jobs',
      'id, claim_id, wallet, amount_eth, status, created_at'
    );
    expect(errors).toEqual([]);
  });

  it('payout_jobs does NOT have tx_signature', () => {
    expect(SCHEMA.payout_jobs).not.toContain('tx_signature');
  });

  it('payouts has tx_hash (not tx_signature)', () => {
    expect(SCHEMA.payouts).toContain('tx_hash');
    expect(SCHEMA.payouts).not.toContain('tx_signature');
  });
});

describe('Admin Receipts page queries', () => {
  it('claims with nested claim_receipts select is valid', () => {
    const errors = validateSelect(
      'claims',
      'id, wallet, status, created_at, claim_receipts (id, storage_path_private, is_image_redacted, ocr_confidence, created_at)'
    );
    expect(errors).toEqual([]);
  });

  it('claim_receipts does NOT have legacy columns', () => {
    expect(SCHEMA.claim_receipts).not.toContain('storage_path');
    expect(SCHEMA.claim_receipts).not.toContain('file_name');
    expect(SCHEMA.claim_receipts).not.toContain('mime_type');
  });

  it('claim_receipts has storage_path_private', () => {
    expect(SCHEMA.claim_receipts).toContain('storage_path_private');
  });
});

describe('Factory shapes match schema', () => {
  it('fakePayoutJob keys are valid payout_jobs columns', () => {
    const job = fakePayoutJob();
    const validCols = SCHEMA.payout_jobs;
    for (const key of Object.keys(job)) {
      expect(validCols, `Factory key "${key}" is not a valid payout_jobs column`).toContain(key);
    }
  });

  it('fakeClaim keys are valid claims columns', () => {
    const claim = fakeClaim();
    const validCols = SCHEMA.claims;
    for (const key of Object.keys(claim)) {
      expect(validCols, `Factory key "${key}" is not a valid claims column`).toContain(key);
    }
  });

  it('fakePayout keys are valid payouts columns', () => {
    const payout = fakePayout();
    const validCols = SCHEMA.payouts;
    for (const key of Object.keys(payout)) {
      expect(validCols, `Factory key "${key}" is not a valid payouts column`).toContain(key);
    }
  });
});
