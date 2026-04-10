'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { DOC_CATEGORIES } from '../../lib/docs-content';

const ESSENTIAL_SLUGS = new Set([
  'what-is-gascoin',
  'core-concept-in-plain-english',
  'what-you-receive',
  'what-you-need-before-starting',
  'the-submission-process-complete-step-by-step-guide',
  'step-1-connect-your-wallet',
  'step-2-verify-your-tweet',
  'step-3-upload-your-receipt',
  'step-4-review-and-submit',
  'step-5-gate-progress',
  'the-10-verification-gates-complete-reference',
  'gate-5-wallet-on-receipt',
  'gate-10-treasury-solvent',
  'technology-overview',
  'end-to-end-architecture-map',
  'ai-system-overview',
  'receipt-intelligence-pipeline',
  'gate-decision-and-retry-paths',
  '4-layer-fraud-detection',
  'on-chain-verification',
  'security-and-anti-fraud-measures',
  'start-here-common-issues',
  'my-wallet-wont-connect',
  'gate-10-failed-where-is-my-sol',
  'support-and-contact',
]);

const CATEGORY_LABELS: Record<string, string> = {
  overview: 'Overview',
  submitting: 'User Flow',
  verification: 'Verification Gates',
  technology: 'Technology',
  platform: 'Product Surfaces',
  security: 'Admin & Security',
  help: 'Support',
};

function cleanTitle(title: string): string {
  return title
    .replace(/^\d+(?:\.\d+)*\.\s*/, '')
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/\s+—\s+Complete Reference$/i, '')
    .trim();
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentSlug = pathname.split('/docs/')[1] ?? '';
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(true);
  const [openCats, setOpenCats] = useState<Record<string, boolean>>(
    Object.fromEntries(DOC_CATEGORIES.map((c) => [c.slug, false]))
  );

  useEffect(() => {
    DOC_CATEGORIES.forEach((cat) => {
      if (cat.sections.some((s) => s.slug === currentSlug)) {
        setOpenCats((prev) => ({ ...prev, [cat.slug]: true }));
      }
    });
  }, [currentSlug]);

  const searching = !!search.trim();
  const filtered = DOC_CATEGORIES.map((cat) => ({
    ...cat,
    label: CATEGORY_LABELS[cat.slug] ?? cat.label,
    sections: cat.sections.filter((s) =>
      !s.navHidden &&
      (!searching || s.title.toLowerCase().includes(search.toLowerCase())) &&
      (showAll || searching || ESSENTIAL_SLUGS.has(s.slug) || s.slug === currentSlug)
    ),
  })).filter((cat) => cat.sections.length > 0);

  return (
    <div className="docs-root">
      <aside className="docs-sidebar">
        <div className="docs-sidebar-header">
          <Link href="/docs" className="docs-logo-link">
            <span className="docs-logo-text">GASCOIN</span>
            <span className="docs-logo-badge">DOCS</span>
          </Link>
        </div>

        <div className="docs-search">
          <input
            type="text"
            placeholder="Search docs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="docs-search-input"
          />
          {search && <button className="docs-search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>

        {!searching && (
          <div className="docs-search" style={{ paddingTop: 0 }}>
            <button className="docs-footer-link" onClick={() => setShowAll((v) => !v)} style={{ width: '100%', textAlign: 'left' }}>
              {showAll ? 'Show curated docs' : 'Show full docs'}
            </button>
          </div>
        )}

        <nav className="docs-nav">
          {filtered.map((cat) => (
            <div key={cat.slug} className="docs-nav-cat">
              <button className="docs-cat-toggle" onClick={() => setOpenCats((p) => ({ ...p, [cat.slug]: !p[cat.slug] }))}>
                <span>{cat.label}</span>
                <span>{openCats[cat.slug] ? '▾' : '▸'}</span>
              </button>
              {openCats[cat.slug] && (
                <div className="docs-cat-links">
                  {cat.sections.map((s) => (
                    <Link
                      key={s.slug}
                      href={`/docs/${s.slug}`}
                      className={`docs-nav-link${currentSlug === s.slug ? ' docs-nav-link--active' : ''}`}
                      title={s.title}
                    >
                      {cleanTitle(s.title)}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="docs-sidebar-footer">
          <Link href="/submit" className="docs-footer-link">→ Submit Receipt</Link>
          <Link href="/" className="docs-footer-link">← Back to Site</Link>
        </div>
      </aside>

      <main className="docs-main">{children}</main>
    </div>
  );
}
