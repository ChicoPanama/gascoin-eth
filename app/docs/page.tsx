import { DOC_CATEGORIES, type DocCategory } from '../../lib/docs-content';
import { GATE_COUNT } from '../../lib/policy';
import { DocsScroller } from '../../components/docs/DocsScroller';
import Link from 'next/link';

export const metadata = {
  title: 'GASCOIN — The Complete Protocol Manual',
  description: `Single-page documentation for GASCOIN: ${GATE_COUNT} verification gates, 3-AI pipeline, Ethereum payouts, and the full Season 1 beta manual.`,
};

const CHAPTER_ORDER = [
  'overview',
  'submitting',
  'verification',
  'technology',
  'platform',
  'security',
  'help',
] as const;

const CHAPTER_META: Record<string, { label: string; kicker: string; roman: string }> = {
  overview:     { label: 'The Protocol',        kicker: 'What GASCOIN is and why it exists',                        roman: 'I' },
  submitting:   { label: 'The Submission',      kicker: 'Step-by-step flow from receipt to ETH refund',             roman: 'II' },
  verification: { label: 'The Gates',           kicker: `All ${GATE_COUNT} automated verification checks, in order`, roman: 'III' },
  technology:   { label: 'The Machine Room',    kicker: '3 AI engines, 17 gates, 9 cron workers, 4-layer cache',    roman: 'IV' },
  platform:     { label: 'The Surfaces',        kicker: 'Every page on gascoin.app and what it does',               roman: 'V' },
  security:     { label: 'Admin & Anti-Fraud',  kicker: 'How we keep treasuries honest and submissions real',       roman: 'VI' },
  help:         { label: 'Troubleshooting',     kicker: 'Why your submission got blocked — and the fix',            roman: 'VII' },
};

function chapterSort(a: DocCategory, b: DocCategory) {
  return CHAPTER_ORDER.indexOf(a.slug as typeof CHAPTER_ORDER[number]) -
         CHAPTER_ORDER.indexOf(b.slug as typeof CHAPTER_ORDER[number]);
}

