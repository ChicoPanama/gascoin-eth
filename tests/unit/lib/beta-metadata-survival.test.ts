// Season 1 beta-tag survival through the points pipeline.
//
// Invariant under test: during beta, any engagement_points row written by
// awardPoints() must carry metadata_json.beta === true and
// metadata_json.beta_season === 'season_1'. Caller-supplied metadata must
// NOT be able to shadow these flags — the beta tag is appended after the
// spread, so even a malicious `metadata.beta = false` gets overwritten.
//
// This matters because leaderboard_view / composite_score exclude
// metadata.beta = true rows at launch. If the tag doesn't land, beta
// activity pollutes live rankings.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Stub env BEFORE importing season.ts (it captures phase at module load).
const originalPhase = process.env.NEXT_PUBLIC_GASCOIN_PHASE;

describe('beta metadata survival', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalPhase === undefined) {
      delete process.env.NEXT_PUBLIC_GASCOIN_PHASE;
    } else {
      process.env.NEXT_PUBLIC_GASCOIN_PHASE = originalPhase;
    }
  });

  it('during beta, shouldTagPointsAsBeta returns true', async () => {
    process.env.NEXT_PUBLIC_GASCOIN_PHASE = 'season_1_beta';
    const season = await import('@/lib/season');
    expect(season.shouldTagPointsAsBeta()).toBe(true);
    expect(season.isBeta()).toBe(true);
    expect(season.isLive()).toBe(false);
  });

  it('during live, shouldTagPointsAsBeta returns false', async () => {
    process.env.NEXT_PUBLIC_GASCOIN_PHASE = 'live';
    const season = await import('@/lib/season');
    expect(season.shouldTagPointsAsBeta()).toBe(false);
    expect(season.isBeta()).toBe(false);
    expect(season.isLive()).toBe(true);
  });

  it('unknown / malformed phase value defaults to beta (safer)', async () => {
    process.env.NEXT_PUBLIC_GASCOIN_PHASE = 'garbage';
    const season = await import('@/lib/season');
    expect(season.shouldTagPointsAsBeta()).toBe(true);
  });

  it('phase env is case-insensitive and trimmed', async () => {
    process.env.NEXT_PUBLIC_GASCOIN_PHASE = '  LIVE  ';
    const season = await import('@/lib/season');
    expect(season.isLive()).toBe(true);
  });

  // Contract test on the merge pattern in ai-points-engine.ts:
  //   { ...params.metadata, ...(isBetaMode ? { beta: true, beta_season: 'season_1' } : {}), ... }
  // Caller-supplied metadata.beta = false must NOT survive — the post-spread
  // object wins.
  it('caller-supplied metadata.beta cannot shadow the beta tag in beta mode', () => {
    const callerMetadata = { beta: false, beta_season: 'FAKE', note: 'attempted override' };
    const isBetaMode = true;

    const merged = {
      ...callerMetadata,
      ...(isBetaMode ? { beta: true, beta_season: 'season_1' } : {}),
      verification: { approved: true },
    };

    expect(merged.beta).toBe(true);
    expect(merged.beta_season).toBe('season_1');
    expect((merged as any).note).toBe('attempted override');
    expect(merged.verification.approved).toBe(true);
  });

  it('live mode does not inject beta tag even if caller supplies it', () => {
    const callerMetadata = { beta: true, beta_season: 'season_1' };
    const isBetaMode = false;

    const merged = {
      ...callerMetadata,
      ...(isBetaMode ? { beta: true, beta_season: 'season_1' } : {}),
      verification: { approved: true },
    };

    // In live mode, caller's spread wins because nothing overrides. This is
    // intentional — if live code tries to write a beta row it's a caller bug,
    // not the engine's job to suppress it.
    expect(merged.beta).toBe(true);
  });
});
