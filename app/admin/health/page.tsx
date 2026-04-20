import { redirect } from 'next/navigation';
import { verifyAdminSession } from '../../actions/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { Redis } from '@upstash/redis';

// ═══════════════════════════════════════════
// Admin / System Health
// ═══════════════════════════════════════════
//
// One-glance operational cockpit for the beta. Shows:
//
//   - Dry-run / live mode flag (ENABLE_LIVE_PAYOUT)
//   - Build SHA + deploy region (from Vercel env)
//   - 9 cron workers with last-run status (pulled from audit_logs)
//   - External dependency matrix (Supabase, Upstash, Helius, mem0, Privy, X API)
//   - Season 1 invite redemption count
//
// Intentionally server-rendered so every page load hits fresh data —
// no stale metrics caching. If this ever gets traffic-heavy we can
// flip to a 15s Data Cache, but for admin-only use it's fine.

// ─── Workers we expect to see running ───
const EXPECTED_WORKERS = [
  { path: '/api/workers/process-claims', schedule: '*/5 * * * *', label: 'Process Claims' },
  { path: '/api/workers/verify-referrals', schedule: '*/15 * * * *', label: 'Verify Referrals' },
  { path: '/api/workers/score-engagement', schedule: '0 * * * *', label: 'Score Engagement' },
  { path: '/api/workers/sync-gascoin-followers', schedule: '*/30 * * * *', label: 'Sync GasCoin Followers' },
  { path: '/api/workers/award-points', schedule: '0 6 * * *', label: 'Award Points' },
  { path: '/api/workers/sync-x-handles', schedule: '0 3 * * *', label: 'Sync X Handles' },
  { path: '/api/workers/pre-payout-verify', schedule: '55 23 * * *', label: 'Pre-Payout Verify' },
  { path: '/api/workers/aggregate-intelligence', schedule: '0 7 * * *', label: 'Aggregate Intelligence' },
  { path: '/api/workers/flush-receipts', schedule: '0 3 * * 0', label: 'Flush Receipts' },
];

// ─── Env vars we expect to have ───
const EXPECTED_ENV = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', group: 'Supabase' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', group: 'Supabase' },
  { key: 'UPSTASH_REDIS_REST_URL', group: 'Upstash' },
  { key: 'UPSTASH_REDIS_REST_TOKEN', group: 'Upstash' },
  { key: 'ALCHEMY_API_KEY', group: 'Ethereum' },
  { key: 'GASCOIN_CONTRACT_ADDRESS', group: 'Ethereum' },
  { key: 'NEXT_PUBLIC_GASCOIN_CONTRACT_ADDRESS', group: 'Ethereum' },
  { key: 'MEM0_API_KEY', group: 'mem0' },
  { key: 'MEM0_ORG_ID', group: 'mem0' },
  { key: 'NEXT_PUBLIC_PRIVY_APP_ID', group: 'Privy' },
  { key: 'PRIVY_APP_SECRET', group: 'Privy' },
  { key: 'X_BEARER_TOKEN', group: 'X API' },
  { key: 'X_STRICT_MODE', group: 'X API' },
  { key: 'CRON_SECRET', group: 'Cron' },
  { key: 'REVIEWER_API_TOKEN', group: 'Admin' },
];

// ─── F4: Real connectivity probes ────────────────────────────────────────
// Each probe runs with a hard 3-second AbortSignal timeout. Returns a
// ConnectResult so the page can render a live status matrix rather than
// just checking env var presence.

type ConnectResult = { ok: boolean; latencyMs: number; detail?: string };

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const abort = AbortSignal.timeout(ms);
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      abort.addEventListener('abort', () => reject(new Error('timeout')), { once: true });
    }),
  ]);
}

async function probeSupabase(): Promise<ConnectResult> {
  const start = Date.now();
  try {
    const sb = getSupabaseAdmin();
    // Wrap in an explicit Promise so withTimeout gets a real thenable
    await withTimeout(
      Promise.resolve(sb.from('audit_logs').select('id').limit(1).maybeSingle()),
      3000,
    );
    return { ok: true, latencyMs: Date.now() - start };
  } catch (e: any) {
    return { ok: false, latencyMs: Date.now() - start, detail: e?.message?.slice(0, 80) };
  }
}

