# Project GAS — NetNet Protocol Teardown and GAS Adaptation Map

**Date:** 2026-08-22  
**Status:** competitive research / Phase 9 subordinate. This document does **not** override Source of Truth v1.1, Phase 0 freeze, the active Phase 9 gate, or any OPEN protocol/economic decision.  
**Subject:** `https://play.netnet.capital`, `https://netnet.capital`, deployed NET system on Robinhood Chain (chain id 4663).

## Executive conclusion

NetNet is the closest live external analogue yet found to multiple Project GAS ideas: a reserve-backed reflexive token, algorithmic distributions, protocol-owned liquidity, reserve yield, premium capture, buyback support, tokenized-equity acquisition, on-chain games, and credit against a wrapped/staked representation.

The correct GAS response is **not** to fork NetNet or expand Phase 1 into its whole product catalog. The useful move is to import several engineering laws and balance-sheet ideas while preserving the Project GAS distinctions that are stronger:

1. GAS remains an elastic monetary asset rather than an OHM-style reserve share.
2. GAS/wGAS/self-issued POL never count as GAS monetary backing.
3. GameBankroll remains financially firewalled from the monetary Reserve.
4. Canonical player entry remains USDC -> invisible GAS sourcing/credit -> GAS Original.
5. Bracket remains financially separable and is not a Phase 1 dependency.
6. GAS should use modern venue-compatible fee routing rather than a fee-on-transfer token tax.

NetNet validates that a small genesis can bootstrap meaningful protocol-owned liquidity and treasury growth. It also exposes several failure surfaces GAS should improve: reflexive backing accounting, fee-on-transfer compatibility constraints, unmapped-pool tax bypass, thin genesis liquidity, discretionary RWA custody, a 1-of-1 privileged Safe, and rigid immutability where bounded emergency governance would be safer.

---

## 1. Deployed NetNet architecture observed

### Core asset

- NET token: `0xCA9c78Dd337A67F6e0077F65F5E9218719d30eDf` on Robinhood Chain.
- Public explorers identify NET as verified and 9 decimals.
- NetNet describes itself as OlympusDAO-v1 lineage rebuilt in modern Solidity.
- The monetary target is not a $1 peg. NET may trade at a premium; the system enforces a reserve/NAV floor of at least 1 USDG of backing per NET.

### Staking

- Staking contract observed at `0xB078cc304A0B264C5F3680DC0488954ACcd02E87`.
- On-chain transaction decoding shows `stake(address,uint256)` taking NET and issuing the same nominal quantity of sNET, and `unstake(address,uint256)` returning NET against sNET.
- Distributions occur every eight hours.
- The advertised distribution rate is premium-sensitive: no emission below NAV; rate increases with market-price/NAV premium and is capped around 0.45% per epoch at >=1.75x NAV.
- This converts speculative market premium into an explicit supply-emission signal.

### Treasury / NAV

- Primary reserve asset is USDG.
- Idle reserve capital can be deployed to Morpho.
- Morpho-deployed reserves are conservatively haircut for backing accounting (NetNet documents a 2% haircut).
- A configured maximum share of reserve capital is deployed to Morpho; founding arithmetic describes a 70% deployment case.
- Protocol-owned NET/USDG LP is also included in NetNet RFV using a floor-valued NET leg. This is the most important accounting divergence from GAS.
- If market price falls below NAV, an inverse-bond/buyback mechanism bids for NET and retires supply.
- At a high premium, premium sales and bond issuance sell protocol-created NET for external assets / LP, attempting to turn speculative premium into permanent reserves.

### Genesis

NetNet used a standalone `GenesisBond` with immutable terms:

- 3 USDG / NET fixed price;
- 50,000 USDG hard cap;
- 2,000 USDG per-wallet cap;
- 7-day window;
- 15,000 USDG minimum raise;
- 5-day linear vest;
- USDG only.

`finalize()` is permissionless once conditions are satisfied and atomically:

1. sends 70% of proceeds to Treasury;
2. uses ~30% to seed canonical Uniswap v2 NET/USDG POL with newly minted NET at the offering price;
3. turns on staking/dividends, ordinary bonds, fee mapping and market operations;
4. starts management compensation decay.

If the minimum raise fails, refunds are pull-based.

Founders additionally receive a non-transferable ERC-721 certificate. Certificate mint failure is intentionally non-blocking to the financial subscription path.

