import Link from 'next/link';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { feeMath, getVerifierAddress, isMarketplaceLive } from '../../../lib/marketplace';
import { truncateWallet } from '../../../lib/creator-profile';

export const dynamic = 'force-dynamic';

interface BriefRow {
  id: number;
  onchain_id: number | null;
  brand_wallet: string;
  title: string;
  amount_usdc: number;
  threshold: number;
  deadline: string;
  status: string;
  created_at: string;
}

interface PaymentRow {
  brief_id: number;
  kind: string;
  amount_usdc: number | null;
  recipient_wallet: string | null;
  tx_hash: string | null;
  created_at: string;
}

export default async function AdminMarketplacePage() {
  let briefs: BriefRow[] = [];
  let payments: PaymentRow[] = [];
  try {
    const supabase = getSupabaseAdmin();
    const [briefsRes, paymentsRes] = await Promise.all([
      supabase
        .from('briefs')
        .select('id, onchain_id, brand_wallet, title, amount_usdc, threshold, deadline, status, created_at')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('payments')
        .select('brief_id, kind, amount_usdc, recipient_wallet, tx_hash, created_at')
        .order('created_at', { ascending: false })
        .limit(200),
    ]);
    briefs = (briefsRes.data || []) as BriefRow[];
    payments = (paymentsRes.data || []) as PaymentRow[];
  } catch {
    /* empty */
  }

  const verifier = getVerifierAddress();

  return (
    <div className="gc-admin">
      <header className="gc-admin-header">
        <h1>Marketplace</h1>
        <p className="gc-admin-sub">
          Status:{' '}
          <strong>{isMarketplaceLive() ? 'LIVE' : 'COMING SOON (feature-flagged)'}</strong>{' '}
          · Verifier:{' '}
          <code className="mono">
            {verifier ? truncateWallet(verifier) : 'NOT CONFIGURED'}
          </code>
        </p>
        <p className="gc-admin-sub" style={{ fontSize: 12, marginTop: 8 }}>
          Fees (per brief): 3% brand + 3% creator · split 50/50 treasury/ops.
          Example on 500 USDC brief: brand pays {feeMath(500).brandTotal.toFixed(2)}, creator receives {feeMath(500).creatorPayout.toFixed(2)}, protocol nets {(feeMath(500).treasuryTotal + feeMath(500).opsTotal).toFixed(2)}.
        </p>
      </header>

      <section style={{ marginBottom: 40 }}>
        <h2>Briefs</h2>
        <table className="gc-admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>On-chain</th>
              <th>Title</th>
              <th>Brand</th>
              <th className="num">Amount</th>
              <th className="num">Threshold</th>
              <th>Deadline</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {briefs.length === 0 ? (
              <tr>
                <td colSpan={8} className="gc-admin-empty">No briefs yet.</td>
              </tr>
            ) : (
              briefs.map((b) => (
                <tr key={b.id}>
                  <td>{b.id}</td>
                  <td>{b.onchain_id ?? '—'}</td>
                  <td>{b.title}</td>
                  <td className="mono">{truncateWallet(b.brand_wallet)}</td>
                  <td className="num">{Number(b.amount_usdc).toLocaleString()} USDC</td>
                  <td className="num">{(Number(b.threshold) / 100).toFixed(1)}</td>
                  <td>{new Date(b.deadline).toLocaleDateString()}</td>
                  <td>{b.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Payments</h2>
        <table className="gc-admin-table">
          <thead>
            <tr>
              <th>Brief</th>
              <th>Kind</th>
              <th className="num">Amount</th>
              <th>Recipient</th>
              <th>Tx</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="gc-admin-empty">No payments yet.</td>
              </tr>
            ) : (
              payments.map((p, i) => (
                <tr key={i}>
                  <td>{p.brief_id}</td>
                  <td>{p.kind}</td>
                  <td className="num">
                    {p.amount_usdc != null ? `${Number(p.amount_usdc).toLocaleString()} USDC` : '—'}
                  </td>
                  <td className="mono">
                    {p.recipient_wallet ? truncateWallet(p.recipient_wallet) : '—'}
                  </td>
                  <td className="mono">
                    {p.tx_hash ? (
                      <a
                        href={`https://etherscan.io/tx/${p.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {p.tx_hash.slice(0, 10)}…
                      </a>
                    ) : (
                      <em style={{ opacity: 0.6 }}>attestation pending</em>
                    )}
                  </td>
                  <td>{new Date(p.created_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <p className="gc-admin-sub" style={{ marginTop: 24, fontSize: 12 }}>
        <Link href="/admin/attribution">← Attribution</Link>
      </p>
    </div>
  );
}
