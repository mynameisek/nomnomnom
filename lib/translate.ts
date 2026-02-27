// =============================================================================
// Translation Cascade — Free-tier providers first, LLM fallback
// =============================================================================
// Tries DeepL → Google → Azure → MyMemory → LLM in order.
// Each provider is optional — skipped if its env var is missing.
// On quota/rate-limit errors, falls through to the next provider.
// =============================================================================

import 'server-only';
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export interface TranslateItem {
  name: string;
  description: string | null;
}

export interface TranslatedItem {
  name: string;
  description: string | null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function translateBatch(
  items: TranslateItem[],
  sourceLang: string,
  targetLang: string,
  llmModel?: string,
): Promise<TranslatedItem[]> {
  if (items.length === 0) return [];

  // Flatten names + descriptions into a single text array for batch providers
  const { texts, nullMap } = flatten(items);

  const providers: Array<{
    name: string;
    available: boolean;
    fn: (texts: string[], src: string, tgt: string) => Promise<(string | null)[]>;
  }> = [
    {
      name: 'DeepL',
      available: !!process.env.DEEPL_API_KEY,
      fn: translateWithDeepL,
    },
    {
      name: 'Google',
      available: !!process.env.GOOGLE_TRANSLATE_API_KEY,
      fn: translateWithGoogle,
    },
    {
      name: 'Azure',
      available: !!process.env.AZURE_TRANSLATOR_KEY,
      fn: translateWithAzure,
    },
    {
      name: 'MyMemory',
      available: true, // no key required
      fn: translateWithMyMemory,
    },
  ];

  // Try each free provider in order
  for (const provider of providers) {
    if (!provider.available) continue;

    try {
      const start = Date.now();
      const results = await provider.fn(texts, sourceLang, targetLang);
      const elapsed = Date.now() - start;
      console.log(`[translate] ${provider.name}: ${items.length} items in ${elapsed}ms`);

      // Check if any items failed (null results from MyMemory)
      const failed = results.filter((r) => r === null);
      if (failed.length === 0) {
        return unflatten(results as string[], nullMap, items.length);
      }

      // Partial success — fall through to LLM for remaining items
      if (failed.length < results.length) {
        console.log(`[translate] ${provider.name}: ${failed.length}/${results.length} texts failed, falling back to LLM for those`);
        const partial = unflatten(results, nullMap, items.length);
        return await fillMissingWithLLM(items, partial, sourceLang, targetLang, llmModel);
      }

      // All failed — try next provider
      console.warn(`[translate] ${provider.name}: all texts failed, trying next provider`);
    } catch (error) {
      const status = (error as any)?.status ?? (error as any)?.response?.status;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[translate] ${provider.name} failed (status=${status}): ${message}`);
      // Continue to next provider
    }
  }

  // Final fallback: LLM
  console.log(`[translate] All free providers exhausted, using LLM`);
  return translateWithLLM(items, sourceLang, targetLang, llmModel);
}

// ---------------------------------------------------------------------------
// Text flattening helpers
// ---------------------------------------------------------------------------

function flatten(items: TranslateItem[]): { texts: string[]; nullMap: boolean[] } {
  const texts: string[] = [];
  const nullMap: boolean[] = []; // true if description slot is null (skipped)

  for (const item of items) {
    texts.push(item.name);
    if (item.description !== null && item.description !== '') {
      texts.push(item.description);
      nullMap.push(false);
    } else {
      nullMap.push(true);
    }
  }
  return { texts, nullMap };
}

function unflatten(
  results: (string | null)[],
  nullMap: boolean[],
  itemCount: number,
): TranslatedItem[] {
  const items: TranslatedItem[] = [];
  let idx = 0;

  for (let i = 0; i < itemCount; i++) {
    const name = results[idx] ?? '';
    idx++;
    let description: string | null = null;
    if (!nullMap[i]) {
      description = results[idx] ?? null;
      idx++;
    }
    items.push({ name, description });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Fill partial results with LLM
// ---------------------------------------------------------------------------

async function fillMissingWithLLM(
  original: TranslateItem[],
  partial: TranslatedItem[],
  sourceLang: string,
  targetLang: string,
  llmModel?: string,
): Promise<TranslatedItem[]> {
  const missing: { idx: number; item: TranslateItem }[] = [];
  for (let i = 0; i < partial.length; i++) {
    if (partial[i].name === '') {
      missing.push({ idx: i, item: original[i] });
    }
  }

  if (missing.length === 0) return partial;

  const llmResults = await translateWithLLM(
    missing.map((m) => m.item),
    sourceLang,
    targetLang,
    llmModel,
  );

  const result = [...partial];
  for (let i = 0; i < missing.length; i++) {
    result[missing[i].idx] = llmResults[i];
  }
  return result;
}

// ---------------------------------------------------------------------------
// Provider: DeepL Free
// ---------------------------------------------------------------------------

async function translateWithDeepL(
  texts: string[],
  sourceLang: string,
  targetLang: string,
): Promise<(string | null)[]> {
  const key = process.env.DEEPL_API_KEY!;
  const src = sourceLang.toUpperCase();
  const tgt = mapDeepLLang(targetLang);
  const results: string[] = [];

  // Batch in chunks of 50
  for (let i = 0; i < texts.length; i += 50) {
    const chunk = texts.slice(i, i + 50);
    const res = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: chunk,
        source_lang: src,
        target_lang: tgt,
      }),
    });

    if (!res.ok) {
      const err = new Error(`DeepL HTTP ${res.status}`);
      (err as any).status = res.status;
      throw err;
    }

    const data = await res.json();
    for (const t of data.translations) {
      results.push(t.text);
    }
  }

  return results;
}

function mapDeepLLang(lang: string): string {
  const map: Record<string, string> = { en: 'EN', fr: 'FR', de: 'DE', tr: 'TR' };
  return map[lang.toLowerCase()] ?? lang.toUpperCase();
}

// ---------------------------------------------------------------------------
// Provider: Google Cloud Translation v2
// ---------------------------------------------------------------------------

async function translateWithGoogle(
  texts: string[],
  sourceLang: string,
  targetLang: string,
): Promise<(string | null)[]> {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY!;
  const results: string[] = [];

  // Batch in chunks of 128
  for (let i = 0; i < texts.length; i += 128) {
    const chunk = texts.slice(i, i + 128);
    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: chunk,
          source: sourceLang.toLowerCase(),
          target: targetLang.toLowerCase(),
          format: 'text',
        }),
      },
    );

    if (!res.ok) {
      const err = new Error(`Google Translate HTTP ${res.status}`);
      (err as any).status = res.status;
      throw err;
    }

    const data = await res.json();
    for (const t of data.data.translations) {
      results.push(t.translatedText);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Provider: Azure Translator
// ---------------------------------------------------------------------------

async function translateWithAzure(
  texts: string[],
  sourceLang: string,
  targetLang: string,
): Promise<(string | null)[]> {
  const key = process.env.AZURE_TRANSLATOR_KEY!;
  const region = process.env.AZURE_TRANSLATOR_REGION ?? 'westeurope';
  const results: string[] = [];

  // Batch in chunks of 100
  for (let i = 0; i < texts.length; i += 100) {
    const chunk = texts.slice(i, i + 100);
    const res = await fetch(
      `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=${sourceLang.toLowerCase()}&to=${targetLang.toLowerCase()}`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Ocp-Apim-Subscription-Region': region,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk.map((text) => ({ Text: text }))),
      },
    );

    if (!res.ok) {
      const err = new Error(`Azure Translator HTTP ${res.status}`);
      (err as any).status = res.status;
      throw err;
    }

    const data = await res.json();
    for (const entry of data) {
      results.push(entry.translations[0].text);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Provider: MyMemory (free, no key required)
// ---------------------------------------------------------------------------

async function translateWithMyMemory(
  texts: string[],
  sourceLang: string,
  targetLang: string,
): Promise<(string | null)[]> {
  const langpair = `${sourceLang.toLowerCase()}|${targetLang.toLowerCase()}`;
  const email = 'contact@nomnomnom.app';

  const results = await Promise.allSettled(
    texts.map(async (text) => {
      // MyMemory has a 500 byte limit per query
      const truncated = text.length > 450 ? text.slice(0, 450) : text;
      const params = new URLSearchParams({
        q: truncated,
        langpair,
        de: email,
      });
      const res = await fetch(`https://api.mymemory.translated.net/get?${params}`);

      if (!res.ok) {
        const err = new Error(`MyMemory HTTP ${res.status}`);
        (err as any).status = res.status;
        throw err;
      }

      const data = await res.json();
      return data.responseData.translatedText as string;
    }),
  );

