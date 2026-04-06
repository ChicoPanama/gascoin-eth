import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'memory-unified-context-enterprise.json');
    const raw = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(raw);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        schema: 'whiteclaw.memory.unified.enterprise.v1',
        status: 'unavailable',
        error: 'unavailable',
      },
      { status: 503 },
    );
  }
}
