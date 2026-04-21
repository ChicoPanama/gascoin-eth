#!/usr/bin/env bash
#
# go-live.sh — flip GASCOIN from Season 1 Beta to LIVE.
#
# Run this once, after:
#   1. Treasury wallet is funded with enough ETH for initial refunds
#   2. You've announced the launch and are ready for public submissions
#   3. The current beta is reconciled (beta points tagged, no open disputes)
#
# What it does:
#   - Flips NEXT_PUBLIC_GASCOIN_PHASE from 'season_1_beta' to 'live'
#     (drops invite gate, changes SubmitFlow copy, untags new points,
#      re-enables all suppressed intel alerts)
#   - Sets ENABLE_LIVE_PAYOUT=true (payout worker dispatches real ETH)
#   - Triggers a production deploy so Vercel picks up the new env vars
#
# Idempotent: safe to re-run. `vercel env add` prompts "already exists,
# overwrite?" — answer yes, or delete first.
#
# Reverting: to roll back, either flip NEXT_PUBLIC_GASCOIN_PHASE back
# to season_1_beta and unset ENABLE_LIVE_PAYOUT, or use the Vercel
# dashboard to revert to the prior deployment.

set -euo pipefail

echo "==> GASCOIN go-live flip"
echo ""
echo "This will:"
echo "  1. Set NEXT_PUBLIC_GASCOIN_PHASE=live in Vercel production"
echo "  2. Set ENABLE_LIVE_PAYOUT=true in Vercel production"
echo "  3. Trigger a production deploy"
echo ""
read -r -p "Treasury is funded? Season 1 is ready to close? (type 'GO' to continue): " confirm
if [[ "$confirm" != "GO" ]]; then
  echo "Aborted."
  exit 1
fi

# Ensure we're linked to the right project
if [[ ! -f .vercel/project.json ]]; then
  echo "==> Linking Vercel project (gascoin-eth)..."
  vercel link --yes --project gascoin-eth
fi

echo ""
echo "==> Removing any stale beta env values..."
# Suppress errors: these may not exist if we're flipping for the first time
vercel env rm NEXT_PUBLIC_GASCOIN_PHASE production --yes 2>/dev/null || true
vercel env rm ENABLE_LIVE_PAYOUT production --yes 2>/dev/null || true
vercel env rm SEASON_1_POINTS_ONLY production --yes 2>/dev/null || true

echo ""
echo "==> Setting live phase + enabling payouts..."
# printf (not echo) — trailing newline would break strict equality checks.
printf "live" | vercel env add NEXT_PUBLIC_GASCOIN_PHASE production
printf "true" | vercel env add ENABLE_LIVE_PAYOUT production

echo ""
echo "==> Verifying env values are clean (no trailing whitespace)..."
vercel env pull /tmp/gascoin-verify --environment=production >/dev/null
if grep -qE '^NEXT_PUBLIC_GASCOIN_PHASE="live"$' /tmp/gascoin-verify; then
  echo "    NEXT_PUBLIC_GASCOIN_PHASE=live ✓"
else
  echo "    WARNING: NEXT_PUBLIC_GASCOIN_PHASE may have whitespace. Check vercel env pull."
fi
if grep -qE '^ENABLE_LIVE_PAYOUT="true"$' /tmp/gascoin-verify; then
  echo "    ENABLE_LIVE_PAYOUT=true ✓"
else
  echo "    WARNING: ENABLE_LIVE_PAYOUT may have whitespace. Check vercel env pull."
fi
rm -f /tmp/gascoin-verify

echo ""
echo "==> Deploying to production..."
vercel --prod

echo ""
echo "==> Done."
echo ""
echo "Next steps:"
echo "  - Smoke-test /submit flow signed in with a fresh X account (no invite code needed)"
echo "  - Watch /admin/health for any surprise alerts"
echo "  - Monitor first real payout in payout_jobs table"
