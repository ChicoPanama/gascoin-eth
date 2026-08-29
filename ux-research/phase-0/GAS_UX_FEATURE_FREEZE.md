# GAS UX Phase 0 — Feature & Constraint Freeze

**Status:** Canonical Phase 0 working artifact
**Purpose:** Define what the GAS product UX must support, what is already decided, what is intentionally open, and what the interface must never imply.

Decision states:
- **LOCKED** — accepted and should not be changed implicitly by UX work.
- **CURRENT** — present working architecture/direction; implementation details may still be tuned.
- **OPEN** — requires an explicit decision before hard-coding.
- **DEFERRED** — not part of the current UX build.
- **DEPRECATED** — superseded and must not reappear by default.

---

## 1. Product identity

### Protocol name
**LOCKED:** GAS.

### Product thesis
**LOCKED:** GAS combines an elastic monetary asset, reserve/liquidity system, high-frequency provably-fair game layer and SocialFi network.

### UX priority
**LOCKED:** UX is a first-class protocol requirement. Product sophistication belongs underneath; the consumer flow must remain simple, fast and understandable.

### Existing visual identity
**LOCKED:** Reuse/evolve the existing GAS React/front-end bones and established GAS visual identity rather than replacing the product with another brand’s visual design.

### Reference philosophy
**LOCKED:** Public products are behavioral/evidence references, not visual/source templates. Fomo is the primary SocialFi benchmark at present, but research is open-ended and any stronger product may establish a benchmark for a specific GAS journey.

---

## 2. Monetary asset model

### GAS
**LOCKED:** GAS is the primary persistent protocol asset.

### wGAS
**CURRENT:** wGAS is the non-rebasing/fixed-share integration representation for DeFi/accounting compatibility.

### GSD
**OPEN / RESERVED:** Do not introduce a second Phase 1 token automatically. GSD remains reserved for a future differentiated monetary product if explicitly approved.

### Accounting primitive
**CURRENT:** share/index elastic-balance model. Visible GAS balance derives from fixed wallet shares multiplied by a global index.

### Rebase
**CURRENT:** visible daily rebase with an approximately $1 reference target.

### Rebase parameters
**OPEN:** exact oracle set, deadband, positive/negative caps, reserve constraints, pause behavior and control law.

### UX requirement
**LOCKED:** A rebase must never surprise the user. The interface must show the event, direction, magnitude and personal balance impact, with deeper mechanics available through progressive disclosure.

---

## 3. Reserve / backing

### External-only backing
**LOCKED:** GAS cannot back GAS with GAS.

The UX/accounting must not count as external backing:
- GAS;
- wGAS;
- self-issued GAS side of protocol liquidity;
- circular/self-issued protocol value.

### Treasury/RWA direction
**CURRENT:** build a reserve of genuine external assets, including conservative/tokenized real-world assets where appropriate.

### Specific RWA providers/assets
**OPEN:** no issuer/custodian/venue is canonical yet.

### UX requirement
**LOCKED:** users must be able to distinguish at a glance:
1. reserve/backing;
2. game bankroll;
3. their spendable account assets;
4. future Bracket collateral/positions.

These may share one application shell but may not be represented as the same economic pool.

---

## 4. Genesis / launch

### Launch direction
**CURRENT:** simple presale rather than the deprecated Index-Settled CCA.

### Presale parameters
**OPEN:** exact price, cap, duration, accepted quote assets, reserve/POL split and index initialization.

### Team principal exit
**LOCKED AS REQUIREMENT:** retain the agreed team principal-exit mechanism.

### Principal-exit implementation
**OPEN:** exact amount, timing, trigger, cap, accounting and disclosure must be rewritten for the simple-presale architecture.

### Deprecated launch UX
**DEPRECATED:** Index-Settled CCA, SEAL, CRACK and CCA-specific exit/haircut UX.

---

## 5. GAS trading economics

### Base GAS buy/sell fee
**SUPERSEDED on 26 August 2026:** the former 2.00% symmetric fee is historical.
The bootstrap router policy is now **4.00% buy; 5.00% base sell; 0–2.00%
authoritative sell-pressure surcharge; 7.00% maximum sell**. This is a
router/protocol fee, never an ERC-20 fee-on-transfer tax.

