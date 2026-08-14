# Phase 2 — Fomo Social-Action Benchmark

**Status:** evidence-backed Phase 2 artifact
**Purpose:** Quantify the public/documented Fomo social-discovery loop and translate it into explicit GAS UX targets without inventing inaccessible measurements.

## Evidence basis

Primary official Fomo sources reviewed:
- `Leveraging fomo's Social Features: Leaderboards, Feeds, and Notifications` — December 25, 2025
- `Navigating your fomo app` — December 25, 2025
- `February 2026 Recap: Feed Revamp, Send v2 & Trade Thesis` — February 28, 2026
- `Announcing fomo web` — April 29, 2026
- `How fomo Keeps Your Crypto Secure` — March 4, 2026

Evidence types in this artifact:
- **DOCUMENTED** — stated in official Fomo product documentation.
- **OBSERVED-SCREENSHOT** — visible in official Fomo screenshots published with those documents.
- **UNKNOWN** — cannot be responsibly claimed without direct interactive access/measurement.

---

## 1. Bottom-navigation benchmark

### Fomo
**DOCUMENTED:** mobile exposes five persistent bottom destinations. Official navigation guidance describes Home, Search, Social Feed, Friends/Leaderboard, and Profile.

**OBSERVED-SCREENSHOT:** the Friends/Leaderboard screenshot shows a fixed five-icon bottom navigation with the active social destination highlighted.

### GAS implication
Keep the Phase 6 mobile primary navigation to five destinations maximum.

Current GAS candidate:
`HOME | PLAY | TRADE | CREWS | WALLET`

Reserve remains one tap from Home/Wallet trust state rather than consuming a sixth permanent mobile slot.

### GAS target
- persistent mobile primary destinations: **5**
- primary destination changes: **1 intentional tap**
- selected destination must remain visually and semantically obvious without color alone

---

## 2. Feed → trade details → trader profile → follow

### Fomo documented path
Official Fomo social guidance states:
1. a trade appears in the social feed;
2. the user can click the trade to open the full trade/position details;
3. from there the user can click the trader profile;
4. the profile exposes history/performance/portfolio/transactions;
5. the user can follow the trader.

### Documented minimum action count
Starting on an already-visible social-feed trade:

`trade object -> position detail -> trader profile -> Follow`

**Documented minimum: 3 intentional actions**

This is not a latency measurement. Exact modal/page behavior and back-stack behavior remain UNKNOWN until directly measured.

### GAS opportunity
A GAS game result is structurally simpler than a trade thesis because the canonical activity object already contains a verifiable round, mode, wager, multiplier and payout.

GAS should support two independent paths from the same result object:

**Identity path**
`result -> player profile -> Follow`

**Action path**
`result -> TRY MODE -> explicit IGNITION`

### GAS targets
- result -> player profile -> follow: **<=2 actions**
- result -> matching GAS mode/configuration: **1 action**
- matching configuration -> wager submission: **1 explicit IGNITION action**
- no social action may auto-submit a wager
- back navigation returns to the originating feed position

This intentionally aims to outperform the documented Fomo discovery loop on activity-to-action while preserving explicit financial intent.

---

## 3. Leaderboard → profile → follow

### Fomo documented path
Official Fomo guidance states:
1. open Friends & Leaderboard;
2. choose a timeframe (24h / 7D / 30D / All-time as relevant);
3. click a trader account;
4. review profile breakdown;
5. follow if desired.

The official screenshot visibly prioritizes:
- user's own rank/performance at top;
- timeframe filters near leaderboard heading;
- ranked rows with avatar, identity and performance amount;
- persistent bottom navigation.

### Documented action count
Starting on an already-open leaderboard with the desired timeframe selected:

`leaderboard row -> profile -> Follow`

**Documented minimum: 2 intentional actions**

If timeframe selection is required, add one action.

### GAS targets
For player and Crew leaderboards:
- row -> profile/detail: **1 action**
- profile -> follow/join: **1 action**
- timeframe change: **1 action**
- returning to leaderboard must preserve timeframe and scroll position
- user's own rank must be easy to locate without displacing the ranked list

Existing GAS leaderboard URL-state and no-scroll tab switching are useful primitives and should be preserved during refactor.

---

## 4. Social object information density

### Fomo documented/observed hierarchy
The social feed exposes trading activity plus economic context. Official 2026 documentation specifically states that trade theses in the global feed include trader PnL and balance, and that the feed redesign was intended to be easier to scan during high-activity periods.

Official screenshots show social cards combining:
- trader identity/avatar;
- action/activity verb;
- asset/token identity;
- market/economic context;
- performance movement/PnL;
- timestamp;
- reaction/comment/share affordances.

### GAS translation
A default GAS result card should contain no more than the decision-critical equivalent:
- player identity;
- game/mode;
- wager;
- multiplier/result;
- payout delta;
- timestamp;
- verification state;
- one primary contextual CTA (`TRY MODE`);
- secondary social/verify actions.

