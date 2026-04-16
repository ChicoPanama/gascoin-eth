import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';

// Mock cache so bustEntityProfileCache never touches Redis in unit tests
vi.mock('@/lib/cache', () => ({
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
  cacheGetOrFetch: vi.fn().mockImplementation(async (_key: string, fn: () => unknown) => fn()),
  cacheDel: vi.fn().mockResolvedValue(undefined),
}));

import {
  writeAccountQuality,
  writePipelineAnomaly,
  writeFraudSignal,
  writeDistilledProfile,
  writeBanState,
  getCachedFlags,
  MEM0_CATEGORIES,
  MEM0_AGENTS,
} from '@/lib/mem0';

// ─── Shared mem0 API mock ────────────────────────────────────────────────────

let capturedBody: Record<string, unknown> | null = null;

function useMem0Mock() {
  capturedBody = null;
  server.use(
    http.post('https://api.mem0.ai/v1/memories/', async ({ request }) => {
      capturedBody = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ id: 'mem-test-id', memory: 'stored' });
    }),
  );
}

function stubMem0Env(available = true) {
  vi.stubEnv('MEM0_API_KEY', available ? 'sk-test-key' : '');
  vi.stubEnv('MEM0_ORG_ID', available ? 'org_test' : '');
  vi.stubEnv('MEM0_PROJECT_ID', available ? 'proj_test123' : '');
}

function capturedContent(): string {
  return ((capturedBody?.messages as any[])?.[0]?.content as string) ?? '';
}

// ─── writeAccountQuality ─────────────────────────────────────────────────────

describe('writeAccountQuality', () => {
  beforeEach(() => { useMem0Mock(); stubMem0Env(); });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('writes ACCOUNT_QUALITY category with SUBMIT_PIPELINE agent', async () => {
    await writeAccountQuality('GAsWallet1', { score: 72, passed: true, flags: [], claimId: 'c1' });
    expect(capturedBody?.metadata).toMatchObject({ category: MEM0_CATEGORIES.ACCOUNT_QUALITY });
    expect(capturedBody?.agent_id).toBe(MEM0_AGENTS.SUBMIT_PIPELINE);
  });

  it('memory line contains pass, score, and flags', async () => {
    await writeAccountQuality('GAsWallet1', { score: 35, passed: false, flags: ['low_followers', 'no_bio'] });
    const content = capturedContent();
    expect(content).toContain('account_quality:fail');
    expect(content).toContain('score=35');
    expect(content).toContain('low_followers');
  });

  it('memory line uses pass label when score above threshold', async () => {
    await writeAccountQuality('GAsWallet1', { score: 80, passed: true, flags: [] });
    expect(capturedContent()).toContain('account_quality:pass');
    expect(capturedContent()).toContain('score=80');
  });

  it('does not throw when MEM0 is unavailable', async () => {
    stubMem0Env(false);
    await expect(writeAccountQuality('GAsWallet1', { score: 60, passed: true, flags: [] })).resolves.toBeUndefined();
  });
});

// ─── writePipelineAnomaly ────────────────────────────────────────────────────

describe('writePipelineAnomaly', () => {
  beforeEach(() => { useMem0Mock(); stubMem0Env(); });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('writes PIPELINE_ANOMALY category', async () => {
    await writePipelineAnomaly('GAsWallet1', { type: 'ocr_fallback', detail: 'Gemini unavailable' });
    expect(capturedBody?.metadata).toMatchObject({ category: MEM0_CATEGORIES.PIPELINE_ANOMALY });
  });

  it('memory line contains anomaly type and detail', async () => {
    await writePipelineAnomaly('GAsWallet1', { type: 'x_api_down', detail: 'rate limited', claimId: 'c2' });
    const content = capturedContent();
    expect(content).toContain('anomaly:x_api_down');
    expect(content).toContain('rate limited');
    expect(content).toContain('claim=c2');
  });

  it('has expiration_date set (30-day TTL)', async () => {
    await writePipelineAnomaly('GAsWallet1', { type: 'ocr_fallback' });
    expect(capturedBody?.expiration_date).toBeTruthy();
    // Expiration should be ~30 days from now, not beyond 31
    const exp = new Date(capturedBody?.expiration_date as string).getTime();
    const daysOut = (exp - Date.now()) / 86400000;
    expect(daysOut).toBeGreaterThan(28);
    expect(daysOut).toBeLessThan(32);
  });

  it('does not throw when MEM0 is unavailable', async () => {
    stubMem0Env(false);
    await expect(writePipelineAnomaly('GAsWallet1', { type: 'test' })).resolves.toBeUndefined();
  });
});

// ─── writeFraudSignal ────────────────────────────────────────────────────────

