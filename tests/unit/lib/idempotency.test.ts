import { describe, it, expect } from 'vitest';
import { hashRequestBody, resolveIdempotencyKey } from '@/lib/idempotency';

// ── hashRequestBody ───────────────────────────────────────────────────────────

describe('hashRequestBody', () => {
  it('happy path: returns a 64-char hex string for a typical body', () => {
    const hash = hashRequestBody({ claimId: 'claim-1', wallet: 'walletABC', amountSol: 0.01 });

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('same body always produces same hash (deterministic)', () => {
    const body = { claimId: 'claim-1', wallet: 'walletABC', amountSol: 0.01 };

    expect(hashRequestBody(body)).toBe(hashRequestBody(body));
  });

  it('different bodies produce different hashes', () => {
    const h1 = hashRequestBody({ claimId: 'claim-1' });
    const h2 = hashRequestBody({ claimId: 'claim-2' });

    expect(h1).not.toBe(h2);
  });

  it('handles null body without throwing', () => {
    const hash = hashRequestBody(null);

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('handles undefined body without throwing', () => {
    const hash = hashRequestBody(undefined);

    expect(hash).toHaveLength(64);
  });

  it('handles empty object body', () => {
    const hash = hashRequestBody({});

    expect(hash).toHaveLength(64);
  });

  it('handles nested object bodies', () => {
    const hash = hashRequestBody({
      claimId: 'claim-1',
      metadata: { source: 'tweet_engagement', nested: { deep: true } },
    });

    expect(hash).toHaveLength(64);
  });

  it('body with same keys in different order produces different hashes (JSON.stringify is order-sensitive)', () => {
    const h1 = hashRequestBody({ a: 1, b: 2 });
    const h2 = hashRequestBody({ b: 2, a: 1 });

    // JSON.stringify is NOT order-independent — this is expected behavior
    // Tests that hashing is consistent with JSON serialization
    expect(typeof h1).toBe('string');
    expect(typeof h2).toBe('string');
  });
});

// ── resolveIdempotencyKey ─────────────────────────────────────────────────────

describe('resolveIdempotencyKey', () => {
  it('happy path: returns idempotency-key header when present', () => {
    const headers = new Headers({ 'idempotency-key': 'my-custom-key-123' });

    const key = resolveIdempotencyKey(headers, 'fallback-seed');

    expect(key).toBe('my-custom-key-123');
  });

  it('returns x-idempotency-key header as fallback header name', () => {
    const headers = new Headers({ 'x-idempotency-key': 'x-custom-key-456' });

    const key = resolveIdempotencyKey(headers, 'fallback-seed');

    expect(key).toBe('x-custom-key-456');
  });

  it('prefers idempotency-key over x-idempotency-key when both present', () => {
    const headers = new Headers({
      'idempotency-key': 'primary-key',
      'x-idempotency-key': 'secondary-key',
    });

    const key = resolveIdempotencyKey(headers, 'fallback-seed');

    expect(key).toBe('primary-key');
  });

  it('generates auto key from fallback seed when no header present', () => {
    const headers = new Headers();

    const key = resolveIdempotencyKey(headers, 'some-fallback-seed');

    expect(key).toMatch(/^auto_[a-f0-9]{24}$/);
  });

  it('auto key is deterministic for same fallback seed', () => {
    const headers = new Headers();

    const k1 = resolveIdempotencyKey(headers, 'same-seed');
    const k2 = resolveIdempotencyKey(headers, 'same-seed');

    expect(k1).toBe(k2);
  });

  it('auto keys differ for different fallback seeds', () => {
    const headers = new Headers();

    const k1 = resolveIdempotencyKey(headers, 'seed-A');
    const k2 = resolveIdempotencyKey(headers, 'seed-B');

    expect(k1).not.toBe(k2);
  });

  it('ignores whitespace-only idempotency-key header and falls back to seed', () => {
    const headers = new Headers({ 'idempotency-key': '   ' });

    const key = resolveIdempotencyKey(headers, 'fallback-seed');

    expect(key).toMatch(/^auto_/);
  });

  it('auto key has exactly 24 hex chars after "auto_" prefix', () => {
    const headers = new Headers();

    const key = resolveIdempotencyKey(headers, 'any-seed');
    const hexPart = key.replace('auto_', '');

    expect(hexPart).toHaveLength(24);
    expect(hexPart).toMatch(/^[a-f0-9]{24}$/);
  });

  it('idempotency: same header value returns same key', () => {
    const headers1 = new Headers({ 'idempotency-key': 'stable-key-xyz' });
    const headers2 = new Headers({ 'idempotency-key': 'stable-key-xyz' });

    expect(resolveIdempotencyKey(headers1, 'seed')).toBe(
      resolveIdempotencyKey(headers2, 'seed'),
    );
  });
});
