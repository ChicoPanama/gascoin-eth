'use client';

import type { GateWithStats } from '../../types/gates';

export function GateDetailPanel({ gate }: { gate: GateWithStats }) {
  const { definition: def, top_failures } = gate;

  return (
    <div className="gt-detail">
      <div className="gt-detail-cols">
        <div className="gt-detail-col">
          <div className="gt-detail-heading">What We Check</div>
          <p className="gt-detail-body">{def.what_we_check}</p>
        </div>
        <div className="gt-detail-col">
          <div className="gt-detail-heading">Common Failures</div>
          <div className="gt-detail-failures">
            {def.common_failures.map((f, i) => {
              const live = top_failures.find((tf) => tf.failure_reason === f);
              return (
                <div key={i} className="gt-detail-failure-item">
                  <span>— {f}</span>
                  {live && <span className="gt-detail-seen">Seen {live.occurrence_count} times</span>}
                </div>
              );
            })}
          </div>
        </div>
        <div className="gt-detail-col">
          <div className="gt-detail-heading">How To Pass</div>
          <p className="gt-detail-body">{def.how_to_pass}</p>
          <div className="gt-detail-time">Estimated: ~{def.estimated_time_seconds}s</div>
        </div>
      </div>
    </div>
  );
}
