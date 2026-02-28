// =============================================================================
// POST /api/translate — Lazy translation endpoint
// =============================================================================
// Translates menu items into a single target language on-demand.
// Called from MenuShell when user's language isn't available in translations.
// Uses free translation providers first (DeepL → Google → Azure → MyMemory),
// falling back to LLM only when all free tiers are exhausted.
// =============================================================================

import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminConfig } from '@/lib/cache';
import { translateBatch } from '@/lib/translate';

export const maxDuration = 60;

/** Translate unique category/subcategory labels for a given lang, persist to DB */
async function translateCategories(
  items: Array<{ category: string | null; subcategory: string | null }>,
  menu: { category_translations: unknown },
  menuId: string,
  lang: string,
  sourceLang: string,
  llmModel: string,
): Promise<Record<string, string>> {
  const existingCatTranslations = (menu.category_translations ?? {}) as Record<string, Record<string, string>>;
  const existingForLang = existingCatTranslations[lang] ?? {};

  const uniqueLabels = new Set<string>();
  for (const item of items) {
    if (item.category) uniqueLabels.add(item.category);
    if (item.subcategory) uniqueLabels.add(item.subcategory);
  }
  const labelsToTranslate = [...uniqueLabels].filter((l) => !existingForLang[l]);

  if (labelsToTranslate.length === 0) return existingForLang;

  const translatedLabels = await translateBatch(
    labelsToTranslate.map((label) => ({ name: label, description: null })),
    sourceLang,
    lang,
    llmModel,
  );

  const newMap: Record<string, string> = { ...existingForLang };
  for (let i = 0; i < labelsToTranslate.length; i++) {
    newMap[labelsToTranslate[i]] = translatedLabels[i].name;
  }

  await supabaseAdmin
    .from('menus')
    .update({
      category_translations: { ...existingCatTranslations, [lang]: newMap },
    })
    .eq('id', menuId);

  return newMap;
}

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
      .select('source_language, category_translations')
      .eq('id', menuId)
      .single();

    if (menuError || !menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('menu_items')
      .select('id, name_original, name_translations, description_original, description_translations, category, subcategory, sort_order')
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

    // Step 3: Translate via provider cascade (free APIs → LLM fallback)
    const sourceLang = menu.source_language ?? 'unknown';
    const config = await getAdminConfig();

    if (needsTranslation.length === 0) {
      // All items already have this translation — but categories may still need it
      const catResult = await translateCategories(items, menu, menuId as string, lang as string, sourceLang, config.llm_model);
      // Fetch full items (the query above only selected specific columns)
      const { data: fullItems } = await supabaseAdmin
        .from('menu_items')
        .select('*')
        .eq('menu_id', menuId)
        .order('sort_order', { ascending: true });
      return NextResponse.json({ items: fullItems ?? items, alreadyTranslated: true, categoryTranslations: catResult });
    }

    const translated = await translateBatch(
      needsTranslation.map((item) => ({
        name: item.name_original,
        description: item.description_original,
      })),
      sourceLang,
      lang as string,
      config.llm_model,
    );

    // Step 4: Update each item with the new translation (merge into existing JSONB)
    const updatePromises = translated.map(async (translation, idx) => {
      const item = needsTranslation[idx];
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

    // Step 4b: Translate unique category/subcategory labels
    const categoryTranslations = await translateCategories(items, menu, menuId as string, lang as string, sourceLang, config.llm_model);

    // Step 5: Fetch updated items to return
    const { data: updatedItems } = await supabaseAdmin
      .from('menu_items')
      .select('*')
      .eq('menu_id', menuId)
      .order('sort_order', { ascending: true });

    return NextResponse.json({ items: updatedItems, categoryTranslations });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[POST /api/translate] Error:', message);

    return NextResponse.json(
      { error: 'Translation failed. Please try again.' },
      { status: 500 },
    );
  }
}