Allocation:
- buy: **2.00% ReserveVault; 0.75% Growth/Liquidity; 0.50%
  Distribution/Referral Growth; 0.50% Team/Operations; 0.25% Defense**;
- base sell: **3.00% ReserveVault; 1.00% Growth/Liquidity; 0.50%
  Team/Operations; 0.50% Defense**;
- pressure surcharge: **75% ReserveVault; 15% Defense; 10% Liquidity; 0%
  Team/Operations**.
- bootstrap routine buy/burn: **0%**.

### Internal protocol allocation
**LOCKED FOR BOOTSTRAP:** the allocation above. Later maturity reductions remain
governed/configurable, but cannot exceed the approved caps or redirect reserve
principal, pressure surcharge, Referral Reward Pool principal, GameBankroll
principal or Bracket capital to Team/Operations.

### UX requirement
**LOCKED:** trading fees and expected received amount must be visible before confirmation where the trade flow requires a quote/preview.

### Critical semantic rule
**LOCKED:** GAS trading volume is not game handle. Trading-fee revenue and game revenue must remain separate in UI/accounting/analytics.

---

## 6. GAS Original

### Signature game
**LOCKED:** GAS Original uses three risk profiles:
- CRUISE
- BOOST
- REDLINE

### Primary action
**LOCKED:** IGNITION.

### Result language
**LOCKED:** GAS GAUGE is the signature visual/result instrument.

### Player-facing entry asset
**LOCKED / SOURCE OF TRUTH v1.1 SUPERSESSION:** Phase 1 GAS Original entry is USDC-only. The earlier direct GAS entry option is superseded and must not appear as a player-facing asset selector.

### Canonical entry and payout loop
**LOCKED:** USDC enters at the player boundary → GAS is sourced/credited automatically and invisibly → the wager, bankroll liability and game settlement are GAS-native → payout is GAS.

### Game Entry Router policy
**OPEN:** exact sourcing venue, quote authority, inventory/netting, slippage limits, expiry and failure/recovery policy. UX must preserve the adapter boundary and render unavailable/degraded state rather than invent these mechanics.

### Game-bankroll rule
**LOCKED:** game operational inventory/liability belongs to GameBankroll, not ReserveVault.

### Game interaction doctrine
**LOCKED:** choose risk → choose amount → IGNITION → result → next eligible IGNITION.

The interface must not require users to understand variance mathematics before playing; relative risk should be visually understandable.

### Instant / cinematic experience
**CURRENT UX TARGET:** support a richer first/casual experience and an Instant Mode for returning/high-frequency users. Do not force long repeated animations.

---

## 7. Game economics

**LOCKED:** launch-to-mature schedule:

| Period | Player/RTP envelope | GAS protocol | Team | Total take |
|---|---:|---:|---:|---:|
| Days 1–14 | 90% | 7% | 3% | 10% |
| Days 15–28 | 92% | 6% | 2% | 8% |
| Days 29–42 | 93% | 5% | 2% | 7% |
| Day 43+ | 95% | 4% | 1% | 5% |

### Mathematical implementation
**OPEN:** exact CRUISE/BOOST/REDLINE probability and payout tables must reproduce the correct active-epoch expected value.

### UX requirement
**LOCKED:** the UI may simplify presentation, but cannot hide or misstate applicable game risk/odds/RTP information required for informed use.

---

## 8. Social games

### Roulette
**LOCKED:** provably-fair roulette is the first accepted conventional social game.

### Additional games
**CURRENT:** modular additional games may follow after the primary GAS Original experience is excellent.

### Priority rule
**LOCKED:** additional game count must not dilute the quality/simplicity of GAS Original.

---

## 9. SocialFi

### Social as a layer
**LOCKED:** social is integrated throughout GAS, not isolated as a separate forum/community page.

### Accepted primitives
**LOCKED / CURRENT:**
- profiles/identity;
- follows;
- global/following activity feeds;
- Crews;
- leaderboards;
- referrals;
- result/activity objects;
- reactions/comments where appropriate;
- notifications/deep links.

### Actionable result
**CURRENT UX TARGET:** significant game outcomes become social objects that can preconfigure the matching GAS mode/configuration, but must never auto-submit a wager.

### Verified activity
**CURRENT UX TARGET:** where possible, profile/performance claims should be anchored to canonical on-protocol activity rather than screenshots/self-reported metrics.

