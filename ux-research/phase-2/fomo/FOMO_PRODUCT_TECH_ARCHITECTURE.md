# Phase 2 — Fomo Product / Public Frontend Architecture

**Status:** Supplemental Phase 2 evidence  
**Sources:** Fomo official product/blog material and current Fomo Labs public job postings.  
**Boundary:** This documents publicly disclosed architecture and product structure. It is not source-code reverse engineering.

## 1. Product architecture thesis

Fomo's current first-party messaging repeatedly converges on:

- trading app for ordinary consumers / “the rest of us”;
- application identity before blockchain infrastructure;
- access to multiple chains/assets through one user-facing account/balance;
- economic activity as social content;
- profile/performance/follow graph as financial identity;
- deeper trading tools available without turning the default shell into a terminal;
- new asset classes extending the same social/account primitives.

Series B material explicitly describes the strategic product as an accessible global on-chain trading application where infrastructure is abstracted and users can see what others buy/hold, build financial identity and grow a following.

## 2. Mobile and web are separate primary surfaces

Current Fomo Labs Staff Frontend Engineer job posting publicly states:

- **mobile app:** Expo;
- **web app:** React Router + Vite;
- **backend services:** TypeScript.

The role owns both primary product surfaces.

### Phase 2 interpretation
Fomo's cross-device parity is a **data/product-state invariant**, not evidence that mobile and web must share identical framework/layout code.

## 3. Social/account behavior spans both surfaces

Fomo's web launch says the same user carries:
- account/profile;
- balance;
- positions;
- following/social graph;
- notification settings
between mobile and web.

Therefore the important architecture boundary is:

```text
CANONICAL ACCOUNT / SOCIAL / FINANCIAL STATE
        |                     |
        v                     v
    MOBILE UI               WEB UI
```

rather than forcing identical navigation/components.

## 4. Mobile framework choice supports native-feeling iteration

The public engineering posting identifies Expo for mobile, consistent with Fomo shipping:
- iOS;
- Android;
- native-style bottom navigation;
- biometric/system interactions;
- push notifications;
- frequent app-store releases.

Exact Fomo Expo/React Native internal implementation details are not publicly documented here and should not be inferred.

## 5. Web intentionally uses a dedicated dense financial workspace

Fomo web uses a dedicated React web surface and its own desktop IA:
- persistent discovery/token rail;
- global search;
- large TradingView chart;
- social overlays;
- execution rail;
- token/holder/trade/thesis context.

This is compatible with the official product position that web preserves the same user journeys while spending desktop pixels on more context.

## 6. Product expansion is planned against the existing shell

The current Staff Frontend Engineer posting says near-term plans include:
- new order types;
- new asset classes, including examples such as perpetuals and prediction markets;
- doubling down on social features.

Perpetuals already demonstrate the pattern: feed/leaderboard/thesis/profiles/notifications/position cards were extended rather than replaced.

### Phase 2 law
**Identity, social graph, activity-object grammar and account semantics are platform capabilities, not one-product features.**

## 7. Product team values domain-native iteration

The public engineering posting says personal crypto trading experience is valued and frames domain use as part of what differentiates the product. It also states most code is currently written with agentic tools.

A Fomo brand/design role emphasizes:
- evolving/documenting the brand system;
- typography/color/illustration/visual language;
- cohesive touchpoints across product/brand;
- systematic thinking plus high-detail execution.

### Phase 2 interpretation
Fomo's own organization treats **product fluency + design-system consistency + fast iteration** as connected capabilities.

This supports our research focus on interaction/state systems rather than isolated screens.

## 8. GAS compatibility implication — evidence handoff only

GAS already has a mature React/Next web substrate. Fomo's public stack gives no reason to rewrite GAS into Expo/Vite solely to imitate Fomo.

The Phase 2 transferable requirements are architectural:
- canonical identity/social state independent of page/component;
- one financial/account model across devices;
- domain objects reusable across Feed/Profile/notifications/new products;
- device-specific layout allowed;
- design-system consistency;
- new asset/game/Bracket products should extend the same identity/social shell later.

Whether GAS eventually needs a native/mobile shell is a later roadmap decision. Phase 2 does not decide that architecture.

## 9. Direct-capture relevance

Manual capture should focus on behavior that cannot be inferred from framework choice:
- native gestures;
- sheet/full-screen transitions;
- haptic/system prompt behavior;
- web hover/keyboard behavior;
- cross-device state reconciliation;
- responsive transformation;
- live Feed update behavior;
- transaction pending/error states.

## Sources

- https://jobs.ashbyhq.com/fomo-labs/0e4030ed-01a9-45dc-b2ba-075874a9b32d
- https://jobs.ashbyhq.com/fomo-labs/682df2eb-29c9-4083-80d9-7db573ba98e4
- https://fomo.family/blog/announcing-fomo-web
- https://fomo.family/blog/perpetuals-now-on-fomo
- https://fomo.family/blog/fomo-series-b
- https://fomo.family/blog/tradingview-partnership/

## Phase 2 conclusion

The publicly visible technical fact that Fomo uses different mobile/web frontend stacks strengthens rather than weakens the core product lesson:

**the thing that must remain unified is the user's identity, relationships, economic objects and account state—not the presentation framework.**
