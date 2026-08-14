#!/usr/bin/env bash
set -euo pipefail

# Project GAS Beads seed graph.
# Run once after `bd init` in a local clone.
# Requires: bd, python3

if ! command -v bd >/dev/null 2>&1; then
  echo "ERROR: bd (Beads) is not installed. See https://github.com/gastownhall/beads" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 is required to parse bd JSON output." >&2
  exit 1
fi

# Idempotency guard: avoid duplicate graph creation.
if bd list --json 2>/dev/null | grep -q 'Project GAS UX Foundation'; then
  echo "Project GAS Beads graph already appears to be seeded."
  exit 0
fi

id_from_json() {
  python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])'
}

create_bead() {
  local title="$1"
  local type="$2"
  local priority="$3"
  local agent="$4"
  local description="$5"
  local acceptance="$6"
  local parent="${7:-}"

  if [[ -n "$parent" ]]; then
    bd create "$title" \
      -t "$type" -p "$priority" \
      --description="Agent role: $agent

$description" \
      --acceptance="$acceptance" \
      --deps="parent-child:$parent" \
      --json | id_from_json
  else
    bd create "$title" \
      -t "$type" -p "$priority" \
      --description="Agent role: $agent

$description" \
      --acceptance="$acceptance" \
      --json | id_from_json
  fi
}

block_on() {
  local child="$1"
  shift
  for parent in "$@"; do
    bd dep add "$child" "$parent" >/dev/null
  done
}

close_done() {
  local id="$1"
  local reason="$2"
  bd close "$id" --reason "$reason" --json >/dev/null
}

EPIC=$(create_bead \
  "Project GAS UX Foundation" epic 0 ux-orchestrator \
  "Deliver the complete Phase 1 Project GAS product shell and high-frequency UX from the canonical protocol/UX documents." \
  "All child beads closed; Phase 1 integration review passes; critical mobile/desktop E2E suites pass; source of truth reflects final implementation.")

echo "Epic: $EPIC"

# -----------------------------------------------------------------------------
# RESEARCH + SPECIFICATION — already completed in the staging branch
# -----------------------------------------------------------------------------

B01=$(create_bead \
  "Audit existing GAS template for reuse" task 1 gas-template-archaeologist \
  "Inventory the existing Next.js application, routes, components, design tokens, auth/wallet stack, tests, and legacy product coupling." \
  "Reuse inventory identifies keep/refactor/replace areas and migration risks with file-level references." "$EPIC")

B02=$(create_bead \
  "Research Fomo social/discovery interaction patterns" task 1 fomo-pattern-researcher \
  "Use official public Fomo sources to analyze feed scanability, profiles, leaderboards, unified balance/identity, mobile/desktop continuity, and action-from-content patterns." \
  "Research is cited, separates facts from inference, and proposes clean-room GAS translations without copying proprietary UI/code." "$EPIC")

B03=$(create_bead \
  "Research ORE live-state protocol UX" task 1 ore-live-state-researcher \
  "Review public ORE protocol/app state and interface patterns for shared rounds, rewards, status, activity, and live protocol presence." \
  "Research identifies authoritative versus derived state, notes Apache-2.0 licensing, and proposes GAS-native live-state patterns." "$EPIC")

B04=$(create_bead \
  "Research Stake Originals interaction economy" task 1 stake-originals-researcher \
  "Analyze official Limbo, Plinko, Mines, Dice and Originals documentation for control reduction, volatility communication, hotkeys, Instant Mode, repeated play and provably-fair UX." \
  "Research produces GAS-specific principles without copying proprietary code, art, wording or payout tables." "$EPIC")

B05=$(create_bead \
  "Lock Project GAS UX doctrine and information architecture" task 0 ux-orchestrator \
  "Reconcile protocol source of truth with reference research into primary routes, mobile/desktop hierarchy, trust rules and UX acceptance gates." \
  "Canonical UX docs define Home, Play, Trade, Crews, Reserve, Wallet and Verify; first-use and repeat-play targets are explicit." "$EPIC")
