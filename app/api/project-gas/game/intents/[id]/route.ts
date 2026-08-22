import { NextResponse } from 'next/server';
import { getClientIp } from '@/lib/ip';
import { verifyPrivySession } from '@/lib/integrations/privy';
import {
  parseGameIntentId,
  parseReconcileGameIntentResult,
  type ReconcileGameIntentResult,
} from '@/lib/project-gas/game-adapter';
import {
  getProjectGasActionSource,
  requestProjectGasActionSource,
} from '@/lib/project-gas/authoritative-action-source';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, max-age=0' };

function unknown(intentId: string, message: string, status = 502) {
  const result: ReconcileGameIntentResult = {
    status: 'unknown',
    intentId,
    retrySafe: false,
    message,
  };
  return NextResponse.json(result, { status, headers: NO_STORE_HEADERS });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const intentId = parseGameIntentId(id);
  if (!intentId) {
    return NextResponse.json({ error: 'Invalid wager intent id.' }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const ipLimit = await checkRateLimit(`project-gas:game:reconcile:ip:${getClientIp(request)}`, 120, 60);
  if (!ipLimit.ok) return unknown(intentId, 'Status checks are temporarily rate limited.', 429);

  const session = await verifyPrivySession(
    request.headers.get('authorization'),
    undefined,
    request.headers.get('cookie'),
    { requireXHandle: false },
  );
  if (!session) return unknown(intentId, 'Sign in again to reconcile this wager.', 401);

  const userLimit = await checkRateLimit(`project-gas:game:reconcile:user:${session.xId}`, 60, 60);
  if (!userLimit.ok) return unknown(intentId, 'Status checks are temporarily rate limited.', 429);

  let source;
  try {
    source = getProjectGasActionSource('game');
  } catch {
    return unknown(intentId, 'The authoritative wager source is not configured. Do not resubmit.');
  }

  try {
    const response = await requestProjectGasActionSource({
      source,
      path: `intents/${encodeURIComponent(intentId)}`,
      method: 'GET',
      userId: session.xId,
      wallet: session.wallet || undefined,
    });

    if (response.status === 404) {
      const result: ReconcileGameIntentResult = {
        status: 'not-found',
        intentId,
        retrySafe: true,
        message: 'No wager was created for this intent.',
      };
      return NextResponse.json(result, { status: 200, headers: NO_STORE_HEADERS });
    }

    const result = parseReconcileGameIntentResult(response.body, intentId);
    if (!result) {
      return unknown(intentId, 'The wager source returned an unrecognized status. Do not resubmit.');
    }
    return NextResponse.json(result, { status: 200, headers: NO_STORE_HEADERS });
  } catch {
    return unknown(intentId, 'The wager status could not be reconciled. Do not resubmit.');
  }
}
