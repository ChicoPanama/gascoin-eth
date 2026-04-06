import { NextResponse } from 'next/server';
import { verifyPrivySession } from '../../../../lib/integrations/privy';
import { checkRateLimit } from '../../../../lib/rate-limit';

function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export async function GET(req: Request) {
  // SECURITY: Rate limit session checks to prevent enumeration
  const rl = await checkRateLimit(`auth_session:${clientIp(req)}`, 30, 60);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const auth = req.headers.get('authorization');
  const session = await verifyPrivySession(auth, undefined, req.headers.get('cookie'));
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, session });
}
