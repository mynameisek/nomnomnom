// =============================================================================
// POST /api/scan/photo — Photo OCR Route Handler
// =============================================================================
// Uses GPT-4o Vision to extract dish data directly from a photo upload.
// Passes the vision result to getOrParseMenu as preParseResult to avoid
// a redundant LLM call (photo path: Vision OCR → cache → return menuId).
// =============================================================================

import 'server-only';
import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateText, Output, NoObjectGeneratedError } from 'ai';
import { openai } from '@ai-sdk/openai';
import { menuParseSchema } from '@/lib/types/llm';
import { getOrParseMenu, getAdminConfig } from '@/lib/cache';
import { MENU_PARSE_FAST_PROMPT } from '@/lib/openai';
import { enrichWithGooglePlaces } from '@/lib/google-places';

// Vercel Pro plan: Vision OCR can take 6–15s total
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Step 1: Parse multipart form data
  const formData = await req.formData();
  const file = formData.get('image') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'Missing image file' }, { status: 400 });
  }

  // Step 2: Read image bytes and admin config in parallel
  const [arrayBuffer, config] = await Promise.all([
    file.arrayBuffer(),
    getAdminConfig(),
  ]);

  // Step 3: Run Vision OCR pipeline
  try {
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
              image: arrayBuffer,
              mediaType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
            },
            {
              type: 'text',
              text: 'This is a photo of a restaurant menu. Extract all dishes with their names, descriptions, prices, and allergens. Process every visible dish.',
            },
          ],
        },
      ],
      maxRetries: 2,
    });

    // Step 4: Store via cache layer — pass Vision result as preParseResult
    // so getOrParseMenu skips the redundant text-based LLM call
    const photoUrl = `photo:${Date.now()}`;
    const menu = await getOrParseMenu(photoUrl, 'photo', '[photo upload]', output);
    after(() => enrichWithGooglePlaces(menu.restaurant_name, photoUrl, menu.id));

    return NextResponse.json({ menuId: menu.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message === 'NO_DISHES') {
      return NextResponse.json(
        { error: 'NO_DISHES' },
        { status: 422 }
      );
    }

    if (error instanceof NoObjectGeneratedError) {
      console.error('[POST /api/scan/photo] NoObjectGeneratedError — raw output:', error.text);
      console.error('[POST /api/scan/photo] Cause:', error.cause);
      return NextResponse.json(
        { error: 'Could not extract dishes from photo. Try a clearer image.' },
        { status: 500 }
      );
    }
    throw error;
  }
}
