'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../lib/supabase-client';
import { GATES } from '../../lib/gates';
import { GATE_COUNT } from '../../lib/policy';
import { DEMO_GATE_RATES } from '../../lib/demo-data';

export function GatesTeaser() {
  const [rates, setRates] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabaseBrowser
          .from('gate_stats_view')
          .select('gate_id, pass_rate_pct');
        const map = new Map<number, number>();
        for (const r of data || []) map.set(r.gate_id, Number(r.pass_rate_pct || 0));
        setRates(map.size > 0 ? map : DEMO_GATE_RATES);
      } catch {
        setRates(DEMO_GATE_RATES);
      }
      setLoading(false);
    })();
  }, []);

  // Overall pass rate = average of all gate pass rates
  const allRates = GATES.map((g) => rates.get(g.id)).filter((r): r is number => r != null);
  const overall = allRates.length > 0 ? allRates.reduce((s, v) => s + v, 0) / allRates.length : 0;

  return (
    <section className="gt-teaser">
      <div className="gt-teaser-inner">
        <div className="gt-teaser-left">
          <div className="gc-section-num">05 — How We Verify</div>
          <h2 className="gt-teaser-title">
            <span>{GATE_COUNT} Gates.</span>
            <span className="gt-teaser-ghost">0 Exceptions.</span>
          </h2>
          <p className="gt-teaser-sub">
            Every submission passes through {GATE_COUNT} sequential verification checks
            before a single wei leaves the treasury.
          </p>
          <Link href="/gates" className="gc-teaser-link">See all {GATE_COUNT} gates</Link>
        </div>
        <div className="gt-teaser-right glass-card" style={{ padding: 24 }}>
          <div className="gt-teaser-list">
            {GATES.map((g) => {
              const rate = rates.get(g.id);
              return (
                <div key={g.id} className="gt-teaser-row">
                  <span className="gt-teaser-num">{String(g.id).padStart(2, '0')}</span>
                  <span className="gt-teaser-name">{g.name}</span>
                  <span className="gt-teaser-rate">
                    {loading ? '—' : rate != null ? `${rate}%` : '—%'}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="gt-teaser-overall-track">
            <div className="gt-teaser-overall-fill" style={{ width: `${overall}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}
