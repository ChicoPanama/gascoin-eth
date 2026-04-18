/**
 * IP-based cross-account claim velocity check.
 *
 * Tracks which X account IDs have submitted claims from each IP/24 subnet
 * within a 7-day rolling window. If two or more DIFFERENT X accounts submit
 * from the same subnet, the second account is flagged as suspicious — a
 * soft signal that adds +0.15 to riskScore and routes the claim to
 * needs_review rather than hard-blocking it.
 *
 * This catches the sock-puppet pattern (one person running multiple verified
 * X accounts from the same home IP) without blocking families or VPN users
 * who share a subnet but have clean individual histories.
 *
 * Key format:  gc:claim:ip:<fingerprint>
 * Value:       JSON array of { xUserId: string; ts: number }
 * TTL:         604 800 s (7 days)
 */

import { cacheGet, cacheSet } from './cache';

const TTL = 604_800; // 7 days in seconds
const KEY_PREFIX = 'gc:claim:ip:';

type Entry = { xUserId: string; ts: number };

export async function checkIpClaimVelocity(
  fingerprint: string,
  xUserId: string,
): Promise<{ suspicious: boolean; distinctAccounts: number }> {
  const key = `${KEY_PREFIX}${fingerprint}`;
  const now = Date.now();
  const cutoff = now - TTL * 1000;

  try {
    const raw = await cacheGet<Entry[]>(key);
    const entries: Entry[] = Array.isArray(raw) ? raw : [];

    // Filter to the rolling 7-day window
    const recent = entries.filter((e) => e.ts >= cutoff);

    // Count distinct X accounts already seen from this subnet (excluding current)
    const others = new Set(recent.filter((e) => e.xUserId !== xUserId).map((e) => e.xUserId));
    const suspicious = others.size >= 1;

    // Append current user and persist (skip if already present to avoid duplicate entries)
    const alreadyPresent = recent.some((e) => e.xUserId === xUserId);
    if (!alreadyPresent) {
      recent.push({ xUserId, ts: now });
    }
    // Fire-and-forget — don't block the submit path on a Redis write failure
    cacheSet(key, recent, TTL).catch(() => {});

    return { suspicious, distinctAccounts: others.size };
  } catch {
    // Fail open — don't block submissions if Redis is unavailable
    return { suspicious: false, distinctAccounts: 0 };
  }
}
