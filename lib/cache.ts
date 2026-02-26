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
import { parseDishesFromMenu, parseDishesFromMenuFast } from './openai';
import { DEFAULT_LLM_MODEL, DEFAULT_CACHE_TTL_HOURS } from './types/config';
import type { AdminConfig } from './types/config';
import type { MenuWithItems } from './types/menu';
import type { DishResponse, DishParse } from './types/llm';

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
// getCachedMenu — lightweight cache-check-only helper
// =============================================================================

/**
 * Checks if a menu exists in the Supabase cache for the given URL.
 * Returns the cached MenuWithItems if found and non-expired, null on cache miss.
 *
 * Used by the eazee-link branch in route.ts to check cache BEFORE invoking
 * the translation LLM call — so translation only happens on cache miss.
 * (Placing the check inside route.ts avoids wasting translation tokens on cache hits.)
 *
 * Hit count is incremented fire-and-forget (same pattern as getOrParseMenu).
 *
 * @param url - Menu URL (used as cache key after hashing)
 * @returns MenuWithItems if cached and non-expired, null otherwise
 */
export async function getCachedMenu(url: string): Promise<MenuWithItems | null> {
  const urlHash = hashUrl(url);

  const { data: cached } = await supabase
    .from('menus')
    .select('*, menu_items(*)')
    .eq('url_hash', urlHash)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (cached !== null) {
    // Increment hit_count (fire-and-forget)
    supabaseAdmin
      .from('menus')
      .update({ hit_count: (cached.hit_count ?? 0) + 1 })
      .eq('id', cached.id)
      .then(() => {});
    return cached as MenuWithItems;
  }

  return null;
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
  preParseResult?: { dishes: DishResponse[]; source_language?: string } | { dishes: DishParse[]; source_language: string }
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
    // Cache HIT — increment hit_count (fire-and-forget, don't block response)
    supabaseAdmin
      .from('menus')
      .update({ hit_count: (cached.hit_count ?? 0) + 1 })
      .eq('id', cached.id)
      .then(() => {});

    return cached as MenuWithItems;
  }

  // Step 4: Cache MISS — use pre-parsed result or call fast LLM parse (no translations)
  const parseStart = Date.now();
  const parsed = preParseResult ?? await parseDishesFromMenuFast(rawText, config.llm_model);
  const parseTimeMs = preParseResult ? null : Date.now() - parseStart;

  // Guard: if LLM returned 0 dishes, throw instead of storing an empty menu
  if (parsed.dishes.length === 0) {
    throw new Error('No dishes found on this page. The URL may not contain a menu.');
  }

  // Detect source language from fast parse result
  const sourceLanguage = 'source_language' in parsed ? parsed.source_language : null;

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
      parse_time_ms: parseTimeMs,
      source_language: sourceLanguage,
    })
    .select('*')
    .single();

  if (menuError || !menuRow) {
    throw new Error(
      `[getOrParseMenu] Failed to insert menu into Supabase: ${menuError?.message}`
    );
  }

  // Insert menu_items rows with sort_order from array index
  // Handle both DishResponse (full translations) and DishParse (no translations) shapes
  const menuItems = parsed.dishes.map((dish, index) => {
    const base = {
      menu_id: menuRow.id,
      name_original: dish.name_original,
      description_original: dish.description_original,
      price: dish.price,
      allergens: dish.allergens,
      dietary_tags: dish.dietary_tags,
      trust_signal: dish.trust_signal,
      category: dish.category,
      subcategory: dish.subcategory,
      sort_order: index,
    };

    // If dish has translation fields (DishResponse from eazee-link or legacy), include them
    if ('name_translations' in dish) {
      return {
        ...base,
        name_translations: (dish as DishResponse).name_translations,
        description_translations: (dish as DishResponse).description_translations,
      };
    }

    // DishParse (fast parse) — empty translations, translate on-demand
    return {
      ...base,
      name_translations: {},
      description_translations: null,
    };
  });

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
