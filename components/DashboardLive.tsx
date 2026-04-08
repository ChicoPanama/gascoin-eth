'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const TREASURY_WALLET = process.env.NEXT_PUBLIC_TREASURY_WALLET || 'TREASURY_WALLET_ADDRESS';
const GASCOIN_MINT = process.env.NEXT_PUBLIC_GASCOIN_MINT || 'GASCOIN_MINT_ADDRESS';
const RPC_URL = '/api/rpc';

// ─── RPC helpers (vanilla fetch, no SDK) ───
async function rpcFetch(method: string, params: any[] = []): Promise<any> {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

async function fetchSolBalance(): Promise<number> {
  try {
    const r = await rpcFetch('getBalance', [TREASURY_WALLET]);
    return (r?.value ?? 0) / 1e9;
  } catch (e) {
    console.error('Treasury SOL RPC error:', e);
    return -1;
  }
}

async function fetchGascoinBalance(): Promise<number> {
  try {
    const r = await rpcFetch('getTokenAccountsByOwner', [
      TREASURY_WALLET,
      { mint: GASCOIN_MINT },
      { encoding: 'jsonParsed' }
    ]);
    let total = 0;
    for (const acc of r?.value || []) {
      total += Number(acc?.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0);
    }
    return total;
  } catch (e) {
    console.error('Treasury GASCOIN RPC error:', e);
    return -1;
  }
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
  const [solBalance, setSolBalance] = useState(-1);
  const [gcBalance, setGcBalance] = useState(-1);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      const [sol, gc] = await Promise.all([fetchSolBalance(), fetchGascoinBalance()]);
      if (!active) return;
      if (sol >= 0) { setSolBalance(sol); setOnline(true); }
      else { setOnline(false); }
      if (gc >= 0) setGcBalance(gc);
    };
    poll();
    const id = setInterval(poll, 30000);
    return () => { active = false; clearInterval(id); };
  }, []);

  const animBal = useAnimatedValue(solBalance >= 0 ? solBalance : 0);
  const animGc = useAnimatedValue(gcBalance >= 0 ? gcBalance : 0);
  const animRefunds = useAnimatedValue(refundsToday);
  const animPaid = useAnimatedValue(totalPaid);
  const animQueue = useAnimatedValue(queueDepth);

  return (
    <div className="gc-stats">
      <div className="gc-stats-grid">
        <div className="gc-stat">
          <div className="gc-stat-label">
            Treasury Balance
            <span className="gc-pulse" />
          </div>
          <div className="gc-stat-value">
            {solBalance >= 0 ? `${animBal.toFixed(2)}` : '—'}
          </div>
          <div className="gc-stat-sub">
            {online
              ? `SOL · Live${gcBalance >= 0 ? ` · ${Math.round(animGc).toLocaleString()} GASCOIN` : ''}`
              : 'SOL · (offline)'}
          </div>
        </div>
        <div className="gc-stat">
          <div className="gc-stat-label">Refunds Today</div>
          <div className="gc-stat-value">{Math.round(animRefunds)}</div>
          <div className="gc-stat-sub">Last 24h</div>
        </div>
        <div className="gc-stat">
          <div className="gc-stat-label">Total Paid Out</div>
          <div className="gc-stat-value">{animPaid.toFixed(2)}</div>
          <div className="gc-stat-sub">SOL All-Time</div>
        </div>
        <div className="gc-stat">
          <div className="gc-stat-label">Queue Depth</div>
          <div className="gc-stat-value">{Math.round(animQueue)}</div>
          <div className="gc-stat-sub">Pending Verification</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// ZONE 2 — Treasury Chart (Canvas API)
// ═══════════════════════════════════════════
// TODO: replace with Supabase query for treasury_snapshots over 7 days
const MOCK_CHART_DATA = [
  { day: 'Mon', sol: 42.5 },
  { day: 'Tue', sol: 41.8 },
  { day: 'Wed', sol: 44.2 },
  { day: 'Thu', sol: 43.1 },
  { day: 'Fri', sol: 45.9 },
  { day: 'Sat', sol: 44.7 },
  { day: 'Sun', sol: 46.3 },
];

export function TreasuryChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; idx: number } | null>(null);
  const data = MOCK_CHART_DATA;

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

    const vals = data.map(d => d.sol);
    const min = Math.floor(Math.min(...vals) - 2);
    const max = Math.ceil(Math.max(...vals) + 2);
    const range = max - min;

    const toX = (i: number) => pad.left + (i / (data.length - 1)) * plotW;
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
    data.forEach((d, i) => {
      ctx.fillText(d.day, toX(i), h - pad.bottom + 24);
    });

    // Line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = toX(i);
      const y = toY(d.sol);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    data.forEach((d, i) => {
      ctx.beginPath();
      ctx.arc(toX(i), toY(d.sol), 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    });

    // Hover crosshair + tooltip
    if (hoverState && hoverState.idx >= 0 && hoverState.idx < data.length) {
      const d = data[hoverState.idx];
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
  }, [data]);

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
    const idx = Math.round(rel * (data.length - 1));
    if (idx >= 0 && idx < data.length) {
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
            wallet: r.wallet ? `${r.wallet.slice(0, 4)}...${r.wallet.slice(-4)}` : '—',
            location: '—',
            amount: Number(r.riskScore || 0).toFixed(2),
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
  return (
    <div className="gc-gates">
      <div className="gc-feed-header">
        <span className="gc-section-num">Verification Gates</span>
      </div>
      <div className="gc-gates-list">
        {DASHBOARD_GATES.map((g, i) => (
          <div key={g.name} className="gc-gate">
            <div className="gc-gate-head">
              <span className="gc-gate-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="gc-gate-name">{g.name}</span>
              <span className="gc-gate-pct">{g.rate}%</span>
            </div>
            <div className="gc-gate-track">
              <div className="gc-gate-fill" style={{ width: `${g.rate}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