// Note: section.content is author-controlled static HTML from lib/docs-content.ts
// (committed to the repo, not user input). Safe to render inline.
export default function DocsSinglePage() {
  const chapters = [...DOC_CATEGORIES]
    .sort(chapterSort)
    .map((cat) => ({
      ...cat,
      sections: cat.sections.filter((s) => !s.navHidden),
    }))
    .filter((cat) => cat.sections.length > 0);

  const totalSections = chapters.reduce((n, c) => n + c.sections.length, 0);

  return (
    <DocsScroller
      chapters={chapters.map((c) => ({
        slug: c.slug,
        label: CHAPTER_META[c.slug]?.label ?? c.label,
        kicker: CHAPTER_META[c.slug]?.kicker ?? '',
        roman: CHAPTER_META[c.slug]?.roman ?? '',
        sections: c.sections.map((s) => ({ slug: s.slug, title: s.title })),
      }))}
      totalSections={totalSections}
      gateCount={GATE_COUNT}
    >
      <section className="gcdocs-hero" id="top">
        <div className="gcdocs-hero-rule">
          <span>DOCUMENTATION</span>
          <span>SEASON 1 BETA · LAST UPDATED 2026-04-13</span>
        </div>
        <h1 className="gcdocs-hero-title">
          The Complete<br />GASCOIN<br />Manual.
        </h1>
        <p className="gcdocs-hero-lede">
          Every gate. Every AI engine. Every decision. One page, one source of truth.
          Everything the protocol does is documented here and generated directly from the code that runs in production.
        </p>
        <div className="gcdocs-hero-stats">
          <div className="gcdocs-hero-stat">
            <div className="gcdocs-hero-stat-n">{GATE_COUNT}</div>
            <div className="gcdocs-hero-stat-l">Verification Gates</div>
          </div>
          <div className="gcdocs-hero-stat">
            <div className="gcdocs-hero-stat-n">3</div>
            <div className="gcdocs-hero-stat-l">AI Engines</div>
          </div>
          <div className="gcdocs-hero-stat">
            <div className="gcdocs-hero-stat-n">{chapters.length}</div>
            <div className="gcdocs-hero-stat-l">Chapters</div>
          </div>
          <div className="gcdocs-hero-stat">
            <div className="gcdocs-hero-stat-n">{totalSections}</div>
            <div className="gcdocs-hero-stat-l">Sections</div>
          </div>
        </div>
        <div className="gcdocs-hero-cta">
          <a href="#ch-overview" className="gcdocs-hero-btn gcdocs-hero-btn--primary">Start Reading →</a>
          <Link href="/submit" className="gcdocs-hero-btn">Submit Receipt</Link>
        </div>
        <pre className="gcdocs-hero-ascii">
{`  BUY GAS  ──→  WRITE LAST 4  ──→  TWEET $GASCOIN  ──→  SUBMIT  ──→  ${GATE_COUNT} GATES  ──→  ETH REFUND
  (any station)    (on receipt)      (public post)      (upload)   (auto-verify)    (to wallet)`}
        </pre>
      </section>

      {chapters.map((cat) => {
        const meta = CHAPTER_META[cat.slug];
        return (
          <section key={cat.slug} id={`ch-${cat.slug}`} className="gcdocs-chapter">
            <header className="gcdocs-chapter-head">
              <div className="gcdocs-chapter-roman">{meta?.roman}</div>
              <div>
                <div className="gcdocs-chapter-kicker">CHAPTER {meta?.roman}</div>
                <h2 className="gcdocs-chapter-title">{meta?.label ?? cat.label}</h2>
                {meta?.kicker && <p className="gcdocs-chapter-lede">{meta.kicker}</p>}
              </div>
            </header>

            {cat.sections.map((section, i) => (
              <article
                key={section.slug}
                id={section.slug}
                data-chapter={cat.slug}
                className="gcdocs-section"
              >
                <header className="gcdocs-section-head">
                  <div className="gcdocs-section-index">
                    {meta?.roman}.{String(i + 1).padStart(2, '0')}
                  </div>
                  <h3 className="gcdocs-section-title">
                    <a href={`#${section.slug}`} className="gcdocs-section-anchor" aria-label="Link to this section">
                      {section.title}
                    </a>
                  </h3>
                </header>
                {section.description && <p className="gcdocs-section-desc">{section.description}</p>}
                <div
                  className="doc-content gcdocs-section-body"
                  // Author-controlled static HTML from lib/docs-content.ts, safe.
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              </article>
            ))}
          </section>
        );
      })}

      <section className="gcdocs-footer">
        <div className="gcdocs-footer-rule" />
        <div className="gcdocs-footer-grid">
          <div>
            <div className="gcdocs-footer-kicker">THE END OF THE MANUAL</div>
            <h2 className="gcdocs-footer-title">Ready to submit?</h2>
            <p className="gcdocs-footer-lede">
              You've read the full protocol. If your receipt has the last 4 hex characters of your Ethereum wallet address written on it (e.g. if your address ends in <code>...a3F2</code>, write <code>a3F2</code>),
              your tweet mentions <code>$GASCOIN</code> or <code>#gascoin</code> and tags{' '}
              <code>@GasCoinApp</code>, and your X account is verified with 100+ followers — you're ready.
            </p>
            <div className="gcdocs-footer-cta">
              <Link href="/submit" className="gcdocs-hero-btn gcdocs-hero-btn--primary">Submit Receipt →</Link>
              <Link href="/gates" className="gcdocs-hero-btn">Pre-Flight Checklist</Link>
            </div>
          </div>
          <div className="gcdocs-footer-meta">
            <div><span>Source</span><code>lib/docs-content.ts</code></div>
            <div><span>Gate engine</span><code>lib/policy.ts · GATE_DEFS</code></div>
            <div><span>Gates aligned</span><code>{GATE_COUNT} / {GATE_COUNT}</code></div>
            <div><span>Mode</span><code>SEASON 1 · DRY-RUN</code></div>
            <div><span>Changelog</span><code>GitHub commits</code></div>
            <div><span>Contact</span><code>@chico_panama</code></div>
          </div>
        </div>
      </section>
    </DocsScroller>
  );
}