Avoid adding every available protocol metric to the card.

### GAS target
Above the fold, a result card should have:
- **1 dominant economic result**
- **1 primary contextual action**
- **<=3 secondary social/trust actions visible by default**
- deeper round/odds/protocol details behind progressive disclosure

Exact card-height/pixel benchmarks remain UNKNOWN until direct capture is available.

---

## 5. Global vs following feed

### Fomo
Official Fomo documentation describes social discovery from both top traders and followed accounts. Public product material also describes following/friends segmentation and notifications tied to followed traders.

### GAS requirement
GAS should not force every user into one undifferentiated global firehose.

Phase 6 should preserve at least:
- broad discovery (`For You` / global)
- followed identities / Crew-relevant activity (`Following`)

Do not over-segment at launch.

### GAS target
Changing feed scope: **1 action** with feed position/state preserved when reasonable.

---

## 6. Profile hierarchy benchmark

### Fomo observed screenshot
The official trader-profile screenshot visibly puts these elements in the initial mobile hierarchy:
1. identity/avatar/handle;
2. Follow CTA;
3. social/trade counts;
4. portfolio value and timeframe performance;
5. chart;
6. cash balance;
7. open positions.

### GAS translation
A GAS player profile should prioritize:
1. identity/avatar/Crew;
2. Follow CTA;
3. verifiable GAS activity summary;
4. biggest verified hit / recent performance metric with precise semantics;
5. activity/result history;
6. optional holdings only if user elects to make them public.

Do not expose a raw wallet address as the primary identity when a profile exists.

### GAS target
A viewer should be able to answer within the first mobile viewport:
- Who is this?
- Why might I follow them?
- What verified activity supports that judgment?
- How do I follow them?

---

## 7. Cross-device continuity

### Fomo
Official Fomo web documentation says the same account carries profile, balance, positions, following and notification settings between mobile and web. Fomo explicitly avoids turning desktop into a separate professional-terminal product.

### GAS requirement
GAS must keep one behavioral model across mobile and desktop:
- same identity;
- same balances/account semantics;
- same following/Crews;
- same game history;
- same safe preferences such as selected mode and Instant Mode;
- same unresolved/pending round state.

Desktop may add context but cannot create a different product model.

---

## 8. Account abstraction lesson

### Fomo
Official 2026 security documentation describes email/Apple-ID account entry, embedded smart wallets, gas sponsorship, transaction batching and a unified USD balance across supported chains.

### GAS implication
This supports the existing GAS UX target that normal users should not need RPC configuration, native gas-token management, bridge knowledge or repeated wallet prompts for routine interactions when the chosen account architecture can safely abstract them.

This is **not** a Phase 2 implementation decision. Exact GAS smart-account/session-permission architecture remains a Phase 6+ design choice and must respect the final deployment chain and security model.

---

## 9. What GAS should explicitly improve over Fomo

1. **Canonical verification attached to activity** — GAS game results can link directly to a round verifier rather than relying primarily on reputation/social presentation.
2. **Activity → same configuration in one action** — `TRY MODE` can preconfigure the exact game context because the referenced object is a deterministic GAS game configuration.
3. **Stronger economic-domain semantics** — GAS account UI must keep spendable funds, game state, monetary reserve and future Bracket positions distinct even while presenting one coherent account shell.
4. **Recovery as a first-class social/action state** — deep links into a pending/expired/insufficient-balance configuration should preserve context and present one safe recovery action rather than dead-ending.
5. **No fake activity/social proof** — every economically meaningful feed event must be canonical or clearly identified as user-generated content.

---

## 10. Phase 2 benchmark decisions produced by this task

### Lock as Phase 2 candidate benchmarks
- Mobile primary navigation: **5 persistent destinations maximum**.
- Feed result -> profile -> follow: **GAS target <=2 actions**.
- Social result -> matching GAS mode: **1 action**.
- Matching mode -> actual wager: **1 explicit IGNITION action**.
- Leaderboard row -> profile -> follow/join: **2 actions**.
- Feed-scope switch: **1 action**.
- Social result card: **1 dominant result + 1 dominant contextual CTA**.
- Desktop and mobile: **same product/account/social state model**.

### Still unknown / requires direct measurement
- exact Fomo card heights and spacing;
- transition/navigation milliseconds;
- exact loading skeleton timings;
- exact public desktop feed geometry;
- back-navigation implementation details;
- authenticated failure/empty-state behavior;
- notification-to-action timing;
- action acknowledgement latency.

Unknown values must remain unknown until directly measured.

## Outcome

This task advances Phase 2 from qualitative inspiration to documented journey benchmarks. The most important result for GAS is that its social object can be more actionable than Fomo's trading object because a verified GAS result already contains the complete mode/round context needed to preconfigure Play while still requiring explicit user intent to wager.
