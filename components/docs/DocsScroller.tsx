'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';

export type ScrollerChapter = {
  slug: string;
  label: string;
  kicker: string;
  roman: string;
  sections: { slug: string; title: string }[];
};

type Props = {
  chapters: ScrollerChapter[];
  totalSections: number;
  gateCount: number;
  children: ReactNode;
};

function cleanTitle(t: string) {
  return t
    .replace(/^\d+(?:\.\d+)*\.\s*/, '')
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/\s+—\s+Complete Reference$/i, '')
    .trim();
}

export function DocsScroller({ chapters, totalSections, gateCount, children }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string>('');
  const [activeChapter, setActiveChapter] = useState<string>(chapters[0]?.slug ?? '');
  const [progress, setProgress] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [copied, setCopied] = useState<string>('');

  // Scroll progress + scroll-spy on sections
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const sections = Array.from(root.querySelectorAll<HTMLElement>('.gcdocs-section'));
    if (!sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const top = visible[0]?.target as HTMLElement | undefined;
        if (top) {
          setActiveSection(top.id);
          const ch = top.getAttribute('data-chapter');
          if (ch) setActiveChapter(ch);
        }
      },
      { root, rootMargin: '-20% 0px -70% 0px', threshold: [0, 0.1, 0.5] }
    );
    sections.forEach((s) => io.observe(s));

    const onScroll = () => {
      const h = root.scrollHeight - root.clientHeight;
      setProgress(h > 0 ? Math.min(100, Math.max(0, (root.scrollTop / h) * 100)) : 0);
    };
    onScroll();
    root.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      io.disconnect();
      root.removeEventListener('scroll', onScroll);
    };
  }, [chapters]);

  // Scroll to hash on load (e.g. /docs#gate-ai_image_check-gate-x)
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    // Small delay so content has mounted
    const t = setTimeout(() => {
      const el = document.getElementById(hash);
      if (el && root.contains(el)) {
        root.scrollTo({ top: el.offsetTop - 40, behavior: 'instant' as ScrollBehavior });
      }
    }, 50);
    return () => clearTimeout(t);
  }, []);

  // Keyboard shortcut: "/" focuses search, Esc clears
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'Escape') {
        if (document.activeElement === searchRef.current) {
          setQuery('');
          searchRef.current?.blur();
        }
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const q = query.trim().toLowerCase();
  const filteredChapters = useMemo(() => {
    if (!q) return chapters;
    return chapters
      .map((c) => ({
        ...c,
        sections: c.sections.filter((s) => s.title.toLowerCase().includes(q)),
      }))
      .filter((c) => c.sections.length > 0);
  }, [chapters, q]);

  const matchCount = q ? filteredChapters.reduce((n, c) => n + c.sections.length, 0) : totalSections;

  const goTo = (id: string) => {
    const root = scrollRef.current;
    const el = document.getElementById(id);
    if (!root || !el) return;
    root.scrollTo({ top: el.offsetTop - 32, behavior: 'smooth' });
    // Update hash without jumping
    history.replaceState(null, '', `#${id}`);
    setMobileOpen(false);
  };

  const copyLink = async (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(''), 1500);
    } catch {}
  };

  // Delegate clicks on section anchors (<a class="gcdocs-section-anchor">) → copy link
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a.gcdocs-section-anchor') as HTMLAnchorElement | null;
      if (!anchor) return;
      e.preventDefault();
      const section = anchor.closest('.gcdocs-section') as HTMLElement | null;
      if (section?.id) copyLink(section.id);
    };
    root.addEventListener('click', handler);
    return () => root.removeEventListener('click', handler);
  }, []);

  return (
    <div className="gcdocs-shell">
      {/* Top progress bar */}
      <div className="gcdocs-progress" style={{ width: `${progress}%` }} aria-hidden />

      {/* Mobile top bar */}
      <div className="gcdocs-mobile-bar">
        <Link href="/" className="gcdocs-mobile-logo">GASCOIN · DOCS</Link>
        <button className="gcdocs-mobile-toggle" onClick={() => setMobileOpen((v) => !v)}>
          {mobileOpen ? '✕' : '☰'} CONTENTS
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`gcdocs-rail${mobileOpen ? ' gcdocs-rail--open' : ''}`}>
        <div className="gcdocs-rail-head">
          <Link href="/" className="gcdocs-rail-brand">
            <span className="gcdocs-rail-brand-wordmark">GASCOIN</span>
            <span className="gcdocs-rail-brand-badge">DOCS</span>
          </Link>
          <div className="gcdocs-rail-sub">The complete protocol manual</div>
        </div>

        <div className="gcdocs-rail-search">
          <input
            ref={searchRef}
            type="text"
            value={query}
            placeholder="Search — press /"
            onChange={(e) => setQuery(e.target.value)}
            className="gcdocs-rail-search-input"
            aria-label="Search documentation"
          />
          {query && (
            <button className="gcdocs-rail-search-clear" onClick={() => setQuery('')} aria-label="Clear search">✕</button>
          )}
        </div>

        <div className="gcdocs-rail-meter">
          <span>{matchCount}</span>
          <span>{q ? 'matches' : 'sections'}</span>
        </div>

        <nav className="gcdocs-rail-nav" aria-label="Chapters">
          {filteredChapters.map((c) => {
            const isActive = activeChapter === c.slug;
            return (
              <div key={c.slug} className={`gcdocs-rail-cat${isActive ? ' gcdocs-rail-cat--active' : ''}`}>
                <button
                  className="gcdocs-rail-cat-btn"
                  onClick={() => goTo(`ch-${c.slug}`)}
                  title={c.label}
                >
                  <span className="gcdocs-rail-roman">{c.roman}</span>
                  <span className="gcdocs-rail-cat-label">{c.label}</span>
                </button>
                {isActive && (
                  <div className="gcdocs-rail-sections">
                    {c.sections.map((s) => (
                      <button
                        key={s.slug}
                        onClick={() => goTo(s.slug)}
                        className={`gcdocs-rail-section${activeSection === s.slug ? ' gcdocs-rail-section--active' : ''}`}
                      >
                        {cleanTitle(s.title)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {q && filteredChapters.length === 0 && (
            <div className="gcdocs-rail-empty">No matches for "{query}"</div>
          )}
        </nav>

        <div className="gcdocs-rail-foot">
          <Link href="/submit" className="gcdocs-rail-foot-link">→ Submit Receipt</Link>
          <Link href="/gates" className="gcdocs-rail-foot-link">→ Gates Checklist ({gateCount})</Link>
          <Link href="/" className="gcdocs-rail-foot-link gcdocs-rail-foot-link--muted">← Back to Site</Link>
        </div>
      </aside>

      {/* Scrollable main */}
      <main ref={scrollRef} className="gcdocs-scroll">
        <div className="gcdocs-scroll-inner">{children}</div>
      </main>

      {/* Copy-link toast */}
      {copied && <div className="gcdocs-toast">Link copied · #{copied}</div>}
    </div>
  );
}
