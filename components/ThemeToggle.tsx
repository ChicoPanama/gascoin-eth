'use client';

import { useTheme } from './ThemeProvider';

/**
 * Theme toggle widget — lives in the top nav, to the right of the GASCOIN
 * wordmark. Three-state cycle:
 *
 *   ● dark   → ○ light   → ◐ auto (follow OS)
 *
 * The glyph is a single unicode character in IBM Plex Mono, which keeps
 * the button exactly 28×28 (32×32 on touch devices) without any SVG. The
 * aria-label changes with each state so screen readers always announce
 * what mode the button will switch TO on the next click.
 *
 * Styles live in app/globals.css under `.gc-theme-toggle`.
 */
export function ThemeToggle() {
  const { mode, cycle } = useTheme();

  const glyph = mode === 'dark' ? '●' : mode === 'light' ? '○' : '◐';
  const nextLabel =
    mode === 'dark' ? 'Switch to light mode' :
    mode === 'light' ? 'Switch to auto (follow system)' :
    'Switch to dark mode';
  const current =
    mode === 'dark' ? 'dark' :
    mode === 'light' ? 'light' : 'auto';

  return (
    <button
      type="button"
      className="gc-theme-toggle"
      onClick={cycle}
      aria-label={nextLabel}
      title={nextLabel}
      data-theme-mode={current}
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  );
}
