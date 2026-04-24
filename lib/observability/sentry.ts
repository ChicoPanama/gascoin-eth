/**
 * Centralized Sentry helpers.
 *
 * Routes import from here rather than `@sentry/nextjs` directly so we can
 * enforce consistent tagging, filter out known noise, and swap the SDK
 * behind a stable surface if needed. Safe to call from any runtime
 * (browser / node / edge) — all functions no-op when the SDK isn't
 * initialized.
 */

import * as Sentry from '@sentry/nextjs';

// ─── Types ─────────────────────────────────────────────────────────

export interface SentrySessionUser {
  /** Privy DID or any stable user id */
  userId?: string | null;
  /** X handle without the `@` prefix (lowercased preferred) */
  xHandle?: string | null;
  /** EVM address, 0x-prefixed */
  wallet?: string | null;
}

export interface ClaimContext {
  id?: string;
  status?: string;
  tier?: string;
  amountEth?: number;
}

// ─── User + context ────────────────────────────────────────────────

/**
 * Attach the current authenticated user to subsequent Sentry events.
 * Call right after session verification in route handlers.
 * Pass null / undefined to clear.
 */
export function setSentryUser(session: SentrySessionUser | null | undefined): void {
  if (!session) {
    Sentry.setUser(null);
    return;
  }
  const id = session.userId || session.wallet || session.xHandle || undefined;
  if (!id) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({
    id,
    username: session.xHandle || undefined,
    // Intentionally omit `email` / raw wallet from the indexed user object;
    // wallet goes in a tag so we can filter but not index PII-adjacent strings.
  });
  if (session.wallet) {
    Sentry.setTag('wallet.address', session.wallet.toLowerCase());
  }
  if (session.xHandle) {
    Sentry.setTag('x.handle', session.xHandle.replace(/^@/, '').toLowerCase());
  }
}

/** Attach claim-specific context to subsequent events in this request. */
export function setClaimContext(claim: ClaimContext): void {
  Sentry.setContext('claim', {
    id: claim.id,
    status: claim.status,
    tier: claim.tier,
    amount_eth: claim.amountEth,
  });
  if (claim.tier) Sentry.setTag('claim.tier', claim.tier);
  if (claim.status) Sentry.setTag('claim.status', claim.status);
}

/** Attach verification-gate result context. Call per-gate in the engine. */
export function setGateContext(name: string, passed: boolean, reason?: string): void {
  Sentry.setTag('gate.name', name);
  Sentry.setTag('gate.passed', passed ? 'true' : 'false');
  Sentry.setContext('gate_result', { name, passed, reason: reason ?? null });
}

/** Lightweight timeline marker. Shows up in Session Replay + issue details. */
export function breadcrumb(
  category: 'auth' | 'wallet' | 'claim' | 'gate' | 'payout' | 'ui' | 'cron' | 'ai',
  message: string,
  data?: Record<string, unknown>,
): void {
  Sentry.addBreadcrumb({
    category,
    message,
    level: 'info',
    data,
    timestamp: Date.now() / 1000,
  });
}

// ─── Noise filter ──────────────────────────────────────────────────

/**
 * Return `null` from `beforeSend` to drop the event, or the event to keep.
 *
 * Noise we drop:
 *   - Wallet-extension property redefinition errors (Rabby/Phantom/MetaMask
 *     fighting over window.ethereum). Not actionable by us.
 *   - Cross-origin "Script error." with no stack — nothing we can do.
 *   - ResizeObserver loop warnings — Chrome quirk, not a bug.
 *   - User-navigation fetch AbortErrors.
 *   - Privy's own auth-flow cancellations.
 *
 * Everything else passes through.
 */
export function shouldDropEvent(
  event: Sentry.ErrorEvent,
  hint: Sentry.EventHint,
): Sentry.ErrorEvent | null {
  const err = hint.originalException as (Error & { name?: string }) | undefined;
  const name = err?.name || '';
  const message = (err?.message || event.message || '').toString();

  // 1. Browser-extension window.ethereum conflicts
  if (/Cannot redefine property:\s*(?:ethereum|solana|phantom)/i.test(message)) return null;
  if (/Cannot set property\s+(?:ethereum|solana|phantom)/i.test(message)) return null;
  if (/evmAsk\.js|evmAskSite|injectedWalletProvider/i.test(message)) return null;

  // 1b. Extension-internal errors that surface in our page via inpage.js
  // (MetaMask, Binance Wallet TON bridge SSE retries, Rabby, etc.).
  // Heuristic: drop if the error itself mentions these, or if every
  // stack frame is from an extension inpage/contentScript bundle or a
  // chrome-extension:// URL. Our own frames never match those patterns.
  if (/func sseError not found|\[FunctionCallError\]|wallet\.binance\.com\/tonbridge/i.test(message)) return null;
  const frames = event.exception?.values?.[0]?.stacktrace?.frames ?? [];
  if (frames.length > 0) {
    const looksLikeExtension = (f: Sentry.StackFrame): boolean => {
      const file = (f.filename || f.abs_path || '').toString();
      return /^chrome-extension:\/\/|^moz-extension:\/\/|^app:\/\/\/inpage\.js|\/inpage\.js$|contentScript\.js|content_script\.js|injected\.js/i.test(file);
    };
    if (frames.every(looksLikeExtension)) return null;
  }

  // 2. Cross-origin script noise
  if (message === 'Script error.' || message === 'Script error') return null;

  // 3. Benign observer warnings
  if (/ResizeObserver loop (?:limit exceeded|completed with undelivered notifications)/i.test(message)) return null;

  // 4. User-navigation fetch cancellations
  if (name === 'AbortError') return null;
  if (/The (?:operation|user) (?:was aborted|cancelled)/i.test(message)) return null;
  if (/signal is aborted without reason/i.test(message)) return null;

  // 5. Privy-internal flow cancellations that surface as unhandled rejections
  if (/Privy:\s*(?:user_closed|cancelled|user_rejected)/i.test(message)) return null;

  // 6. WalletConnect QR-modal timeouts (we don't trigger retry on this)
  if (/Proposal expired|Connection request reset/i.test(message)) return null;

  return event;
}

// ─── Environment helpers ───────────────────────────────────────────

/** Read Vercel's commit SHA for release tagging. Null outside Vercel. */
export function currentRelease(): string | undefined {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.SENTRY_RELEASE ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    undefined
  );
}

/** Map Vercel env to Sentry environment ('production' | 'preview' | 'development'). */
export function currentEnvironment(): string {
  return (
    process.env.VERCEL_ENV ||
    process.env.NEXT_PUBLIC_VERCEL_ENV ||
    process.env.NODE_ENV ||
    'development'
  );
}
