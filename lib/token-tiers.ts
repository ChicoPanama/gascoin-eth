export interface TokenTier {
  id: number;
  name: string;
  slug: string;
  min_tokens: number;
  max_sol_refund: number;
  queue_priority: number;
  badge_label: string;
  description: string;
  perks: string[];
}

export const TOKEN_TIERS: TokenTier[] = [
  {
    id: 0, name: 'Standard', slug: 'standard', min_tokens: 0,
    max_sol_refund: 0.10, queue_priority: 4, badge_label: '',
    description: 'Default tier. No GASCOIN required.',
    perks: ['Standard refund queue', 'Up to 0.10 SOL per submission', '7-day submission cooldown'],
  },
  {
    id: 1, name: 'Commuter', slug: 'commuter', min_tokens: 100_000,
    max_sol_refund: 0.25, queue_priority: 3, badge_label: 'COMMUTER',
    description: 'Hold 100K GASCOIN to unlock Commuter status.',
    perks: ['Elevated refund queue', 'Up to 0.25 SOL per submission', 'COMMUTER badge on leaderboard'],
  },
  {
    id: 2, name: 'Road Warrior', slug: 'road-warrior', min_tokens: 500_000,
    max_sol_refund: 0.50, queue_priority: 2, badge_label: 'ROAD WARRIOR',
    description: 'Hold 500K GASCOIN for Road Warrior status.',
    perks: ['Priority refund queue', 'Up to 0.50 SOL per submission', 'ROAD WARRIOR badge', 'Featured placement on community feed'],
  },
  {
    id: 3, name: 'Fleet', slug: 'fleet', min_tokens: 2_000_000,
    max_sol_refund: 1.0, queue_priority: 1, badge_label: 'FLEET',
    description: 'Hold 2M GASCOIN for Fleet — the highest tier. A full tank of gas back.',
    perks: ['Highest priority queue', 'Up to 1.0 SOL per submission — a full tank', 'FLEET badge everywhere', 'Featured on community feed always', 'Early access to new features'],
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
