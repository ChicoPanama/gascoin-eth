export type ProjectGasActionDomain = 'game' | 'trade' | 'account';

export interface ProjectGasActionSource {
  baseUrl: URL;
  token?: string;
}

export class ActionSourceError extends Error {
  constructor(
    readonly code: 'unconfigured' | 'invalid-config' | 'timeout' | 'network' | 'invalid-response',
    readonly mayHaveReachedSource: boolean,
    message: string,
  ) {
    super(message);
    this.name = 'ActionSourceError';
  }
}

function sourceEnv(domain: ProjectGasActionDomain): { url?: string; token?: string } {
  if (domain === 'game') {
    return {
      url: process.env.PROJECT_GAS_GAME_EXECUTION_URL,
      token: process.env.PROJECT_GAS_GAME_EXECUTION_TOKEN,
    };
  }
  if (domain === 'trade') {
    return {
      url: process.env.PROJECT_GAS_TRADE_EXECUTION_URL,
      token: process.env.PROJECT_GAS_TRADE_EXECUTION_TOKEN,
    };
  }
  return {
    url: process.env.PROJECT_GAS_ACCOUNT_ACTION_URL,
    token: process.env.PROJECT_GAS_ACCOUNT_ACTION_TOKEN,
  };
}

export function getProjectGasActionSource(domain: ProjectGasActionDomain): ProjectGasActionSource {
  const env = sourceEnv(domain);
  const raw = env.url?.trim();
  if (!raw) {
    throw new ActionSourceError('unconfigured', false, `${domain} action source is not configured.`);
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(raw.endsWith('/') ? raw : `${raw}/`);
  } catch {
    throw new ActionSourceError('invalid-config', false, `${domain} action source URL is invalid.`);
  }

  const localDevelopment = process.env.NODE_ENV !== 'production'
    && baseUrl.protocol === 'http:'
    && (baseUrl.hostname === 'localhost' || baseUrl.hostname === '127.0.0.1');
  if (baseUrl.protocol !== 'https:' && !localDevelopment) {
    throw new ActionSourceError('invalid-config', false, `${domain} action source must use HTTPS.`);
  }
  if (baseUrl.username || baseUrl.password) {
    throw new ActionSourceError('invalid-config', false, `${domain} action source must not contain URL credentials.`);
  }
  if (baseUrl.search || baseUrl.hash) {
    throw new ActionSourceError('invalid-config', false, `${domain} action source must not contain a query or fragment.`);
  }

  return { baseUrl, token: env.token?.trim() || undefined };
}

export async function requestProjectGasActionSource({
  source,
  path,
  method,
  body,
  userId,
  wallet,
  idempotencyKey,
}: {
  source: ProjectGasActionSource;
  path: string;
  method: 'GET' | 'POST';
  body?: unknown;
  userId?: string;
  wallet?: string;
  idempotencyKey?: string;
}): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const mayHaveReachedSource = method === 'POST';

  try {
    const normalizedPath = path.replace(/^\/+/, '');
    const targetUrl = new URL(normalizedPath, source.baseUrl);
    if (targetUrl.origin !== source.baseUrl.origin
      || !targetUrl.pathname.startsWith(source.baseUrl.pathname)) {
      throw new ActionSourceError('invalid-config', false, 'Action source path escaped its configured base URL.');
    }

    const response = await fetch(targetUrl, {
      method,
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(source.token ? { Authorization: `Bearer ${source.token}` } : {}),
        ...(userId ? { 'X-Project-GAS-User-ID': userId } : {}),
        ...(wallet ? { 'X-Project-GAS-Wallet': wallet } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const contentLength = Number(response.headers.get('content-length') || '0');
    if (contentLength > 1_000_000) {
      throw new ActionSourceError('invalid-response', mayHaveReachedSource, 'Action source response exceeded the size limit.');
    }

    const text = await response.text();
    if (text.length > 1_000_000) {
      throw new ActionSourceError('invalid-response', mayHaveReachedSource, 'Action source response exceeded the size limit.');
    }

    let parsed: unknown = {};
    if (text) {
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        throw new ActionSourceError('invalid-response', mayHaveReachedSource, 'Action source returned invalid JSON.');
      }
    }
    return { status: response.status, body: parsed };
  } catch (error) {
    if (error instanceof ActionSourceError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ActionSourceError('timeout', mayHaveReachedSource, 'Action source timed out.');
    }
    throw new ActionSourceError('network', mayHaveReachedSource, 'Action source could not be reached.');
  } finally {
    clearTimeout(timeout);
  }
}
