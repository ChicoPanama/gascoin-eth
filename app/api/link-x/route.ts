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

    const { wallet, x_handle, x_user_id, profile_image_url } = await req.json();

    if (!wallet || !x_handle) {
      return NextResponse.json({ error: 'wallet and x_handle required' }, { status: 400 });
    }

    // SECURITY: Validate wallet is a real Solana address
    if (!isValidSolanaAddress(wallet)) {
      return NextResponse.json({ error: 'invalid_wallet_address' }, { status: 400 });
    }

    const handle = x_handle.replace(/^@/, '').toLowerCase();
    const userId = x_user_id || session.xId || '';
    const supabase = getSupabaseAdmin();

    // SECURITY: Check if this wallet is already registered to a DIFFERENT X account
    if (userId) {
      const { data: existingLink } = await supabase
        .from('wallet_x_links')
        .select('x_user_id')
        .eq('wallet', wallet)
        .eq('is_active', true)
        .not('x_user_id', 'eq', userId)
        .maybeSingle();

      if (existingLink) {
        return NextResponse.json({ error: 'wallet_registered_to_another_account' }, { status: 409 });
      }
    }

    // Deactivate any previous wallets for this X account (one wallet per account)
    if (userId) {
      await supabase
        .from('wallet_x_links')
        .update({ is_active: false })
        .eq('x_user_id', userId)
        .neq('wallet', wallet);
    }

    // Upsert the link — same wallet+handle combo is idempotent
    await supabase.from('wallet_x_links').upsert({
      wallet,
      x_handle: handle,
      x_user_id: userId || null,
      profile_image_url: typeof profile_image_url === 'string' ? profile_image_url : null,
      linked_at: new Date().toISOString(),
      is_active: true,
    }, { onConflict: 'wallet,x_handle' });

    return NextResponse.json({ ok: true, wallet, x_handle: handle });
  } catch {
    // SECURITY: Do not leak error details to client
    return NextResponse.json({ error: 'link_failed' }, { status: 500 });
  }
}