  return results.map((r) => (r.status === 'fulfilled' ? r.value : null));
}

// ---------------------------------------------------------------------------
// Provider: LLM (GPT-4o-mini fallback)
// ---------------------------------------------------------------------------

const TRANSLATE_SYSTEM_PROMPT = `You are a professional food translator. You will receive a list of dish names and descriptions from a restaurant menu. Translate each one into the specified target language.

Rules:
- Preserve the meaning and culinary terminology
- Keep proper nouns and brand names unchanged
- Return translations in the same order as the input
- If a description is null, return null for the description translation
- The "index" field must match the input index exactly`;

const translationResponseSchema = z.object({
  translations: z.array(
    z.object({
      index: z.number(),
      name: z.string(),
      description: z.string().nullable(),
    }),
  ),
});

const langNames: Record<string, string> = {
  fr: 'French', en: 'English', tr: 'Turkish', de: 'German',
};

async function translateWithLLM(
  items: TranslateItem[],
  sourceLang: string,
  targetLang: string,
  model?: string,
): Promise<TranslatedItem[]> {
  const targetLangName = langNames[targetLang] ?? targetLang;
  const dishList = items.map((item, idx) => ({
    index: idx,
    name: item.name,
    description: item.description,
  }));

  const start = Date.now();
  const { experimental_output: output } = await generateText({
    model: openai(model ?? 'gpt-4o-mini'),
    output: Output.object({ schema: translationResponseSchema }),
    maxRetries: 1,
    system: TRANSLATE_SYSTEM_PROMPT,
    prompt: `Source language: ${sourceLang}\nTarget language: ${targetLangName}\n\nDishes to translate:\n${JSON.stringify(dishList, null, 2)}`,
  });
  const elapsed = Date.now() - start;
  console.log(`[translate] LLM (${model ?? 'gpt-4o-mini'}): ${items.length} items in ${elapsed}ms`);

  // Map LLM response back to TranslatedItem[]
  const result: TranslatedItem[] = items.map(() => ({ name: '', description: null }));
  for (const t of output.translations) {
    if (t.index >= 0 && t.index < items.length) {
      result[t.index] = { name: t.name, description: t.description };
    }
  }
  return result;
}
