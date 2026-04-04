'use client';

import type { GateWithStats } from '../../types/gates';

function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return '—';
  return ms < 1000 ? '<1s' : `${Math.round(ms / 1000)}s`;
}

export function GateCard({ gate, index, isExpanded, onToggle }: {
  gate: GateWithStats;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { definition: def, stats, top_failures } = gate;
  const passRate = stats?.pass_rate_pct ?? null;
  const delay = index * 80;

  return (
    <div className={`gt-card${isExpanded ? ' gt-card--expanded' : ''}`}>
      {/* Top bar */}
      <div className="gt-card-top">
        <span className="gt-card-gate">GATE {String(def.id).padStart(2, '0')}</span>
        <div className="gt-card-top-right">
          {!def.is_blocking && <span className="gt-card-nonblock">NON-BLOCKING</span>}
          <span className="gt-card-category">{def.category.toUpperCase()}</span>
        </div>
      </div>

      {/* Name */}
      <div className="gt-card-name">{def.name}</div>

      {/* Pass rate */}
      <div className="gt-card-rate">{passRate !== null ? `${passRate}%` : '—%'}</div>
      <div className="gt-card-rate-label">PASS RATE</div>
      <div className="gt-card-bar-track">
        <div
          className="gt-card-bar-fill"
          style={{
            width: passRate !== null ? `${passRate}%` : '0%',
            animationDelay: `${delay}ms`,
          }}
        />
      </div>

      {/* Secondary stats */}
      <div className="gt-card-stats">
        <span>{stats ? `${stats.total_passed} passed` : '— passed'}</span>
        <span>·</span>
        <span>{stats ? `${stats.total_failed} failed` : '— failed'}</span>
        <span>·</span>
        <span>~{formatDuration(stats?.avg_duration_ms)} avg</span>
      </div>

      {/* Description */}
      <p className="gt-card-desc">{def.description}</p>

      {/* Top failure */}
      {top_failures.length > 0 && (
        <div className="gt-card-failure">
          Top failure: {top_failures[0].failure_reason.slice(0, 50)}{top_failures[0].failure_reason.length > 50 ? '...' : ''}
        </div>
      )}

      {/* Expand button */}
      <button type="button" className="gt-card-expand" onClick={onToggle}>
        {isExpanded ? 'COLLAPSE ↑' : 'VIEW FULL DETAILS ↓'}
      </button>
    </div>
  );
}
