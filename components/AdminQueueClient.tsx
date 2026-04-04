'use client';

import React, { useMemo, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

type QueueRow = {
  id: string;
  xHandle: string;
  tweetUrl: string;
  wallet: string;
  riskScore: number;
  decision: string;
};

function readWallet(user: any): string {
  const direct = user?.wallet?.address;
  if (direct) return direct;
  const linked = Array.isArray(user?.linkedAccounts) ? user.linkedAccounts : [];
  const wallet = linked.find((a: any) => a?.type === 'wallet' && a?.address);
  return wallet?.address || '';
}

function readHandle(user: any): string {
  if (user?.twitter?.username) return String(user.twitter.username);
  const linked = Array.isArray(user?.linkedAccounts) ? user.linkedAccounts : [];
  const tw = linked.find((a: any) => String(a?.type || '').includes('twitter'));
  return String(tw?.username || '').replace(/^@/, '');
}

function AdminQueueInner({ initialRows }: { initialRows: QueueRow[] }) {
  const { ready, authenticated, login, getAccessToken, user } = usePrivy();
  const [rows, setRows] = useState<QueueRow[]>(initialRows || []);
  const [busy, setBusy] = useState<string>('');
  const [error, setError] = useState('');

  const hints = useMemo(() => ({
    userId: String((user as any)?.id || ''),
    handle: readHandle(user),
    wallet: readWallet(user)
  }), [user]);

  async function runAction(id: string, action: 'approve' | 'reject' | 'ban') {
    setError('');
    if (!authenticated) {
      login();
      return;
    }
    setBusy(`${id}:${action}`);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/claims/${id}/review`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(hints.userId ? { 'x-privy-user-id': hints.userId } : {}),
          ...(hints.handle ? { 'x-privy-handle': hints.handle } : {}),
          ...(hints.wallet ? { 'x-privy-wallet': hints.wallet } : {})
        },
        body: JSON.stringify({
          action,
          reason: action === 'approve' ? 'approved_by_reviewer' : action === 'reject' ? 'rejected_by_reviewer' : 'banned_for_fraud',
          actorId: 'admin_ui'
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || `review_${action}_failed`);
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, decision: json?.status || r.decision } : r)));
    } catch (e: any) {
      setError(e?.message || 'review_action_failed');
    } finally {
      setBusy('');
    }
  }

  if (!ready) return <p>Loading admin auth…</p>;

  return (
    <>
      {!authenticated ? (
        <div className="card" style={{ marginBottom: 12 }}>
          <p>Reviewer login required. Use the top-right <strong>Sign in</strong> button.</p>
        </div>
      ) : null}

      <table className="table">
        <thead>
          <tr><th>ID</th><th>X</th><th>Tweet</th><th>Wallet</th><th>Risk</th><th>Decision</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.xHandle}</td>
              <td><a href={c.tweetUrl} target="_blank">link</a></td>
              <td>{c.wallet}</td>
              <td>{c.riskScore}</td>
              <td>{c.decision}</td>
              <td>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn" type="button" onClick={() => runAction(c.id, 'approve')} disabled={!!busy}>{busy === `${c.id}:approve` ? 'Approving…' : 'Approve'}</button>
                  <button className="btn" type="button" onClick={() => runAction(c.id, 'reject')} disabled={!!busy}>{busy === `${c.id}:reject` ? 'Rejecting…' : 'Reject'}</button>
                  <button className="btn" type="button" onClick={() => runAction(c.id, 'ban')} disabled={!!busy}>{busy === `${c.id}:ban` ? 'Banning…' : 'Ban'}</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {error ? <p style={{ color: 'crimson' }}>Error: {error}</p> : null}
    </>
  );
}

export function AdminQueueClient({ initialRows }: { initialRows: QueueRow[] }) {
  return <AdminQueueInner initialRows={initialRows} />;
}
