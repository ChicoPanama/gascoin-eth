import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { requireReviewer } from '../../../../lib/reviewer-auth';
import { checkRateLimit } from '../../../../lib/rate-limit';

/**
 * Admin Intelligence Feed
 *
 * GET  — Returns intelligence entries with optional filters
 * POST — Acknowledge an intelligence entry
 */

export async function GET(req: Request) {
  const reviewer = await requireReviewer(req);
  if (!reviewer) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const rl = await checkRateLimit(`intel:${reviewer.xId}`, 30, 60);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const url = new URL(req.url);
  const entryType = url.searchParams.get('type') || 'all';
  const severity = url.searchParams.get('severity');
  const acknowledged = url.searchParams.get('acknowledged');
  const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('intelligence_entries')
      .select('id, entry_type, entity_type, entity_id, summary, detail_json, severity, pipeline_source, acknowledged, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (entryType !== 'all') {
      query = query.eq('entry_type', entryType);
    }
    if (severity) {
      query = query.eq('severity', severity);
    }
    if (acknowledged === 'true') {
      query = query.eq('acknowledged', true);
    } else if (acknowledged === 'false') {
      query = query.eq('acknowledged', false);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ ok: false, error: 'query_failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, entries: data || [], count: (data || []).length });
  } catch {
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const reviewer = await requireReviewer(req);
  if (!reviewer) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = Number(body?.id);
    if (!id) {
      return NextResponse.json({ ok: false, error: 'id_required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('intelligence_entries')
      .update({ acknowledged: true })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ ok: false, error: 'update_failed' }, { status: 500 });
    }

    await supabase.from('audit_logs').insert({
      actor_type: 'admin',
      actor_id: reviewer.xHandle,
      action: 'intelligence_acknowledged',
      target_type: 'intelligence_entry',
      target_id: String(id),
      payload_json: { via: reviewer.via },
    });

    return NextResponse.json({ ok: true, acknowledged: id });
  } catch {
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
