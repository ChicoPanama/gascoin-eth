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
  const compactRef = useRef(false);
  const expandedWidthsRef = useRef({ brand: 0, links: 0, actions: 0 });

  const BUFFER = 48;
  const RELEASE_HYSTERESIS = 120;

  const measure = useCallback(() => {
    const nav = navRef.current;
    const brand = brandRef.current;
    const links = linksRef.current;
    const actions = actionsRef.current;

    if (!nav || !brand || !links || !actions) return;

    // Keep canonical mobile behavior first.
    if (window.innerWidth <= 900) {
      compactRef.current = true;
      setCompact(true);
      return;
    }

    const navWidth = nav.clientWidth;
    const measuredBrand = brand.getBoundingClientRect().width;
    const measuredLinks = links.getBoundingClientRect().width;
    const measuredActions = actions.getBoundingClientRect().width;

    // Capture full (expanded) widths only when nav is currently expanded.
    if (!compactRef.current) {
      expandedWidthsRef.current = {
        brand: measuredBrand,
        links: measuredLinks,
        actions: measuredActions,
      };
    }

    const cached = expandedWidthsRef.current;
    const requiredExpanded =
      (cached.brand || measuredBrand) +
      (cached.links || measuredLinks) +
      (cached.actions || measuredActions) +
      BUFFER;

    if (compactRef.current) {
      // Only expand when we have comfortable extra room to avoid oscillation.
      if (navWidth >= requiredExpanded + RELEASE_HYSTERESIS) {
        compactRef.current = false;
        setCompact(false);
      }
      return;
    }

    if (navWidth < requiredExpanded) {
      compactRef.current = true;
      setCompact(true);
    }
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
