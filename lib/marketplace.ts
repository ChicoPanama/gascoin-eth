/**
 * Gas Network Piece 6 — Creator Marketplace data layer + EIP-712 signer.
 *
 * Platform-side orchestration of GascoinMarketplaceEscrow:
 *   - Brief + application + payment CRUD via Supabase
 *   - EIP-712 attestation signing for release() calls
 *   - Performance check: reads scored_tweets.impact_score against the
 *     brief's threshold
 *
 * Secrecy: the verifier private key (GASCOIN_MARKETPLACE_VERIFIER_KEY)
 * signs release attestations. It's distinct from TREASURY_PRIVATE_KEY so
 * the signing surface is narrower — a leak lets an attacker release
 * funds but only to already-accepted creators, never drain the contract.
 *
 * UI status: public routes are behind the GAS_NETWORK_MARKETPLACE_LIVE
 * feature flag — "coming soon" until flipped.
 */

import { getSupabaseAdmin } from './supabase';
import {
  createPublicClient,
  http,
  isAddress,
  keccak256,
  encodePacked,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';

// ─── Types ─────────────────────────────────────────────────────────

export type BriefStatus =
  | 'draft' | 'open' | 'accepted' | 'released' | 'refunded' | 'resolved' | 'cancelled';

export interface Brief {
  id: number;
  onchainId: number | null;
  brandWallet: string;
  brandContact: string | null;
  title: string;
  description: string | null;
  amountUsdc: number;
  threshold: number; // integer (impact_score × 100)
  deadline: string;
  requiredTags: string[];
  minCreatorTier: string | null;
  txHashCreate: string | null;
  status: BriefStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBriefInput {
  brandWallet: string;
  title: string;
  description?: string;
  amountUsdc: number;
  threshold: number;
  deadlineIso: string;
  requiredTags?: string[];
  minCreatorTier?: string;
  brandContact?: string;
}

export interface SignedAttestation {
  briefId: bigint;
  creator: Address;
  scoreActual: bigint;
  issuedAt: bigint;
  signature: `0x${string}`;
}

// ─── Feature flag ──────────────────────────────────────────────────

/** Public marketplace UI gating. Flip to 'true' on Vercel to go live. */
export function isMarketplaceLive(): boolean {
  return (process.env.GAS_NETWORK_MARKETPLACE_LIVE || '').toLowerCase() === 'true';
}

// ─── CRUD ──────────────────────────────────────────────────────────

export async function createDraftBrief(input: CreateBriefInput): Promise<Brief | null> {
  if (!isAddress(input.brandWallet)) return null;
  if (input.amountUsdc <= 0) return null;
  if (input.threshold <= 0) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('briefs')
    .insert({
      brand_wallet: input.brandWallet,
      brand_contact: input.brandContact ?? null,
      title: input.title.slice(0, 200),
      description: input.description?.slice(0, 4000) ?? null,
      amount_usdc: input.amountUsdc,
      threshold: input.threshold,
      deadline: input.deadlineIso,
      required_tags: input.requiredTags ?? ['#gascoin', '@GasCoinApp'],
      min_creator_tier: input.minCreatorTier ?? null,
      status: 'draft',
    })
    .select('*')
    .single();

  if (error || !data) return null;
  return rowToBrief(data);
}

export async function getBrief(id: number): Promise<Brief | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('briefs').select('*').eq('id', id).maybeSingle();
  return data ? rowToBrief(data) : null;
}

export async function getBriefByOnchainId(onchainId: number): Promise<Brief | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from('briefs').select('*').eq('onchain_id', onchainId).maybeSingle();
  return data ? rowToBrief(data) : null;
}

export async function listBriefs(status?: BriefStatus): Promise<Brief[]> {
  const supabase = getSupabaseAdmin();
  let q = supabase.from('briefs').select('*').order('created_at', { ascending: false }).limit(500);
  if (status) q = q.eq('status', status);
  const { data } = await q;
  return (data || []).map(rowToBrief);
}

/**
 * List briefs a specific wallet qualifies for, band-gated server-side.
 *
 * Reads composite_scores for the wallet and uses lib/perks-ladder to map
 * composite → band, then filters by eligibleBriefsForComposite. Mirrors
 * what the SQL `creator_tier_rank()` function does on the DB side — both
 * must stay in lockstep with lib/perks-ladder.ts::COMPOSITE_BANDS.
 */
export async function listBriefsForWallet(wallet: string): Promise<Brief[]> {
  const { eligibleBriefsForComposite } = await import('./perks-ladder');
  const supabase = getSupabaseAdmin();
  const w = (wallet || '').toLowerCase();
  if (!w) return [];
  const { data: row } = await supabase
    .from('composite_scores')
    .select('composite')
    .eq('wallet', w)
    .maybeSingle();
  const composite = Number(row?.composite || 0);
  const briefs = await listBriefs('open');
  return eligibleBriefsForComposite(composite, briefs);
}