### Trading fee

NET implements an immutable 5% fee-on-transfer tax when either side of a transfer is a mapped AMM pair. Wallet-to-wallet transfers and exempt protocol operations are not taxed.

The pair/exemption surface is constrained:

- pool mappings are add-only;
- pool additions are factory-validated;
- exemption additions are delayed;
- canonical v2 route exists because fee-on-transfer behavior is not compatible with all modern exact-output/callback routing paths;
- accumulated NET fees enter a TaxCollector and are converted separately to avoid swap reentrancy;
- conversion is permissionless but bounded by TWAP deviation and clip size;
- docs state a 100 bps maximum TWAP deviation and maximum 50 bps of pool NET reserves per conversion clip.

The protocol openly discloses that unmapped pools, especially v4 / UniswapX-style paths, can bypass this tax until discovered and mapped. Its structural defense is canonical liquidity depth.

### Management compensation

The fee split decays from 4% management / 1% treasury to 0% / 5% treasury across the first 30 days using the same time source as pTEAM vesting. The fee total remains fixed at 5%.

This is notable less for the 5% number than for the law: **team economics can be programmed to decay while protocol capture increases, with one clock and no discretionary setter.**

### RWA desk

NetNet Real World Bonds accept USDG and issue discounted NET with a short vest while routing subscription capital through Rialto into tokenized equities. These assets are held in an RWA Sleeve.

NetNet correctly discloses that RWA Sleeve holdings are **not** part of on-chain NET backing/NAV today. However, the Sleeve is manager-custodied and may be deployed at management discretion to support backing or buybacks. This is a material custody/governance distinction.

### Games / RW-Play

Observed live or advertised programs include:

- COINflip: fair on-chain coin flip; winner paid in tokenized Coinbase stock (COIN); 5% fee.
- SPACEX INVADERS: reverse Plinko; printed nine-outcome multiplier ladder; payout in SPCX; ~90% board return plus 5% fee.
- MSFT FLIGHT SIMULATOR: crash-style game; player chooses threshold before round; true ceiling committed through public randomness; payout in tokenized MSFT; ~90% expected return plus 5% fee.
- WinNET: deposits remain invested/staked; nightly public-beacon random selection allocates staking yield to one winner rather than risking principal quantity.
- Superstore: randomized payout packs tied to tokenized stocks.
- CLIMB, INC.: game purchases correspond to escrowed positions/assets.
- TURBO: long-dated leveraged tokenized-equity positions represented as ERC-1155 cards; every open card is advertised as fully reserved; no randomness; 5% premium/open fee and 5% profit fee.
- Managed Futures Desk: explicit test program, not represented as production capital.

The PLAY terminal advertises drand Quicknet at a 3-second cadence. This is useful evidence that external public randomness can support an arcade, but GAS still requires an explicit RNG/finality/fallback decision and cannot simply inherit NetNet's trust/failure model.

### Credit

NetNet Loopback wraps staked NET into wsNET and uses a Morpho Blue market for USDG borrowing. Public descriptions state collateral valuation is capped relative to backing/NAV rather than allowing the full speculative market premium to determine borrow power.

This is a strong risk law: **a reflexive token can be accepted as collateral without treating its entire speculative premium as hard collateral value.**

---

## 2. Contract-level laws GAS should adapt

### A. Permissionless execution + bounded state transitions — ADOPT

NetNet's strongest engineering choice is not 'no governance'; it is making routine operations callable by anyone while enforcing economic bounds inside contracts.

GAS should apply this pattern to:

- rebase execution;
- reserve harvest/accounting synchronization;
- fee conversion/routing;
- AMO maintenance;
- stale-state refresh;
- GameBankroll reconciliation;
- public randomness settlement after the beacon/VRF becomes available;
- presale finalization;
- eligible reserve-yield harvesting.

Every operation should be safe when called by an adversarial keeper. A caller should never receive authority merely because it is 'the keeper.' Preconditions, max clip, max drift, staleness, nonce/idempotency and solvency constraints belong on-chain.

**Improvement over NetNet:** retain an explicitly bounded emergency/pause authority for catastrophic oracle/provider/bridge/game failures rather than making all policy irreversibly immutable. The privileged direction must be narrow, delayed when possible, publicly observable, and unable to expropriate Reserve/GameBankroll assets.

