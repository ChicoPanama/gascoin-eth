import { describe, it, expect, beforeAll } from 'vitest';
import { signEnvelope, verifyEnvelope } from '@/lib/response-signer';

beforeAll(() => {
  process.env.GASCOIN_API_SIGNING_KEY = 'test-signing-key-do-not-use-in-prod-32bytes+';
});

describe('signEnvelope', () => {
  it('wraps payload with signature + metadata', () => {
    const env = signEnvelope({ hello: 'world' });
    expect(env.data).toEqual({ hello: 'world' });
    expect(env.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(env.timestamp).toBeGreaterThan(0);
    expect(env.nonce).toMatch(/^[a-f0-9]{16}$/);
    expect(env.keyId).toBe('v1');
  });

  it('produces different signatures for different payloads', () => {
    const a = signEnvelope({ x: 1 });
    const b = signEnvelope({ x: 2 });
    expect(a.signature).not.toBe(b.signature);
  });

  it('produces different signatures for same payload different nonce/ts', () => {
    const a = signEnvelope({ x: 1 });
    const b = signEnvelope({ x: 1 });
    expect(a.signature).not.toBe(b.signature); // nonce differs
  });
});

describe('verifyEnvelope', () => {
  it('verifies a signed envelope', () => {
    const env = signEnvelope({ foo: 'bar' });
    expect(verifyEnvelope(env)).toBe(true);
  });

  it('rejects tampered payload', () => {
    const env = signEnvelope({ foo: 'bar' });
    env.data = { foo: 'evil' } as any;
    expect(verifyEnvelope(env)).toBe(false);
  });

  it('rejects tampered signature', () => {
    const env = signEnvelope({ foo: 'bar' });
    env.signature = '0'.repeat(64);
    expect(verifyEnvelope(env)).toBe(false);
  });

  it('rejects envelopes older than 5 min', () => {
    const env = signEnvelope({ foo: 'bar' });
    env.timestamp = Math.floor(Date.now() / 1000) - 10 * 60;
    expect(verifyEnvelope(env)).toBe(false);
  });
});
