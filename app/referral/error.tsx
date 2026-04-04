'use client';

export default function ReferralError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container" style={{ paddingTop: 80, textAlign: 'center' }}>
      <h2 style={{ fontFamily: 'Bebas Neue', fontSize: 48, marginBottom: 16 }}>REFERRAL UNAVAILABLE</h2>
      <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>{error.message || 'Failed to load referral data.'}</p>
      <button type="button" className="sf-btn-solid" onClick={reset}>Retry</button>
    </div>
  );
}