### B. Fail-closed oracle law — ADOPT AND STRENGTHEN

NetNet routes several operations through a 1-hour TWAP and refuses out-of-bound fee conversions. GAS should generalize this into a canonical OracleGuard abstraction:

- multiple price sources where practical;
- freshness windows;
- minimum observation depth;
- max source divergence;
- max TWAP/spot deviation;
- chain-sequencer health guard;
- explicit UNKNOWN state rather than invented fallback prices;
- operation-specific max notional/clip;
- read-only UI source/freshness labels already align with this law.

Rebase, reserve valuation, AMO, router sourcing, GameBankroll risk and future RWA valuation should consume normalized guarded observations, not raw frontend quotes.

### C. Single source-of-truth clocks — ADOPT

NetNet ties fee-share decay to pTEAM vesting rather than maintaining two separately mutable schedules. GAS should use the same principle for any time-linked launch/fee/team mechanics: one canonical epoch/vesting source consumed by all dependent modules.

Do not import NetNet's exact economics. Import the anti-divergence architecture.

### D. Pull-based refunds / claims — ADOPT

Failed presale refunds should be pull-based. Optional badges/certificates must never block a financially valid subscription/claim/refund path.

### E. Atomic genesis — ADOPT WITH PRE-FLIGHT GATES

A GAS genesis coordinator should be capable of making launch state coherent in one bounded transition:

`presale finalized -> reserve funded -> initial external-asset backing attested -> initial POL funded -> market enabled -> rebase epoch initialized -> fee router enabled -> founder vesting clock starts`

However, GAS should not blindly make one transaction responsible for every external dependency. Pre-flight checks should prove reserve assets, pool configuration, oracle availability, role wiring and minimum liquidity before the irreversible state flip. Any nonessential certificate/social initialization should be best-effort and non-blocking.

### F. Founder credential — ADOPT AT IDENTITY LAYER

A soulbound Founding Igniter / Genesis identity credential is compatible with the existing GAS profile/Crews system. It should be a provenance credential, not a yield entitlement or hidden economic claim.

### G. Treasury runway — ADOPT

NetNet exposes a useful concept: number of distribution epochs reserve coverage supports before a floor/cap binds.

GAS should publish analogous metrics, but tailored to elastic monetary policy:

- Adjusted external backing;
- backing ratio;
- liquid reserve coverage;
- insurance buffer coverage;
- reserve concentration;
- oracle freshness;
- rebase headroom before policy cap;
- GameBankroll solvency separately;
- never combine Reserve and GameBankroll into one 'treasury' number.

### H. Conservative external-strategy haircut — ADOPT

Any reserve capital deployed into Morpho/Aave/RWA vaults/custodians should not be valued 1:1 by default. GAS should use asset- and venue-specific haircuts plus liquidity/finality constraints.

### I. Premium capture — ADAPT, DO NOT COPY

NetNet can sell newly minted NET at a speculative premium to NAV and acquire external reserves. GAS has an analogous opportunity during sustained >target demand, but direct OHM-style bonds conflict with the desired simple Phase 1 monetary UX.

Recommended GAS translation:

- the rebase controller handles visible-unit elasticity;
- a Reserve AMO may sell bounded GAS inventory/supply into sustained premium demand;
- external proceeds become approved reserve assets;
- AMO issuance must be constrained by post-trade backing, supply expansion cap, oracle health and daily notional limits;
- holder rebase vs AMO expansion split remains an OPEN economic parameter;
- no Phase 1 'bond desk' unless separately approved.

This preserves the valuable law — **turn speculative demand into exogenous backing** — without turning GAS into OHM.

### J. Below-target retirement — ADAPT

NetNet inverse bonds buy below NAV and retire tokens. GAS should preserve the already-researched reserve-assisted contraction pattern:

1. guarded reserve-AMO buy-and-burn / inventory retirement;
2. only from allowed liquid reserve bucket;
3. strict daily/epoch capital limits;
4. no GameBankroll funds;
5. negative rebase only according to the approved controller after AMO response / deadband logic.

### K. Collateral valuation cap — ADOPT FOR FUTURE CREDIT

If wGAS becomes lending collateral, borrow power should be based on a conservative oracle value bounded by adjusted backing/reference value, not an uncapped speculative spot premium. This can prevent reflexive leverage from monetizing a temporary GAS premium into excessive stablecoin debt.

