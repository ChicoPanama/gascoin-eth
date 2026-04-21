/**
 * Season / phase flag for GASCOIN.
 *
 * Single source of truth for "are we in beta or live?"  Every code site
 * that cares about phase reads through a helper below — no direct env
 * reads, so the flip at launch is one env change.
 *
 * Canonical env var:
 *   NEXT_PUBLIC_GASCOIN_PHASE = 'season_1_beta' | 'live'
 *
 * NEXT_PUBLIC_ prefix is deliberate — client components (SubmitFlow,
 * InviteGate, Step-4 review copy) read the same value, so the whole UI
 * flips atomically with one Vercel env change + redeploy.
 *
 * Default: 'season_1_beta'. Anything not matching 'live' (case-insensitive,
 * trimmed) stays in beta — safer to default-locked than default-open.
 *
 * To go live:
 *   1. `vercel env add NEXT_PUBLIC_GASCOIN_PHASE` → enter `live`
 *   2. Fund the treasury; `vercel env add ENABLE_LIVE_PAYOUT` → enter `true`
 *   3. `vercel --prod` (or git push)
 * See scripts/go-live.sh for the full flip procedure.
 */

export type Phase = 'season_1_beta' | 'live';

function readPhaseEnv(): Phase {
  const raw = (process.env.NEXT_PUBLIC_GASCOIN_PHASE || '').trim().toLowerCase();
  return raw === 'live' ? 'live' : 'season_1_beta';
}

export function getPhase(): Phase {
  return readPhaseEnv();
}

export function isBeta(): boolean {
  return getPhase() === 'season_1_beta';
}

export function isLive(): boolean {
  return getPhase() === 'live';
}

// ─── Semantic helpers ───────────────────────────────────────────────
// Higher-level names so call sites read intent, not implementation.

/**
 * Should point writes get `metadata_json.beta = true`? True in beta so
 * leaderboard/composite can exclude beta activity at launch.
 */
export function shouldTagPointsAsBeta(): boolean {
  return isBeta();
}

/**
 * Should we suppress the live_payout_disabled / dryrun_payout_detected /
 * treasury_low_eth intel writes? True in beta where these are expected
 * state, not actionable alerts.
 */
export function shouldSilenceBetaAlerts(): boolean {
  return isBeta();
}

/**
 * Should SubmitFlow gate /claims/submit behind a single-use invite code?
 * True in beta. When we go live, anyone signed in with X can submit.
 */
export function shouldRequireInviteCode(): boolean {
  return isBeta();
}

/**
 * Should SubmitFlow Step-4 review + Step-5 success use beta-points copy
 * instead of ETH-refund copy? True in beta.
 */
export function shouldShowBetaCopy(): boolean {
  return isBeta();
}
