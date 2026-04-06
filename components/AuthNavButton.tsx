'use client';

import { useEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@solana/wallet-adapter-react';

function readHandle(user: any): string {
  if (user?.twitter?.username) return String(user.twitter.username).replace(/^@/, '');
  const linked = Array.isArray(user?.linkedAccounts) ? user.linkedAccounts : [];
  const tw = linked.find((a: any) => String(a?.type || '').includes('twitter'));
  return String(tw?.username || '').replace(/^@/, '');
}

function readXUserId(user: any): string {
  if (user?.twitter?.subject) return String(user.twitter.subject);
  const linked = Array.isArray(user?.linkedAccounts) ? user.linkedAccounts : [];
  const tw = linked.find((a: any) => String(a?.type || '').includes('twitter'));
  return String(tw?.subject || tw?.userId || '');
}

export function AuthNavButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { publicKey, connected } = useWallet();
  const linkedRef = useRef(false);

  const handle = readHandle(user as any);
  const xUserId = readXUserId(user as any);

  // Auto-link wallet ↔ X handle when both are connected
  useEffect(() => {
    if (!authenticated || !connected || !publicKey || !handle || linkedRef.current) return;

    const wallet = publicKey.toBase58();
    linkedRef.current = true;

    // Fire and forget — don't block UI
    fetch('/api/link-x', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, x_handle: handle, x_user_id: xUserId }),
    }).catch(() => {}); // Silent fail — link will be retried on next session
  }, [authenticated, connected, publicKey, handle, xUserId]);

  // Render nothing while loading
  if (!ready) return null;

  if (!authenticated) {
    return (
      <button className="btn" type="button" onClick={() => login({ loginMethods: ['twitter'] })}>
        Sign in with X
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 12, opacity: 0.9 }}>
        {handle ? `@${handle}` : 'Signed in'}
      </span>
      <button className="btn" type="button" onClick={logout}>Logout</button>
    </div>
  );
}