Not Phase 1.

### L. Fully reserved derivative liabilities — ADOPT AS A GENERAL SOLVENCY LAW

NetNet TURBO advertises every open ERC-1155 card as fully reserved. GAS should translate this into a broader contract law:

`reserved liabilities + worst-case pending liabilities <= domain capital available under approved risk haircut`

For GAS Original this belongs in GameBankroll risk checks before wager acceptance. For future Bracket, corresponding vault/inventory risk is financially separate.

### M. Public randomness with deterministic derivation — ADOPT CONCEPT, DECISION-GATED PROVIDER

NetNet demonstrates a public-beacon game architecture. GAS should define a RandomnessAdapter interface with:

- `request/round reference`;
- source identity;
- commitment/finality state;
- deterministic entropy-to-outcome mapping;
- stale/missed-beacon behavior;
- cancellation/refund law;
- replay/verifiability endpoint;
- no operator-selected seed after wager lock.

Provider selection (VRF, drand relay, hybrid, etc.) remains OPEN.

---

## 3. NetNet mechanisms GAS should explicitly reject or improve

### A. Do not count GAS-denominated POL as monetary backing

NetNet counts protocol-owned NET/USDG LP in RFV, valuing its NET leg at a floor. This introduces reflexivity: an asset partly backs itself through protocol-owned liquidity.

Project GAS already has the stronger rule:

`monetary backing = approved external reserve assets after haircuts and exclusions`

Excluded from backing must remain: GAS, wGAS, self-issued GAS POL value, GameBankroll and Bracket collateral.

POL may be reported separately as protocol liquidity but never merged into Adjusted Reserve backing.

### B. Do not implement a fee-on-transfer GAS tax

NetNet's token-level tax forces compatibility tradeoffs, canonical v2 routing and a standing unmapped-pool bypass. It can also make integrations, accounting, aggregators, exact-output swaps and bridge/lending integrations harder.

GAS's locked 2% buy/sell fee should be enforced at controlled execution venues / router / hook / fee-aware market architecture, with explicit quotes showing fee and minimum received. Keep the ERC-20/wGAS integration surface as conventional as possible.

For venues that cannot enforce the protocol fee, GAS should choose between approved canonical routing, v4 hook architecture, router policy, or treating external untaxed venues as an accepted leakage problem. Do not infect every transfer with tax semantics.

### C. Do not use a 1-of-1 privileged Safe

NetNet discloses its fee-mapping Safe as 1-of-1 despite recommending 2-of-3. GAS production authority should require a real multisig / role separation and preferably timelock for dangerous configuration changes.

### D. Do not make critical risk parameters permanently unchangeable without escape hatches

Immutable economics reduce governance abuse but can turn a discovered oracle, venue, collateral or accounting flaw into forced migration. GAS should use bounded governance: immutable invariants + delayed configurable envelopes + pause/recovery roles.

Examples of invariants that should be hard-coded or extremely hard to weaken:

- no self-backing;
- Reserve cannot bail out GameBankroll;
- Bracket collateral cannot count as GAS backing;
- wGAS share-backing invariant;
- max fee ceiling at or below approved canonical 2% unless governance process explicitly requires a new version;
- no blind duplicate settlement.

Examples better treated as bounded configuration:

- oracle source set;
- freshness limits;
- strategy allocation caps;
- asset-specific haircuts;
- AMO clip limits;
- pause state;
- approved liquidity venues.

### E. Do not rely on manager-custodied RWA sleeves

NetNet's RWA Sleeve demonstrates product demand but its discretionary manager custody is weaker than GAS should target. GAS RWA backing should require an explicit legal/custody/oracle/redemption model and on-chain attestable asset ownership. Until then, an RWA sleeve may exist as a non-backing strategic asset bucket, but must be visibly excluded from backing.

### F. Do not fragment GAS into many games before GAS Original proves retention

NetNet's breadth is useful competitive evidence, not a Phase 1 scope template. GAS Original should remain signature product, followed by accepted provably-fair roulette. RWA prize games can be later seasonal modules if data supports them.

---

## 4. Product ideas worth adding to the GAS backlog after Phase 1

### RWA jackpot settlement

Allow selected promotional/seasonal jackpots to settle in a tokenized stock or ETF while wager flow remains canonical USDC -> GAS. This creates RWA virality without making RWA payout the identity of the core game.

