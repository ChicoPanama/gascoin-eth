export function getAdminWallets(): string[] {
  const raw = process.env.ADMIN_WALLET_ADDRESSES ?? '';
  return raw.split(',').map((w) => w.trim()).filter((w) => w.length > 0);
}

export function isAdminWallet(walletAddress: string): boolean {
  return getAdminWallets().includes(walletAddress);
}
