'use client';

import type { MouseEvent as ReactMouseEvent } from 'react';
import type { GasPriceSnapshot } from '../../lib/gas-prices-global';

export type PumpRegion = 'handle' | 'display' | 'body' | 'nozzle' | 'base';

type Props = {
  /** Which region is currently hovered (used for CSS-driven per-region anims) */
  hoverRegion: PumpRegion | null;
  /** Rotating country price shown on the display while idle */
  tickerPrice: GasPriceSnapshot;
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
 * onMouseEnter + onMouseLeave props.
 *
 * PR #46 enrichment:
 *   - Sub-display panel with static GALLONS/PRICE LCD
 *   - Keypad grid (4x3)
 *   - Fuel grade selector (87/89/93)
 *   - Brand plate on the body
 *   - Corner rivets
 *   - Ticker row on the main display rotating through country gas prices
 */
export function PumpSvg({
  hoverRegion,
  tickerPrice,
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

        <linearGradient id="subdisplay-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" />
          <stop offset="1" stopColor="#0a0a0c" />
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
        {/* Station plate — small text on the base (not the dominant element) */}
        <rect x="420" y="918" width="160" height="24" rx="2" fill="none" stroke="rgba(231,233,234,0.18)" strokeWidth="1" />
        <text
          x="500"
          y="934"
          textAnchor="middle"
          fill="rgba(231,233,234,0.38)"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="11"
          letterSpacing="3"
        >
          STATION · 01
        </text>
        {/* Base corner rivets */}
        <circle cx="192" cy="898" r="3" fill="#1a1a1d" stroke="#2F3336" strokeWidth="0.6" />
        <circle cx="808" cy="898" r="3" fill="#1a1a1d" stroke="#2F3336" strokeWidth="0.6" />
        <circle cx="192" cy="974" r="3" fill="#1a1a1d" stroke="#2F3336" strokeWidth="0.6" />
        <circle cx="808" cy="974" r="3" fill="#1a1a1d" stroke="#2F3336" strokeWidth="0.6" />
      </g>

      {/* ═══ MAIN BODY ═══ */}
      <g {...regionProps('body')}>
        {/* Main slab */}
        <rect x="200" y="230" width="560" height="660" rx="28" fill="url(#body-grad)" stroke="#2F3336" strokeWidth="2.5" />
        <rect x="202" y="232" width="556" height="84" rx="28" fill="url(#rim-light)" />
        <rect x="200" y="840" width="560" height="50" fill="rgba(0,0,0,0.4)" />

        {/* Corner rivets (4 on the body) */}
        <circle cx="214" cy="258" r="3" fill="#1a1a1d" stroke="#2F3336" strokeWidth="0.6" />
        <circle cx="746" cy="258" r="3" fill="#1a1a1d" stroke="#2F3336" strokeWidth="0.6" />
        <circle cx="214" cy="860" r="3" fill="#1a1a1d" stroke="#2F3336" strokeWidth="0.6" />
        <circle cx="746" cy="860" r="3" fill="#1a1a1d" stroke="#2F3336" strokeWidth="0.6" />

        {/* ── Sub-display panel (static GALLONS / PRICE LCD) ── */}
        <rect x="250" y="605" width="460" height="90" rx="6" fill="url(#subdisplay-grad)" stroke="#2F3336" strokeWidth="1.5" />
        <rect x="252" y="607" width="456" height="18" rx="6" fill="rgba(231,233,234,0.04)" />

        {/* GALLONS row */}
        <text
          x="264"
          y="636"
          fill="rgba(231,233,234,0.4)"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="10"
          letterSpacing="2"
        >
          GALLONS
        </text>
        <text
          x="696"
          y="638"
          textAnchor="end"
          fill="#E7E9EA"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="20"
          fontWeight="700"
          letterSpacing="2"
        >
          12.453
        </text>

        {/* Divider */}
        <line x1="260" y1="650" x2="700" y2="650" stroke="rgba(231,233,234,0.1)" strokeWidth="1" />

        {/* PRICE row */}
        <text
          x="264"
          y="679"
          fill="rgba(231,233,234,0.4)"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="10"
          letterSpacing="2"
        >
          PRICE $
        </text>
        <text
          x="696"
          y="681"
          textAnchor="end"
          fill="#E7E9EA"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="20"
          fontWeight="700"
          letterSpacing="2"
        >
          42.68
        </text>

        {/* ── Keypad (4 rows × 3 cols, bottom-left) ── */}
        <g opacity="0.88">
          {(() => {
            const keys: React.ReactElement[] = [];
            const startX = 266;
            const startY = 720;
            const cw = 38;
            const ch = 26;
            const gap = 6;
            const labels = [
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['*', '0', '#'],
            ];
            for (let r = 0; r < 4; r++) {
              for (let c = 0; c < 3; c++) {
                const kx = startX + c * (cw + gap);
                const ky = startY + r * (ch + gap);
                keys.push(
                  <rect key={`k-${r}-${c}`} x={kx} y={ky} width={cw} height={ch} rx="3" fill="#141417" stroke="#2F3336" strokeWidth="0.8" />
                );
                keys.push(
                  <text
                    key={`kt-${r}-${c}`}
                    x={kx + cw / 2}
                    y={ky + ch - 8}
                    textAnchor="middle"
                    fill="rgba(231,233,234,0.55)"
                    fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {labels[r][c]}
                  </text>
                );
              }
            }
            return keys;
          })()}
        </g>

        {/* ── Fuel grade selector (right of keypad) ── */}
        <g>
          {(() => {
            const grades = ['87', '89', '93'];
            const els: React.ReactElement[] = [];
            const gx = 470;
            const gy = 720;
            const gw = 220;
            const gh = 26;
            const gap = 6;
            for (let i = 0; i < 3; i++) {
              const y = gy + i * (gh + gap);
              els.push(
                <rect key={`gr-${i}`} x={gx} y={y} width={gw} height={gh} rx="13" fill="#141417" stroke="#2F3336" strokeWidth="0.8" />
              );
              els.push(
                <text
                  key={`gt-${i}`}
                  x={gx + 16}
                  y={y + gh - 8}
                  fill="rgba(231,233,234,0.5)"
                  fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
                  fontSize="10"
                  letterSpacing="2"
                >
                  GRADE
                </text>
              );
              els.push(
                <text
                  key={`gv-${i}`}
                  x={gx + gw - 16}
                  y={y + gh - 8}
                  textAnchor="end"
                  fill="#E7E9EA"
                  fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
                  fontSize="12"
                  fontWeight="700"
                  letterSpacing="1"
                >
                  {grades[i]}
                </text>
              );
            }
            return els;
          })()}
        </g>

        {/* ── Card reader slot ── */}
        <rect x="266" y="830" width="162" height="10" rx="2" fill="#000" stroke="#2F3336" strokeWidth="1" />
        <text
          x="266"
          y="824"
          fill="rgba(231,233,234,0.32)"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="8"
          letterSpacing="2"
        >
          CREDIT · DEBIT
        </text>

        {/* ── Small brand plate (bottom of body) ── */}
        <rect x="470" y="824" width="220" height="22" rx="3" fill="none" stroke="rgba(231,233,234,0.2)" strokeWidth="1" />
        <text
          x="580"
          y="840"
          textAnchor="middle"
          fill="rgba(231,233,234,0.55)"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontWeight="700"
          fontSize="12"
          letterSpacing="4"
        >
          GASCOIN
        </text>

        {/* Pulsing status LED — kept from v5 */}
        <circle cx="600" cy="580" r="5" fill="#E7E9EA">
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
        <g transform="translate(296, 320)">
          <rect x="0" y="0" width="80" height="80" rx="6" fill="#0a0a0b" />
          <text
            x="40"
            y="62"
            textAnchor="middle"
            fill="#f7f8f4"
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            fontWeight="800"
            fontSize="64"
          >
            G
          </text>
          <rect x="0" y="0" width="80" height="80" rx="6" fill="url(#lcd-grid)" />
        </g>

        {/* ASCOIN wordmark */}
        <text
          x="390"
          y="376"
          fill="#0a0a0b"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontWeight="800"
          fontSize="52"
          letterSpacing="2"
        >
          ASCOIN
        </text>

        {/* Tagline */}
        <text
          x="684"
          y="414"
          textAnchor="end"
          fill="#4a4a4d"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="13"
          fontStyle="italic"
          letterSpacing="1"
        >
          Gas. Paid Back...
        </text>

        {/* Divider between brand row and ticker row */}
        <line x1="286" y1="438" x2="686" y2="438" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />

        {/* ── Ticker row: rotating country gas price (PR #46) ── */}
        <g key={tickerPrice.country} id="pump-display-ticker" className="wlc-display-ticker">
          <text
            x="286"
            y="480"
            fill="#0a0a0b"
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            fontWeight="700"
            fontSize="22"
            letterSpacing="2"
          >
            {tickerPrice.country}
          </text>
          <text
            x="686"
            y="484"
            textAnchor="end"
            fill="#0a0a0b"
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            fontWeight="800"
            fontSize="28"
            letterSpacing="1"
          >
            {tickerPrice.price}
            <tspan fontSize="14" fill="#4a4a4d">{tickerPrice.unit}</tspan>
          </text>
          <text
            x="484"
            y="530"
            textAnchor="middle"
            fill="#4a4a4d"
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            fontSize="10"
            letterSpacing="3"
          >
            GLOBAL AVG · GASOLINE
          </text>
        </g>

        {/* Alt "> ENTER_" hover prompt */}
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

          <circle id="pump-nozzle-drip" cx="41" cy="166" r="4" fill="rgba(231,233,234,0.9)" opacity="0" />
        </g>
      </g>
    </svg>
  );
}
