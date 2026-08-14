# GAS ORIGINAL — GAME UX SPECIFICATION

## Purpose

GAS Original is the signature one-action game for Project GAS.

The game must be understood visually. The player should not need to read probability theory before making a choice.

## Core loop

```text
1. Choose payment asset: USDC or GAS
2. Choose mode: CRUISE / BOOST / REDLINE
3. Set wager
4. Press IGNITION
5. Commit/lock wager
6. Resolve verifiable randomness
7. Animate GAS GAUGE
8. Show result + payout
9. Repeat / share / verify
```

## Mode selector

Three equal-priority physical regions, with BOOST selected by default unless product/risk testing recommends otherwise.

### CRUISE

Meaning: lower variance / more frequent lower-magnitude outcomes.

Visual cues:

- broad central success distribution preview;
- calm gauge motion;
- smaller top-end multiplier label;
- neutral/lower-intensity emphasis.

### BOOST

Meaning: balanced default.

Visual cues:

- intermediate distribution;
- stronger acceleration;
- clear `DEFAULT` or selected state;
- medium top-end multiplier context.

### REDLINE

Meaning: higher variance / rarer extreme outcomes.

Visual cues:

- narrow high-payout zone;
- stronger pre-result tension/motion;
- explicit high-variance microcopy;
- no implication that bigger payouts are more likely.

## Wager control

Required:

- numeric amount;
- payment asset selector;
- `1/2`;
- `2x`;
- `MAX` subject to bankroll / protocol / user-limit rules;
- minimum/maximum validation;
- wallet balance.

Optional later:

- remembered favorite amounts;
- preset chips based on user history;
- responsible-play custom caps.

Never hide fees or settlement asset.

## IGNITION button

IGNITION is the primary product interaction.

### Requirements

- visually dominant;
- fixed/stable location across rounds;
- accessible label;
- disabled state explains why;
- immediate acknowledged state after click;
- cannot double-submit the same round accidentally;
- desktop Space hotkey only when safe;
- mobile haptic feedback where platform/browser support allows and user settings permit.

### State machine

```text
READY
  -> VALIDATING
  -> COMMITTING / SIGNING
  -> LOCKED
  -> RESOLVING
  -> RESULT
  -> READY
```

Failure branches:

```text
VALIDATION_FAILED
SIGNATURE_REJECTED
TRANSACTION_FAILED
RNG_DELAYED
SETTLEMENT_DELAYED
NETWORK_DEGRADED
```

Every failure state must tell the user whether funds moved, whether the wager exists, and what action is safe next.

## GAS Gauge

The Gauge is the signature result visualization.

It must function as:

- anticipation device;
- risk-mode visualizer;
- result revealer;
- brand asset.

It must **not** imply that the animation itself determines randomness after the wager is committed.

### Pre-round

Gauge shows mode distribution/risk character, not a fabricated future outcome.

### Resolving

Animation may respond to already-committed/resolved data but must never allow operator-controlled result steering.

### Result

Show:

- multiplier/result;
- amount won/lost;
- ending balance;
- mode;
- round ID;
- verify affordance.

## Animation modes

### Standard

Short anticipation + satisfying gauge motion.

### Instant Mode

For repeat players:

- skips most decorative motion;
- preserves all state and verification;
- result appears as soon as safely available;
- toggle persists per user/device preference.

### Reduced Motion

Follow OS/browser preference:

- minimal movement;
- no rapid sweeping needle;
- state changes conveyed through text/shape/opacity;
- identical functional timing and settlement semantics.

## Desktop hotkeys

Candidate mappings:

- `Space` -> IGNITION
- `H` -> half wager
- `D` -> double wager
- `1/2/3` -> CRUISE / BOOST / REDLINE only if testing shows no conflicts

Hotkeys must:

- be opt-in or clearly disclosed;
- never fire while a text/number field is actively editing unless intentionally designed;
- disable during non-ready states.

## Post-result hierarchy

1. result multiplier / win-loss state
2. payout delta
3. new GAS balance
4. large `IGNITION AGAIN` / same primary button returning READY
5. `SHARE`
6. `VERIFY`
7. expanded round detail

## Live tabs

Below/alongside the game:

- **My Bets**
- **All Bets**
- **High Rollers**

Each row:

- profile/short identity;
- mode;
- wager;
- multiplier;
- payout;
- timestamp;
- verification if opened.

Do not fabricate activity in low-volume periods. Empty state is preferable to fake social proof.

## Deep links

A social result deep link may preselect:

- game = GAS Original;
- mode;
- optionally suggested wager denomination/ratio, but never automatically place a wager.

Viewer must explicitly choose their amount and press IGNITION.

## Provably-fair entry

Every result includes `Verify`.

The verification sheet should answer first:

**Was this result generated from the committed randomness and settled according to the published game rules?**

Then expose technical data.

## RTP / payout disclosure

The UI must not imply a single-round guaranteed RTP.

Where RTP/house economics are displayed, use language explaining that RTP is a long-run statistical property of the active epoch and game table.

The mode selector should expose relative volatility and potential payout shape, while exact probability tables remain available from an info surface.

## Session UX

Always show:

- current balance;
- wager amount;
- recent results/history access.

For any future Autoplay:

- number of rounds required;
- max loss / stop loss option;
- stop on profit option if supported;
- obvious STOP control;
- no hidden indefinite mode;
- responsible-play controls take precedence.

Autoplay is **not required for initial Phase 1** and should only ship after manual repeated-play UX and risk controls are proven.

## Acceptance tests

- first-time user correctly identifies mode selector, wager, and IGNITION without tutorial;
- same-bet repeat requires one primary action after result;
- duplicate click cannot create accidental duplicate wager;
- standard, instant, and reduced-motion paths return identical economic outcomes;
- all error paths explain fund state;
- every resolved wager has a working Verify route;
- mobile core controls fit target viewport;
- keyboard flow is functional and safe;
- no animation blocks ability to see/act on a completed result longer than the defined interaction budget.
