'use client';

import { useState } from 'react';
import { GATE_COUNT } from '../../lib/policy';

// Gate numerals that should stay hardcoded because they're *specific*
// references (gate 17 is non-blocking GASCOIN hold; gate 18 is the
// fraud-risk acceptable gate added 2026-04-21). Anything that counts
// "all gates" pulls from GATE_COUNT so future additions auto-update.
const FAQS = [
  {
    q: 'What happens if my submission fails a gate?',
    a: `The system stops at the first blocking gate failure and returns a report specifying exactly which gate failed and why. Gates 1–16 and Gate 18 are blocking — a failure on any of them rejects the claim or routes it to manual review. Gate 17 (GASCOIN Token Hold) is non-blocking: it determines your tier but does not reject your submission.`,
  },
  {
    q: 'Can I resubmit after a failure?',
    a: `Yes. Identity failures (Gates 1–5: verification, following, cooldown, followers, account quality) require fixing your X account or waiting out your cooldown. Tweet failures (Gates 6–8: hashtag, @GasCoinApp tag, tweet live) require posting a corrected tweet. Receipt failures (Gates 9–15: receipt hashtag, wallet characters, duplicate check, AI detection, tamper check, minimum amount, receipt date) require a new receipt photo. Gate 16 (Amount Verified) requires re-entering the exact figure from your receipt. Gate 18 (Fraud Risk Acceptable) fails if our fraud pipeline flags the image as not-a-real-receipt — upload a genuine camera photo of a physical paper receipt.`,
  },
  {
    q: 'How long does gate processing take?',
    a: `Most submissions complete all ${GATE_COUNT} gates within 2–5 minutes. Receipt OCR (Gates 9 and 10) takes the longest — up to 45 seconds each. Once all gates pass, ETH is dispatched within 2–6 hours. The 48-hour figure is the hard maximum.`,
  },
  {
    q: 'Can I check my submission status while gates are processing?',
    a: `Yes — use the Wallet Tracker at /wallet to see real-time gate progress. Each of the ${GATE_COUNT} gates flips from pending to passed or failed as it completes.`,
  },
  {
    q: 'What does "non-blocking" mean for Gate 17?',
    a: 'Gate 17 checks your GASCOIN token balance to determine your tier (Standard, Commuter, Road Warrior, or Fleet). If your balance is below the Standard minimum of 1 token, the gate logs it but does not reject your claim — it is informational only in Season 1.',
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
