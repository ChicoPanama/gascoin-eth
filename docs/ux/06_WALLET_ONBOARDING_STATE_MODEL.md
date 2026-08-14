# PROJECT GAS — WALLET + ONBOARDING STATE MODEL

## Objective

Wallet/onboarding UX must get users to a truthful actionable state quickly without forcing returning users through tutorials or hiding transaction risk.

The same state language must work across **Home, Play, Trade, Reserve, and Wallet**.

## Principles

1. Browsing Project GAS does not require a wallet.
2. Money actions require explicit connection/signature at the point they are needed.
3. Returning users skip educational onboarding.
4. A wallet error must never leave the user wondering whether funds moved.
5. A wallet disconnect after a wager is committed does not erase the wager/round from UI recovery state.
6. Wrong-network and insufficient-balance states should offer the shortest safe recovery action.
7. No auto-wager, auto-trade, or hidden signature.

## Canonical connection states

```text
DISCONNECTED
  -> CONNECTING
  -> CONNECTED_SUPPORTED
  -> CONNECTED_WRONG_NETWORK
  -> DISCONNECTED (manual/session loss)
```

Additional action states are modeled separately so connection and transaction state are not conflated.

## State matrix

| State | User can browse | Play/Trade action | Primary CTA | Required UX |
|---|---:|---:|---|---|
| `DISCONNECTED` | Yes | No | Connect | Preserve visible product context; do not gate Home/Play explanation |
| `CONNECTING` | Yes | No | Connecting… | Disable duplicate connect; show deterministic pending state |
| `CONNECTED_SUPPORTED` | Yes | Yes if funded/eligible | Context action | Show compact balance + identity |
| `CONNECTED_WRONG_NETWORK` | Yes | No for chain action | Switch Network | Name required network and current mismatch |
| `SESSION_EXPIRED` | Yes | No | Reconnect | Preserve current page/configuration |

## Funding states

Funding is per action, not a global binary.

### GAS Original

Potential wager assets:

- GAS
- USDC

A user may have enough GAS but not USDC, or vice versa.

Model:

```text
FUNDED_FOR_SELECTED_WAGER
INSUFFICIENT_SELECTED_ASSET
BELOW_MIN_WAGER
ABOVE_USER_LIMIT
ABOVE_PROTOCOL_LIMIT
BALANCE_LOADING
BALANCE_STALE
```

### Insufficient balance recovery

For GAS:

- `BUY GAS` / Trade deep link
- return to Play preserving selected mode and suggested wager where safe

For USDC:

- show supported funding/onramp/deposit action only when a provider is actually configured
- otherwise provide wallet receive/deposit instructions

Do not invent an onramp/provider before one is approved.

## First-time user path

Target path:

```text
Open Play
  -> understand CRUISE / BOOST / REDLINE + IGNITION
  -> choose mode/wager
  -> Connect only when required
  -> sign/commit
```

Education should be inline and progressive. Do not force a multi-screen tutorial before the user sees the live game.

### Optional first-use coach marks

Maximum useful set:

1. Pick risk mode
2. Set wager
3. IGNITION

Coach marks must be dismissible and should not reappear for returning users unless requested.

## Returning-user path

If wallet/session is valid:

- restore last non-sensitive UI preferences such as selected mode and Instant Mode;
- do not restore or auto-submit a wager transaction;
- show current balance freshly;
- allow one primary action to repeat the same explicit configuration after a completed result.

## Money-action state model

```text
IDLE
  -> VALIDATING
  -> AWAITING_SIGNATURE
  -> SUBMITTED
  -> CONFIRMING
  -> CONFIRMED
```

Failure/recovery:

```text
VALIDATION_FAILED
SIGNATURE_REJECTED
SUBMISSION_FAILED
CONFIRMATION_DELAYED
CONFIRMATION_FAILED
```

### Required money-state messaging

Every failure maps to one of:

- **No funds moved / no wager created.** Safe to retry.
- **Transaction submitted; outcome pending.** Do not resubmit. Track status.
- **Wager locked; settlement pending.** Do not create a replacement wager for the same round.
- **Funds moved but downstream action failed.** Show recovery/support/claim path.
- **Status unknown due to network/indexer degradation.** Disable unsafe retry until authoritative state is recovered.

Never display a generic `Something went wrong` for a money action without fund-state context.

## Wallet disconnect during a game round

If disconnect occurs after the wager is committed:

1. preserve `roundId` / submission identifier locally;
2. continue read-only settlement tracking where possible;
3. show `Wager committed — wallet disconnected`;
4. allow reconnect;
5. after reconnect, reconcile authoritative round state before enabling an unsafe duplicate action.

If disconnect occurs before commit/signature, return to READY with `No wager created`.

## Wrong-network behavior

If chain is required for an action:

- show exact required network;
- provide one `Switch Network` action when wallet supports it;
- preserve form/game configuration during switch;
- revalidate balances and contract addresses after switch;
- never silently sign/send on a different chain.

Final network remains protocol OPEN, so components must consume network configuration rather than hard-code a final chain choice.

## Balance presentation

Primary Play header:

- selected wager asset balance;
- GAS balance always accessible;
- wallet/profile affordance.

Wallet detail can show GAS, wGAS, USDC, and approved assets.

Do not merge:

- wallet GAS balance;
- game bankroll;
- protocol reserve;
- protocol-controlled liquidity.

## Privacy

Default public identity should use profile name/avatar if available. Avoid exposing full wallet addresses unnecessarily in social surfaces.

Wallet page may expose address to the owner with copy/explorer actions.

## Accessibility

- wallet state changes announced to assistive tech where relevant;
- focus moves to actionable recovery control after a blocking error;
- connection modal/flow supports keyboard use;
- color is not the sole error/success signal.

## Component contract

Suggested shared interface:

```ts
type WalletUXState =
  | { kind: 'disconnected' }
  | { kind: 'connecting' }
  | { kind: 'connected'; address: `0x${string}`; chainId: number }
  | { kind: 'wrong-network'; address: `0x${string}`; chainId: number; requiredChainId: number }
  | { kind: 'session-expired' };
```

Funding and transaction state remain separate discriminated unions.

## Acceptance criteria

- user can browse Home/Play while disconnected;
- first connect preserves game mode/wager draft;
- returning user skips tutorial;
- wrong-network state names recovery action;
- insufficient balance gives a safe next action rather than a dead end;
- wallet disconnect after commit preserves round tracking;
- every money-action failure explicitly states whether funds/wager moved or are still unknown;
- no action auto-wagers or auto-trades after reconnect/deep link.