### Yield-funded prize pool

A WinNET-like no-principal-quantity-loss prize layer can be built only from clearly segregated yield-bearing voluntary deposits, with principal and accrued prize yield separately accounted. It must not be marketed as risk-free because GAS price/rebase and external strategy risks remain.

### Founder identity provenance

Genesis credential integrated into GAS profiles, Crew badges and future reputation. No yield entitlement.

### Reserve 'flight recorder'

Expose every reserve inflow/outflow, strategy deployment, haircut, exclusion and policy action as machine-readable chain-derived records. The UI should refuse to print a number when an authoritative read is unavailable, matching the current Phase 9 source/freshness architecture.

### RWA accumulation using excess backing only

Once GAS has Required Peg Reserve + Insurance Buffer + Liquidity Floor, only Excess Backing may be routed to higher-volatility growth assets. This is a stronger version of NetNet's separate RWA Sleeve and is compatible with the previously preserved Growth Reserve research.

### Future wGAS credit

Morpho-style immutable market with conservative value cap; isolated from monetary reserve solvency.

---

## 5. Recommended GAS target architecture after this review

```text
                    EXTERNAL DEMAND / FEES / GAME HANDLE
                                |
                                v
                         Revenue / Fee Router
                         /       |        \
                        /        |         \
               ReserveVault   GAS POL    Game domain revenue
                    |                        |
        +-----------+-----------+            v
        |           |           |       GameBankroll
 Liquidity      Income       Insurance        |
 Reserve        Reserve       Reserve          +--> wager liabilities
        \           |           /              +--> payouts
         \          |          /
          +---- Adjusted External Backing ----+
                         |
                  Rebase / AMO Controller
                   /               \
         > target pressure       < target pressure
         holder/index +          bounded buy/retire
         bounded AMO sale        then controller law
                   \               /
                    +---- GAS share/index ----+
                              |
                        wGAS fixed shares
                              |
                     integrations / future credit

PLAYER PATH
USDC -> Game Entry Router -> invisible GAS sourcing/credit
     -> CRUISE/BOOST/REDLINE -> IGNITION -> wager lock
     -> RandomnessAdapter -> deterministic outcome
     -> GameBankroll settlement -> GAS payout -> replay/hold/trade
```

The NetNet lesson is that the balance sheet, monetary engine and entertainment surface can reinforce one another. The GAS improvement is to keep their liabilities and accounting domains explicitly separable.

---

## 6. Phase 9 implementation deltas that do NOT require reopening product scope

These are engineering patterns that can be implemented or specified now without importing NetNet's economics:

1. Define a canonical `OracleObservation` / `OracleGuard` model with source, timestamp, validity, divergence and fail-closed state.
2. Define permissionless bounded-maintenance interfaces (`executeRebase`, `harvest`, `reconcile`, `settleRandomness`, `convertFees`) so caller identity is not an economic trust assumption.
3. Extend reserve read model to expose explicit excluded assets, strategy haircut, liquid vs deployed backing and a policy-derived coverage/runway metric.
4. Preserve separate GameBankroll solvency read model and worst-case-liability checks before mutation implementation.
5. Add a genesis/presale state machine specification with permissionless finalize, minimum-raise failure, pull refunds and non-blocking identity credential.
6. Add strategy-allocation interface with hard allocation caps and valuation haircuts; no provider should be assumed until approved.
7. Add AMO simulation requirements for bounded premium sale and below-target buy/retire while retaining all economic constants OPEN.
8. Add future collateral-value-cap invariant tests for wGAS even if lending remains inactive.
9. Add 'authoritative reads or unavailable' rule to every reserve/rebase/presale dashboard metric.
10. Add role matrix requirement: no 1-of-1 production authority; dangerous expansions timelocked; emergency pause unable to transfer user/reserve funds.

---

## 7. Simulation / invariant suite inspired by NetNet

Before freezing GAS economics, add simulations/tests for:

