'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

/**
 * Theme provider — manages the three-state theme (dark | light | auto) used
 * by the ThemeToggle widget in the top nav.
 *
 * Storage: localStorage key `gc_theme`. One of: 'dark' | 'light' | 'auto'.
 *   - 'auto' follows the user's OS preference via prefers-color-scheme
 *   - 'dark' and 'light' are explicit overrides that persist across sessions
 *
 * FOUC avoidance: the initial theme is applied in a blocking inline script
 * injected into <head> by app/layout.tsx. That script runs before React
 * hydrates and sets the data-theme attribute on <html>, so the page never
 * paints in the wrong scheme. This component is the React layer that owns
 * the state after hydration and reacts to user clicks on the toggle.
 */

export type ThemeMode = 'dark' | 'light' | 'auto';
export type ResolvedTheme = 'dark' | 'light';

type ThemeContextValue = {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  cycle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'gc_theme';

function resolve(mode: ThemeMode): ResolvedTheme {
  if (mode === 'auto') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return 'dark';
  }
  return mode;
}

function applyToDOM(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', resolved);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initial state — read from localStorage on mount. SSR renders with 'dark'
  // (matches the inline script's default), then useEffect corrects it on
  // hydration if the stored value is different. This causes at most one
  // attribute re-read, never a paint change.
  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    let stored: ThemeMode = 'dark';
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === 'dark' || raw === 'light' || raw === 'auto') stored = raw;
    } catch {
      /* localStorage blocked — fall through with default */
    }
    setModeState(stored);
    applyToDOM(resolve(stored));
  }, []);

  // React to OS-level prefers-color-scheme changes when in auto mode
  useEffect(() => {
    if (mode !== 'auto' || typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => applyToDOM(resolve('auto'));
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* localStorage blocked — the mode still applies for this session */
    }
    applyToDOM(resolve(next));
  }, []);

  // Three-state cycle: dark → light → auto → dark
  const cycle = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : mode === 'light' ? 'auto' : 'dark');
  }, [mode, setMode]);

  const resolved = resolve(mode);

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode, cycle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Graceful fallback for components rendered outside the provider (e.g.
    // storybook, test harnesses). Never throws so the page always renders.
    return {
      mode: 'dark',
      resolved: 'dark',
      setMode: () => {},
      cycle: () => {},
    };
  }
  return ctx;
}

/**
 * Blocking script that runs in <head> before React hydrates. Reads the
 * stored theme (or falls back to the OS preference) and sets the
 * data-theme attribute on <html> synchronously so the first paint is
 * already in the correct mode. Exported as a plain string so layout.tsx
 * can inject it via an inline <script> with a static, compile-time value
 * (no user input reaches this string).
 */
export const THEME_INIT_SCRIPT = `
(function() {
  try {
    var m = localStorage.getItem('${STORAGE_KEY}');
    var resolved;
    if (m === 'light') {
      resolved = 'light';
    } else if (m === 'dark') {
      resolved = 'dark';
    } else {
      resolved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', resolved);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`.trim();