block_on "$B05" "$B01" "$B02" "$B03" "$B04"

B06=$(create_bead \
  "Specify Project GAS design-system migration" task 1 design-system-engineer \
  "Define which existing tokens/components survive and the new GAS energy/gauge/reserve semantics, typography, motion, reduced-motion and accessibility rules." \
  "Design-system migration doc exists and avoids a generic Web3/casino redesign." "$EPIC")
block_on "$B06" "$B01" "$B05"

# Mark completed foundation work to make the ready queue accurate.
close_done "$B01" "Completed in docs/research/GAS_TEMPLATE_INVENTORY.md"
close_done "$B02" "Completed in docs/research/REFERENCE_RESEARCH.md"
close_done "$B03" "Completed in docs/research/REFERENCE_RESEARCH.md with ORE source review"
close_done "$B04" "Completed in docs/research/REFERENCE_RESEARCH.md with official Stake sources"
close_done "$B05" "Completed in docs/ux/01_UX_DOCTRINE.md and docs/ux/02_INFORMATION_ARCHITECTURE.md"
close_done "$B06" "Completed in docs/ux/05_DESIGN_SYSTEM_MIGRATION.md"

# -----------------------------------------------------------------------------
# APPLICATION SHELL
# -----------------------------------------------------------------------------

B07=$(create_bead \
  "Add Project GAS semantic design tokens" feature 1 design-system-engineer \
  "Extend the owned design system with GAS energy, gauge, reserve, game-bankroll and state semantic tokens while preserving light/dark/reduced-motion compatibility." \
  "Tokens are semantic, contrast-tested, documented, and no repeated hard-coded palette is introduced." "$EPIC")
block_on "$B07" "$B06"

B08=$(create_bead \
  "Refactor application navigation to Project GAS IA" feature 1 gas-template-archaeologist \
  "Replace legacy refund navigation with Home / Play / Trade / Crews / Reserve and preserve wallet/auth/theme behavior. Establish mobile bottom-nav architecture." \
  "Desktop and mobile navigation reach only valid Project GAS destinations; auth/wallet state works; responsive tests pass." "$EPIC")
block_on "$B08" "$B05" "$B07"

B09=$(create_bead \
  "Define wallet and onboarding UX contract" task 1 ux-orchestrator \
  "Map disconnected, connecting, connected, wrong-network, insufficient-balance and returning-user states across Home/Play/Trade without unnecessary onboarding gates." \
  "State diagram and component contract exist; returning users are not forced through education; money-state errors are explicit." "$EPIC")
block_on "$B09" "$B01" "$B05"

# -----------------------------------------------------------------------------
# LIVE HOME / NETWORK STATE
# -----------------------------------------------------------------------------

B10=$(create_bead \
  "Define live network event data contract" task 1 social-ux-engineer \
  "Specify authoritative and derived event shapes for game results, trades, rebases, reserve events, crew milestones and degraded indexer state." \
  "Typed contract distinguishes on-chain facts, derived metrics and user-generated content; no field requires fabricated data." "$EPIC")
block_on "$B10" "$B03" "$B05"

B11=$(create_bead \
  "Build Project GAS Home heartbeat" feature 1 social-ux-engineer \
  "Replace the old refund hero with GAS price/reference state, rebase clock, reserve headline, Play/Buy actions and a real live/social feed." \
  "Home is app-first, handles loading/empty/degraded states, is responsive, and contains no legacy refund primary CTA." "$EPIC")
block_on "$B11" "$B07" "$B08" "$B10"

# -----------------------------------------------------------------------------
# GAS ORIGINAL CORE GAME
# -----------------------------------------------------------------------------

B12=$(create_bead \
  "Implement GAS Original interaction state model" feature 0 game-ux-engineer \
  "Create typed UI states for READY -> VALIDATING -> COMMITTING -> LOCKED -> RESOLVING -> RESULT plus explicit failure/recovery branches." \
  "State model prevents duplicate submission and every error state states whether a wager/funds moved and the safe next action." "$EPIC")
