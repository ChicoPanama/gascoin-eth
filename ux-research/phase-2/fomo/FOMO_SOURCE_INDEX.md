# Fomo Phase 2 — Source Index

**Captured / refreshed:** 2026-08-15  
**Purpose:** Canonical evidence inventory for the Fomo molecular teardown.  
**Rule:** Prefer current first-party material. Marketing claims are evidence of Fomo's product intent, not independent proof of performance.

## Evidence levels

- `official_product`: Fomo's current product/landing pages.
- `official_documented`: Fomo blog/learn/answers explaining behavior.
- `official_published_visual`: screenshot/image published by Fomo.
- `official_org_public`: Fomo Labs public hiring/organizational material.
- `store_listing`: Apple App Store / Google Play metadata.
- `user_review_signal`: public store review; useful for friction discovery, not treated as verified root cause.
- `external_commentary`: investor/media commentary; secondary validation only.
- `manual_capture_pending`: requires ordinary user-driven use/capture.

## Primary current first-party sources

| Source | Date / freshness | Evidence | Phase 2 use |
|---|---|---|---|
| `https://fomo.family/` | current landing | official_product + published visuals | current positioning, mobile/desktop marketing visuals, sign-in, feed, alerts, account abstraction |
| `https://fomo.family/download` | current public product page | official_product | social-first positioning, friends/top traders, personalized feed, Apple Pay/debit, key ownership, fee transparency claims |
| `https://fomo.family/blog/fomo-series-b` | 2026-06-22 | official_documented/company metrics | product thesis: accessible global trading, infrastructure abstraction, financial identity/social network |
| `https://fomo.family/blog/perpetuals-now-on-fomo` | 2026-06-11 | official_documented | same social graph expands into new asset class; position half-sheets/share cards; long/short/leverage/notional/equity; advanced SL/TP |
| `https://fomo.family/blog/announcing-fomo-web` | 2026-04-29 | official_documented | unified balance, no bridge/chain switching, web/mobile continuity, feed, leaderboard, thesis, follows, quick buys |
| `https://fomo.family/blog/tradingview-partnership` | 2026-04-14 | official_documented | progressive advanced charting, social overlays, indicator/drawing depth |
| `https://fomo.family/blog/learn/fomo-security-wallet-architecture` | 2026-03-04 | official_documented | account/embedded wallet, FaceID step-up, gas sponsorship, under-30-second first-trade claim |
| `https://fomo.family/blog/february-2026-recap` | 2026-02-28 | official_documented | feed scanability redesign, global thesis, PnL/balance in thesis, price since first swap, verified badge in buy/sell |
| `https://fomo.family/blog/january-2026-recap` | 2026-01-31 | official_documented | Apple Pay onramp, biometrics, token-specific feed, thesis, transaction simulation, gainers/filter/fee-context changes |
| `https://fomo.family/blog/december-2025-recap` | 2025-12-31 | official_documented | threaded comments, broader commentable events, dollar presets, Buy Again, on-chain balance in trade sheet, profile search history |
| `https://fomo.family/blog/november-2025-recap` | 2025-11-30 | official_documented | five-part app redesign, liquid-glass tab bar/notifications, onboarding redesign, profile header, tab-bar search, mutual followers |
| `https://fomo.family/blog/october-2025-recap` | 2025-10-31 | official_documented | dynamic PnL on charts, trade spotlight scan improvements, following toggle, average hold time |
| `https://fomo.family/blog/september-2025-recap` | 2025-09-30 | official_documented | Friends feed, featured discovery sections, token safety warnings, multichain leaderboard/PnL, QR withdrawal |

### Freshness finding
As of the 2026-08-15 research pass, Fomo's public blog index still ends its product-update sequence at the June 22 Series B post / June 11 perpetuals launch; there is no indexed July/August 2026 product-feature recap. The native app has continued shipping maintenance releases, so **current live behavior may be newer than the public feature documentation**.

## Product-navigation / social-system sources

| Source | Evidence | Useful facts |
|---|---|---|
| `https://fomo.family/blog/learn/navigating-your-fomo-app` | official_documented + published visuals | five bottom destinations; Home -> Search -> Feed -> Friends/Leaderboard -> Profile; profile/withdraw path; search users/tokens |
| `https://fomo.family/blog/learn/leveraging-fomos-social-features` | official_documented + published visuals | feed object fields; trade -> position drilldown; profile; 24h/7d/30d/All leaderboard; notification taxonomy |
| `https://fomo.family/blog/learn/a-guide-to-deposits-and-withdrawals` | official_documented | debit/Apple Pay/crypto funding; bank/crypto withdrawal sequences; supported-network warning |
| `https://fomo.family/blog/learn/what-is-fomo` | official_documented | onboarding, Apple Pay, gas sponsorship, multichain single account, social tracking |
| `https://fomo.family/blog/learn/how-to-spot-metas-and-narratives` | official_documented | leaderboard -> holders -> follow workflow; high-signal social feed construction |

## Transaction / risk / trust sources

Current Fomo Learn/Answers and release notes cover:
- liquidity and holder analysis;
- slippage / price impact;
- token verification;
- scam/honeypot/high-volatility warnings;
- unlocked-liquidity/spoofing warnings;
- transaction simulation;
- external-link warnings;
- withdrawal network/address correctness;
- biometric/key-export security;
- gas sponsorship / wallet abstraction.

