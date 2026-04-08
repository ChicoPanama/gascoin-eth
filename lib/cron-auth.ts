import { timingSafeEqual } from 'crypto';

/**
 * SECURITY: Timing-safe cron worker authentication.
 * Prevents timing attacks on the CRON_SECRET comparison.
 */
export function isAuthorizedCron(req: Request): boolean {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  const auth = req.headers.get('authorization') || '';
  const expected = `Bearer ${secret}`;
  if (auth.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(auth, 'utf8'), Buffer.from(expected, 'utf8'));
  } catch {
    return false;
  }
}
