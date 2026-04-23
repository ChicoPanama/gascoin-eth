import Link from 'next/link';

export function GlobalFooter() {
  return (
    <footer className="gc-footer">
      <div className="gc-footer-brand">GASCOIN</div>
      <div className="gc-footer-links">
        <Link href="/docs">Docs</Link>
        <Link href="/gates">Verification</Link>
        <Link href="/leaderboard?view=recent">Community</Link>
        <a href="https://x.com/search?q=%23gascoin" target="_blank" rel="noopener noreferrer">X / Twitter</a>
      </div>
      <div className="gc-footer-copy">&copy; 2026 GASCOIN. All rights reserved.</div>
    </footer>
  );
}
