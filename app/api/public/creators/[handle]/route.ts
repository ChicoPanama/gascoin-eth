import { NextResponse } from 'next/server';
import { getCreatorProfile, getCreatorPosts, getCreatorImpact } from '../../../../../lib/creator-profile';
import { withPublicCache } from '../../../../../lib/http-cache';

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

  // Creator pages are the slowest to mutate — posts trickle in, impact
  // recomputes in the worker. 2-min shared cache keeps creator pages snappy.
  return withPublicCache(NextResponse.json({ profile, posts, impact }), { sMaxAge: 120 });
}
