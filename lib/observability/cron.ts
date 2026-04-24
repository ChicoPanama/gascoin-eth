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
      maxRuntime: 6,          // minutes — slightly above Vercel Pro's 5min cap
      timezone: 'Etc/UTC',
    };

    try {
      const result = (await Sentry.withMonitor(slug, () => handler(req), monitorConfig)) as Response;
      // Flush the monitor check-in before the Vercel serverless container
      // freezes — otherwise the "ok" event can be buffered and never sent,
      // which trips Sentry's missed-check-in alert.
      await Sentry.flush(2000).catch(() => {});
      return result;
    } catch (err) {
      // Sentry.withMonitor already captured the error + sent an error check-in.
      // Surface the original error to the caller so existing error handling
      // (e.g. the cron-auth 500 path) still runs.
      Sentry.captureException(err, { tags: { cron_slug: slug } });
      await Sentry.flush(2000).catch(() => {});
      return NextResponse.json(
        { ok: false, error: 'cron_handler_failed', slug },
        { status: 500 },
      );
    }
  };
}
