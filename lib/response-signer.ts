/**
 * Gas Network Piece 3 — HMAC-signed response envelope for Enterprise-tier
 * API consumers. Downstream systems use `verifyEnvelope` (or equivalent
 * SHA-256 HMAC logic) to confirm the payload wasn't tampered between
 * GASCOIN and their database.
 *
 * Key lifecycle: `GASCOIN_API_SIGNING_KEY` — single HMAC secret, rotated
 * quarterly. `keyId` in the envelope identifies the active key version
 * so consumers can handle rotation without breaking.
 *
 * Signature surface: `sign(payload_json + timestamp + nonce + keyId)`.
 * Timestamp bounds replay to a 5-minute window.
 */

import { createHmac, randomBytes } from 'crypto';

const REPLAY_WINDOW_SEC = 5 * 60;
const CURRENT_KEY_ID = 'v1';

function getSigningKey(): string {
  const key = process.env.GASCOIN_API_SIGNING_KEY;
  if (!key || key.length < 32) {
    throw new Error('GASCOIN_API_SIGNING_KEY missing or too short (need ≥32 chars)');
  }
  return key;
}

export interface SignedEnvelope<T = unknown> {
  data: T;
  timestamp: number;
  nonce: string;
  keyId: string;
  signature: string;
}

function computeSignature(
  dataJson: string,
  timestamp: number,
  nonce: string,
  keyId: string,
): string {
  const material = `${keyId}|${timestamp}|${nonce}|${dataJson}`;
  return createHmac('sha256', getSigningKey()).update(material).digest('hex');
}

export function signEnvelope<T>(data: T): SignedEnvelope<T> {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = randomBytes(8).toString('hex');
  const dataJson = JSON.stringify(data);
  const signature = computeSignature(dataJson, timestamp, nonce, CURRENT_KEY_ID);
  return {
    data,
    timestamp,
    nonce,
    keyId: CURRENT_KEY_ID,
    signature,
  };
}

export function verifyEnvelope<T>(envelope: SignedEnvelope<T>): boolean {
  try {
    // Reject if too old (replay protection)
    const age = Math.floor(Date.now() / 1000) - Number(envelope.timestamp || 0);
    if (age > REPLAY_WINDOW_SEC || age < -30) return false;
    const dataJson = JSON.stringify(envelope.data);
    const expected = computeSignature(dataJson, envelope.timestamp, envelope.nonce, envelope.keyId);
    return timingSafeEqualHex(expected, envelope.signature);
  } catch {
    return false;
  }
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
