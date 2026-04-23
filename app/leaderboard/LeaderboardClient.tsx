'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Nav } from '../../components/Nav';
import { LeaderboardHeader } from '../../components/leaderboard/LeaderboardHeader';
import { LeaderboardStatsStrip } from '../../components/leaderboard/LeaderboardStats';
import { PodiumSection } from '../../components/leaderboard/PodiumSection';
import { RankingsTable } from '../../components/leaderboard/RankingsTable';
import { WalletDrillDown } from '../../components/leaderboard/WalletDrillDown';
import { PointsDashboard } from '../../components/leaderboard/PointsDashboard';
import { CommunityFeed } from '../../components/community/CommunityFeed';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { useGascoinWallet } from '../../hooks/useGascoinWallet';

type Tab = 'leaderboard' | 'recent' | 'points';

const TAB_LABELS: Record<Tab, string> = {
  leaderboard: 'LEADERBOARD',
  recent:      'RECENT',
  points:      'POINTS ENGINE',
};

function parseTab(value: string | null): Tab {
  if (value === 'recent' || value === 'points' || value === 'leaderboard') return value;
  // Legacy /community redirect lands at ?view=recent
  if (value === 'community') return 'recent';
  return 'leaderboard';
}

export default function LeaderboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { entries, stats, loading, error, lastUpdated } = useLeaderboard();
  const { address } = useGascoinWallet();
  const [drillWallet, setDrillWallet] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(() => parseTab(searchParams?.get('view') ?? null));

  const connectedWallet = address ?? null;

  // Keep tab state in sync if the URL changes under us (back/forward nav).
  useEffect(() => {
    const fromUrl = parseTab(searchParams?.get('view') ?? null);
    if (fromUrl !== activeTab) setActiveTab(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(Array.from(searchParams?.entries() ?? []));
    if (tab === 'leaderboard') params.delete('view');
    else params.set('view', tab);
    const q = params.toString();
    router.replace(q ? `/leaderboard?${q}` : '/leaderboard', { scroll: false });
  };

  return (
    <div className="container">
      <Nav />

      <LeaderboardHeader lastUpdated={lastUpdated} />

      <div
        style={{
          display: 'flex',
          gap: 0,
          marginBottom: 28,
          borderBottom: '1px solid var(--line)',
          overflowX: 'auto',
        }}
      >
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => selectTab(tab)}
            style={{
              fontFamily: 'IBM Plex Mono',
              fontSize: 11,
              letterSpacing: '0.2em',
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--fg)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--fg)' : 'rgba(var(--fg-rgb),0.35)',
              cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
              marginBottom: -1,
              whiteSpace: 'nowrap',
            }}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {activeTab === 'leaderboard' && (
        <>
          {error && <div className="sf-error" style={{ marginBottom: 24 }}>{error}</div>}
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
          <WalletDrillDown wallet={drillWallet} onClose={() => setDrillWallet(null)} />
        </>
      )}

      {activeTab === 'recent' && <CommunityFeed />}

      {activeTab === 'points' && <PointsDashboard />}
    </div>
  );
}
