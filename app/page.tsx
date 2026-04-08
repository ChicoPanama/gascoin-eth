'use client';

import Link from 'next/link';

const ORBIT_WORDS = ['SOLANA', 'X', 'CLAUDE', 'METEORA'];

export default function LandingPage() {
  return (
    <div className="cinematic">
      {/* Background glow */}
      <div className="cinematic-glow" />

      {/* Orbiting words */}
      <div className="cinematic-orbit">
        {ORBIT_WORDS.map((word, i) => (
          <span
            key={word}
            className="cinematic-word"
            style={{
              animationDelay: `${-(i * 18) / ORBIT_WORDS.length}s`,
            }}
          >
            {word}
          </span>
        ))}
      </div>

      {/* Center title */}
      <h1 className="cinematic-title">GASCOIN</h1>

      {/* CTA */}
      <Link href="/home" className="cinematic-enter">
        Enter the Movement
      </Link>

      {/* Tagline */}
      <p className="cinematic-tagline">
        Community Gas Refunds on Solana · Pre-Launch
      </p>
    </div>
  );
}
