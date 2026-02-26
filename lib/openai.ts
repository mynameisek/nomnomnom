// =============================================================================
// OpenAI wrapper — server-only, AI SDK 6 pattern
// =============================================================================
// Uses generateText + Output.object() — NOT generateObject (deprecated in AI SDK 6)
// Zod schema validated by AI SDK against dishResponseSchema.
// See: Phase 4 Research, Pitfall 1 (Zod v3 required), Pitfall 5 (generateObject deprecated)
// =============================================================================

import 'server-only';
import { generateText, Output, NoObjectGeneratedError } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { dishResponseSchema, dishParseSchema, menuParseSchema, eazeeLinkMenuTranslationSchema } from './types/llm';
import type { DishResponse, MenuParse } from './types/llm';
import { DEFAULT_LLM_MODEL } from './types/config';

// =============================================================================
// System prompt — detailed instructions for multilingual menu parsing
// =============================================================================

export const MENU_PARSE_SYSTEM_PROMPT = `You are a professional menu parser and food information specialist. Your task is to extract structured information from raw restaurant menu text.

For each dish found in the menu text, you must:

1. NAME: Provide the original dish name exactly as it appears on the menu (preserve original language, spelling, capitalization).

2. TRANSLATIONS: Translate the dish name and description into all four target languages:
   - fr: French
   - en: English
   - tr: Turkish
   - de: German
   If the source text is already in one of these languages, copy it for that language and translate for the others.

3. DESCRIPTION: Extract or generate a brief description of the dish.
   - description_original: The description as it appears on the menu, or null if no description is given.
   - description_translations: Translations of the description into FR/EN/TR/DE, or null if there is no description.

4. PRICE: Extract the price exactly as written on the menu (e.g. "12€", "€12.50", "8,50 €"), or null if no price is visible.

5. ALLERGENS: List only the EU 14 mandatory allergens you can identify with high confidence from the dish name and description.
   Only include: gluten, dairy, nuts, peanuts, soy, eggs, fish, shellfish, celery, mustard, sesame, sulphites, lupin, molluscs.
   Do NOT guess — only include allergens you are highly confident about.

6. DIETARY TAGS: Tag with dietary categories when indicated by the dish name, description, or ingredients:
   - vegetarian: no meat or fish (dairy and eggs allowed). Tag if the dish name contains "végétarien", "vegetarian", "veggie", or if ingredients clearly contain no meat/fish.
   - vegan: no animal products at all. Tag if the dish name contains "végan", "vegan", or if ingredients clearly contain no animal products.
   - halal: prepared according to Islamic dietary law. Tag only if explicitly stated.
   - spicy: the dish is notably spicy or contains hot peppers/chili. Tag if the name or description mentions spicy, piquant, épicé, or chili.
   Be proactive: if a dish name or description clearly signals a dietary category, tag it. Only leave empty when genuinely uncertain.

7. TRUST SIGNAL: Set the trust_signal field:
   - "verified": information is directly stated in the menu text
   - "inferred": information was inferred or derived by you (e.g. allergens deduced from ingredients, translations)

8. CATEGORY: If the menu is organized into sections (e.g. "Entrées", "Plats", "Desserts", "Boissons"), set the category field to the section name. If there are sub-sections (e.g. "Bières" under "Boissons"), set subcategory. If the menu has no clear sections, set both to null.

Parse every dish you can identify in the menu. Do not omit dishes. If the menu has sections (starters, mains, desserts), process all of them.`;

// =============================================================================
// parseDishesFromMenu — main export
// =============================================================================

/**
 * Parses raw menu text into structured dish data using OpenAI via AI SDK 6.
 *
 * @param menuText - Raw menu text extracted from URL, photo, or QR scan
 * @param model - LLM model override (defaults to DEFAULT_LLM_MODEL from admin_config)
 * @returns Zod-validated { dishes: DishResponse[] } object
 * @throws Error if LLM fails to produce structured output
 */