### Fomo role
**CURRENT BENCHMARK:** Fomo receives the largest dedicated SocialFi teardown allocation, but GAS may use superior primitives discovered elsewhere.

---

## 10. Account / wallet abstraction

### Consumer account model
**LOCKED UX PRINCIPLE:** the application should feel like one coherent GAS account even though underlying economic domains remain distinct.

### Do not expose infrastructure unnecessarily
**LOCKED UX PRINCIPLE:** normal consumer flows should not require manual RPC configuration, contract addresses or network-selection knowledge when the chosen architecture can safely abstract them.

### Session/play authorization
**CURRENT UX TARGET:** after explicit bounded authorization, returning gameplay should not require a wallet confirmation for every normal round where account architecture permits this safely.

### Gas sponsorship/account abstraction
**CURRENT / CHAIN-DEPENDENT:** sponsor/batch/abstract routine gas and permissions where the final chain/account architecture safely supports it.

### Financial intent
**LOCKED:** convenience must not remove explicit user intent for material financial authorizations, wagers, trades or withdrawals.

---

## 11. Unified balance semantics

### Product-level account
**LOCKED UX PRINCIPLE:** present a clean total/account summary with expandable components.

### Economic truth
**LOCKED:** do not falsely flatten the following into the same spendable balance:
- GAS;
- USDC/cash;
- locked/pending game amounts;
- marked future Bracket positions;
- potential event payout;
- ReserveVault backing;
- GameBankroll assets.

### Future Bracket compatibility
**CURRENT:** design the account shell so future positions can fit without redesigning the entire product, while retaining correct position/cash semantics.

---

## 12. GAS ↔ Bracket

### Relationship
**LOCKED:** economically interconnected, financially separable.

### Phase 1 collateral
**LOCKED:** GAS is not mandatory Bracket collateral at launch.

### Bracket dependency
**LOCKED:** GAS Phase 1 must succeed and function without Bracket.

### Future utility/collateral
**CURRENT / DEFERRED:** fee/identity/liquidity utility may precede optional collateral. GAS collateral is considered only after sufficient liquidity, reserve depth and risk/oracle maturity.

### UX requirement
**LOCKED:** future Bracket integration must extend GAS identity/account/social architecture rather than force users into an unrelated second product shell.

---

## 13. Chain

### Final deployment chain
**OPEN:** not locked.

### Engineering requirement
**CURRENT:** modular EVM-oriented architecture without tying UX truth to a chain decision that has not been approved.

### UX implication
**LOCKED:** chain choice should not become unnecessary user-facing cognitive load.

---

## 14. Canonical primary navigation target

**CURRENT / TO BE VALIDATED IN PHASE 6:**
- Home
- Play
- Trade
- Crews
- Reserve
- Wallet/Account

Docs, audits, contracts, governance and technical protocol detail are secondary disclosure surfaces rather than primary competition with Play.

---

## 15. Home experience target

**CURRENT UX TARGET:** app-first rather than marketing-site-first.

Home should prioritize:
- GAS price/account state;
- primary Play/Buy actions;
- live network activity;
- social feed/discovery;
- rebase countdown/event;
- reserve/backing summary.

### Old homepage
**DEPRECATED AS PRODUCT IA:** old GasCoin refund/receipt product journey cannot remain the primary information architecture.

---

## 16. Live network state

**CURRENT UX TARGET:** GAS should visibly feel occupied/alive using truthful network activity such as game rounds, GAS trades, rebase events, reserve changes, Crew milestones and verified outcomes.

### Integrity rule
**LOCKED:** never fabricate activity, fake users, fake urgency or fake countdowns.

---

## 17. Mobile-first interaction constraints

### Core Play viewport
**LOCKED TARGET:** primary mobile Play controls should require no scrolling on approved target viewport(s).

### Returning user → IGNITION
**LOCKED TARGET:** <=2 intentional actions from app open when funded/authorized and prior safe preference remains eligible.

### Result → replay
**LOCKED TARGET:** 1 intentional action.

### First comprehension
**LOCKED TARGET:** first-time user can understand the core GAS Original choice and reach a valid first-wager decision within approximately 10 seconds, excluding external funding/KYC constraints.

