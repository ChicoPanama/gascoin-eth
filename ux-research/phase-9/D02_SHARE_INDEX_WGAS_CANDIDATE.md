# D02 share / index / wGAS candidate checkpoint

**Status:** TEST-ONLY CANDIDATE — NOT APPROVED

**Depends on:** D01 Base + Foundry — APPROVED
**Does not authorize:** production contracts, deployment, token supply, rebase controller, wrapper rounding or Phase 10

## Purpose

The D01 packet authorizes a Foundry-only D02 simulation scaffold before any
deployable monetary implementation exists. The scaffold at
`contracts/project-gas/test/simulation/ShareIndexCandidateModel.t.sol` compares
share/index conversion behavior without putting an economic choice in `src/`.

It currently proves candidate properties under bounded fuzz inputs:

- a rebase changes visible GAS value without mutating underlying shares;
- a fixed wGAS candidate quantity receives the same positive/negative index
  economics through its GAS-per-wGAS exchange rate;
- wrapping transfers shares and does not manufacture them;
- floor-based wrap/unwrap round trips cannot create GAS;
- ceiling and floor conversion candidates differ by at most one atomic unit in
  the tested domain.

These are evidence inputs, not final semantics.

## Exact D02 choices still requiring approval

| Decision | Candidate in the test scaffold | Still open |
|---|---|---|
| Internal index precision | `1e27` RAY for stress testing | final scale and overflow strategy |
| Visible GAS from shares | floor candidate | boundary-specific rounding law |
| Shares from visible GAS | floor and ceiling compared | mint/burn/transfer/wrap direction |
| wGAS quantity | modeled as a fixed claim on shares | ERC-20 unit normalization and exchange-rate API |
| Dust | retained by rounding in the model | owner, accounting bucket and sweep prohibition |
| Rebase bounds | arbitrary positive index in bounded tests | minimum index, caps, cadence and controller |

## Required next evidence before D02 can freeze

1. Select exact units for GAS shares, visible GAS and wGAS quantity.
2. Specify rounding for mint, burn, transfer, wrap and unwrap separately.
3. Add full-precision `mulDiv` and extreme-value fuzzing against the selected
   total-share/supply bounds.
4. Define dust accounting so no caller, wrapper or protocol bucket can extract
   value through repeated small conversions.
5. Prove positive and negative rebase equivalence for direct GAS and wGAS over
   repeated wrap/rebase/unwrap sequences.
6. Only after explicit approval, move a reviewed monetary kernel into `src/`.

All D03+ oracle, reserve, bankroll, router, payout, RNG and fee parameters remain
OPEN and absent from this scaffold.
