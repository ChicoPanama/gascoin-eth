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
 * Adaptive nav: switches to compact (hamburger) mode when links overflow.
 * Checks actual content width, not just viewport breakpoint.
 * Fallback: always compact below 1100px since we have 11+ links.
 */
export function useAdaptiveNav(): AdaptiveNavResult {
  const navRef = useRef<HTMLElement | null>(null);
  const brandRef = useRef<HTMLElement | null>(null);
  const linksRef = useRef<HTMLElement | null>(null);
  const actionsRef = useRef<HTMLElement | null>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const sync = () => {
      // Hard cutoff for mobile
      if (window.innerWidth <= 1100) {
        setCompact(true);
        return;
      }
      // Check actual overflow: if links + brand + actions exceed nav width
      const nav = navRef.current;
      const brand = brandRef.current;
      const links = linksRef.current;
      const actions = actionsRef.current;
      if (nav && brand && links && actions) {
        const available = nav.clientWidth;
        const needed = brand.scrollWidth + links.scrollWidth + actions.scrollWidth + 32;
        setCompact(needed > available);
      } else {
        setCompact(false);
      }
    };
    // Initial check after render
    const raf = requestAnimationFrame(sync);
    window.addEventListener('resize', sync);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', sync); };
  }, []);

  return { compact, navRef, brandRef, linksRef, actionsRef };
}
