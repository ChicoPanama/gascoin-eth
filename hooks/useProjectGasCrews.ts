'use client';

import { useQuery } from '@tanstack/react-query';
import {
  unavailableCrewSnapshot,
  type ProjectGasCrewSnapshot,
} from '@/lib/project-gas/crew-state';

function isCrewSnapshot(value: unknown): value is ProjectGasCrewSnapshot {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return record.version === 1
    && typeof record.status === 'string'
    && typeof record.authority === 'string'
    && Array.isArray(record.rows);
}

async function fetchCrewSnapshot(): Promise<ProjectGasCrewSnapshot> {
  try {
    const response = await fetch('/api/project-gas/crews', {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return unavailableCrewSnapshot(`Crew endpoint returned HTTP ${response.status}.`);
    }

    const body = await response.json() as unknown;
    return isCrewSnapshot(body)
      ? body
      : unavailableCrewSnapshot('Crew endpoint returned an invalid canonical shape.');
  } catch {
    return unavailableCrewSnapshot('Crew endpoint is currently unreachable.');
  }
}

export function useProjectGasCrews() {
  return useQuery({
    queryKey: ['project-gas', 'crews', 'v1'],
    queryFn: fetchCrewSnapshot,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
