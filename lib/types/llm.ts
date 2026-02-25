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
  dietary_tags: z.array(z.enum(['vegetarian', 'vegan', 'halal'])),
  trust_signal: z.enum(['verified', 'inferred']),
});

/**
 * Full menu response schema — wraps array of dishes.
 * This is the top-level schema passed to AI SDK Output.object().
 */
export const menuResponseSchema = z.object({
  dishes: z.array(dishResponseSchema),
});

/**
 * Inferred TypeScript types from Zod schemas.
 * Use these types throughout the app — they are guaranteed to match the Zod schema.
 */
export type DishResponse = z.infer<typeof dishResponseSchema>;
export type MenuResponse = z.infer<typeof menuResponseSchema>;
