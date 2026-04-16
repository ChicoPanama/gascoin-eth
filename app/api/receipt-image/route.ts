import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { requireReviewer } from '../../../lib/reviewer-auth';
import { checkRateLimit } from '../../../lib/rate-limit';
import { getClientIp } from '../../../lib/ip';

export async function GET(req: Request) {
  // Rate limit: 30 image requests per minute per IP
  const rl = await checkRateLimit(`receipt_image:${getClientIp(req)}`, 30, 60);
  if (!rl.ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const reviewer = await requireReviewer(req);
  if (!reviewer) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  // SECURITY: Prevent path traversal attacks — only allow receipts/ prefix, no ..
  // Hardened 2026-04-06.
  if (!path.startsWith('receipts/') || path.includes('..') || path.includes('\0')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
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
