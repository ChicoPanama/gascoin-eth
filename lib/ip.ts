/**
 * Returns the real client IP from Vercel-injected headers.
 *
 * On Vercel, x-real-ip is set by the edge to the actual client IP and is
 * not spoofable by the client. x-forwarded-for is a chain where the client
 * can prepend arbitrary values — reading the first entry is the classic
 * IP-spoofing vector. We use x-real-ip as the authoritative source and fall
 * back to the last entry in x-forwarded-for (added by the most recent
 * trusted proxy) for non-Vercel environments.
 */
export function getClientIp(req: Request): string {
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const xff = req.headers.get('x-forwarded-for') || '';
  const entries = xff.split(',').map((s) => s.trim()).filter(Boolean);
  return entries[entries.length - 1] || 'unknown';
}
