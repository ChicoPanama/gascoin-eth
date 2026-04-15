'use client';

import type { MouseEvent as ReactMouseEvent } from 'react';

export type PumpRegion = 'handle' | 'display' | 'body' | 'nozzle' | 'base';

type Props = {
  /** Which region is currently hovered (used for CSS-driven per-region anims) */
  hoverRegion: PumpRegion | null;
  /** Fires on region click. Provides the region's on-screen bounding rect for
   *  anchoring the popover. */
  onHotspotClick: (region: PumpRegion, rect: DOMRect) => void;
  /** Fires on region hover enter / leave. */
  onHotspotHover: (region: PumpRegion | null, rect: DOMRect | null) => void;
};

/**
 * GASCOIN pump — React SVG component.
 *
 * Inlined as JSX so React handles click events natively through its
 * synthetic event system. Every hotspot `<g>` has real React onClick +
 * onMouseEnter + onMouseLeave props — no addEventListener dance, no
 * ref-based attachment races, no effect dep thrashing. This is the
 * reliable path for interactivity on the pump.
 *
 * Style / decoration matches the reference silhouette — clean black body,
 * central display with [G] ASCOIN + tagline, compact nozzle, thin base.
 *
 * Kept from the rich v4:
 *   - All gradients + rim lighting
 *   - LCD grid + scanlines on display
 *   - Blinking terminal cursor
 *   - Alt "> ENTER_" hover prompt
 *   - Animated nozzle drip
 *   - Ground shadow + halo
 *   - Pulsing status LED on the body (was stripped in v5, restored here)
 *
 * Stripped (engineering noise that doesn't match reference):
 *   - Rivets, panel lines, panel hatch
 *   - GASCOIN brand plate on the body
 *   - SN serial strip
 *   - STATION · 01 text on the base
 *   - DOCS text stamp on the handle
 *   - Reflection highlight stripe
 *   - On-screen indicator LEDs
 */
