# Phase 2 — Fomo Visual Observations

**Evidence state:** OBSERVED from Fomo-published product screenshots. These are not yet instrumented geometry measurements.

Source guide:
`https://fomo.family/blog/learn/navigating-your-fomo-app`

Direct image sources:
- `https://fomo.family/images/blog/learn/navigating-your-fomo-app/social-feed.webp`
- `https://fomo.family/images/blog/learn/navigating-your-fomo-app/friends-and-leaderboard.webp`
- `https://fomo.family/images/blog/learn/navigating-your-fomo-app/profile.webp`
- `https://fomo.family/images/blog/learn/navigating-your-fomo-app/create-an-account.webp`

## 1. Mobile shell

Observed:
- five persistent bottom navigation destinations;
- Home appears leftmost;
- Search is adjacent to Home;
- Feed occupies the visually dominant middle destination;
- Friends/Leaderboard is immediately to the right of Feed;
- Profile/Account is rightmost;
- selected destination is visually emphasized inside the bottom shell;
- bottom shell overlays/occupies the lower thumb region rather than requiring a hamburger menu for core destinations.

### GAS translation candidate

`HOME | DISCOVER/SEARCH | PLAY | SOCIAL/CREWS | ACCOUNT`

Phase 6 must decide whether Play or Social owns the center slot. GAS has a stronger single primary action than Fomo, so the center may belong to Play/IGNITION while Social remains one tap away.

This is a hypothesis for Phase 6, not a Phase 2 lock.

---

## 2. Feed hierarchy

Observed in published Social Feed screenshot:
- title `Feed` at the upper-left;
- `Friends only` toggle at upper-right;
- pinned content can occupy the first feed block;
- feed uses vertically stacked event blocks rather than a dense table;
- user identity + action language + relative time appears above/beside the financial object;
- action language visually distinguishes buys/sells/position events;
- token/activity card appears immediately under the actor/action line;
- token card contains financial values without forcing a separate detail view for basic context;
- center Feed destination remains available in the persistent bottom shell.

### GAS translation

A GAS activity card should have stable zones:
1. identity + verified state;
2. event verb/type;
3. time;
4. primary financial/game object;
5. magnitude/result/status;
6. contextual action.

Do not turn the GAS feed into a transaction table or generic text forum.

---

## 3. Leaderboard hierarchy

Observed:
- Friends and Leaderboard share one primary destination with a top tab switch;
- `Your rank` is surfaced before the global/top-trader list;
- Top Traders heading is paired with compact timeframe selectors (`24h`, `7d`, `30d`, `All`);
- rows emphasize rank, avatar, display identity/handle, performance value, and a compact representation of holdings/context;
- performance uses semantic positive/negative treatment;
- list density is high but scan structure is consistent.

### GAS translation

Potential player/Crew leaderboard row grammar:
`rank -> identity -> verified performance/activity metric -> compact contextual badges`

Timeframe controls are likely useful for GAS player/Crew rankings, but exact metrics must be chosen after game/social benchmark work to avoid encouraging misleading loss-heavy ranking incentives.

---

## 4. Profile hierarchy

Observed:
- identity/avatar at top;
- Follow is a prominent primary action on another user's profile;
- handle/bio precede performance;
- follower/following counts are visible near identity;
- behavioral/account context (trade count, hold-time/join context) sits between identity and portfolio performance;
- large total portfolio/performance figure is visually dominant;
- timeframe selector sits adjacent to performance context;
- performance chart follows immediately;
- `Cash balance` is shown distinctly from `Open positions`;
- open positions are expandable/listed separately with position value and percentage context.

### GAS translation

GAS should preserve semantic separation:
- spendable balance;
- GAS/wGAS assets;
- pending/locked game amounts;
- game/trade history;
- later marked Bracket positions;
while presenting one coherent account shell.

A GAS player profile should not confuse bankroll winnings, wallet assets, reserve backing, and marked positions.

---

## 5. Sign-in hierarchy

Observed in Fomo-published account-creation screenshot:
- branding/hero image occupies the upper/middle screen;
- one concise promise appears immediately above login methods;
- large Apple and Google sign-in controls dominate the actionable lower section;
- legal text is secondary and directly below authentication controls;
- no seed phrase, chain selector, wallet extension, RPC or gas-token terminology is visible on the first screen.

### GAS translation

Project GAS onboarding should be account-first. Wallet/network implementation details are progressive disclosure. External-wallet linking may remain available, but must not define the default consumer journey.

---

## 6. Evidence limits

These observations are visual/structural only.

Not yet measured:
- exact device logical viewport;
- CSS pixel dimensions;
- padding/gap values;
- typography sizes;
- tap-target geometry;
- transition timing;
- loading latency;
- animation curves;
- scroll retention;
- live insertion timing.

Those remain Phase 2 molecular-capture tasks and must not be fabricated from the screenshots.
