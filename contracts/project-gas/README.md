# Project GAS contracts

This is the single Foundry workspace approved by Phase 9 decision D01.

## Locked chain posture

- Base (`8453`) is the Phase 1 execution chain.
- Base Sepolia (`84532`) is the public integration testnet.
- Anvil (`31337`) is local simulation only.
- Ethereum may later be an approved reserve/settlement domain, but it is not the
  high-frequency game execution chain.
- Robinhood Chain remains a portability/RWA research target only.

The pure contract core must remain standard EVM Solidity. Account, RPC,
paymaster, onramp, liquidity, oracle and RNG providers stay behind adapters.

## Current authority boundary

The deployable `src/` checkpoint contains chain/deployment guardrails only. A
test-only D02 candidate model exists under `test/simulation/` to compare
share/index/wGAS invariants. It does not implement or select production D02+
monetary, reserve, GameBankroll, entry-router, RTP, randomness, launch,
fee-routing, role, permission or legal parameters.

Nothing in this workspace is approved for mainnet deployment.

## Verification

```bash
forge fmt --check
forge build --sizes
forge test
```

CI pins both the Foundry installer action and Foundry release. Version changes
require a clean compiler/security review and exact-head CI.
