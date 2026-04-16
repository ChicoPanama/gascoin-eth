/**
 * Site gate cookie — seals gascoin.app behind invite redemption.
 *
 * Used by:
 *   - proxy.ts (validates on every request, redirects to /welcome
 *     if missing or invalid)
 *   - app/api/invites/redeem/route.ts (issues on successful redemption)
 *
 * Format: `<exp>.<hmac>` where
 *   - exp: unix-seconds expiry timestamp (stringified)
 *   - hmac: HMAC-SHA256 of the exp string, using ADMIN_SESSION_SECRET,
 *     base64url-encoded without padding
 *
 * Designed for the Edge runtime:
 *   - Uses Web Crypto (`crypto.subtle`) — no Node-only APIs
 *   - No third-party deps
 *   - ~200 bytes over the wire, HMAC verify is ~1ms
 *
 * The cookie is opaque on the client (HttpOnly). It doesn't store a user
 * ID — the middleware only needs to answer "has this browser successfully
 * redeemed an invite code at some point in the last 90 days?" Server-side
 * routes that need per-user identity still use Privy session verification.
 */

export const GATE_COOKIE_NAME = 'gc_gate';
export const GATE_COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60; // 90 days

const enc = new TextEncoder();

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      'ADMIN_SESSION_SECRET missing or too short (need at least 16 chars for HMAC)'
    );
  }
  return s;
}

/**
 * Encode a string to a plain ArrayBuffer. Necessary because
 * `TextEncoder.encode()` returns `Uint8Array<ArrayBufferLike>` which
 * TypeScript's strict DOM types don't accept as `BufferSource` for
 * `crypto.subtle` calls.
 */
function strToBuf(s: string): ArrayBuffer {
  const u8 = enc.encode(s);
  const ab = new ArrayBuffer(u8.byteLength);
  new Uint8Array(ab).set(u8);
  return ab;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    strToBuf(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function b64urlFromBuf(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bufFromB64url(s: string): ArrayBuffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const ab = new ArrayBuffer(bin.length);
  const out = new Uint8Array(ab);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return ab;
}

/**
 * Sign a new gate cookie.
 */
export async function signGateCookie(opts: { days: number }): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + Math.floor(opts.days * 86400);
  const key = await importKey(getSecret());
  const sig = await crypto.subtle.sign('HMAC', key, strToBuf(String(exp)));
  return `${exp}.${b64urlFromBuf(sig)}`;
}

/**
 * Verify a gate cookie's HMAC AND check expiry. Returns true only if both
 * pass. Any malformed / missing / expired / tampered token returns false.
 */
export async function verifyGateCookie(
  token: string | undefined | null
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) return false;
  const expStr = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp)) return false;
  if (exp < Math.floor(Date.now() / 1000)) return false;
  try {
    const key = await importKey(getSecret());
    const sig = bufFromB64url(sigB64);
    return await crypto.subtle.verify('HMAC', key, sig, strToBuf(expStr));
  } catch {
    return false;
  }
}
