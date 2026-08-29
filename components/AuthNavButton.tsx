'use client';

import { useEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useConnection } from 'wagmi';

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

/**
 * Legacy navigation identity control.
 *
 * Privy is the source of authentication truth. Wagmi v3 only exposes the
 * currently active Privy-synchronized wallet for display/onchain actions.
 * New users are not forced through X; the configured GAS account picker offers
 * email, X and wallet entry while preserving the historical X-link sync when
 * an authenticated user actually has an X handle.
 */
export function AuthNavButton() {
  const { ready, authenticated, login, logout, user, getAccessToken } = usePrivy();
  const { address, isConnected } = useConnection();
  const linkedRef = useRef(false);

  const handle = readHandle(user as any);
  const xUserId = readXUserId(user as any);
  const lastLinkedWallet = useRef<string | null>(null);

  useEffect(() => {
    if (!authenticated || !isConnected || !address || !handle) return;

    const wallet = address;
    if (linkedRef.current && lastLinkedWallet.current === wallet) return;

    linkedRef.current = true;
    lastLinkedWallet.current = wallet;

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
        body: JSON.stringify({
          wallet,
          x_handle: handle,
          x_user_id: xUserId,
          profile_image_url: readProfilePicture(user),
        }),
      }).catch(() => {
        linkedRef.current = false;
        lastLinkedWallet.current = null;
      });
    }).catch(() => {
      linkedRef.current = false;
      lastLinkedWallet.current = null;
    });
  }, [authenticated, isConnected, address, handle, xUserId, getAccessToken, user]);

  if (!ready) {
    return (
      <button className="btn" type="button" disabled style={{ opacity: 0.4 }}>
        Loading...
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button className="btn" type="button" onClick={() => login()}>
        Enter GAS
      </button>
    );
  }

  const walletAddr = isConnected && address ? truncateWallet(address) : null;
  const identity = handle ? `@${handle}` : user?.email?.address || 'GAS account';

  return (
    <div className="auth-signed-in" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <span className="auth-identity">
        <span className="auth-handle">{identity}</span>
        {walletAddr ? <span className="auth-wallet">{walletAddr}</span> : null}
      </span>
      <button className="btn" type="button" onClick={logout}>Logout</button>
    </div>
  );
}
