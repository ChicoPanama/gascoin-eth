'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../lib/supabase-client';
import { formatSol } from '../../lib/formatters';

interface MiniReceipt {
  country: string | null;
  sol: number;
  date: string;
}

export function CommunityTeaser() {
  const [items, setItems] = useState<MiniReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabaseBrowser
          .from('payouts')
          .select('amount_sol, created_at, claims(country)')
          .eq('status', 'paid')
          .order('created_at', { ascending: false })
          .limit(4);

        setItems(
          (data || []).map((p: any) => ({
            country: p.claims?.country || null,
            sol: Number(p.amount_sol || 0),
            date: new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          }))
        );
      } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <section className="cf-teaser">
      <div className="cf-teaser-inner">
        <div className="cf-teaser-left">
          <div className="gc-section-num">04 — Proof of Payout</div>
          <h2 className="cf-teaser-title">
            <span>Real Receipts.</span>
            <span className="cf-teaser-ghost">Real Payouts.</span>
          </h2>
          <p className="cf-teaser-sub">
            Every card below is a verified gas receipt that received a SOL refund
            from the GASCOIN treasury. No actors. No mockups.
          </p>
          <Link href="/community" className="gc-teaser-link">View all receipts</Link>
        </div>
        <div className="cf-teaser-right">
          <div className="cf-teaser-grid">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="cf-teaser-card">
                    <div className="lb-shimmer" style={{ width: '60%', height: 12, marginBottom: 8 }} />
                    <div className="lb-shimmer" style={{ width: '40%', height: 24 }} />
                  </div>
                ))
              : items.map((item, i) => (
                  <div key={i} className="cf-teaser-card glass-card">
                    <div className="cf-teaser-card-loc">
                      {item.country || 'Verified'}
                    </div>
                    <div className="cf-teaser-card-sol">{formatSol(item.sol)}</div>
                    <div className="cf-teaser-card-date">{item.date}</div>
                  </div>
                ))
            }
          </div>
          <div className="cf-teaser-live">Live · updating</div>
        </div>
      </div>
    </section>
  );
}
