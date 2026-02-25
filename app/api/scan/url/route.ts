// =============================================================================
// POST /api/scan/url — URL scan Route Handler
// =============================================================================
// Extracts menu content from a URL via Screenshotone (handles JS SPAs).
// Primary path: markdown text → LLM text parse → cache.
// Fallback path: PNG screenshot → Vision OCR → cache (when markdown is garbage).
// =============================================================================

import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { generateText, Output, NoObjectGeneratedError } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { dishResponseSchema } from '@/lib/types/llm';
import { getOrParseMenu, getAdminConfig } from '@/lib/cache';
import { extractMenuContent } from '@/lib/screenshotone';
import { MENU_PARSE_SYSTEM_PROMPT } from '@/lib/openai';

// Vercel Pro plan: Screenshotone + LLM pipeline can take 6–15s total
export const maxDuration = 60;

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

  // Step 3: Run scan pipeline
  try {
    const result = await extractMenuContent(url);

    if (result.type === 'text') {
      // Primary path: clean markdown → text-based LLM parse
      const menu = await getOrParseMenu(url, 'url', result.content);
      return NextResponse.json({ menuId: menu.id });
    }

    // Fallback path: screenshot image → Vision OCR
    const config = await getAdminConfig();
    const { experimental_output: output } = await generateText({
      model: openai(config.llm_model),
      output: Output.object({
        schema: z.object({ dishes: z.array(dishResponseSchema) }),
      }),
      system: MENU_PARSE_SYSTEM_PROMPT,
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
