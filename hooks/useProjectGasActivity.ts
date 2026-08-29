'use client';

import { useQuery } from '@tanstack/react-query';
import {
  unavailableActivitySnapshot,
  type ProjectGasActivitySnapshot,
} from '@/lib/project-gas/activity-state';

function isActivitySnapshot(value: unknown): value is ProjectGasActivitySnapshot {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return record.version === 1
    && typeof record.status === 'string'
    && typeof record.authority === 'string'
    && typeof record.health === 'string'
    && Array.isArray(record.events);
}

async function fetchActivitySnapshot(): Promise<ProjectGasActivitySnapshot> {
  try {
    const response = await fetch('/api/project-gas/activity', {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return unavailableActivitySnapshot(`Activity endpoint returned HTTP ${response.status}.`);
    }

    const body = await response.json() as unknown;
    if (!isActivitySnapshot(body)) {
      return unavailableActivitySnapshot('Activity endpoint returned an invalid canonical shape.');
    }

    return body;
  } catch {
    return unavailableActivitySnapshot('Activity endpoint is currently unreachable.');
  }
}

export function useProjectGasActivity() {
  return useQuery({
    queryKey: ['project-gas', 'activity', 'v1'],
    queryFn: fetchActivitySnapshot,
    staleTime: 10_000,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