async function probeRedis(): Promise<ConnectResult> {
  const start = Date.now();
  const url = (process.env.UPSTASH_REDIS_REST_URL || '').trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  if (!url || !token) return { ok: false, latencyMs: 0, detail: 'env vars missing' };
  try {
    const redis = new Redis({ url, token });
    const key = `health:probe:${Date.now()}`;
    // Use a distinctive string so loose equality after SDK deserialization
    // still passes. Earlier we used '1' which Upstash's SDK reads back as a
    // number 1, failing strict `!==`. A random hex string avoids that.
    const marker = `ok-${Math.random().toString(36).slice(2, 10)}`;
    await withTimeout(
      (async () => {
        await redis.set(key, marker, { ex: 10 });
        const v = await redis.get(key);
        if (String(v) !== marker) throw new Error('round-trip mismatch');
        await redis.del(key);
      })(),
      3000,
    );
    return { ok: true, latencyMs: Date.now() - start };
  } catch (e: any) {
    return { ok: false, latencyMs: Date.now() - start, detail: e?.message?.slice(0, 80) };
  }
}

async function probeEthereum(): Promise<ConnectResult> {
  const start = Date.now();
  const apiKey = (process.env.ALCHEMY_API_KEY || '').trim();
  const rpcUrl = apiKey
    ? `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`
    : (process.env.ETH_RPC_URL || '').trim();
  if (!rpcUrl) return { ok: false, latencyMs: 0, detail: 'ALCHEMY_API_KEY or ETH_RPC_URL missing' };
  try {
    const res = await withTimeout(
      fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
        cache: 'no-store',
      }),
      3000,
    );
    const json = (await res.json()) as any;
    const ok = res.ok && !!json?.result;
    return { ok, latencyMs: Date.now() - start, detail: ok ? undefined : `result=${JSON.stringify(json?.result)}` };
  } catch (e: any) {
    return { ok: false, latencyMs: Date.now() - start, detail: e?.message?.slice(0, 80) };
  }
}

async function probeMem0(): Promise<ConnectResult> {
  const start = Date.now();
  const apiKey = (process.env.MEM0_API_KEY || '').trim();
  const orgId = (process.env.MEM0_ORG_ID || '').trim();
  if (!apiKey || !orgId) return { ok: false, latencyMs: 0, detail: 'MEM0_API_KEY or MEM0_ORG_ID missing' };
  try {
    // mem0 /memories requires one of {app_id, user_id, agent_id, run_id};
    // omitting them returns 400 regardless of key validity. Use a
    // definitely-empty user_id so the probe tests the key + org, not the
    // query shape. 404 / empty list => key is valid.
    const res = await withTimeout(
      fetch(`https://api.mem0.ai/v1/memories/?org_id=${orgId}&user_id=health_probe&limit=1`, {
        headers: { Authorization: `Token ${apiKey}` },
        cache: 'no-store',
      }),
      3000,
    );
    if (res.status === 401 || res.status === 403) {
      return { ok: false, latencyMs: Date.now() - start, detail: `HTTP ${res.status} — key expired or invalid` };
    }
    // 200 (empty results) + 404 (user not found) both mean auth succeeded.
    const ok = res.ok || res.status === 404;
    return { ok, latencyMs: Date.now() - start, detail: ok ? undefined : `HTTP ${res.status}` };
  } catch (e: any) {
    return { ok: false, latencyMs: Date.now() - start, detail: e?.message?.slice(0, 80) };
  }
}

async function probeXApi(): Promise<ConnectResult> {
  const start = Date.now();
  const token = (process.env.X_BEARER_TOKEN || '').trim();
  if (!token) return { ok: false, latencyMs: 0, detail: 'X_BEARER_TOKEN missing' };
  try {
    // IMPORTANT: /2/users/me requires OAuth2 USER CONTEXT — app-only bearer
    // tokens (the kind score-engagement actually uses) get 403 on that
    // endpoint even when fully valid. Probe with an app-only-compatible
    // endpoint instead: users/by/username. That's what our workers call.
    const res = await withTimeout(
      fetch('https://api.x.com/2/users/by/username/GasCoinApp', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      }),
      3000,
    );
    // 401 = invalid token, 403 = forbidden — both mean config problem
    if (res.status === 401 || res.status === 403) {
      return { ok: false, latencyMs: Date.now() - start, detail: `HTTP ${res.status} — token invalid` };
    }
    // 429 means rate limited but the token itself is valid
    const ok = res.ok || res.status === 429;
    return { ok, latencyMs: Date.now() - start, detail: ok ? (res.status === 429 ? 'rate limited (token valid)' : undefined) : `HTTP ${res.status}` };
  } catch (e: any) {
    return { ok: false, latencyMs: Date.now() - start, detail: e?.message?.slice(0, 80) };
  }
}

