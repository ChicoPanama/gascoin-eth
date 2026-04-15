import { describe, it, expect } from 'vitest';

/**
 * Verifies the cashtag-aware regex used in lib/integrations/x.ts and
 * lib/gate-verifiers/tweet-gates.ts. The pattern must accept either
 * #gascoin (hashtag) or $gascoin (X cashtag, April 2026) case-insensitively
 * with a word boundary so it doesn't false-positive on substrings.
 *
 * If the regex changes in the source files, update this test in lock-step.
 */
const HASHTAG_OR_CASHTAG = /[#$]gascoin\b/i;

describe('cashtag-aware tweet detection regex', () => {
  it('accepts plain #gascoin', () => {
    expect(HASHTAG_OR_CASHTAG.test('Just got my refund #gascoin')).toBe(true);
  });

  it('accepts plain $GASCOIN', () => {
    expect(HASHTAG_OR_CASHTAG.test('Just got my refund $GASCOIN')).toBe(true);
  });

  it('accepts $gascoin lowercase', () => {
    expect(HASHTAG_OR_CASHTAG.test('Just got my refund $gascoin')).toBe(true);
  });

  it('accepts both #gascoin and $GASCOIN in the same tweet', () => {
    expect(HASHTAG_OR_CASHTAG.test('#gascoin $GASCOIN beta is open')).toBe(true);
  });

  it('accepts #GASCOIN uppercase hashtag', () => {
    expect(HASHTAG_OR_CASHTAG.test('Look at this #GASCOIN refund')).toBe(true);
  });

  it('accepts cashtag at the start of the tweet', () => {
    expect(HASHTAG_OR_CASHTAG.test('$GASCOIN season 1 is open')).toBe(true);
  });

  it('accepts cashtag at the end of the tweet', () => {
    expect(HASHTAG_OR_CASHTAG.test('Just submitted my receipt $GASCOIN')).toBe(true);
  });

  it('accepts hashtag followed by punctuation', () => {
    expect(HASHTAG_OR_CASHTAG.test('Refunded! #gascoin.')).toBe(true);
  });

  it('rejects #gascoinxyz (substring match must fail at word boundary)', () => {
    expect(HASHTAG_OR_CASHTAG.test('Look at this #gascoinxyz')).toBe(false);
  });

  it('rejects $gascoinusd (substring match must fail at word boundary)', () => {
    expect(HASHTAG_OR_CASHTAG.test('Trade $gascoinusd here')).toBe(false);
  });

  it('rejects gascoin without # or $ prefix', () => {
    expect(HASHTAG_OR_CASHTAG.test('I love gascoin so much')).toBe(false);
  });

  it('rejects #gas alone', () => {
    expect(HASHTAG_OR_CASHTAG.test('Just got #gas at the pump')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(HASHTAG_OR_CASHTAG.test('')).toBe(false);
  });
});
