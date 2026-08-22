'use client';

import { useGasOriginalLive } from './useGasOriginalLive';
import { useGasOriginalPrototype } from './useGasOriginalPrototype';

export function useGasOriginalController() {
  const liveEnabled = process.env.NEXT_PUBLIC_PROJECT_GAS_GAME_LIVE_ENABLED === 'true';
  const prototype = useGasOriginalPrototype();
  const live = useGasOriginalLive(liveEnabled);

  return liveEnabled
    ? { ...live, executionMode: 'live' as const }
    : { ...prototype, executionMode: 'prototype' as const };
}
