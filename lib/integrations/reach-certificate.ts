/**
 * Gas Network Piece 4 — platform-side dispatcher for the
 * GascoinReachCertificate soulbound ERC-721.
 *
 * Admin-only mint (contract owner = treasury wallet). The daily worker
 * scans creator stats for new milestone hits and calls mintCertificate()
 * once per (wallet, milestone). Dry-run mode returns a fake tx hash when
 * ENABLE_LIVE_PAYOUT !== 'true', matching the payout flow's safety gate.
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseAbi,
  isAddress,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';

const REACH_ABI = parseAbi([
  'function mint(address to, string calldata milestone, uint256 amount, string calldata handle) external returns (uint256)',
  'function nextTokenId() external view returns (uint256)',
  'event CertificateMinted(address indexed to, uint256 indexed tokenId, string milestone, uint256 amount, string handle)',
]);

function getContractAddress(): Address {
  const addr = process.env.GASCOIN_CERTIFICATE_CONTRACT;
  if (!addr || !isAddress(addr)) {
    throw new Error('GASCOIN_CERTIFICATE_CONTRACT is missing or not a valid Ethereum address');
  }
  return addr as Address;
}

function getRpcUrl(): string {
  if (process.env.ETH_RPC_URL) return process.env.ETH_RPC_URL;
  if (process.env.ALCHEMY_API_KEY) {
    return `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  }
  return 'https://eth.llamarpc.com';
}

export interface MintResult {
  ok: boolean;
  txHash?: string;
  tokenId?: number;
  isDryRun?: boolean;
  error?: string;
}

/**
 * Mint a reach certificate to `to`. Admin-only (contract owner = treasury key).
 * Gated by ENABLE_LIVE_PAYOUT so dry-run mode produces fake tx hashes instead
 * of burning ETH. Amount is bounded by the SQL migration check (NUMERIC).
 */
export async function mintCertificate(
  to: string,
  milestone: string,
  amount: bigint,
  handle: string,
): Promise<MintResult> {
  if (process.env.ENABLE_LIVE_PAYOUT !== 'true') {
    return { ok: true, txHash: `DRYRUN_CERT_${Date.now()}`, isDryRun: true };
  }

  if (!isAddress(to)) return { ok: false, error: `invalid_to: ${to}` };
  if (!milestone || milestone.length > 32) return { ok: false, error: 'bad_milestone' };
  if (!handle || handle.length > 32) return { ok: false, error: 'bad_handle' };

  const privateKey = process.env.TREASURY_PRIVATE_KEY as `0x${string}` | undefined;
  if (!privateKey || !privateKey.startsWith('0x')) {
    return { ok: false, error: 'TREASURY_PRIVATE_KEY missing' };
  }

  try {
    const account = privateKeyToAccount(privateKey);
    const publicClient = createPublicClient({ chain: mainnet, transport: http(getRpcUrl()) });
    const walletClient = createWalletClient({ account, chain: mainnet, transport: http(getRpcUrl()) });
    const contract = getContractAddress();

    // EIP-1559 gas estimation
    const [fees, gasEstimate, nextId] = await Promise.all([
      publicClient.estimateFeesPerGas(),
      publicClient.estimateContractGas({
        address: contract,
        abi: REACH_ABI,
        functionName: 'mint',
        args: [to as Address, milestone, amount, handle],
        account: account.address,
      }),
      publicClient.readContract({
        address: contract,
        abi: REACH_ABI,
        functionName: 'nextTokenId',
      }),
    ]);

    const txHash = await walletClient.writeContract({
      address: contract,
      abi: REACH_ABI,
      functionName: 'mint',
      args: [to as Address, milestone, amount, handle],
      maxFeePerGas: fees.maxFeePerGas,
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      gas: gasEstimate,
    });

    return {
      ok: true,
      txHash,
      tokenId: Number(nextId),
      isDryRun: false,
    };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Milestones config ────────────────────────────────────────────────
// Drives both the worker's scan logic and the frontend display. Change
// thresholds here and the next worker run backfills + mints any new
// milestone hits.

export interface Milestone {
  slug: string;
  label: string;
  description: string;
  /** Which aggregate column to check on creator_public_view. */
  axis: 'total_impressions' | 'total_eth_earned' | 'total_paid_claims';
  threshold: number;
}

export const MILESTONES: Milestone[] = [
  { slug: 'pump',        label: 'Pump',        axis: 'total_impressions', threshold: 100_000,   description: '100k verified impressions' },
  { slug: 'station',     label: 'Station',     axis: 'total_impressions', threshold: 1_000_000, description: '1M verified impressions' },
  { slug: 'commuter',    label: 'Commuter',    axis: 'total_eth_earned',  threshold: 10,        description: '10 ETH in verified refunds' },
  { slug: 'roadwarrior', label: 'Road Warrior', axis: 'total_eth_earned', threshold: 100,       description: '100 ETH in verified refunds' },
  { slug: 'recruiter',   label: 'Recruiter',   axis: 'total_paid_claims', threshold: 100,       description: '100 referred submissions paid' },
];
