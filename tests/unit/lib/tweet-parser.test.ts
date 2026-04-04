import { describe, it, expect } from 'vitest';
import { parseTweetUrl } from '@/lib/tweet-parser';

describe('parseTweetUrl', () => {
  it('parses valid x.com URL', () => {
    const r = parseTweetUrl('https://x.com/testuser/status/1234567890123456789');
    expect(r.isValid).toBe(true);
    expect(r.tweetId).toBe('1234567890123456789');
    expect(r.handle).toBe('testuser');
  });

  it('parses twitter.com URL', () => {
    expect(parseTweetUrl('https://twitter.com/user/status/123').isValid).toBe(true);
  });

  it('strips query params', () => {
    const r = parseTweetUrl('https://x.com/user/status/123?s=20');
    expect(r.tweetId).toBe('123');
  });

  it('rejects missing /status/', () => {
    expect(parseTweetUrl('https://x.com/user/123').isValid).toBe(false);
  });

  it('rejects non-numeric tweetId', () => {
    expect(parseTweetUrl('https://x.com/user/status/abc').isValid).toBe(false);
  });

  it('rejects non-X domain', () => {
    expect(parseTweetUrl('https://facebook.com/status/123').isValid).toBe(false);
  });

  it('rejects empty string', () => {
    expect(parseTweetUrl('').isValid).toBe(false);
  });

  it('handles underscores in handle', () => {
    expect(parseTweetUrl('https://x.com/user_name_123/status/123').isValid).toBe(true);
  });
});
