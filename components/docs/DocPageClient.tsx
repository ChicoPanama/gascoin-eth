'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DocSection } from '../../lib/docs-content';

export function DocPageClient({ section, prev, next }: {
  section: DocSection;
  prev: DocSection | null;
  next: DocSection | null;
}) {
  const [copied, setCopied] = useState(false);
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([]);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const container = document.getElementById('doc-content');
    if (!container) return;
    const els = container.querySelectorAll('h3');
    const found: { id: string; text: string; level: number }[] = [];
    els.forEach((el, i) => {
      if (!el.id) el.id = `h-${i}`;
      found.push({ id: el.id, text: el.textContent ?? '', level: 3 });
    });
    setHeadings(found);
  }, [section.slug]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) setActiveId(e.target.id); }); },
      { rootMargin: '-10% 0px -80% 0px' }
    );
    headings.forEach((h) => { const el = document.getElementById(h.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [headings]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="doc-page-layout">
      <article className="doc-article">
        {/* Breadcrumb */}
        <div className="doc-breadcrumb">
          <Link href="/docs" className="doc-breadcrumb-link">Docs</Link>
          <span className="doc-breadcrumb-sep">/</span>
          <span className="doc-breadcrumb-link">{section.category}</span>
          <span className="doc-breadcrumb-sep">/</span>
          <span className="doc-breadcrumb-current">{section.title}</span>
        </div>

        {/* Header */}
        <div className="doc-page-header">
          <h1 className="doc-page-title">{section.title}</h1>
          {section.description && <p className="doc-page-desc">{section.description}</p>}
          <button className="doc-copy-link" onClick={copyLink}>{copied ? '✓ COPIED' : 'COPY LINK'}</button>
        </div>

        {/* Content */}
        <div id="doc-content" className="doc-content" dangerouslySetInnerHTML={{ __html: section.content }} />

        {/* Prev/Next */}
        <div className="doc-page-nav">
          {prev ? (
            <Link href={`/docs/${prev.slug}`} className="doc-nav-btn">
              <span className="doc-nav-dir">← Previous</span>
              <span className="doc-nav-title">{prev.title}</span>
            </Link>
          ) : <div />}
          {next ? (
            <Link href={`/docs/${next.slug}`} className="doc-nav-btn doc-nav-next">
              <span className="doc-nav-dir">Next →</span>
              <span className="doc-nav-title">{next.title}</span>
            </Link>
          ) : <div />}
        </div>
      </article>

      {/* On-page TOC */}
      {headings.length > 1 && (
        <aside className="doc-toc">
          <div className="doc-toc-label">ON THIS PAGE</div>
          {headings.map((h) => (
            <a key={h.id} href={`#${h.id}`} className={`doc-toc-item${activeId === h.id ? ' doc-toc-item--active' : ''}`}>
              {h.text}
            </a>
          ))}
        </aside>
      )}
    </div>
  );
}
