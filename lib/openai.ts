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
import { dishResponseSchema } from './types/llm';
import type { DishResponse } from './types/llm';
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

6. DIETARY TAGS: Tag with dietary categories only when clearly indicated:
   - vegetarian: no meat or fish (dairy and eggs allowed)
   - vegan: no animal products at all
   - halal: prepared according to Islamic dietary law
   - spicy: the dish is notably spicy or contains hot peppers/chili
   Do NOT tag unless you are confident. Leave the array empty if unsure.

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
