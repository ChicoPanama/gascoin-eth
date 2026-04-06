'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { WalletButton } from '../../../components/ui/WalletButton';
import { useGascoinWallet } from '../../../hooks/useGascoinWallet';
import { createAdminSession, createAdminSessionViaPrivy } from '../../actions/admin-auth';

function readXUserId(user: any): string {
  // Try Privy user ID first (matches admin_users.x_user_id = "did:privy:...")
  if (user?.id) return String(user.id);
  if (user?.twitter?.subject) return String(user.twitter.subject);
  const linked = Array.isArray(user?.linkedAccounts) ? user.linkedAccounts : [];
  const tw = linked.find((a: any) => String(a?.type || '').includes('twitter'));
  return String(tw?.subject || tw?.userId || '');
}

function readXHandle(user: any): string {
  if (user?.twitter?.username) return String(user.twitter.username).replace(/^@/, '');
  const linked = Array.isArray(user?.linkedAccounts) ? user.linkedAccounts : [];
  const tw = linked.find((a: any) => String(a?.type || '').includes('twitter'));
  return String(tw?.username || '').replace(/^@/, '');
}

export default function AdminLoginPage() {
  const { publicKey, connected, signMessage } = useGascoinWallet();
  const { ready, authenticated, login, user } = usePrivy();
  const [status, setStatus] = useState<'idle' | 'signing' | 'error'>('idle');
  const [error, setError] = useState('');
  const router = useRouter();

  const xHandle = readXHandle(user);
  const xUserId = readXUserId(user);

  // DEBUG: Log Privy user object to console so we can see its structure
  useEffect(() => {
    if (user) {
      console.log('[ADMIN DEBUG] Privy user object:', JSON.stringify(user, null, 2));
      console.log('[ADMIN DEBUG] xUserId:', xUserId);
      console.log('[ADMIN DEBUG] xHandle:', xHandle);
      console.log('[ADMIN DEBUG] authenticated:', authenticated);
    }
  }, [user, xUserId, xHandle, authenticated]);

  // Wallet-based admin login
  const handleSign = async () => {
    if (!publicKey || !signMessage) return;
    setStatus('signing');
    setError('');

    try {
      const timestamp = Date.now();
      const message = `GASCOIN_ADMIN_AUTH:${timestamp}:${publicKey.toBase58()}`;
      const encoded = new TextEncoder().encode(message);
      await signMessage(encoded);

      const result = await createAdminSession(publicKey.toBase58(), timestamp);
      if (result.success) {
        window.location.href = '/admin/submissions';
      } else {
        setStatus('error');
        setError(result.error || 'Wallet not authorized');
      }
    } catch (e: any) {
      setStatus('error');
      setError(e?.message || 'Signing failed');
    }
  };

  // Privy (X login) admin login
  const handlePrivyLogin = async () => {
    if (!xUserId || !xHandle) {
      setStatus('error');
      setError(`Identity not found. userId=${xUserId || 'empty'}, handle=${xHandle || 'empty'}. Try logging out and back in.`);
      return;
    }
    setStatus('signing');
    setError('');

    try {
      const result = await createAdminSessionViaPrivy(xUserId, xHandle);
      if (result.success) {
        // Full page reload ensures cookie is picked up by Server Components
        window.location.href = '/admin/submissions';
      } else {
        setStatus('error');
        setError(result.error || 'X account not authorized as admin');
      }
    } catch (e: any) {
      setStatus('error');
      setError(e?.message || 'Authentication failed');
    }
  };

  return (
    <div className="admin-login">
      <div className="admin-login-panel">
        <div className="admin-login-header">
          <span className="admin-sidebar-brand">GASCOIN</span>
          <span className="admin-sidebar-label" style={{ marginLeft: 12 }}>ADMIN ACCESS</span>
        </div>
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', margin: '24px 0' }} />

        {/* Option 1: Privy / X Login */}
        <div className="wt-input-label" style={{ marginBottom: 12 }}>SIGN IN WITH X</div>
        {!ready ? (
          <button type="button" className="sf-btn-solid" style={{ width: '100%', opacity: 0.4 }} disabled>Loading...</button>
        ) : authenticated && xHandle ? (
          <button type="button" className="sf-btn-solid" style={{ width: '100%' }} onClick={handlePrivyLogin} disabled={status === 'signing'}>
            {status === 'signing' ? 'AUTHENTICATING...' : 'AUTHENTICATE VIA X'}
          </button>
        ) : (
          <button type="button" className="sf-btn-solid" style={{ width: '100%' }} onClick={() => login({ loginMethods: ['twitter'] })}>
            SIGN IN WITH X
          </button>
        )}

        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', margin: '24px 0', position: 'relative' }}>
          <span style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', background: '#0a0a0a', padding: '0 12px', fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>OR</span>
        </div>

        {/* Option 2: Wallet Login */}
        <div className="wt-input-label" style={{ marginBottom: 12 }}>CONNECT AUTHORIZED WALLET</div>
        {!connected ? (
          <WalletButton />
        ) : (
          <>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
              Wallet: {publicKey?.toBase58().slice(0, 8)}...
            </div>
            <button type="button" className="sf-btn-ghost" style={{ width: '100%' }} onClick={handleSign} disabled={status === 'signing'}>
              {status === 'signing' ? 'AUTHENTICATING...' : 'SIGN TO AUTHENTICATE'}
            </button>
          </>
        )}

        {status === 'error' && (
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: '#ff6b6b', marginTop: 16 }}>
            {error}
          </div>
        )}

        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 24 }}>
          Session expires in 8 hours
        </div>
      </div>
    </div>
  );
}
