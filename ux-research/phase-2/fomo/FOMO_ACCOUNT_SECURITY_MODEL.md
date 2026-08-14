# Phase 2 — Fomo Account & Security UX Model

**Status:** Evidence-backed Phase 2 model  
**Evidence:** Official Fomo product/security/onboarding documentation; current terms; official published visuals.  
**Measurement status:** behavioral model documented; exact live geometry/timing pending manual capture.

## 1. Consumer identity is the front door

Fomo presents the product as an application account first and a blockchain wallet second.

Documented account entry includes:
- email and/or Apple ID in current Fomo documentation;
- Google also appears in current official published sign-in artwork;
- no seed phrase requirement on the primary onboarding surface;
- no RPC/network/native-gas selection on the primary onboarding surface.

### UX consequence
The user learns `who am I in this app?` before `what blockchain infrastructure exists underneath?`.

## 2. Embedded / smart wallet is infrastructure, not navigation

Official Fomo security material describes an embedded non-custodial wallet created with the user's application account. It spans supported chains behind one consumer account.

The visible product model is:

`ACCOUNT -> BALANCE -> ACTION`

not:

`CONNECT WALLET -> CHOOSE NETWORK -> GET GAS -> BRIDGE -> ACTION`.

## 3. Funding follows account creation

Documented funding rails include:
- Apple Pay;
- debit card;
- crypto deposit.

Web documentation says crypto funding is available directly on web, while Apple Pay/debit onramps are mobile-oriented.

The user's funding state becomes part of the same account rather than a separate wallet-management application.

## 4. Gas sponsorship removes a prerequisite

Fomo explicitly documents gas sponsorship. From the user perspective, supported-chain native gas assets are not a prerequisite to a normal trade.

### UX law
**Infrastructure prerequisites should be satisfied by the product architecture wherever safe, rather than taught as onboarding steps.**

## 5. Security is stepped up by consequence

Official Fomo security documentation describes biometric confirmation on Apple devices for higher-consequence actions such as:
- app opening / protected access;
- withdrawals;
- private-key export.

This creates two interaction classes:

### Routine
- browse;
- search;
- view feed/profile;
- ordinary in-app actions within authenticated state.

### Sensitive
- withdrawal;
- key export;
- security-critical account actions.

Sensitive actions receive stronger confirmation rather than forcing the strongest friction on every low-consequence interaction.

## 6. Key ownership exists but is progressively disclosed

Fomo markets the wallet as self-custodial/non-custodial and documents key export/recovery concepts, but key-management vocabulary is not the first screen.

### UX law
**Security truth can be accessible without becoming the default cognitive burden.**

For GAS later, this means account abstraction cannot become security abstraction: permissions, recovery, custody and irreversible actions still need clear disclosure.

## 7. Cross-device account continuity

Fomo web documentation states that the same application identity carries across mobile and desktop, including:
- profile;
- balance;
- positions;
- following/social graph;
- notification settings.

A desktop action is reflected on mobile rather than requiring a second wallet/account mental model.

## 8. Financial state and identity are coupled but not identical

The user has one profile/account identity, while the product still distinguishes:
- cash balance;
- open positions;
- performance;
- transaction history.

This is important for GAS: one account shell must never imply that all displayed financial state is equally spendable or backed by the same subsystem.

## 9. Precise security details visible in current Fomo material

Official documentation describes a key architecture involving secure key shares / hardware-isolated execution. That implementation detail is important for security analysis but secondary to the consumer UX model.

Phase 2 takeaway is not to copy the exact vendor/key architecture. It is the UX sequencing:

`normal identity -> funded account -> low-friction routine use -> stronger verification at sensitive boundary`.

## 10. Current terms/UX constraints

Fomo's current Terms of Use state that:
- transactions carry a minimum 0.50% service fee, subject to a $0.95 minimum;
- network/market conditions can create slippage, failed transactions or inability to close positions;
- some functionality is jurisdiction-restricted.

### Phase 2 implication
A consumer-simple interface still has to make the consequence boundaries visible:
- actual fee;
- expected receive/output;
- slippage/price impact where material;
- jurisdiction/product availability;
- pending/failed transaction state.

## 11. Open questions for manual capture

When the user has Fomo open normally, capture:
- exact current sign-in choices;
- number of onboarding screens;
- whether account creation and wallet creation are visually distinguishable;
- first funding CTA placement;
- biometric prompt timing;
- session expiry/re-entry behavior;
- whether sensitive actions use full-screen, modal, sheet or system prompt;
- exact copy shown before withdrawal;
- exact fee/security disclosure depth;
- cross-device preference parity;
- failed-login recovery;
- Google-vs-Apple behavior on current native builds.

## Source set

- https://fomo.family/blog/learn/fomo-security-wallet-architecture
- https://fomo.family/blog/announcing-fomo-web
- https://fomo.family/blog/learn/a-guide-to-deposits-and-withdrawals
- https://fomo.family/blog/learn/navigating-your-fomo-app
- https://fomo.family/blog/january-2026-recap/
- https://fomo.family/terms
- official Fomo published sign-in / Apple Pay screenshots indexed in `FOMO_SOURCE_INDEX.md`

## Phase 2 conclusion

Fomo's account UX succeeds by making the **application identity** the stable object and the wallet/chains implementation subordinate. The strongest idea for GAS is the hierarchy, not the exact wallet architecture:

**identity first, infrastructure second, consequence-based security, one account across product surfaces.**
