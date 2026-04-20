import { NextResponse } from 'next/server';
import { scoreStaleTweets } from '../../../../lib/content-impact';
import { isAuthorizedCron } from '../../../../lib/cron-auth';

export const dynamic = 'force-dynamic';

/**
 * Gas Network Piece 2 — Content Impact Scoring Worker.
 * Hourly cron (offset 30 min from score-engagement so fresh metrics
 * are picked up before impact recomputation).
 */
export async function POST(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await scoreStaleTweets(200, 60 * 60 * 1000);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}

// Vercel Cron sends GET requests; delegate to the POST handler above.
export const GET = POST;
