// =============================================================================
// POST /api/scan/url — URL scan Route Handler
// =============================================================================
// Strategy:
// 1. Known providers (eazee-link.com) → direct API call, no screenshot/LLM
// 2. Other URLs → Screenshotone markdown extraction → LLM parse
// 2b. PDF URLs → download raw bytes → LLM file input
// 3. Fallback → Screenshotone PNG screenshot → Vision OCR
// =============================================================================

import 'server-only';
import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateText, Output, NoObjectGeneratedError } from 'ai';
import { openai } from '@ai-sdk/openai';
import { menuParseSchema } from '@/lib/types/llm';
import { getOrParseMenu, getAdminConfig, getCachedMenu } from '@/lib/cache';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { extractMenuContent } from '@/lib/screenshotone';
import { MENU_PARSE_FAST_PROMPT } from '@/lib/openai';
import { getEazeeLinkStickerId, fetchEazeeLinkMenu, fetchEazeeLinkPlaceData } from '@/lib/menu-providers/eazee-link';
import { enrichWithGooglePlaces } from '@/lib/google-places';

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
        // Backfill restaurant_name + Places data for menus created before this feature
        if (!cachedMenu.restaurant_name || !cachedMenu.google_place_id) {
          const placeData = await fetchEazeeLinkPlaceData(eazeeStickerId);
          const name = cachedMenu.restaurant_name ?? placeData?.name ?? null;
          const hint = placeData?.placeSearchHint ?? null;
          after(async () => {
            if (name && !cachedMenu.restaurant_name) {
              await supabaseAdmin.from('menus').update({ restaurant_name: name }).eq('id', cachedMenu.id);
            }
            if (!cachedMenu.google_place_id) {
              await enrichWithGooglePlaces(name, canonicalUrl, cachedMenu.id, hint);
            }
          });
        }
        return NextResponse.json({ menuId: cachedMenu.id });
      }

      // Step 2: Cache MISS — fetch structured dishes from eazee-link API
      // No LLM call needed — translations happen lazily per language on demand
      const { dishes, rawText, sourceLanguage, restaurantName, placeSearchHint } = await fetchEazeeLinkMenu(eazeeStickerId);

      // Step 3: Store in cache and return (no upfront translation — lazy translate handles it)
      const menu = await getOrParseMenu(canonicalUrl, 'url', rawText, { dishes, source_language: sourceLanguage, restaurant_name: restaurantName });
      after(() => enrichWithGooglePlaces(menu.restaurant_name, canonicalUrl, menu.id, placeSearchHint));
      return NextResponse.json({ menuId: menu.id });
    }

    // ─── Path B: Generic URL → Screenshotone extraction ───
    const result = await extractMenuContent(url);

    if (result.type === 'text') {
      // Clean markdown → text-based LLM parse
      const menu = await getOrParseMenu(url, 'url', result.content);
      after(() => enrichWithGooglePlaces(menu.restaurant_name, url, menu.id));
      return NextResponse.json({ menuId: menu.id });
    }

    // ─── Path B2: PDF → send raw bytes to LLM via file content part ───
    if (result.type === 'pdf') {
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
                type: 'file',
                data: result.buffer,
                mediaType: 'application/pdf',
              },
              {
                type: 'text',
                text: 'This is a restaurant menu PDF. Extract all dishes with their names, descriptions, prices, and allergens. Process every visible dish.',
              },
            ],
          },
        ],
        maxRetries: 2,
      });

      const menu = await getOrParseMenu(url, 'url', '[pdf menu]', output);
      after(() => enrichWithGooglePlaces(menu.restaurant_name, url, menu.id));
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
    after(() => enrichWithGooglePlaces(menu.restaurant_name, url, menu.id));
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
