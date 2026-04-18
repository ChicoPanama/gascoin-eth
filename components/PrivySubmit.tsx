'use client';

import React, { FormEvent, useMemo, useState } from 'react';
import { getApiErrorMessage } from '../lib/gate-messages';
import { usePrivy } from '@privy-io/react-auth';

function readWallet(user: any): string {
  const direct = user?.wallet?.address;
  if (direct) return direct;
  const linked = Array.isArray(user?.linkedAccounts) ? user.linkedAccounts : [];
  const wallet = linked.find((a: any) => a?.type === 'wallet' && a?.address);
  return wallet?.address || '';
}

function PrivySubmitForm() {
  const { ready, authenticated, login, logout, getAccessToken, user } = usePrivy();
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [okText, setOkText] = useState('');
  const wallet = useMemo(() => readWallet(user), [user]);
  const handle = ((user as any)?.twitter?.username || '').toString();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setOkText('');

    if (!authenticated) {
      login();
      return;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setError('Could not get Privy access token. Please re-login.');
      return;
    }

    const form = e.currentTarget;
    const fd = new FormData(form);
    if (!fd.get('wallet') && wallet) fd.set('wallet', wallet);

    setSubmitting(true);
    try {
      const res = await fetch('/api/claims/submit', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-privy-user-id': String((user as any)?.id || ''),
          'x-privy-handle': handle,
          'x-privy-wallet': wallet
        },
        body: fd
      });
      const json = await res.json();
      if (!res.ok) {
        setError(getApiErrorMessage(json?.error || 'submit_failed'));
        return;
      }
      setOkText(`Submitted. Claim ID: ${json?.claimId}`);
      form.reset();
    } catch (err: any) {
      setError(err?.message || 'submit_failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function syncProfile() {
    if (!authenticated) return;
    setSyncing(true);
    setError('');
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setError('Missing access token, please re-login.');
        return;
      }
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'x-privy-user-id': String((user as any)?.id || ''),
          'x-privy-handle': handle,
          'x-privy-wallet': wallet
        }
      });
      const json = await res.json();
      if (!res.ok) {
        if (json?.diagnostics) {
          setError(`${json?.error || 'sync_failed'} :: ${JSON.stringify(json.diagnostics)}`);
        } else {
          setError(json?.error || 'sync_failed');
        }
        return;
      }
      setOkText(`Profile synced for ${json?.user?.xHandle || '@user'}`);
    } catch (err: any) {
      setError(err?.message || 'sync_failed');
    } finally {
      setSyncing(false);
    }
  }

  if (!ready) return <p style={{color:'var(--muted)'}}>Loading...</p>;

  return (
    <>
      {!authenticated ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{margin:0}}>Login required. Use the top-right <strong>Sign in</strong> button.</p>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 16, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <p style={{margin:0,color:'var(--fg)'}}>Signed in{handle ? ` as @${handle}` : ''}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" type="button" onClick={syncProfile} disabled={syncing}>
              {syncing ? 'Syncing...' : 'Sync profile'}
            </button>
          </div>
        </div>
      )}

      <form className="grid" style={{gap:20}} onSubmit={onSubmit} encType="multipart/form-data">
        <div>
          <label>Tweet URL</label>
          <input name="tweetUrl" required placeholder="https://x.com/you/status/..." />
        </div>
        <div>
          <label>Connected Wallet</label>
          <input name="wallet" required defaultValue={wallet} placeholder="Your Ethereum wallet address" />
        </div>
        <div>
          <label>Last 4 of wallet on receipt</label>
          <input name="walletOnReceipt" required placeholder="Last 4 characters of your wallet (e.g. cR3P)" maxLength={4} />
        </div>
        <div>
          <label>Claimed USD Amount</label>
          <input name="amountUsd" type="number" step="0.01" required placeholder="0.00" />
        </div>
        <div>
          <label>Receipt Image</label>
          <input name="receipt" type="file" accept="image/*" required />
        </div>
        <button className="btn btn-primary" type="submit" disabled={submitting || !authenticated}>
          {submitting ? 'Submitting...' : 'Submit Claim'}
        </button>
      </form>

      {error ? <p style={{ color: 'var(--danger)', marginTop: 16 }}>Error: {error}</p> : null}
      {okText ? <p style={{ color: 'var(--success)', marginTop: 16 }}>{okText}</p> : null}
    </>
  );
}

export function PrivySubmit() {
  return <PrivySubmitForm />;
}
