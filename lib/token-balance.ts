import { getWalletGascoinBalance } from './integrations/ethereum';

export interface TokenBalanceResult {
  balance: number;
  uiAmount: number;
  decimals: number;
  error?: string;
}

export async function getTokenBalanceServer(walletAddress: string): Promise<TokenBalanceResult> {
  const contractAddress = process.env.GASCOIN_CONTRACT_ADDRESS;
  if (!contractAddress) return { balance: 0, uiAmount: 0, decimals: 18 };

  try {
    const uiAmount = await getWalletGascoinBalance(walletAddress);
    const decimals = parseInt(process.env.GASCOIN_DECIMALS || '18', 10);
    const balance = Math.round(uiAmount * Math.pow(10, decimals));
    return { balance, uiAmount, decimals };
  } catch (err: any) {
    console.error('Token balance fetch error:', err.message);
    return { balance: 0, uiAmount: 0, decimals: 18, error: err.message };
  }
}
