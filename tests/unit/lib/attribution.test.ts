import { describe, it, expect } from 'vitest';
import { buildFunnel, STAGE_ORDER, type AttributionStage } from '@/lib/attribution';

describe('STAGE_ORDER', () => {
  it('defines the 5 canonical stages in order', () => {
    expect(STAGE_ORDER).toEqual([
      'impression',
      'profile_click',
      'wallet_connect',
      'submission',
      'payout',
    ]);
  });
});

describe('buildFunnel', () => {
  it('empty events → all stages zero', () => {
    const funnel = buildFunnel([]);
    expect(funnel).toHaveLength(STAGE_ORDER.length);
    for (const s of funnel) {
      expect(s.count).toBe(0);
      expect(s.uniqueWallets).toBe(0);
    }
  });

  it('counts events per stage', () => {
    const funnel = buildFunnel([
      { stage: 'impression', referred_wallet: null, occurred_at: '2026-04-01' },
      { stage: 'impression', referred_wallet: null, occurred_at: '2026-04-02' },
      { stage: 'wallet_connect', referred_wallet: '0xA', occurred_at: '2026-04-03' },
      { stage: 'submission', referred_wallet: '0xA', occurred_at: '2026-04-04' },
      { stage: 'payout', referred_wallet: '0xA', occurred_at: '2026-04-05' },
    ]);
    expect(funnel.find((s) => s.stage === 'impression')?.count).toBe(2);
    expect(funnel.find((s) => s.stage === 'wallet_connect')?.count).toBe(1);
    expect(funnel.find((s) => s.stage === 'payout')?.count).toBe(1);
  });

  it('deduplicates unique wallets per stage', () => {
    const funnel = buildFunnel([
      { stage: 'wallet_connect', referred_wallet: '0xA', occurred_at: '2026-04-01' },
      { stage: 'wallet_connect', referred_wallet: '0xA', occurred_at: '2026-04-02' },
      { stage: 'wallet_connect', referred_wallet: '0xB', occurred_at: '2026-04-03' },
    ]);
    const wc = funnel.find((s) => s.stage === 'wallet_connect');
    expect(wc?.count).toBe(3);
    expect(wc?.uniqueWallets).toBe(2);
  });

  it('computes conversion rate between stages', () => {
    type Evt = { stage: AttributionStage; referred_wallet: string | null; occurred_at: string };
    const events: Evt[] = [
      ...Array.from({ length: 100 }, (): Evt => ({
        stage: 'impression',
        referred_wallet: null,
        occurred_at: '2026-04-01',
      })),
      ...Array.from({ length: 20 }, (_, i): Evt => ({
        stage: 'wallet_connect',
        referred_wallet: `0x${i.toString(16).padStart(2, '0')}`,
        occurred_at: '2026-04-02',
      })),
      ...Array.from({ length: 5 }, (_, i): Evt => ({
        stage: 'payout',
        referred_wallet: `0x${i.toString(16).padStart(2, '0')}`,
        occurred_at: '2026-04-03',
      })),
    ];
    const funnel = buildFunnel(events);
    const impressions = funnel.find((s) => s.stage === 'impression')!;
    const payouts = funnel.find((s) => s.stage === 'payout')!;
    expect(impressions.count).toBe(100);
    expect(payouts.count).toBe(5);
    // impression → payout overall conversion = 5 / 100 = 5%
    expect(payouts.conversionFromTop).toBeCloseTo(0.05, 5);
  });

  it('returns stages in canonical order regardless of input order', () => {
    const funnel = buildFunnel([
      { stage: 'payout', referred_wallet: '0xA', occurred_at: '2026-04-05' },
      { stage: 'impression', referred_wallet: null, occurred_at: '2026-04-01' },
    ]);
    expect(funnel.map((s) => s.stage)).toEqual(STAGE_ORDER);
  });
});
