import type { GateDefinition } from '../lib/gates';

export interface GateStats {
  gate_id: string | number;
  total_passed: number;
  total_failed: number;
  total_processed: number;
  pass_rate_pct: number;
  avg_duration_ms: number;
  avg_duration_all_ms: number;
}

export interface GateFailureReason {
  gate_id: string | number;
  failure_reason: string;
  occurrence_count: number;
  pct_of_gate_failures: number;
}

export interface GateWithStats {
  definition: GateDefinition;
  stats: GateStats | null;
  top_failures: GateFailureReason[];
}

export type GateCategoryFilter = 'all' | 'tweet' | 'receipt' | 'wallet' | 'treasury';