describe('writeFraudSignal', () => {
  beforeEach(() => { useMem0Mock(); stubMem0Env(); });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('writes FRAUD_SIGNALS category', async () => {
    await writeFraudSignal('GAsWallet1', { name: 'aiScore_0.82', source: 'gemini_vision', severity: 'critical' });
    expect(capturedBody?.metadata).toMatchObject({ category: MEM0_CATEGORIES.FRAUD_SIGNALS });
  });

  it('uses GEMINI_VISION agent for gemini_vision source', async () => {
    await writeFraudSignal('GAsWallet1', { name: 'test', source: 'gemini_vision', severity: 'high' });
    expect(capturedBody?.agent_id).toBe(MEM0_AGENTS.GEMINI_VISION);
  });

  it('uses GROK_FRAUD agent for grok_reasoning source', async () => {
    await writeFraudSignal('GAsWallet1', { name: 'test', source: 'grok_reasoning', severity: 'high' });
    expect(capturedBody?.agent_id).toBe(MEM0_AGENTS.GROK_FRAUD);
  });

  it('uses SUBMIT_PIPELINE agent for heuristic source', async () => {
    await writeFraudSignal('GAsWallet1', { name: 'test', source: 'heuristic', severity: 'medium' });
    expect(capturedBody?.agent_id).toBe(MEM0_AGENTS.SUBMIT_PIPELINE);
  });

  it('memory line contains name, source, severity', async () => {
    await writeFraudSignal('GAsWallet1', {
      name: 'station_pattern_ring', source: 'heuristic', severity: 'high',
      detail: '3 wallets at SHELL #4521', claimId: 'c3',
    });
    const content = capturedContent();
    expect(content).toContain('fraud:station_pattern_ring');
    expect(content).toContain('source=heuristic');
    expect(content).toContain('severity=high');
    expect(content).toContain('3 wallets at SHELL');
  });

  it('has 90-day expiration', async () => {
    await writeFraudSignal('GAsWallet1', { name: 'test', source: 'heuristic', severity: 'low' });
    const exp = new Date(capturedBody?.expiration_date as string).getTime();
    const daysOut = (exp - Date.now()) / 86400000;
    expect(daysOut).toBeGreaterThan(88);
    expect(daysOut).toBeLessThan(92);
  });
});

// ─── writeDistilledProfile ───────────────────────────────────────────────────

describe('writeDistilledProfile', () => {
  beforeEach(() => { useMem0Mock(); stubMem0Env(); });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('writes CLAIM_VERDICT category as immutable', async () => {
    await writeDistilledProfile('GAsWallet1', {
      verdict: 'approve', riskBucket: 'low', tier: 'standard',
      claimCount: 3, lastFlags: [], narrative: 'clean submission',
    });
    expect(capturedBody?.metadata).toMatchObject({ category: MEM0_CATEGORIES.CLAIM_VERDICT });
    expect(capturedBody?.immutable).toBe(true);
  });

  it('memory line contains verdict, tier, and narrative', async () => {
    await writeDistilledProfile('GAsWallet1', {
      verdict: 'reject', riskBucket: 'high', tier: 'commuter',
      claimCount: 1, lastFlags: ['ai_image_check'], narrative: 'AI score too high',
    });
    const content = capturedContent();
    expect(content).toContain('reject');
    expect(content).toContain('tier=commuter');
    expect(content).toContain('AI score too high');
  });
});

// ─── writeBanState ───────────────────────────────────────────────────────────

describe('writeBanState', () => {
  beforeEach(() => { useMem0Mock(); stubMem0Env(); });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('writes BAN_STATE category as immutable with INTELLIGENCE_AGGREGATOR agent', async () => {
    await writeBanState('GAsWallet1', { state: 'banned', reason: 'auto_ban: 5 rejections', triggeredBy: 'auto_ban_system' });
    expect(capturedBody?.metadata).toMatchObject({ category: MEM0_CATEGORIES.BAN_STATE });
    expect(capturedBody?.immutable).toBe(true);
    expect(capturedBody?.agent_id).toBe(MEM0_AGENTS.INTELLIGENCE_AGGREGATOR);
  });

  it('memory line contains ban state and reason', async () => {
    await writeBanState('GAsWallet1', { state: 'unbanned', reason: 'manual_review_cleared' });
    expect(capturedContent()).toContain('ban:unbanned');
    expect(capturedContent()).toContain('manual_review_cleared');
  });
});

// ─── getCachedFlags ──────────────────────────────────────────────────────────

describe('getCachedFlags', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns null on cache miss', async () => {
    const { cacheGet } = await import('@/lib/cache');
    vi.mocked(cacheGet).mockResolvedValueOnce(null);
    const result = await getCachedFlags('GAsWallet1');
    expect(result).toBeNull();
  });

  it('returns cached flags on cache hit', async () => {
    const { cacheGet } = await import('@/lib/cache');
    const flags = { riskFlags: ['high_ai_score'], trustLevel: 'suspicious', trajectory: 'declining' };
    vi.mocked(cacheGet).mockResolvedValueOnce(flags as any);
    const result = await getCachedFlags('GAsWallet1');
    expect(result?.riskFlags).toContain('high_ai_score');
    expect(result?.trustLevel).toBe('suspicious');
  });

  it('uses wallet-namespaced cache key', async () => {
    const { cacheGet } = await import('@/lib/cache');
    vi.mocked(cacheGet).mockResolvedValueOnce(null);
    await getCachedFlags('GAsWallet999');
    expect(vi.mocked(cacheGet)).toHaveBeenCalledWith('mem0:wallet:GAsWallet999');
  });
});
