import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getProjectGasReadSource,
  ReadSourceError,
  requestProjectGasReadSource,
} from '@/lib/project-gas/authoritative-read-source';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('Project GAS authoritative read transport', () => {
  it('fails closed when a source is unconfigured or insecure', () => {
    vi.stubEnv('PROJECT_GAS_RESERVE_READ_URL', '');
    expect(() => getProjectGasReadSource('reserve')).toThrowError(ReadSourceError);

    vi.stubEnv('PROJECT_GAS_RESERVE_READ_URL', 'http://reserve.example/snapshot');
    expect(() => getProjectGasReadSource('reserve')).toThrow(/HTTPS/);
  });

  it.each([
    'https://user:secret@reserve.example/snapshot',
    'https://reserve.example/snapshot?unsafe=1',
    'https://reserve.example/snapshot#fragment',
  ])('rejects unsafe source configuration: %s', (url) => {
    vi.stubEnv('PROJECT_GAS_RESERVE_READ_URL', url);
    expect(() => getProjectGasReadSource('reserve')).toThrowError(ReadSourceError);
  });

  it('permits loopback HTTP outside production for local integration', () => {
    vi.stubEnv('PROJECT_GAS_ACTIVITY_READ_URL', 'http://127.0.0.1:4100/activity');
    expect(getProjectGasReadSource('activity').url.href).toBe('http://127.0.0.1:4100/activity');
  });

  it('does not follow redirects and forwards only the configured bearer token', async () => {
    vi.stubEnv('PROJECT_GAS_TRADE_QUOTE_READ_URL', 'https://quotes.example/v1/quote');
    vi.stubEnv('PROJECT_GAS_TRADE_QUOTE_READ_TOKEN', 'source-secret');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const source = getProjectGasReadSource('trade-quote');
    const result = await requestProjectGasReadSource({
      source,
      searchParams: { side: 'buy', amount: '10' },
    });

    expect(result).toEqual({ status: 200, body: { status: 'ok' } });
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.href).toBe('https://quotes.example/v1/quote?side=buy&amount=10');
    expect(source.url.href).toBe('https://quotes.example/v1/quote');
    expect(init).toMatchObject({ method: 'GET', cache: 'no-store', redirect: 'error' });
    expect(init.headers).toMatchObject({
      Accept: 'application/json',
      Authorization: 'Bearer source-secret',
    });
  });

  it('rejects invalid JSON and oversized UTF-8 responses', async () => {
    const source = { url: new URL('https://reserve.example/snapshot') };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('not-json', { status: 200 })));
    await expect(requestProjectGasReadSource({ source })).rejects.toMatchObject({
      code: 'invalid-response',
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('é'.repeat(500_001), { status: 200 })));
    await expect(requestProjectGasReadSource({ source })).rejects.toMatchObject({
      code: 'invalid-response',
    });
  });
});
