// Sentry — Edge runtime (Routing Middleware)
//
// We currently don't use Next.js middleware or Edge runtime route
// handlers — but wiring this now costs nothing and future middleware
// (e.g. for PR 9's auth edge logic) will inherit instrumentation.

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  sendDefaultPii: true,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  enableLogs: true,
});