### Thumb ergonomics
**CURRENT TARGET:** primary gameplay actions live within practical one-handed mobile reach and meet touch-target/accessibility requirements.

---

## 18. State, latency and recovery

### Immediate acknowledgement
**LOCKED UX PRINCIPLE:** every financially meaningful action must receive immediate honest visual feedback; users should never wonder whether the tap worked.

### Settlement truth
**LOCKED:** optimistic UX may not claim final settlement before canonical settlement is true.

### Refresh/app interruption
**LOCKED TARGET:** committed round/transaction state must survive refresh/reconnect and reconcile from canonical state.

### Error language
**LOCKED UX PRINCIPLE:** raw RPC/revert/provider errors must not be the primary consumer message. Tell the user:
1. whether money moved;
2. current status;
3. one safe next action.

### Duplicate action protection
**LOCKED:** UX/state architecture must prevent accidental double-submit where a money-moving action is already committed/pending.

---

## 19. Trust / fairness

### Provably fair
**LOCKED:** GAS Original/roulette outcome verification must be accessible.

### Progressive disclosure
**LOCKED UX PRINCIPLE:** surface understandable trust state first; seeds/hashes/contracts/audit details remain accessible one layer deeper where appropriate.

### Withdrawal/exit symmetry
**LOCKED UX PRINCIPLE:** exiting/selling/withdrawing must be as discoverable and understandable as entering/buying/funding. Do not intentionally create friction asymmetry.

### Dark patterns
**LOCKED:** no fake countdowns, hidden probabilities, fake activity, misleading balance aggregation, loss-disguising celebration or intentionally difficult exits.

---

## 20. UX measurement / release discipline

### Canonical journeys
**LOCKED:** use `ux-research/benchmarks/JOURNEYS.md` as the journey benchmark set.

### Competitive rule
**LOCKED:** maintain where possible:
- `reference_best`;
- `GAS_current`;
- `GAS_target`.

If GAS is worse than the strongest credible reference and there is no protocol/security reason, redesign it.

### Core score gate
**CURRENT:** designated core journeys target >=90/100 with no critical trust/recovery failure.

### UX regression
**LOCKED PRINCIPLE:** UX regressions in implemented core flows should become release/CI failures once the relevant automated benchmark is mature.

---

## 21. Explicitly deprecated / deferred UX concepts

### Deprecated
- CORE as user-facing protocol/game branding;
- pressure-based branding;
- CALM/LIVE/WILD and STABLE/SURGE/BREACH as current risk names;
- Index-Settled CCA / SEAL / CRACK launch experience;
- old GasCoin receipt/refund flow as the primary site IA;
- any UX that treats ReserveVault as a gambling backstop.

### Deferred
- PEG WAR;
- Bracket as a Phase 1 dependency;
- mandatory GAS collateral for Bracket;
- separate Phase 1 GSD token absent explicit approval;
- excessive game catalog before GAS Original quality is proven.

---

## 22. Open decisions Phase 0 must preserve rather than invent

UX research/design must not silently resolve these protocol decisions:

1. final GAS/GSD long-term architecture;
2. exact rebase control law and oracle set;
3. reserve ratio/caps/deadband;
4. final RWA providers/assets;
5. presale exact parameters;
6. principal-exit exact mechanics;
7. allocation of the protocol 1.5% trading-fee bucket;
8. allocation/use of GAS protocol game revenue;
9. CRUISE/BOOST/REDLINE probability/payout tables;
10. final RNG/VRF implementation and liveness recovery;
11. exact Crew/referral emissions/anti-sybil design;
12. governance/multisig/emergency roles;
13. final deployment chain;
14. legal/regulatory structure.

The UX may prototype placeholders only when they are clearly marked as non-canonical and do not create accidental product commitments.

---

# Phase 0 acceptance check

Phase 0 passes when this artifact and its linked repository sources are sufficient for an agent to answer:

- What is GAS?
- What does the user need to be able to do?
- What are the core game/social/monetary/account features?
- Which economics are locked?
- Which protocol parameters remain open?
- What terminology is current versus deprecated?
- Which financial domains must never be conflated?
- What are the non-negotiable UX targets?
- What future Bracket compatibility must be preserved?
- What is explicitly out of scope/deferred?

**Next Phase after this gate: Phase 1 — Existing repo inventory.**
