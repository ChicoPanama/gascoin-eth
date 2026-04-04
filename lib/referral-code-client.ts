export async function generateReferralCodeClient(walletAddress: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(walletAddress.toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex.slice(0, 8).toUpperCase();
}
