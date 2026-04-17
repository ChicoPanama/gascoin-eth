import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { checkRateLimit } from '../../../../../lib/rate-limit';
import { getClientIp } from '../../../../../lib/ip';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const rl = await checkRateLimit(`pub_memory_ctx:${getClientIp(req)}`, 20, 60);
  if (!rl.ok) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  try {
    const filePath = path.join(process.cwd(), 'public', 'memory-unified-context.json');
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
        schema: 'whiteclaw.memory.unified.v2',
        status: 'unavailable',
        error: 'unavailable',
      },
      { status: 503 },
    );
  }
}
