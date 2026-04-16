import { NextResponse } from 'next/server';
import { verifyPrivySession } from '../../../../lib/integrations/privy';
import { checkRateLimit } from '../../../../lib/rate-limit';
import { getClientIp } from '../../../../lib/ip';

export async function GET(req: Request) {
  // SECURITY: Rate limit session checks to prevent enumeration
  const rl = await checkRateLimit(`auth_session:${getClientIp(req)}`, 30, 60);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const auth = req.headers.get('authorization');
  const session = await verifyPrivySession(auth, undefined, req.headers.get('cookie'));
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, session });
}
