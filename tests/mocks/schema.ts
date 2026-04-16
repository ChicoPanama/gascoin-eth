// Auto-generated from Supabase schema on 2026-04-11
// This is the source of truth for column validation in tests.
// When a migration adds/removes columns, update this file.

export const SCHEMA: Record<string, string[]> = {
  users: ['id', 'x_user_id', 'x_handle', 'x_verified', 'trust_score', 'created_at'],

  wallet_links: ['id', 'user_id', 'wallet', 'is_primary', 'verified_at'],

  claims: [
    'id', 'user_id', 'wallet', 'tweet_url', 'nonce', 'status',
    'claimed_amount', 'parsed_amount', 'claim_currency', 'risk_score',
    'decision_reason', 'created_at', 'updated_at', 'country',
    'referral_code', 'is_featured', 'ip_country',
    'claude_confidence', 'account_quality_score',
  ],

  claim_receipts: [
    'id', 'claim_id', 'storage_path_private', 'hash_sha256', 'phash',
    'ocr_text', 'ocr_confidence', 'ai_score', 'tamper_score',
    'metadata_json', 'created_at', 'is_image_redacted',
    'cross_validation_risk',
  ],

  gate_results: ['id', 'claim_id', 'gate_name', 'passed', 'score', 'reason_code', 'created_at'],

  payouts: [
    'id', 'claim_id', 'wallet', 'amount_sol', 'tx_hash',
    'status', 'sent_at', 'fail_reason', 'created_at',
  ],

  payout_jobs: [
    'id', 'claim_id', 'wallet', 'amount_sol', 'status',
    'attempts', 'max_attempts', 'next_retry_at', 'last_error',
    'idempotency_key', 'created_at', 'updated_at',
  ],

  treasury_snapshots: ['id', 'wallet', 'sol_balance', 'usd_value', 'gascoin_balance', 'gascoin_usd_value', 'ts'],

  market_snapshots: ['id', 'gascoin_price_usd', 'market_cap_usd', 'volume_24h_usd', 'source', 'ts'],

  audit_logs: ['id', 'actor_type', 'actor_id', 'action', 'target_type', 'target_id', 'payload_json', 'ts'],

  claim_status_events: ['id', 'claim_id', 'from_status', 'to_status', 'actor_type', 'actor_id', 'reason', 'ts'],

  user_bans: ['id', 'user_id', 'reason', 'active', 'created_by', 'created_at'],

  gas_city_prices: ['id', 'city', 'country', 'currency', 'price_per_liter', 'price_per_gallon_usd', 'source', 'ts'],

  idempotency_keys: ['id', 'key', 'scope', 'request_hash', 'status', 'response_json', 'created_at', 'updated_at'],

  admin_users: ['id', 'x_user_id', 'x_handle', 'role', 'active', 'created_at'],

  admin_sessions: ['id', 'wallet_address', 'session_token', 'expires_at', 'created_at'],

  referral_clicks: [
    'id', 'referral_code', 'referrer_wallet', 'click_fingerprint',
    'clicked_at', 'converted_submission_id', 'converted_at', 'expires_at',
  ],

  referral_conversions: [
    'id', 'referral_code', 'referrer_wallet', 'referred_wallet',
    'submission_id', 'reward_sol', 'reward_status', 'reward_tx_signature',
    'skip_reason', 'created_at', 'dispatched_at',
  ],

  referrals: ['id', 'referrer_wallet', 'referred_wallet', 'status', 'created_at', 'verified_at'],

  engagement_points: ['id', 'wallet', 'source', 'points', 'metadata_json', 'created_at'],

  engagement_scores: [
    'id', 'wallet', 'tweet_url', 'impressions', 'likes', 'retweets',
    'replies', 'quote_tweets', 'score', 'fetched_at', 'claim_id', 'bookmarks',
  ],

  wallet_x_links: [
    'id', 'wallet', 'x_handle', 'x_user_id', 'linked_at', 'last_tweet_scan',
    'is_active', 'x_location', 'bio', 'avg_quality_score',
    'x_account_created_at', 'x_is_protected',
  ],

  scored_tweets: [
    'id', 'wallet', 'x_handle', 'tweet_id', 'tweet_url', 'tweet_text',
    'posted_at', 'impressions', 'likes', 'retweets', 'quote_tweets',
    'replies', 'bookmarks', 'raw_points', 'adjusted_points',
    'quality_score', 'quality_multiplier', 'first_scored_at',
    'last_scored_at', 'score_count',
  ],

  wallet_token_cache: ['wallet_address', 'gascoin_balance', 'gascoin_usd', 'tier_id', 'tier_name', 'updated_at'],

  user_metrics_history: [
    'id', 'user_id', 'wallet', 'x_handle', 'follower_count', 'following_count',
    'tweet_count', 'listed_count', 'account_quality_score', 'account_quality_passed',
    'gascoin_balance', 'tier_id', 'ip_country', 'x_location', 'snapshot_source', 'created_at',
  ],

  x_handle_history: ['id', 'user_id', 'x_user_id', 'old_handle', 'new_handle', 'detected_at'],
};

