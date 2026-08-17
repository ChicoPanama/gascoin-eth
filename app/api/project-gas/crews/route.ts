import { NextResponse } from 'next/server';
import {
  parseProjectGasCrewSnapshot,
  unavailableCrewSnapshot,
} from '@/lib/project-gas/crew-state';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

function crewSourceUrl(): URL | undefined {
  const raw = process.env.PROJECT_GAS_CREWS_READ_URL?.trim();
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    const localDevelopment = process.env.NODE_ENV !== 'production'
      && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    if (url.protocol !== 'https:' && !localDevelopment) return undefined;
    return url;
  } catch {
    return undefined;
  }
}

async function fetchCrewSource(url: URL): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);

  try {
    const token = process.env.PROJECT_GAS_CREWS_READ_TOKEN?.trim();
    return await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const source = crewSourceUrl();
  if (!source) {
    return NextResponse.json(
      unavailableCrewSnapshot('No approved Project GAS Crew ranking read source is configured.'),
      { status: 200, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const response = await fetchCrewSource(source);
    if (!response.ok) {
      return NextResponse.json(
        unavailableCrewSnapshot(`Crew ranking source returned HTTP ${response.status}.`),
        { status: 200, headers: NO_STORE_HEADERS },
      );
    }

    const raw = await response.json() as unknown;
    return NextResponse.json(parseProjectGasCrewSnapshot(raw), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'Crew ranking source timed out.'
      : 'Crew ranking source could not be reconciled.';

    return NextResponse.json(unavailableCrewSnapshot(message), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  }
}
