'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { randomBytes } from 'crypto';
import { ed25519 } from '@noble/curves/ed25519';
import { PublicKey } from '@solana/web3.js';
import { isAdminWallet } from '../../lib/admin-auth';
import { getSupabaseAdmin } from '../../lib/supabase';

export async function createAdminSession(walletAddress: string, timestamp: number, signatureHex: string): Promise<{ success: boolean; error?: string }> {
  if (!isAdminWallet(walletAddress)) return { success: false, error: 'Wallet not authorized' };
  if (Math.abs(Date.now() - timestamp) > 300000) return { success: false, error: 'Challenge expired' };

  // Verify the Ed25519 signature — proves the caller owns the private key
  // corresponding to walletAddress, not just that they know the address string.
  try {
    const msgBytes = Buffer.from(`GASCOIN_ADMIN_AUTH:${timestamp}:${walletAddress}`);
    const sigBytes = Buffer.from(signatureHex, 'hex');
    const pubkeyBytes = new PublicKey(walletAddress).toBytes();
    const valid = ed25519.verify(sigBytes, msgBytes, pubkeyBytes);
    if (!valid) return { success: false, error: 'Signature invalid' };
  } catch {
    return { success: false, error: 'Signature verification failed' };
  }

  // SECURITY: Use cryptographically random token instead of deterministic hash
  const sessionToken = randomBytes(32).toString('hex');

  const supabase = getSupabaseAdmin();
  await supabase.from('admin_sessions').upsert({
    wallet_address: walletAddress,
    session_token: sessionToken,
    expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  }, { onConflict: 'wallet_address' });

  const jar = await cookies();
  jar.set('gascoin_admin_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60,
    path: '/',
  });

  return { success: true };
}

/**
 * Create admin session via Privy (X login).
 * Checks admin_users table for the X user ID — same RBAC as reviewer-auth.
 */
export async function createAdminSessionViaPrivy(xUserId: string, xHandle: string): Promise<{ success: boolean; error?: string }> {
  if (!xUserId || !xHandle) return { success: false, error: 'Missing X identity' };

  const supabase = getSupabaseAdmin();
  const normalizedHandle = `@${xHandle.replace(/^@/, '')}`.toLowerCase();

  // Check admin_users table — try multiple ID formats
  // Privy sends user.id as "did:privy:...", but admin_users might have
  // the Twitter numeric ID, the Privy DID, or a handle-based key
  let adminRow = null;

  // Try 1: exact x_user_id match (Privy DID or Twitter ID)
  const { data: byId } = await supabase
    .from('admin_users')
    .select('x_user_id,x_handle,role,active')
    .eq('x_user_id', xUserId)
    .eq('active', true)
    .maybeSingle();
  adminRow = byId;

  // Try 2: handle match (case-insensitive)
  if (!adminRow) {
    const { data: byHandle } = await supabase
      .from('admin_users')
      .select('x_user_id,x_handle,role,active')
      .ilike('x_handle', normalizedHandle)
      .eq('active', true)
      .maybeSingle();
    adminRow = byHandle;
  }

  // Try 3 (broad .or() fallback) removed — it was redundant with Try 1 + Try 2 and
  // interpolated raw user-controlled strings into the PostgREST filter expression.

  if (!adminRow) return { success: false, error: 'X account not authorized as admin' };

  const sessionId = `privy:${xUserId}`;
  // SECURITY: Use cryptographically random token instead of deterministic hash
  const sessionToken = randomBytes(32).toString('hex');

  await supabase.from('admin_sessions').upsert({
    wallet_address: sessionId,
    session_token: sessionToken,
    expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  }, { onConflict: 'wallet_address' });

  const jar = await cookies();
  jar.set('gascoin_admin_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60,
    path: '/',
  });

  return { success: true };
}

export async function verifyAdminSession(): Promise<{ valid: boolean; walletAddress?: string }> {
  const jar = await cookies();
  const token = jar.get('gascoin_admin_session')?.value;
  if (!token) return { valid: false };

  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('admin_sessions').select('wallet_address, expires_at').eq('session_token', token).maybeSingle();
    if (!data) return { valid: false };
    if (new Date(data.expires_at) < new Date()) return { valid: false };

    // Wallet-based sessions: check ADMIN_WALLET_ADDRESSES
    // Privy-based sessions: check admin_users table (already verified at creation)
    if (!data.wallet_address.startsWith('privy:') && !isAdminWallet(data.wallet_address)) {
      return { valid: false };
    }

    return { valid: true, walletAddress: data.wallet_address };
  } catch {
    return { valid: false };
  }
}

export async function destroyAdminSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get('gascoin_admin_session')?.value;
  if (token) {
    try { const s = getSupabaseAdmin(); await s.from('admin_sessions').delete().eq('session_token', token); } catch {}
  }
  jar.delete('gascoin_admin_session');
  redirect('/admin/login');
}
