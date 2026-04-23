// Sentry — browser / client runtime
//
// Loaded automatically by Next.js 15+ App Router on every page. Fires
// BEFORE the rest of the app so Sentry catches errors during React
// hydration and early client code (Privy init, theme script, etc.).

import * as Sentry from '@sentry/nextjs';
import { shouldDropEvent, currentRelease, currentEnvironment } from './lib/observability/sentry';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  release: currentRelease(),
  environment: currentEnvironment(),

  // Send PII to Sentry (wallet addresses, X handles). These are already
  // public identifiers in the protocol, so no additional exposure.
  sendDefaultPii: true,

  // Transaction sampling — 100% in dev, 10% in production. Keeps
  // quota burn low while capturing enough perf data to spot regressions.
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Drop known browser-extension noise + cross-origin script errors
  // before they burn event quota. See lib/observability/sentry.ts.
  beforeSend: shouldDropEvent,

  // Session Replay — records DOM + user actions around errors.
  // 10% of all sessions, 100% of sessions that hit an error.
  // Crucial for reproducing "it just exits out" style bugs without
  // having to message the affected beta tester.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Structured logs via Sentry.logger — pairs with the log-to-trace
  // correlation so any console.error in production surfaces alongside
  // the transaction that produced it.
  enableLogs: true,

  integrations: [
    Sentry.replayIntegration({
      // Mask text content by default — we don't want to leak invite
      // codes, receipt contents, or tweet drafts into replays.
      maskAllText: true,
      // Keep input values (non-PII fields) visible so we can see what
      // the user was actually typing when something broke.
      maskAllInputs: false,
      // Block all media — receipt photos are sensitive, and blocking
      // is cheaper than per-element blockSelector rules.
      blockAllMedia: true,
    }),
  ],
});

// Hook App Router navigation transitions so client-side navigations
// appear as tracing spans (not just hard page loads).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
