import { NextResponse } from 'next/server';
import {
  parseProjectGasReserveSnapshot,
  unavailableReserveSnapshot,
  type RawProjectGasReserveSnapshot,
} from '@/lib/project-gas/reserve-state';
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
    source = getProjectGasReadSource('reserve');
  } catch {
    return NextResponse.json(
      unavailableReserveSnapshot('No approved Project GAS reserve read source is configured.'),
      { status: 200, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const response = await requestProjectGasReadSource({ source });
    if (response.status < 200 || response.status >= 300) {
      return NextResponse.json(
        unavailableReserveSnapshot(`Reserve read source returned HTTP ${response.status}.`),
        { status: 200, headers: NO_STORE_HEADERS },
      );
    }

    const raw = response.body as RawProjectGasReserveSnapshot;
    const snapshot = parseProjectGasReserveSnapshot(raw);

    return NextResponse.json(snapshot, {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch {
    return NextResponse.json(
      unavailableReserveSnapshot('Reserve read source could not be reconciled.'),
      { status: 200, headers: NO_STORE_HEADERS },
    );
  }
}
