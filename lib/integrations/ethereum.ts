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

/** Clears the treasury balance cache for a given wallet (wallet arg kept for API compatibility) */
export async function bustBalanceCache(_wallet?: string): Promise<void> {
  _treasuryCache = null;
}

/** Raw token balance divided by decimals = whole token count */
export async function getWalletGascoinBalance(walletAddress: string): Promise<number> {
  if (!isAddress(walletAddress)) return 0;
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
    const walletClient = createWalletClient({
      account,
      chain: mainnet,
      transport: http(getRpcUrl()),
    });

    const txHash = await walletClient.sendTransaction({
      to: toAddress as Address,
      value: parseEther(amountEth.toFixed(18)),
    });

    return { ok: true, txHash, isDryRun: false };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
