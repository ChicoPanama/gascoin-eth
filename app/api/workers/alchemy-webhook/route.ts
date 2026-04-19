import { createHmac } from 'crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { bustTreasuryCache, bustBalanceCache } from '../../../../lib/integrations/ethereum';

function verifyAlchemySignature(rawBody: string, signature: string, signingKey: string): boolean {
  const hmac = createHmac('sha256', signingKey).update(rawBody, 'utf8').digest('hex');
  return hmac === signature;
}

export async function POST(req: Request) {
  console.log('[alchemy-webhook] received', req.headers.get('x-alchemy-signature') ? 'signed' : 'unsigned');
  const signingKey = process.env.ALCHEMY_WEBHOOK_SIGNING_KEY;
  if (!signingKey) {
    return NextResponse.json({ ok: false, error: 'webhook_not_configured' }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-alchemy-signature') ?? '';

  if (!verifyAlchemySignature(rawBody, signature, signingKey)) {
    console.warn('[alchemy-webhook] invalid signature — possible replay or misconfigured key');
    return NextResponse.json({ ok: false, error: 'invalid_signature' }, { status: 401 });
  }

  let payload: {
    type: string;
    event?: { activity?: Array<{
      category: string;
      fromAddress: string;
      toAddress: string;
      hash: string;
      asset: string;
      value: number;
    }> };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  if (payload.type !== 'ADDRESS_ACTIVITY') {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const treasury = (process.env.GASCOIN_TREASURY_WALLET ?? '').toLowerCase();
  const activities = payload.event?.activity ?? [];

  const confirmations: Promise<unknown>[] = [];

  for (const activity of activities) {
    // Outgoing ETH from treasury = payout confirmed on-chain
    if (
      activity.category === 'external' &&
      activity.fromAddress?.toLowerCase() === treasury &&
      activity.asset === 'ETH' &&
      activity.hash
    ) {
      const supabase = getSupabaseAdmin();
      confirmations.push(
        Promise.all([
          supabase
            .from('payouts')
            .update({ status: 'confirmed', updated_at: new Date().toISOString() })
            .eq('tx_hash', activity.hash)
            .eq('status', 'paid'),
          bustTreasuryCache(),
          bustBalanceCache(activity.toAddress),
        ]),
      );
    }

    // Incoming ETH to treasury = top-up — bust treasury cache so balance reflects immediately
    if (
      activity.category === 'external' &&
      activity.toAddress?.toLowerCase() === treasury &&
      activity.asset === 'ETH'
    ) {
      confirmations.push(bustTreasuryCache());
    }
  }

  await Promise.all(confirmations);
  return NextResponse.json({ ok: true, processed: confirmations.length });
}
