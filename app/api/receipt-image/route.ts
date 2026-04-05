import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { checkRateLimit } from '../../../lib/rate-limit';

function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export async function GET(req: Request) {
  // Rate limit: 30 image requests per minute per IP
  const rl = await checkRateLimit(`receipt_image:${clientIp(req)}`, 30, 60);
  if (!rl.ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: receipt } = await supabase
      .from('claim_receipts')
      .select('claim_id, claims(status)')
      .eq('storage_path_private', path)
      .limit(1)
      .maybeSingle();

    const claimStatus = (receipt as any)?.claims?.status;
    const viewableStatuses = ['ready_for_dispatch', 'needs_review', 'approved', 'paid', 'rejected'];
    if (!receipt || !viewableStatuses.includes(claimStatus)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { data, error } = await supabase.storage
      .from('receipts-private')
      .createSignedUrl(path, 3600);

    if (error || !data) {
      return NextResponse.json({ error: 'Storage error' }, { status: 500 });
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
