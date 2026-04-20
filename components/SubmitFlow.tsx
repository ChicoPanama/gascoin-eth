'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { generateReferralCodeClient } from '../lib/referral-code-client';
import { GATE_DEFS, GATE_COUNT } from '../lib/policy';
import { ViralShareCard } from './shared/ViralShareCard';
import { getGateMessage, getApiErrorMessage, type GateMessage } from '../lib/gate-messages';

// ─── Types ───
type Step = 1 | 2 | 3 | 4 | 5;
type GateStatus = 'pending' | 'processing' | 'passed' | 'failed';
type Gate = { name: string; status: GateStatus; reason?: string };

// Single source of truth: pull the canonical gate list from lib/policy.ts
// so adding/removing a gate never requires a parallel update here.
const GATE_NAMES: readonly string[] = GATE_DEFS.map((g) => g.label);

// ─── Progress Bar ───
function ProgressBar({ step, maxStep }: { step: Step; maxStep: Step }) {
  return (
    <div className="sf-progress">
      {[1, 2, 3, 4, 5].map((s) => (
        <div key={s} className="sf-progress-node-wrap">
          {s > 1 && (
            <div className={`sf-progress-line${s <= step ? ' sf-progress-line--done' : ''}`} />
          )}
          <button
            type="button"
            className={`sf-progress-node${s === step ? ' sf-progress-node--active' : ''}${s < step ? ' sf-progress-node--done' : ''}`}
            disabled={s > maxStep}
            tabIndex={-1}
          >
            {s < step ? '✓' : s}
          </button>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// STEP 1 — Connect Wallet
// ═══════════════════════════════════════════
function StepWallet({ onConnect }: {
  onConnect: (wallet: string) => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState('');
  const attempts = useRef<Record<string, number>>({});

  const connect = (provider: string) => {
    attempts.current[provider] = (attempts.current[provider] || 0) + 1;
    if (attempts.current[provider] > 1) {
      setError('This wallet has a pending submission.');
      return;
    }
    setError('');
    setLoading(provider);
    setTimeout(() => {
      const addr = 'GAs' + Math.random().toString(36).slice(2, 6) + '...' + Math.random().toString(36).slice(2, 6).toUpperCase();
      setLoading(null);
      setConnected(addr);
      setTimeout(() => onConnect(addr), 1000);
    }, 1200);
  };

  const wallets = ['MetaMask', 'Rabby', 'Rainbow', 'Coinbase Wallet'];

  return (
    <div className="sf-step">
      <h2 className="sf-headline">Connect Your Wallet</h2>
      <p className="sf-sub">We verify your wallet is not a duplicate and use it to send your ETH refund.</p>

      {connected ? (
        <div className="sf-connected">
          <span className="sf-check-badge">●</span>
          <span className="sf-connected-addr">{connected}</span>
          <span className="sf-connected-label">Connected</span>
        </div>
      ) : (
        <div className="sf-wallet-list">
          {wallets.map((w) => (
            <button
              key={w}
              type="button"
              className="sf-wallet-btn"
              onClick={() => connect(w)}
              disabled={!!loading}
            >
              {loading === w ? (
                <span className="sf-spinner" />
              ) : (
                <>
                  <span>{w}</span>
                  <span className="sf-arrow">&rarr;</span>
                </>
              )}
            </button>
          ))}
        </div>
      )}

      {error && <div className="sf-error">{error}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════
// STEP 2 — Verify Tweet
// ═══════════════════════════════════════════
function StepTweet({ onVerified, onBack, initialUrl, loggedInHandle }: {
  onVerified: (url: string, handle: string) => void;
  onBack: () => void;
  initialUrl: string;
  loggedInHandle: string;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [handle, setHandle] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [tweetText, setTweetText] = useState('');
  const [tweetAge, setTweetAge] = useState('');

  const validate = useCallback(async (value: string) => {
    try {
      const parsed = new URL(value);
      const host = parsed.hostname.replace(/^www\./, '');
      if (!['x.com', 'twitter.com'].includes(host) || !parsed.pathname.match(/^\/\w+\/status\/\d+/)) {
        throw new Error();
      }
    } catch {
      setStatus('error');
      setErrorMsg('Enter a valid X/Twitter status URL');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    setTweetText('');
    setTweetAge('');

    try {
      const res = await fetch('/api/verify/tweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweet_url: value }),
      });

      if (res.status === 429) {
        setStatus('error');
        setErrorMsg('Too many requests — please wait a moment');
        return;
      }

      const data = await res.json();

      if (!res.ok || data.error) {
        setStatus('error');
        const friendly: Record<string, string> = {
          'verification_failed': 'We couldn\'t verify this tweet. Make sure the URL is correct and the tweet is public.',
          'Invalid tweet URL format': 'This doesn\'t look like a valid tweet URL. Copy the URL directly from X.',
          'Missing tweet_url': 'Please paste a tweet URL above.',
        };
        setErrorMsg(friendly[data.error] || data.error || 'Verification failed — please try again.');
        return;
      }

      if (!data.passed) {
        setStatus('error');
        const reason = data.failure_reason || '';
        const friendly: Record<string, string> = {
          'Tweet not found — it may have been deleted': 'This tweet doesn\'t exist or was deleted. Check the URL.',
          '#gascoin hashtag not found in tweet': 'Your tweet must include #gascoin. Edit the tweet and try again.',
        };
        setErrorMsg(friendly[reason] || reason || 'Tweet did not pass verification.');
        return;
      }

      // Extract handle and metadata from gate results
      const gate2 = data.results?.find((r: any) => r.gate_id === 2);
      const gate4 = data.results?.find((r: any) => r.gate_id === 4);
      const h = gate2?.metadata?.username || value.match(/x\.com\/([^/]+)/)?.[1] || '';

      // Check that tweet author matches logged-in user
      if (loggedInHandle && h && h.toLowerCase() !== loggedInHandle.toLowerCase()) {
        setStatus('error');
        setErrorMsg(`This tweet is from @${h} — you are signed in as @${loggedInHandle}. You must submit your own tweet.`);
        return;
      }
      setHandle(h);

      const ageHours = gate4?.metadata?.tweet_age_hours;
      setTweetAge(ageHours != null ? `${ageHours}h ago` : 'recent');

      setStatus('success');
    } catch {
      setStatus('error');
      setErrorMsg('Network error — could not verify tweet');
    }
  }, []);

  const handleInput = (val: string) => {
    setUrl(val);
    setStatus('idle');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length > 10) {
      debounceRef.current = setTimeout(() => validate(val), 600);
    }
  };

  // Pre-filled tweet the user can edit before posting. Keeps the hashtag +
  // mention requirements satisfied out of the box so testers don't forget
  // them and get rejected.
  const tweetDraft = 'Just filled up and getting ETH back thanks to @GasCoinApp. Real money back on real gas. #gascoin $GASCOIN';
  const composeUrl = `https://x.com/intent/post?text=${encodeURIComponent(tweetDraft)}`;

  return (
    <div className="sf-step">
      <h2 className="sf-headline">Post a Tweet, Then Verify</h2>
      <p className="sf-sub">Two sub-steps. Post a GasCoin tweet on X first, then come back and paste the URL so we can verify it.</p>

      {/* ─── Sub-step A: compose tweet on X ─────────────────────────── */}
      <div style={{ marginTop: 20, padding: 16, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 0 }}>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
          STEP A · POST ON X
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}>
          Tweet must tag <strong>@GasCoinApp</strong> and include <strong>#gascoin</strong> or <strong>$GASCOIN</strong>. Must be public. Must be posted within the last 48 hours.
        </p>
        <a
          href={composeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="sf-btn-solid"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
        >
          <span>Compose tweet on X</span>
          <span aria-hidden>→</span>
        </a>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 10 }}>
          Opens x.com in a new tab with a draft you can edit. Post it, then copy the tweet URL.
        </div>
      </div>

      {/* ─── Sub-step B: paste the URL ──────────────────────────────── */}
      <div style={{ marginTop: 16, padding: 16, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 0 }}>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
          STEP B · PASTE TWEET URL
        </div>
        <input
          type="text"
          className={`sf-input${status === 'loading' ? ' sf-input--loading' : ''}${status === 'error' ? ' sf-input--error' : ''}`}
          placeholder="https://x.com/yourhandle/status/..."
          value={url}
          onChange={(e) => handleInput(e.target.value)}
          aria-label="Tweet URL"
        />

        {status === 'success' && (
          <div className="sf-tweet-preview">
            <div className="sf-tweet-avatar">{handle[0]?.toUpperCase() || 'G'}</div>
            <div className="sf-tweet-body">
              <div className="sf-tweet-meta">@{handle} · {tweetAge}</div>
              <div className="sf-tweet-status">✓ #gascoin / $GASCOIN detected · Public · Posted {tweetAge}</div>
            </div>
          </div>
        )}

        {status === 'error' && <div className="sf-error">{errorMsg}</div>}
        {status === 'idle' && url.length === 0 && (
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
            Paste your tweet URL above to continue.
          </div>
        )}
        {status === 'loading' && (
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
            Verifying tweet…
          </div>
        )}
      </div>

      {/* Live hint so users see why Next is grayed out */}
      {status !== 'success' && url.length > 0 && (
        <div role="status" aria-live="polite" style={{ marginTop: 12, marginBottom: -4, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
          {status === 'loading' ? 'Still verifying your tweet…' : 'Fix the issue above, then Next will unlock.'}
        </div>
      )}

      <div className="sf-nav-buttons">
        <button type="button" className="sf-btn-ghost" onClick={onBack}>&larr; Back</button>
        <button
          type="button"
          aria-disabled={status !== 'success'}
          className={`sf-btn-solid${status !== 'success' ? ' sf-btn-solid--pending' : ''}`}
          onClick={() => { if (status === 'success') onVerified(url, handle); }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// STEP 3 — Upload Receipt
// ═══════════════════════════════════════════
function StepReceipt({ onNext, onBack, initialFile }: {
  onNext: (file: File) => void;
  onBack: () => void;
  initialFile: File | null;
}) {
  const [file, setFile] = useState<File | null>(initialFile);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [checks, setChecks] = useState([false, false, false]);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // F1: Must match server validation in app/api/claims/submit/route.ts
  // Server accepts: image/jpeg, image/png, image/heic, image/heif, image/webp, application/pdf · max 15 MB
  const VALID_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'application/pdf'];
  const MAX_SIZE = 15 * 1024 * 1024;

  useEffect(() => {
    if (initialFile) {
      if (initialFile.type.startsWith('image/')) {
        setPreview(URL.createObjectURL(initialFile));
      }
    }
  }, [initialFile]);

  const handleFile = (f: File) => {
    setError('');
    if (!VALID_TYPES.includes(f.type) && !f.name.toLowerCase().endsWith('.heic') && !f.name.toLowerCase().endsWith('.heif')) {
      setError('Only JPG, PNG, HEIC, HEIF, WEBP, and PDF accepted');
      return;
    }
    if (f.size > MAX_SIZE) {
      setError('File exceeds 15MB limit');
      return;
    }
    setFile(f);
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const allChecked = checks.every(Boolean);

  const tryNext = () => {
    if (!allChecked || !file) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    onNext(file);
  };

  const toggleCheck = (i: number) => {
    setChecks((prev) => prev.map((c, idx) => (idx === i ? !c : c)));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="sf-step">
      <h2 className="sf-headline">Upload Your Receipt</h2>
      <p className="sf-sub">Photo must clearly show the total amount, date, and the last 4 hex characters of your Ethereum wallet address written on the receipt (e.g. if your address ends in <code>...a3F2</code>, write <code>a3F2</code>).</p>

      <div
        className={`sf-upload${file ? ' sf-upload--has-file' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
      >
        {file ? (
          <div className="sf-upload-preview">
            {preview && <img src={preview} alt="Receipt" className="sf-upload-thumb" />}
            <div className="sf-upload-info">
              <div className="sf-upload-name">{file.name}</div>
              <div className="sf-upload-size">{formatSize(file.size)}</div>
              <button type="button" className="sf-upload-remove" onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(''); }}>
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="sf-upload-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="0" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <span>Drag &amp; drop or click to upload</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.heic,.heif,.webp,.pdf"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>
      <div className="sf-upload-formats">Accepted: JPG, PNG, HEIC, HEIF, WEBP, PDF · Max 15MB</div>

      {error && <div className="sf-error">{error}</div>}

      <div className="sf-checklist">
        {[
          'Receipt shows total amount clearly',
          'Receipt date is visible',
          'The last 4 hex characters of my Ethereum wallet address are written on the receipt',
        ].map((label, i) => (
          <label key={i} className="sf-check-row" onClick={() => toggleCheck(i)}>
            <span className={`sf-checkbox${checks[i] ? ' sf-checkbox--checked' : ''}`}>
              {checks[i] && '✓'}
            </span>
            <span>{label}</span>
          </label>
        ))}
      </div>

      {/* Explicit hint when NEXT isn't actionable. Previously the disabled
          attribute swallowed clicks so the user saw no response and had no
          idea WHY the button was grayed out. */}
      {(!allChecked || !file) && (
        <div
          className="sf-hint"
          style={{ marginTop: 12, marginBottom: -4, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}
          role="status"
          aria-live="polite"
        >
          {!file
            ? 'Upload a receipt photo above to continue.'
            : `Confirm the ${checks.filter((c) => !c).length} remaining checklist item${checks.filter((c) => !c).length === 1 ? '' : 's'} above to continue.`}
        </div>
      )}

      <div className="sf-nav-buttons">
        <button type="button" className="sf-btn-ghost" onClick={onBack}>&larr; Back</button>
        <button
          type="button"
          aria-disabled={!allChecked || !file}
          className={`sf-btn-solid${shake ? ' sf-shake' : ''}${(!allChecked || !file) ? ' sf-btn-solid--pending' : ''}`}
          onClick={tryNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// STEP 4 — Review & Submit
// ═══════════════════════════════════════════
function StepReview({ wallet, tweetUrl, handle, file, onSubmit, onBack }: {
  wallet: string;
  tweetUrl: string;
  handle: string;
  file: File | null;
  onSubmit: () => Promise<void>;
  onBack: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  // F3: Show a "taking longer than usual" hint after 30 seconds
  const [slowHint, setSlowHint] = useState(false);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSubmit = async () => {
    setSubmitting(true);
    setSlowHint(false);
    slowTimerRef.current = setTimeout(() => setSlowHint(true), 30_000);
    try {
      await onSubmit();
    } finally {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      setSubmitting(false);
    }
  };

  // Clean up timer if the component unmounts
  useEffect(() => {
    return () => { if (slowTimerRef.current) clearTimeout(slowTimerRef.current); };
  }, []);

  const rows = [
    { label: 'Wallet', value: wallet },
    { label: 'Tweet', value: tweetUrl.length > 50 ? tweetUrl.slice(0, 50) + '...' : tweetUrl },
    { label: 'Receipt', value: file ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB` : '—' },
    { label: 'Submission Date', value: new Date().toLocaleString() },
    { label: 'Estimated Refund', value: '~0.02 ETH' },
  ];

  return (
    <div className="sf-step">
      <h2 className="sf-headline">Review Your Submission</h2>

      <div className="sf-review-card">
        {rows.map((r, i) => (
          <div key={r.label} className="sf-review-row">
            <span className="sf-review-label">{r.label}</span>
            <span className="sf-review-value">{r.value}</span>
          </div>
        ))}
      </div>

      <p className="sf-fine-print">
        Refunds are subject to passing all {GATE_COUNT} verification gates. Processing time varies.
      </p>

      {/* F3: Loading state + slow-response hint */}
      {submitting && (
        <div style={{ marginTop: 16, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
          <span className="sf-spinner" style={{ display: 'inline-block', marginRight: 8 }} />
          {slowHint
            ? 'This is taking longer than usual\u2014AI pipeline is busy. Please wait\u2026'
            : 'Running verification\u2026'}
        </div>
      )}

      <div className="sf-nav-buttons">
        <button type="button" className="sf-btn-ghost" onClick={onBack} disabled={submitting}>&larr; Back</button>
        <button
          type="button"
          className={`sf-btn-solid${submitting ? ' sf-btn-solid--loading' : ''}`}
          onClick={doSubmit}
          disabled={submitting}
        >
          {submitting ? '' : 'Submit'}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// STEP 5 — Gate Progress
// ═══════════════════════════════════════════
function StepGates({ failGate, failGateMessage, onReset, onResubmit, referralCode }: {
  failGate: number | null;
  failGateMessage: GateMessage | null;
  onReset: () => void;
  onResubmit: () => void;
  referralCode: string;
}) {
  const [gates, setGates] = useState<Gate[]>(
    GATE_NAMES.map((name) => ({ name, status: 'pending' }))
  );
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showFix, setShowFix] = useState(false);
  const subId = useRef(`GC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      for (let i = 0; i < GATE_NAMES.length; i++) {
        if (cancelled) return;
        setGates((prev) => prev.map((g, idx) => (idx === i ? { ...g, status: 'processing' } : g)));
        await new Promise((r) => setTimeout(r, 800));
        if (cancelled) return;

        if (failGate !== null && i === failGate) {
          setGates((prev) =>
            prev.map((g, idx) =>
              idx === i
                ? { ...g, status: 'failed', reason: `${g.name} verification failed` }
                : idx > i
                  ? { ...g, status: 'pending' }
                  : g
            )
          );
          setFailed(true);
          return;
        }

        setGates((prev) => prev.map((g, idx) => (idx === i ? { ...g, status: 'passed' } : g)));
      }
      if (!cancelled) setDone(true);
    };
    run();
    return () => { cancelled = true; };
  }, [failGate]);

  const headline = failed ? 'Submission Incomplete' : done ? 'Submission Approved' : 'Verifying Submission';

  return (
    <div className={`sf-step${done ? ' sf-step--approved' : ''}`}>
      <h2 className="sf-headline">{headline}</h2>
      <div className="sf-sub-id">ID: {subId.current}</div>

      <div className="sf-gates">
        {gates.map((g, i) => (
          <div
            key={g.name}
            className={`sf-gate-row${g.status === 'failed' ? ' sf-gate-row--failed' : ''}${g.status === 'passed' ? ' sf-gate-row--passed' : ''}`}
          >
            <span className="sf-gate-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="sf-gate-name">{g.name}</span>
            <span className={`sf-gate-icon sf-gate-icon--${g.status}`}>
              {g.status === 'pending' && '○'}
              {g.status === 'processing' && '◌'}
              {g.status === 'passed' && '●'}
              {g.status === 'failed' && '✕'}
            </span>
          </div>
        ))}
      </div>

      {done && (
        <div className="sf-result">
          <p className="sf-result-text">ETH refund will be dispatched within 24–48 hours</p>
          {referralCode && (
            <ViralShareCard variant="post-approval" referralCode={referralCode} />
          )}
          <div className="sf-nav-buttons">
            <button type="button" className="sf-btn-ghost" onClick={onReset}>Submit another &rarr;</button>
          </div>
        </div>
      )}

      {failed && (
        <div className="sf-result">
          <div className="sf-fail-reason">
            {failGateMessage?.headline ?? gates.find((g) => g.status === 'failed')?.reason}
          </div>
          {failGateMessage?.fix && (
            <div className="sf-fix-details" style={{ marginTop: 12 }}>
              {failGateMessage.fix}
            </div>
          )}
          {!failGateMessage && (
            <>
              <button
                type="button"
                className="sf-btn-ghost"
                onClick={() => setShowFix(!showFix)}
              >
                {showFix ? 'Hide details' : 'What to fix →'}
              </button>
              {showFix && (
                <div className="sf-fix-details">
                  Ensure the failed verification requirement is met and resubmit your receipt.
                  Double-check that all information is clearly visible on the receipt photo.
                </div>
              )}
            </>
          )}
          <div className="sf-nav-buttons" style={{ marginTop: 24 }}>
            <button type="button" className="sf-btn-solid" onClick={onResubmit}>Resubmit</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN FLOW CONTROLLER
// ═══════════════════════════════════════════

function usePrivyHandle(): string {
  try {
    // Dynamic import — SubmitFlow may render before Privy is ready
    const { usePrivy } = require('@privy-io/react-auth');
    const { user } = usePrivy();
    return ((user as any)?.twitter?.username || '').toString().replace(/^@/, '');
  } catch {
    return '';
  }
}

// ═══════════════════════════════════════════
// SEASON 1 — Invite Gate
// ═══════════════════════════════════════════
//
// Gates the entire submit flow behind a single-use beta invite code.
// Only appears after the user has signed in with Privy — before sign-in,
// there's nothing to bind the code to. Flow:
//
//   not authenticated → "sign in to continue" panel
//   authenticated but no invite → invite redemption panel
//   authenticated + has invite → children (the 5-step flow)
//
// The gate polls /api/invites/redeem (GET) on mount to check status,
// then posts to the same endpoint on code submission. Once redeemed,
// the response is cached in a local state flag so the flow reveals
// immediately without a re-fetch. The server is authoritative — every
// /api/claims/submit call independently verifies invite status.

function InviteGate({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login, getAccessToken, user } = usePrivy();
  const [checking, setChecking] = useState(true);
  const [hasInvite, setHasInvite] = useState(false);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handle = ((user as any)?.twitter?.username || '').toString();

  // Check invite status whenever auth state changes
  useEffect(() => {
    let cancelled = false;
    if (!ready) return;
    if (!authenticated) { setChecking(false); setHasInvite(false); return; }

    (async () => {
      setChecking(true);
      try {
        const token = await getAccessToken();
        if (!token) { setChecking(false); return; }
        const res = await fetch('/api/invites/redeem', {
          method: 'GET',
          headers: {
            authorization: `Bearer ${token}`,
            'x-privy-user-id': String((user as any)?.id || ''),
            'x-privy-handle': handle,
          },
        });
        const data = await res.json();
        if (!cancelled) {
          setHasInvite(!!data?.hasInvite);
          setChecking(false);
        }
      } catch {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => { cancelled = true; };
  }, [ready, authenticated, getAccessToken, user, handle]);

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const normalized = code.trim().toUpperCase();
    if (!/^GC-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalized)) {
      setError('Invalid code format. Expected GC-XXXX-XXXX.');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) { setError('Sign in required.'); setSubmitting(false); return; }
      const res = await fetch('/api/invites/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
          'x-privy-user-id': String((user as any)?.id || ''),
          'x-privy-handle': handle,
        },
        body: JSON.stringify({ code: normalized }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || data?.error || 'Redemption failed.');
        return;
      }
      setHasInvite(true);
      setCode('');
    } catch (err: any) {
      setError(err?.message || 'Redemption failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || checking) {
    return (
      <div className="sf-container">
        <div className="sf-step">
          <h2 className="sf-headline">Loading…</h2>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="sf-container">
        <div className="sf-step">
          <div className="sf-eyebrow">— SEASON 1 · BETA</div>
          <h2 className="sf-headline">Sign in to continue</h2>
          <p className="sf-sub">
            Beta access is gated behind a single-use invite code. Sign in with your
            verified X account first, then enter your code to unlock the submission
            flow.
          </p>
          <button
            type="button"
            className="sf-btn-solid"
            onClick={() => login()}
            style={{ marginTop: 24 }}
          >
            Sign in with X
          </button>
        </div>
      </div>
    );
  }

  if (!hasInvite) {
    return (
      <div className="sf-container">
        <div className="sf-step">
          <div className="sf-eyebrow">— SEASON 1 · BETA · INVITE REQUIRED</div>
          <h2 className="sf-headline">Enter your beta invite code</h2>
          <p className="sf-sub">
            You&apos;re signed in as <strong>@{handle || 'user'}</strong>. Enter the
            single-use invite code you received to unlock receipt submission.
            Browsing the leaderboard, docs, and gates stays public — the code is
            only required to submit.
          </p>
          <form onSubmit={redeem} style={{ marginTop: 32, maxWidth: 420 }}>
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                marginBottom: 8,
              }}
            >
              Invite Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="GC-XXXX-XXXX"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              maxLength={12}
              style={{
                width: '100%',
                padding: '14px 18px',
                fontFamily: 'var(--font-mono)',
                fontSize: 18,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                background: 'rgba(var(--fg-rgb), 0.03)',
                color: 'var(--fg)',
                border: '1px solid var(--line)',
                borderRadius: 0,
                outline: 'none',
              }}
            />
            {error && (
              <p
                style={{
                  marginTop: 12,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--status-fail)',
                }}
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting || code.trim().length < 11}
              className="sf-btn-solid"
              style={{ marginTop: 20, width: '100%' }}
            >
              {submitting ? 'Redeeming…' : 'Redeem Code'}
            </button>
          </form>
          <p
            style={{
              marginTop: 24,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-tertiary)',
              maxWidth: 420,
            }}
          >
            Don&apos;t have a code? Season 1 is closed beta. Codes are distributed
            directly to selected testers. Public access arrives with the token
            launch.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function SubmitFlow() {
  const [step, setStep] = useState<Step>(1);
  const [maxStep, setMaxStep] = useState<Step>(1);
  const [wallet, setWallet] = useState('');
  const [tweetUrl, setTweetUrl] = useState('');
  const [handle, setHandle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [failGate, setFailGate] = useState<number | null>(null);
  const [failGateMessage, setFailGateMessage] = useState<GateMessage | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const loggedInHandle = usePrivyHandle();

  // F5: Wallet disconnect guard — if Privy auth drops while the user is
  // mid-form (step 2–5), reset to step 1 so the form doesn't attempt to
  // submit with no wallet attached. InviteGate catches !authenticated but
  // doesn't reset form state; this hook does.
  const { authenticated, getAccessToken, user } = usePrivy();
  useEffect(() => {
    if (!authenticated && step > 1) {
      setStep(1);
      setMaxStep(1);
      setWallet('');
      setTweetUrl('');
      setHandle('');
      setFile(null);
      setFailGate(null);
      setFailGateMessage(null);
    }
  }, [authenticated, step]);

  const goTo = (s: Step) => {
    setStep(s);
    if (s > maxStep) setMaxStep(s);
  };

  const reset = () => {
    setStep(1);
    setMaxStep(1);
    setWallet('');
    setTweetUrl('');
    setHandle('');
    setFile(null);
    setFailGate(null);
    setFailGateMessage(null);
  };

  const handleSubmit = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setFailGate(0);
      setFailGateMessage({ headline: 'Sign-in required', fix: 'Your session expired. Sign in again and resubmit.' });
      goTo(5);
      return;
    }

    // Ensure a minimum 1.5s loading state so the animation reads naturally
    const minWait = new Promise<void>((r) => setTimeout(r, 1500));

    try {
      const fd = new FormData();
      fd.append('tweetUrl', tweetUrl);
      fd.append('wallet', wallet);
      fd.append('walletOnReceipt', '');
      fd.append('amountUsd', '');
      if (file) fd.append('receipt', file);

      const res = await fetch('/api/claims/submit', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'x-privy-user-id': String((user as any)?.id || ''),
          'x-privy-handle': handle || loggedInHandle,
          'x-privy-wallet': wallet,
        },
        body: fd,
      });

      const json = await res.json();

      if (!res.ok) {
        const msg = getApiErrorMessage(json?.error || 'submit_failed');
        setFailGate(0);
        setFailGateMessage({ headline: msg, fix: '' });
        await minWait;
        goTo(5);
        return;
      }

      // Find the first failed gate and map it to a user-facing message
      const failedGateResult = (json.gates as Array<{ gate: string; passed: boolean }> | undefined)
        ?.find((g) => !g.passed);

      if (failedGateResult) {
        const idx = GATE_DEFS.findIndex((d) => d.id === failedGateResult.gate);
        setFailGate(idx >= 0 ? idx : 0);
        setFailGateMessage(getGateMessage(failedGateResult.gate));
      } else {
        setFailGate(null);
        setFailGateMessage(null);
      }
    } catch {
      setFailGate(0);
      setFailGateMessage({ headline: 'Submission failed', fix: 'Network error. Check your connection and resubmit.' });
    }

    await minWait;
    goTo(5);
  }, [wallet, tweetUrl, handle, loggedInHandle, file, getAccessToken, user]);

  // SECURITY: Window globals removed — were exploitable even with NODE_ENV guard.
  // Hardened 2026-04-06 — use React DevTools or proper test harness instead.

  return (
    <InviteGate>
    <div className="sf-container">
      <ProgressBar step={step} maxStep={maxStep} />

      {step === 1 && (
        <StepWallet onConnect={async (w) => {
          setWallet(w);
          try {
            const code = await generateReferralCodeClient(w);
            setReferralCode(code);
          } catch {}
          goTo(2);
        }} />
      )}

      {step === 2 && (
        <StepTweet
          initialUrl={tweetUrl}
          loggedInHandle={loggedInHandle}
          onVerified={(u, h) => { setTweetUrl(u); setHandle(h); goTo(3); }}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <StepReceipt
          initialFile={file}
          onNext={(f) => { setFile(f); goTo(4); }}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && (
        <StepReview
          wallet={wallet}
          tweetUrl={tweetUrl}
          handle={handle}
          file={file}
          onSubmit={handleSubmit}
          onBack={() => setStep(3)}
        />
      )}

      {step === 5 && (
        <StepGates
          failGate={failGate}
          failGateMessage={failGateMessage}
          onReset={reset}
          onResubmit={() => { setFile(null); goTo(3); }}
          referralCode={referralCode}
        />
      )}
    </div>
    </InviteGate>
  );
}
