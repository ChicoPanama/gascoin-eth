'use server';

import { verifyAdminSession } from '../admin-auth';
import { logAdminAction } from '../../../lib/audit-logger';
import { getSupabaseAdmin } from '../../../lib/supabase';

async function requireAdmin() {
  const session = await verifyAdminSession();
  if (!session.valid || !session.walletAddress) throw new Error('Unauthorized');
  return session.walletAddress;
}

export async function markReferralDispatched(conversionId: string, txSignature: string) {
  if (!txSignature) throw new Error('TX signature required');
  const adminWallet = await requireAdmin();
  const supabase = getSupabaseAdmin();

  const { data: before } = await supabase.from('referral_conversions').select('*').eq('id', conversionId).single();

  await supabase.from('referral_conversions').update({
    reward_status: 'dispatched',
    reward_tx_signature: txSignature,
    dispatched_at: new Date().toISOString(),
  }).eq('id', conversionId);

  await logAdminAction({ adminWallet, action: 'dispatch_referral_reward', targetType: 'referral_conversion', targetId: conversionId, beforeState: before, afterState: { reward_status: 'dispatched', txSignature } });
}

export async function skipReferralReward(conversionId: string, reason: string) {
  const adminWallet = await requireAdmin();
  const supabase = getSupabaseAdmin();

  await supabase.from('referral_conversions').update({ reward_status: 'skipped', skip_reason: reason }).eq('id', conversionId);

  await logAdminAction({ adminWallet, action: 'skip_referral_reward', targetType: 'referral_conversion', targetId: conversionId, metadata: { reason } });
}
