import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
import { getGascoinUsdValue } from './pricing';
import { cacheGetOrFetch, cacheDel } from '../cache';

function getRpcUrl() {
  return process.env.SOLANA_RPC_URL || (process.env.HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : 'https://api.mainnet-beta.solana.com');
}

function connection() {
  return new Connection(getRpcUrl(), 'confirmed');
}

// C4: GASCOIN_MINT must be a valid base58 Solana public key (32–44 chars, base58 charset).
// A wrong mint silently makes all tier gates check the wrong token.
export function validateGascoinMint(): { ok: boolean; error?: string } {
  const mint = process.env.GASCOIN_MINT;
  if (!mint) return { ok: false, error: 'GASCOIN_MINT not set' };
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) {
    return { ok: false, error: `GASCOIN_MINT looks invalid: ${mint.slice(0, 8)}...` };
  }
  try {
    new PublicKey(mint);
    return { ok: true };
  } catch {
    return { ok: false, error: `GASCOIN_MINT is not a valid Solana public key` };
  }
}

// T4: TREASURY_PRIVATE_KEY_B58 rotation runbook:
//   1. Generate new keypair: `solana-keygen new --no-passphrase -o new-treasury.json`
//   2. Fund new wallet with ≥1 SOL before switching
//   3. Set TREASURY_PRIVATE_KEY_B58 + GASCOIN_TREASURY_WALLET on Vercel (production)
//   4. Verify keys match: decoded keypair pubkey === GASCOIN_TREASURY_WALLET
//   5. Redeploy — payout worker checks mismatch at line 111 and returns error before any tx
//   6. Transfer remaining SOL from old wallet to new
//   7. Revoke/archive old private key material

async function fetchWalletGascoinBalance(wallet: string): Promise<number> {
  const mint = process.env.GASCOIN_MINT;
  if (!mint) return 0;

  try {
    const conn = connection();
    const owner = new PublicKey(wallet);
    const mintPk = new PublicKey(mint);
    const accs = await conn.getParsedTokenAccountsByOwner(owner, { mint: mintPk });
    let total = 0;
    for (const a of accs.value) {
      const amt = Number((a.account.data as any)?.parsed?.info?.tokenAmount?.uiAmount || 0);
      total += amt;
    }
    return total;
  } catch {
    return 0;
  }
}

export async function getWalletGascoinBalance(wallet: string): Promise<number> {
  return cacheGetOrFetch(`bal:${wallet}`, () => fetchWalletGascoinBalance(wallet), 300);
}

/** Bust the balance cache for a wallet (call after submission or payout). */
export async function bustBalanceCache(wallet: string): Promise<void> {
  await cacheDel(`bal:${wallet}`);
  await cacheDel(`tier:${wallet}`);
}

export async function hasMinimumGascoin(wallet: string, minTokens = 1): Promise<{ ok: boolean; tokenBalance: number }> {
  const tokenBalance = await getWalletGascoinBalance(wallet);
  return { ok: tokenBalance >= minTokens, tokenBalance };
}

/** @deprecated Use hasMinimumGascoin instead */
export async function hasMinimumGascoinUsd(wallet: string, minUsd = 1): Promise<{ ok: boolean; usdValue: number; tokenBalance: number }> {
  const tokenBalance = await getWalletGascoinBalance(wallet);
  const usdValue = await getGascoinUsdValue(tokenBalance);
  return { ok: usdValue >= minUsd, usdValue, tokenBalance };
}

async function fetchTreasuryBalances(): Promise<{
  solBalance: number;
  solUsd: number;
  gascoinBalance: number;
  gascoinUsd: number;
}> {
  const wallet = process.env.GASCOIN_TREASURY_WALLET;
  if (!wallet) return { solBalance: 0, solUsd: 0, gascoinBalance: 0, gascoinUsd: 0 };

  try {
    const conn = connection();
    const pubkey = new PublicKey(wallet);

    const [lamports, gascoinBalance, { getMarketSnapshot }] = await Promise.all([
      conn.getBalance(pubkey),
      fetchWalletGascoinBalance(wallet),
      import('./pricing')
    ]);

    const market = await getMarketSnapshot();
    const solBalance = lamports / LAMPORTS_PER_SOL;
    const solUsd = solBalance * market.solPriceUsd;
    const gascoinUsd = gascoinBalance * market.gascoinPriceUsd;

    return { solBalance, solUsd, gascoinBalance, gascoinUsd };
  } catch {
    return { solBalance: 0, solUsd: 0, gascoinBalance: 0, gascoinUsd: 0 };
  }
}

export async function getTreasuryBalances() {
  return cacheGetOrFetch('treasury:balance', fetchTreasuryBalances, 60);
}

export async function bustTreasuryCache(): Promise<void> {
  await cacheDel('treasury:balance');
}

export async function sendSolPayout(wallet: string, amountSol: number): Promise<{ ok: boolean; txHash?: string; error?: string }> {
  const live = process.env.ENABLE_LIVE_PAYOUT === 'true';
  if (!live) {
    return { ok: true, txHash: `DRYRUN_${Date.now()}` };
  }

  try {
    const b58 = process.env.TREASURY_PRIVATE_KEY_B58;
    if (!b58) return { ok: false, error: 'missing_treasury_key' };

    const secret = bs58.decode(b58);
    const payer = Keypair.fromSecretKey(secret);

    // C5: Guard against key/wallet env var mismatch — keypair must match the
    // declared treasury wallet. A mismatch means either the wrong key was
    // configured or the env vars are out of sync; refuse to sign in either case.
    const declaredWallet = process.env.GASCOIN_TREASURY_WALLET;
    if (declaredWallet && payer.publicKey.toBase58() !== declaredWallet) {
      return { ok: false, error: 'treasury_key_wallet_mismatch' };
    }
    const to = new PublicKey(wallet);
    const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
    if (lamports <= 0) return { ok: false, error: 'invalid_amount' };

    const conn = connection();
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: to,
        lamports
      })
    );
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = (await conn.getLatestBlockhash('confirmed')).blockhash;
    tx.sign(payer);
    const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false });
    await conn.confirmTransaction(sig, 'confirmed');
    return { ok: true, txHash: sig };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'payout_error' };
  }
}
