// =============================================================================
// POST /api/translate — Lazy translation endpoint
// =============================================================================
// Translates menu items into a single target language on-demand.
// Called from MenuShell when user's language isn't available in translations.
// Batches all untranslated items into a single LLM call for efficiency.
// =============================================================================

import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { generateText, Output, NoObjectGeneratedError } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminConfig } from '@/lib/cache';

export const maxDuration = 60;

/** Schema for the LLM translation response */
const translationResponseSchema = z.object({
  translations: z.array(
    z.object({
      index: z.number(),
      name: z.string(),
      description: z.string().nullable(),
    })
  ),
});

const TRANSLATE_SYSTEM_PROMPT = `You are a professional food translator. You will receive a list of dish names and descriptions from a restaurant menu. Translate each one into the specified target language.

Rules:
- Preserve the meaning and culinary terminology
- Keep proper nouns and brand names unchanged
- Return translations in the same order as the input
- If a description is null, return null for the description translation
- The "index" field must match the input index exactly`;

export async function POST(req: NextRequest) {
  let menuId: unknown;
  let lang: unknown;

  try {
    const body = await req.json();
    menuId = body?.menuId;
    lang = body?.lang;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!menuId || typeof menuId !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid menuId' }, { status: 400 });
  }
  if (!lang || typeof lang !== 'string' || !['fr', 'en', 'tr', 'de'].includes(lang)) {
    return NextResponse.json({ error: 'Missing or invalid lang (fr/en/tr/de)' }, { status: 400 });
  }

  try {
    // Step 1: Fetch menu and its items
    const { data: menu, error: menuError } = await supabaseAdmin
      .from('menus')
      .select('source_language')
      .eq('id', menuId)
      .single();

    if (menuError || !menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('menu_items')
      .select('id, name_original, name_translations, description_original, description_translations, sort_order')
      .eq('menu_id', menuId)
      .order('sort_order', { ascending: true });

    if (itemsError || !items) {
      return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 });
    }

    // Step 2: Filter items that need translation for this lang
    const needsTranslation = items.filter((item) => {
      const nameTranslations = (item.name_translations ?? {}) as Record<string, string>;
      return !nameTranslations[lang as string];
    });

    if (needsTranslation.length === 0) {
      // All items already have this translation — return current items
      return NextResponse.json({ items, alreadyTranslated: true });
    }

    // Step 3: Build prompt for batch translation
    const sourceLang = menu.source_language ?? 'unknown';
    const langNames: Record<string, string> = {
      fr: 'French', en: 'English', tr: 'Turkish', de: 'German',
    };
    const targetLangName = langNames[lang as string] ?? lang;

    const dishList = needsTranslation.map((item, idx) => ({
      index: idx,
      name: item.name_original,
      description: item.description_original,
    }));

    const config = await getAdminConfig();

    const { experimental_output: output } = await generateText({
      model: openai(config.llm_model),
      output: Output.object({ schema: translationResponseSchema }),
      maxRetries: 2,
      system: TRANSLATE_SYSTEM_PROMPT,
      prompt: `Source language: ${sourceLang}\nTarget language: ${targetLangName}\n\nDishes to translate:\n${JSON.stringify(dishList, null, 2)}`,
    });

    // Step 4: Update each item with the new translation (merge into existing JSONB)
    const updatePromises = output.translations.map(async (translation) => {
      const item = needsTranslation[translation.index];
      if (!item) return;

      const existingNameTranslations = (item.name_translations ?? {}) as Record<string, string>;
      const existingDescTranslations = (item.description_translations ?? {}) as Record<string, string | null>;

      const updatedNameTranslations = {
        ...existingNameTranslations,
        [lang as string]: translation.name,
      };

      const updatedDescTranslations = translation.description !== null
        ? { ...existingDescTranslations, [lang as string]: translation.description }
        : Object.keys(existingDescTranslations).length > 0
          ? existingDescTranslations
          : null;

      return supabaseAdmin
        .from('menu_items')
        .update({
          name_translations: updatedNameTranslations,
          description_translations: updatedDescTranslations,
        })
        .eq('id', item.id);
    });

    await Promise.all(updatePromises);

    // Step 5: Fetch updated items to return
    const { data: updatedItems } = await supabaseAdmin
      .from('menu_items')
      .select('*')
      .eq('menu_id', menuId)
      .order('sort_order', { ascending: true });

    return NextResponse.json({ items: updatedItems });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[POST /api/translate] Error:', message);

    if (error instanceof NoObjectGeneratedError) {
      return NextResponse.json(
        { error: 'Translation failed. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Translation failed. Please try again.' },
      { status: 500 }
    );
  }
}
