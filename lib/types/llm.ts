// =============================================================================
// LLM response validation — Zod schemas for OpenAI structured output
// =============================================================================
// IMPORTANT: Uses .nullable() not .optional() for optional fields.
// OpenAI structured outputs require all properties to be present.
// .optional() causes "Invalid schema for response_format" errors.
// See: Phase 4 Research, Pitfall 6.
// =============================================================================
// Zod version: 3.25.76 (pinned — Zod v4 breaks AI SDK as of Dec 2025)
// See: Phase 4 Research, Pitfall 1.
// =============================================================================

import { z } from 'zod';

/**
 * EU 14 mandatory allergen enum — matches allergen_type PostgreSQL enum.
 * Stable list: legally defined under EU Regulation No 1169/2011.
 */
export const allergenEnum = z.enum([
  'gluten',
  'dairy',
  'nuts',
  'peanuts',
  'soy',
  'eggs',
  'fish',
  'shellfish',
  'celery',
  'mustard',
  'sesame',
  'sulphites',
  'lupin',
  'molluscs',
]);

/**
 * Translation map schema — mirrors TranslationMap type and JSONB column shape.
 * All 4 translations (FR/EN/TR/DE) returned in a single LLM call.
 */
export const translationMapSchema = z.object({
  fr: z.string(),
  en: z.string(),
  tr: z.string(),
  de: z.string(),
});

/**
 * Dish response schema — validates the LLM structured output for a single dish.
 * Shape is designed for direct storage into menu_items table (Phase 5)
 * and direct rendering in Dish Cards (Phase 6) — no transformation needed.
 *
 * Note: .nullable() used throughout (not .optional()) per OpenAI structured outputs requirement.
 */
export const dishResponseSchema = z.object({
  name_original: z.string(),
  name_translations: translationMapSchema,
  description_original: z.string().nullable(),          // null if dish has no description
  description_translations: translationMapSchema.nullable(), // null if no description
  price: z.string().nullable(),                          // e.g. "12€", null if not on menu
  allergens: z.array(allergenEnum),
  dietary_tags: z.array(z.enum(['vegetarian', 'vegan', 'halal', 'spicy'])),
  trust_signal: z.enum(['verified', 'inferred']),
  category: z.string().nullable(),       // top-level category (e.g. "Entrées", "Boissons")
  subcategory: z.string().nullable(),    // sub-category (e.g. "Bières", "Cocktails")
});

/**
 * Full menu response schema — wraps array of dishes.
 * This is the top-level schema passed to AI SDK Output.object().
 */
export const menuResponseSchema = z.object({
  dishes: z.array(dishResponseSchema),
});

// =============================================================================
// Fast parse schema — no translations, used for lazy translation flow
// =============================================================================

/**
 * Dish parse schema — fast parse without translation fields.
 * Used in the lazy translation pipeline: extract dishes first, translate on-demand.
 * Includes source_language to enable targeted translation later.
 */
export const dishParseSchema = z.object({
  name_original: z.string(),
  description_original: z.string().nullable(),
  price: z.string().nullable(),
  allergens: z.array(allergenEnum),
  dietary_tags: z.array(z.enum(['vegetarian', 'vegan', 'halal', 'spicy'])),
  trust_signal: z.enum(['verified', 'inferred']),
  category: z.string().nullable(),
  subcategory: z.string().nullable(),
});

/**
 * Fast menu parse response — includes source_language detection.
 */
export const menuParseSchema = z.object({
  source_language: z.string(),  // 2-letter code: fr, en, tr, de, etc.
  restaurant_name: z.string().nullable(), // extracted from menu header/footer/watermark, null if not visible
  dishes: z.array(dishParseSchema),
});

// =============================================================================
// Eazee-link translation schema — LLM output for translating eazee-link dishes
// =============================================================================

/**
 * Translation output schema for a single eazee-link dish.
 * Index matches the input array index so translations can be merged back.
 *
 * Note: .nullable() used throughout (not .optional()) per OpenAI structured outputs requirement.
 */
export const eazeeLinkDishTranslationSchema = z.object({
  index: z.number(),                                     // matches input array index for merge
  name_translations: translationMapSchema,               // FR/EN/TR/DE translations of name
  description_translations: translationMapSchema.nullable(), // null if no description
  cultural_context: z.string().nullable(),               // e.g. "Alsatian thin-crust pizza", null if not applicable
});

/**
 * Top-level schema for eazee-link menu translation LLM output.
 * source_language: auto-detected 2-letter ISO code from dish text.
 */
export const eazeeLinkMenuTranslationSchema = z.object({
  source_language: z.string(), // 2-letter ISO code, auto-detected from dish text
  dishes: z.array(eazeeLinkDishTranslationSchema),
});

// =============================================================================
// Canonical name batch schema — LLM output for batch canonical name generation
// =============================================================================

/**
 * Schema for a single dish's canonical name result from the batch LLM call.
 * Index matches the input array position for merging results back.
 */
export const canonicalDishResultSchema = z.object({
  index: z.number(),
  canonical_name: z.string().nullable(),    // null if LLM cannot determine
  confidence: z.number(),                    // 0.0–1.0
  is_beverage: z.boolean(),
});

/**
 * Top-level batch schema — wraps array of canonical results.
 * Passed to AI SDK Output.object() in generateCanonicalNames.
 */
export const canonicalBatchSchema = z.object({
  dishes: z.array(canonicalDishResultSchema),
});

/**
 * Inferred TypeScript types from Zod schemas.
 * Use these types throughout the app — they are guaranteed to match the Zod schema.
 */
export type DishResponse = z.infer<typeof dishResponseSchema>;
export type MenuResponse = z.infer<typeof menuResponseSchema>;
export type DishParse = z.infer<typeof dishParseSchema>;
export type MenuParse = z.infer<typeof menuParseSchema>;
export type EazeeLinkDishTranslation = z.infer<typeof eazeeLinkDishTranslationSchema>;
export type EazeeLinkMenuTranslation = z.infer<typeof eazeeLinkMenuTranslationSchema>;
export type CanonicalDishResult = z.infer<typeof canonicalDishResultSchema>;
export type CanonicalBatchResult = z.infer<typeof canonicalBatchSchema>;
