/**
 * Cron check-in wrapper for Vercel cron workers.
 *
 * Wraps a route handler so Sentry tracks: (a) scheduled invocation, (b) duration,
 * (c) success/failure. If a cron stops running (Vercel reschedule issue, upstream
 * timeout, handler OOM), Sentry raises a missed-check-in alert instead of the
 * failure being silent.
 *
 * Schedule must match vercel.json `crons[].schedule` exactly.
 *
 * Usage:
 *   export const GET = withCronCheckIn(
 *     'process-claims',
 *     '*\/5 * * * *',
 *     async (req) => { ... your handler ... },
 *   );
 */

import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

type RouteHandler = (req: Request) => Promise<Response> | Response;

export function withCronCheckIn(
  slug: string,
  schedule: string,
  handler: RouteHandler,
): RouteHandler {
  return async (req: Request): Promise<Response> => {
    const monitorConfig = {
      schedule: { type: 'crontab', value: schedule } as const,
      checkinMargin: 2,       // minutes — lenient for cold starts
      maxRuntime: 15,         // minutes — matches Vercel function timeout
      timezone: 'Etc/UTC',
    };

    try {
      return (await Sentry.withMonitor(slug, () => handler(req), monitorConfig)) as Response;
    } catch (err) {
      // Sentry.withMonitor already captured the error + sent an error check-in.
      // Surface the original error to the caller so existing error handling
      // (e.g. the cron-auth 500 path) still runs.
      Sentry.captureException(err, { tags: { cron_slug: slug } });
      return NextResponse.json(
        { ok: false, error: 'cron_handler_failed', slug },
        { status: 500 },
      );
    }
  };
}
