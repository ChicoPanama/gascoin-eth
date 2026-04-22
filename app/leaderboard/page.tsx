import type { Metadata } from 'next';
import LeaderboardClient from './LeaderboardClient';

export const metadata: Metadata = {
  title: 'Leaderboard — GASCOIN',
  description: 'Top GASCOIN community members ranked by verified gas refund points.',
};

export const revalidate = 60;

export default function LeaderboardPage() {
  return <LeaderboardClient />;
}
