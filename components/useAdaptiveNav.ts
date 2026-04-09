'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

type AdaptiveNavResult = {
  compact: boolean;
  navRef: RefObject<HTMLElement | null>;
  brandRef: RefObject<HTMLElement | null>;
  linksRef: RefObject<HTMLElement | null>;
  actionsRef: RefObject<HTMLElement | null>;
};

export function useAdaptiveNav(): AdaptiveNavResult {
  const navRef = useRef<HTMLElement | null>(null);
  const brandRef = useRef<HTMLElement | null>(null);
  const linksRef = useRef<HTMLElement | null>(null);
  const actionsRef = useRef<HTMLElement | null>(null);
  const [compact, setCompact] = useState(false);

  const measure = useCallback(() => {
    const nav = navRef.current;
    const brand = brandRef.current;
    const links = linksRef.current;
    const actions = actionsRef.current;

    if (!nav || !brand || !links || !actions) return;

    // Keep canonical mobile behavior first.
    if (window.innerWidth <= 900) {
      setCompact(true);
      return;
    }

    const navWidth = nav.clientWidth;
    const required =
      brand.getBoundingClientRect().width +
      links.getBoundingClientRect().width +
      actions.getBoundingClientRect().width +
      48; // buffer for gaps/borders/rounding

    setCompact(required > navWidth);
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(measure);

    const ro = new ResizeObserver(() => measure());
    if (navRef.current) ro.observe(navRef.current);
    if (brandRef.current) ro.observe(brandRef.current);
    if (linksRef.current) ro.observe(linksRef.current);
    if (actionsRef.current) ro.observe(actionsRef.current);

    window.addEventListener('resize', measure);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  return { compact, navRef, brandRef, linksRef, actionsRef };
}
