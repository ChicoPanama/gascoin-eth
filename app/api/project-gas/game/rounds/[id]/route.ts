import { NextRequest, NextResponse } from 'next/server';
import { getClientIp } from '@/lib/ip';
import {
  parseGameIntentId,
  parseResolveGameRoundResult,
  type ResolveGameRoundResult,
} from '@/lib/project-gas/game-adapter';
import {
  getProjectGasActionSource,
  requestProjectGasActionSource,
} from '@/lib/project-gas/authoritative-action-source';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, max-age=0' };

function unavailable(intentId: string, roundId: string, message: string, status = 502) {
  const result: ResolveGameRoundResult = {
    status: 'failed',
    intentId,
    roundId,
    code: 'network-degraded',
    message,
  };
  return NextResponse.json(result, { status, headers: NO_STORE_HEADERS });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const roundId = parseGameIntentId(id);
  const intentId = parseGameIntentId(request.nextUrl.searchParams.get('intentId'));
  if (!roundId || !intentId) {
    return NextResponse.json(
      { error: 'Canonical roundId and intentId are required.' },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const limit = await checkRateLimit(`project-gas:game:round:ip:${getClientIp(request)}`, 120, 60);
  if (!limit.ok) return unavailable(intentId, roundId, 'Round verification is temporarily rate limited.', 429);

  let source;
  try {
    source = getProjectGasActionSource('game');
  } catch {
    return unavailable(intentId, roundId, 'No authoritative round source is configured.', 503);
  }

  try {
    const response = await requestProjectGasActionSource({
      source,
      path: `rounds/${encodeURIComponent(roundId)}?intentId=${encodeURIComponent(intentId)}`,
      method: 'GET',
    });
    const result = parseResolveGameRoundResult(response.body, intentId, roundId);
    if (!result) return unavailable(intentId, roundId, 'The round source returned an unrecognized state.');
    return NextResponse.json(result, { status: 200, headers: NO_STORE_HEADERS });
  } catch {
    return unavailable(intentId, roundId, 'Round state could not be reconciled.');
  }
}