block_on "$B12" "$B04" "$B05"

B13=$(create_bead \
  "Build GAS Gauge component" feature 1 game-ux-engineer \
  "Implement the signature responsive Gauge with idle/mode-preview, pending, resolved win/loss, exceptional-hit and reduced-motion states." \
  "Gauge is responsive, accessible, deterministic from supplied state, and does not imply animation chooses the random result." "$EPIC")
block_on "$B13" "$B07" "$B12"

B14=$(create_bead \
  "Build CRUISE BOOST REDLINE selector and wager controls" feature 0 game-ux-engineer \
  "Implement three-mode volatility selector, GAS/USDC wager input, balance display, half/double/max controls, and clear validation." \
  "Mode differences are understandable without docs; controls are keyboard/touch accessible; payout/risk copy does not imply guarantees." "$EPIC")
block_on "$B14" "$B07" "$B12"

B15=$(create_bead \
  "Build IGNITION transaction and repeat-play flow" feature 0 game-ux-engineer \
  "Implement dominant IGNITION action, signing/commit states, duplicate-click protection, result transition and one-action same-configuration repeat." \
  "Returning user can repeat with one primary action; duplicate clicks cannot double wager; rejection/failure paths are tested." "$EPIC")
block_on "$B15" "$B12" "$B14"

B16=$(create_bead \
  "Add Instant Mode hotkeys and reduced-motion paths" feature 1 game-ux-engineer \
  "Implement safe desktop hotkeys, Instant Mode animation bypass, and intentional reduced-motion presentation." \
  "Standard/Instant/Reduced Motion produce identical economic state; Space never fires while an incompatible input/control is focused; settings persist appropriately." "$EPIC")
block_on "$B16" "$B13" "$B15"

B17=$(create_bead \
  "Build provably-fair verification UX" feature 0 trust-responsible-play \
  "Create plain-language-first verification sheet/page for round ID, commitment/randomness data, outcome derivation and settlement transaction." \
  "Every completed result can reach a verification surface; cryptographic detail is available without obstructing normal play." "$EPIC")
block_on "$B17" "$B12"

B18=$(create_bead \
  "Build result card and post-round hierarchy" feature 1 game-ux-engineer \
  "Implement result multiplier, payout delta, updated balance, repeat, share and verify hierarchy." \
  "Result is immediately legible; repeat dominates post-round actions; Verify links correct round; no animation blocks completed state." "$EPIC")
block_on "$B18" "$B13" "$B15" "$B17"

# -----------------------------------------------------------------------------
# SOCIAL GRAPH / CREWS
# -----------------------------------------------------------------------------

B19=$(create_bead \
  "Build truthful live activity tape" feature 1 social-ux-engineer \
  "Render real indexed game/trade/rebase/reserve events beside/below Play with mobile collapsed behavior and degraded-state handling." \
  "No fake filler activity; event types are visually distinct; latency/degraded state is explicit." "$EPIC")
block_on "$B19" "$B10" "$B18"

B20=$(create_bead \
  "Build shareable result objects and TRY THIS MODE deep links" feature 1 social-ux-engineer \
  "Make verified results social objects that can deep-link another user into the same game/mode context without auto-wagering." \
  "Deep link preconfigures context only; viewer explicitly chooses/accepts wager and presses IGNITION; privacy rules are respected." "$EPIC")
block_on "$B20" "$B18" "$B19"

B21=$(create_bead \
  "Build profiles crews and leaderboards" feature 2 social-ux-engineer \
  "Refactor existing community/leaderboard/referral infrastructure into verified profiles, crew pages, rankings and activity views." \
  "Metrics clearly distinguish handle, P/L, hits and activity; ranking formula is documented; no trivial wash-volume-only ranking." "$EPIC")
block_on "$B21" "$B10" "$B20"

# -----------------------------------------------------------------------------
# TRUST / RESERVE / TRADE
# -----------------------------------------------------------------------------

