'use client';

import type { GateWithStats } from '../../types/gates';

export function GateDetailPanel({ gate }: { gate: GateWithStats }) {
  const { definition: def, top_failures } = gate;

  return (
    <div className="gt-detail">
      <div className="gt-detail-row">
        <div className="gt-detail-cell">
          <span className="gt-detail-label">What We Check</span>
          <span className="gt-detail-value">{def.what_we_check}</span>
        </div>
        <div className="gt-detail-cell">
          <span className="gt-detail-label">Common Failures</span>
          <span className="gt-detail-value">
            {def.common_failures.map((f, i) => (
              <span key={i} className="gt-detail-failure-inline">
                {f}
                {top_failures.find((tf) => tf.failure_reason === f) && (
                  <span className="gt-detail-seen"> ({top_failures.find((tf) => tf.failure_reason === f)!.occurrence_count}×)</span>
                )}
                {i < def.common_failures.length - 1 ? ' · ' : ''}
              </span>
            ))}
          </span>
        </div>
        <div className="gt-detail-cell">
          <span className="gt-detail-label">How To Pass</span>
          <span className="gt-detail-value">{def.how_to_pass}</span>
        </div>
      </div>
    </div>
  );
}
