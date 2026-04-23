// Sentry — Node.js server runtime
//
// Applies to every Vercel Function (API routes, Server Components,
// cron workers). Catches thrown exceptions, unhandled promise
// rejections, and — via instrumentation.ts's onRequestError — any
// error that escapes a route handler.

import * as Sentry from '@sentry/nextjs';
import { shouldDropEvent, currentRelease, currentEnvironment } from './lib/observability/sentry';

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  release: currentRelease(),
  environment: currentEnvironment(),

  sendDefaultPii: true,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Attach local variable values to stack frames so we can see what
  // arguments the crashing function received without adding console.log.
  includeLocalVariables: true,

  enableLogs: true,

  beforeSend: shouldDropEvent,
});
