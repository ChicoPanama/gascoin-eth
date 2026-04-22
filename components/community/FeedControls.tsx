'use client';

import { useState } from 'react';
import type { FeedFilter, FeedSort } from '../../types/community';

const SORT_OPTIONS: { value: FeedSort; label: string }[] = [
  { value: 'newest', label: 'NEWEST' },
  { value: 'oldest', label: 'OLDEST' },
  { value: 'highest_eth', label: 'HIGHEST ETH' },
  { value: 'highest_usd', label: 'HIGHEST USD' },
];

export function FeedControls({
  filter, sort, hasWallet,
  onFilterChange, onSortChange, onConnectWallet,
}: {
  filter: FeedFilter;
  sort: FeedSort;
  hasWallet: boolean;
  onFilterChange: (f: FeedFilter) => void;
  onSortChange: (s: FeedSort) => void;
  onConnectWallet: () => void;
}) {
  const [sortOpen, setSortOpen] = useState(false);

  const handleMine = () => {
    if (!hasWallet) { onConnectWallet(); return; }
    onFilterChange('own');
  };

  return (
    <div className="cf-controls">
      <div className="cf-filters">
        {(['all', 'featured'] as FeedFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={`cf-filter-tab${filter === f ? ' cf-filter-tab--active' : ''}`}
            onClick={() => onFilterChange(f)}
          >
            {f.toUpperCase()}
          </button>
        ))}
        <button
          type="button"
          className={`cf-filter-tab${filter === 'own' ? ' cf-filter-tab--active' : ''}`}
          onClick={handleMine}
        >
          MINE
        </button>
      </div>

      <div className="cf-sort-wrap">
        <button
          type="button"
          className="cf-sort-btn"
          onClick={() => setSortOpen(!sortOpen)}
        >
          {SORT_OPTIONS.find((o) => o.value === sort)?.label} ▾
        </button>
        {sortOpen && (
          <div className="cf-sort-dropdown">
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`cf-sort-option${sort === o.value ? ' cf-sort-option--active' : ''}`}
                onClick={() => { onSortChange(o.value); setSortOpen(false); }}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
