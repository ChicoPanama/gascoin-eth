'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { generateReferralCodeClient } from '../lib/referral-code-client';
import { GATE_DEFS, GATE_COUNT } from '../lib/policy';
import { ViralShareCard } from './shared/ViralShareCard';
import { getGateMessage, getApiErrorMessage, type GateMessage } from '../lib/gate-messages';
import { shouldRequireInviteCode, shouldShowBetaCopy } from '../lib/season';

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
  const { ready, authenticated, user, login } = usePrivy();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState('');
  const attempts = useRef<Record<string, number>>({});
  const autoAdvanced = useRef(false);

  // ── Auto-advance when the user already has a wallet on their Privy
  //    session. Signing in with X creates an embedded wallet, and
  //    returning testers shouldn't have to re-connect on every claim.
  //    Tester report (Crush, 2026-04-20): "shouldn't make me have to
  //    connect again because we see top right I'm already connected."
  const sessionWallet = (user as any)?.wallet?.address as string | undefined;
  useEffect(() => {
    if (!ready || !authenticated || !sessionWallet || autoAdvanced.current) return;
    autoAdvanced.current = true;
    setConnected(sessionWallet);
    // Small visual beat so users see "Already connected" before moving on
    setTimeout(() => onConnect(sessionWallet), 400);
  }, [ready, authenticated, sessionWallet, onConnect]);

  const connect = (provider: string) => {
    attempts.current[provider] = (attempts.current[provider] || 0) + 1;
    if (attempts.current[provider] > 1) {
      setError('This wallet has a pending submission.');
      return;
    }
    setError('');
    setLoading(provider);
    // Trigger Privy's login modal. Privy handles the actual wallet provider
    // selection (MetaMask / Rabby / Rainbow / Coinbase / embedded) and
    // returns the REAL Ethereum address via the session. Previously we
    // generated a fake "GAs..." base58 string here — leftover Solana-era
    // mock code that caused spurious "wallet changed mid-session" errors
    // when the fake string couldn't match the real session wallet.
    try {
      login();
      setLoading(null);
    } catch (e: any) {
      setLoading(null);
      setError(e?.message || 'Could not open wallet connect modal');
    }
  };

  const displayAddr = (addr: string) =>
    addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;

  return (
    <div className="sf-step">
      <h2 className="sf-headline">Connect Your Wallet</h2>
      <p className="sf-sub">We verify your wallet is not a duplicate and use it to send your ETH refund.</p>

      {connected ? (
        <div className="sf-connected">
          <span className="sf-check-badge">●</span>
          <span className="sf-connected-addr" title={connected}>{displayAddr(connected)}</span>
          <span className="sf-connected-label">Connected — continuing…</span>
        </div>
      ) : (
        <>
          {ready && authenticated && (
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 0,
                fontSize: 13,
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              Signed in. Now connect a wallet (MetaMask, Rainbow, Coinbase, Rabby, etc.) — this is where your ETH refund will land.
            </div>
          )}
          <div className="sf-wallet-list">
            <button
              type="button"
              className="sf-wallet-btn"
              onClick={() => connect('privy')}
              disabled={!!loading}
            >
              {loading === 'privy' ? (
                <span className="sf-spinner" />
              ) : (
                <>
                  <span>Connect via Privy</span>
                  <span className="sf-arrow">&rarr;</span>
                </>
              )}
            </button>
          </div>
          <div
            style={{
              marginTop: 8,
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 11,
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            Opens the Privy modal — supports MetaMask, Rabby, Rainbow, and Coinbase Wallet.
          </div>
        </>
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
  const tweetDraft = 'Just filled up and getting ETH back thanks to @GasCoinApp. Real money back on real gas. #gascoin $GAS';
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
          Tweet must tag <strong>@GasCoinApp</strong> and include <strong>#gascoin</strong> or <strong>$GAS</strong>. Must be public. Must be posted within the last 48 hours.
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
              <div className="sf-tweet-status">✓ #gascoin / $GAS detected · Public · Posted {tweetAge}</div>
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
  // 4th checkbox added per Crush feedback (2026-04-20): user attests receipt
  // total is $5+ BEFORE OCR runs, letting us fail fast on sub-$5 receipts.
  const [checks, setChecks] = useState([false, false, false, false]);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // F1: Must match server validation in app/api/claims/submit/route.ts
  // Server accepts: image/jpeg, image/png, image/heic, image/heif, image/webp, application/pdf · max 15 MB
  const VALID_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'application/pdf'];
  const MAX_SIZE = 15 * 1024 * 1024;

  // iOS Safari and recent Chrome can't decode HEIC/HEIF in <img>. If we
  // pass the object URL to a thumbnail, the user sees a broken image
  // icon and assumes their upload failed. Detect by MIME or extension
  // and show a named card instead. OCR server-side handles HEIC fine.
  const isHeic = (f: File) =>
    f.type === 'image/heic' || f.type === 'image/heif' ||
    /\.(heic|heif)$/i.test(f.name);

  useEffect(() => {
    if (initialFile) {
      if (initialFile.type.startsWith('image/') && !isHeic(initialFile)) {
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
    // Skip HEIC preview — browsers can't render it. Card UI below
    // shows filename + size instead, so the user still sees that
    // their upload landed.
    if (f.type.startsWith('image/') && !isHeic(f)) {
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
      >
        {file ? (
          <div className="sf-upload-preview">
            {preview ? (
              <img src={preview} alt="Receipt" className="sf-upload-thumb" />
            ) : (
              // HEIC / PDF: no browser-renderable preview. Show a
              // clear "file attached" card so the user knows the
              // upload succeeded even without a visual thumbnail.
              <div className="sf-upload-thumb sf-upload-thumb--placeholder" aria-hidden>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="sf-upload-thumb-label">
                  {file.type === 'application/pdf' ? 'PDF' : 'IMAGE'}
                </span>
              </div>
            )}
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
            <div className="sf-upload-actions">
              {/* Two buttons instead of one hit-area: on mobile the
                  camera-only input opens the rear camera directly
                  (Android needs `capture="environment"`; iOS honors
                  it too since Safari 15). Desktop users ignore the
                  Take Photo button and use Upload File. */}
              <button
                type="button"
                className="sf-upload-btn sf-upload-btn--camera"
                onClick={(e) => { e.stopPropagation(); cameraRef.current?.click(); }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                TAKE PHOTO
              </button>
              <button
                type="button"
                className="sf-upload-btn sf-upload-btn--file"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                UPLOAD FILE
              </button>
            </div>
            <span className="sf-upload-hint">On desktop you can also drag &amp; drop.</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.heic,.heif,.webp,.pdf"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {/* Camera-only input: accept filters to images (PDFs can't come
            from a camera), and `capture="environment"` hints the rear
            camera. Browsers that don't support capture fall back to the
            normal file picker. */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>
      <div className="sf-upload-formats">Accepted: JPG, PNG, HEIC, HEIF, WEBP, PDF · Max 15MB</div>

      {error && <div className="sf-error">{error}</div>}

      {/* ─── Required user-confirmation checklist ───────────────────────
          Earlier tester (Crush) thought the app auto-checked these after
          uploading the photo. Making the "YOU need to check each box"
          intent explicit: amber accent, info icon, header text, and a
          checked-count pill so progress is visible. */}
      <div
        style={{
          marginTop: 20,
          padding: 16,
          border: '1px solid var(--status-warn, #d97706)',
          borderRadius: 0,
          background: 'rgba(217, 119, 6, 0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
            flexWrap: 'wrap',
          }}
        >
          <span
            aria-hidden
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: '1.5px solid var(--status-warn, #d97706)',
              color: 'var(--status-warn, #d97706)',
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            !
          </span>
          <span
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 11,
              letterSpacing: '0.1em',
              color: 'var(--status-warn, #d97706)',
              fontWeight: 600,
            }}
          >
            REQUIRED · YOU MUST CHECK EACH BOX
          </span>
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 11,
              color: 'rgba(255,255,255,0.55)',
            }}
          >
            {checks.filter(Boolean).length} / {checks.length}
          </span>
        </div>
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: 'rgba(255,255,255,0.7)',
            marginBottom: 12,
          }}
        >
          Check each item below only after you&apos;ve confirmed it&apos;s true of your receipt photo. The app doesn&apos;t auto-check these — it&apos;s your attestation that the photo meets the verification rules.
        </p>
        <div className="sf-checklist">
          {[
            'Receipt shows total amount clearly',
            'Receipt date is visible',
            'The last 4 hex characters of my Ethereum wallet address are written on the receipt',
            'My receipt total is $5 or more',
          ].map((label, i) => (
            <label key={i} className="sf-check-row" onClick={() => toggleCheck(i)}>
              <span className={`sf-checkbox${checks[i] ? ' sf-checkbox--checked' : ''}`}>
                {checks[i] && '✓'}
              </span>
              <span>{label}</span>
            </label>
          ))}
        </div>
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
    shouldShowBetaCopy()
      ? { label: 'Season 1 Reward', value: 'Beta points — Pioneer Bonus at launch' }
      : { label: 'Estimated Refund', value: '~0.02 ETH' },
    ...(shouldShowBetaCopy()
      ? [{
          label: 'Rewards wallet',
          value: wallet.length > 12
            ? `${wallet.slice(0, 6)}…${wallet.slice(-4)} (locked for Season 1)`
            : wallet,
        }]
      : []),
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
  const { getAccessToken, user } = usePrivy();
  const [gates, setGates] = useState<Gate[]>(
    GATE_NAMES.map((name) => ({ name, status: 'pending' }))
  );
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showFix, setShowFix] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [recheckResult, setRecheckResult] = useState<'' | 'ok' | 'still_no' | 'error'>('');
  const [recheckMessage, setRecheckMessage] = useState('');
  const subId = useRef(`GC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`);

  // Only the follows_gascoin gate (index 1) gets the Recheck button. This is
  // the only gate whose false-negative has a remediation that doesn't require
  // resubmitting the whole flow — the Redis follower cache may just be stale.
  const isFollowsGate = GATE_DEFS[failGate ?? -1]?.id === 'follows_gascoin';

  const recheckFollow = async () => {
    setRechecking(true);
    setRecheckResult('');
    setRecheckMessage('');
    try {
      const token = await getAccessToken();
      if (!token) {
        setRecheckResult('error');
        setRecheckMessage('Session expired — sign in again.');
        return;
      }
      const res = await fetch('/api/recheck-follow', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'x-privy-user-id': String((user as any)?.id || ''),
          'x-privy-handle': String((user as any)?.twitter?.username || '').replace(/^@/, ''),
          'x-privy-wallet': String((user as any)?.wallet?.address || ''),
        },
      });
      const json = await res.json();
      if (!res.ok) {
        setRecheckResult('error');
        setRecheckMessage(json?.message || 'Recheck failed — try again in a moment.');
        return;
      }
      if (json?.following) {
        setRecheckResult('ok');
        setRecheckMessage(json.message || 'Confirmed — you follow @GasCoinApp.');
      } else {
        setRecheckResult('still_no');
        setRecheckMessage(json?.message || 'Still not seeing you in the follower list.');
      }
    } catch {
      setRecheckResult('error');
      setRecheckMessage('Network error — try again.');
    } finally {
      setRechecking(false);
    }
  };

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
          <p className="sf-result-text">
            {shouldShowBetaCopy()
              ? 'Beta points credited. Your Season 1 Pioneer Bonus is registered to your locked wallet and pays out at launch.'
              : 'ETH refund will be dispatched within 24–48 hours'}
          </p>
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
          {isFollowsGate && (
            <div style={{ marginTop: 20, padding: 14, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 0 }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>
                JUST FOLLOWED? FORCE A CACHE RECHECK
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>
                Our follower list refreshes every 2 hours. If you followed <strong>@GasCoinApp</strong> moments ago, tap below to force a live re-check against X.
              </p>
              <button
                type="button"
                className="sf-btn-solid"
                onClick={recheckFollow}
                disabled={rechecking || recheckResult === 'ok'}
                aria-disabled={rechecking || recheckResult === 'ok'}
              >
                {rechecking ? 'Checking…' : recheckResult === 'ok' ? 'Confirmed ✓' : 'Recheck follow status'}
              </button>
              {recheckMessage && (
                <div
                  role="status"
                  aria-live="polite"
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color:
                      recheckResult === 'ok'
                        ? 'var(--status-pass, #10b981)'
                        : recheckResult === 'error'
                          ? 'var(--status-fail, #ef4444)'
                          : 'rgba(255,255,255,0.6)',
                  }}
                >
                  {recheckMessage}
                </div>
              )}
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
  // Post-launch: drop the invite-code wall entirely. Flipping
  // NEXT_PUBLIC_GASCOIN_PHASE=live turns this into a pass-through.
  // InviteGate still renders so sign-in state is still enforced by the
  // non-authenticated branch below — we just skip the redemption UI.
  const inviteRequired = shouldRequireInviteCode();
  const { ready, authenticated, login, linkWallet, getAccessToken, user } = usePrivy();
  const [checking, setChecking] = useState(inviteRequired);
  const [hasInvite, setHasInvite] = useState(!inviteRequired);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // Surfaced so the redemption panel + copy can show the pinned wallet
  // without waiting for a second roundtrip after redeem success.
  const [lockedWallet, setLockedWallet] = useState<string | null>(null);

  const handle = ((user as any)?.twitter?.username || '').toString();
  const sessionWallet = ((user as any)?.wallet?.address || '').toString();

  // Check invite status whenever auth state changes
  useEffect(() => {
    let cancelled = false;
    if (!ready) return;
    // Post-launch: skip the /api/invites/redeem GET entirely. No gating,
    // no Supabase hit, no Privy-token fetch for the invite lookup.
    if (!inviteRequired) { setChecking(false); setHasInvite(true); return; }
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
          if (data?.lockedWallet) setLockedWallet(String(data.lockedWallet));
          setChecking(false);
        }
      } catch {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => { cancelled = true; };
  }, [ready, authenticated, getAccessToken, user, handle, inviteRequired]);

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
          // The server pins this wallet into beta_participants. We also
          // pass it as a hint for verifyPrivySession's fallback path when
          // the Privy linked_accounts lookup is slow/flaky.
          'x-privy-wallet': sessionWallet,
        },
        body: JSON.stringify({ code: normalized }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || data?.error || 'Redemption failed.');
        return;
      }
      if (data?.lockedWallet) setLockedWallet(String(data.lockedWallet));
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
          <div className="sf-eyebrow">— SEASON 1 · BETA · STEP 1 OF 3</div>
          <h2 className="sf-headline">Sign in to continue</h2>
          <p className="sf-sub">
            Beta access is gated behind a single-use invite code. Three quick
            steps: sign in with X, connect the wallet your Season 1 Pioneer
            Bonus will pay to, then enter your code.
          </p>
          <button
            type="button"
            className="sf-btn-solid"
            onClick={() => login({ loginMethods: ['twitter'] })}
            style={{ marginTop: 24 }}
          >
            Sign in with X
          </button>
        </div>
      </div>
    );
  }

  // Gate 2 of 3: wallet must be connected BEFORE redeeming the invite.
  // Whatever wallet they connect here gets pinned to beta_participants at
  // redemption time — that's where the Pioneer Bonus pays out at Season 1
  // close. This is intentionally a hard stop: redeeming with no wallet
  // would let testers lose track of their rewards address.
  if (inviteRequired && !sessionWallet && !hasInvite) {
    return (
      <div className="sf-container">
        <div className="sf-step">
          <div className="sf-eyebrow">— SEASON 1 · BETA · STEP 2 OF 3</div>
          <h2 className="sf-headline">Connect your rewards wallet</h2>
          <p className="sf-sub">
            Signed in as <strong>@{handle || 'user'}</strong>. Connect the
            wallet you want your Season 1 Pioneer Bonus to pay to — every
            beta claim must come from this wallet, and it cannot be changed
            once you redeem your invite code.
          </p>
          <p
            style={{
              marginTop: 16,
              padding: 12,
              border: '1px solid var(--line)',
              borderRadius: 0,
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 12,
              lineHeight: 1.55,
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            Use a wallet you will still control at launch. Hardware wallets
            and self-custodial wallets (MetaMask, Rainbow, Coinbase Wallet,
            Rabby) are strongly recommended. Do not use exchange deposit
            addresses or a wallet you might lose access to.
          </p>
          <button
            type="button"
            className="sf-btn-solid"
            onClick={() => { try { linkWallet(); } catch { /* Privy handles UI */ } }}
            style={{ marginTop: 24 }}
          >
            Connect wallet
          </button>
        </div>
      </div>
    );
  }

  if (!hasInvite) {
    const shortWallet = sessionWallet
      ? `${sessionWallet.slice(0, 6)}…${sessionWallet.slice(-4)}`
      : '';
    return (
      <div className="sf-container">
        <div className="sf-step">
          <div className="sf-eyebrow">— SEASON 1 · BETA · STEP 3 OF 3</div>
          <h2 className="sf-headline">Enter your beta invite code</h2>
          <p className="sf-sub">
            Signed in as <strong>@{handle || 'user'}</strong>. Enter the
            single-use invite code you received to unlock receipt submission.
            Redeeming pins your connected wallet to Season 1 — your Pioneer
            Bonus at launch will pay out there.
          </p>
          {sessionWallet && (
            <div
              style={{
                marginTop: 20,
                padding: 14,
                border: '1px solid var(--status-warn, #d97706)',
                background: 'rgba(217, 119, 6, 0.06)',
                borderRadius: 0,
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 12,
                lineHeight: 1.6,
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: '0.15em',
                  color: 'var(--status-warn, #d97706)',
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                REDEEMING WILL LOCK THIS WALLET
              </div>
              <div>
                <strong title={sessionWallet}>{shortWallet}</strong> — your
                Pioneer Bonus pays here at Season 1 close. Make sure you can
                still access this wallet months from now.
              </div>
            </div>
          )}
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
      // Step-3 checklist's 4th item: user attests receipt is $5+.
      // SubmitFlow only lets them reach Step 4 with all 4 items checked,
      // so this is always 'true' on a legit submission.
      fd.append('userAttestsMinAmount', 'true');
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
        // Special-case the follows_gascoin miss so Step 5 can offer the
        // "Recheck" button that force-refreshes the cached follower list.
        if (json?.error === 'not_following_gascoin') {
          const gateIdx = GATE_DEFS.findIndex((d) => d.id === 'follows_gascoin');
          setFailGate(gateIdx >= 0 ? gateIdx : 1);
          setFailGateMessage({
            headline: 'Not following @GasCoinApp',
            fix: 'If you JUST followed, tap "Recheck" below — the follower cache refreshes every 2 hours, so the system may not have noticed yet.',
          });
          await minWait;
          goTo(5);
          return;
        }
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
