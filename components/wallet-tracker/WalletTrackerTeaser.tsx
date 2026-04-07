'use client';

import Link from 'next/link';

export function WalletTrackerTeaser() {
  // Static gate progress mockup — no data fetch
  const mockGates = [
    { name: 'Tweet Detected', status: 'passed' },
    { name: 'Tweet Public', status: 'passed' },
    { name: '#gascoin Hashtag', status: 'passed' },
    { name: 'Tweet Age', status: 'processing' },
    { name: 'Wallet on Receipt', status: 'pending' },
  ];

  return (
    <section className="wt-teaser">
      <div className="wt-teaser-inner">
        <div className="wt-teaser-left">
          <div className="gc-section-num">06 — Your Status</div>
          <h2 className="wt-teaser-title">
            <span>Track Your</span>
            <span className="wt-teaser-ghost">Submission.</span>
          </h2>
          <p className="wt-teaser-sub">
            Real-time gate progress, cooldown countdown, and full payout
            history — all in one place.
          </p>
          <Link href="/wallet" className="gc-teaser-link">Open Wallet Tracker</Link>
        </div>
        <div className="wt-teaser-right">
          <div className="wt-teaser-gates">
            {mockGates.map((g, i) => (
              <div key={i} className={`wt-teaser-gate wt-teaser-gate--${g.status}`}>
                <span className={`wt-gate-icon wt-gate-icon--${g.status}`}>
                  {g.status === 'passed' ? '●' : g.status === 'processing' ? '◌' : '○'}
                </span>
                <span>{g.name}</span>
              </div>
            ))}
          </div>
          <div className="wt-teaser-processing">Gate 4 of 10 · Processing</div>
        </div>
      </div>
    </section>
  );
}
