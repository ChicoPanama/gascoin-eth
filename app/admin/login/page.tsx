'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WalletButton } from '../../../components/ui/WalletButton';
import { useGascoinWallet } from '../../../hooks/useGascoinWallet';
import { createAdminSession } from '../../actions/admin-auth';

export default function AdminLoginPage() {
  const { publicKey, connected, signMessage } = useGascoinWallet();
  const [status, setStatus] = useState<'idle' | 'signing' | 'error'>('idle');
  const [error, setError] = useState('');
  const router = useRouter();

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
        router.push('/admin/submissions');
      } else {
        setStatus('error');
        setError(result.error || 'Authentication failed');
      }
    } catch (e: any) {
      setStatus('error');
      setError(e?.message || 'Signing failed');
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

        {!connected ? (
          <>
            <div className="wt-input-label" style={{ marginBottom: 16 }}>CONNECT AUTHORIZED WALLET</div>
            <WalletButton />
          </>
        ) : status === 'error' ? (
          <>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
              {error || 'ACCESS DENIED — This wallet is not authorized.'}
            </div>
            <WalletButton />
          </>
        ) : (
          <>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
              Wallet: {publicKey?.toBase58().slice(0, 8)}...
            </div>
            <button type="button" className="sf-btn-solid" style={{ width: '100%' }} onClick={handleSign} disabled={status === 'signing'}>
              {status === 'signing' ? 'AUTHENTICATING...' : 'SIGN TO AUTHENTICATE'}
            </button>
          </>
        )}

        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 24 }}>
          Session expires in 8 hours
        </div>
      </div>
    </div>
  );
}
