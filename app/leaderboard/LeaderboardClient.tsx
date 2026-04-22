'use client';

import { useState } from 'react';
import { Nav } from '../../components/Nav';
import { LeaderboardHeader } from '../../components/leaderboard/LeaderboardHeader';
import { LeaderboardStatsStrip } from '../../components/leaderboard/LeaderboardStats';
import { PodiumSection } from '../../components/leaderboard/PodiumSection';
import { RankingsTable } from '../../components/leaderboard/RankingsTable';
import { WalletDrillDown } from '../../components/leaderboard/WalletDrillDown';
import { PointsDashboard } from '../../components/leaderboard/PointsDashboard';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { useGascoinWallet } from '../../hooks/useGascoinWallet';

type Tab = 'leaderboard' | 'points';

const TAB_LABELS: Record<Tab, string> = {
  leaderboard: 'LEADERBOARD',
  points: 'POINTS ENGINE',
};

export default function LeaderboardClient() {
  const { entries, stats, loading, error, lastUpdated } = useLeaderboard();
  const { address } = useGascoinWallet();
  const [drillWallet, setDrillWallet] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('leaderboard');

  const connectedWallet = address ?? null;

  return (
    <div className="container">
      <Nav />

      <LeaderboardHeader lastUpdated={lastUpdated} />

      <div style={{
        display: 'flex',
        gap: 0,
        marginBottom: 28,
        borderBottom: '1px solid var(--line)',
      }}>
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              fontFamily: 'IBM Plex Mono',
              fontSize: 11,
              letterSpacing: '0.2em',
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab
                ? '2px solid var(--fg)'
                : '2px solid transparent',
              color: activeTab === tab
                ? 'var(--fg)'
                : 'rgba(var(--fg-rgb),0.35)',
              cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
              marginBottom: -1,
            }}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {activeTab === 'leaderboard' && (
        <>
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
        </>
      )}

      {activeTab === 'points' && <PointsDashboard />}
    </div>
  );
}
