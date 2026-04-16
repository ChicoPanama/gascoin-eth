import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  recordGasPrice,
  getTypicalGasPrice,
  detectStationPattern,
  updateQualityTrend,
  snapshotTreasury,
} from '@/lib/data-intelligence';

// ─── Supabase mock builder ────────────────────────────────────────────────────

function makeSupabase(overrides: Record<string, any> = {}) {
  const chain: Record<string, any> = {
    insert: vi.fn().mockResolvedValue({ error: null }),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    update: vi.fn().mockReturnThis(),
    ...overrides,
  };
  chain.from = vi.fn().mockReturnValue(chain);
  return chain;
}

// ─── recordGasPrice ───────────────────────────────────────────────────────────

describe('recordGasPrice', () => {
  it('inserts a row with expected fields', async () => {
    const sb = makeSupabase();
    await recordGasPrice(sb, { country: 'US', currency: 'USD', amountUsd: 52.40 });
    expect(sb.from).toHaveBeenCalledWith('gas_city_prices');
    expect(sb.insert).toHaveBeenCalledWith(expect.objectContaining({
      country: 'US',
      currency: 'USD',
      amount_usd: 52.40,
      source: 'submission_ocr',
    }));
  });

  it('skips insert when country is null', async () => {
    const sb = makeSupabase();
    await recordGasPrice(sb, { country: null, currency: 'USD', amountUsd: 52.40 });
    expect(sb.insert).not.toHaveBeenCalled();
  });

  it('skips insert when amountUsd is 0', async () => {
    const sb = makeSupabase();
    await recordGasPrice(sb, { country: 'US', currency: 'USD', amountUsd: 0 });
    expect(sb.insert).not.toHaveBeenCalled();
  });

  it('skips insert when amountUsd is negative', async () => {
    const sb = makeSupabase();
    await recordGasPrice(sb, { country: 'US', currency: 'USD', amountUsd: -5 });
    expect(sb.insert).not.toHaveBeenCalled();
  });

  it('defaults currency to USD when null', async () => {
    const sb = makeSupabase();
    await recordGasPrice(sb, { country: 'US', currency: null, amountUsd: 40 });
    expect(sb.insert).toHaveBeenCalledWith(expect.objectContaining({ currency: 'USD' }));
  });

  it('does not throw on Supabase error (non-blocking)', async () => {
    const sb = makeSupabase({ insert: vi.fn().mockRejectedValue(new Error('DB error')) });
    await expect(recordGasPrice(sb, { country: 'US', currency: 'USD', amountUsd: 50 })).resolves.not.toThrow();
  });
});

// ─── getTypicalGasPrice ───────────────────────────────────────────────────────

