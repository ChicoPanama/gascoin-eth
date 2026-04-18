import { Connection, PublicKey } from '@solana/web3.js';

const GASCOIN_MINT = process.env.NEXT_PUBLIC_GASCOIN_MINT_ADDRESS || process.env.GASCOIN_MINT || '';
const RPC_URL = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet.solana.com';

export interface TokenBalanceResult {
  balance: number;
  uiAmount: number;
  decimals: number;
  error?: string;
}

export async function getTokenBalanceServer(walletAddress: string): Promise<TokenBalanceResult> {
  if (!GASCOIN_MINT) return { balance: 0, uiAmount: 0, decimals: 9 };

  try {
    const connection = new Connection(RPC_URL);
    const walletPubkey = new PublicKey(walletAddress);
    const mintPubkey = new PublicKey(GASCOIN_MINT);

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPubkey, { mint: mintPubkey });

    if (tokenAccounts.value.length === 0) return { balance: 0, uiAmount: 0, decimals: 9 };

    const info = (tokenAccounts.value[0].account.data as any).parsed.info.tokenAmount;
    return { balance: parseInt(info.amount), uiAmount: info.uiAmount ?? 0, decimals: info.decimals };
  } catch (err: any) {
    console.error('Token balance fetch error:', err.message);
    return { balance: 0, uiAmount: 0, decimals: 9, error: err.message };
  }
}