- `externalBacking >= requiredBacking` under positive/negative rebase sequences;
- self-issued GAS and wGAS contribute exactly zero backing value;
- POL value cannot leak into monetary backing;
- strategy haircut increases under configured stress and never increases backing by deploying capital;
- AMO premium sale cannot violate max expansion / post-trade backing;
- AMO buy/retire cannot spend Insurance or GameBankroll funds;
- oracle stale/divergent -> monetary mutation fails closed;
- permissionless caller cannot change economics by choosing timing inside the same epoch more than allowed;
- duplicate rebase/harvest/settlement calls are idempotent;
- fee conversion clip cannot exceed configured share of venue liquidity;
- presale failed-finalization refunds total exactly deposits;
- successful genesis cannot partially enable financial modules;
- optional founder credential failure cannot block money state;
- GameBankroll accepts a wager only when post-lock worst-case liability remains solvent;
- randomness finality maps exactly once to one outcome;
- wGAS remains exactly share-backed across every index change;
- future lending collateral value <= approved conservative cap even if spot GAS trades far above reference/backing.

---

## 8. Strategic ranking after contract-level review

### NetNet currently stronger

- live deployed monetary contracts;
- permissionless operational execution;
- working premium-capture/buyback mechanics;
- live Morpho reserve productivity;
- live tokenized-equity acquisition;
- multiple live game experiments;
- working staking receipt and future credit composition;
- radically transparent docs and chain-derived figures.

### GAS architecture is stronger if implemented correctly

- external-only monetary backing;
- monetary reserve / GameBankroll / Bracket firewall;
- conventional integration token via wGAS;
- lower 2% trading fee;
- no requirement for fee-on-transfer semantics;
- canonical USDC player boundary with invisible GAS sourcing;
- GAS-native game flywheel rather than fragmented payout identity;
- explicit authoritative-source / recovery architecture already present in Phase 9;
- potential reserve-assisted elasticity instead of uncontrolled premium-dependent OHM-style dilution;
- SocialFi/Crews identity layer and future Bracket integration.

### NetNet warning

NetNet proves that a small team and small genesis can ship quickly. Project GAS should not respond by widening Phase 1 scope. The competitive response is to finish the monetary kernel and authoritative vertical loops, using the best NetNet laws to make them safer.

---

## 9. Decision packet additions created by this research

The following remain genuine OPEN decisions and should be answered in the existing Phase-9 dependency order, not silently frozen from NetNet:

1. **Oracle law:** source set, TWAP windows, freshness/divergence, sequencer guard, fallback/pause.
2. **Rebase controller:** deadband, positive/negative caps, cadence, backing constraints.
3. **Expansion split:** holder-visible rebase vs bounded reserve-AMO supply sale.
4. **Reserve deployment:** provider whitelist, max allocation, liquidity minimum and per-strategy haircut.
5. **Below-target AMO:** buy/retire capital cap, trigger, pacing and interaction with negative rebase.
6. **Genesis:** price/cap/minimum/per-wallet/vesting and treasury/POL split.
7. **Team principal exit:** exact vesting/exit law; NetNet's decaying team fee is evidence, not a recommendation.
8. **GameBankroll:** minimum solvency ratio, max single-wager liability, mode exposure and circuit breakers.
9. **Randomness:** provider, source finality, timeout/refund/fallback.
10. **Authority:** multisig threshold, timelock durations, guardian/pause powers, upgrade law.
11. **RWA:** issuer/custody/redemption/oracle/haircut and whether any RWA can count as backing at Phase 1.
12. **Future credit:** whether wGAS becomes collateral and conservative collateral valuation law.

---

## Primary evidence reviewed

- NetNet prospectus / mechanism index: `https://docs.netnet.capital/`
- Founding Offering: `https://docs.netnet.capital/OFFERING.HTM`
- Trading Fee Schedule: `https://docs.netnet.capital/FEES.HTM`
- Main fund / live-program index: `https://netnet.capital/`
- Shareholder Services: `https://app.netnet.capital/`
- PLAY arcade: `https://play.netnet.capital/`
- On-chain transaction/explorer evidence for Staking contract and NET/sNET stake/unstake flows on Robinhood Chain / POA explorers.

### Evidence limitations

The public docs disclose contract architecture and several deployed constants, and explorers expose decoded calls and addresses. During this pass, a complete verified-source bundle for every NetNet contract was not available through the accessible search surfaces. Therefore this document distinguishes observed/deployed behavior from source-level inference and does **not** claim a line-by-line audit of every NetNet Solidity file. A future pass should ingest verified source/ABI for every address from the official channels page or explorer API if those artifacts become directly retrievable.
