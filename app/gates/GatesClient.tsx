'use client';

import { useState, useRef, useEffect } from 'react';
import { Nav } from '../../components/Nav';
import { GateCard } from '../../components/gates/GateCard';
import { GateDetailPanel } from '../../components/gates/GateDetailPanel';
import { PreSubmissionChecklist } from '../../components/gates/PreSubmissionChecklist';
import { GateFAQ } from '../../components/gates/GateFAQ';
import { useGateStats } from '../../hooks/useGateStats';
import { GATES, GATE_CATEGORIES } from '../../lib/gates';
import { GATE_COUNT } from '../../lib/policy';
import { timeAgo } from '../../lib/formatters';
import type { GateCategoryFilter } from '../../types/gates';

function useAnimVal(target: number, dur = 1200) {
  const [v, setV] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (target <= 0) { setV(target); return; }
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, dur]);
  return v;
}

export default function GatesClient() {
  const { gates, loading, error, lastUpdated } = useGateStats();
  const [filter, setFilter] = useState<GateCategoryFilter>('all');
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = filter === 'all' ? gates : gates.filter((g) => g.definition.category === filter);

  // System stats
  const totalProcessed = gates[0]?.stats?.total_processed ?? 0;
  const allPassed = gates.every((g) => g.stats) ?
    gates.reduce((min, g) => Math.min(min, g.stats?.total_passed ?? 0), Infinity) : 0;
  const overallRate = totalProcessed > 0 ? (allPassed / totalProcessed) * 100 : 0;
  const avgTime = gates.reduce((s, g) => s + (g.stats?.avg_duration_ms ?? 0), 0) / 1000;
  const mostFailed = gates.reduce((worst, g) =>
    (g.stats?.total_failed ?? 0) > (worst.stats?.total_failed ?? 0) ? g : worst, gates[0]);

  const aProcessed = useAnimVal(totalProcessed);
  const aRate = useAnimVal(overallRate);
  const aTime = useAnimVal(avgTime);

  const categories: { key: GateCategoryFilter; label: string; count: number }[] = [
    { key: 'all', label: 'ALL', count: GATES.length },
    { key: 'tweet', label: 'TWEET', count: GATE_CATEGORIES.tweet.count },
    { key: 'receipt', label: 'RECEIPT', count: GATE_CATEGORIES.receipt.count },
    { key: 'wallet', label: 'WALLET', count: GATE_CATEGORIES.wallet.count },
    { key: 'treasury', label: 'TREASURY', count: GATE_CATEGORIES.treasury.count },
  ];

  return (
    <div className="container">
      <Nav />

      {/* Zone 1 — Header */}
      <header className="lb-header">
        <div className="lb-header__meta">
          <span className="lb-tag">— {GATE_COUNT} Verification Gates · Full System Transparency</span>
        </div>
        <h1 className="lb-title lb-title--iconed">
          <span className="lb-title-icon-wrap" aria-hidden>
            <img src="/icons/gates-bridge.jpg" alt="" className="lb-title-icon" />
          </span>
          GATES
        </h1>
        <p className="gt-header-body">
          Every GASCOIN submission passes through {GATE_COUNT} sequential verification
          gates before ETH is released. All gate logic is documented here in
          full. Admin review may apply in edge cases.
        </p>
        <div className="lb-header__live">
          <span className="lb-pulse" />
          <span className="lb-live-label">
            LIVE STATS · Updated {lastUpdated ? timeAgo(lastUpdated) : '—'}
          </span>
        </div>
      </header>

      {error && <div className="sf-error" style={{ marginBottom: 24 }}>{error}</div>}

      {/* Zone 2 — System Stats */}
      <div className="gc-stats">
        <div className="gc-stats-grid">
          <div className="gc-stat">
            <div className="gc-stat-label">Submissions Processed</div>
            <div className="gc-stat-value">{loading ? <div className="lb-skeleton" /> : Math.round(aProcessed).toLocaleString()}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Overall Pass Rate</div>
            <div className="gc-stat-value">{loading ? <div className="lb-skeleton" /> : `${aRate.toFixed(1)}%`}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Avg Processing Time</div>
            <div className="gc-stat-value">{loading ? <div className="lb-skeleton" /> : `${aTime.toFixed(0)}s`}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Most Failed Gate</div>
            <div className="gc-stat-value" style={{ fontSize: 24 }}>
              {loading ? <div className="lb-skeleton" /> : mostFailed?.stats ? `Gate ${mostFailed.definition.id}` : '—'}
            </div>
            {mostFailed?.stats && (
              <div className="gc-stat-sub">{mostFailed.definition.name}</div>
            )}
          </div>
        </div>
      </div>

      {/* Zone 3 — Category Filter */}
      <div className="cf-controls" style={{ borderBottom: 'none', marginBottom: 0 }}>
        <div className="cf-filters">
          {categories.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`cf-filter-tab${filter === c.key ? ' cf-filter-tab--active' : ''}`}
              onClick={() => { setFilter(c.key); setExpanded(null); }}
            >
              {c.label} ({c.count})
            </button>
          ))}
        </div>
      </div>

      {/* Zone 4 — Checklist */}
      <PreSubmissionChecklist />

      {/* Zone 5 + 6 — Gate Cards + Detail Panels */}
      <div className="gt-cards-grid">
        {filtered.map((gate, i) => (
          <div key={gate.definition.id}>
            <GateCard
              gate={gate}
              index={i}
              isExpanded={expanded === gate.definition.id}
              onToggle={() => setExpanded(expanded === gate.definition.id ? null : gate.definition.id)}
            />
            {expanded === gate.definition.id && <GateDetailPanel gate={gate} />}
          </div>
        ))}
      </div>

      {/* Zone 7 — FAQ */}
      <GateFAQ />
    </div>
  );
}
