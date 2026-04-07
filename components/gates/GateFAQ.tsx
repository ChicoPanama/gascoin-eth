'use client';

import { useState } from 'react';

const FAQS = [
  {
    q: 'What happens if my submission fails gate 5 but passes gates 1-4?',
    a: 'The system stops at the first blocking gate failure. Gates 6-10 are not checked. You receive a failure report specifying exactly which gate failed and why. You may resubmit after correcting the issue — your tweet and prior gates do not need to be redone, only the receipt.',
  },
  {
    q: 'Can I resubmit after a failure?',
    a: 'Yes, for most gates. Receipt-related failures (gates 5, 6, 7, 9) require a new receipt photo. Wallet failures (gate 8) require waiting out the 30-day cooldown. Tweet failures (gates 1-4) may require a new tweet. Gate 10 failures do not require any action — your submission is queued automatically.',
  },
  {
    q: 'How long does processing take?',
    a: 'Most submissions complete within 2-5 minutes. Gate 5 (OCR wallet reading) takes the longest at up to 45 seconds. Gate 10 (treasury check) is instant but SOL dispatch may take up to 48 hours to settle on-chain.',
  },
  {
    q: 'Can I check my submission status while gates are processing?',
    a: 'Yes — use the Wallet Tracker at /wallet to see real-time gate progress for your submission. Each gate flips from pending to passed or failed as it completes.',
  },
  {
    q: 'What does "non-blocking" mean for Gate 10?',
    a: 'If Gate 10 fails, your submission is not rejected. It enters a priority queue and is retried automatically every 6 hours until the treasury has sufficient balance. You do not need to resubmit.',
  },
  {
    q: 'Are the pass rates on this page real?',
    a: 'Yes. Every percentage shown is calculated live from the actual gate_results table in the GASCOIN database. They update in real time as new submissions are processed.',
  },
];

export function GateFAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="gt-faq-section">
      <div className="gt-faq-header">
        <div className="gc-section-num">08 — Frequently Asked</div>
        <h2 className="gt-faq-title">Questions</h2>
      </div>
      <div className="gt-faq-list">
        {FAQS.map((faq, i) => (
          <div key={i} className={`gt-faq-item${open === i ? ' gt-faq-item--open' : ''}`}>
            <button
              type="button"
              className="gt-faq-question"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <span>{faq.q}</span>
              <span className="gt-faq-toggle">{open === i ? '−' : '+'}</span>
            </button>
            {open === i && (
              <div className="gt-faq-answer">{faq.a}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