function rowToBrief(row: any): Brief {
  return {
    id: Number(row.id),
    onchainId: row.onchain_id != null ? Number(row.onchain_id) : null,
    brandWallet: String(row.brand_wallet),
    brandContact: row.brand_contact ?? null,
    title: String(row.title),
    description: row.description ?? null,
    amountUsdc: Number(row.amount_usdc || 0),
    threshold: Number(row.threshold || 0),
    deadline: String(row.deadline),
    requiredTags: Array.isArray(row.required_tags) ? row.required_tags : [],
    minCreatorTier: row.min_creator_tier ?? null,
    txHashCreate: row.tx_hash_create ?? null,
    status: (row.status as BriefStatus) ?? 'draft',
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

// ─── Performance check ────────────────────────────────────────────

/**
 * Has the accepted creator hit the brief's threshold before the deadline?
 * Looks at every scored tweet tied to the creator's wallet (via scored_tweets)
 * AND checks whether the tweet content actually includes the brief's required tags.
 * Returns the highest-scoring qualifying tweet, or null.
 */
export interface PerformanceMatch {
  tweetId: string;
  impactScore: number;
  impressions: number;
  postedAt: string | null;
}

export async function findWinningPost(brief: Brief, creatorWallet: string): Promise<PerformanceMatch | null> {
  const supabase = getSupabaseAdmin();
  const { data: tweets } = await supabase
    .from('scored_tweets')
    .select('tweet_id,tweet_url,impressions,impact_score,posted_at,tweet_text,content_type')
    .eq('wallet', creatorWallet)
    .gte('posted_at', brief.createdAt)
    .lte('posted_at', brief.deadline)
    .order('impact_score', { ascending: false, nullsFirst: false })
    .limit(50);

  const tagSet = brief.requiredTags.map((t) => t.toLowerCase());
  for (const t of tweets || []) {
    const text = String((t as any).tweet_text || '').toLowerCase();
    if (!tagSet.every((tag) => text.includes(tag))) continue;
    const score = Math.round(Number((t as any).impact_score || 0) * 100);
    if (score < brief.threshold) continue;
    return {
      tweetId: String((t as any).tweet_id),
      impactScore: score,
      impressions: Number((t as any).impressions || 0),
      postedAt: (t as any).posted_at ?? null,
    };
  }
  return null;
}

// ─── EIP-712 attestation signer ───────────────────────────────────

/**
 * Sign a release attestation for the escrow contract. Requires:
 *   - GASCOIN_MARKETPLACE_VERIFIER_KEY (hex 0x…, distinct from treasury)
 *   - GASCOIN_MARKETPLACE_CONTRACT (deployed escrow address)
 *   - Chain: Ethereum mainnet
 *
 * The signature is EIP-712 over the `Release` struct. The contract
 * verifies it via ECDSA.recover against its `verifier` state var, so
 * the returned signer MUST match what you set via
 * GascoinMarketplaceEscrow.setVerifier().
 */
export async function signReleaseAttestation(params: {
  briefId: bigint;
  creator: string;
  scoreActual: bigint;
}): Promise<SignedAttestation | null> {
  const privateKey = (process.env.GASCOIN_MARKETPLACE_VERIFIER_KEY || '') as `0x${string}`;
  const contractAddr = process.env.GASCOIN_MARKETPLACE_CONTRACT;
  if (!privateKey.startsWith('0x') || privateKey.length !== 66) return null;
  if (!contractAddr || !isAddress(contractAddr)) return null;
  if (!isAddress(params.creator)) return null;

  const account = privateKeyToAccount(privateKey);
  const issuedAt = BigInt(Math.floor(Date.now() / 1000));

  const signature = await account.signTypedData({
    domain: {
      name: 'GascoinMarketplace',
      version: '1',
      chainId: mainnet.id,
      verifyingContract: contractAddr as Address,
    },
    types: {
      Release: [
        { name: 'briefId',     type: 'uint256' },
        { name: 'creator',     type: 'address' },
        { name: 'scoreActual', type: 'uint256' },
        { name: 'issuedAt',    type: 'uint256' },
      ],
    },
    primaryType: 'Release',
    message: {
      briefId: params.briefId,
      creator: params.creator as Address,
      scoreActual: params.scoreActual,
      issuedAt,
    },
  });

  return {
    briefId: params.briefId,
    creator: params.creator as Address,
    scoreActual: params.scoreActual,
    issuedAt,
    signature,
  };
}

/**
 * Addr of the current verifier (public info — used to sanity-check that
 * the on-chain contract is configured to accept this backend's attestations).
 */
export function getVerifierAddress(): Address | null {
  const pk = (process.env.GASCOIN_MARKETPLACE_VERIFIER_KEY || '') as `0x${string}`;
  if (!pk.startsWith('0x') || pk.length !== 66) return null;
  return privateKeyToAccount(pk).address;
}

/**
 * Fee math helper — what brand pays upfront and creator receives at
 * release. Mirrors the on-chain constants.
 */
export function feeMath(amountUsdc: number): {
  brandTotal: number;
  brandFee: number;
  creatorPayout: number;
  creatorFee: number;
  treasuryTotal: number;
  opsTotal: number;
} {
  const brandFee = amountUsdc * 0.03;
  const creatorFee = amountUsdc * 0.03;
  return {
    brandTotal: amountUsdc + brandFee,
    brandFee,
    creatorPayout: amountUsdc - creatorFee,
    creatorFee,
    treasuryTotal: brandFee / 2 + creatorFee / 2,
    opsTotal: brandFee / 2 + creatorFee / 2,
  };
}
