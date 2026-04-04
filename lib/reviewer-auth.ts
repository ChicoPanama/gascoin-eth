import { verifyPrivySession } from './integrations/privy';
import { getSupabaseAdmin } from './supabase';

export type ReviewerIdentity = {
  xId: string;
  xHandle: string;
  role: 'reviewer' | 'admin';
  via: 'rbac' | 'token';
};

function readBearer(req: Request): string {
  const auth = req.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || '';
}

export async function requireReviewer(req: Request): Promise<ReviewerIdentity | null> {
  const breakGlass = (process.env.REVIEWER_API_TOKEN || '').trim();
  const headerToken = String(req.headers.get('x-reviewer-token') || '').trim();
  const bearer = readBearer(req);

  // break-glass token support
  if (breakGlass && (headerToken === breakGlass || bearer === breakGlass)) {
    return { xId: 'break_glass', xHandle: '@break_glass', role: 'admin', via: 'token' };
  }

  // RBAC path via Privy session
  const session = await verifyPrivySession(
    req.headers.get('authorization'),
    {
      xId: req.headers.get('x-privy-user-id') || '',
      xHandle: req.headers.get('x-privy-handle') || '',
      wallet: req.headers.get('x-privy-wallet') || ''
    },
    req.headers.get('cookie')
  );
  if (!session?.xHandle) return null;
  const normalizedHandle = `@${session.xHandle}`.toLowerCase();

  const supabase = getSupabaseAdmin();
  let { data } = await supabase
    .from('admin_users')
    .select('x_user_id,x_handle,role,active')
    .eq('x_user_id', session.xId)
    .eq('active', true)
    .maybeSingle();

  // Fallback for cases where x_user_id isn't populated yet but handle is known.
  if (!data && session.xHandle) {
    const byHandle = await supabase
      .from('admin_users')
      .select('x_user_id,x_handle,role,active')
      .ilike('x_handle', normalizedHandle)
      .eq('active', true)
      .maybeSingle();
    data = byHandle.data || null;
  }

  if (!data) return null;
  const role = String(data.role || 'reviewer');
  if (role !== 'reviewer' && role !== 'admin') return null;

  return {
    xId: data.x_user_id || session.xId,
    xHandle: data.x_handle || `@${session.xHandle}`,
    role: role as 'reviewer' | 'admin',
    via: 'rbac'
  };
}
