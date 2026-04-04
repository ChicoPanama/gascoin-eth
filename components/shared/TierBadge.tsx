'use client';

import type { TokenTier } from '../../lib/token-tiers';

const BORDER_OPACITY: Record<number, string> = {
  0: '',
  1: 'rgba(255,255,255,0.2)',
  2: 'rgba(255,255,255,0.4)',
  3: 'rgba(255,255,255,0.6)',
};

export function TierBadge({ tier }: { tier: TokenTier }) {
  if (!tier.badge_label) return null;

  return (
    <span
      className="tier-badge"
      style={{ borderColor: BORDER_OPACITY[tier.id] || 'rgba(255,255,255,0.2)' }}
    >
      {tier.badge_label}
    </span>
  );
}
