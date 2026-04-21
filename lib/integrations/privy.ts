import { PrivyClient } from '@privy-io/node';

export type SessionIdentity = {
  /**
   * Privy's internal user DID (e.g. `did:privy:cmo7qzbzt006o0cl1igvah732`).
   * Used for our users table row id, audit log actor id, rate-limit keys.
   * NOT the X/Twitter numeric user ID — use `xSubjectId` for SISMEMBER
   * lookups against the @GasCoinApp follower cache.
   */
  xId: string;
  xHandle: string;
  xVerified: boolean;
  wallet: string;
  /**
   * X (Twitter) numeric user ID extracted from Privy's linked_accounts
   * twitter_oauth.subject. Empty string if unavailable. This is the value
   * the X API returns in its /users/:id/followers response — use it for
   * follower-cache membership checks.
   *
   * Historical bug (fixed 2026-04-21): previously callers passed `xId`
   * (a Privy DID) to `isFollowingGascoin`, which never matched entries
   * in the cached follower set, so follows_gascoin always failed for
   * legitimate followers.
   */
  xSubjectId: string;
};

export type SessionHints = {
  xId?: string;
  xHandle?: string;
  wallet?: string;
};

export type VerifyPrivyOptions = {
  allowHintFallback?: boolean;
};

let _privy: PrivyClient | null = null;

function getPrivyClient(): PrivyClient | null {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) return null;
  if (_privy) return _privy;
  _privy = new PrivyClient({ appId, appSecret });
  return _privy;
}

function parseBearer(authHeader?: string | null): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

function parseCookieToken(cookieHeader?: string | null): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';').map((p) => p.trim());
  for (const p of parts) {
    const i = p.indexOf('=');
    if (i <= 0) continue;
    const k = p.slice(0, i);
    const v = p.slice(i + 1);
    if (k === 'privy-token' || k === 'privy_access_token') {
      try {
        return decodeURIComponent(v);
      } catch {
        return v;
      }
    }
  }
  return null;
}

/**
 * Phase 2.5: attempts real Privy session verification.
 * If Privy env/config is missing or API call fails, returns null.
 */
export async function verifyPrivySession(
  authHeader?: string | null,
  hints?: SessionHints,
  cookieHeader?: string | null,
  options?: VerifyPrivyOptions
): Promise<SessionIdentity | null> {
  const token = parseBearer(authHeader) || parseCookieToken(cookieHeader);
  if (!token) return null;

  // S1: Mock auth is a development-only escape hatch. Refuse in production even
  // if DEV_ALLOW_MOCK_AUTH is accidentally set to 'true' on the Vercel project.
  if (process.env.DEV_ALLOW_MOCK_AUTH === 'true' && process.env.NODE_ENV !== 'production' && token === 'mock-dev-token') {
    return {
      xId: 'x_mock_001',
      xHandle: 'mockuser',
      xVerified: true,
      wallet: 'MockWallet111111111111111111111111111111111',
      xSubjectId: ''
    };
  }

  const privy = getPrivyClient();
  if (!privy) return null;

  try {
    // Official server flow: verify token first.
    const claims = await privy.utils().auth().verifyAccessToken(token);
    const xId = String(claims.user_id || '');
    if (!xId) return null;

    let xHandle = String(hints?.xHandle || '').replace(/^@/, '');
    let wallet = String(hints?.wallet || '');
    let xVerified = false;
    let xSubjectId = '';

    // Best effort: fetch full user profile for authoritative linked accounts.
    try {
      const user: any = await privy.users()._get(xId);
      const linked = Array.isArray(user?.linked_accounts) ? user.linked_accounts : [];
      const twitter = linked.find((a: any) => a?.type === 'twitter_oauth');
      const linkedWallet = (linked.find((a: any) => a?.type === 'wallet') as any)?.address || '';

      if (twitter?.username) {
        xHandle = String(twitter.username).replace(/^@/, '');
        // NOTE: xVerified stays false here. A linked Twitter OAuth account is
        // NOT the same as "has a verified blue checkmark". The authoritative
        // verification signal comes from the X API (verified_type) and is
        // applied in the claim-submit pipeline, not here.
      }
      // Privy's twitter_oauth.subject is the X numeric user ID (e.g.
      // "1461529800"). This is what the X API /users/:id/followers call
      // returns in its list, so this is what SISMEMBER against the
      // @GasCoinApp follower cache needs to compare.
      if (twitter?.subject) {
        xSubjectId = String(twitter.subject);
      }
      if (linkedWallet) wallet = String(linkedWallet);
    } catch {
      // keep token-verified identity + client hints fallback
    }

    if (!xHandle) return null;

    return {
      xId,
      xHandle,
      xVerified,
      wallet: String(wallet || ''),
      xSubjectId
    };
  } catch {
    if (options?.allowHintFallback) {
      const fallbackId = String(hints?.xId || '').trim();
      const fallbackHandle = String(hints?.xHandle || '').replace(/^@/, '').trim();
      const fallbackWallet = String(hints?.wallet || '').trim();
      if (fallbackId && fallbackHandle) {
        return {
          xId: fallbackId,
          xHandle: fallbackHandle,
          xVerified: false,
          wallet: fallbackWallet,
          xSubjectId: ''
        };
      }
    }
    return null;
  }
}
