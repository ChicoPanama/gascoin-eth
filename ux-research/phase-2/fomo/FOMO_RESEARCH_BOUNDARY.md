# Phase 2 — Fomo Research Boundary

**Status:** ACTIVE constraint for the Fomo molecular teardown

## Purpose

Collect the deepest legitimate Fomo UX evidence possible without confusing reference analysis with copying proprietary implementation or violating the product's access restrictions.

## Allowed evidence channels

1. Official Fomo marketing/product pages and blog posts.
2. Official Fomo screenshots and videos published on `fomo.family`.
3. Official App Store / Google Play listings, version history and public reviews.
4. Ordinary manual use of a legitimately created Fomo account by the user.
5. User-initiated screenshots or screen recordings of ordinary product use.
6. Offline analysis of those user-provided captures for layout, hierarchy, interaction count, timing and state transitions.
7. Public web behavior that is accessible through normal browser use without bypassing authentication/security.

## OpenClaw role

OpenClaw may be used as a **local processing and capture assistant**, not as an autonomous Fomo scraper/operator.

Safe role:
- organize user-created screenshots/screen recordings;
- inspect local image/video dimensions;
- measure visible geometry in saved captures;
- timestamp manually initiated interaction recordings;
- normalize observations into the GAS UX schema;
- write sanitized research artifacts into the local GAS repo;
- push those sanitized artifacts to `ux-lab`.

Do not use OpenClaw to:
- crawl/scrape Fomo account data;
- automate account creation;
- automatically follow/message/post;
- automatically execute or stage trades;
- probe non-public endpoints;
- bypass security/authentication/geo controls;
- export keys/credentials/session tokens;
- copy proprietary source bundles for reuse.

## Evidence labels

- `documented`: stated by Fomo in official material.
- `published_visual`: visible in Fomo-published screenshot/video.
- `manual_observed`: observed by the user during ordinary use.
- `capture_measured`: measured from a user-initiated screenshot/screen recording.
- `inferred`: analyst interpretation; never represented as measured fact.

## Commercial-design rule

The GAS implementation must use independent React/components, GAS branding, GAS information architecture and GAS protocol semantics. Research extracts **behavioral principles and performance targets**, not proprietary assets or code.

## Current source basis

Fomo's current Terms of Use prohibit unauthorized automated searching/downloading, automated account control, automated extraction/harvesting, and reverse engineering. This boundary is intentionally stricter than the earlier browser-harvester concept for authenticated Fomo states.

## Phase 2 implication

The Fomo gate remains open until:
- official/public evidence is saturated;
- the user's ordinary-use captures are analyzed once available;
- high-value unknowns are either measured from user-initiated captures or explicitly marked unavailable;
- Fomo strengths and weaknesses are translated into independent GAS requirements.
