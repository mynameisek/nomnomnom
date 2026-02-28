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
// hashDishNames — SHA-256 of sorted dish names for content-aware re-scan diff
// =============================================================================

/**
 * Produces a deterministic SHA-256 hex hash from a set of dish names.
 * Names are normalized (trim, lowercase) and sorted before hashing so
 * that dish reordering does not produce a different hash.
 *
 * Used to detect whether menu content has changed between re-scans.
 * If hash matches the old menu, canonical names are recycled via canonicalCache
 * and generateCanonicalNames finds 0 rows with canonical_name IS NULL (returns early).
 *
 * @param dishes - Array of dish objects with name_original
 * @returns 64-character lowercase hex SHA-256 hash
 */
export function hashDishNames(dishes: { name_original: string }[]): string {
  const names = dishes
    .map(d => d.name_original.trim().toLowerCase())
    .sort()
    .join('|');
  return createHash('sha256').update(names).digest('hex');
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
  preParseResult?: { dishes: DishResponse[]; source_language?: string; restaurant_name?: string | null } | { dishes: DishParse[]; source_language: string; restaurant_name?: string | null }
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
    // Guard: don't serve cached menus with 0 items — treat as cache miss
    const items = (cached as MenuWithItems).menu_items ?? [];
    if (items.length === 0) {
      // Delete the empty cached entry so it doesn't block future scans
      supabaseAdmin.from('menus').delete().eq('id', cached.id).then(() => {});
    } else {
      // Cache HIT — increment hit_count (fire-and-forget, don't block response)
      supabaseAdmin
        .from('menus')
        .update({ hit_count: (cached.hit_count ?? 0) + 1 })
        .eq('id', cached.id)
        .then(() => {});

      return cached as MenuWithItems;
    }
  }

  // Step 4: Cache MISS — use pre-parsed result or call fast LLM parse (no translations)
  // Truncate rawText sent to LLM to avoid timeouts on large menus (80+ plats)
  // DB stores the full rawText — only the LLM input is truncated
  const LLM_TEXT_LIMIT = 12_000;
  let llmText = rawText;
  if (llmText.length > LLM_TEXT_LIMIT) {
    console.warn(`[getOrParseMenu] Truncating rawText from ${llmText.length} to ${LLM_TEXT_LIMIT} chars for LLM`);
    llmText = llmText.slice(0, LLM_TEXT_LIMIT);
  }
  const parseStart = Date.now();
  const parsed = preParseResult ?? await parseDishesFromMenuFast(llmText, config.llm_model);
  const parseTimeMs = preParseResult ? null : Date.now() - parseStart;

  // Guard: if LLM returned 0 dishes, throw instead of storing an empty menu
  if (parsed.dishes.length === 0) {
    throw new Error('NO_DISHES');
  }

  // Detect source language and restaurant name from fast parse result
  const sourceLanguage = 'source_language' in parsed ? parsed.source_language : null;
  const restaurantName = 'restaurant_name' in parsed ? parsed.restaurant_name : null;

  // Step 5: Compute expiry
  const expiresAt = new Date(
    Date.now() + config.cache_ttl_hours * 60 * 60 * 1000
  ).toISOString();

  // Step 5.5: Harvest translations from old items before deleting
  // On re-parse, recycle translations so lazy-translated languages aren't lost
  const { data: oldMenu } = await supabaseAdmin
    .from('menus')
    .select('id')
    .eq('url_hash', urlHash)
    .maybeSingle();

  const translationCache = new Map<string, { name_translations: Record<string, string>; description_translations: Record<string, string> | null }>();
  const canonicalCache = new Map<string, {
    canonical_name: string | null;
    canonical_confidence: number | null;
    canonical_source: string | null;
    is_beverage: boolean;
    enrichment_status: string;
  }>();

  if (oldMenu) {
    const { data: oldItems } = await supabaseAdmin
      .from('menu_items')
      .select('name_original, name_translations, description_translations, canonical_name, canonical_confidence, canonical_source, is_beverage, enrichment_status')
      .eq('menu_id', oldMenu.id);

    if (oldItems) {
      for (const old of oldItems) {
        if (old.name_original && Object.keys(old.name_translations ?? {}).length > 0) {
          translationCache.set(old.name_original, {
            name_translations: old.name_translations,
            description_translations: old.description_translations,
          });
        }
        // Recycle canonical names — if old item had a canonical name, preserve it
        if (old.name_original && old.canonical_name !== null) {
          canonicalCache.set(old.name_original, {
            canonical_name: old.canonical_name,
            canonical_confidence: old.canonical_confidence ?? null,
            canonical_source: old.canonical_source ?? null,
            is_beverage: old.is_beverage ?? false,
            enrichment_status: old.enrichment_status ?? 'pending',
          });
        }
      }
    }
  }

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
      restaurant_name: restaurantName,
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
      const recycledCanonicalForResponse = canonicalCache.get(dish.name_original);
      return {
        ...base,
        name_translations: (dish as DishResponse).name_translations,
        description_translations: (dish as DishResponse).description_translations,
        // Recycle canonical fields if available (eazee-link re-scan)
        ...(recycledCanonicalForResponse ? {
          canonical_name: recycledCanonicalForResponse.canonical_name,
          canonical_confidence: recycledCanonicalForResponse.canonical_confidence,
          canonical_source: recycledCanonicalForResponse.canonical_source,
          is_beverage: recycledCanonicalForResponse.is_beverage,
          enrichment_status: recycledCanonicalForResponse.enrichment_status,
        } : {}),
      };
    }

    // DishParse (fast parse) — recycle old translations if available, else empty
    const recycled = translationCache.get(dish.name_original);
    const recycledCanonical = canonicalCache.get(dish.name_original);
    return {
      ...base,
      name_translations: recycled?.name_translations ?? {},
      description_translations: recycled?.description_translations ?? null,
      // Recycle canonical fields if available — generateCanonicalNames will skip these
      // items since they already have canonical_name (WHERE canonical_name IS NULL query)
      ...(recycledCanonical ? {
        canonical_name: recycledCanonical.canonical_name,
        canonical_confidence: recycledCanonical.canonical_confidence,
        canonical_source: recycledCanonical.canonical_source,
        is_beverage: recycledCanonical.is_beverage,
        enrichment_status: recycledCanonical.enrichment_status,
      } : {}),
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

  // Compute dish_names_hash and store on menu row (fire-and-forget)
  // This enables content-aware re-scan diff in future phases
  const dishHash = hashDishNames(parsed.dishes);
  supabaseAdmin
    .from('menus')
    .update({ dish_names_hash: dishHash })
    .eq('id', menuRow.id)
    .then(() => {});

  // Step 7: Return full MenuWithItems
  return {
    ...menuRow,
    menu_items: insertedItems,
  } as MenuWithItems;
}
