import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getEnvironment } from '@/app/config/env';

let client: SupabaseClient | undefined;

/**
 * Returns one lazily initialized browser client.
 *
 * Domain services should import this adapter.
 * Visual components should not make database queries.
 *
 * Add generated Supabase Database types when the schema exists.
 */
export function getSupabase(): SupabaseClient {
  if (!client) {
    const env = getEnvironment();

    client = createClient(
      env.supabaseUrl,
      env.supabasePublicKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
        },
      },
    );
  }

  return client;
}
