'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GATES } from '../../lib/gates';

const LS_KEY = 'gascoin_preflight';

export function PreSubmissionChecklist() {
  const [checks, setChecks] = useState<boolean[]>(Array(GATES.length).fill(false));
  const [shake, setShake] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setChecks(JSON.parse(saved));
    } catch {}
  }, []);

  const toggle = (i: number) => {
    const next = checks.map((c, idx) => (idx === i ? !c : c));
    setChecks(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
  };

  const reset = () => {
    setChecks(Array(GATES.length).fill(false));
    try { localStorage.removeItem(LS_KEY); } catch {}
  };

  const done = checks.filter(Boolean).length;
  const allDone = done === GATES.length;

  const trySubmit = () => {
    if (allDone) return;
    const first = checks.findIndex((c) => !c);
    setShake(first);
    setTimeout(() => setShake(null), 500);
  };

  return (
    <div className="gt-checklist-section">
      <h2 className="gt-checklist-title">Before You Submit</h2>
      <p className="gt-checklist-sub">Check all {GATES.length} boxes before submitting. This is your pre-flight.</p>

      <div className="gt-checklist">
        {GATES.map((g, i) => (
          <label
            key={g.id}
            className={`gt-check-row${shake === i ? ' sf-shake' : ''}`}
            onClick={() => toggle(i)}
          >
            <span className={`sf-checkbox${checks[i] ? ' sf-checkbox--checked' : ''}`}>
              {checks[i] && '✓'}
            </span>
            <span className="gt-check-label">{g.checklist_label}</span>
            <span className="gt-check-ref">Gate {String(g.id).padStart(2, '0')}</span>
          </label>
        ))}
      </div>

      <div className="gt-checklist-footer">
        <div className="gt-checklist-progress">
          <span className="gt-checklist-count">
            {allDone ? '✓ Ready to submit' : `${done} / ${GATES.length} checks complete`}
          </span>
          <div className="gt-progress-track">
            <div className="gt-progress-fill" style={{ width: `${(done / GATES.length) * 100}%` }} />
          </div>
        </div>

        <div className="gt-checklist-actions">
          {allDone ? (
            <Link href="/submit" className="sf-btn-solid">Submit Receipt &rarr;</Link>
          ) : (
            <button type="button" className="sf-btn-solid" style={{ opacity: 0.3 }} onClick={trySubmit}>
              Submit Receipt
            </button>
          )}
          <button type="button" className="gt-reset" onClick={reset}>Reset</button>
        </div>
      </div>
    </div>
  );
}
