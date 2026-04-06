import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { getUserByUsername } from '../../../../lib/x-api';

function isAuthorized(req: Request): boolean {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

// ══════════════���════════════════════════════
// Handle Sync Worker
//
// Detects when linked X users change their handle.
// Without this, wallet_x_links silently break —
// search for from:{old_handle} returns nothing and
// the user stops earning engagement points.
//
// For each active link with x_user_id:
//   1. Look up user by stored x_user_id
//   2. If current username differs from stored handle → update
//
// For links without x_user_id (legacy):
//   1. Look up user by handle
//   2. Backfill x_user_id for future syncs
//   3. If handle lookup 404s → mark stale
//
// Runs daily at 3am UTC via Vercel cron
// ═══��═══════════════════════════════════════

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  if (!process.env.X_BEARER_TOKEN) {
    return NextResponse.json({ error: 'X_BEARER_TOKEN not configured' }, { status: 500 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: links } = await supabase
      .from('wallet_x_links')
      .select('id, wallet, x_handle, x_user_id, is_active')
      .eq('is_active', true);

    let synced = 0;
    let updated = 0;
    let backfilled = 0;
    let stale = 0;
    const changes: Array<{ wallet: string; old_handle: string; new_handle: string }> = [];

    for (const link of links || []) {
      synced++;

      try {
        if (link.x_user_id) {
          // ─── Has user ID: look up by ID to detect handle changes ───
          const endpoint = new URL(`https://api.x.com/2/users/${link.x_user_id}`);
          endpoint.searchParams.set('user.fields', 'username');

          const res = await fetch(endpoint.toString(), {
            headers: { authorization: `Bearer ${process.env.X_BEARER_TOKEN}` },
            cache: 'no-store',
          });

          if (res.status === 429) break; // Rate limited, stop for this run

          if (!res.ok) {
            if (res.status === 404) {
              // Account suspended or deleted
              await supabase.from('wallet_x_links')
                .update({ is_active: false })
                .eq('id', link.id);
              stale++;
            }
            continue;
          }

          const data = (await res.json()) as any;
          const currentHandle = data?.data?.username?.toLowerCase();

          if (currentHandle && currentHandle !== link.x_handle.toLowerCase()) {
            // Handle changed — update the mapping
            await supabase.from('wallet_x_links')
              .update({ x_handle: currentHandle })
              .eq('id', link.id);

            // Also update any scored_tweets referencing old handle
            await supabase.from('scored_tweets')
              .update({ x_handle: currentHandle })
              .eq('wallet', link.wallet)
              .eq('x_handle', link.x_handle);

            changes.push({ wallet: link.wallet, old_handle: link.x_handle, new_handle: currentHandle });
            updated++;
          }

        } else {
          // ─── No user ID: look up by handle to backfill ───
          const { user, error } = await getUserByUsername(link.x_handle);

          if (error === 'user_not_found') {
            // Handle no longer resolves — could be changed or suspended
            await supabase.from('wallet_x_links')
              .update({ is_active: false })
              .eq('id', link.id);
            stale++;
            continue;
          }

          if (user?.id) {
            // Backfill x_user_id for future syncs
            await supabase.from('wallet_x_links')
              .update({ x_user_id: user.id })
              .eq('id', link.id);
            backfilled++;
          }
        }
      } catch {
        continue;
      }
    }

    return NextResponse.json({
      ok: true,
      synced,
      updated,
      backfilled,
      stale,
      changes,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'worker failed' }, { status: 500 });
  }
}