export async function parseDishesFromMenu(
  menuText: string,
  model?: string
): Promise<{ dishes: DishResponse[] }> {
  const selectedModel = model ?? DEFAULT_LLM_MODEL;

  try {
    const { experimental_output: output } = await generateText({
      model: openai(selectedModel),
      output: Output.object({
        schema: z.object({ dishes: z.array(dishResponseSchema) }),
      }),
      maxRetries: 2,
      system: MENU_PARSE_SYSTEM_PROMPT,
      prompt: menuText,
    });

    return output;
  } catch (error) {
    if (error instanceof NoObjectGeneratedError) {
      console.error('[parseDishesFromMenu] NoObjectGeneratedError — raw LLM output:', error.text);
      console.error('[parseDishesFromMenu] Cause:', error.cause);
      throw new Error(
        `OpenAI failed to produce structured dish data. Model: ${selectedModel}. ` +
        `Raw output length: ${error.text?.length ?? 0} chars. ` +
        `Cause: ${String(error.cause)}`
      );
    }
    throw error;
  }
}

// =============================================================================
// Fast parse system prompt — no translations, with source language detection
// =============================================================================

export const MENU_PARSE_FAST_PROMPT = `You are a professional menu parser and food information specialist. Your task is to extract structured information from raw restaurant menu text.

IMPORTANT: Do NOT translate anything. Return all text in its original language as it appears on the menu.

First, detect the primary language of the menu and return it as a 2-letter ISO code (e.g. "fr", "en", "tr", "de", "it", "es", "ar").

For each dish found in the menu text, you must:

1. NAME: Provide the original dish name exactly as it appears on the menu (preserve original language, spelling, capitalization).

2. DESCRIPTION: Extract the description as it appears on the menu, or null if no description is given.

3. PRICE: Extract the price exactly as written on the menu (e.g. "12€", "€12.50", "8,50 €"), or null if no price is visible.

4. ALLERGENS: List only the EU 14 mandatory allergens you can identify with high confidence from the dish name and description.
   Only include: gluten, dairy, nuts, peanuts, soy, eggs, fish, shellfish, celery, mustard, sesame, sulphites, lupin, molluscs.
   Do NOT guess — only include allergens you are highly confident about.

5. DIETARY TAGS: Tag with dietary categories when indicated by the dish name, description, or ingredients:
   - vegetarian: no meat or fish (dairy and eggs allowed)
   - vegan: no animal products at all
   - halal: only if explicitly stated
   - spicy: the dish is notably spicy or contains hot peppers/chili
   Be proactive: if a dish name or description clearly signals a dietary category, tag it.

6. TRUST SIGNAL: Set the trust_signal field:
   - "verified": information is directly stated in the menu text
   - "inferred": information was inferred or derived by you

7. CATEGORY: If the menu is organized into sections, set the category field. If there are sub-sections, set subcategory. If no clear sections, set both to null.

Parse every dish you can identify in the menu. Do not omit dishes.`;

// =============================================================================
// parseDishesFromMenuFast — fast parse without translations
// =============================================================================

/**
 * Fast-parses raw menu text into structured dish data WITHOUT translations.
 * Returns dishes with original text only + detected source language.
 * Translations happen lazily via /api/translate when a user needs them.
 *
 * @param menuText - Raw menu text extracted from URL, photo, or QR scan
 * @param model - LLM model override
 * @returns { source_language, dishes } — no translations included
 */
export async function parseDishesFromMenuFast(
  menuText: string,
  model?: string
): Promise<MenuParse> {
  const selectedModel = model ?? DEFAULT_LLM_MODEL;

  try {
    const { experimental_output: output } = await generateText({
      model: openai(selectedModel),
      output: Output.object({
        schema: menuParseSchema,
      }),
      maxRetries: 2,
      system: MENU_PARSE_FAST_PROMPT,
      prompt: menuText,
    });

    return output;
  } catch (error) {
    if (error instanceof NoObjectGeneratedError) {
      console.error('[parseDishesFromMenuFast] NoObjectGeneratedError — raw LLM output:', error.text);
      throw new Error(
        `OpenAI failed to produce structured dish data (fast parse). Model: ${selectedModel}. ` +
        `Raw output length: ${error.text?.length ?? 0} chars. ` +
        `Cause: ${String(error.cause)}`
      );
    }
    throw error;
  }
}

// =============================================================================
// Eazee-link translation — system prompt and translateEazeeLinkDishes function
// =============================================================================

