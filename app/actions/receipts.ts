'use server';

import { headers, cookies } from 'next/headers';
import { getSupabaseAdmin } from '../../lib/supabase';
import { verifyPrivySession } from '../../lib/integrations/privy';
import { verifyAdminSession } from './admin-auth';

async function requireReceiptAccess(): Promise<boolean> {
  // Accept either an active admin session OR a valid Privy user session.
  const adminSession = await verifyAdminSession();
  if (adminSession.valid) return true;

  const hdrs = await headers();
  const jar = await cookies();
  const session = await verifyPrivySession(
    hdrs.get('authorization'),
    undefined,
    jar.toString() || hdrs.get('cookie'),
  );
  return !!session?.wallet;
}

function isValidReceiptPath(path: string): boolean {
  // Must not traverse directories and must stay within the expected prefix.
  if (!path || path.includes('..') || path.includes('\0')) return false;
  // Receipts are stored as receipts/{uuid}/{filename} — enforce the prefix.
  return /^receipts\/[0-9a-f-]{36}\/.+$/i.test(path);
}

export async function getSignedReceiptUrl(storagePath: string): Promise<string | null> {
  if (!storagePath) return null;
  if (!isValidReceiptPath(storagePath)) return null;
  if (!(await requireReceiptAccess())) return null;
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from('receipts-private')
      .createSignedUrl(storagePath, 3600);
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

export async function getBatchSignedUrls(paths: string[]): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  const valid = paths.filter(Boolean);
  if (valid.length === 0) return results;
  if (!(await requireReceiptAccess())) return results;

  await Promise.all(
    valid.map(async (path) => {
      if (!isValidReceiptPath(path)) return;
      const url = await getSignedReceiptUrl(path);
      if (url) results[path] = url;
    })
  );
  return results;
}
