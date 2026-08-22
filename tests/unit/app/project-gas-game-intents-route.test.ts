import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/ip', () => ({ getClientIp: () => '203.0.113.7' }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: vi.fn() }));
vi.mock('@/lib/integrations/privy', () => ({ verifyPrivySession: vi.fn() }));
vi.mock('@/lib/project-gas/authoritative-action-source', () => {
  class ActionSourceError extends Error {
    constructor(
      readonly code: 'unconfigured' | 'invalid-config' | 'timeout' | 'network' | 'invalid-response',
      readonly mayHaveReachedSource: boolean,
      message: string,
    ) {
      super(message);
      this.name = 'ActionSourceError';
    }
  }
  return {
    ActionSourceError,
    getProjectGasActionSource: vi.fn(),
    requestProjectGasActionSource: vi.fn(),
  };
});

import { verifyPrivySession } from '@/lib/integrations/privy';
import {
  ActionSourceError,
  getProjectGasActionSource,
  requestProjectGasActionSource,
} from '@/lib/project-gas/authoritative-action-source';
import { checkRateLimit } from '@/lib/rate-limit';
import { POST } from '@/app/api/project-gas/game/intents/route';

const intent = {
  intentId: 'gas-intent-route-1',
  createdAt: '2099-08-22T12:00:00.000Z',
  expiresAt: '2099-08-22T12:01:00.000Z',
  wager: { mode: 'BOOST', entryAsset: 'USDC', entryAmount: '25' },
} as const;

function request(overrides?: { authorization?: boolean; idempotencyKey?: string; body?: unknown }) {
  return new Request('http://localhost/api/project-gas/game/intents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(overrides?.authorization === false ? {} : { Authorization: 'Bearer privy-access-token' }),
      'Idempotency-Key': overrides?.idempotencyKey ?? intent.intentId,
    },
    body: JSON.stringify(overrides?.body ?? intent),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(checkRateLimit).mockResolvedValue({
    ok: true,
    count: 1,
    limit: 30,
    remaining: 29,
    resetSec: 60,
    mode: 'memory',
  });
  vi.mocked(verifyPrivySession).mockResolvedValue({
    xId: 'did:privy:gas-user',
    xHandle: '',
    xVerified: false,
    wallet: '0x1111111111111111111111111111111111111111',
    xSubjectId: '',
  });
  vi.mocked(getProjectGasActionSource).mockReturnValue({ baseUrl: new URL('https://executor.example/') });
});

describe('Project GAS wager intent route', () => {
  it('requires explicit bearer authentication before calling the money source', async () => {
    const response = await POST(request({ authorization: false }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toMatchObject({
      status: 'rejected',
      code: 'authorization-required',
      fundsMoved: false,
      retrySafe: true,
    });
    expect(requestProjectGasActionSource).not.toHaveBeenCalled();
  });

  it('forwards a canonical intent with matching idempotency and user identity', async () => {
    vi.mocked(requestProjectGasActionSource).mockResolvedValue({
      status: 201,
      body: {
        status: 'accepted',
        intentId: intent.intentId,
        roundId: 'base-round-route-1',
        acceptedAt: '2099-08-22T12:00:01.000Z',
        wagerAsset: 'GAS',
        wagerAmount: '24.5',
        fundsMoved: true,
      },
    });

    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: 'accepted', wagerAsset: 'GAS' });
    expect(requestProjectGasActionSource).toHaveBeenCalledWith(expect.objectContaining({
      path: 'intents',
      method: 'POST',
      idempotencyKey: intent.intentId,
      userId: 'did:privy:gas-user',
    }));
  });

  it('blocks mismatched idempotency before the execution source', async () => {
    const response = await POST(request({ body: { ...intent, intentId: 'different-intent' } }));
    await expect(response.json()).resolves.toMatchObject({
      status: 'rejected',
      code: 'validation-failed',
      fundsMoved: false,
    });
    expect(requestProjectGasActionSource).not.toHaveBeenCalled();
  });

  it('classifies a timed-out POST as unknown and never retry-safe', async () => {
    vi.mocked(requestProjectGasActionSource).mockRejectedValue(
      new ActionSourceError('timeout', true, 'Action source timed out.'),
    );

    const response = await POST(request());
    const body = await response.json();
    expect(response.status).toBe(504);
    expect(body).toMatchObject({ status: 'unknown', fundsMoved: 'unknown' });
    expect(body).not.toHaveProperty('retrySafe', true);
  });

  it('keeps an unconfigured pre-send failure explicitly safe', async () => {
    vi.mocked(getProjectGasActionSource).mockImplementation(() => {
      throw new ActionSourceError('unconfigured', false, 'game action source is not configured.');
    });

    const response = await POST(request());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: 'rejected',
      code: 'transaction-failed',
      fundsMoved: false,
      retrySafe: true,
    });
  });
});
