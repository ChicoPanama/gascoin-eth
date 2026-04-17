/**
 * Prompt snapshot regression tests (AI4)
 *
 * Guards against accidental truncation, blank overrides, or breaking edits to
 * the three system prompts that drive the AI pipeline. Each test verifies:
 *   (a) the export is a non-empty string
 *   (b) key expected phrases are present
 *   (c) the prompt is longer than 100 chars (truncation guard)
 *
 * getSystemPrompt() with Edge Config mocked-out is also tested to confirm the
 * bundled fallback is returned intact when Edge Config is unavailable.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Edge Config so tests are deterministic (no network, no env var needed)
vi.mock('@vercel/edge-config', () => ({
  get: vi.fn().mockResolvedValue(null),
  has: vi.fn().mockResolvedValue(false),
}));

import {
  DEFAULT_CLAUDE_OVERSIGHT,
  DEFAULT_GROK_FRAUD,
  DEFAULT_GEMINI_RECEIPT,
  PROMPT_KEYS,
  getSystemPrompt,
  clearPromptWarmCache,
} from '@/lib/prompts';

// ── Bundled default prompt tests ──────────────────────────────────────────────

describe('DEFAULT_CLAUDE_OVERSIGHT', () => {
  it('is a non-empty string', () => {
    expect(typeof DEFAULT_CLAUDE_OVERSIGHT).toBe('string');
    expect(DEFAULT_CLAUDE_OVERSIGHT.length).toBeGreaterThan(0);
  });

  it('is longer than 100 chars (truncation guard)', () => {
    expect(DEFAULT_CLAUDE_OVERSIGHT.length).toBeGreaterThan(100);
  });

  it('contains mission context', () => {
    expect(DEFAULT_CLAUDE_OVERSIGHT).toContain('GASCOIN');
    expect(DEFAULT_CLAUDE_OVERSIGHT).toContain('gas receipt');
  });

  it('contains tier system definitions', () => {
    expect(DEFAULT_CLAUDE_OVERSIGHT).toContain('Standard');
    expect(DEFAULT_CLAUDE_OVERSIGHT).toContain('Commuter');
    expect(DEFAULT_CLAUDE_OVERSIGHT).toContain('Road Warrior');
    expect(DEFAULT_CLAUDE_OVERSIGHT).toContain('Fleet');
  });

  it('contains decision matrix verdicts', () => {
    expect(DEFAULT_CLAUDE_OVERSIGHT).toContain('approve');
    expect(DEFAULT_CLAUDE_OVERSIGHT).toContain('flag');
    expect(DEFAULT_CLAUDE_OVERSIGHT).toContain('reject');
  });

  it('contains fraud signal thresholds', () => {
    expect(DEFAULT_CLAUDE_OVERSIGHT).toContain('aiScore');
    expect(DEFAULT_CLAUDE_OVERSIGHT).toContain('tamperScore');
    expect(DEFAULT_CLAUDE_OVERSIGHT).toContain('0.65');
  });

  it('specifies JSON response format', () => {
    expect(DEFAULT_CLAUDE_OVERSIGHT).toContain('verdict');
    expect(DEFAULT_CLAUDE_OVERSIGHT).toContain('narrative');
    expect(DEFAULT_CLAUDE_OVERSIGHT).toContain('concerns');
  });
});

describe('DEFAULT_GROK_FRAUD', () => {
  it('is a non-empty string', () => {
    expect(typeof DEFAULT_GROK_FRAUD).toBe('string');
    expect(DEFAULT_GROK_FRAUD.length).toBeGreaterThan(0);
  });

  it('is longer than 100 chars (truncation guard)', () => {
    expect(DEFAULT_GROK_FRAUD.length).toBeGreaterThan(100);
  });

  it('contains GASCOIN fraud context', () => {
    expect(DEFAULT_GROK_FRAUD).toContain('GASCOIN');
    expect(DEFAULT_GROK_FRAUD).toContain('fraud');
  });

  it('documents all key signal names', () => {
    expect(DEFAULT_GROK_FRAUD).toContain('aiScore');
    expect(DEFAULT_GROK_FRAUD).toContain('tamperScore');
    expect(DEFAULT_GROK_FRAUD).toContain('exifScore');
    expect(DEFAULT_GROK_FRAUD).toContain('dimensionScore');
    expect(DEFAULT_GROK_FRAUD).toContain('isPhysicalReceipt');
    expect(DEFAULT_GROK_FRAUD).toContain('isDigitallyManipulated');
  });

  it('specifies JSON output schema fields', () => {
    expect(DEFAULT_GROK_FRAUD).toContain('fraudRiskLevel');
    expect(DEFAULT_GROK_FRAUD).toContain('confidence');
    expect(DEFAULT_GROK_FRAUD).toContain('reasoning');
    expect(DEFAULT_GROK_FRAUD).toContain('concerns');
  });

  it('contains reject threshold values', () => {
    expect(DEFAULT_GROK_FRAUD).toContain('0.65');
    expect(DEFAULT_GROK_FRAUD).toContain('0.55');
  });
});

describe('DEFAULT_GEMINI_RECEIPT', () => {
  it('is a non-empty string', () => {
    expect(typeof DEFAULT_GEMINI_RECEIPT).toBe('string');
    expect(DEFAULT_GEMINI_RECEIPT.length).toBeGreaterThan(0);
  });

  it('is longer than 100 chars (truncation guard)', () => {
    expect(DEFAULT_GEMINI_RECEIPT.length).toBeGreaterThan(100);
  });

  it('contains extraction field instructions', () => {
    expect(DEFAULT_GEMINI_RECEIPT).toContain('station_country');
    expect(DEFAULT_GEMINI_RECEIPT).toContain('wallet_address');
    expect(DEFAULT_GEMINI_RECEIPT).toContain('total_amount');
    expect(DEFAULT_GEMINI_RECEIPT).toContain('raw_text');
  });

  it('contains fraud detection fields', () => {
    expect(DEFAULT_GEMINI_RECEIPT).toContain('is_physical_receipt');
    expect(DEFAULT_GEMINI_RECEIPT).toContain('is_gas_station');
    expect(DEFAULT_GEMINI_RECEIPT).toContain('is_digitally_manipulated');
  });

  // P3 PII guard — these exact phrases must remain in the prompt
  it('has PII guard: no GPS coordinates', () => {
    expect(DEFAULT_GEMINI_RECEIPT).toContain('GPS coordinates');
  });

  it('has PII guard: no card numbers', () => {
    expect(DEFAULT_GEMINI_RECEIPT).toContain('card numbers');
  });

  it('has PII guard: no names', () => {
    expect(DEFAULT_GEMINI_RECEIPT).toContain('names');
  });

  it('has privacy instruction: country-only', () => {
    expect(DEFAULT_GEMINI_RECEIPT).toContain('Do NOT');
    expect(DEFAULT_GEMINI_RECEIPT).toContain('country code');
  });
});

// ── PROMPT_KEYS shape ─────────────────────────────────────────────────────────

describe('PROMPT_KEYS', () => {
  it('has all three keys', () => {
    expect(PROMPT_KEYS.CLAUDE_OVERSIGHT).toBeTruthy();
    expect(PROMPT_KEYS.GROK_FRAUD).toBeTruthy();
    expect(PROMPT_KEYS.GEMINI_RECEIPT).toBeTruthy();
  });
});

// ── getSystemPrompt() fallback when Edge Config is absent ────────────────────

describe('getSystemPrompt() — Edge Config unavailable fallback', () => {
  beforeEach(() => {
    // Ensure no EDGE_CONFIG env var so getSystemPrompt takes the no-config path
    delete process.env.EDGE_CONFIG;
    clearPromptWarmCache();
  });

  it('returns the bundled Claude oversight default', async () => {
    const prompt = await getSystemPrompt(PROMPT_KEYS.CLAUDE_OVERSIGHT);
    expect(prompt).toBe(DEFAULT_CLAUDE_OVERSIGHT);
  });

  it('returns the bundled Grok fraud default', async () => {
    const prompt = await getSystemPrompt(PROMPT_KEYS.GROK_FRAUD);
    expect(prompt).toBe(DEFAULT_GROK_FRAUD);
  });

  it('returns the bundled Gemini receipt default', async () => {
    const prompt = await getSystemPrompt(PROMPT_KEYS.GEMINI_RECEIPT);
    expect(prompt).toBe(DEFAULT_GEMINI_RECEIPT);
  });

  it('fallback prompts are all non-empty and > 100 chars', async () => {
    for (const key of Object.values(PROMPT_KEYS)) {
      const prompt = await getSystemPrompt(key);
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(100);
    }
  });
});
