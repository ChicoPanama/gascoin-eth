'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../lib/supabase-client';
import { DEMO_REFERRAL } from '../../lib/demo-data';

export function ReferralTeaser() {
  const [totalConv, setTotalConv] = useState(0);
  const [totalSol, setTotalSol] = useState(0);
  const [referrers, setReferrers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabaseBrowser
          .from('referral_summary_view')
          .select('referrer_wallet, total_conversions, total_referral_sol_earned');
        if (data && data.length > 0) {
          setTotalConv(data.reduce((s: number, r: any) => s + Number(r.total_conversions || 0), 0));
          setTotalSol(data.reduce((s: number, r: any) => s + Number(r.total_referral_sol_earned || 0), 0));
          setReferrers(data.length);
        } else {
          setTotalConv(DEMO_REFERRAL.totalConversions);
          setReferrers(DEMO_REFERRAL.activeReferrers);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <section className="ref-teaser">
      <div className="ref-teaser-inner">
        <div className="ref-teaser-left">
          <div className="gc-section-num">07 — Earn More</div>
          <h2 className="ref-teaser-title">
            <span>Refer &amp;</span>
            <span className="ref-teaser-ghost">Earn Points.</span>
          </h2>
          <p className="ref-teaser-sub">
            Share your referral link. Every approved submission through your link
            earns you points that boost your leaderboard rank and status.
          </p>
          <Link href="/referral" className="gc-teaser-link">Get Your Referral Link</Link>
        </div>
        <div className="ref-teaser-right">
          <div className="ref-teaser-stats glass-card" style={{ padding: 24 }}>
            <div className="ref-teaser-stat">
              <div className="ref-teaser-stat-value">{loading ? '—' : totalConv.toLocaleString()}</div>
              <div className="ref-teaser-stat-label">Total Conversions</div>
            </div>
            <div className="ref-teaser-stat">
              <div className="ref-teaser-stat-value">{loading ? '—' : referrers.toLocaleString()}</div>
              <div className="ref-teaser-stat-label">Active Referrers</div>
            </div>
          </div>
          <div className="ref-teaser-active">Join {loading ? '—' : referrers} active referrers</div>
        </div>
      </div>
    </section>
  );
}
