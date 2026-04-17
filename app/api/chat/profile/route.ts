import { verifyPrivySession } from '../../../../lib/integrations/privy';
import { getUserChatProfile } from '../../../../lib/chat-user-profile';

export const runtime = 'nodejs';

/**
 * GET /api/chat/profile
 *
 * Returns the authenticated user's chat profile for the personalized
 * welcome message. Requires Privy session. Returns 401 if not authenticated.
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const session = await verifyPrivySession(
    auth,
    {
      xId: req.headers.get('x-privy-user-id') || '',
      xHandle: req.headers.get('x-privy-handle') || '',
      wallet: req.headers.get('x-privy-wallet') || '',
    },
    req.headers.get('cookie'),
  ).catch(() => null);

  if (!session?.wallet) {
    return Response.json(null, { status: 401 });
  }

  try {
    const profile = await getUserChatProfile(session.wallet);
    return Response.json(profile);
  } catch {
    return Response.json(null, { status: 500 });
  }
}
