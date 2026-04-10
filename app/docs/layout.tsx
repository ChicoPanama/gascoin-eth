'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { DOC_CATEGORIES } from '../../lib/docs-content';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentSlug = pathname.split('/docs/')[1] ?? '';
  const [search, setSearch] = useState('');
  const [openCats, setOpenCats] = useState<Record<string, boolean>>(
    Object.fromEntries(DOC_CATEGORIES.map((c) => [c.slug, true]))
  );

  useEffect(() => {
    DOC_CATEGORIES.forEach((cat) => {
      if (cat.sections.some((s) => s.slug === currentSlug)) {
        setOpenCats((prev) => ({ ...prev, [cat.slug]: true }));
      }
    });
  }, [currentSlug]);

  const filtered = DOC_CATEGORIES.map((cat) => ({
    ...cat,
    sections: cat.sections.filter((s) =>
      !s.navHidden && (!search || s.title.toLowerCase().includes(search.toLowerCase()))
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
                    >
                      {s.title}
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
