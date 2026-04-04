# Phase 0 — Deployment Gate (Vercel)

## Goal
Get GASCOIN to a verified public deployment URL with production env wiring and smoke-pass checks.

## Status (executed)
- ✅ Local preflight added and passing (`npm run phase0:preflight`)
- ✅ Deployment smoke checker added (`npm run phase0:smoke -- <url>`)
- ✅ Vercel token created and validated with project access
- ✅ Production deploy live: `https://platform-ebon-nine.vercel.app`
- ✅ Production env vars injected for current pre-token mode
- ✅ Smoke pass on core pages + public APIs
- ⚠️ Pending pre-token intentional gaps: `GASCOIN_MINT`, `GASCOIN_TREASURY_WALLET`

## Execution notes from this run
- Initial deploy was blocked by Vercel CVE gate on Next.js 15.2.0.
- Upgraded to Next.js `16.2.2` and redeployed successfully.
- New Vercel project auto-created as `platform` under `chicopanamas-projects`.
- If desired, rename project later to `gascoin-platform` in Vercel settings for clarity.

## What was prepared to optimize rollout
1) `scripts/phase0_preflight.mjs`
   - Mode `pretoken` (current): requires all infra-critical vars and allows mint/treasury to be deferred.
   - Mode `full`: requires mint + treasury + live payout signer key.

2) `scripts/phase0_smoke.mjs`
   - Tests deployed URL for:
     - `/`
     - `/submit`
     - `/admin`
     - `/api/public/claims`
     - `/api/public/market`
     - `/api/public/treasury`

3) npm scripts
- `npm run phase0:preflight`
- `npm run phase0:preflight:full`
- `npm run phase0:smoke -- https://<your-domain>`

## Cutover checklist
1. `npm run phase0:preflight` (must pass)
2. `vercel --prod` (must produce public deployment URL)
3. `npm run phase0:smoke -- https://<deployment-url>` (must pass)
4. Wire scheduler to `POST /api/workers/process-claims` on deployed domain
5. Seed `admin_users` reviewer/admin row

## Notes
- Pre-token launch is intentionally allowed with missing `GASCOIN_MINT` and `GASCOIN_TREASURY_WALLET`.
- Keep `ENABLE_LIVE_PAYOUT=false` until post-token smoke + signer validation.
