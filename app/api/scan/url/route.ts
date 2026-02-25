// =============================================================================
// POST /api/scan/url — URL scan Route Handler
// =============================================================================
// Extracts menu text from a URL via Screenshotone (handles JS SPAs),
// then stores and returns the parsed menu via the cache layer.
// =============================================================================

import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getOrParseMenu } from '@/lib/cache';
import { extractMenuText } from '@/lib/screenshotone';

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
    const menuText = await extractMenuText(url);
    const menu = await getOrParseMenu(url, 'url', menuText);
    return NextResponse.json({ menuId: menu.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[POST /api/scan/url] Pipeline error:', message);
    return NextResponse.json(
      { error: 'Failed to parse menu. Please try again.', detail: message },
      { status: 500 }
    );
  }
}
