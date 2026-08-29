# Phase 2 — Fomo Trust & Safety UX Model

**Status:** Evidence-backed Phase 2 model  
**Scope:** How Fomo introduces safety, verification, transaction risk and sensitive-action controls without making them the dominant product shell.

## 1. Safety context is attached to the risky object

Fomo's release notes and education describe risk cues directly on token/trade surfaces rather than only in generic documentation.

Examples include:
- high-volatility warnings;
- scam/honeypot warnings;
- significant unlocked-liquidity warnings;
- spoofing warnings for lookalike launchpad tokens;
- verified-token badges;
- verified badge in the buy/sell token header;
- locked-liquidity information;
- holder/ownership information;
- liquidity/volume data.

### Phase 2 law
**Put the safety signal beside the decision it affects.**

## 2. Verification is visible but does not hide unverified assets

Fomo allows broad asset access while providing verification/safety markers and filters/categories.

The UX pattern is therefore not a simple allowlist. It is:
- broad discovery;
- visible risk differentiation;
- stronger confidence cues for verified objects.

### Open capture question
How prominent is the live verification/risk state on the final action boundary today?

## 3. Transaction simulation is an optional trust primitive

January 2026 release notes added a **transaction simulation toggle** to preview transactions before sending.

This is significant because it offers additional confidence without permanently making the primary execution flow multi-step.

### Product principle
**Optional verification depth can coexist with a fast default path.**

Direct capture should determine:
- where simulation lives;
- whether it is default-on/off;
- what a preview communicates;
- how failure is displayed;
- whether using it changes the final gesture.

## 4. External-link warnings interrupt at the boundary

January 2026 added warnings before redirecting users to Telegram links.

This is a useful boundary pattern:
- ordinary in-app navigation remains fast;
- transition into a higher-risk external environment receives friction/context.

## 5. Crypto-with-message uses content moderation

February 2026 Send v2 supports notes/images with transfers and states that messages use AI-powered content moderation.

This demonstrates that financial/social objects may require a moderation layer separate from transaction validity.

### GAS later
Canonical protocol facts and social/user-authored content should remain different trust domains.

## 6. Sensitive account actions receive stronger authentication

Official security material documents FaceID on Apple devices for:
- opening protected app access;
- withdrawals;
- private-key export.

This is consequence-based friction rather than repeated friction on every ordinary navigation/action.

## 7. Withdrawal UX reduces address-entry error where possible

September 2025 release notes added QR scanning during withdrawal so users can scan a wallet address instead of manually copy/pasting.

At the same time, Fomo's withdrawal guide explicitly warns about:
- correct address;
- correct network;
- receiving-wallet USDC support.

### Phase 2 law
**Remove mechanical error opportunities, but do not erase irreversible network consequences.**

## 8. Market-risk information is deeper but adjacent

Fomo documents an `About` area where users can inspect:
- liquidity;
- holders;
- market cap;
- volume;
- token details/social links.

This is progressive disclosure: the fast trade surface stays compact, while a user can inspect deeper risk before acting.

## 9. Price-impact/slippage education is explicit

Fomo's own educational material explains:
- low liquidity;
- order-size price impact;
- congestion/network delay;
- slippage tolerance;
- inability to exit thin markets.

Current Terms similarly warn of failed transactions, slippage and inability to close under adverse market/protocol conditions.

### Direct-capture question
Which of these risks are surfaced in the actual quote/action sheet versus available only in education/About?

## 10. Social trust cues

Trust in Fomo is not only token verification. Social identity also exposes context such as:
- performance;
- PnL;
- cash balance/open positions;
- average hold time;
- mutual followers;
- transaction history;
- top-trader ranking.

These are intended to help users evaluate an actor before following their activity.

### Risk
A large performance number can also become persuasion. Trust context must not be confused with investment suitability.

## 11. Notification customization is a safety/noise control

Fomo lets users control notification families and, for Friends activity, filter by specific users and trade-size thresholds.

This can reduce signal overload and allows users to choose the intensity of SocialFi re-entry.

A Fomo-hosted trader interview also describes the downside of following too many traders and chasing notifications, reinforcing notification overload as a real product-risk class rather than only a theoretical concern.

## 12. Share cards and referrals add provenance/distribution

Fomo's earlier guides reference win/fumble/PnL share cards. January 2026 added referral codes to shared trade links.

This makes social distribution measurable/actionable, but also raises a trust requirement: a shared result should distinguish verified product data from promotional/user-authored framing.

## 13. Current trust/safety capture checklist

Observe without creating risky behavior:
- verified-token state on token and buy/sell surfaces;
- volatility/honeypot/scam/unlocked-liquidity warnings if naturally encountered;
- transaction-simulation setting;
- liquidity/holder data depth;
- Telegram/external-link warning if naturally encountered;
- QR-withdrawal affordance without submitting a withdrawal;
- biometric/step-up boundary before withdrawal/key actions;
- notification filters;
- block/mute/report/moderation affordances;
- source/provenance labels on thesis/comments/financial events;
- whether warnings are dismissible/persistent;
- whether critical warnings are communicated by more than color.

## Sources

- https://fomo.family/blog/september-2025-recap
- https://fomo.family/blog/january-2026-recap/
- https://fomo.family/blog/february-2026-recap
- https://fomo.family/blog/learn/spotting-scams-and-low-quality-tokens/
- https://fomo.family/blog/learn/understanding-liquidity-in-crypto/
- https://fomo.family/blog/learn/decoding-token-stats/
- https://fomo.family/blog/learn/fomo-security-wallet-architecture
- https://fomo.family/blog/learn/a-guide-to-deposits-and-withdrawals
- https://fomo.family/terms

## Phase 2 conclusion

Fomo's safety UX follows a recurring architecture:

**hide infrastructure complexity, not consequence; attach warnings/verification to the risky object; step security up at irreversible boundaries; leave deeper inspection available without blocking every normal action.**
