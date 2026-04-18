// scripts/devnet-smoke-test.ts
// Tests Ethereum Sepolia testnet connectivity and ETH transfer
import { createWalletClient, http, parseEther, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
const PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY as `0x${string}`;
const TO_ADDRESS = process.env.TEST_RECIPIENT as `0x${string}` | undefined;

if (!PRIVATE_KEY?.startsWith('0x')) {
  console.error('ERROR: TREASURY_PRIVATE_KEY must be a hex key starting with 0x');
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({ chain: sepolia, transport: http(SEPOLIA_RPC) });
const walletClient = createWalletClient({ account, chain: sepolia, transport: http(SEPOLIA_RPC) });

async function main() {
  const blockNumber = await publicClient.getBlockNumber();
  console.log(`✓ Sepolia connected — block: ${blockNumber}`);

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`✓ Treasury address: ${account.address}`);
  console.log(`✓ Balance: ${balance} wei`);

  if (TO_ADDRESS && TO_ADDRESS.startsWith('0x') && balance > parseEther('0.001')) {
    const hash = await walletClient.sendTransaction({
      to: TO_ADDRESS,
      value: parseEther('0.0001'),
    });
    console.log(`✓ Test transfer sent: https://sepolia.etherscan.io/tx/${hash}`);
  } else {
    console.log('ℹ Dry-run mode (no TO_ADDRESS or insufficient balance)');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
