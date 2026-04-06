import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { verifyPrivySession } from '../../../lib/integrations/privy';
import { isValidSolanaAddress } from '../../../lib/validate-wallet';

// SECURITY: Requires Privy authentication + wallet format validation.
// Hardened 2026-04-06 — was previously unauthenticated (HIGH risk).
export async function POST(req: NextRequest) {
  try {
    const session = await verifyPrivySession(
      req.headers.get('authorization'),
      {
        xId: req.headers.get('x-privy-user-id') || '',
        xHandle: req.headers.get('x-privy-handle') || '',
        wallet: req.headers.get('x-privy-wallet') || ''
      },
      req.headers.get('cookie')
    );
    if (!session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { wallet, x_handle, x_user_id } = await req.json();

    if (!wallet || !x_handle) {
      return NextResponse.json({ error: 'wallet and x_handle required' }, { status: 400 });
    }

    // SECURITY: Validate wallet is a real Solana address
    if (!isValidSolanaAddress(wallet)) {
      return NextResponse.json({ error: 'invalid_wallet_address' }, { status: 400 });
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
  } catch {
    // SECURITY: Do not leak error details to client
    return NextResponse.json({ error: 'link_failed' }, { status: 500 });
  }
}
