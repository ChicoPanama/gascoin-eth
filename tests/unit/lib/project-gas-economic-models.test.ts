import { describe, expect, it } from 'vitest';
import { timeWeightedUnderlyingShares } from '../../../lib/project-gas/holder-alignment';
import { validateReserveStrategy } from '../../../lib/project-gas/reserve-strategy';
import { authorizeRole, runtimeRoleSeparation, type RoleAssignment } from '../../../lib/project-gas/security-roles';

describe('Project GAS reserve, holder, and role boundaries', () => {
  it('separates raw NAV, adjusted backing, realized yield, and unrealized PnL', () => {
    const strategy = { strategyId: 'treasury-1', kind: 'treasury' as const, asset: 'T-BILL', assetClass: 'external' as const,
      rawNavUsd: 1_000n, haircutAdjustedBackingUsd: 950n, liquidUsd: 500n, realizedExternalYieldUsd: 10n,
      unrealizedPnlUsd: 40n, capUsd: 2_000n, withdrawalState: 'delayed' as const, health: 'healthy' as const,
      observedAtMs: 100, validUntilMs: 200 };
    expect(validateReserveStrategy(strategy, 150).usable).toBe(true);
    expect(validateReserveStrategy({ ...strategy, assetClass: 'wgas', haircutAdjustedBackingUsd: 1n }, 150).usable).toBe(false);
    expect(validateReserveStrategy({ ...strategy, health: 'stale' }, 150).usable).toBe(false);
  });

  it('normalizes GAS and wGAS to the same time-weighted underlying shares', () => {
    const direct = timeWeightedUnderlyingShares([
      { identityId: 'did:gas:1', observedAtMs: 0, directGasUnderlyingShares: 100n, wrappedGasUnderlyingShares: 0n },
      { identityId: 'did:gas:1', observedAtMs: 1_000, directGasUnderlyingShares: 0n, wrappedGasUnderlyingShares: 100n },
      { identityId: 'did:gas:1', observedAtMs: 2_000, directGasUnderlyingShares: 100n, wrappedGasUnderlyingShares: 0n },
    ]);
    expect(direct).toBe(100n);
    expect(timeWeightedUnderlyingShares([{ identityId: 'did:gas:1', observedAtMs: 0, directGasUnderlyingShares: 1_000n, wrappedGasUnderlyingShares: 0n }])).toBe(0n);
  });

  it('requires active, unexpired and separated runtime roles', () => {
    const roles = ['admin', 'governance', 'guardian', 'pause', 'oracle-updater', 'strategy-operator', 'treasury-operator', 'router-manager'] as const;
    const assignments: RoleAssignment[] = roles.map((role, index) => ({ role, principal: `principal-${index % 3}`, active: true }));
    assignments[2].principal = 'guardian';
    assignments[5].principal = 'strategy';
    expect(runtimeRoleSeparation(assignments).safe).toBe(true);
    expect(authorizeRole([{ role: 'pause', principal: 'guardian', active: true, expiresAtMs: 10 }], 'pause', 'guardian', 9)).toBe(true);
    expect(authorizeRole([{ role: 'pause', principal: 'guardian', active: true, expiresAtMs: 10 }], 'pause', 'guardian', 10)).toBe(false);
    expect(runtimeRoleSeparation(assignments.map((entry) => ({ ...entry, principal: 'one-key' }))).safe).toBe(false);
  });
});