describe('getTypicalGasPrice', () => {
  it('returns median and sample size for sufficient data', async () => {
    const amounts = [30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
    const sb = makeSupabase({
      limit: vi.fn().mockResolvedValue({
        data: amounts.map((a) => ({ amount_usd: a })),
        error: null,
      }),
    });
    const result = await getTypicalGasPrice(sb, 'US');
    expect(result.sampleSize).toBe(10);
    expect(result.median).toBe(75); // median of 10 values sorted: (70+80)/2 = 75
  });

  it('returns median=null when fewer than 10 data points', async () => {
    const sb = makeSupabase({
      limit: vi.fn().mockResolvedValue({
        data: [{ amount_usd: 50 }, { amount_usd: 60 }],
        error: null,
      }),
    });
    const result = await getTypicalGasPrice(sb, 'US');
    expect(result.median).toBeNull();
    expect(result.sampleSize).toBe(2);
  });

  it('returns median=null and sampleSize=0 on query error', async () => {
    const sb = makeSupabase({
      limit: vi.fn().mockResolvedValue({ data: null, error: new Error('query failed') }),
    });
    const result = await getTypicalGasPrice(sb, 'US');
    expect(result.median).toBeNull();
    expect(result.sampleSize).toBe(0);
  });

  it('returns median=null on Supabase exception (non-blocking)', async () => {
    const sb = makeSupabase({ limit: vi.fn().mockRejectedValue(new Error('timeout')) });
    const result = await getTypicalGasPrice(sb, 'US');
    expect(result.median).toBeNull();
    expect(result.sampleSize).toBe(0);
  });

  it('queries only the specified country', async () => {
    const sb = makeSupabase();
    await getTypicalGasPrice(sb, 'CA');
    expect(sb.eq).toHaveBeenCalledWith('country', 'CA');
  });

  it('computes odd-length median correctly', async () => {
    // 11 values: sorted [10,20,30,40,50,60,70,80,90,100,110] → median=60
    const amounts = [10, 110, 60, 20, 100, 30, 90, 40, 80, 50, 70];
    const sb = makeSupabase({
      limit: vi.fn().mockResolvedValue({
        data: amounts.map((a) => ({ amount_usd: a })),
        error: null,
      }),
    });
    const result = await getTypicalGasPrice(sb, 'US');
    expect(result.median).toBe(60);
  });
});

// ─── detectStationPattern ─────────────────────────────────────────────────────

describe('detectStationPattern — short OCR', () => {
  it('returns suspicious=false for null OCR', async () => {
    const sb = makeSupabase();
    const result = await detectStationPattern(sb, 'wallet1', null);
    expect(result.suspicious).toBe(false);
    expect(result.signal).toBe('insufficient_ocr');
    expect(sb.from).not.toHaveBeenCalled();
  });

  it('returns suspicious=false for OCR shorter than 20 chars', async () => {
    const sb = makeSupabase();
    const result = await detectStationPattern(sb, 'wallet1', 'SHELL');
    expect(result.suspicious).toBe(false);
    expect(result.signal).toBe('insufficient_ocr');
  });
});

describe('detectStationPattern — station matching', () => {
  function makeSb(receipts: Array<{ ocr_text: string; wallet: string }>) {
    return makeSupabase({
      limit: vi.fn().mockResolvedValue({
        data: receipts.map((r) => ({
          claim_id: `claim-${r.wallet}`,
          ocr_text: r.ocr_text,
          claims: { wallet: r.wallet, created_at: new Date().toISOString() },
        })),
        error: null,
      }),
    });
  }

  it('returns suspicious=false when no other wallets match the station', async () => {
    const sb = makeSb([
      { ocr_text: 'BP STATION\nTotal: $45.00', wallet: 'wallet2' },
      { ocr_text: 'CHEVRON GAS\nTotal: $62.00', wallet: 'wallet3' },
    ]);
    const result = await detectStationPattern(sb, 'wallet1', 'SHELL STATION #4521\nTotal: $52.00');
    expect(result.suspicious).toBe(false);
  });

  it('returns suspicious=true when 2+ other wallets use the same station', async () => {
    const sb = makeSb([
      { ocr_text: 'SHELL STATION #4521\nGallon $3.99', wallet: 'wallet2' },
      { ocr_text: 'SHELL STATION\nUnleaded Total $50', wallet: 'wallet3' },
    ]);
    const result = await detectStationPattern(sb, 'wallet1', 'SHELL STATION #4521\nTotal: $52.00');
    expect(result.suspicious).toBe(true);
    expect(result.matchCount).toBeGreaterThanOrEqual(3); // 2 others + this wallet
  });

  it('includes station name in signal when suspicious', async () => {
    const sb = makeSb([
      { ocr_text: 'SHELL STATION 4521\nGallon 3.99', wallet: 'wallet2' },
      { ocr_text: 'SHELL STATION\nUnleaded 50', wallet: 'wallet3' },
    ]);
    const result = await detectStationPattern(sb, 'wallet1', 'SHELL STATION 4521\nTotal 52');
    expect(result.signal).toContain('same_station');
  });

  it('returns suspicious=false with only 1 other matching wallet', async () => {
    const sb = makeSb([
      { ocr_text: 'SHELL STATION #4521\nGallon $3.99', wallet: 'wallet2' },
      { ocr_text: 'BP STATION\nGallon $4.10', wallet: 'wallet3' },
    ]);
    const result = await detectStationPattern(sb, 'wallet1', 'SHELL STATION #4521\nTotal $52.00');
    expect(result.suspicious).toBe(false);
  });

  it('excludes submitting wallet from the comparison query', async () => {
    const sb = makeSb([]);
    await detectStationPattern(sb, 'my-wallet', 'SHELL STATION #4521\nTotal $52.00');
    expect(sb.neq).toHaveBeenCalledWith('claims.wallet', 'my-wallet');
  });

  it('returns suspicious=false and signal=query_error on DB error', async () => {
    const sb = makeSupabase({
      limit: vi.fn().mockResolvedValue({ data: null, error: new Error('DB failure') }),
    });
    const result = await detectStationPattern(sb, 'wallet1', 'SHELL STATION #4521\nTotal $52.00');
    expect(result.suspicious).toBe(false);
    expect(result.signal).toBe('query_error');
  });

  it('does not throw on Supabase exception (non-blocking)', async () => {
    const sb = makeSupabase({ limit: vi.fn().mockRejectedValue(new Error('timeout')) });
    await expect(
      detectStationPattern(sb, 'wallet1', 'SHELL STATION #4521\nTotal $52.00'),
    ).resolves.not.toThrow();
  });
});

// ─── updateQualityTrend ───────────────────────────────────────────────────────

describe('updateQualityTrend', () => {
  it('computes average of last 10 scores and updates wallet_x_links', async () => {
    const scores = [0.5, 0.6, 0.7, 0.8, 0.9, 0.4, 0.3, 0.7, 0.8, 0.6];
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq: updateEq });
    const sb = makeSupabase({
      limit: vi.fn().mockResolvedValue({
        data: scores.map((q) => ({ quality_score: q })),
        error: null,
      }),
      update,
    });
    await updateQualityTrend(sb, 'wallet1', 0.7);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      avg_quality_score: expect.any(Number),
    }));
  });

  it('skips update when no scores exist', async () => {
    const update = vi.fn();
    const sb = makeSupabase({
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      update,
    });
    await updateQualityTrend(sb, 'wallet1', 0.7);
    expect(update).not.toHaveBeenCalled();
  });

  it('does not throw on DB error (non-blocking)', async () => {
    const sb = makeSupabase({ limit: vi.fn().mockRejectedValue(new Error('timeout')) });
    await expect(updateQualityTrend(sb, 'wallet1', 0.7)).resolves.not.toThrow();
  });
});

// ─── snapshotTreasury ─────────────────────────────────────────────────────────

describe('snapshotTreasury', () => {
  it('inserts treasury snapshot with all balances', async () => {
    const sb = makeSupabase();
    await snapshotTreasury(sb, { solBalance: 100, solUsd: 1500, gascoinBalance: 5000000, gascoinUsd: 250 });
    expect(sb.from).toHaveBeenCalledWith('treasury_snapshots');
    expect(sb.insert).toHaveBeenCalledWith(expect.objectContaining({
      sol_balance: 100,
      usd_value: 1500,
      gascoin_balance: 5000000,
      gascoin_usd_value: 250,
    }));
  });

  it('does not throw on DB error (non-blocking)', async () => {
    const sb = makeSupabase({ insert: vi.fn().mockRejectedValue(new Error('connection lost')) });
    await expect(
      snapshotTreasury(sb, { solBalance: 100, solUsd: 1500, gascoinBalance: 5000000, gascoinUsd: 250 }),
    ).resolves.not.toThrow();
  });
});
