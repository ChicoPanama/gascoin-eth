'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { Nav } from '../../components/Nav';
import { DashboardClient } from './DashboardClient';
import './dashboard.css';

export default function MeDashboardPage() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      router.push('/submit');
      return;
    }

    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch('/api/me', {
          headers: token ? { authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/submit');
            return;
          }
          throw new Error('Failed to load dashboard');
        }
        setData(await res.json());
      } catch (e: any) {
        setError(e.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, authenticated, getAccessToken, router]);

  if (!ready || loading) {
    return (
      <div className="container ud-page">
        <Nav />
        <main id="main-content">
          <header className="ud-header">
            <div className="ud-header__meta">
              <span className="gc-section-label">— Personal Dashboard</span>
            </div>
            <h1 className="ud-title" style={{ opacity: 0.15 }}>MY GASCOIN</h1>
          </header>
          <section className="gc-stats">
            <div className="gc-stats-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="gc-stat">
                  <div className="gc-stat-label" style={{ opacity: 0.2 }}>—</div>
                  <div className="gc-stat-value" style={{ opacity: 0.1 }}>0</div>
                </div>
              ))}
            </div>
          </section>
          <div style={{ padding: '48px 0', textAlign: 'center', fontFamily: '"IBM Plex Mono", monospace', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            Loading...
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container ud-page">
        <Nav />
        <main id="main-content">
          <div style={{ padding: '120px 0', textAlign: 'center', fontFamily: '"IBM Plex Mono", monospace', fontSize: 13, color: 'rgba(255,100,100,0.8)' }}>
            {error}
          </div>
        </main>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="container ud-page">
      <Nav />
      <main id="main-content">
        <DashboardClient
          wallet={data.wallet}
          xHandle={data.xHandle}
          claims={data.claims}
          payouts={data.payouts}
          referral={data.referral}
          stats={data.stats}
          networkImpact={data.networkImpact}
          pricing={data.pricing}
        />
      </main>
    </div>
  );
}
