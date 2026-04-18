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

// Validate contract address at module load
const CONTRACT_ADDRESS = process.env.GASCOIN_CONTRACT_ADDRESS as Address;
if (!CONTRACT_ADDRESS || !isAddress(CONTRACT_ADDRESS)) {
  throw new Error('GASCOIN_CONTRACT_ADDRESS is missing or not a valid Ethereum address');
}

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

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(getRpcUrl()),
});

export function isValidEthereumAddress(address: string): boolean {
  return isAddress(address);
}

/** Raw token balance divided by decimals = whole token count */
export async function getWalletGascoinBalance(walletAddress: string): Promise<number> {
  if (!isAddress(walletAddress)) return 0;
  try {
    const raw = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [walletAddress as Address],
    });
    return Number(raw) / Number(SCALE);
  } catch {
    return 0;
  }
}

export async function hasMinimumGascoin(walletAddress: string, minTokens: number): Promise<boolean> {
  const balance = await getWalletGascoinBalance(walletAddress);
  return balance >= minTokens;
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

  const [ethRaw, gascoinRaw] = await Promise.all([
    publicClient.getBalance({ address: treasuryWallet }),
    publicClient.readContract({
      address: CONTRACT_ADDRESS,
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
  txHash: string;
  isDryRun: boolean;
}

export async function sendEthPayout(toAddress: string, amountEth: number): Promise<PayoutResult> {
  if (process.env.ENABLE_LIVE_PAYOUT !== 'true') {
    return { txHash: `DRYRUN_${Date.now()}`, isDryRun: true };
  }

  if (!isAddress(toAddress)) throw new Error(`Invalid Ethereum address: ${toAddress}`);

  const privateKey = process.env.TREASURY_PRIVATE_KEY as `0x${string}`;
  if (!privateKey || !privateKey.startsWith('0x')) {
    throw new Error('TREASURY_PRIVATE_KEY is missing or invalid');
  }

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

  return { txHash, isDryRun: false };
}
