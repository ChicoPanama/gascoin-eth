# Phase 2 — Fomo Manual Capture / OpenClaw Handoff

**Status:** READY FOR USER LOCAL NODE  
**Active roadmap phase:** Phase 2 only  
**Purpose:** Let the user's Mac fill the direct-observation gaps without repeating the completed Fomo research or autonomously scraping/operating Fomo.

# 1. Operating model

```text
USER
  manually uses Fomo in the ordinary way
          |
          v
LOCAL SCREENSHOT / SCREEN RECORDING / NOTES
          |
          v
OPENCLAW LOCAL PROCESSOR
  - offline measurement
  - timestamps
  - geometry
  - observation normalization
          |
          v
SANITIZED PHASE-2 ARTIFACTS
          |
          v
ux-lab
          |
          v
CHATGPT PHASE-2 ANALYSIS
```

OpenClaw is the local measurement/organization node, not an autonomous Fomo bot.

# 2. Before capture

Use a dedicated research/browser context where practical.

Do not expose to research artifacts:
- private keys;
- exported wallet keys;
- banking/card details;
- authentication tokens;
- cookies/session files;
- seed phrases;
- sensitive personal messages/notifications.

Prefer a Fomo account state with only information the user is comfortable inspecting.

# 3. Raw captures stay local by default

Suggested ignored directory:

```text
.local-ux-captures/
  fomo/
    session-YYYYMMDD-HHMM/
      metadata.json
      originals/
      notes.md
      derived/
```

Add `.local-ux-captures/` to local `.git/info/exclude` or `.gitignore` before storing raw captures.

# 4. Session metadata

For every capture session record:

```json
{
  "reference": "fomo",
  "session": "YYYYMMDD-HHMM",
  "platform": "ios|android|web",
  "device": "device/model or browser",
  "os": "version",
  "browser": "name/version if web",
  "viewportCss": {"width": null, "height": null},
  "nativeCapturePixels": {"width": null, "height": null},
  "displayZoom": "default|other|unknown",
  "textSize": "default|other|unknown",
  "theme": "dark|light|system",
  "authenticated": true,
  "funded": "yes|no|redacted",
  "notes": ""
}
```

# 5. Capture naming

Use deterministic names:

```text
M01-feed-start.png
M01-trade-detail.png
M01-profile.png
M02-leaderboard-24h.png
M02-profile.png
M03-buy-boundary.png
M04-home.png
M05-search-zero.png
M05-search-results.png
...
```

Screen recordings:

```text
M01-feed-profile-back.mov
M03-social-to-buy-boundary.mov
M11-signin-reentry.mov
```

# 6. Capture priority

Follow `MEASUREMENT_QUEUE.md`.

Highest priority:
1. M01 Feed -> Profile -> Follow boundary;
2. M02 Leaderboard -> Profile -> return;
3. M03 Social object -> economic action boundary;
4. M04 current Home/discovery IA;
5. M05 Search -> user/token;
6. M06-M10 geometry/anatomy;
7. M11-M15 account/funding/recovery states;
8. M16-M18 cross-device/accessibility.

# 7. Manual interaction event log

While recording a journey, create a simple timestamp log:

```json
[
  {"tMs": 0, "event": "screen_ready", "screen": "feed"},
  {"tMs": 820, "event": "user_tap", "target": "activity_actor"},
  {"tMs": 990, "event": "first_visual_ack"},
  {"tMs": 1180, "event": "screen_ready", "screen": "profile"},
  {"tMs": 2640, "event": "user_back"},
  {"tMs": 2850, "event": "screen_ready", "screen": "feed"}
]
```

Only record what is actually visible. Do not infer network finality or backend state.

# 8. Offline geometry extraction

OpenClaw/local tooling may inspect **saved captures** and derive:
- pixel rectangle x/y/w/h;
- relative screen percentage;
- gap/padding estimates from visible edges;
- text box dimensions;
- bottom-nav footprint;
- card density;
- primary CTA footprint;
- chart/profile/list proportions.

Because native pixels and CSS points differ, preserve raw capture dimensions and label the coordinate system.

Do not label derived screenshot geometry as `computed CSS`.

# 9. Interaction metrics

For each journey derive:

```json
{
  "intentionalActions": null,
  "screenTransitions": null,
  "modalOrSheetCount": null,
  "firstVisualAckMs": null,
  "nextScreenReadyMs": null,
  "backRestoresContext": null,
  "scrollRestored": null,
  "walletOrChainVocabularyVisible": [],
  "moneyStateLabels": [],
  "unknowns": []
}
```

# 10. Sanitized observation output

Commit only a sanitized derivative such as:

`ux-research/phase-2/fomo/captures/session-YYYYMMDD-HHMM/observations.json`

Example:

```json
{
  "reference": "fomo",
  "measurement": "M02",
  "evidence": "capture_measured",
  "platform": "ios",
  "facts": [
    "leaderboard has four visible timeframe controls",
    "row tap opens trader profile",
    "back returns to prior timeframe"
  ],
  "metrics": {
    "intentionalActionsToProfile": 1,
    "rowsVisibleInViewport": 7
  },
  "sensitiveDataRemoved": true
}
```

# 11. Do not commit raw screenshots by default

The repository needs the **derived UX facts**, not a mirror of Fomo or the user's account.

Raw imagery can remain local and be summarized into:
- rectangles;
- counts;
- timings;
- hierarchy descriptions;
- state-machine observations.

If a visual excerpt is ever needed for internal comparison, sanitize it first and keep the scope minimal.

# 12. Financial boundary

The user does not need to make a trade, deposit or withdrawal purely for research.

For financial journeys:
- navigate to the normal pre-confirmation boundary;
- record visible fields and state;
- stop before a money-moving action.

If the user independently performs a legitimate transaction for their own purposes, its normal state transitions may be observed, but research must not trigger the transaction.

# 13. OpenClaw processing prompt concept

The local agent can be instructed approximately:

> Analyze only the local Fomo UX captures supplied in this session. Do not navigate Fomo, log into Fomo, execute browser actions against Fomo, make financial transactions, inspect cookies/tokens, or probe network/private APIs. Extract screen hierarchy, visible geometry, interaction timestamps from the user's event log/video, and normalize the derived observations into the Phase 2 schemas in the GAS repo. Redact personal/account/payment data. Do not copy visual assets into GAS implementation code.

# 14. Completion manifest

Maintain:

```json
{
  "M01": "pending|complete|unavailable",
  "M02": "pending|complete|unavailable",
  "M03": "pending|complete|unavailable",
  "M04": "pending|complete|unavailable",
  "M05": "pending|complete|unavailable",
  "M06": "pending|complete|unavailable",
  "M07": "pending|complete|unavailable",
  "M08": "pending|complete|unavailable",
  "M09": "pending|complete|unavailable",
  "M10": "pending|complete|unavailable",
  "M11": "pending|complete|unavailable",
  "M12": "pending|complete|unavailable",
  "M13": "pending|complete|unavailable",
  "M14": "pending|complete|unavailable",
  "M15": "pending|complete|unavailable",
  "M16": "pending|complete|unavailable",
  "M17": "pending|complete|unavailable",
  "M18": "pending|complete|unavailable"
}
```

An `unavailable` item requires a reason.

# 15. Phase 2 gate

When the completion manifest is materially exhausted, reconcile:
- documented evidence;
- official published visuals;
- manual observations;
- capture measurements;
- friction hypotheses confirmed/rejected;
- GAS compatibility mapping.

Only then evaluate `PHASE_2_GATE.md`.

**Do not activate Phase 3 merely because later-phase pre-work exists.**
