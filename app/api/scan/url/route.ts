// =============================================================================
// POST /api/scan/url — URL scan Route Handler
// =============================================================================
// Strategy:
// 1. Known providers (eazee-link.com) → direct API call, no screenshot/LLM
// 2. Other URLs → Screenshotone markdown extraction → LLM parse
// 3. Fallback → Screenshotone PNG screenshot → Vision OCR
// =============================================================================

import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { generateText, Output, NoObjectGeneratedError } from 'ai';
import { openai } from '@ai-sdk/openai';
import { menuParseSchema } from '@/lib/types/llm';
import { getOrParseMenu, getAdminConfig, getCachedMenu } from '@/lib/cache';
import { extractMenuContent } from '@/lib/screenshotone';
import { MENU_PARSE_FAST_PROMPT, translateEazeeLinkDishes } from '@/lib/openai';
import { getEazeeLinkStickerId, fetchEazeeLinkMenu } from '@/lib/menu-providers/eazee-link';

// Vercel Pro plan: pipeline can take 6–15s total
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  // Step 1: Parse and validate request body
  let url: unknown;
  try {
    const body = await req.json();
    url = body?.url;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!url || typeof url !== 'string') {
    return NextResponse.json(
      { error: 'Missing or invalid url' },
      { status: 400 }
    );
  }

  // Step 2: Validate URL format
  try {
    new URL(url);
  } catch {
    return NextResponse.json(
      { error: 'Invalid URL format' },
      { status: 400 }
    );
  }

  try {
    // ─── Path A: Known provider (eazee-link.com) ───
    const eazeeStickerId = getEazeeLinkStickerId(url);
    if (eazeeStickerId) {
      // Normalize URL so all eazee-link variants (/?id=X, /menu?id=X, &o=q order)
      // produce the same cache key
      const canonicalUrl = `https://menu.eazee-link.com/?id=${eazeeStickerId}`;

      // Step 1: Check cache BEFORE translation — avoid LLM cost on cache hits
      const cachedMenu = await getCachedMenu(canonicalUrl);
      if (cachedMenu) {
        return NextResponse.json({ menuId: cachedMenu.id });
      }

      // Step 2: Cache MISS — fetch raw dishes from eazee-link API
      const { dishes, rawText } = await fetchEazeeLinkMenu(eazeeStickerId);

      // Step 3: Translate dishes with LLM (single batched call for all 4 languages)
      // Falls back to untranslated dishes on LLM failure — user still gets a menu
      const config = await getAdminConfig();
      let preParseResult: { dishes: typeof dishes; source_language?: string } = { dishes };

      try {
        const { translatedDishes, sourceLanguage } = await translateEazeeLinkDishes(dishes, config.llm_model);
        preParseResult = { dishes: translatedDishes, source_language: sourceLanguage };
      } catch (translateError) {
        console.error('[POST /api/scan/url] eazee-link translation failed, falling back to untranslated dishes:', translateError);
        // preParseResult stays as { dishes } — untranslated fallback (acceptable per CONTEXT.md)
      }

      // Step 4: Store in cache and return
      const menu = await getOrParseMenu(canonicalUrl, 'url', rawText, preParseResult);
      return NextResponse.json({ menuId: menu.id });
    }

    // ─── Path B: Generic URL → Screenshotone extraction ───
    const result = await extractMenuContent(url);

    if (result.type === 'text') {
      // Clean markdown → text-based LLM parse
      const menu = await getOrParseMenu(url, 'url', result.content);
      return NextResponse.json({ menuId: menu.id });
    }

    // ─── Path C: Fallback → screenshot + Vision OCR (fast parse, no translations) ───
    const config = await getAdminConfig();
    const { experimental_output: output } = await generateText({
      model: openai(config.llm_model),
      output: Output.object({
        schema: menuParseSchema,
      }),
      system: MENU_PARSE_FAST_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: result.buffer,
              mediaType: 'image/png',
            },
            {
              type: 'text',
              text: 'This is a screenshot of a restaurant menu webpage. Extract all dishes with their names, descriptions, prices, and allergens. Process every visible dish.',
            },
          ],
        },
      ],
      maxRetries: 2,
    });

    const menu = await getOrParseMenu(url, 'url', '[screenshot fallback]', output);
    return NextResponse.json({ menuId: menu.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[POST /api/scan/url] Pipeline error:', message);

    if (message === 'NO_DISHES') {
      return NextResponse.json(
        { error: 'NO_DISHES' },
        { status: 422 }
      );
    }

    if (error instanceof NoObjectGeneratedError) {
      return NextResponse.json(
        { error: 'Could not extract dishes from this URL. The menu may not be readable.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to parse menu. Please try again.' },
      { status: 500 }
    );
  }
}
