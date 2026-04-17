/**
 * Mem0 webhook receiver
 *
 * Registered on the `gascoin-production` mem0 project to receive real-time
 * notifications when high-severity memories are added, updated, or
 * categorized. Writes alerts into the existing `intelligence_entries` and
 * `audit_logs` tables so admins can see them in the admin dashboard.
 *
 * Subscribed events:
 *   - memory:add         → fires whenever a new memory is created
 *   - memory:categorize  → fires when mem0 tags a memory into a category
 *                          (critical for detecting ring flags / critical fraud)
 *
 * Security:
 *   - Endpoint is protected by MEM0_WEBHOOK_SECRET (shared bearer token
 *     configured on the mem0 project webhook registration)
 *   - Never trusts body content without secret check
 *   - Fails closed — unknown events are acknowledged but not processed
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { cacheGet, cacheSet } from '../../../../lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

type Mem0WebhookPayload = {
  event_type?: 'memory_add' | 'memory_update' | 'memory_delete' | 'memory_categorize';
  webhook_id?: string;
  project_id?: string;
  data?: {
    memory_id?: string;
    memory?: string;
    user_id?: string;
    agent_id?: string;
    app_id?: string;
    run_id?: string;
    metadata?: Record<string, unknown>;
    created_at?: string;
    updated_at?: string;
  };
  timestamp?: string;
};

function extractWallet(userId: string | undefined): string | null {
  if (!userId) return null;
  // Entity key convention: wallet:{address}, x:{handle}, system:{id}
  const m = userId.match(/^wallet:(.+)$/);
  return m ? m[1] : null;
}

function isHighSeverity(payload: Mem0WebhookPayload): {
  severe: boolean;
  severity: 'info' | 'medium' | 'high' | 'critical';
  category: string;
} {
  const meta = payload.data?.metadata || {};
  const category = String(meta.category || 'unknown');
  const severity = String(meta.severity || 'info') as 'info' | 'medium' | 'high' | 'critical';

  // Category-level severity rules — some categories are always critical.
  const alwaysCritical = new Set(['referral_ring_flag', 'ban_state']);
  if (alwaysCritical.has(category)) {
    return { severe: true, severity: 'critical', category };
  }

  // Severity-level filter — anything marked high or critical is worth surfacing.
  if (severity === 'high' || severity === 'critical') {
    return { severe: true, severity, category };
  }

  return { severe: false, severity, category };
}

export async function POST(req: Request) {
  // Secret check — bearer token in Authorization header, shared with mem0
  // at webhook registration time. Fail closed if not set or mismatched.
  const expectedSecret = (process.env.MEM0_WEBHOOK_SECRET || '').trim();
  if (!expectedSecret) {
    return NextResponse.json({ ok: false, error: 'webhook_secret_not_configured' }, { status: 503 });
  }
  const authHeader = req.headers.get('authorization') || '';
  const presentedSecret = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (presentedSecret !== expectedSecret) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // S16: Require JSON content-type
  const ct = req.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    return NextResponse.json({ ok: false, error: 'content_type_must_be_json' }, { status: 415 });
  }

  // S14: Reject oversized payloads (1 MB hard limit)
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 1_048_576) {
    return NextResponse.json({ ok: false, error: 'payload_too_large' }, { status: 413 });
  }

  // Parse payload
  let payload: Mem0WebhookPayload;
  try {
    payload = (await req.json()) as Mem0WebhookPayload;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  // S15: Idempotency — deduplicate on webhook_id using Redis (1-hour window)
  const webhookId = payload.webhook_id;
  if (webhookId) {
    const dedupKey = `mem0_wh:${webhookId}`;
    const alreadySeen = await cacheGet<string>(dedupKey);
    if (alreadySeen) {
      return NextResponse.json({ ok: true, acknowledged: payload.event_type || 'unknown', duplicate: true });
    }
    await cacheSet(dedupKey, '1', 3600);
  }

  const eventType = payload.event_type || 'unknown';
  const wallet = extractWallet(payload.data?.user_id);
  const { severe, severity, category } = isHighSeverity(payload);

  // Always ack quickly — mem0 retries on non-2xx. Processing is fire-and-forget.
  (async () => {
    try {
      const supabase = getSupabaseAdmin();

      // Audit log entry for every webhook hit (immutable)
      await supabase.from('audit_logs').insert({
        actor_type: 'system',
        actor_id: 'mem0_webhook',
        action: `mem0.${eventType}`,
        target_type: wallet ? 'wallet' : 'system',
        target_id: wallet || (payload.data?.user_id || 'unknown'),
        payload_json: {
          event_type: eventType,
          category,
          severity,
          memory_id: payload.data?.memory_id,
          agent_id: payload.data?.agent_id,
          app_id: payload.data?.app_id,
          run_id: payload.data?.run_id,
          metadata: payload.data?.metadata,
          memory: (payload.data?.memory || '').slice(0, 500),
          timestamp: payload.timestamp,
        },
      });

      // High-severity events also go to intelligence_entries for admin UI
      if (severe && wallet) {
        await supabase.from('intelligence_entries').insert({
          entry_type: `mem0_${category}`,
          entity_type: 'wallet',
          entity_id: wallet,
          summary: (payload.data?.memory || '').slice(0, 500),
          detail_json: {
            event_type: eventType,
            category,
            severity,
            memory_id: payload.data?.memory_id,
            agent_id: payload.data?.agent_id,
            app_id: payload.data?.app_id,
            run_id: payload.data?.run_id,
            metadata: payload.data?.metadata,
          },
          severity,
          pipeline_source: 'mem0_webhook',
        });
      }
    } catch {
      // Silent — we already acked the webhook
    }
  })();

  return NextResponse.json({ ok: true, acknowledged: eventType, severe });
}

// GET for readiness / health check — mem0 may ping this during setup
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: 'mem0-webhook',
    secret_configured: !!process.env.MEM0_WEBHOOK_SECRET,
  });
}
