'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

type AdaptiveNavResult = {
  compact: boolean;
  navRef: RefObject<HTMLElement | null>;
  brandRef: RefObject<HTMLElement | null>;
  linksRef: RefObject<HTMLElement | null>;
  actionsRef: RefObject<HTMLElement | null>;
};

/**
 * Compact mode below 1100px — shows hamburger menu.
 * Above 1100px — shows full desktop nav bar.
 * Simple viewport check, no overflow measurement (prevents flicker).
 */
export function useAdaptiveNav(): AdaptiveNavResult {
  const navRef = useRef<HTMLElement | null>(null);
  const brandRef = useRef<HTMLElement | null>(null);
  const linksRef = useRef<HTMLElement | null>(null);
  const actionsRef = useRef<HTMLElement | null>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const sync = () => setCompact(window.innerWidth <= 1100);
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  return { compact, navRef, brandRef, linksRef, actionsRef };
}
