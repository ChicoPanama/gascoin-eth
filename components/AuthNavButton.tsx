'use client';

import { usePrivy } from '@privy-io/react-auth';

function readHandle(user: any): string {
  if (user?.twitter?.username) return String(user.twitter.username).replace(/^@/, '');
  const linked = Array.isArray(user?.linkedAccounts) ? user.linkedAccounts : [];
  const tw = linked.find((a: any) => String(a?.type || '').includes('twitter'));
  return String(tw?.username || '').replace(/^@/, '');
}

export function AuthNavButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  // Render nothing while loading
  if (!ready) return null;

  if (!authenticated) {
    return (
      <button className="btn" type="button" onClick={() => login({ loginMethods: ['twitter'] })}>
        Sign in with X
      </button>
    );
  }

  const handle = readHandle(user as any);

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 12, opacity: 0.9 }}>
        {handle ? `@${handle}` : 'Signed in'}
      </span>
      <button className="btn" type="button" onClick={logout}>Logout</button>
    </div>
  );
}
