// Next.js server-side instrumentation hook.
//
// Runs once when each runtime (nodejs, edge) starts up. Dispatches to
// the correct Sentry config based on NEXT_RUNTIME.
//
// `onRequestError` exports Sentry's route-handler error capture — any
// unhandled error thrown inside an App Router route or Server Action
// that escapes our try/catch blocks gets recorded automatically.

import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
