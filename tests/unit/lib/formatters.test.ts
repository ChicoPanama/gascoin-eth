import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { truncateWallet, formatSol, timeAgo, formatRank } from '@/lib/formatters';

describe('truncateWallet', () => {
  it('truncates to 4 chars each side', () => {
    const r = truncateWallet('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
    expect(r).toBe('0x742d...f44e');
  });
  it('returns short address unchanged', () => { expect(truncateWallet('short')).toBe('short'); });
});

describe('formatSol', () => {
  it('formats to 4dp', () => { expect(formatSol(0.05)).toBe('0.0500 SOL'); });
  it('handles zero', () => { expect(formatSol(0)).toBe('0.0000 SOL'); });
});

describe('timeAgo', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2025-04-01T12:00:00Z')); });
  afterEach(() => { vi.useRealTimers(); });

  it('seconds', () => { expect(timeAgo(new Date('2025-04-01T11:59:30Z'))).toBe('30s ago'); });
  it('minutes', () => { expect(timeAgo(new Date('2025-04-01T11:55:00Z'))).toBe('5m ago'); });
  it('hours', () => { expect(timeAgo(new Date('2025-04-01T10:00:00Z'))).toBe('2h ago'); });
  it('days', () => { expect(timeAgo(new Date('2025-03-29T12:00:00Z'))).toBe('3d ago'); });
});

describe('formatRank', () => {
  it('prefixes with #', () => { expect(formatRank(1)).toBe('#1'); });
});
