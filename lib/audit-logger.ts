import { getSupabaseAdmin } from './supabase';

export async function logAdminAction({
  adminWallet, action, targetType, targetId, beforeState, afterState, metadata,
}: {
  adminWallet: string;
  action: string;
  targetType: string;
  targetId: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdmin();
  await supabase.from('audit_logs').insert({
    actor_type: 'admin',
    actor_id: adminWallet,
    action,
    target_type: targetType,
    target_id: targetId,
    payload_json: { before: beforeState, after: afterState, ...metadata },
  });
}
