'use client';

import { useState } from 'react';
import { Nav } from '../../components/Nav';
import { LeaderboardHeader } from '../../components/leaderboard/LeaderboardHeader';
import { LeaderboardStatsStrip } from '../../components/leaderboard/LeaderboardStats';
import { PodiumSection } from '../../components/leaderboard/PodiumSection';
import { RankingsTable } from '../../components/leaderboard/RankingsTable';
import { WalletDrillDown } from '../../components/leaderboard/WalletDrillDown';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { useGascoinWallet } from '../../hooks/useGascoinWallet';

export default function LeaderboardPage() {
  const { entries, stats, loading, error, lastUpdated } = useLeaderboard();
  const { publicKey } = useGascoinWallet();
  const [drillWallet, setDrillWallet] = useState<string | null>(null);

  const connectedWallet = publicKey?.toBase58() ?? null;

  return (
    <div className="container">
      <Nav />

      <LeaderboardHeader lastUpdated={lastUpdated} />

      {error && (
        <div className="sf-error" style={{ marginBottom: 24 }}>{error}</div>
      )}

      <LeaderboardStatsStrip stats={stats} loading={loading} />

      <PodiumSection entries={entries} connectedWallet={connectedWallet} />

      <div className={`lb-main${drillWallet ? ' lb-main--split' : ''}`}>
        <RankingsTable
          entries={entries}
          loading={loading}
          connectedWallet={connectedWallet}
          onRowClick={(w) => setDrillWallet(w)}
        />
      </div>

      <WalletDrillDown
        wallet={drillWallet}
        onClose={() => setDrillWallet(null)}
      />
    </div>
  );
}
