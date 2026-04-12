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
 * Keep top bar stable on desktop/laptop.
 * Compact mode is strictly mobile (<=900px).
 */
export function useAdaptiveNav(): AdaptiveNavResult {
  const navRef = useRef<HTMLElement | null>(null);
  const brandRef = useRef<HTMLElement | null>(null);
  const linksRef = useRef<HTMLElement | null>(null);
  const actionsRef = useRef<HTMLElement | null>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const sync = () => setCompact(window.innerWidth <= 1200);
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  return { compact, navRef, brandRef, linksRef, actionsRef };
}
