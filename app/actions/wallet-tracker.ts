'use server';

import { getSupabaseAdmin } from '../../lib/supabase';
import type { WalletSubmission, WalletSummary, CooldownStatus } from '../../types/wallet-tracker';

function mapClaim(c: any): WalletSubmission {
  return {
    id: c.id,
    wallet: c.wallet,
    status: c.status,
    sol_amount: 0,
    storage_path: c.claim_receipts?.[0]?.storage_path_private || null,
    country: c.country || null,
    receipt_usd: c.parsed_amount ? Number(c.parsed_amount) : null,
    receipt_date: c.created_at,
    created_at: c.created_at,
    updated_at: c.updated_at,
    gates_passed: 0,
    rejection_reason: c.decision_reason || null,
    gate_logs: (c.gate_results || []).map((g: any) => ({
      gate_id: 0,
      gate_name: g.gate_name,
      status: g.passed ? 'passed' : 'failed',
      passed: g.passed,
      score: g.score,
      reason_code: g.reason_code,
      created_at: g.created_at,
    })),
  };
}

// Full history — connected wallet owner
export async function getOwnSubmissions(wallet: string): Promise<WalletSubmission[]> {
  try {
    const supabase = getSupabaseAdmin();

    // Get claims with gate results
    const { data: claims } = await supabase
      .from('claims')
      .select('id, wallet, status, parsed_amount, country, created_at, updated_at, decision_reason, claim_receipts(storage_path_private), gate_results(gate_name, passed, score, reason_code, created_at)')
      .eq('wallet', wallet)
      .order('created_at', { ascending: false });

    // Get payouts to attach SOL amounts
    const { data: payouts } = await supabase
      .from('payouts')
      .select('claim_id, amount_sol, status')
      .eq('wallet', wallet);

    const payoutMap = new Map<string, number>();
    for (const p of payouts || []) {
      if (p.status === 'paid') payoutMap.set(p.claim_id, Number(p.amount_sol || 0));
    }

    return (claims || []).map((c: any) => {
      const sub = mapClaim(c);
      sub.sol_amount = payoutMap.get(c.id) || 0;
      sub.gates_passed = (c.gate_results || []).filter((g: any) => g.passed).length;
      return sub;
    });
  } catch (e) {
    console.error('getOwnSubmissions error:', e);
    return [];
  }
}

// Public history — approved only
export async function getPublicSubmissions(wallet: string): Promise<WalletSubmission[]> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: payouts } = await supabase
      .from('payouts')
      .select('id, wallet, amount_sol, created_at, claim_id, claims(country, parsed_amount, created_at)')
      .eq('wallet', wallet)
      .eq('status', 'paid')
      .order('created_at', { ascending: false });

    return (payouts || []).map((p: any) => ({
      id: p.claim_id || p.id,
      wallet: p.wallet,
      status: 'approved',
      sol_amount: Number(p.amount_sol || 0),
      storage_path: null,
      country: p.claims?.country || null,
      receipt_usd: p.claims?.parsed_amount ? Number(p.claims.parsed_amount) : null,
      receipt_date: p.claims?.created_at || p.created_at,
      created_at: p.created_at,
      updated_at: p.created_at,
      gates_passed: 11,
      rejection_reason: null,
    }));
  } catch (e) {
    console.error('getPublicSubmissions error:', e);
    return [];
  }
}

export async function getWalletSummary(wallet: string): Promise<WalletSummary> {
  try {
    const supabase = getSupabaseAdmin();

    const [claimsRes, payoutsRes] = await Promise.all([
      supabase.from('claims').select('status, created_at').eq('wallet', wallet),
      supabase.from('payouts').select('amount_sol, created_at').eq('wallet', wallet).eq('status', 'paid'),
    ]);

    const claims = claimsRes.data || [];
    const payouts = payoutsRes.data || [];

    const approved = claims.filter((c: any) => c.status === 'approved' || c.status === 'paid').length + payouts.length;
    const pending = claims.filter((c: any) => ['submitted', 'auto_review', 'needs_manual_review'].includes(c.status)).length;
    const rejected = claims.filter((c: any) => c.status === 'rejected').length;
    const totalSol = payouts.reduce((s: number, p: any) => s + Number(p.amount_sol || 0), 0);

    const approvedDates = payouts.map((p: any) => p.created_at).filter(Boolean).sort();
    const allDates = claims.map((c: any) => c.created_at).filter(Boolean).sort();

    return {
      total_approved: approved,
      total_pending: pending,
      total_rejected: rejected,
      total_sol_earned: totalSol,
      last_approved_at: approvedDates.length > 0 ? approvedDates[approvedDates.length - 1] : null,
      last_submission_at: allDates.length > 0 ? allDates[allDates.length - 1] : null,
    };
  } catch {
    return { total_approved: 0, total_pending: 0, total_rejected: 0, total_sol_earned: 0, last_approved_at: null, last_submission_at: null };
  }
}

export async function getCooldownStatus(wallet: string): Promise<CooldownStatus> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('payouts')
      .select('created_at')
      .eq('wallet', wallet)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return { in_cooldown: false, cooldown_ends_at: null, seconds_remaining: 0 };

    const lastApproved = new Date(data.created_at);
    const cooldownEnd = new Date(lastApproved.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const remaining = Math.max(0, Math.floor((cooldownEnd.getTime() - now.getTime()) / 1000));

    return {
      in_cooldown: remaining > 0,
      cooldown_ends_at: cooldownEnd.toISOString(),
      seconds_remaining: remaining,
    };
  } catch {
    return { in_cooldown: false, cooldown_ends_at: null, seconds_remaining: 0 };
  }
}
