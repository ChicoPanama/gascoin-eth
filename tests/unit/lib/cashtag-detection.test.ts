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

/**
 * Verifies the @GasCoinApp mention regex used in lib/integrations/x.ts.
 * The mention gate requires every submitted tweet to tag @GasCoinApp so
 * new readers can find the official profile — it's the primary organic
 * growth vector for the brand.
 */
const GASCOINAPP_MENTION = /@gascoinapp\b/i;

describe('@GasCoinApp mention regex', () => {
  it('accepts @GasCoinApp canonical casing', () => {
    expect(GASCOINAPP_MENTION.test('Hey @GasCoinApp, just submitted my receipt')).toBe(true);
  });

  it('accepts @gascoinapp lowercase', () => {
    expect(GASCOINAPP_MENTION.test('gm @gascoinapp')).toBe(true);
  });

  it('accepts @GASCOINAPP uppercase', () => {
    expect(GASCOINAPP_MENTION.test('@GASCOINAPP season 1')).toBe(true);
  });

  it('accepts mention at the start of the tweet', () => {
    expect(GASCOINAPP_MENTION.test('@GasCoinApp let\'s go')).toBe(true);
  });

  it('accepts mention at the end of the tweet', () => {
    expect(GASCOINAPP_MENTION.test('Just posted my proof — check @GasCoinApp')).toBe(true);
  });

  it('accepts mention followed by punctuation', () => {
    expect(GASCOINAPP_MENTION.test('Thanks @GasCoinApp!')).toBe(true);
  });

  it('rejects @gascoinappbot (word boundary must stop substring match)', () => {
    expect(GASCOINAPP_MENTION.test('Hey @gascoinappbot')).toBe(false);
  });

  it('rejects @gascoinapp_fan (word boundary must stop underscore continuation)', () => {
    // \b doesn't treat _ as a boundary in JS regex, so @gascoinapp_fan
    // does contain a word boundary between "gascoinapp" and "_fan"... wait,
    // no — \b only matches between \w and \W. _ is \w, so \b does NOT
    // match between "gascoinapp" and "_". The regex should therefore
    // REJECT @gascoinapp_fan.
    expect(GASCOINAPP_MENTION.test('@gascoinapp_fan')).toBe(false);
  });

  it('rejects gascoinapp without @ prefix', () => {
    expect(GASCOINAPP_MENTION.test('I love gascoinapp')).toBe(false);
  });

  it('rejects @gascoin (different handle)', () => {
    expect(GASCOINAPP_MENTION.test('Hey @gascoin')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(GASCOINAPP_MENTION.test('')).toBe(false);
  });

  it('accepts a realistic full tweet that tags, hashtags, and cashtags', () => {
    const tweet = 'Just submitted my gas receipt @GasCoinApp! Check out this new protocol $GASCOIN #gascoin';
    expect(GASCOINAPP_MENTION.test(tweet)).toBe(true);
    expect(HASHTAG_OR_CASHTAG.test(tweet)).toBe(true);
  });
});
