import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: 'IBM Plex Mono, monospace',
    }}>
      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 120, lineHeight: 1 }}>404</div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 32, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
        Page Not Found
      </div>
      <Link href="/" style={{
        border: '1px solid rgba(255,255,255,0.2)',
        padding: '12px 32px',
        color: '#fff',
        textDecoration: 'none',
        fontSize: 12,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
      }}>
        Back to GASCOIN
      </Link>
    </div>
  );
}