Canonical synthesis lives in:
- `FOMO_TRANSACTION_UX_MODEL.md`
- `FOMO_TRUST_SAFETY_MODEL.md`
- `FOMO_ACCOUNT_SECURITY_MODEL.md`

## Official public product/frontend architecture sources

### Staff Frontend Engineer
`https://jobs.ashbyhq.com/fomo-labs/0e4030ed-01a9-45dc-b2ba-075874a9b32d`

Publicly states:
- mobile app is an Expo app;
- web app is React Router + Vite;
- backend services are TypeScript;
- frontend ownership spans both mobile and web;
- near-term product plans include new order types, new asset classes including prediction-market examples, and more social features;
- agentic coding tools are heavily used internally.

### Brand Marketing Designer
`https://jobs.ashbyhq.com/fomo-labs/682df2eb-29c9-4083-80d9-7db573ba98e4`

Publicly emphasizes:
- a documented/evolving brand system;
- typography, color, illustration and visual language;
- cohesive brand/product touchpoints;
- systematic thinking plus high craft.

See `FOMO_PRODUCT_TECH_ARCHITECTURE.md`.

## Official published visuals used

### Current landing visuals
- `/images/landing/fomo-desktop.webp`
- `/images/landing/fomo-desktop-phone.webp`
- `/images/landing/social-static.webp`
- `/images/landing/alerts-static.webp`
- `/images/landing/sign-in-static.webp`
- `/images/landing/apple-pay-static.webp`
- `/images/landing/leaderboard.webp`

### Product-guide visuals
- `/images/blog/learn/navigating-your-fomo-app/create-an-account.webp`
- `/images/blog/learn/navigating-your-fomo-app/social-feed.webp`
- `/images/blog/learn/navigating-your-fomo-app/friends-and-leaderboard.webp`
- `/images/blog/learn/navigating-your-fomo-app/profile.webp`

### Social-guide visuals
- `/images/blog/learn/leveraging-fomos-social-features/position.webp`
- `/images/blog/learn/leveraging-fomos-social-features/profile.webp`
- `/images/blog/learn/leveraging-fomos-social-features/leaderboard.webp`
- `/images/blog/learn/leveraging-fomos-social-features/notifications.webp`

These have been visually inspected and normalized in `FOMO_NATIVE_VISUAL_ANATOMY.md`. Exact live UI geometry remains capture-pending.

## App-store sources

### Apple
`https://apps.apple.com/us/app/fomo-never-miss-out/id6741115427`

Observed/refreshed 2026-08-15:
- Finance app, 18+;
- listing describes cross-chain trading, real-time portfolio/PnL, social trading, Apple Pay, deposits/withdrawals;
- **Version 1.81.0** is the most recent version visible in the latest indexed page, released about six days before the refresh, described as small bug fixes;
- version 1.80.2 (Jul 29) was small bug fixes/performance improvements;
- July had a dense sequence of maintenance/performance releases;
- compatibility lists iPhone/iPad and Apple-silicon Mac compatibility while the header says Designed for iPad / not verified for macOS;
- Apple says the developer has not yet indicated which App Store accessibility features the app supports.

Important: store version notes disclose maintenance cadence, not internal causes or feature completeness.

### Google Play
`https://play.google.com/store/apps/details?id=family.fomo.app`

Observed 2026-08-15:
- 100K+ downloads in indexed listing;
- indexed listing updated Jul 2, 2026;
- description emphasizes social trading/following friends;
- public reviews expose latency, authentication, deposit and withdrawal friction signals to investigate as weaknesses.

## External validation sources

Secondary only; see `FOMO_EXTERNAL_VALIDATION.md`:
- Index Ventures Series B perspective;
- Bankless product analyses/interviews;
- public app-store user reviews.

They corroborate product themes or suggest capture hypotheses, but do not override first-party/current live evidence.

## Terms / research boundary

`https://fomo.family/terms`

Current terms restrict unauthorized automated searching/downloading, bots/crawlers, automated account interaction/extraction and reverse engineering. See `FOMO_RESEARCH_BOUNDARY.md`.

Authenticated Phase 2 capture therefore uses ordinary user-driven navigation and user-initiated screenshots/screen recordings, with OpenClaw limited to local/offline analysis and sanitized research output.

## Freshness conflicts to resolve with direct capture

Marketing/product screenshots from different dates disagree on some labels and flows. The complete register is `FOMO_CURRENT_STATE_CONFLICTS.md`.

High-priority examples:
- historical Home categories vs February 2026 filter redesign vs current promotional screenshots;
- email/Apple documentation vs Apple/Google published sign-in visual;
- one-click/one-tap marketing vs slide-to-buy detailed documentation;
- withdrawal rail/path differences across guides;
- exact fee representation in live trade flow.

These are not resolved by guesswork. **Current ordinary-use capture decides the live state.**

## Phase 2 source saturation rule

Before PASS:
1. all significant first-party Fomo UX documentation should be indexed;
2. every official screen available publicly should be categorized;
3. current native/web store state should be checked for freshness;
4. user-review friction signals should be logged separately from facts;
5. current live-state questions should be assigned to M01–M18;
6. direct ordinary-use capture should materially exhaust those unknowns;
7. no later-phase competitor synthesis should displace this Fomo work.
