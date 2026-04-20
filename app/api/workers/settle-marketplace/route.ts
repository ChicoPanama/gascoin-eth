import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { isAuthorizedCron } from '../../../../lib/cron-auth';
import {
  findWinningPost,
  signReleaseAttestation,
  type Brief,
  type BriefStatus,
} from '../../../../lib/marketplace';

export const dynamic = 'force-dynamic';

/**
 * Gas Network Piece 6 — Marketplace settlement worker.
 *
 * Scans accepted briefs whose deadline has passed. For each:
 *   - Looks up the accepted creator's qualifying posts
 *   - If a winner is found, signs an EIP-712 release attestation and
 *     stores it as a pending payment. The actual on-chain release
 *     call is triggered by the creator (or by ops via admin UI).
 *   - If no winner, no-op — brand can call refund() on the contract
 *     after the grace window.
 *
 * This worker does NOT broadcast transactions itself. It just produces
 * the signed attestation. That decouples gas cost from our cron
 * schedule: creators pay gas when they claim, contract verifies sig.
 */
export async function POST(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: 'supabase_not_configured' }, { status: 500 });
  }

  // Briefs that hit their deadline + have an accepted creator
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from('briefs')
    .select('*')
    .eq('status', 'accepted')
    .lte('deadline', nowIso)
    .order('deadline', { ascending: true })
    .limit(50);

  const briefs = (data || []) as Array<Record<string, unknown>>;
  let attested = 0;
  let refundEligible = 0;
  let skipped = 0;

  for (const row of briefs) {
    const brief: Brief = {
      id: Number(row.id),
      onchainId: row.onchain_id != null ? Number(row.onchain_id) : null,
      brandWallet: String(row.brand_wallet),
      brandContact: (row.brand_contact as string | null) ?? null,
      title: String(row.title),
      description: (row.description as string | null) ?? null,
      amountUsdc: Number(row.amount_usdc || 0),
      threshold: Number(row.threshold || 0),
      deadline: String(row.deadline),
      requiredTags: Array.isArray(row.required_tags) ? (row.required_tags as string[]) : [],
      minCreatorTier: (row.min_creator_tier as string | null) ?? null,
      txHashCreate: (row.tx_hash_create as string | null) ?? null,
      status: (row.status as BriefStatus) || 'accepted',
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };

    // Accepted creator lookup — matched via applications.status='accepted'
    const { data: accepted } = await supabase
      .from('applications')
      .select('creator_wallet, creator_handle')
      .eq('brief_id', brief.id)
      .eq('status', 'accepted')
      .maybeSingle();

    if (!accepted?.creator_wallet) {
      refundEligible++;
      continue;
    }

    if (brief.onchainId == null) {
      // Brief never broadcast on-chain. Nothing for us to sign against.
      skipped++;
      continue;
    }

    const winner = await findWinningPost(brief, accepted.creator_wallet);
    if (!winner) {
      refundEligible++;
      continue;
    }

    const attestation = await signReleaseAttestation({
      briefId: BigInt(brief.onchainId),
      creator: accepted.creator_wallet,
      scoreActual: BigInt(winner.impactScore),
    });

    if (!attestation) {
      skipped++;
      continue;
    }

    await supabase.from('payments').insert({
      brief_id: brief.id,
      kind: 'release',
      attestation: {
        briefId: attestation.briefId.toString(),
        creator: attestation.creator,
        scoreActual: attestation.scoreActual.toString(),
        issuedAt: attestation.issuedAt.toString(),
        signature: attestation.signature,
      },
      amount_usdc: brief.amountUsdc,
      recipient_wallet: accepted.creator_wallet,
    });

    await supabase.from('performance_snapshots').insert({
      brief_id: brief.id,
      tweet_id: winner.tweetId,
      impact_score: winner.impactScore,
      metadata: {
        impressions: winner.impressions,
        posted_at: winner.postedAt,
      },
    });

    attested++;
  }

  return NextResponse.json({
    ok: true,
    scanned: briefs.length,
    attested,
    refundEligible,
    skipped,
  });
}

// Vercel Cron sends GET requests; delegate to the POST handler above.
export const GET = POST;
