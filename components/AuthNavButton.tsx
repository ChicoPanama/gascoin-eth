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

function truncateWallet(key: string) {
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

function readProfilePicture(user: any): string {
  if (user?.twitter?.profilePictureUrl) return String(user.twitter.profilePictureUrl);
  const linked = Array.isArray(user?.linkedAccounts) ? user.linkedAccounts : [];
  const tw = linked.find((a: any) => String(a?.type || '').includes('twitter'));
  return String(tw?.profilePictureUrl || tw?.profile_picture_url || '');
}

export function AuthNavButton() {
  const { ready, authenticated, login, logout, user, getAccessToken } = usePrivy();
  const { publicKey, connected } = useWallet();
  const linkedRef = useRef(false);

  const handle = readHandle(user as any);
  const xUserId = readXUserId(user as any);

  // Reset link lock when wallet address changes (user switches wallet)
  const lastLinkedWallet = useRef<string | null>(null);

  // Auto-link wallet ↔ X handle when both are connected
  useEffect(() => {
    if (!authenticated || !connected || !publicKey || !handle) return;

    const wallet = publicKey.toBase58();

    // Skip if already linked this exact wallet+handle combo
    if (linkedRef.current && lastLinkedWallet.current === wallet) return;

    linkedRef.current = true;
    lastLinkedWallet.current = wallet;

    // Send Privy access token for server-side auth verification
    getAccessToken().then((token) => {
      fetch('/api/link-x', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          'x-privy-user-id': xUserId,
          'x-privy-handle': handle,
          'x-privy-wallet': wallet,
        },
        body: JSON.stringify({ wallet, x_handle: handle, x_user_id: xUserId, profile_image_url: readProfilePicture(user) }),
      }).catch(() => {
        linkedRef.current = false;
        lastLinkedWallet.current = null;
      });
    }).catch(() => {
      linkedRef.current = false;
      lastLinkedWallet.current = null;
    });
  }, [authenticated, connected, publicKey, handle, xUserId, getAccessToken]);

  // Loading — show placeholder so button never vanishes
  if (!ready) {
    return (
      <button className="btn" type="button" disabled style={{ opacity: 0.4 }}>
        Loading...
      </button>
    );
  }

  // Not signed in — show sign-in button
  if (!authenticated) {
    return (
      <button className="btn" type="button" onClick={() => login({ loginMethods: ['twitter'] })}>
        Sign in with X
      </button>
    );
  }

  // Signed in — show unified identity
  const walletAddr = connected && publicKey ? truncateWallet(publicKey.toBase58()) : null;

  return (
    <div className="auth-signed-in" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {walletAddr && handle ? (
        <span className="auth-identity">
          <span className="auth-handle">@{handle}</span>
          <span className="auth-wallet">{walletAddr}</span>
        </span>
      ) : handle ? (
        <span className="auth-handle-solo">@{handle}</span>
      ) : (
        <span className="auth-handle-solo">Signed in</span>
      )}
      <button className="btn" type="button" onClick={logout}>Logout</button>
    </div>
  );
}
