'use client';

import React, { FormEvent, useMemo, useState } from 'react';
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
        setError(json?.error || 'submit_failed');
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

  if (!ready) return <p>Loading login…</p>;

  return (
    <>
      {!authenticated ? (
        <div className="card" style={{ marginBottom: 12 }}>
          <p>Login required. Use the top-right <strong>Sign in</strong> button.</p>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 12 }}>
          <p>Logged in{handle ? ` as @${handle}` : ''}.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" type="button" onClick={syncProfile} disabled={syncing}>
              {syncing ? 'Syncing…' : 'Sync profile'}
            </button>
            <button className="btn" type="button" onClick={logout}>Logout</button>
          </div>
        </div>
      )}

      <form className="grid" onSubmit={onSubmit} encType="multipart/form-data">
        <label>Tweet URL<input name="tweetUrl" required /></label>
        <label>Connected Wallet<input name="wallet" required defaultValue={wallet} /></label>
        <label>Wallet written on receipt<input name="walletOnReceipt" required /></label>
        <label>Claimed USD Amount<input name="amountUsd" type="number" step="0.01" required /></label>
        <label>Receipt Image<input name="receipt" type="file" required /></label>
        <button className="btn" type="submit" disabled={submitting || !authenticated}>
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </form>

      {error ? <p style={{ color: 'crimson' }}>Error: {error}</p> : null}
      {okText ? <p style={{ color: 'green' }}>{okText}</p> : null}
    </>
  );
}

export function PrivySubmit() {
  return <PrivySubmitForm />;
}
