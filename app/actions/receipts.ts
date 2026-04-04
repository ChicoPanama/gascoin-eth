'use server';

import { getSupabaseAdmin } from '../../lib/supabase';

export async function getSignedReceiptUrl(storagePath: string): Promise<string | null> {
  if (!storagePath) return null;
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

  await Promise.all(
    valid.map(async (path) => {
      const url = await getSignedReceiptUrl(path);
      if (url) results[path] = url;
    })
  );
  return results;
}
