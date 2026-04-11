'use client';

import type { GateWithStats } from '../../types/gates';

export function GateDetailPanel({ gate }: { gate: GateWithStats }) {
  const { definition: def } = gate;

  return (
    <div className="gt-detail">
      <div className="gt-detail-line">
        <strong>Check:</strong> {def.what_we_check}
      </div>
      <div className="gt-detail-line">
        <strong>Fails when:</strong> {def.common_failures.join('; ')}.
      </div>
      <div className="gt-detail-line">
        <strong>Fix:</strong> {def.how_to_pass}
      </div>
    </div>
  );
}