export function PumpSvg({
  hoverRegion,
  onHotspotClick,
  onHotspotHover,
}: Props) {
  const handleClick = (region: PumpRegion) => (e: ReactMouseEvent<SVGGElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    onHotspotClick(region, rect);
  };

  const handleEnter = (region: PumpRegion) => (e: ReactMouseEvent<SVGGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onHotspotHover(region, rect);
  };

  const handleLeave = () => onHotspotHover(null, null);

  const svgClass = hoverRegion ? `is-hover-${hoverRegion}` : '';

  const regionProps = (region: PumpRegion) => ({
    id: `pump-${region}`,
    className: 'pump-region',
    role: 'button' as const,
    tabIndex: 0,
    style: { cursor: 'pointer' as const },
    onClick: handleClick(region),
    onMouseEnter: handleEnter(region),
    onMouseLeave: handleLeave,
    onKeyDown: (e: React.KeyboardEvent<SVGGElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        onHotspotClick(region, rect);
      }
    },
  });

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1000 1100"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="GASCOIN gas pump"
      className={svgClass}
    >
      <defs>
        <linearGradient id="body-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c1c1f" />
          <stop offset="0.08" stopColor="#141417" />
          <stop offset="0.5" stopColor="#0a0a0b" />
          <stop offset="1" stopColor="#030304" />
        </linearGradient>

        <linearGradient id="rim-light" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(231,233,234,0.22)" />
          <stop offset="0.1" stopColor="rgba(231,233,234,0.02)" />
          <stop offset="1" stopColor="transparent" />
        </linearGradient>

        <linearGradient id="screen-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7f8f4" />
          <stop offset="0.5" stopColor="#eaeae4" />
          <stop offset="1" stopColor="#d4d6d0" />
        </linearGradient>

        <linearGradient id="nozzle-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0c0c0e" />
          <stop offset="1" stopColor="#1e1e21" />
        </linearGradient>

        <radialGradient id="halo-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="rgba(231,233,234,0.14)" />
          <stop offset="0.5" stopColor="rgba(231,233,234,0.04)" />
          <stop offset="1" stopColor="rgba(231,233,234,0)" />
        </radialGradient>

        <pattern id="lcd-grid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="1" />
        </pattern>

        <pattern id="scanlines" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="4" height="4" fill="transparent" />
          <line x1="0" y1="2" x2="4" y2="2" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
        </pattern>

        <filter id="soft-blur" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Ground shadow */}
      <g id="pump-ground">
        <ellipse cx="500" cy="1020" rx="360" ry="18" fill="rgba(231,233,234,0.08)" filter="url(#soft-blur)" />
        <ellipse cx="500" cy="1020" rx="260" ry="10" fill="rgba(231,233,234,0.14)" />
      </g>

      {/* Halo */}
      <ellipse
        id="pump-halo"
        cx="500"
        cy="560"
        rx="480"
        ry="540"
        fill="url(#halo-grad)"
        opacity="0.6"
      />

      {/* ═══ BASE ═══ */}
      <g {...regionProps('base')}>
        <rect x="188" y="868" width="624" height="14" rx="2" fill="#0a0a0b" stroke="#2F3336" strokeWidth="1" />
        <rect x="170" y="880" width="660" height="110" rx="4" fill="url(#body-grad)" stroke="#2F3336" strokeWidth="2" />
        <rect x="172" y="880" width="656" height="20" rx="4" fill="url(#rim-light)" />
        <rect x="200" y="960" width="600" height="24" rx="2" fill="#030304" stroke="#1a1a1d" strokeWidth="1" />
      </g>

      {/* ═══ MAIN BODY ═══ */}
      <g {...regionProps('body')}>
        <rect x="200" y="230" width="560" height="660" rx="28" fill="url(#body-grad)" stroke="#2F3336" strokeWidth="2.5" />
        <rect x="202" y="232" width="556" height="84" rx="28" fill="url(#rim-light)" />
        <rect x="200" y="840" width="560" height="50" fill="rgba(0,0,0,0.4)" />
        {/* Pulsing status LED — the dot the user asked to come back */}
        <circle cx="480" cy="780" r="5" fill="#E7E9EA">
          <animate attributeName="opacity" values="0.35;1;0.35" dur="2.2s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* ═══ DISPLAY SCREEN ═══ */}
      <g {...regionProps('display')}>
        <rect x="252" y="290" width="456" height="284" rx="12" fill="#000" stroke="#2F3336" strokeWidth="2" />
        <rect x="264" y="302" width="432" height="260" rx="6" fill="url(#screen-grad)" />
        <rect x="264" y="302" width="432" height="260" rx="6" fill="url(#lcd-grid)" />
        <rect x="264" y="302" width="432" height="260" rx="6" fill="url(#scanlines)" />

        {/* [G] logo square */}
        <g transform="translate(296, 340)">
          <rect x="0" y="0" width="96" height="96" rx="8" fill="#0a0a0b" />
          <text
            x="48"
            y="76"
            textAnchor="middle"
            fill="#f7f8f4"
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            fontWeight="800"
            fontSize="78"
          >
            G
          </text>
          <rect x="0" y="0" width="96" height="96" rx="8" fill="url(#lcd-grid)" />
        </g>

        {/* "ASCOIN" wordmark */}
        <text
          x="406"
          y="412"
          fill="#0a0a0b"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontWeight="800"
          fontSize="62"
          letterSpacing="2"
        >
          ASCOIN
        </text>

        {/* Tagline */}
        <text
          x="684"
          y="532"
          textAnchor="end"
          fill="#2a2a2d"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="16"
          fontStyle="italic"
          letterSpacing="1"
        >
          Gas. Paid Back...
        </text>

        {/* Alt "> ENTER_" prompt — shown on hover AND pulses every 4s on idle
            (CSS-driven via .wlc-pump svg:not(.is-hover-display)) */}
        <g id="pump-display-hover-prompt" opacity="0">
          <rect x="264" y="302" width="432" height="260" rx="6" fill="#f7f8f4" />
          <rect x="264" y="302" width="432" height="260" rx="6" fill="url(#lcd-grid)" />
          <rect x="264" y="302" width="432" height="260" rx="6" fill="url(#scanlines)" />
          <text
            x="286"
            y="380"
            fill="#0a0a0b"
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            fontWeight="800"
            fontSize="30"
            letterSpacing="2"
          >
            &gt; BOOT
          </text>
          <text
            x="286"
            y="422"
            fill="#0a0a0b"
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            fontSize="22"
            letterSpacing="1"
          >
            GASCOIN PROTOCOL
          </text>
          <text
            x="286"
            y="458"
            fill="#0a0a0b"
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            fontSize="16"
            letterSpacing="1"
          >
            SEASON 1 · INVITE REQ
          </text>
          <text
            x="286"
            y="528"
            fill="#0a0a0b"
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            fontWeight="800"
            fontSize="32"
            letterSpacing="3"
          >
            &gt; ENTER_
          </text>
          <rect id="pump-display-cursor" x="498" y="500" width="14" height="30" fill="#0a0a0b" />
        </g>
      </g>

      {/* ═══ TOP HANDLE ═══ */}
      <g {...regionProps('handle')}>
        <rect x="356" y="188" width="288" height="48" rx="8" fill="url(#body-grad)" stroke="#2F3336" strokeWidth="2" />
        <rect x="358" y="190" width="284" height="16" rx="8" fill="url(#rim-light)" />
      </g>

      {/* ═══ NOZZLE ═══ */}
      <g {...regionProps('nozzle')}>
        {/* Connector on body */}
        <rect x="756" y="380" width="22" height="28" rx="3" fill="#1a1a1d" stroke="#2F3336" strokeWidth="1.5" />

        {/* Hose (outer + inner stroke) */}
        <path
          d="M 778 394 C 830 394, 856 430, 856 490 C 856 540, 844 560, 820 560"
          stroke="#2F3336"
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 778 394 C 830 394, 856 430, 856 490 C 856 540, 844 560, 820 560"
          stroke="#0a0a0b"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
        />

        {/* Grip */}
        <g transform="translate(756, 548)">
          <rect x="28" y="0" width="28" height="18" rx="2" fill="#1a1a1d" stroke="#2F3336" strokeWidth="1" />
          <rect x="0" y="16" width="84" height="96" rx="8" fill="url(#nozzle-grad)" stroke="#2F3336" strokeWidth="2" />
          <rect x="2" y="18" width="80" height="16" rx="8" fill="url(#rim-light)" />
          <path
            d="M 10 70 Q -10 80, -10 98 Q -10 116, 14 116 L 38 116"
            fill="none"
            stroke="#2F3336"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="12" y="82" width="20" height="10" rx="2" fill="#0a0a0b" stroke="#2F3336" strokeWidth="0.8" />
          <rect x="30" y="112" width="22" height="42" rx="1" fill="#1a1a1d" stroke="#2F3336" strokeWidth="1" />
          <rect x="28" y="150" width="26" height="8" rx="1" fill="#0a0a0b" />
          <rect x="32" y="156" width="18" height="4" fill="#000" />

          {/* Animated drip — CSS triggers it on .is-hover-nozzle */}
          <circle id="pump-nozzle-drip" cx="41" cy="166" r="4" fill="rgba(231,233,234,0.9)" opacity="0" />
        </g>
      </g>
    </svg>
  );
}
