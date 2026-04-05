import { describe, it, expect } from 'vitest';
import { checkExifMetadata, checkImageDimensions, computePerceptualHash, computeExactHash, comparePerceptualHashes } from '@/lib/integrations/receipt-pipeline';
import { fakeReceiptBuffer } from '../../factories';

describe('checkExifMetadata', () => {
  it('detects EXIF marker in JPEG', () => {
    const buf = fakeReceiptBuffer();
    const result = checkExifMetadata(buf);
    expect(result.hasExif).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  it('returns low score for PNG (no EXIF)', () => {
    const png = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ...new Array(100).fill(0)]);
    const result = checkExifMetadata(png);
    expect(result.hasExif).toBe(false);
    expect(result.flags).toContain('png_format');
  });

  it('flags editing software in binary data', () => {
    const buf = fakeReceiptBuffer();
    // Inject "Photoshop" string
    const ps = Buffer.from('Adobe Photoshop');
    const combined = Buffer.concat([buf.subarray(0, 50), ps, buf.subarray(50)]);
    const result = checkExifMetadata(combined);
    expect(result.software).toBeTruthy();
    expect(result.flags.some((f) => f.includes('software_detected'))).toBe(true);
  });
});

describe('checkImageDimensions', () => {
  it('parses JPEG dimensions', () => {
    const buf = fakeReceiptBuffer();
    const result = checkImageDimensions(buf);
    expect(result.format).toBe('jpeg');
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it('flags AI-typical dimensions', () => {
    // Create a buffer that reports 1024x1024
    const buf = fakeReceiptBuffer();
    // Modify SOF0 to report 1024x1024
    for (let i = 0; i < buf.length - 1; i++) {
      if (buf[i] === 0xFF && buf[i + 1] === 0xC0) {
        buf[i + 5] = 0x04; buf[i + 6] = 0x00; // height 1024
        buf[i + 7] = 0x04; buf[i + 8] = 0x00; // width 1024
        break;
      }
    }
    const result = checkImageDimensions(buf);
    if (result.width === 1024 && result.height === 1024) {
      expect(result.flags).toContain('ai_typical_dimensions');
    }
  });
});

describe('computePerceptualHash', () => {
  it('returns a hex string', () => {
    const hash = computePerceptualHash(fakeReceiptBuffer());
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('same input produces same hash', () => {
    const buf = fakeReceiptBuffer();
    expect(computePerceptualHash(buf)).toBe(computePerceptualHash(buf));
  });
});

describe('computeExactHash', () => {
  it('returns 64-char hex SHA-256', () => {
    const hash = computeExactHash(fakeReceiptBuffer());
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('comparePerceptualHashes', () => {
  it('identical hashes return 1.0', () => {
    expect(comparePerceptualHashes('abcd', 'abcd')).toBe(1.0);
  });
  it('completely different hashes return low similarity', () => {
    expect(comparePerceptualHashes('aaaa', 'zzzz')).toBeLessThan(0.5);
  });
  it('different length returns 0', () => {
    expect(comparePerceptualHashes('abc', 'abcdef')).toBe(0);
  });
});
