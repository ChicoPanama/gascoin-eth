import Link from 'next/link';
import type { CSSProperties } from 'react';

export default function DocsIndex() {
  return (
    <article style={{ maxWidth: 980, margin: '0 auto', padding: '24px 24px 48px' }}>
      <h1 style={{ fontSize: 34, marginBottom: 10 }}>GASCOIN Documentation</h1>
      <p style={{ opacity: 0.9, marginBottom: 24 }}>
        Choose your path: quick onboarding for new users, or deep technical architecture for builders and reviewers.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 24 }}>
        <Link href="/docs/core-concept-in-plain-english" style={cardStyle}>
          <strong>New Here</strong>
          <span>Start with the plain-English flow and first submission steps.</span>
        </Link>
        <Link href="/docs/the-submission-process-complete-step-by-step-guide" style={cardStyle}>
          <strong>Submit a Claim</strong>
          <span>Follow the end-to-end submission process and gate progress flow.</span>
        </Link>
        <Link href="/docs/end-to-end-architecture-map" style={cardStyle}>
          <strong>Technical Architecture</strong>
          <span>Open the full AI, gate, retry, and payout pipeline map.</span>
        </Link>
      </div>

      <h2 style={{ fontSize: 20, marginBottom: 8 }}>Core References</h2>
      <ul style={{ lineHeight: 1.9 }}>
        <li><Link href="/docs/the-10-verification-gates-complete-reference">10 Verification Gates Reference</Link></li>
        <li><Link href="/docs/ai-system-overview">AI System Overview (Flow Paths)</Link></li>
        <li><Link href="/docs/ai-engine-architecture">AI Engine Architecture &amp; Cost Defense</Link></li>
        <li><Link href="/docs/memory-intelligence">Memory Intelligence (mem0 Pro)</Link></li>
        <li><Link href="/docs/receipt-intelligence-pipeline">Receipt Intelligence Pipeline</Link></li>
        <li><Link href="/docs/gate-decision-and-retry-paths">Gate Decision and Retry Paths</Link></li>
        <li><Link href="/docs/support-and-contact">Support and Contact</Link></li>
      </ul>
    </article>
  );
}

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '14px 16px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.03)',
  color: 'inherit',
  textDecoration: 'none',
};
