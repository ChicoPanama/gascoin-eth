'use client';

import type { MouseEvent as ReactMouseEvent } from 'react';
import type { GasPriceSnapshot } from '../../lib/gas-prices-global';

export type PumpRegion = 'handle' | 'display' | 'body' | 'nozzle' | 'base';

type Props = {
  hoverRegion: PumpRegion | null;
  tickerPrice: GasPriceSnapshot;
  onHotspotClick: (region: PumpRegion, rect: DOMRect) => void;
  onHotspotHover: (region: PumpRegion | null, rect: DOMRect | null) => void;
};

/**
 * GASCOIN pump — fully hand-composed SVG illustration.
 *
 * viewBox 0 0 1000 1200. Every region is drawn as layered vector
 * primitives with sharp brutalist corners, thin hairline strokes, and
 * no UI-kit skeuomorphism (no filled pill buttons, no rounded card
 * shapes, no gradient panels pretending to be real hardware).
 *
 * Y-coordinate zones (top to bottom):
 *   150–185   antenna + beacon above the handle
 *   186–230   top handle
 *   230–540   display bezel + screen
 *   560–640   sub-display (GAL / USD LCD strip)
 *   660–790   operator zone (keypad · grade selector · card reader · NFC)
 *   810–866   brand plate (large double-bordered GASCOIN)
 *   866–890   vent grille + bottom bevel
 *   900–1020  base plinth (manufacturer plate · corner bolts · step)
 *   1020–1150 multi-layer ground shadow + horizon hairline
 *
 * X-coordinate layout (inside the body region):
 *   220–334  keypad (3 cols x 4 rows of sharp 35x28 cells)
 *   360–520  grade selector (3 rows x 160x38 sharp rects)
 *   546–740  card reader + receipt vent + NFC pad
 *
 * All gradients, patterns, and filters live in <defs>. Every
 * interactive hotspot is a <g class="pump-region"> with real React
 * event handlers wired to native synthetic events (not innerHTML).
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
      viewBox="0 0 1000 1200"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="GASCOIN gas pump"
      className={svgClass}
    >
      <defs>
        {/* Body gradient: subtle sheen top, deep void bottom */}
        <linearGradient id="body-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0"    stopColor="#1f1f22" />
          <stop offset="0.06" stopColor="#17171a" />
          <stop offset="0.55" stopColor="#0a0a0b" />
          <stop offset="1"    stopColor="#020203" />
        </linearGradient>

        {/* Rim-light highlight used for top-edge specular catches */}
        <linearGradient id="rim-light" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0"    stopColor="rgba(231,233,234,0.26)" />
          <stop offset="0.12" stopColor="rgba(231,233,234,0.02)" />
          <stop offset="1"    stopColor="transparent" />
        </linearGradient>

        {/* Left-edge ambient fill */}
        <linearGradient id="edge-fill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0"    stopColor="rgba(231,233,234,0.08)" />
          <stop offset="1"    stopColor="transparent" />
        </linearGradient>

        {/* Display face — cool paper tone */}
        <linearGradient id="screen-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0"    stopColor="#f7f8f4" />
          <stop offset="0.5"  stopColor="#eaeae4" />
          <stop offset="1"    stopColor="#d2d4ce" />
        </linearGradient>

        {/* CRT corner vignette */}
        <radialGradient id="crt-vignette" cx="50%" cy="50%" r="70%">
          <stop offset="0"   stopColor="rgba(0,0,0,0)" />
          <stop offset="0.7" stopColor="rgba(0,0,0,0)" />
          <stop offset="1"   stopColor="rgba(0,0,0,0.18)" />
        </radialGradient>

        {/* Nozzle grip warm-dark */}
        <linearGradient id="nozzle-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0c0c0e" />
          <stop offset="1" stopColor="#1e1e21" />
        </linearGradient>

        {/* Ambient halo */}
        <radialGradient id="halo-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0"   stopColor="rgba(231,233,234,0.14)" />
          <stop offset="0.5" stopColor="rgba(231,233,234,0.04)" />
          <stop offset="1"   stopColor="rgba(231,233,234,0)" />
        </radialGradient>

        {/* Ground reflection glow */}
        <radialGradient id="ground-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0"   stopColor="rgba(231,233,234,0.12)" />
          <stop offset="0.4" stopColor="rgba(231,233,234,0.04)" />
          <stop offset="1"   stopColor="rgba(231,233,234,0)" />
        </radialGradient>

        {/* LCD pixel grid */}
        <pattern id="lcd-grid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
        </pattern>

        {/* Scanline overlay */}
        <pattern id="scanlines" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="4" height="4" fill="transparent" />
          <line x1="0" y1="2" x2="4" y2="2" stroke="rgba(0,0,0,0.07)" strokeWidth="1" />
        </pattern>

        {/* Fine crosshatch for sub-display */}
        <pattern id="hatch" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(231,233,234,0.02)" strokeWidth="1" />
        </pattern>

        {/* Ground shadow blur */}
        <filter id="ground-blur" x="-40%" y="-50%" width="180%" height="200%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <filter id="soft-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* ═══════════════════════════════════════════════════════════════
          AMBIENT: outer halo, horizon hairline, ground shadow layers
          ═══════════════════════════════════════════════════════════════ */}

      {/* Outer atmospheric halo */}
      <ellipse cx="500" cy="640" rx="560" ry="620" fill="url(#halo-grad)" opacity="0.35" />
      {/* Inner halo — tighter, brighter */}
      <ellipse cx="500" cy="600" rx="460" ry="520" fill="url(#halo-grad)" opacity="0.55" />

      {/* Horizon hairline — the pump sits in space */}
      <line x1="80" y1="1040" x2="920" y2="1040" stroke="rgba(231,233,234,0.08)" strokeWidth="1" strokeDasharray="2 6" />

      {/* Ground shadow — 4 layers for depth */}
      <g id="pump-ground">
        <ellipse cx="500" cy="1060" rx="420" ry="42" fill="rgba(231,233,234,0.04)" filter="url(#ground-blur)" />
        <ellipse cx="500" cy="1060" rx="340" ry="28" fill="rgba(231,233,234,0.08)" filter="url(#ground-blur)" />
        <ellipse cx="500" cy="1058" rx="250" ry="16" fill="rgba(231,233,234,0.14)" />
        <ellipse cx="500" cy="1058" rx="170" ry="8"  fill="rgba(231,233,234,0.20)" />
        {/* Reflected glow */}
        <ellipse cx="500" cy="1050" rx="280" ry="10" fill="url(#ground-glow)" opacity="0.6" />
      </g>

      {/* ═══════════════════════════════════════════════════════════════
          BASE — bottom slab, manufacturer plate, corner bolts
          ═══════════════════════════════════════════════════════════════ */}

      <g {...regionProps('base')}>
        {/* Upper lip (chamfered shelf where body meets base) */}
        <rect x="178" y="892" width="644" height="12" fill="#0a0a0b" stroke="#2F3336" strokeWidth="1" />
        {/* Top-edge catch on the lip */}
        <line x1="180" y1="893" x2="820" y2="893" stroke="rgba(231,233,234,0.06)" strokeWidth="0.5" />

        {/* Main plinth */}
        <rect x="170" y="904" width="660" height="116" fill="url(#body-grad)" stroke="#2F3336" strokeWidth="1.5" />
        {/* Inner ambient fill */}
        <rect x="172" y="906" width="6" height="112" fill="url(#edge-fill)" />
        {/* Top-edge rim light */}
        <rect x="172" y="906" width="656" height="14" fill="url(#rim-light)" />

        {/* Horizontal panel line */}
        <line x1="170" y1="960" x2="830" y2="960" stroke="#2F3336" strokeWidth="0.8" />

        {/* Manufacturer plate — double-bordered */}
        <rect x="340" y="924" width="320" height="28" fill="none" stroke="rgba(231,233,234,0.25)" strokeWidth="1" />
        <rect x="344" y="928" width="312" height="20" fill="none" stroke="rgba(231,233,234,0.08)" strokeWidth="0.8" />
        <text
          x="500" y="942" textAnchor="middle"
          fill="rgba(231,233,234,0.48)"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="11" fontWeight="700" letterSpacing="4"
        >
          GASCOIN · SERIES 01 · USA
        </text>

        {/* Sub-label */}
        <text
          x="500" y="984" textAnchor="middle"
          fill="rgba(231,233,234,0.28)"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="9" letterSpacing="3"
        >
          SEASON 01 · BETA RELEASE · MFG 2026
        </text>

        {/* Lower step */}
        <rect x="194" y="996" width="612" height="20" fill="#030305" stroke="#1a1a1d" strokeWidth="1" />

        {/* Ground contact shadow line */}
        <line x1="180" y1="1020" x2="820" y2="1020" stroke="rgba(0,0,0,0.8)" strokeWidth="2" />

        {/* 4 corner bolts */}
        <circle cx="190" cy="918" r="2.5" fill="#1a1a1d" stroke="#2F3336" strokeWidth="0.6" />
        <circle cx="810" cy="918" r="2.5" fill="#1a1a1d" stroke="#2F3336" strokeWidth="0.6" />
        <circle cx="190" cy="1008" r="2.5" fill="#1a1a1d" stroke="#2F3336" strokeWidth="0.6" />
        <circle cx="810" cy="1008" r="2.5" fill="#1a1a1d" stroke="#2F3336" strokeWidth="0.6" />
      </g>

      {/* ═══════════════════════════════════════════════════════════════
          BODY — main slab + operator panel + brand plate + vent grille
          ═══════════════════════════════════════════════════════════════ */}

      <g {...regionProps('body')}>
        {/* Back-panel shadow — offset down-right for natural depth */}
        <rect x="204" y="234" width="560" height="660" fill="#050506" />

        {/* Main body slab */}
        <rect x="200" y="230" width="560" height="660" fill="url(#body-grad)" stroke="#2F3336" strokeWidth="1.5" />

        {/* Top rim light */}
        <rect x="202" y="232" width="556" height="24" fill="url(#rim-light)" />

        {/* Left-edge ambient fill */}
        <rect x="200" y="230" width="10" height="660" fill="url(#edge-fill)" />

        {/* Right-edge vertical reflection strip */}
        <rect x="757" y="260" width="1.5" height="610" fill="rgba(231,233,234,0.09)" />

        {/* Left vertical seam */}
        <line x1="228" y1="260" x2="228" y2="870" stroke="#2F3336" strokeWidth="0.8" />

        {/* Horizontal panel breaks */}
        <line x1="202" y1="546" x2="758" y2="546" stroke="#2F3336" strokeWidth="0.8" />
        <line x1="202" y1="796" x2="758" y2="796" stroke="#2F3336" strokeWidth="0.8" />

        {/* 4 body corner rivets */}
        <circle cx="214" cy="244" r="2.2" fill="#1a1a1d" stroke="#2F3336" strokeWidth="0.5" />
        <circle cx="746" cy="244" r="2.2" fill="#1a1a1d" stroke="#2F3336" strokeWidth="0.5" />
        <circle cx="214" cy="876" r="2.2" fill="#1a1a1d" stroke="#2F3336" strokeWidth="0.5" />
        <circle cx="746" cy="876" r="2.2" fill="#1a1a1d" stroke="#2F3336" strokeWidth="0.5" />

        {/* ── SUB-DISPLAY PANEL (GAL / USD) ── */}
        <rect x="220" y="562" width="520" height="78" fill="none" stroke="#2F3336" strokeWidth="1" />
        <rect x="220" y="562" width="520" height="78" fill="url(#hatch)" />
        {/* Inner top-edge highlight */}
        <line x1="220" y1="563" x2="740" y2="563" stroke="rgba(231,233,234,0.06)" strokeWidth="1" />
        {/* Mid divider */}
        <line x1="220" y1="601" x2="740" y2="601" stroke="#2F3336" strokeWidth="0.6" />

        {/* GAL row */}
        <text x="234" y="590"
          fill="rgba(231,233,234,0.45)"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="10" letterSpacing="3"
        >
          GAL<tspan fill="rgba(231,233,234,0.25)" fontSize="8" letterSpacing="2"> · DISPENSED</tspan>
        </text>
        <text x="728" y="592" textAnchor="end"
          fill="#E7E9EA"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="24" fontWeight="700" letterSpacing="3"
        >
          12.453
        </text>

        {/* USD row */}
        <text x="234" y="628"
          fill="rgba(231,233,234,0.45)"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="10" letterSpacing="3"
        >
          USD<tspan fill="rgba(231,233,234,0.25)" fontSize="8" letterSpacing="2"> · TOTAL DUE</tspan>
        </text>
        <text x="728" y="630" textAnchor="end"
          fill="#E7E9EA"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="24" fontWeight="700" letterSpacing="3"
        >
          42.68
        </text>

        {/* ── OPERATOR ZONE LABEL STRIP ── */}
        <line x1="220" y1="658" x2="740" y2="658" stroke="#2F3336" strokeWidth="0.6" />
        <text x="230" y="674"
          fill="rgba(231,233,234,0.5)"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="8" letterSpacing="3"
        >
          INPUT
        </text>
        <text x="370" y="674"
          fill="rgba(231,233,234,0.5)"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="8" letterSpacing="3"
        >
          GRADE
        </text>
        <text x="556" y="674"
          fill="rgba(231,233,234,0.5)"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="8" letterSpacing="3"
        >
          TRANSACTION
        </text>

        {/* ── KEYPAD (3 cols x 4 rows, sharp 1px borders, no fills) ── */}
        {(() => {
          const cells: React.ReactElement[] = [];
          const labels = [
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['*', '0', '#'],
          ];
          const startX = 222;
          const startY = 682;
          const w = 34;
          const h = 24;
          const gx = 4;
          const gy = 4;
          for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 3; c++) {
              const x = startX + c * (w + gx);
              const y = startY + r * (h + gy);
              cells.push(
                <rect
                  key={`key-${r}-${c}`}
                  x={x} y={y} width={w} height={h}
                  fill="none"
                  stroke="#2F3336"
                  strokeWidth="1"
                />
              );
              cells.push(
                <text
                  key={`keyt-${r}-${c}`}
                  x={x + w / 2} y={y + h - 7}
                  textAnchor="middle"
                  fill="rgba(231,233,234,0.55)"
                  fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
                  fontSize="11" fontWeight="600"
                >
                  {labels[r][c]}
                </text>
              );
            }
          }
          return cells;
        })()}

        {/* ── GRADE SELECTOR (3 sharp rows, transparent fills) ── */}
        {(() => {
          const grades = [
            { octane: '87', type: 'REGULAR' },
            { octane: '89', type: 'PLUS' },
            { octane: '93', type: 'PREMIUM' },
          ];
          const els: React.ReactElement[] = [];
          const gx = 356;
          const gy = 682;
          const gw = 160;
          const gh = 36;
          const gap = 6;
          for (let i = 0; i < 3; i++) {
            const y = gy + i * (gh + gap);
            els.push(
              <rect
                key={`gr-${i}`}
                x={gx} y={y} width={gw} height={gh}
                fill="none"
                stroke="#2F3336"
                strokeWidth="1"
              />
            );
            {/* Left vertical separator */}
            els.push(
              <line
                key={`gr-div-${i}`}
                x1={gx + 30} y1={y + 4}
                x2={gx + 30} y2={y + gh - 4}
                stroke="#2F3336"
                strokeWidth="0.8"
              />
            );
            {/* Octane number (left of separator) */}
            els.push(
              <text
                key={`gr-oct-${i}`}
                x={gx + 15} y={y + gh / 2 + 5}
                textAnchor="middle"
                fill="#E7E9EA"
                fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
                fontSize="14" fontWeight="700"
              >
                {grades[i].octane}
              </text>
            );
            {/* Type label (right of separator, top) */}
            els.push(
              <text
                key={`gr-type-${i}`}
                x={gx + 42} y={y + 15}
                fill="rgba(231,233,234,0.5)"
                fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
                fontSize="8" letterSpacing="2"
              >
                {grades[i].type}
              </text>
            );
            {/* Price (right of separator, bottom) */}
            els.push(
              <text
                key={`gr-p-${i}`}
                x={gx + gw - 10} y={y + gh - 9}
                textAnchor="end"
                fill="rgba(231,233,234,0.55)"
                fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
                fontSize="11" fontWeight="700" letterSpacing="1"
              >
                {i === 0 ? '3.42' : i === 1 ? '3.68' : '3.92'}
              </text>
            );
          }
          return els;
        })()}

        {/* ── CARD READER + RECEIPT VENT + NFC PAD ── */}
        <rect x="540" y="682" width="200" height="104" fill="none" stroke="#2F3336" strokeWidth="0.8" />

        {/* Receipt printer vent */}
        <rect x="550" y="692" width="180" height="6" fill="#000" stroke="#2F3336" strokeWidth="0.8" />
        <text x="550" y="688"
          fill="rgba(231,233,234,0.4)"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="7" letterSpacing="2"
        >
          {'RECEIPT \u2191'}
        </text>

        {/* Thermal paper serration */}
        <path
          d="M 550 699 L 554 701 L 558 699 L 562 701 L 566 699 L 570 701 L 574 699 L 578 701 L 582 699 L 586 701 L 590 699 L 594 701 L 598 699 L 602 701 L 606 699 L 610 701 L 614 699 L 618 701 L 622 699 L 626 701 L 630 699"
          fill="none"
          stroke="rgba(231,233,234,0.15)"
          strokeWidth="0.6"
        />

        {/* Card reader slot */}
        <rect x="550" y="712" width="180" height="12" fill="#000" stroke="#2F3336" strokeWidth="1" />
        <line x1="556" y1="718" x2="724" y2="718" stroke="rgba(231,233,234,0.1)" strokeWidth="0.6" />
        <text x="550" y="708"
          fill="rgba(231,233,234,0.4)"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="7" letterSpacing="2"
        >
          INSERT · CREDIT · DEBIT
        </text>

        {/* NFC contactless pad */}
        <circle cx="640" cy="758" r="20" fill="none" stroke="rgba(231,233,234,0.28)" strokeWidth="1" />
        <circle cx="640" cy="758" r="14" fill="none" stroke="rgba(231,233,234,0.22)" strokeWidth="0.8" />
        <circle cx="640" cy="758" r="8"  fill="none" stroke="rgba(231,233,234,0.18)" strokeWidth="0.8" />
        <circle cx="640" cy="758" r="2"  fill="rgba(231,233,234,0.8)" />
        <text x="640" y="784" textAnchor="middle"
          fill="rgba(231,233,234,0.4)"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="7" letterSpacing="2"
        >
          CONTACTLESS
        </text>
        <text x="576" y="762"
          fill="rgba(231,233,234,0.35)"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="9" letterSpacing="1"
        >
          TAP
        </text>

        {/* ── BRAND PLATE ── */}
        <rect x="240" y="812" width="480" height="52" fill="none" stroke="rgba(231,233,234,0.28)" strokeWidth="1" />
        <rect x="244" y="816" width="472" height="44" fill="none" stroke="rgba(231,233,234,0.1)" strokeWidth="0.6" />
        {/* Bracket decorations */}
        <line x1="250" y1="838" x2="258" y2="838" stroke="rgba(231,233,234,0.45)" strokeWidth="1.5" />
        <line x1="702" y1="838" x2="710" y2="838" stroke="rgba(231,233,234,0.45)" strokeWidth="1.5" />
        <text
          x="480" y="846" textAnchor="middle"
          fill="rgba(231,233,234,0.78)"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontWeight="800" fontSize="24" letterSpacing="10"
        >
          GASCOIN
        </text>
        <text
          x="480" y="860" textAnchor="middle"
          fill="rgba(231,233,234,0.32)"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="7" letterSpacing="4"
        >
          REFUND · NODE · 001
        </text>

        {/* ── VENT GRILLE ── */}
        {(() => {
          const slits: React.ReactElement[] = [];
          const startX = 450;
          const startY = 872;
          const slitW = 110;
          const slitH = 1.4;
          const gap = 2.4;
          for (let i = 0; i < 5; i++) {
            slits.push(
              <rect
                key={`vent-${i}`}
                x={startX} y={startY + i * (slitH + gap)}
                width={slitW} height={slitH}
                fill="#000" stroke="rgba(231,233,234,0.18)" strokeWidth="0.4"
              />
            );
          }
          return slits;
        })()}
        <text x="424" y="885"
          textAnchor="end"
          fill="rgba(231,233,234,0.35)"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="6" letterSpacing="2"
        >
          VENT
        </text>

        {/* ── PULSING STATUS LED ── */}
        <circle cx="224" cy="884" r="3" fill="#E7E9EA">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <text x="232" y="888"
          fill="rgba(231,233,234,0.4)"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="7" letterSpacing="2"
        >
          ACTIVE
        </text>
      </g>

      {/* ═══════════════════════════════════════════════════════════════
          DISPLAY SCREEN — bezel, face, brand, ticker, status bar
          ═══════════════════════════════════════════════════════════════ */}

      <g {...regionProps('display')}>
        {/* Outer bezel */}
        <rect x="222" y="262" width="516" height="276" fill="#000" stroke="#3a3a3d" strokeWidth="1.5" />
        {/* Inner flange */}
        <rect x="230" y="270" width="500" height="260" fill="#0a0a0c" stroke="#2F3336" strokeWidth="0.8" />
        {/* Inner flange top-edge specular */}
        <line x1="232" y1="271" x2="728" y2="271" stroke="rgba(231,233,234,0.06)" strokeWidth="0.6" />
        {/* Display face */}
        <rect x="238" y="278" width="484" height="244" fill="url(#screen-grad)" />
        {/* LCD grid */}
        <rect x="238" y="278" width="484" height="244" fill="url(#lcd-grid)" />
        {/* Scanlines */}
        <rect x="238" y="278" width="484" height="244" fill="url(#scanlines)" />
        {/* CRT vignette */}
        <rect x="238" y="278" width="484" height="244" fill="url(#crt-vignette)" />

        {/* Top status bar */}
        <rect x="238" y="278" width="484" height="18" fill="#0a0a0c" />
        <text x="244" y="290"
          fill="rgba(231,233,234,0.6)"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="9" letterSpacing="1"
        >
          GASCOIN v0.1 · SESSION 01 · 15 GATES · LIVE
        </text>
        {/* Signal bars (top-right) */}
        <rect x="676" y="284" width="2" height="8"  fill="rgba(231,233,234,0.65)" />
        <rect x="680" y="282" width="2" height="10" fill="rgba(231,233,234,0.75)" />
        <rect x="684" y="280" width="2" height="12" fill="rgba(231,233,234,0.85)" />
        <rect x="688" y="278" width="2" height="14" fill="#E7E9EA" />
        {/* Live dot */}
        <circle cx="700" cy="287" r="2" fill="#E7E9EA">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="1.4s" repeatCount="indefinite" />
        </circle>
        <text x="706" y="290"
          fill="rgba(231,233,234,0.7)"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="8"
        >
          LIVE
        </text>

        {/* ── MAIN CONTENT ── */}
        {/* [G] logo square */}
        <g transform="translate(254, 310)">
          <rect x="0" y="0" width="72" height="72" fill="#0a0a0b" />
          <text x="36" y="58" textAnchor="middle"
            fill="#f7f8f4"
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            fontWeight="800" fontSize="58"
          >
            G
          </text>
          <rect x="0" y="0" width="72" height="72" fill="url(#lcd-grid)" />
        </g>

        {/* "ASCOIN" wordmark */}
        <text
          x="340" y="360"
          fill="#0a0a0b"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontWeight="800" fontSize="54" letterSpacing="2"
        >
          ASCOIN
        </text>

        {/* Tagline */}
        <text
          x="710" y="396" textAnchor="end"
          fill="#3a3a3d"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="12" fontStyle="italic" letterSpacing="1"
        >
          Gas. Paid Back...
        </text>

        {/* Divider */}
        <line x1="252" y1="416" x2="710" y2="416" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />

        {/* Ticker row — rotating country + price */}
        <g key={tickerPrice.country} id="pump-display-ticker" className="wlc-display-ticker">
          <text x="252" y="452"
            fill="#0a0a0b"
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            fontWeight="700" fontSize="20" letterSpacing="2"
          >
            {tickerPrice.country}
          </text>
          <text x="710" y="456" textAnchor="end"
            fill="#0a0a0b"
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            fontWeight="800" fontSize="26" letterSpacing="1"
          >
            {tickerPrice.price}
            <tspan fontSize="13" fill="#3a3a3d">{tickerPrice.unit}</tspan>
          </text>
          <text x="481" y="480" textAnchor="middle"
            fill="#3a3a3d"
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            fontSize="9" letterSpacing="3"
          >
            GLOBAL AVERAGE · GASOLINE
          </text>
        </g>

        {/* Bottom status ribbon — progress bar + meta */}
        <line x1="252" y1="494" x2="710" y2="494" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />
        <text x="252" y="510"
          fill="#3a3a3d"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="8" letterSpacing="2"
        >
          SEASON 01
        </text>
        {/* Progress rail */}
        <rect x="310" y="504" width="320" height="6" fill="none" stroke="#3a3a3d" strokeWidth="0.8" />
        <rect x="312" y="506" width="160" height="2" fill="#0a0a0b" />
        {/* End marker */}
        <line x1="472" y1="502" x2="472" y2="512" stroke="#0a0a0b" strokeWidth="1" />
        <text x="710" y="510" textAnchor="end"
          fill="#3a3a3d"
          fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
          fontSize="8" letterSpacing="1"
        >
          50% · BETA
        </text>

        {/* ── ALT "> ENTER_" FACE (only shown on hover) ── */}
        <g id="pump-display-hover-prompt" opacity="0">
          <rect x="238" y="278" width="484" height="244" fill="#f7f8f4" />
          <rect x="238" y="278" width="484" height="244" fill="url(#lcd-grid)" />
          <rect x="238" y="278" width="484" height="244" fill="url(#scanlines)" />
          <rect x="238" y="278" width="484" height="244" fill="url(#crt-vignette)" />

          {/* Status bar duplicate */}
          <rect x="238" y="278" width="484" height="18" fill="#0a0a0c" />
          <text x="244" y="290"
            fill="rgba(231,233,234,0.6)"
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            fontSize="9" letterSpacing="1"
          >
            GASCOIN v0.1 · SESSION 01 · BOOT MODE
          </text>

          <text x="252" y="342"
            fill="#0a0a0b"
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            fontWeight="800" fontSize="28" letterSpacing="2"
          >
            &gt; BOOT
          </text>
          <text x="252" y="380"
            fill="#0a0a0b"
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            fontSize="20" letterSpacing="1"
          >
            GASCOIN PROTOCOL
          </text>
          <text x="252" y="414"
            fill="#0a0a0b"
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            fontSize="14" letterSpacing="1"
          >
            SEASON 1 · INVITE REQ
          </text>
          <text x="252" y="478"
            fill="#0a0a0b"
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            fontWeight="800" fontSize="30" letterSpacing="3"
          >
            &gt; ENTER_
          </text>
          <rect id="pump-display-cursor" x="420" y="456" width="14" height="26" fill="#0a0a0b">
            <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.5;0.5001;1" dur="1s" repeatCount="indefinite" />
          </rect>
        </g>
      </g>

      {/* ═══════════════════════════════════════════════════════════════
          TOP HANDLE + BEACON + ANTENNA
          ═══════════════════════════════════════════════════════════════ */}

      <g {...regionProps('handle')}>
        {/* Antenna stub */}
        <line x1="480" y1="158" x2="480" y2="142" stroke="#2F3336" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="480" cy="140" r="2" fill="#1a1a1d" stroke="#2F3336" strokeWidth="0.6" />

        {/* Beacon housing */}
        <rect x="450" y="160" width="60" height="24" fill="#000" stroke="#2F3336" strokeWidth="1" />
        {/* Beacon inner strip */}
        <rect x="452" y="162" width="56" height="4" fill="url(#rim-light)" />
        {/* Beacon bulb — pulsing */}
        <circle cx="480" cy="173" r="3" fill="#E7E9EA">
          <animate attributeName="opacity" values="0.35;1;0.35" dur="2.6s" repeatCount="indefinite" />
        </circle>
        <circle cx="480" cy="173" r="6" fill="none" stroke="rgba(231,233,234,0.2)" strokeWidth="0.8">
          <animate attributeName="r" values="3;10;3" dur="2.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0;0.4" dur="2.6s" repeatCount="indefinite" />
        </circle>

        {/* Main handle slab */}
        <rect x="340" y="186" width="320" height="44" fill="url(#body-grad)" stroke="#2F3336" strokeWidth="1.5" />
        {/* Top edge highlight */}
        <rect x="342" y="188" width="316" height="12" fill="url(#rim-light)" />

        {/* Grip lines */}
        <line x1="360" y1="208" x2="640" y2="208" stroke="rgba(231,233,234,0.08)" strokeWidth="1" />
        <line x1="360" y1="214" x2="640" y2="214" stroke="rgba(231,233,234,0.08)" strokeWidth="1" />
        <line x1="360" y1="220" x2="640" y2="220" stroke="rgba(231,233,234,0.08)" strokeWidth="1" />
      </g>

      {/* ═══════════════════════════════════════════════════════════════
          NOZZLE — connector, hose (with braiding), grip, spout, drip
          ═══════════════════════════════════════════════════════════════ */}

      <g {...regionProps('nozzle')}>
        {/* Connector flange on body */}
        <rect x="755" y="376" width="26" height="32" fill="#1a1a1d" stroke="#2F3336" strokeWidth="1.5" />
        {/* Connector ring detail */}
        <line x1="755" y1="384" x2="781" y2="384" stroke="rgba(231,233,234,0.18)" strokeWidth="0.6" />
        <line x1="755" y1="400" x2="781" y2="400" stroke="rgba(231,233,234,0.18)" strokeWidth="0.6" />

        {/* Hose — outer stroke for depth */}
        <path
          d="M 781 394 C 840 394, 866 440, 866 500 C 866 552, 852 576, 824 576"
          stroke="#2F3336" strokeWidth="16" fill="none" strokeLinecap="round"
        />
        {/* Inner core */}
        <path
          d="M 781 394 C 840 394, 866 440, 866 500 C 866 552, 852 576, 824 576"
          stroke="#0a0a0b" strokeWidth="10" fill="none" strokeLinecap="round"
        />
        {/* Hose braiding */}
        <g stroke="rgba(231,233,234,0.12)" strokeWidth="0.8" fill="none">
          <line x1="800" y1="390" x2="800" y2="402" />
          <line x1="820" y1="394" x2="820" y2="406" />
          <line x1="838" y1="408" x2="838" y2="422" />
          <line x1="852" y1="428" x2="852" y2="442" />
          <line x1="860" y1="454" x2="874" y2="454" />
          <line x1="862" y1="476" x2="876" y2="476" />
          <line x1="862" y1="498" x2="876" y2="498" />
          <line x1="860" y1="520" x2="874" y2="520" />
          <line x1="852" y1="542" x2="860" y2="554" />
          <line x1="836" y1="560" x2="842" y2="572" />
        </g>

        {/* Nozzle grip assembly */}
        <g transform="translate(760, 564)">
          {/* Top connector stub */}
          <rect x="28" y="0" width="30" height="20" fill="#1a1a1d" stroke="#2F3336" strokeWidth="1" />
          <line x1="28" y1="6" x2="58" y2="6" stroke="rgba(231,233,234,0.12)" strokeWidth="0.6" />

          {/* Main grip body */}
          <rect x="0" y="18" width="86" height="100" fill="url(#nozzle-grad)" stroke="#2F3336" strokeWidth="1.5" />
          <rect x="2" y="20" width="82" height="18" fill="url(#rim-light)" />

          {/* Grip contour lines */}
          <line x1="10" y1="46" x2="76" y2="46" stroke="rgba(231,233,234,0.08)" strokeWidth="0.8" />
          <line x1="10" y1="54" x2="76" y2="54" stroke="rgba(231,233,234,0.08)" strokeWidth="0.8" />
          <line x1="10" y1="62" x2="76" y2="62" stroke="rgba(231,233,234,0.08)" strokeWidth="0.8" />

          {/* Trigger guard */}
          <path
            d="M 10 72 Q -12 82, -12 102 Q -12 122, 14 122 L 38 122"
            fill="none" stroke="#2F3336" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
          />
          {/* Trigger */}
          <rect x="12" y="84" width="22" height="12" fill="#0a0a0b" stroke="#2F3336" strokeWidth="0.8" />
          <line x1="14" y1="90" x2="32" y2="90" stroke="rgba(231,233,234,0.1)" strokeWidth="0.5" />

          {/* Spout assembly */}
          <rect x="30" y="118" width="24" height="44" fill="#1a1a1d" stroke="#2F3336" strokeWidth="1" />
          {/* Spout rings */}
          <line x1="30" y1="128" x2="54" y2="128" stroke="rgba(231,233,234,0.12)" strokeWidth="0.6" />
          <line x1="30" y1="140" x2="54" y2="140" stroke="rgba(231,233,234,0.12)" strokeWidth="0.6" />
          <line x1="30" y1="152" x2="54" y2="152" stroke="rgba(231,233,234,0.12)" strokeWidth="0.6" />
          {/* Tip */}
          <rect x="28" y="158" width="28" height="8" fill="#0a0a0b" stroke="#2F3336" strokeWidth="0.8" />
          <rect x="32" y="164" width="20" height="4" fill="#000" />

          {/* Serial number */}
          <text x="43" y="32" textAnchor="middle"
            fill="rgba(231,233,234,0.35)"
            fontFamily="ui-monospace, 'IBM Plex Mono', monospace"
            fontSize="6" letterSpacing="1"
          >
            NOZ · 01
          </text>

          {/* Animated drip — forms, falls, fades */}
          <circle cx="42" cy="172" r="2.5" fill="rgba(231,233,234,0.9)">
            <animate attributeName="cy" values="170;170;196;220" keyTimes="0;0.3;0.7;1" dur="3.4s" repeatCount="indefinite" />
            <animate attributeName="r" values="0;2.5;2;1" keyTimes="0;0.3;0.7;1" dur="3.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.9;0.7;0" keyTimes="0;0.3;0.7;1" dur="3.4s" repeatCount="indefinite" />
          </circle>
        </g>
      </g>
    </svg>
  );
}
