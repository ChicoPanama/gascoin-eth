'use client';

export default function WalletError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container" style={{ paddingTop: 80, textAlign: 'center' }}>
      <h2 style={{ fontFamily: 'Bebas Neue', fontSize: 48, marginBottom: 16 }}>TRACKER UNAVAILABLE</h2>
      <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>{error.message || 'Failed to load wallet data.'}</p>
      <button type="button" className="sf-btn-solid" onClick={reset}>Retry</button>
    </div>
  );
}
