# Project GAS Wallet Architecture

**Status:** Phase 8 precondition architecture

Project GAS uses one account/wallet orchestration model for both consumer-first onboarding and crypto-native self-custody.

## Product model

```text
ENTER GAS
  |
  +-- Continue with GAS
  |     email / social entry
  |     embedded EVM wallet only when the user does not already have one
  |
  +-- Use my wallet
        external wallet authentication
        MetaMask / Coinbase / Base Account / Rainbow / Uniswap / Safe /
        detected EVM extensions / WalletConnect fallback

AUTHENTICATED GAS ACCOUNT
  |
  +-- embedded wallet (optional)
  +-- linked external wallet(s) (optional)
  +-- connect another wallet
  +-- choose active connected wallet for wagmi/viem actions
```

Wallet choice is available, but wallet knowledge is not a prerequisite for normal users.

## Responsibilities

### Privy

Privy is the single source for:

- authentication;
- embedded-wallet creation;
- external-wallet login, connection and account linking;
- connected-wallet discovery;
- wallet picker UI;
- multiple-wallet identity.

Do not add a second custom connector/modal state machine.

### `@privy-io/wagmi`

`@privy-io/wagmi` synchronizes Privy's active connected wallet into wagmi. `createConfig` and `WagmiProvider` come from this package so Privy can drive connector state correctly.

### wagmi / viem

wagmi and viem remain the application transaction/read layer:

- balances and reads;
- contract writes;
- signatures;
- transaction lifecycle;
- chain-aware application state.

They do not own wallet discovery/login UI.

## Provider order

```text
ThemeProvider
  PrivyProvider
    QueryClientProvider
      @privy-io/wagmi WagmiProvider
        application
```

## External-wallet policy

External wallets are a first-class optional path, not a legacy fallback. The default configured EVM list prioritizes named consumer wallets, then detected extensions, then WalletConnect registry fallback.

Do not use wagmi `useDisconnect` as the primary disconnect mechanism with Privy. Injected browser wallets cannot actually be programmatically disconnected and a wagmi-only shim can desynchronize connection state. Prefer connecting/switching another wallet; explicit account unlinking is a separate identity action.

## Current chain note

Project GAS Phase 1 is fixed to Base, with Base Sepolia as its integration testnet. Ethereum mainnet remains configured only for legacy GASCOIN compatibility and a possible future reserve/settlement role.

## Financial invariants

Connecting or linking a wallet never collapses accounting domains:

```text
wallet assets != spendable GAS/USDC != locked wagers != ReserveVault != GameBankroll != future Bracket collateral
```

## Migration rule

Delete custom wallet plumbing only after the equivalent capability exists through Privy and the full CI suite remains green.
