'use server';

import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { isAdminWallet } from '../../lib/admin-auth';
import { getSupabaseAdmin } from '../../lib/supabase';

export async function createAdminSession(walletAddress: string, timestamp: number): Promise<{ success: boolean; error?: string }> {
  if (!isAdminWallet(walletAddress)) return { success: false, error: 'Wallet not authorized' };
  if (Math.abs(Date.now() - timestamp) > 300000) return { success: false, error: 'Challenge expired' };

  const secret = process.env.ADMIN_SESSION_SECRET || 'dev-secret-change-me';
  const sessionToken = createHash('sha256').update(`${walletAddress}:${timestamp}:${secret}`).digest('hex');

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
    sameSite: 'strict',
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
    if (!isAdminWallet(data.wallet_address)) return { valid: false };
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
}
