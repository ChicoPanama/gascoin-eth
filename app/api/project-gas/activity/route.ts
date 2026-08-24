import { NextResponse } from 'next/server';
import {
  parseProjectGasActivitySnapshot,
  unavailableActivitySnapshot,
} from '@/lib/project-gas/activity-state';
import {
  getProjectGasReadSource,
  requestProjectGasReadSource,
} from '@/lib/project-gas/authoritative-read-source';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

export async function GET() {
  let source;
  try {
    source = getProjectGasReadSource('activity');
  } catch {
    return NextResponse.json(
      unavailableActivitySnapshot('No approved Project GAS activity read source is configured.'),
      { status: 200, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const response = await requestProjectGasReadSource({ source });
    if (response.status < 200 || response.status >= 300) {
      return NextResponse.json(
        unavailableActivitySnapshot(`Activity read source returned HTTP ${response.status}.`),
        { status: 200, headers: NO_STORE_HEADERS },
      );
    }

    return NextResponse.json(parseProjectGasActivitySnapshot(response.body), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch {
    return NextResponse.json(unavailableActivitySnapshot('Activity read source could not be reconciled.'), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  }
}
