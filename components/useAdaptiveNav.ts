'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';

type AdaptiveNavResult = {
  compact: boolean;
  navRef: RefObject<HTMLElement | null>;
  brandRef: RefObject<HTMLElement | null>;
  linksRef: RefObject<HTMLElement | null>;
  actionsRef: RefObject<HTMLElement | null>;
};

function subscribe(cb: () => void) {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
}

function getSnapshot() {
  // Desktop full nav remains visible until true mobile widths.
  return window.innerWidth <= 900;
}

function getServerSnapshot() {
  return false;
}

/**
 * Compact mode below 1100px — shows hamburger menu.
 * Uses useSyncExternalStore to avoid hydration flicker.
 */
export function useAdaptiveNav(): AdaptiveNavResult {
  const navRef = useRef<HTMLElement | null>(null);
  const brandRef = useRef<HTMLElement | null>(null);
  const linksRef = useRef<HTMLElement | null>(null);
  const actionsRef = useRef<HTMLElement | null>(null);
  const compact = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return { compact, navRef, brandRef, linksRef, actionsRef };
}
