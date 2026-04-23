'use client';

import type { ReactNode } from 'react';

export interface LadderRungProps {
  /** 01, 02, … — matches the gc-step index aesthetic already used on /perks. */
  index: string;
  /** Main section title, e.g. "REACH". */
  title: string;
  /** Short subtitle describing the rung's purpose. */
  subtitle: string;
  /** Headline value shown large (e.g. "1,240 points", "Composite 73"). */
  headline: string | ReactNode;
  /** Secondary value shown mono under the headline. */
  subheadline?: string;
  /** 0-100 progress toward the next target. Omit to hide the bar. */
  progressPct?: number;
  /** Label for the progress bar target, e.g. "Next: Rising (40)". */
  progressTarget?: string;
  /** State chip at top-right, e.g. "Minted", "Eligible", "Locked". */
  stateBadge?: { label: string; tone: 'neutral' | 'good' | 'muted' | 'alert' };
  /** Full-width body content (children) — card grids, lists, etc. */
  children?: ReactNode;
  /** If true, wraps the rung in a "connect wallet first" empty state. */
  locked?: boolean;
}

const toneColor = {
  neutral: 'rgba(255,255,255,0.5)',
  good: '#9EE493',
  muted: 'rgba(255,255,255,0.3)',
  alert: '#F6B26B',
} as const;

export function LadderRung(props: LadderRungProps) {
  const {
    index,
    title,
    subtitle,
    headline,
    subheadline,
    progressPct,
    progressTarget,
    stateBadge,
    children,
    locked = false,
  } = props;

  return (
    <section
      style={{
        marginBottom: 48,
        border: '1px solid rgba(255,255,255,0.08)',
        padding: 32,
        position: 'relative',
      }}
    >
      {stateBadge && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            fontFamily: 'IBM Plex Mono',
            fontSize: 10,
            letterSpacing: '0.08em',
            padding: '4px 10px',
            border: `1px solid ${toneColor[stateBadge.tone]}`,
            color: toneColor[stateBadge.tone],
            textTransform: 'uppercase',
          }}
        >
          {stateBadge.label}
        </div>
      )}

      <div
        style={{
          fontFamily: 'IBM Plex Mono',
          fontSize: 10,
          color: 'rgba(255,255,255,0.3)',
          marginBottom: 8,
        }}
      >
        RUNG {index}
      </div>
      <div style={{ fontFamily: 'Bebas Neue', fontSize: 40, lineHeight: 1, marginBottom: 4 }}>
        {title}
      </div>
      <div
        style={{
          fontFamily: 'IBM Plex Sans',
          fontWeight: 300,
          fontSize: 13,
          color: 'rgba(255,255,255,0.5)',
          marginBottom: 24,
        }}
      >
        {subtitle}
      </div>

      {locked ? (
        <div
          style={{
            fontFamily: 'IBM Plex Mono',
            fontSize: 12,
            color: 'rgba(255,255,255,0.4)',
            padding: '16px 0',
          }}
        >
          → CONNECT WALLET TO SEE
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 40, lineHeight: 1 }}>{headline}</div>
            {subheadline && (
              <div
                style={{
                  fontFamily: 'IBM Plex Mono',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.4)',
                  marginTop: 4,
                }}
              >
                {subheadline}
              </div>
            )}
          </div>

          {typeof progressPct === 'number' && (
            <div style={{ marginBottom: children ? 24 : 0 }}>
              {progressTarget && (
                <div
                  style={{
                    fontFamily: 'IBM Plex Mono',
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.3)',
                    marginBottom: 6,
                  }}
                >
                  {progressTarget}
                </div>
              )}
              <div className="gt-progress-track">
                <div
                  className="gt-progress-fill"
                  style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
                />
              </div>
              <div
                style={{
                  fontFamily: 'IBM Plex Mono',
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.3)',
                  marginTop: 4,
                }}
              >
                {Math.round(Math.max(0, Math.min(100, progressPct)))}%
              </div>
            </div>
          )}

          {children}
        </>
      )}
    </section>
  );
}
