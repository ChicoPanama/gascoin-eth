export interface HolderShareObservation {
  identityId: string;
  observedAtMs: number;
  directGasUnderlyingShares: bigint;
  wrappedGasUnderlyingShares: bigint;
}

/** Time integral of canonical underlying shares; wrapping cannot change weight. */
export function timeWeightedUnderlyingShares(observations: readonly HolderShareObservation[]): bigint {
  if (observations.length < 2) return 0n;
  const ordered = [...observations].sort((a, b) => a.observedAtMs - b.observedAtMs);
  const identity = ordered[0].identityId;
  let shareMilliseconds = 0n;
  for (let index = 0; index < ordered.length - 1; index += 1) {
    const current = ordered[index];
    const next = ordered[index + 1];
    if (!identity || current.identityId !== identity || next.identityId !== identity || next.observedAtMs <= current.observedAtMs) {
      throw new Error('Holder observations must use one canonical identity and strictly increasing authority time.');
    }
    const shares = current.directGasUnderlyingShares + current.wrappedGasUnderlyingShares;
    if (current.directGasUnderlyingShares < 0n || current.wrappedGasUnderlyingShares < 0n) throw new Error('Canonical shares cannot be negative.');
    shareMilliseconds += shares * BigInt(next.observedAtMs - current.observedAtMs);
  }
  return shareMilliseconds / BigInt(ordered.at(-1)!.observedAtMs - ordered[0].observedAtMs);
}
