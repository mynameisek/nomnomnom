// =============================================================================
// Admin configuration types — mirrors admin_config table (single-row pattern)
// =============================================================================

/**
 * AdminConfig — mirrors the admin_config table in Supabase.
 * Single-row table enforced by: id boolean PRIMARY KEY DEFAULT true CHECK (id = true)
 * Readable/writable only via service role client (RLS: no public policies).
 */
export interface AdminConfig {
  id: true;               // always true (single-row enforcement)
  llm_model: string;      // e.g. 'gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'
  cache_ttl_hours: number; // cache TTL in hours — default 168 (7 days)
  updated_at: string;     // timestamptz as ISO string
}

/**
 * Default LLM model — matches llm_model column default in admin_config.
 * Use as fallback when admin_config cannot be fetched.
 */
export const DEFAULT_LLM_MODEL = 'gpt-4o-mini';

/**
 * Default cache TTL in hours — matches cache_ttl_hours column default in admin_config.
 * 168 hours = 7 days. Restaurant menus change infrequently.
 * Use as fallback when admin_config cannot be fetched.
 */
export const DEFAULT_CACHE_TTL_HOURS = 168;