export const EAZEE_TRANSLATE_SYSTEM_PROMPT = `You are a professional culinary translator specializing in restaurant menus.

Your task is to translate a list of dishes into 4 languages simultaneously and detect the source language.

Rules:
1. AUTO-DETECT the source language from the dish names and descriptions. Return a 2-letter ISO code (fr, en, tr, de, nl, ar, etc.). Do NOT hardcode French — menus may be in any language.
2. TRANSLATE each dish name into FR (French), EN (English), TR (Turkish), and DE (German). If the source language matches a target, copy the original for that language.
3. TRANSLATE each dish description into FR, EN, TR, DE. If there is no description, return null for description_translations.
4. CULTURAL CONTEXT: Add a brief English note (cultural_context) when the dish has notable cultural or regional origin (e.g. "Alsatian thin-crust pizza", "Provençal fish stew", "Traditional Breton buckwheat crepe"). Be concise — 3–8 words. Return null if no useful context exists.
5. Do NOT re-extract allergens, prices, or dietary tags — those are already correct and must not be changed.
6. Preserve proper nouns (restaurant names, brand names, place names) in translations.
7. Keep the "index" field matching the input index exactly. Do not reorder dishes.
8. Be concise to minimize token usage. Avoid verbose translations.

Input format: JSON array of { index, name, description } objects.
Output format: JSON with { source_language, dishes[] } matching the schema.`;

// =============================================================================
// translateEazeeLinkDishes — batch translate eazee-link dishes with cultural context
// =============================================================================

/**
 * Translates eazee-link dishes into FR/EN/TR/DE simultaneously using a single batched LLM call.
 * Also auto-detects the source language and adds cultural context notes.
 *
 * @param dishes - DishResponse[] from fetchEazeeLinkMenu (with identity-copy translations)
 * @param model - LLM model override (defaults to DEFAULT_LLM_MODEL)
 * @returns { translatedDishes: DishResponse[], sourceLanguage: string }
 * @throws Error if LLM fails to produce structured output (caller handles fallback)
 */
export async function translateEazeeLinkDishes(
  dishes: DishResponse[],
  model?: string
): Promise<{ translatedDishes: DishResponse[]; sourceLanguage: string }> {
  const selectedModel = model ?? DEFAULT_LLM_MODEL;

  // Build minimal input: only name + description needed for translation
  const dishList = dishes.map((dish, idx) => ({
    index: idx,
    name: dish.name_original,
    description: dish.description_original,
  }));

  try {
    const { experimental_output: output } = await generateText({
      model: openai(selectedModel),
      output: Output.object({
        schema: eazeeLinkMenuTranslationSchema,
      }),
      maxRetries: 2,
      system: EAZEE_TRANSLATE_SYSTEM_PROMPT,
      prompt: JSON.stringify(dishList, null, 2),
    });

    // Merge translations back into DishResponse array
    const translatedDishes = dishes.map((dish, idx) => {
      const t = output.dishes.find((d) => d.index === idx);

      // Pitfall 3: partial output — fallback to original (untranslated) dish if index missing
      if (!t) return dish;

      // Compute description_translations: merge cultural context if applicable
      let descTranslations = t.description_translations;

      if (t.cultural_context) {
        if (!dish.description_original) {
          // No original description: use cultural context as description in all 4 languages
          // Cultural context is in English — use it for EN; for other langs, use LLM translations if available
          descTranslations = t.description_translations ?? {
            fr: t.cultural_context,
            en: t.cultural_context,
            tr: t.cultural_context,
            de: t.cultural_context,
          };
        } else if (t.description_translations) {
          // Has description: append cultural context as parenthetical suffix to each language
          descTranslations = {
            fr: `${t.description_translations.fr} (${t.cultural_context})`,
            en: `${t.description_translations.en} (${t.cultural_context})`,
            tr: `${t.description_translations.tr} (${t.cultural_context})`,
            de: `${t.description_translations.de} (${t.cultural_context})`,
          };
        }
      }

      return {
        ...dish,
        name_translations: t.name_translations,
        description_translations: descTranslations,
      };
    });

    return { translatedDishes, sourceLanguage: output.source_language };
  } catch (error) {
    if (error instanceof NoObjectGeneratedError) {
      console.error('[translateEazeeLinkDishes] NoObjectGeneratedError — raw LLM output:', error.text);
      console.error('[translateEazeeLinkDishes] Cause:', error.cause);
      throw new Error(
        `OpenAI failed to produce translation output. Model: ${selectedModel}. ` +
        `Raw output length: ${error.text?.length ?? 0} chars. ` +
        `Cause: ${String(error.cause)}`
      );
    }
    throw error;
  }
}
