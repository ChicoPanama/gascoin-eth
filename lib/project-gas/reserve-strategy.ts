export type ReserveStrategyKind = 'liquid-stable' | 'treasury' | 'eth' | 'equity-rwa' | 'aerodrome-liquidity' | 'strategic-governance-asset';
export type ReserveStrategyHealth = 'healthy' | 'degraded' | 'stale' | 'paused' | 'insolvent';

export interface ReserveStrategySnapshot {
  strategyId: string;
  kind: ReserveStrategyKind;
  asset: string;
  assetClass: 'external' | 'gas' | 'wgas' | 'self-pol';
  rawNavUsd: bigint;
  haircutAdjustedBackingUsd: bigint;
  liquidUsd: bigint;
  realizedExternalYieldUsd: bigint;
  unrealizedPnlUsd: bigint;
  capUsd: bigint;
  withdrawalState: 'liquid' | 'delayed' | 'blocked';
  health: ReserveStrategyHealth;
  observedAtMs: number;
  validUntilMs: number;
}

export function validateReserveStrategy(snapshot: ReserveStrategySnapshot, nowMs = Date.now()): { usable: boolean; reason: string } {
  const amounts = [snapshot.rawNavUsd, snapshot.haircutAdjustedBackingUsd, snapshot.liquidUsd,
    snapshot.realizedExternalYieldUsd, snapshot.capUsd];
  if (!snapshot.strategyId.trim() || !snapshot.asset.trim() || amounts.some((amount) => amount < 0n)) {
    return { usable: false, reason: 'Canonical strategy identity and non-negative accounting are required.' };
  }
  if (snapshot.assetClass !== 'external' && snapshot.haircutAdjustedBackingUsd !== 0n) {
    return { usable: false, reason: 'GAS, wGAS, and self-issued POL cannot count as backing.' };
  }
  if (snapshot.haircutAdjustedBackingUsd > snapshot.rawNavUsd || snapshot.rawNavUsd > snapshot.capUsd) {
    return { usable: false, reason: 'Backing or NAV exceeds its authoritative bound.' };
  }
  if (snapshot.observedAtMs > nowMs || nowMs >= snapshot.validUntilMs || snapshot.health !== 'healthy') {
    return { usable: false, reason: 'Strategy state is stale, paused, degraded, or insolvent.' };
  }
  return { usable: true, reason: 'Raw NAV, backing, liquidity, yield, and PnL remain separately authoritative.' };
}
