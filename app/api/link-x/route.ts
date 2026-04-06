import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase';

// Called when user connects wallet + signs in with X via Privy
// Creates persistent wallet ↔ X handle mapping for engagement tracking
export async function POST(req: NextRequest) {
  try {
    const { wallet, x_handle, x_user_id } = await req.json();

    if (!wallet || !x_handle) {
      return NextResponse.json({ error: 'wallet and x_handle required' }, { status: 400 });
    }

    const handle = x_handle.replace(/^@/, '').toLowerCase();
    const supabase = getSupabaseAdmin();

    // Upsert the link — same wallet+handle combo is idempotent
    await supabase.from('wallet_x_links').upsert({
      wallet,
      x_handle: handle,
      x_user_id: x_user_id || null,
      linked_at: new Date().toISOString(),
      is_active: true,
    }, { onConflict: 'wallet,x_handle' });

    return NextResponse.json({ ok: true, wallet, x_handle: handle });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'link failed' }, { status: 500 });
  }
}
