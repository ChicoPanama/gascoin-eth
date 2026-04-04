import { NextResponse } from 'next/server';
import { verifyPrivySession } from '../../../../lib/integrations/privy';

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const session = await verifyPrivySession(auth, undefined, req.headers.get('cookie'));
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, session });
}
