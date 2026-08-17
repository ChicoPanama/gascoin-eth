import { NextResponse } from 'next/server';
import {
  parseProjectGasActivitySnapshot,
  unavailableActivitySnapshot,
} from '@/lib/project-gas/activity-state';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

function activitySourceUrl(): URL | undefined {
  const raw = process.env.PROJECT_GAS_ACTIVITY_READ_URL?.trim();
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

async function fetchActivitySource(url: URL): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);

  try {
    const token = process.env.PROJECT_GAS_ACTIVITY_READ_TOKEN?.trim();
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
  const source = activitySourceUrl();
  if (!source) {
    return NextResponse.json(
      unavailableActivitySnapshot('No approved Project GAS activity read source is configured.'),
      { status: 200, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const response = await fetchActivitySource(source);
    if (!response.ok) {
      return NextResponse.json(
        unavailableActivitySnapshot(`Activity read source returned HTTP ${response.status}.`),
        { status: 200, headers: NO_STORE_HEADERS },
      );
    }

    const raw = await response.json() as unknown;
    return NextResponse.json(parseProjectGasActivitySnapshot(raw), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'Activity read source timed out.'
      : 'Activity read source could not be reconciled.';

    return NextResponse.json(unavailableActivitySnapshot(message), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  }
}
