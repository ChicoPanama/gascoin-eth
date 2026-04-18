/**
 * Fire-and-forget error reporter for non-critical pipeline steps.
 *
 * Swapped in wherever a bare `catch {}` was losing observability —
 * fraud-signal writes, mem0 writes, metrics snapshots, AI parse errors.
 * Never throws. Never awaits the write from the caller's perspective.
 */

export function silentLog(
  error: unknown,
  context: { module: string; operation: string; wallet?: string; extra?: Record<string, unknown> },
): void {
  _write(error, context).catch(() => {});
}

async function _write(
  error: unknown,
  context: { module: string; operation: string; wallet?: string; extra?: Record<string, unknown> },
): Promise<void> {
  try {
    const { getSupabaseAdmin } = await import('./supabase');
    const supabase = getSupabaseAdmin();
    await supabase.from('intelligence_entries').insert({
      entry_type: 'silent_error',
      entity_type: context.wallet ? 'wallet' : 'system',
      entity_id: context.wallet || context.module,
      summary: `${context.module}.${context.operation}: ${error instanceof Error ? error.message : String(error)}`,
      detail_json: {
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : undefined,
        ...context.extra,
      },
      severity: 'warning',
      pipeline_source: context.module,
    });
  } catch {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[silentLog] ${context.module}.${context.operation}:`, error);
    }
  }
}
