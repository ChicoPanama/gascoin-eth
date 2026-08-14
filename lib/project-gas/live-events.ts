export type GasGameMode = 'CRUISE' | 'BOOST' | 'REDLINE';

export type LiveEventKind =
  | 'game-result'
  | 'trade'
  | 'rebase'
  | 'reserve'
  | 'crew-milestone';

export type LiveEventAuthority = 'onchain' | 'protocol-indexer' | 'user-content';
export type LiveEventConfirmation = 'pending' | 'confirmed';
export type LiveFeedHealth = 'live' | 'degraded' | 'offline';

/**
 * Exact token and fiat values travel as strings so the UI layer never
 * accidentally introduces JS floating-point errors into economic data.
 */
export interface AssetAmount {
  asset: string;
  amount: string;
  decimals?: number;
  amountUsd?: string;
}

export interface LiveIdentity {
  profileId?: string;
  displayName?: string;
  avatarUrl?: string;
  wallet?: `0x${string}`;
  crewId?: string;
  crewName?: string;
}

export interface BaseLiveEvent {
  id: string;
  kind: LiveEventKind;
  occurredAt: string;
  authority: LiveEventAuthority;
  confirmation: LiveEventConfirmation;
  txHash?: `0x${string}`;
  blockNumber?: string;
}

export interface GameResultEvent extends BaseLiveEvent {
  kind: 'game-result';
  authority: 'onchain' | 'protocol-indexer';
  roundId: string;
  identity?: LiveIdentity;
  game: 'gas-original' | 'roulette';
  mode?: GasGameMode;
  wager: AssetAmount;
  payout: AssetAmount;
  multiplier: string;
  outcome: 'win' | 'loss';
  verificationHref: string;
}

export interface TradeEvent extends BaseLiveEvent {
  kind: 'trade';
  authority: 'onchain' | 'protocol-indexer';
  identity?: LiveIdentity;
  side: 'buy' | 'sell';
  pay: AssetAmount;
  receive: AssetAmount;
  gasPriceUsd?: string;
}

export interface RebaseEvent extends BaseLiveEvent {
  kind: 'rebase';
  authority: 'onchain' | 'protocol-indexer';
  direction: 'positive' | 'negative' | 'neutral';
  percent: string;
  indexBefore: string;
  indexAfter: string;
  backingRatio?: string;
}

export interface ReserveEvent extends BaseLiveEvent {
  kind: 'reserve';
  authority: 'onchain' | 'protocol-indexer';
  action: 'deposit' | 'withdrawal' | 'rebalance' | 'valuation-update';
  asset: AssetAmount;
  externalReserveUsd?: string;
  backingRatio?: string;
  policyReference?: string;
}

export interface CrewMilestoneEvent extends BaseLiveEvent {
  kind: 'crew-milestone';
  authority: 'protocol-indexer';
  crewId: string;
  crewName: string;
  milestone:
    | 'rank-change'
    | 'ignitions'
    | 'biggest-hit'
    | 'streak'
    | 'member-count';
  value: string;
  previousValue?: string;
  supportingRoundId?: string;
}

export type LiveEvent =
  | GameResultEvent
  | TradeEvent
  | RebaseEvent
  | ReserveEvent
  | CrewMilestoneEvent;

export interface LiveFeedSnapshot {
  health: LiveFeedHealth;
  events: LiveEvent[];
  lastIndexedAt?: string;
  reason?: string;
}

export function isEconomicallyVerifiable(event: LiveEvent): boolean {
  return event.kind !== 'crew-milestone' && event.confirmation === 'confirmed';
}

export function shouldPauseLiveClaims(snapshot: LiveFeedSnapshot): boolean {
  return snapshot.health !== 'live';
}

export function publicIdentityLabel(identity?: LiveIdentity): string {
  if (!identity) return 'Anonymous';
  if (identity.displayName) return identity.displayName;
  if (identity.wallet) {
    return `${identity.wallet.slice(0, 6)}…${identity.wallet.slice(-4)}`;
  }
  return 'Anonymous';
}
