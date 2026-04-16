import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Module-level singleton — one connection pool per server process.
// Previously getSupabaseAdmin() created a fresh client on every call,
// blowing through connection slots under concurrent requests.
let _adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_adminClient) return _adminClient;
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !serviceRole) {
    throw new Error('supabase_not_configured');
  }
  _adminClient = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
      },
    },
  });
  return _adminClient;
}
