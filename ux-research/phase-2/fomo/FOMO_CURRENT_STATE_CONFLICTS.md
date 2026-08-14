# Phase 2 — Fomo Current-State Conflict Register

**Status:** ACTIVE capture checklist  
**Purpose:** Public Fomo sources span different release dates and sometimes disagree. Never resolve these disagreements by guessing; direct current ordinary-use observation decides the live state.

## C01 — Home discovery filters

### Evidence A — Dec 2025 navigation guide
Lists Home examples:
- Verified
- Trending
- Most held

### Evidence B — Feb 2026 release notes
States:
- Crypto token filter **replaces old Verified filter**;
- low-fees category added;
- Gainers filter added.

### Evidence C — current promotional/App Store-style visual indexed in 2026
Shows:
- Verified
- Trending
- Graduated

### Capture question
What are the exact current live Home categories, order, default and persistence today?

**Do not use historical labels in GAS benchmark targets.**

---

## C02 — Primary account/sign-in methods

### Evidence A — Dec 2025 navigation/deposit guides
Document:
- Email
- Apple ID

### Evidence B — Mar/Apr 2026 security/web docs
Still describe email/Apple ID account identity.

### Evidence C — current Fomo-published sign-in artwork
Visually includes Apple and Google sign-in controls.

### Capture question
What identity providers are actually exposed in the current iOS/web/Android interfaces, and how do recovery/re-entry differ?

---

## C03 — Buy interaction wording

### Marketing language
Frequently says:
- one click;
- one tap;
- instant purchase.

### Detailed transaction/security docs
Consistently describe:
- `slide to buy`.

### Capture question
Is the current final trade commitment a slide gesture, tap/button, system payment sheet, or different mechanism by platform/payment path?

---

## C04 — Withdrawal rails

### Navigation guide
Says users have options including:
- crypto;
- debit card;
- bank account.

### Detailed deposits/withdrawals guide
Gives detailed withdrawal flows for:
- bank account;
- crypto.

It does not provide an equivalent debit-card withdrawal sequence in the same section.

### Capture question
What withdrawal rails are actually live for the user's region/account today? What is shown but unavailable?

---

## C05 — Withdrawal location/path

### Navigation guide
Says withdraw by clicking Cash Balance on Profile.

### Withdrawal answers
Describe navigating to balance and selecting Withdraw.

### Capture question
Is withdrawal initiated from Profile/Cash Balance, an account action sheet, a wallet/balance detail screen, or multiple equivalent entry points?

---

## C06 — Repeat-trade label

### Dec 2025 recap
References `Buy Again` after closing a position.

### Jan 2026 recap
References `Sell again` on completed trades for quick re-entries.

This may reflect product evolution, wording ambiguity, or separate contexts.

### Capture question
What repeat-action controls exist now after buy/sell/position-close and what configuration do they retain?

---

## C07 — Platform availability wording

### Current app stores
Fomo is publicly listed on both iOS and Google Play.

### Current Terms language
Some contractual sections describe Services through the iOS app.

### Capture implication
Do not derive platform UX/support policy solely from Terms wording. Use current actual product availability and ordinary user observation for platform behavior; use Terms only for legal/fee/risk constraints.

---

## C08 — User-scale numbers

Current public surfaces vary:
- landing page uses a 500,000-trader statement;
- June 2026 Series B post reports 625K+ users;
- app-store listings show their own install/rating counts.

### Phase 2 treatment
These are not UX geometry inputs and are company/store metrics at different timestamps. Do not use them as a UI requirement or infer current active-user counts.

---

## C09 — Fee language

### Marketing/release notes
Use terms such as low fees / no hidden costs / fee advantage.

### Current Terms
State minimum service fee:
- 0.50% per transaction;
- $0.95 minimum.

Terms also note additional third-party fees may apply and say Fomo may not always disclose every third-party fee prior to transaction.

### Capture question
What actual fee estimate is shown in current Buy/Sell flows, especially for small orders affected by the minimum?

---

## C10 — First-action timing claims

Public Fomo materials variously say:
- account in one click;
- under 30 seconds;
- under a minute from download to first trade;
- two minutes to be ready in an older deposit guide.

### Phase 2 treatment
These are product/company claims from different scopes/dates—not measured benchmarks.

### Capture question
Measure only the user-driven current journey with a timestamp log; never use the marketing claim as measured latency.

---

## C11 — Cross-chain abstraction vs external crypto transfer

### Product claim
One balance, no bridge/chain-switching for ordinary trading.

### Deposit/withdraw docs
External crypto transfer still requires choosing/checking a supported network.

### Interpretation
Not actually contradictory: infrastructure can be hidden inside the product while external transfer boundaries remain network-specific.

### Capture question
How does current UI transition from simple account language into network-specific external-transfer language?

---

## C12 — Social feed population

Older guide describes Feed as showing:
- followed accounts;
- top traders.

Later releases add:
- following toggle;
- global thesis;
- token-specific feeds;
- more economic event types.

### Capture question
What is the live default feed population today? How does Friends/following scope interact with top/global content?

---

# Rule for Phase 2

For every conflict:
1. preserve dated evidence;
2. mark `current_live = unknown`;
3. add it to M01–M18 where relevant;
4. resolve only through legitimate current observation;
5. if still inaccessible, mark unavailable rather than choosing a historical state.
