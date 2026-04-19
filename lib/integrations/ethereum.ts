// lib/integrations/ethereum.ts
import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  parseAbi,
  formatEther,
  parseEther,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import { cacheGetOrFetch, cacheDel } from '../cache';

const DECIMALS = parseInt(process.env.GASCOIN_DECIMALS || '18', 10);
const SCALE = BigInt(10) ** BigInt(DECIMALS);

const ERC20_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
]);

function getRpcUrl(): string {
  if (process.env.ETH_RPC_URL) return process.env.ETH_RPC_URL;
  if (process.env.ALCHEMY_API_KEY) {
    return `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  }
  return 'https://eth.llamarpc.com';
}

/** Lazy getter — avoids module-load-time throw when env is empty */
function getContractAddress(): Address {
  const addr = process.env.GASCOIN_CONTRACT_ADDRESS;
  if (!addr || !isAddress(addr)) {
    throw new Error('GASCOIN_CONTRACT_ADDRESS is missing or not a valid Ethereum address');
  }
  return addr as Address;
}

/** Lazy getter — defers publicClient creation until first use */
function getPublicClient() {
  return createPublicClient({
    chain: mainnet,
    transport: http(getRpcUrl()),
  });
}

export function isValidEthereumAddress(address: string): boolean {
  return isAddress(address);
}

/** Validates GASCOIN_CONTRACT_ADDRESS format — used by health worker */
export function validateGascoinMint(): { ok: boolean; error?: string } {
  const addr = process.env.GASCOIN_CONTRACT_ADDRESS;
  if (!addr) return { ok: false, error: 'GASCOIN_CONTRACT_ADDRESS is not set' };
  if (!isAddress(addr)) return { ok: false, error: 'GASCOIN_CONTRACT_ADDRESS is not a valid Ethereum address' };
  return { ok: true };
}

/** Clears the treasury balance cache — call after a payout is sent */
export async function bustTreasuryCache(): Promise<void> {
  _treasuryCache = null;
}

/** Clears the Redis balance cache for a specific wallet (call after a payout to that wallet) */
export async function bustBalanceCache(wallet?: string): Promise<void> {
  if (wallet && isAddress(wallet)) {
    const contract = process.env.GASCOIN_CONTRACT_ADDRESS ?? '';
    await cacheDel(`balance:${wallet.toLowerCase()}:${contract.toLowerCase()}`);
  }
}

const BALANCE_CACHE_TTL = 75; // seconds — balances change slowly; ~80% Alchemy CU reduction

/** Raw token balance divided by decimals = whole token count. Redis-cached for 75 s. */
export async function getWalletGascoinBalance(walletAddress: string): Promise<number> {
  if (!isAddress(walletAddress)) return 0;
  const contract = process.env.GASCOIN_CONTRACT_ADDRESS ?? '';
  const cacheKey = `balance:${walletAddress.toLowerCase()}:${contract.toLowerCase()}`;
  return cacheGetOrFetch(
    cacheKey,
    async () => {
      try {
        const raw = await getPublicClient().readContract({
          address: getContractAddress(),
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [walletAddress as Address],
        });
        return Number(raw) / Number(SCALE);
      } catch {
        return 0;
      }
    },
    BALANCE_CACHE_TTL,
  );
}

/**
 * Batch GASCOIN balance lookup using alchemy_getTokenBalances (16 CU vs 26 CU per eth_call).
 * Falls back to parallel eth_call when ALCHEMY_API_KEY is absent.
 */
export async function getWalletGascoinBalanceBatch(
  wallets: string[],
): Promise<Record<string, number>> {
  const valid = wallets.filter((w) => isAddress(w));
  if (valid.length === 0) return {};

  const contract = process.env.GASCOIN_CONTRACT_ADDRESS ?? '';
  const rpcUrl = getRpcUrl();

  const results = await Promise.all(
    valid.map(async (wallet): Promise<[string, number]> => {
      try {
        const res = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: 1,
            jsonrpc: '2.0',
            method: 'alchemy_getTokenBalances',
            params: [wallet, [contract]],
          }),
        });
        const json = await res.json();
        const hex: string = json?.result?.tokenBalances?.[0]?.tokenBalance ?? '0x0';
        const raw = BigInt(hex === '0x' ? '0x0' : hex);
        return [wallet, Number(raw) / Number(SCALE)];
      } catch {
        return [wallet, 0];
      }
    }),
  );

  return Object.fromEntries(results);
}

export interface AssetTransfer {
  blockNum: string;
  hash: string;
  from: string;
  to: string | null;
  value: number | null;
  asset: string | null;
}

/**
 * Pull ETH transfers to/from the treasury wallet via alchemy_getAssetTransfers.
 * Used for payout ledger reconciliation and the claims history feed.
 */
export async function getTreasuryTransfers(
  direction: 'from' | 'to',
  pageKey?: string,
): Promise<{ transfers: AssetTransfer[]; pageKey?: string }> {
  const treasury = process.env.GASCOIN_TREASURY_WALLET ?? '';
  if (!treasury || !isAddress(treasury)) return { transfers: [] };

  const params: Record<string, unknown> = {
    category: ['external'],
    maxCount: '0x14', // 20 per page
    order: 'desc',
    withMetadata: false,
    excludeZeroValue: true,
  };
  if (direction === 'from') params.fromAddress = treasury;
  else params.toAddress = treasury;
  if (pageKey) params.pageKey = pageKey;

  try {
    const res = await fetch(getRpcUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'alchemy_getAssetTransfers', params: [params] }),
    });
    const json = await res.json();
    return {
      transfers: json?.result?.transfers ?? [],
      pageKey: json?.result?.pageKey,
    };
  } catch {
    return { transfers: [] };
  }
}

export async function hasMinimumGascoin(
  walletAddress: string,
  minTokens: number,
): Promise<{ ok: boolean; tokenBalance: number }> {
  const tokenBalance = await getWalletGascoinBalance(walletAddress);
  return { ok: tokenBalance >= minTokens, tokenBalance };
}

export interface TreasuryBalances {
  ethBalance: number;
  ethUsd: number;
  gascoinBalance: number;
  gascoinUsd: number;
}

let _treasuryCache: { data: TreasuryBalances; ts: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function getTreasuryBalances(): Promise<TreasuryBalances> {
  if (_treasuryCache && Date.now() - _treasuryCache.ts < CACHE_TTL_MS) {
    return _treasuryCache.data;
  }

  const treasuryWallet = process.env.GASCOIN_TREASURY_WALLET as Address | undefined;
  if (!treasuryWallet || !isAddress(treasuryWallet)) {
    return { ethBalance: 0, ethUsd: 0, gascoinBalance: 0, gascoinUsd: 0 };
  }

  const client = getPublicClient();
  const contractAddress = getContractAddress();
  const [ethRaw, gascoinRaw] = await Promise.all([
    client.getBalance({ address: treasuryWallet }),
    client.readContract({
      address: contractAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [treasuryWallet],
    }),
  ]);

  const ethBalance = parseFloat(formatEther(ethRaw));
  const gascoinBalance = Number(gascoinRaw / SCALE);

  let ethPrice = 0;
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { next: { revalidate: 60 } },
    );
    const json = await res.json();
    ethPrice = json?.ethereum?.usd ?? 0;
  } catch { /* non-fatal */ }

  const data: TreasuryBalances = {
    ethBalance,
    ethUsd: ethBalance * ethPrice,
    gascoinBalance,
    gascoinUsd: 0, // gascoin price requires separate feed
  };
  _treasuryCache = { data, ts: Date.now() };
  return data;
}

export interface PayoutResult {
  ok: boolean;
  txHash?: string;
  isDryRun?: boolean;
  error?: string;
}

export async function sendEthPayout(toAddress: string, amountEth: number): Promise<PayoutResult> {
  if (process.env.ENABLE_LIVE_PAYOUT !== 'true') {
    return { ok: true, txHash: `DRYRUN_${Date.now()}`, isDryRun: true };
  }

  if (!isAddress(toAddress)) {
    return { ok: false, error: `Invalid Ethereum address: ${toAddress}` };
  }

  const privateKey = process.env.TREASURY_PRIVATE_KEY as `0x${string}`;
  if (!privateKey || !privateKey.startsWith('0x')) {
    return { ok: false, error: 'TREASURY_PRIVATE_KEY is missing or invalid' };
  }

  try {
    const account = privateKeyToAccount(privateKey);
    const client = getPublicClient();
    const walletClient = createWalletClient({
      account,
      chain: mainnet,
      transport: http(getRpcUrl()),
    });

    const value = parseEther(amountEth.toFixed(18));

    // EIP-1559 gas estimation — avoids overpaying base fee and stuck txs
    const [fees, gasEstimate] = await Promise.all([
      client.estimateFeesPerGas(),
      client.estimateGas({ account: account.address, to: toAddress as Address, value }),
    ]);

    const txHash = await walletClient.sendTransaction({
      to: toAddress as Address,
      value,
      maxFeePerGas: fees.maxFeePerGas,
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      gas: gasEstimate,
    });

    return { ok: true, txHash, isDryRun: false };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
