'use client';

import { usePrivy } from '@privy-io/react-auth';

function short(addr?: string) {
  if (!addr) return '';
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function readWallet(user: any): string {
  if (user?.wallet?.address) return user.wallet.address;
  const linked = Array.isArray(user?.linkedAccounts) ? user.linkedAccounts : [];
  const wallet = linked.find((a: any) => a?.type === 'wallet' && a?.address);
  return wallet?.address || '';
}

function readHandle(user: any): string {
  if (user?.twitter?.username) return String(user.twitter.username).replace(/^@/, '');
  const linked = Array.isArray(user?.linkedAccounts) ? user.linkedAccounts : [];
  const tw = linked.find((a: any) => String(a?.type || '').includes('twitter'));
  return String(tw?.username || '').replace(/^@/, '');
}

export function AuthNavButton() {
  const { ready, authenticated, login, logout, user, linkWallet } = usePrivy();

  if (!ready) {
    return <button className="btn" type="button" disabled>Loading…</button>;
  }

  if (!authenticated) {
    return (
      <button className="btn" type="button" onClick={login}>
        Sign in
      </button>
    );
  }

  const handle = readHandle(user as any);
  const wallet = readWallet(user as any);

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {!wallet ? (
        <button className="btn" type="button" onClick={() => (linkWallet ? linkWallet() : login())}>
          Connect wallet
        </button>
      ) : (
        <span style={{ fontSize: 12, opacity: 0.9 }}>
          {handle ? `@${handle}` : 'Signed in'} · {short(wallet)}
        </span>
      )}
      <button className="btn" type="button" onClick={logout}>Logout</button>
    </div>
  );
}