// Views — only define their output columns
export const VIEWS: Record<string, string[]> = {
  gate_stats_view: ['gate_id', 'total_processed', 'total_passed', 'total_failed', 'pass_rate_pct'],
  gate_failure_reasons_view: ['gate_id', 'gate_name', 'failure_reason', 'occurrence_count', 'pct_of_gate_failures'],
  leaderboard_view: ['wallet_address', 'total_submissions', 'total_sol_earned', 'last_submission_at', 'rank'],
  leaderboard_stats: ['unique_earners', 'total_sol_paid', 'total_payouts'],
  public_claims_feed: [],
  submission_queue_view: [],
  wallet_points_view: [],
  referral_summary_view: [],
  referral_counts: [],
  engagement_totals: [],
  receipts_to_flush: [],
};

/**
 * Parse a Supabase select string and validate all referenced columns.
 * Handles:
 *   - Simple: 'id, wallet, status'
 *   - Nested relations: 'claim_receipts (id, storage_path_private, created_at)'
 *   - Star: '*'
 *   - Count-only: '*' with { count: 'exact', head: true }
 */
export function validateSelect(table: string, selectStr: string): string[] {
  const errors: string[] = [];
  const allSchemas = { ...SCHEMA, ...VIEWS };
  const validCols = allSchemas[table];

  if (!validCols) {
    errors.push(`Unknown table or view: "${table}"`);
    return errors;
  }

  if (selectStr.trim() === '*') return errors;

  // Split on top-level commas (not inside parentheses)
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of selectStr) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());

  for (const part of parts) {
    // Nested relation: "relation_name (col1, col2)"
    const nestedMatch = part.match(/^(\w+)\s*\((.+)\)$/s);
    if (nestedMatch) {
      const [, relationName, innerCols] = nestedMatch;
      // Relation name might be an alias: "alias:table_name"
      const actualTable = relationName.includes(':')
        ? relationName.split(':')[1]
        : relationName;
      const innerSchema = allSchemas[actualTable];
      if (!innerSchema) {
        errors.push(`Unknown relation "${actualTable}" in select on "${table}"`);
        continue;
      }
      const cols = innerCols.split(',').map((c) => c.trim()).filter(Boolean);
      for (const col of cols) {
        if (col === '*') continue;
        const colName = col.includes(':') ? col.split(':')[1].trim() : col.trim();
        if (!innerSchema.includes(colName)) {
          errors.push(`Column "${colName}" does not exist on "${actualTable}"`);
        }
      }
      continue;
    }

    // Alias: "alias:column"
    const colName = part.includes(':') ? part.split(':')[1].trim() : part.trim();
    if (colName === '*') continue;
    if (!validCols.includes(colName)) {
      errors.push(`Column "${colName}" does not exist on "${table}"`);
    }
  }

  return errors;
}
