// =============================================================================
// Cache layer — server-only, URL hash + Supabase cache orchestrator
// =============================================================================
// SECURITY: server-only because this imports supabaseAdmin (service role client).
// Anon client used for cache reads (preserves Next.js fetch cache per v1.0 decision).
// Service role client used for cache writes (bypasses RLS on menus/menu_items).
// =============================================================================

import 'server-only';
import { createHash } from 'node:crypto';
import { supabase } from './supabase';
import { supabaseAdmin } from './supabase-admin';
import { parseDishesFromMenu } from './openai';
import { DEFAULT_LLM_MODEL, DEFAULT_CACHE_TTL_HOURS } from './types/config';
import type { AdminConfig } from './types/config';
import type { MenuWithItems } from './types/menu';
import type { DishResponse } from './types/llm';

// =============================================================================
// hashUrl — SHA-256 of normalized URL
// =============================================================================

/**
 * Produces a deterministic SHA-256 hex hash from a normalized URL.
 * Normalization: trim whitespace, lowercase, strip trailing slash.
 * Prevents cache misses from casing or trailing-slash variations.
 *
 * @param url - Raw menu URL to hash
 * @returns 64-character lowercase hex SHA-256 hash
 */
export function hashUrl(url: string): string {
  const normalized = url
    .trim()
    .toLowerCase()
    .replace(/\/$/, ''); // strip trailing slash

  return createHash('sha256').update(normalized).digest('hex');
}

// =============================================================================
// getAdminConfig — read LLM model and cache TTL from Supabase admin_config
// =============================================================================

/**
 * Reads admin configuration from Supabase.
 * Uses service role client — admin_config has no public RLS policy.
 * Falls back to defaults if query fails (DB unreachable, table empty, etc.)
 *
 * @returns AdminConfig with llm_model and cache_ttl_hours populated
 */
export async function getAdminConfig(): Promise<AdminConfig> {
  const { data, error } = await supabaseAdmin
    .from('admin_config')
    .select('*')
    .single();

  if (error || !data) {
    console.warn('[getAdminConfig] Falling back to defaults:', error?.message);
    return {
      id: true,
      llm_model: DEFAULT_LLM_MODEL,
      cache_ttl_hours: DEFAULT_CACHE_TTL_HOURS,
      updated_at: new Date().toISOString(),
    };
  }

  return data as AdminConfig;
}

// =============================================================================
// getOrParseMenu — cache-aware orchestrator (main entry point for Phase 5)
// =============================================================================

/**
 * Cache-aware menu fetch orchestrator. Called by the Phase 5 Scan Pipeline.
 *
 * Flow:
 * 1. Hash the URL (deterministic, normalized)
 * 2. Read admin config (LLM model + cache TTL)
 * 3. Check Supabase cache using anon client (preserves Next.js fetch cache)
 *    - Cache HIT: return stored MenuWithItems (no LLM call)
 *    - Cache MISS: call LLM, store result, return MenuWithItems
 *
 * @param url - Menu URL (used as cache key after hashing)
 * @param sourceType - How the menu was obtained
 * @param rawText - Raw menu text to parse on cache miss
 * @returns MenuWithItems — either from cache or freshly parsed
 */
export async function getOrParseMenu(
  url: string,
  sourceType: 'url' | 'photo' | 'qr',
  rawText: string,
  preParseResult?: { dishes: DishResponse[] }
): Promise<MenuWithItems> {
  const urlHash = hashUrl(url);

  // Step 2: Read admin config
  const config = await getAdminConfig();

  // Step 3: Cache check — use anon client to preserve Next.js fetch cache
  const { data: cached } = await supabase
    .from('menus')
    .select('*, menu_items(*)')
    .eq('url_hash', urlHash)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (cached !== null) {
    // Cache HIT — return stored result without any LLM call
    return cached as MenuWithItems;
  }

  // Step 4: Cache MISS — use pre-parsed result or call LLM
  const parsed = preParseResult ?? await parseDishesFromMenu(rawText, config.llm_model);

  // Step 5: Compute expiry
  const expiresAt = new Date(
    Date.now() + config.cache_ttl_hours * 60 * 60 * 1000
  ).toISOString();

  // Step 6: Store in Supabase via service role (bypasses RLS)
  // First, delete any expired entry for this url_hash (upsert-like pattern)
  await supabaseAdmin
    .from('menus')
    .delete()
    .eq('url_hash', urlHash);

  // Insert new menu row
  const { data: menuRow, error: menuError } = await supabaseAdmin
    .from('menus')
    .insert({
      url,
      url_hash: urlHash,
      source_type: sourceType,
      raw_text: rawText,
      expires_at: expiresAt,
    })
    .select('*')
    .single();

  if (menuError || !menuRow) {
    throw new Error(
      `[getOrParseMenu] Failed to insert menu into Supabase: ${menuError?.message}`
    );
  }

  // Insert menu_items rows with sort_order from array index
  const menuItems = parsed.dishes.map((dish, index) => ({
    menu_id: menuRow.id,
    ...dish,
    sort_order: index,
  }));

  const { data: insertedItems, error: itemsError } = await supabaseAdmin
    .from('menu_items')
    .insert(menuItems)
    .select('*');

  if (itemsError || !insertedItems) {
    throw new Error(
      `[getOrParseMenu] Failed to insert menu_items into Supabase: ${itemsError?.message}`
    );
  }

  // Step 7: Return full MenuWithItems
  return {
    ...menuRow,
    menu_items: insertedItems,
  } as MenuWithItems;
}
