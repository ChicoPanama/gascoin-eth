'use client';

import type { GateWithStats } from '../../types/gates';

export function GateDetailPanel({ gate }: { gate: GateWithStats }) {
  const { definition: def, top_failures } = gate;

  const failures = def.common_failures.join('; ');

  return (
    <div className="gt-detail">
      <p className="gt-detail-text">
        <strong>Check:</strong> {def.what_we_check}
        {' · '}
        <strong>Fails when:</strong> {failures}.
        {' · '}
        <strong>Fix:</strong> {def.how_to_pass}
      </p>
    </div>
  );
}