B22=$(create_bead \
  "Build Reserve trust surface" feature 0 trust-responsible-play \
  "Create reserve/backing UI that clearly separates external reserve, liabilities, POL and GameBankroll and exposes last/next rebase state." \
  "A user can understand backing in under 30 seconds; GameBankroll is never presented as monetary backing; degraded data is explicit." "$EPIC")
block_on "$B22" "$B05" "$B07"

B23=$(create_bead \
  "Build simple GAS Trade surface" feature 1 ux-orchestrator \
  "Implement simple pay/receive flow for GAS with fee, expected receive, route/price-impact detail when material, and explicit transaction states." \
  "Basic trade does not require professional charting; 2% fee presentation matches protocol source of truth; errors state fund status." "$EPIC")
block_on "$B23" "$B08" "$B09" "$B22"

B24=$(create_bead \
  "Specify and build Phase 1 roulette UX shell" feature 2 game-ux-engineer \
  "Add the first conventional social game only after shared wallet, verification and responsible-play primitives exist." \
  "Roulette reuses shared bankroll/verification/money-state primitives and does not compromise GAS Original navigation priority." "$EPIC")
block_on "$B24" "$B17" "$B22"

# -----------------------------------------------------------------------------
# QA / PERFORMANCE / RESPONSIBLE PLAY
# -----------------------------------------------------------------------------

B25=$(create_bead \
  "Add mobile core-play viewport E2E suite" task 0 mobile-performance-qa \
  "Prove GAS Original core controls fit target mobile viewport heights, safe areas and orientation assumptions." \
  "Playwright passes on defined compact iPhone/Android viewports; IGNITION remains reachable; no critical control is obscured." "$EPIC")
block_on "$B25" "$B15" "$B16"

B26=$(create_bead \
  "Add money-state and failure E2E suite" task 0 mobile-performance-qa \
  "Test wallet rejection, transaction failure, delayed randomness, delayed settlement, disconnect and retry flows." \
  "Every path shows whether funds/wager moved and safe next action; duplicate-wager regression coverage exists." "$EPIC")
block_on "$B26" "$B15" "$B17"

B27=$(create_bead \
  "Audit accessibility and responsible-play UX" task 0 trust-responsible-play \
  "Review keyboard/focus, contrast, non-color cues, reduced motion, wager/fee/RTP disclosure, history/limits and anti-dark-pattern requirements." \
  "No critical accessibility blocker or deceptive gambling pattern remains; unresolved legal/policy decisions are flagged for human review." "$EPIC")
block_on "$B27" "$B16" "$B17" "$B22"

B28=$(create_bead \
  "Set and validate interaction-performance budgets" task 1 mobile-performance-qa \
  "Measure navigation, IGNITION acknowledgment, result rendering after settlement, live-feed rendering and animation costs." \
  "Budgets are documented and test evidence shows critical paths meet them or blocker beads exist." "$EPIC")
block_on "$B28" "$B11" "$B16" "$B19"

B29=$(create_bead \
  "Run Phase 1 UX integration review" task 0 ux-orchestrator \
  "Evaluate the complete Home -> Play -> Result -> Share/Verify -> Trade/Reserve/Crews experience against the canonical UX doctrine." \
  "All Phase 1 UX acceptance gates pass; remaining gaps are explicit blocking beads; no legacy product language remains on primary surfaces." "$EPIC")
block_on "$B29" "$B21" "$B22" "$B23" "$B24" "$B25" "$B26" "$B27" "$B28"

B30=$(create_bead \
  "Quarantine and remove obsolete refund-product UI" chore 2 gas-template-archaeologist \
  "After Project GAS primary surfaces pass integration review, remove or redirect legacy receipt/gates/standing/refund pages and dead styles/dependencies safely." \
  "Reference search proves removed code is unused; redirects are intentional; build/test suite passes; reusable infrastructure remains intact." "$EPIC")
block_on "$B30" "$B29"

cat <<EOF
Seeded Project GAS Beads graph.

Completed foundation beads:
  $B01
  $B02
  $B03
  $B04
  $B05
  $B06

Run next:
  bd ready --json
EOF
