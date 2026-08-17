'use client';

import { useQuery } from '@tanstack/react-query';
import {
  unavailableReserveSnapshot,
  type ProjectGasReserveSnapshot,
} from '@/lib/project-gas/reserve-state';

function isReserveSnapshot(value: unknown): value is ProjectGasReserveSnapshot {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return record.version === 1
    && typeof record.status === 'string'
    && typeof record.authority === 'string'
    && Array.isArray(record.components)
    && Array.isArray(record.exclusions)
    && Boolean(record.rebase)
    && typeof record.rebase === 'object';
}

async function fetchReserveSnapshot(): Promise<ProjectGasReserveSnapshot> {
  try {
    const response = await fetch('/api/project-gas/reserve', {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return unavailableReserveSnapshot(`Reserve endpoint returned HTTP ${response.status}.`);
    }

    const body = await response.json() as unknown;
    if (!isReserveSnapshot(body)) {
      return unavailableReserveSnapshot('Reserve endpoint returned an invalid canonical shape.');
    }

    return body;
  } catch {
    return unavailableReserveSnapshot('Reserve endpoint is currently unreachable.');
  }
}

export function useProjectGasReserve() {
  return useQuery({
    queryKey: ['project-gas', 'reserve', 'v1'],
    queryFn: fetchReserveSnapshot,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
