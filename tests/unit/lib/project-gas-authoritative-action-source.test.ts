import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getProjectGasActionSource,
  requestProjectGasActionSource,
} from '@/lib/project-gas/authoritative-action-source';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('Project GAS authoritative action transport', () => {
  it('requires a secure configured source without embedded credentials', () => {
    vi.stubEnv('PROJECT_GAS_GAME_EXECUTION_URL', 'http://game.example/api');
    expect(() => getProjectGasActionSource('game')).toThrow(/HTTPS/);

    vi.stubEnv('PROJECT_GAS_GAME_EXECUTION_URL', 'https://user:secret@game.example/api');
    expect(() => getProjectGasActionSource('game')).toThrow(/credentials/);
  });

  it('rejects a path that escapes the configured source before fetching', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestProjectGasActionSource({
      source: { baseUrl: new URL('https://game.example/v1/') },
      path: '../outside',
      method: 'GET',
    })).rejects.toMatchObject({ code: 'invalid-config', mayHaveReachedSource: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses no-redirect JSON transport and forwards action identity headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'accepted' }), {
      status: 202,
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestProjectGasActionSource({
      source: { baseUrl: new URL('https://game.example/v1/'), token: 'source-secret' },
      path: 'intents',
      method: 'POST',
      body: { intentId: 'intent-1' },
      userId: 'did:privy:user-1',
      wallet: '0x0000000000000000000000000000000000000001',
      idempotencyKey: 'intent-1',
    });

    expect(result).toEqual({ status: 202, body: { status: 'accepted' } });
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.href).toBe('https://game.example/v1/intents');
    expect(init).toMatchObject({ method: 'POST', cache: 'no-store', redirect: 'error' });
    expect(init.headers).toMatchObject({
      Accept: 'application/json',
      Authorization: 'Bearer source-secret',
      'Idempotency-Key': 'intent-1',
      'X-Project-GAS-User-ID': 'did:privy:user-1',
    });
  });

  it('marks an oversized POST response unknown instead of retry-safe', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('x'.repeat(1_000_001), {
      status: 200,
    })));

    await expect(requestProjectGasActionSource({
      source: { baseUrl: new URL('https://game.example/v1/') },
      path: 'intents',
      method: 'POST',
      body: { intentId: 'intent-1' },
    })).rejects.toMatchObject({
      code: 'invalid-response',
      mayHaveReachedSource: true,
    });
  });
});
