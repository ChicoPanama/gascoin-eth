export type ProjectGasReadDomain = 'reserve' | 'activity' | 'crews' | 'trade-quote';

export interface ProjectGasReadSource {
  url: URL;
  token?: string;
}

export class ReadSourceError extends Error {
  constructor(
    readonly code: 'unconfigured' | 'invalid-config' | 'timeout' | 'network' | 'invalid-response',
    message: string,
  ) {
    super(message);
    this.name = 'ReadSourceError';
  }
}

const MAX_RESPONSE_BYTES = 1_000_000;

async function readBoundedResponseText(response: Response): Promise<string> {
  if (!response.body) return '';

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = '';

  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytesRead += chunk.value.byteLength;
      if (bytesRead > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new ReadSourceError('invalid-response', 'Read source response exceeded the size limit.');
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function sourceEnv(domain: ProjectGasReadDomain): { url?: string; token?: string } {
  if (domain === 'reserve') {
    return {
      url: process.env.PROJECT_GAS_RESERVE_READ_URL,
      token: process.env.PROJECT_GAS_RESERVE_READ_TOKEN,
    };
  }
  if (domain === 'activity') {
    return {
      url: process.env.PROJECT_GAS_ACTIVITY_READ_URL,
      token: process.env.PROJECT_GAS_ACTIVITY_READ_TOKEN,
    };
  }
  if (domain === 'crews') {
    return {
      url: process.env.PROJECT_GAS_CREWS_READ_URL,
      token: process.env.PROJECT_GAS_CREWS_READ_TOKEN,
    };
  }
  return {
    url: process.env.PROJECT_GAS_TRADE_QUOTE_READ_URL,
    token: process.env.PROJECT_GAS_TRADE_QUOTE_READ_TOKEN,
  };
}

export function getProjectGasReadSource(domain: ProjectGasReadDomain): ProjectGasReadSource {
  const env = sourceEnv(domain);
  const raw = env.url?.trim();
  if (!raw) throw new ReadSourceError('unconfigured', `${domain} read source is not configured.`);

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ReadSourceError('invalid-config', `${domain} read source URL is invalid.`);
  }

  const localDevelopment = process.env.NODE_ENV !== 'production'
    && url.protocol === 'http:'
    && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  if (url.protocol !== 'https:' && !localDevelopment) {
    throw new ReadSourceError('invalid-config', `${domain} read source must use HTTPS.`);
  }
  if (url.username || url.password) {
    throw new ReadSourceError('invalid-config', `${domain} read source must not contain URL credentials.`);
  }
  if (url.search || url.hash) {
    throw new ReadSourceError('invalid-config', `${domain} read source must not contain a query or fragment.`);
  }

  return { url, token: env.token?.trim() || undefined };
}

export async function requestProjectGasReadSource({
  source,
  searchParams,
}: {
  source: ProjectGasReadSource;
  searchParams?: Readonly<Record<string, string>>;
}): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  const target = new URL(source.url);
  Object.entries(searchParams ?? {}).forEach(([key, value]) => target.searchParams.set(key, value));

  try {
    const response = await fetch(target, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(source.token ? { Authorization: `Bearer ${source.token}` } : {}),
      },
    });

    const contentLength = Number(response.headers.get('content-length') || '0');
    if (contentLength > MAX_RESPONSE_BYTES) {
      throw new ReadSourceError('invalid-response', 'Read source response exceeded the size limit.');
    }

    const text = await readBoundedResponseText(response);

    let body: unknown = {};
    if (text) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        throw new ReadSourceError('invalid-response', 'Read source returned invalid JSON.');
      }
    }
    return { status: response.status, body };
  } catch (error) {
    if (error instanceof ReadSourceError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ReadSourceError('timeout', 'Read source timed out.');
    }
    throw new ReadSourceError('network', 'Read source could not be reached.');
  } finally {
    clearTimeout(timeout);
  }
}
