export interface WalletSubmission {
  id: string;
  wallet: string;
  status: string;
  sol_amount: number;
  storage_path: string | null;
  country: string | null;
  receipt_usd: number | null;
  receipt_date: string | null;
  created_at: string;
  updated_at: string;
  gates_passed: number;
  rejection_reason: string | null;
  gate_logs?: GateLogEntry[];
}

export interface GateLogEntry {
  gate_id: number;
  gate_name: string;
  status: string;
  passed: boolean;
  score: number | null;
  reason_code: string | null;
  created_at: string | null;
}

export interface WalletSummary {
  total_approved: number;
  total_pending: number;
  total_rejected: number;
  total_sol_earned: number;
  last_approved_at: string | null;
  last_submission_at: string | null;
}

export interface CooldownStatus {
  in_cooldown: boolean;
  cooldown_ends_at: string | null;
  seconds_remaining: number;
}

export type TrackerMode = 'idle' | 'connected' | 'lookup';
export type HistoryFilter = 'all' | 'approved' | 'pending' | 'rejected';
