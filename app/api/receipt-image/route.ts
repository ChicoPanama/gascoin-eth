import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Verify the path belongs to an approved submission
    const { data: receipt } = await supabase
      .from('claim_receipts')
      .select('claim_id, claims(status)')
      .eq('storage_path_private', path)
      .limit(1)
      .maybeSingle();

    const claimStatus = (receipt as any)?.claims?.status;
    if (!receipt || (claimStatus !== 'approved' && claimStatus !== 'paid')) {
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
