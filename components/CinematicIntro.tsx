'use client';

import { useState, useEffect } from 'react';

export function CinematicIntro() {
  const [phase, setPhase] = useState<'playing' | 'exit' | 'gone'>('playing');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('exit'), 3200);
    const t2 = setTimeout(() => setPhase('gone'), 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div className={`gc-intro${phase === 'exit' ? ' gc-intro--exit' : ''}`}>
      <div className="gc-intro-grid" />
      <div className="gc-intro-scanlines" />
      <div className="gc-intro-title">GASCOIN</div>
      <div className="gc-intro-subtitle">Community Gas Refunds — Solana</div>
      <div className="gc-intro-flash" />
      <div className="gc-intro-bar">
        <div className="gc-intro-bar-fill" />
      </div>
    </div>
  );
}

export function SiteReveal({ children }: { children: React.ReactNode }) {
  // Content is always visible — intro overlays on top with z-index
  return <>{children}</>;
}
