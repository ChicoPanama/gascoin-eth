# Fomo Phase 2 — Source Index

**Captured:** 2026-08-15  
**Purpose:** Canonical evidence inventory for the Fomo molecular teardown.  
**Rule:** Prefer current first-party material. Marketing claims are evidence of Fomo's product intent, not independent proof of performance.

## Evidence levels

- `official_product`: Fomo's current product/landing pages.
- `official_documented`: Fomo blog/learn/answers explaining behavior.
- `official_published_visual`: screenshot/image published by Fomo.
- `store_listing`: Apple App Store / Google Play metadata.
- `user_review_signal`: public store review; useful for friction discovery, not treated as verified root cause.
- `manual_capture_pending`: requires ordinary user-driven use/capture.

## Primary current sources

| Source | Date / freshness | Evidence | Phase 2 use |
|---|---|---|---|
| `https://fomo.family/` | current landing | official_product + published visuals | current positioning, mobile/desktop marketing visuals, sign-in, feed, alerts, account abstraction |
| `https://fomo.family/download` | current public product page | official_product | social-first positioning, friends/top traders, personalized feed, Apple Pay/debit, key ownership, fee transparency claims |
| `https://fomo.family/blog/announcing-fomo-web` | 2026-04-29 | official_documented | unified balance, no bridge/chain switching, web/mobile continuity, feed, leaderboard, thesis, follows, quick buys |
| `https://fomo.family/blog/tradingview-partnership` | 2026-04-14 | official_documented | progressive advanced charting, social overlays, indicator/drawing depth |
| `https://fomo.family/blog/learn/fomo-security-wallet-architecture` | 2026-03-04 | official_documented | email/Apple account, embedded wallet, FaceID step-up, gas sponsorship, under-30-second first-trade claim |
| `https://fomo.family/blog/february-2026-recap` | 2026-02-28 | official_documented | feed scanability redesign, global thesis, PnL/balance in thesis, price since first swap, verified badge in buy/sell |
| `https://fomo.family/blog/january-2026-recap` | 2026-01-31 | official_documented | Apple Pay onramp, biometrics, token-specific feed, thesis, gainers/filter/fee-context changes |
| `https://fomo.family/blog/december-2025-recap` | 2025-12-31 | official_documented | threaded comments, broader commentable events, dollar presets, Buy Again, on-chain balance in trade sheet, profile search history |
| `https://fomo.family/blog/november-2025-recap` | 2025-11-30 | official_documented | 5-part app redesign, liquid-glass tab bar/notifications, onboarding redesign, profile header, tab-bar search, mutual followers |
| `https://fomo.family/blog/october-2025-recap` | 2025-10-31 | official_documented | dynamic PnL on charts, trade spotlight scan improvements, following toggle, average hold time |
| `https://fomo.family/blog/september-2025-recap` | 2025-09-30 | official_documented | Friends feed, featured discovery sections, token safety warnings, multichain leaderboard/PnL |
| `https://fomo.family/blog/perpetuals-now-on-fomo` | 2026-06-11 | official_documented | social layer extends to new financial product, position half-sheets/share cards, long/short/leverage/notional/equity, advanced SL/TP |
| `https://fomo.family/blog/fomo-series-b` | 2026-06-22 | official_documented/company metrics | stated scale, social interactions, first-time Apple Pay users, product thesis around financial identity |

## Product-navigation / social-system sources

| Source | Evidence | Useful facts |
|---|---|---|
| `https://fomo.family/blog/learn/navigating-your-fomo-app` | official_documented + published visuals | five bottom destinations; Home -> Search -> Feed -> Friends/Leaderboard -> Profile; profile/withdraw path; search users/tokens |
| `https://fomo.family/blog/learn/leveraging-fomos-social-features` | official_documented + published visuals | feed object fields; trade -> position drilldown; profile; 24h/7d/30d/All leaderboard; notification taxonomy |
| `https://fomo.family/blog/learn/a-guide-to-deposits-and-withdrawals` | official_documented | debit/Apple Pay/crypto funding; bank/crypto withdrawal sequences; supported-network warning |
| `https://fomo.family/blog/learn/what-is-fomo` | official_documented | onboarding, one-tap Apple Pay, gas sponsorship, multichain single account, social tracking |

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

## App-store sources

### Apple
`https://apps.apple.com/us/app/fomo-never-miss-out/id6741115427`

Observed 2026-08-15:
- Finance app, 18+;
- current listing describes one-click cross-chain trading, real-time portfolio/PnL, social trading, Apple Pay, deposits/withdrawals;
- frequent 2026 releases are predominantly performance/bug-fix updates;
- compatibility listing includes iPhone/iPad and an Apple-silicon Mac compatibility entry while the header says Designed for iPad / not verified for macOS;
- developer had not declared App Store accessibility feature support at capture time.

### Google Play
`https://play.google.com/store/apps/details?id=family.fomo.app`

Observed 2026-08-15:
- 100K+ downloads in indexed listing;
- current store description emphasizes social trading/following friends;
- public reviews expose latency, authentication, deposit and withdrawal friction signals to investigate as weaknesses.

## Terms / research boundary

`https://fomo.family/terms`

Current terms prohibit unauthorized automated searching/downloading, bots/crawlers, automated account interaction/extraction and reverse engineering. See `FOMO_RESEARCH_BOUNDARY.md`.

Authenticated Phase 2 capture must therefore use ordinary user-driven navigation and user-initiated screenshots/screen recordings, with OpenClaw limited to local/offline analysis and sanitized research output.

## Freshness conflicts to resolve with direct capture

Marketing/product screenshots from different dates disagree on some labels and filters. Examples:
- older Home material references `Verified / Trending / Most held`;
- a current landing visual shows `Verified / Trending / Graduated`;
- February 2026 release notes state the old Verified filter was replaced by a Crypto token filter and added a low-fees category plus Gainers.

These are not treated as contradictions to solve by guesswork. **Current authenticated capture must determine the live IA.**

## Phase 2 source saturation rule

Before PASS:
1. all significant first-party Fomo UX documentation should be indexed;
2. every official screen available publicly should be categorized;
3. user-review friction signals should be logged separately from facts;
4. current live-state questions should be assigned to the manual capture queue;
5. no later-phase competitor synthesis should displace this Fomo work.
