import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !serviceRole) {
    throw new Error('supabase_not_configured');
  }

  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`
      }
    }
  });
}
