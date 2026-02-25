// =============================================================================
// Service role Supabase client — server-only, bypasses RLS
// =============================================================================
// SECURITY: This file must only run server-side.
// - import 'server-only' causes a build-time error if imported in a Client Component
// - SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix — never reaches the browser
// - Service role bypasses RLS entirely — only use for trusted server writes (LLM results)
// =============================================================================

import 'server-only';
import { createClient } from '@supabase/supabase-js';

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
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,    // shared with anon client — safe to be public
  process.env.SUPABASE_SERVICE_ROLE_KEY!,   // NO NEXT_PUBLIC_ prefix — server-only secret
  {
    auth: {
      persistSession: false,       // service role doesn't need session management
      autoRefreshToken: false,     // no session to refresh
      detectSessionInUrl: false,   // no OAuth redirects for server clients
    },
  }
);
