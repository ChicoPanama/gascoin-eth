import { NextResponse } from 'next/server';
import { getClientIp } from '@/lib/ip';
import { verifyPrivySession } from '@/lib/integrations/privy';
import {
  parseCreateGameIntentInput,
  parseGameIntentId,
  parseSubmitGameIntentResult,
  type RejectedGameIntent,
  type SubmitGameIntentResult,
} from '@/lib/project-gas/game-adapter';
import {
  ActionSourceError,
  getProjectGasActionSource,
  requestProjectGasActionSource,
} from '@/lib/project-gas/authoritative-action-source';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, max-age=0' };
const MAX_BODY_BYTES = 64_000;

function rejected(
  intentId: string,
  code: RejectedGameIntent['code'],
  message: string,
  status: number,
) {
  const result: RejectedGameIntent = {
    status: 'rejected',
    intentId,
    code,
    message,
    retrySafe: true,
    fundsMoved: false,
  };
  return NextResponse.json(result, { status, headers: NO_STORE_HEADERS });
}

function unknown(intentId: string, message: string, status = 502) {
  const result: SubmitGameIntentResult = {
    status: 'unknown',
    intentId,
    message,
    fundsMoved: 'unknown',
  };
  return NextResponse.json(result, { status, headers: NO_STORE_HEADERS });
}

export async function POST(request: Request) {
  const intentId = parseGameIntentId(request.headers.get('idempotency-key'));
  if (!intentId) {
    return NextResponse.json(
      { error: 'A canonical Idempotency-Key is required.' },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const ipLimit = await checkRateLimit(`project-gas:game:submit:ip:${getClientIp(request)}`, 30, 60);
  if (!ipLimit.ok) {
    return rejected(intentId, 'transaction-failed', 'Too many wager attempts. Wait before trying again.', 429);
  }

  // Mutating money routes require an explicit bearer token. Cookie-only auth is
  // intentionally not accepted here so a cross-site request cannot submit a wager.
  const authorization = request.headers.get('authorization');
  const session = authorization
    ? await verifyPrivySession(authorization, undefined, undefined, { requireXHandle: false })
    : null;
  if (!session) {
    return rejected(intentId, 'authorization-required', 'Sign in again before submitting this wager.', 401);
  }

  const userLimit = await checkRateLimit(`project-gas:game:submit:user:${session.xId}`, 12, 60);
  if (!userLimit.ok) {
    return rejected(intentId, 'transaction-failed', 'Too many wager attempts. Wait before trying again.', 429);
  }

  const declaredLength = Number(request.headers.get('content-length') || '0');
  if (declaredLength > MAX_BODY_BYTES) {
    return rejected(intentId, 'validation-failed', 'Wager request exceeded the size limit.', 413);
  }

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return rejected(intentId, 'validation-failed', 'Wager request exceeded the size limit.', 413);
    }
    raw = JSON.parse(text) as unknown;
  } catch {
    return rejected(intentId, 'validation-failed', 'Wager request was not valid JSON.', 400);
  }

  const input = parseCreateGameIntentInput(raw);
  if (!input || input.intentId !== intentId) {
    return rejected(intentId, 'validation-failed', 'Wager intent is invalid or does not match its idempotency key.', 400);
  }
  if (input.expiresAt && Date.parse(input.expiresAt) <= Date.now()) {
    return rejected(intentId, 'intent-expired', 'This wager intent expired before submission.', 409);
  }

  let source;
  try {
    source = getProjectGasActionSource('game');
  } catch (error) {
    const message = error instanceof ActionSourceError
      ? error.message
      : 'The authoritative wager source is unavailable.';
    return rejected(intentId, 'transaction-failed', message, 503);
  }

  try {
    const response = await requestProjectGasActionSource({
      source,
      path: 'intents',
      method: 'POST',
      body: input,
      userId: session.xId,
      wallet: session.wallet || undefined,
      idempotencyKey: intentId,
    });
    const result = parseSubmitGameIntentResult(response.body, intentId);

    // Once the source received a POST, malformed or contradictory output is
    // never treated as safe to retry. Reconciliation owns the next action.
    if (!result) {
      return unknown(intentId, 'The wager source returned an unrecognized state. Check status before retrying.');
    }
    return NextResponse.json(result, { status: 200, headers: NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof ActionSourceError && !error.mayHaveReachedSource) {
      return rejected(intentId, 'transaction-failed', error.message, 503);
    }
    const message = error instanceof ActionSourceError
      ? `${error.message} Check status before retrying.`
      : 'The wager response is unknown. Check status before retrying.';
    return unknown(intentId, message, error instanceof ActionSourceError && error.code === 'timeout' ? 504 : 502);
  }
}
