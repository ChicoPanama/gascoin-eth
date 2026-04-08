'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { generateReferralCodeClient } from '../lib/referral-code-client';
import { ViralShareCard } from './shared/ViralShareCard';

// ─── Types ───
type Step = 1 | 2 | 3 | 4 | 5;
type GateStatus = 'pending' | 'processing' | 'passed' | 'failed';
type Gate = { name: string; status: GateStatus; reason?: string };

const GATE_NAMES = [
  'Tweet Detected',
  'Tweet Public',
  '#gascoin Hashtag',
  'Wallet on Receipt',
  'Receipt Legible',
  'Receipt Date Valid',
  'Station Verified',
  'No Duplicate Wallet',
  'No Duplicate Receipt',
  'Treasury Solvent',
  'Min 100 Followers',
];

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

  const wallets = ['Phantom', 'Solflare', 'Backpack'];

  return (
    <div className="sf-step">
      <h2 className="sf-headline">Connect Your Wallet</h2>
      <p className="sf-sub">We verify your wallet is not a duplicate and use it to send your SOL refund.</p>

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
    if (!value.includes('x.com/') && !value.includes('twitter.com/')) {
      setStatus('error');
      setErrorMsg('URL format not recognized');
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

  return (
    <div className="sf-step">
      <h2 className="sf-headline">Verify Your Tweet</h2>
      <p className="sf-sub">Paste the URL of your #gascoin tweet. Must be public and posted within the last 48 hours.</p>

      <input
        type="text"
        className={`sf-input${status === 'loading' ? ' sf-input--loading' : ''}${status === 'error' ? ' sf-input--error' : ''}`}
        placeholder="https://x.com/yourhandle/status/..."
        value={url}
        onChange={(e) => handleInput(e.target.value)}
      />

      {status === 'success' && (
        <div className="sf-tweet-preview">
          <div className="sf-tweet-avatar">{handle[0]?.toUpperCase() || 'G'}</div>
          <div className="sf-tweet-body">
            <div className="sf-tweet-meta">@{handle} · {tweetAge}</div>
            <div className="sf-tweet-status">✓ #gascoin detected · Public · Posted {tweetAge}</div>
          </div>
        </div>
      )}

      {status === 'error' && <div className="sf-error">{errorMsg}</div>}
      {status === 'idle' && url.length === 0 && (
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
          Paste your tweet URL above to continue
        </div>
      )}

      <div className="sf-nav-buttons">
        <button type="button" className="sf-btn-ghost" onClick={onBack}>&larr; Back</button>
        <button
          type="button"
          className="sf-btn-solid"
          disabled={status !== 'success'}
          onClick={() => onVerified(url, handle)}
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

  const VALID_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];
  const MAX_SIZE = 10 * 1024 * 1024;

  useEffect(() => {
    if (initialFile) {
      if (initialFile.type.startsWith('image/')) {
        setPreview(URL.createObjectURL(initialFile));
      }
    }
  }, [initialFile]);

  const handleFile = (f: File) => {
    setError('');
    if (!VALID_TYPES.includes(f.type) && !f.name.toLowerCase().endsWith('.heic')) {
      setError('Only JPG, PNG, HEIC, and PDF accepted');
      return;
    }
    if (f.size > MAX_SIZE) {
      setError('File exceeds 10MB limit');
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
      <p className="sf-sub">Photo must clearly show the total amount, date, and your wallet address written on the receipt.</p>

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
          accept=".jpg,.jpeg,.png,.heic,.pdf"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>
      <div className="sf-upload-formats">Accepted: JPG, PNG, HEIC, PDF · Max 10MB</div>

      {error && <div className="sf-error">{error}</div>}

      <div className="sf-checklist">
        {[
          'Receipt shows total amount clearly',
          'Receipt date is visible',
          'My wallet address is written on the receipt',
        ].map((label, i) => (
          <label key={i} className="sf-check-row" onClick={() => toggleCheck(i)}>
            <span className={`sf-checkbox${checks[i] ? ' sf-checkbox--checked' : ''}`}>
              {checks[i] && '✓'}
            </span>
            <span>{label}</span>
          </label>
        ))}
      </div>

      <div className="sf-nav-buttons">
        <button type="button" className="sf-btn-ghost" onClick={onBack}>&larr; Back</button>
        <button
          type="button"
          className={`sf-btn-solid${shake ? ' sf-shake' : ''}`}
          disabled={!allChecked || !file}
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
  onSubmit: () => void;
  onBack: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  const doSubmit = () => {
    setSubmitting(true);
    setTimeout(() => onSubmit(), 2000);
  };

  const rows = [
    { label: 'Wallet', value: wallet },
    { label: 'Tweet', value: tweetUrl.length > 50 ? tweetUrl.slice(0, 50) + '...' : tweetUrl },
    { label: 'Receipt', value: file ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB` : '—' },
    { label: 'Submission Date', value: new Date().toLocaleString() },
    { label: 'Estimated Refund', value: '~0.05 SOL' },
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
        Refunds are subject to passing all 10 verification gates. Processing time varies.
      </p>

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
function StepGates({ failGate, onReset, onResubmit, referralCode }: {
  failGate: number | null;
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
          <p className="sf-result-text">SOL refund will be dispatched within 24–48 hours</p>
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
            {gates.find((g) => g.status === 'failed')?.reason}
          </div>
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

export function SubmitFlow() {
  const [step, setStep] = useState<Step>(1);
  const [maxStep, setMaxStep] = useState<Step>(1);
  const [wallet, setWallet] = useState('');
  const [tweetUrl, setTweetUrl] = useState('');
  const [handle, setHandle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [failGate, setFailGate] = useState<number | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const loggedInHandle = usePrivyHandle();

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
  };

  // SECURITY: Window globals removed — were exploitable even with NODE_ENV guard.
  // Hardened 2026-04-06 — use React DevTools or proper test harness instead.

  return (
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
          onSubmit={() => goTo(5)}
          onBack={() => setStep(3)}
        />
      )}

      {step === 5 && (
        <StepGates
          failGate={failGate}
          onReset={reset}
          onResubmit={() => { setFile(null); goTo(3); }}
          referralCode={referralCode}
        />
      )}
    </div>
  );
}