async function probeAiGateway(): Promise<ConnectResult> {
  const start = Date.now();
  const hasOidc = !!(process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL);
  if (!hasOidc) return { ok: false, latencyMs: 0, detail: 'VERCEL_OIDC_TOKEN not present (local dev: run vercel env pull)' };
  // We confirm the gateway URL is reachable without spending tokens
  try {
    const res = await withTimeout(
      fetch('https://ai-gateway.vercel.sh/v1/models', {
        headers: { Authorization: `Bearer ${process.env.VERCEL_OIDC_TOKEN || ''}` },
        cache: 'no-store',
      }),
      3000,
    );
    return { ok: res.ok, latencyMs: Date.now() - start, detail: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e: any) {
    return { ok: false, latencyMs: Date.now() - start, detail: e?.message?.slice(0, 80) };
  }
}

export default async function AdminHealthPage() {
  const session = await verifyAdminSession();
  if (!session.valid) redirect('/admin/login');

  const supabase = getSupabaseAdmin();

  // Pull recent cron run records. Audit logs capture cron executions via
  // action='cron_run' with the worker path in the target field.
  const { data: recentRuns } = await supabase
    .from('audit_logs')
    .select('action, target, payload, created_at')
    .or(`action.eq.cron_run,action.eq.worker_run`)
    .order('created_at', { ascending: false })
    .limit(200);

  // Bucket the most recent run for each worker
  const lastRunByWorker = new Map<string, { ts: string; ok: boolean; detail: string }>();
  for (const row of (recentRuns || []) as any[]) {
    const key = String(row.target || '');
    if (!key || lastRunByWorker.has(key)) continue;
    const payload = row.payload || {};
    lastRunByWorker.set(key, {
      ts: row.created_at,
      ok: payload?.ok !== false,
      detail: typeof payload?.summary === 'string' ? payload.summary.slice(0, 80) : '',
    });
  }

  // Invite code stats
  const { data: inviteRows } = await supabase
    .from('invite_codes')
    .select('used_by_x_user_id', { count: 'exact' });
  const inviteTotal = inviteRows?.length || 0;
  const inviteRedeemed = (inviteRows || []).filter((r: any) => r.used_by_x_user_id).length;

  // Core flags
  const isDryRun = process.env.ENABLE_LIVE_PAYOUT !== 'true';
  const buildSha = (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 8);
  const region = process.env.VERCEL_REGION || 'local';
  const env = process.env.VERCEL_ENV || 'development';

  // Group env vars
  const envByGroup = new Map<string, Array<{ key: string; present: boolean }>>();
  for (const item of EXPECTED_ENV) {
    const present = !!(process.env[item.key] || '').trim();
    if (!envByGroup.has(item.group)) envByGroup.set(item.group, []);
    envByGroup.get(item.group)!.push({ key: item.key, present });
  }

  // F4: Real connectivity checks — all run in parallel, each capped at 3s
  const [connSupabase, connRedis, connEthereum, connMem0, connXApi, connAiGateway] =
    await Promise.all([
      probeSupabase(),
      probeRedis(),
      probeEthereum(),
      probeMem0(),
      probeXApi(),
      probeAiGateway(),
    ]);

  const connectivityChecks = [
    { label: 'Supabase',      result: connSupabase },
    { label: 'Redis',         result: connRedis },
    { label: 'Ethereum RPC',  result: connEthereum },
    { label: 'mem0',          result: connMem0 },
    { label: 'X API',         result: connXApi },
    { label: 'AI Gateway',    result: connAiGateway },
  ];

  return (
    <div>
      <div className="admin-page-header">ADMIN / SYSTEM</div>
      <h1 className="admin-page-title">System Health</h1>

      {/* ── Top stats ── */}
      <div className="gc-stats" style={{ marginBottom: 32 }}>
        <div className="gc-stats-grid">
          <div className="gc-stat">
            <div className="gc-stat-label">Mode</div>
            <div
              className="gc-stat-value"
              style={{ color: isDryRun ? 'var(--status-warn)' : 'var(--status-pass)' }}
            >
              {isDryRun ? 'DRY RUN' : 'LIVE'}
            </div>
            <div className="gc-stat-sub">
              {isDryRun ? 'No ETH dispatched' : 'Real ETH payouts'}
            </div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Build SHA</div>
            <div className="gc-stat-value" style={{ fontSize: 24, fontFamily: 'var(--font-mono)' }}>
              {buildSha}
            </div>
            <div className="gc-stat-sub">{env} · {region}</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Invite Codes</div>
            <div className="gc-stat-value">{inviteRedeemed} / {inviteTotal}</div>
            <div className="gc-stat-sub">redeemed of total</div>
          </div>
          <div className="gc-stat">
            <div className="gc-stat-label">Cron Workers</div>
            <div className="gc-stat-value">{EXPECTED_WORKERS.length}</div>
            <div className="gc-stat-sub">scheduled</div>
          </div>
        </div>
      </div>

      {/* ── Cron workers ── */}
      <div style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            marginBottom: 12,
          }}
        >
          Cron Workers
        </h2>
        <div style={{ border: '1px solid var(--line)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'rgba(var(--fg-rgb), 0.04)', borderBottom: '1px solid var(--line)' }}>
                <th style={thStyle}>Worker</th>
                <th style={thStyle}>Schedule</th>
                <th style={thStyle}>Last Run</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {EXPECTED_WORKERS.map((w) => {
                const last = lastRunByWorker.get(w.path);
                const ago = last ? timeAgo(last.ts) : '—';
                return (
                  <tr key={w.path} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={tdStyle}>{w.label}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{w.schedule}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{ago}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          background: !last ? 'var(--text-tertiary)' : last.ok ? 'var(--status-pass)' : 'var(--status-fail)',
                          color: '#FFFFFF',
                        }}
                      >
                        {!last ? 'NO DATA' : last.ok ? 'OK' : 'FAIL'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--text-tertiary)', fontSize: 11, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {last?.detail || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
          &quot;Last run&quot; is read from audit_logs. Workers that don&apos;t write audit entries show &quot;NO DATA&quot; even if they&apos;re running.
        </p>
      </div>

      {/* ── F4: Live connectivity checks ── */}
      <div style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            marginBottom: 12,
          }}
        >
          Service Connectivity
        </h2>
        <div style={{ border: '1px solid var(--line)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'rgba(var(--fg-rgb), 0.04)', borderBottom: '1px solid var(--line)' }}>
                <th style={thStyle}>Service</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Latency</th>
                <th style={thStyle}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {connectivityChecks.map(({ label, result }) => (
                <tr key={label} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={tdStyle}>{label}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        background: result.ok ? 'var(--status-pass)' : 'var(--status-fail)',
                        color: '#FFFFFF',
                      }}
                    >
                      {result.ok ? 'OK' : 'FAIL'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>
                    {result.latencyMs > 0 ? `${result.latencyMs}ms` : '—'}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--text-tertiary)', fontSize: 11 }}>
                    {result.detail || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
          Each probe runs a real request with a 3-second timeout on every page load.
        </p>
      </div>

      {/* ── Env vars matrix ── */}
      <div style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            marginBottom: 12,
          }}
        >
          Environment Variables
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {Array.from(envByGroup.entries()).map(([group, items]) => (
            <div key={group} style={{ border: '1px solid var(--line)', padding: 16 }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                  marginBottom: 10,
                }}
              >
                {group}
              </div>
              {items.map(({ key, present }) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: 'var(--fg)' }}>{key}</span>
                  <span style={{ color: present ? 'var(--status-pass)' : 'var(--status-fail)', fontWeight: 700 }}>
                    {present ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <p style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
          ✓ = value is set and non-empty. Presence only — secrets are never displayed.
        </p>
      </div>
    </div>
  );
}

function timeAgo(ts: string): string {
  const then = new Date(ts).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 14px',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  color: 'var(--fg)',
  verticalAlign: 'middle',
};
