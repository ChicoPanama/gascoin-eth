import { redirect } from 'next/navigation';
import { verifyAdminSession } from '../../actions/admin-auth';
import { REFERRAL_CONFIG } from '../../../lib/referral-config';
import { GATES } from '../../../lib/gates';

// Environment variables to check for presence only — values are never exposed
const ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ADMIN_SESSION_SECRET',
  'ADMIN_WALLET_ADDRESSES',
  'GASCOIN_TREASURY_WALLET',
  'TREASURY_PRIVATE_KEY',
  'ENABLE_LIVE_PAYOUT',
  'ETH_RPC_URL',
  'ALCHEMY_API_KEY',
  'GASCOIN_CONTRACT_ADDRESS',
  'NEXT_PUBLIC_PRIVY_APP_ID',
  'PRIVY_APP_SECRET',
  'X_BEARER_TOKEN',
  'OPENROUTER_API_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'CRON_SECRET',
  'REVIEWER_API_TOKEN',
];

function envPresent(key: string): boolean {
  const val = process.env[key];
  return typeof val === 'string' && val.trim().length > 0;
}

function safeDisplay(key: string): string {
  if (key === 'ENABLE_LIVE_PAYOUT') return process.env[key] ?? 'not set';
  if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
    const v = process.env[key];
    return v ? `${v.slice(0, 20)}…` : 'not set';
  }
  if (key === 'NEXT_PUBLIC_PRIVY_APP_ID') {
    const v = process.env[key];
    return v ? `${v.slice(0, 8)}…` : 'not set';
  }
  if (key === 'GASCOIN_TREASURY_WALLET') {
    const v = process.env[key];
    return v ? `${v.slice(0, 6)}…${v.slice(-6)}` : 'not set';
  }
  return envPresent(key) ? '••••••••' : 'not set';
}

export default async function SettingsPage() {
  const session = await verifyAdminSession();
  if (!session.valid) redirect('/admin/login');

  const referralEntries = Object.entries(REFERRAL_CONFIG) as [string, unknown][];

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32, borderBottom: '1px solid rgba(var(--fg-rgb),0.08)', paddingBottom: 24 }}>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(var(--fg-rgb),0.3)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8 }}>
          ADMIN / SYSTEM
        </div>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 32, letterSpacing: '0.05em' }}>
          SETTINGS
        </div>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'rgba(var(--fg-rgb),0.3)', marginTop: 8 }}>
          Read-only. Environment variable values are never shown — only presence is checked.
        </div>
      </div>

      {/* REFERRAL_CONFIG */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(var(--fg-rgb),0.3)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 16 }}>
          REFERRAL CONFIG
        </div>
        <div style={{ border: '1px solid rgba(var(--fg-rgb),0.08)' }}>
          {referralEntries.map(([key, value], i) => (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '14px 20px',
                borderBottom: i < referralEntries.length - 1 ? '1px solid rgba(var(--fg-rgb),0.06)' : 'none',
                gap: 24,
              }}
            >
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'rgba(var(--fg-rgb),0.45)', minWidth: 280 }}>
                {key}
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'var(--fg)' }}>
                {String(value)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* GATES list */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(var(--fg-rgb),0.3)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 16 }}>
          GATES ({GATES.length} configured)
        </div>
        <div className="lb-table-wrap" style={{ marginTop: 0 }}>
          <table className="lb-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>SLUG</th>
                <th>NAME</th>
                <th>CATEGORY</th>
                <th>BLOCKING</th>
                <th>EST. TIME</th>
              </tr>
            </thead>
            <tbody>
              {GATES.map((gate) => (
                <tr key={gate.slug} className="lb-table-row">
                  <td className="lb-table-rank" style={{ fontSize: 16 }}>{gate.id}</td>
                  <td className="lb-table-wallet" style={{ fontSize: 11 }}>{gate.slug}</td>
                  <td className="lb-table-wallet" style={{ fontSize: 12 }}>{gate.name}</td>
                  <td className="lb-table-time">{gate.category}</td>
                  <td className="lb-table-time">
                    {gate.is_blocking ? (
                      <span style={{ color: 'rgba(255,80,80,0.8)' }}>YES</span>
                    ) : (
                      <span style={{ color: 'rgba(var(--fg-rgb),0.3)' }}>NO</span>
                    )}
                  </td>
                  <td className="lb-table-time">{gate.estimated_time_seconds}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Environment variable presence check */}
      <section>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: 'rgba(var(--fg-rgb),0.3)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 16 }}>
          ENVIRONMENT VARIABLES
        </div>
        <div style={{ border: '1px solid rgba(var(--fg-rgb),0.08)' }}>
          {ENV_KEYS.map((key, i) => {
            const present = envPresent(key);
            return (
              <div
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 20px',
                  borderBottom: i < ENV_KEYS.length - 1 ? '1px solid rgba(var(--fg-rgb),0.06)' : 'none',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: present ? 'rgba(100,220,120,0.8)' : 'rgba(255,80,80,0.7)',
                  }}
                />
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'rgba(var(--fg-rgb),0.5)', minWidth: 280 }}>
                  {key}
                </div>
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: present ? 'rgba(var(--fg-rgb),0.35)' : 'rgba(255,80,80,0.6)' }}>
                  {safeDisplay(key)}
                </div>
                {!present && (
                  <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'rgba(255,80,80,0.5)', marginLeft: 'auto', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    MISSING
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
