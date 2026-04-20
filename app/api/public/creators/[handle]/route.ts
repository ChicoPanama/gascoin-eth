import { NextResponse } from 'next/server';
import { getCreatorProfile, getCreatorPosts, getCreatorImpact } from '../../../../../lib/creator-profile';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ handle: string }> },
) {
  const { handle } = await ctx.params;
  if (!handle) {
    return NextResponse.json({ error: 'handle required' }, { status: 400 });
  }

  const [profile, posts, impact] = await Promise.all([
    getCreatorProfile(handle),
    getCreatorPosts(handle, 20),
    getCreatorImpact(handle),
  ]);

  if (!profile) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ profile, posts, impact });
}
