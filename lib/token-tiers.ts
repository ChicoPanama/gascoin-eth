export interface TokenTier {
  id: number;
  name: string;
  slug: string;
  min_tokens: number;
  max_sol_refund: number;
  cooldown_days: number;
  queue_priority: number;
  badge_label: string;
  description: string;
  perks: string[];
}

export const TOKEN_TIERS: TokenTier[] = [
  {
    id: 0, name: 'Standard', slug: 'standard', min_tokens: 1,
    max_sol_refund: 0.10, cooldown_days: 7, queue_priority: 4, badge_label: '',
    description: 'Hold 1 GASCOIN to access the platform.',
    perks: ['Standard refund queue', 'Up to 0.10 SOL per submission', '1 submission per week', '7-day cooldown'],
  },
  {
    id: 1, name: 'Commuter', slug: 'commuter', min_tokens: 100_000,
    max_sol_refund: 0.25, cooldown_days: 7, queue_priority: 3, badge_label: 'COMMUTER',
    description: 'Hold 100K GASCOIN to unlock Commuter status.',
    perks: ['Elevated refund queue', 'Up to 0.25 SOL per submission', '1 submission per week', 'COMMUTER badge on leaderboard'],
  },
  {
    id: 2, name: 'Road Warrior', slug: 'road-warrior', min_tokens: 5_000_000,
    max_sol_refund: 0.50, cooldown_days: 3.5, queue_priority: 2, badge_label: 'ROAD WARRIOR',
    description: 'Hold 5M GASCOIN for Road Warrior status — 2 submissions per week.',
    perks: ['Priority refund queue', 'Up to 0.50 SOL per submission', '2 submissions per week', 'ROAD WARRIOR badge', 'Featured placement on community feed'],
  },
  {
    id: 3, name: 'Fleet', slug: 'fleet', min_tokens: 10_000_000,
    max_sol_refund: 1.0, cooldown_days: 1.75, queue_priority: 1, badge_label: 'FLEET',
    description: 'Hold 10M GASCOIN for Fleet — 4 submissions per week, max rewards.',
    perks: ['Highest priority queue', 'Up to 1.0 SOL per submission — a full tank', '4 submissions per week', 'FLEET badge everywhere', 'Featured on community feed always', 'Early access to new features'],
  },
];

export function getTierForBalance(tokenBalance: number): TokenTier {
  return [...TOKEN_TIERS].reverse().find((t) => tokenBalance >= t.min_tokens) ?? TOKEN_TIERS[0];
}

export function getNextTier(currentTierId: number): TokenTier | null {
  return TOKEN_TIERS[currentTierId + 1] ?? null;
}

export function tokensNeededForNextTier(currentBalance: number, currentTierId: number): number {
  const next = getNextTier(currentTierId);
  if (!next) return 0;
  return Math.max(0, next.min_tokens - currentBalance);
}

export function getCooldownForTier(tierId: number): number {
  return TOKEN_TIERS[tierId]?.cooldown_days ?? 7;
}
