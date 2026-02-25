// =============================================================================
// Service role Supabase client — server-only, bypasses RLS
// =============================================================================
// SECURITY: This file must only run server-side.
// - import 'server-only' causes a build-time error if imported in a Client Component
// - SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix — never reaches the browser
// - Service role bypasses RLS entirely — only use for trusted server writes (LLM results)
// =============================================================================

import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Service role Supabase client for server-side write operations.
 *
 * Use cases:
 * - INSERT into menus after LLM parse (Phase 5 Scan Pipeline)
 * - INSERT into menu_items after LLM parse (Phase 5 Scan Pipeline)
 * - READ/UPDATE admin_config (Phase 7 Admin Panel)
 *
 * Do NOT use for:
 * - Public cache lookups (use anon client from lib/supabase.ts — preserves Next.js fetch cache)
 * - Any client-side code (import 'server-only' guards this)
 *
 * Lazily initialized: client is created on first use to avoid module-level
 * crashes when SUPABASE_SERVICE_ROLE_KEY is not set in the build environment.
 */
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      '[supabase-admin] Missing required environment variables: ' +
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set'
    );
  }

  _supabaseAdmin = createClient(url, key, {
    auth: {
      persistSession: false,       // service role doesn't need session management
      autoRefreshToken: false,     // no session to refresh
      detectSessionInUrl: false,   // no OAuth redirects for server clients
    },
  });

  return _supabaseAdmin;
}

/**
 * Proxy object that defers client creation until first property access.
 * Drop-in replacement for the eagerly-initialized `supabaseAdmin` — all
 * existing call sites (`supabaseAdmin.from(...)`) continue to work unchanged.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAdmin();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
