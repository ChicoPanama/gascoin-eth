import { NextResponse } from 'next/server';
import {
  parseProjectGasCrewSnapshot,
  unavailableCrewSnapshot,
} from '@/lib/project-gas/crew-state';
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
    source = getProjectGasReadSource('crews');
  } catch {
    return NextResponse.json(
      unavailableCrewSnapshot('No approved Project GAS Crew ranking read source is configured.'),
      { status: 200, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const response = await requestProjectGasReadSource({ source });
    if (response.status < 200 || response.status >= 300) {
      return NextResponse.json(
        unavailableCrewSnapshot(`Crew ranking source returned HTTP ${response.status}.`),
        { status: 200, headers: NO_STORE_HEADERS },
      );
    }

    return NextResponse.json(parseProjectGasCrewSnapshot(response.body), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch {
    return NextResponse.json(unavailableCrewSnapshot('Crew ranking source could not be reconciled.'), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  }
}
