#!/usr/bin/env tsx
/**
 * Devnet SOL payout smoke test
 *
 * Verifies the full treasury keypair → RPC → lamport transfer path
 * against Solana devnet before enabling live payouts on mainnet.
 *
 * Usage:
 *   npx dotenv -e .env.local -- npx tsx scripts/devnet-smoke-test.ts <DEST_WALLET>
 *
 * Required env vars (override .env.local for devnet):
 *   TREASURY_PRIVATE_KEY_B58   — base58-encoded treasury keypair secret
 *   GASCOIN_TREASURY_WALLET    — expected public key of the treasury (mismatch = abort)
 *
 * The script forces SOLANA_RPC_URL=devnet and ENABLE_LIVE_PAYOUT=true
 * regardless of what .env.local contains, so it's safe to run against
 * a devnet-funded keypair without touching mainnet.
 *
 * To fund the devnet treasury keypair:
 *   solana airdrop 1 <GASCOIN_TREASURY_WALLET> --url devnet
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import bs58 from 'bs58';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const SMOKE_AMOUNT_SOL = 0.000001; // 1000 lamports — negligible cost

async function main() {
  const destWallet = process.argv[2];
  if (!destWallet) {
    console.error('Usage: npx tsx scripts/devnet-smoke-test.ts <DEST_WALLET>');
    process.exit(1);
  }

  const b58 = process.env.TREASURY_PRIVATE_KEY_B58;
  const declaredWallet = process.env.GASCOIN_TREASURY_WALLET;

  if (!b58) {
    console.error('❌  TREASURY_PRIVATE_KEY_B58 is not set');
    process.exit(1);
  }

  // Decode keypair
  let payer: Keypair;
  try {
    payer = Keypair.fromSecretKey(bs58.decode(b58));
  } catch (e: any) {
    console.error(`❌  Failed to decode TREASURY_PRIVATE_KEY_B58: ${e?.message}`);
    process.exit(1);
  }

  const payerAddress = payer.publicKey.toBase58();
  console.log(`Treasury pubkey : ${payerAddress}`);

  // Guard: keypair must match declared wallet
  if (declaredWallet && payerAddress !== declaredWallet) {
    console.error(`❌  Keypair mismatch!`);
    console.error(`    GASCOIN_TREASURY_WALLET = ${declaredWallet}`);
    console.error(`    Keypair derived pubkey  = ${payerAddress}`);
    console.error('    Fix: update TREASURY_PRIVATE_KEY_B58 or GASCOIN_TREASURY_WALLET so they match.');
    process.exit(1);
  }

  // Validate destination wallet
  let to: PublicKey;
  try {
    to = new PublicKey(destWallet);
  } catch {
    console.error(`❌  Invalid destination wallet: ${destWallet}`);
    process.exit(1);
  }

  const conn = new Connection(DEVNET_RPC, 'confirmed');

  // Check treasury devnet balance
  const lamports = await conn.getBalance(payer.publicKey);
  const solBalance = lamports / LAMPORTS_PER_SOL;
  console.log(`Treasury balance: ${solBalance.toFixed(6)} SOL (devnet)`);

  const sendLamports = Math.floor(SMOKE_AMOUNT_SOL * LAMPORTS_PER_SOL);
  if (lamports < sendLamports + 5000) {
    console.error(`❌  Insufficient devnet balance.`);
    console.error(`    Need at least ${(sendLamports + 5000) / LAMPORTS_PER_SOL} SOL (transfer + fees).`);
    console.error(`    Fund with: solana airdrop 1 ${payerAddress} --url devnet`);
    process.exit(1);
  }

  console.log(`Sending ${SMOKE_AMOUNT_SOL} SOL → ${to.toBase58()} on devnet...`);

  try {
    const tx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: to, lamports: sendLamports }),
    );
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = (await conn.getLatestBlockhash('confirmed')).blockhash;
    tx.sign(payer);

    const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false });
    await conn.confirmTransaction(sig, 'confirmed');

    console.log(`✅  Transaction confirmed`);
    console.log(`    Signature : ${sig}`);
    console.log(`    Explorer  : https://explorer.solana.com/tx/${sig}?cluster=devnet`);
    console.log('');
    console.log('Smoke test passed. Keypair, RPC, and lamport transfer are all healthy.');
    console.log('Set ENABLE_LIVE_PAYOUT=true and SOLANA_RPC_URL to your mainnet RPC when ready.');
  } catch (e: any) {
    console.error(`❌  Transaction failed: ${e?.message || e}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
