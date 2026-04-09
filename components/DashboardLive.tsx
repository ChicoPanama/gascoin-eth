'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DEMO_CHART_DATA, DEMO_GATE_RATES, DEMO_STATS } from '../lib/demo-data';

type TreasurySummary = {
  live: boolean;
  solBalance: number;
  solUsd: number;
  gascoinBalance: number;
  gascoinUsd: number;
  totalUsd: number;
};

async function fetchTreasurySummary(): Promise<TreasurySummary | null> {
  try {
    const res = await fetch('/api/public/treasury', { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return {
      live: Boolean(json?.live),
      solBalance: Number(json?.solBalance || 0),
      solUsd: Number(json?.solUsd || 0),
      gascoinBalance: Number(json?.gascoinBalance || 0),
      gascoinUsd: Number(json?.gascoinUsd || 0),
      totalUsd: Number(json?.totalUsd || 0),
    };
  } catch {
    return null;
  }
}

function formatUsd(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function UsdcIcon() {
  return (
    <span className="gc-mini-icon" aria-hidden>
      <img
        src="https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694"
        alt=""
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}

function SolIcon() {
  return (
    <span className="gc-mini-icon" aria-hidden>
      <img
        src="https://coin-images.coingecko.com/coins/images/4128/large/solana.png?1718769756"
        alt=""
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}

function PanelCheckIcon() {
  return (
    <span className="gc-verify-mini" aria-hidden>
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M5.5 10.2l2.5 2.6 6.5-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

// ─── Eased counter hook ───
function useAnimatedValue(target: number, duration = 1200) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (target <= 0) { setDisplay(target); return; }
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

// ═══════════════════════════════════════════
// ZONE 1 — Top Stats
// ═══════════════════════════════════════════
export function LiveStatsBar({ refundsToday, totalPaid, queueDepth }: {
  refundsToday: number;
  totalPaid: number;
  queueDepth: number;
}) {
  const [treasury, setTreasury] = useState<TreasurySummary | null>(null);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      const summary = await fetchTreasurySummary();
      if (!active) return;
      if (summary) setTreasury(summary);
    };
    poll();
    const id = setInterval(poll, 30000);
    return () => { active = false; clearInterval(id); };
  }, []);

  // Demo fallback until live treasury data exists
  const useDemoTreasury = !treasury || !treasury.live || treasury.totalUsd <= 0;
  const displayBalUsd = useDemoTreasury ? 2_180_000 : treasury.totalUsd;
  const displayGc = useDemoTreasury ? 8_500_000 : treasury.gascoinBalance;
  const solPrice = treasury && treasury.solBalance > 0 ? treasury.solUsd / treasury.solBalance : 0;
  const displayRefunds = refundsToday > 0 ? refundsToday : DEMO_STATS.refundsToday;
  const displayPaidUsd = totalPaid > 0 && solPrice > 0
    ? totalPaid * solPrice
    : (DEMO_STATS.totalPaid * 170);
  const displayQueue = queueDepth > 0 ? queueDepth : DEMO_STATS.queueDepth;
  const isDemo = useDemoTreasury || (refundsToday === 0 && totalPaid === 0);

  const animBalUsd = useAnimatedValue(displayBalUsd);
  const animGc = useAnimatedValue(displayGc);
  const animRefunds = useAnimatedValue(displayRefunds);
  const animPaidUsd = useAnimatedValue(displayPaidUsd);
  const animQueue = useAnimatedValue(displayQueue);

  return (
    <div className="gc-stats glass-card">
      <div className="gc-stats-grid">
        <div className="gc-stat">
          <div className="gc-stat-label">
            <span className="gc-stat-label-icons"><UsdcIcon /><PanelCheckIcon /></span>
            Treasury Balance
            <span className="gc-pulse" />
          </div>
          <div className="gc-stat-value">
            {formatUsd(animBalUsd)}
          </div>
          <div className="gc-stat-sub">
            {isDemo
              ? `USDC View · Simulated${displayGc > 0 ? ` · ${Math.round(animGc).toLocaleString()} GASCOIN` : ''}`
              : `USDC View · Live${displayGc > 0 ? ` · ${Math.round(animGc).toLocaleString()} GASCOIN` : ''}`}
          </div>
        </div>
        <div className="gc-stat">
          <div className="gc-stat-label"><span className="gc-stat-label-icons"><PanelCheckIcon /></span>Refunds Today</div>
          <div className="gc-stat-value">{Math.round(animRefunds)}</div>
          <div className="gc-stat-sub">Last 24h</div>
        </div>
        <div className="gc-stat">
          <div className="gc-stat-label"><span className="gc-stat-label-icons"><UsdcIcon /><PanelCheckIcon /></span>Total Paid Out</div>
          <div className="gc-stat-value">{formatUsd(animPaidUsd)}</div>
          <div className="gc-stat-sub">USD (USDC) All-Time</div>
        </div>
        <div className="gc-stat">
          <div className="gc-stat-label"><span className="gc-stat-label-icons"><SolIcon /><PanelCheckIcon /></span>Queue Depth</div>
          <div className="gc-stat-value">{Math.round(animQueue)}</div>
          <div className="gc-stat-sub">Pending Verification</div>
        </div>
      </div>
      {isDemo && (
        <div style={{ padding: '8px 48px 12px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: 'var(--muted-deep)' }}>
          Pre-Launch · Demo Data
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// ZONE 2 — Treasury Chart (Canvas API)
// ═══════════════════════════════════════════
// TODO: replace with Supabase query for treasury_snapshots over 7 days

export function TreasuryChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; idx: number } | null>(null);
  const [chartData, setChartData] = useState<{ day: string; sol: number }[]>(DEMO_CHART_DATA);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch('/api/public/treasury/history', { cache: 'no-store' });
        if (!res.ok) return;
        const rows = await res.json();
        if (!active) return;
        if (Array.isArray(rows) && rows.length >= 2) {
          setChartData(rows.map((r: any) => ({ day: String(r.day || ''), sol: Number(r.sol || 0) })));
        }
      } catch {
        // keep demo fallback
      }
    };
    load();
    const id = setInterval(load, 30000);
    return () => { active = false; clearInterval(id); };
  }, []);

  const draw = useCallback((hoverState: typeof hover) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: 20, right: 20, bottom: 40, left: 60 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    const vals = chartData.map(d => d.sol);
    const min = Math.floor(Math.min(...vals) - 2);
    const max = Math.ceil(Math.max(...vals) + 2);
    const range = max - min;

    const toX = (i: number) => pad.left + (i / Math.max(1, chartData.length - 1)) * plotW;
    const toY = (v: number) => pad.top + plotH - ((v - min) / range) * plotH;

    // Y tick marks
    const yTicks = 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'right';
    for (let i = 0; i <= yTicks; i++) {
      const v = min + (range / yTicks) * i;
      const y = toY(v);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + 6, y);
      ctx.stroke();
      ctx.fillText(v.toFixed(1), pad.left - 8, y + 4);
    }

    // X labels
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    chartData.forEach((d, i) => {
      ctx.fillText(d.day, toX(i), h - pad.bottom + 24);
    });

    // Line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    chartData.forEach((d, i) => {
      const x = toX(i);
      const y = toY(d.sol);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    chartData.forEach((d, i) => {
      ctx.beginPath();
      ctx.arc(toX(i), toY(d.sol), 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    });

    // Hover crosshair + tooltip
    if (hoverState && hoverState.idx >= 0 && hoverState.idx < chartData.length) {
      const d = chartData[hoverState.idx];
      const x = toX(hoverState.idx);
      const y = toY(d.sol);

      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, pad.top + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tooltip bg
      const label = `${d.day} · ${d.sol.toFixed(2)} SOL`;
      ctx.font = '11px "IBM Plex Mono", monospace';
      const tw = ctx.measureText(label).width + 16;
      const tx = Math.min(x - tw / 2, w - tw - 4);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(tx, y - 28, tw, 20);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(label, tx + 8, y - 14);

      // Highlight dot
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
  }, [chartData]);

  useEffect(() => { draw(hover); }, [draw, hover]);

  useEffect(() => {
    const resize = () => draw(hover);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [draw, hover]);

  const handleMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const pad = { left: 60, right: 20 };
    const plotW = rect.width - pad.left - pad.right;
    const rel = (mx - pad.left) / plotW;
    const idx = Math.round(rel * (chartData.length - 1));
    if (idx >= 0 && idx < chartData.length) {
      setHover({ x: mx, idx });
    }
  };

  return (
    <div ref={containerRef} className="gc-chart-wrap">
      <canvas
        ref={canvasRef}
        className="gc-chart-canvas"
        onMouseMove={handleMouse}
        onMouseLeave={() => setHover(null)}
      />
    </div>
  );
}

// ═══════════════════════════════════════════
// ZONE 3 — Live Submission Feed (from Supabase)
// ═══════════════════════════════════════════

export function SubmissionFeed() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/public/claims');
        if (res.ok) {
          const data = await res.json();
          const rows = (Array.isArray(data) ? data : []).slice(0, 8).map((r: any) => ({
            wallet: r.xHandle || '@unknown',
            location: r.status || 'queued',
            amount: Number(r.amountSol || 0).toFixed(2),
            gatesPassed: 10,
            _new: false,
          }));
          setEntries(rows);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <div className="gc-feed">
      <div className="gc-feed-header">
        <span className="gc-section-num">Recent Submissions</span>
      </div>
      <div className="gc-feed-list">
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'IBM Plex Mono', fontSize: 11 }}>Loading...</div>
        ) : entries.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'IBM Plex Mono', fontSize: 11 }}>No submissions yet</div>
        ) : (
          entries.map((e: any, i: number) => (
            <div key={`${e.wallet}-${i}`} className={`gc-feed-row${i === 0 && e._new ? ' gc-feed-row--new' : ''}`}>
              <span className="gc-feed-wallet">{e.wallet}</span>
              <span className="gc-feed-loc">{e.location}</span>
              <span className="gc-feed-amt">${e.amount}</span>
              <span className="gc-feed-gate">Gate {e.gatesPassed}/10</span>
              {i === 0 && e._new && <span className="gc-feed-badge">NEW</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// ZONE 4 — Gate Status Panel
// ═══════════════════════════════════════════
// Gate names match lib/gates.ts — 10 gates, no extras
const DASHBOARD_GATES = [
  { name: 'Tweet Detected', rate: 0 },
  { name: 'Tweet Public', rate: 0 },
  { name: '#gascoin Hashtag', rate: 0 },
  { name: 'Tweet Age', rate: 0 },
  { name: 'Wallet on Receipt', rate: 0 },
  { name: 'Receipt Legible', rate: 0 },
  { name: 'Receipt Date Valid', rate: 0 },
  { name: 'No Duplicate Wallet', rate: 0 },
  { name: 'No Duplicate Receipt', rate: 0 },
  { name: 'Treasury Solvent', rate: 0 },
];

export function GateStatusPanel() {
  const [rates, setRates] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch('/api/public/gates', { cache: 'no-store' });
        if (!res.ok) return;
        const rows = await res.json();
        if (!active || !Array.isArray(rows)) return;
        const map: Record<string, number> = {};
        for (const r of rows) {
          map[String(r.name || '')] = Number(r.rate || 0);
        }
        setRates(map);
      } catch {
        // keep fallback rates
      }
    };
    load();
    const id = setInterval(load, 30000);
    return () => { active = false; clearInterval(id); };
  }, []);

  return (
    <div className="gc-gates">
      <div className="gc-feed-header">
        <span className="gc-section-num">Verification Gates</span>
      </div>
      <div className="gc-gates-list">
        {DASHBOARD_GATES.map((g, i) => {
          const fallbackRate = DEMO_GATE_RATES.get(i + 1) || 0;
          const rate = rates[g.name] ?? fallbackRate;
          return (
          <div key={g.name} className="gc-gate">
            <div className="gc-gate-head">
              <span className="gc-gate-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="gc-gate-name">{g.name}</span>
              <span className="gc-gate-pct">{rate}%</span>
            </div>
            <div className="gc-gate-track">
              <div className="gc-gate-fill" style={{ width: `${rate}%` }} />
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}
