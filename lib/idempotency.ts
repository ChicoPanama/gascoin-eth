import crypto from 'crypto';

export function hashRequestBody(body: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(body || {})).digest('hex');
}

export function resolveIdempotencyKey(headers: Headers, fallbackSeed: string): string {
  const k = headers.get('idempotency-key') || headers.get('x-idempotency-key') || '';
  if (k.trim()) return k.trim();
  return `auto_${crypto.createHash('sha256').update(fallbackSeed).digest('hex').slice(0, 24)}`;
}
