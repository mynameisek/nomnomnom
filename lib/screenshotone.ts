// =============================================================================
// Screenshotone wrapper — server-only, SPA text extraction with Vision fallback
// =============================================================================
// Primary: format=markdown for clean text extraction.
// Fallback: format=png screenshot when markdown returns CSS garbage (SPAs like
// eazee-link.com render CSS instead of menu content via markdown extraction).
//
// Client is lazily initialized to avoid module-level crash when env vars
// are absent during Next.js build-time page data collection.
// =============================================================================

import 'server-only';
import * as screenshotone from 'screenshotone-api-sdk';

// Vercel Pro plan: Screenshotone + LLM pipeline can take 6–15s total
export const maxDuration = 60;

// Lazy singleton — created on first call
let _client: screenshotone.Client | null = null;

function getClient(): screenshotone.Client {
  if (_client) return _client;

  const accessKey = process.env.SCREENSHOTONE_ACCESS_KEY;
  const secretKey = process.env.SCREENSHOTONE_SECRET_KEY;

  if (!accessKey || !secretKey) {
    throw new Error(
      '[screenshotone] Missing required environment variables: ' +
      'SCREENSHOTONE_ACCESS_KEY and SCREENSHOTONE_SECRET_KEY must be set'
    );
  }

  _client = new screenshotone.Client(accessKey, secretKey);
  return _client;
}

// CSS/garbage patterns that indicate markdown extraction failed
const GARBAGE_PATTERNS = [
  /\.[\w-]+\s*\{[^}]*\}/,          // CSS rules: .class { ... }
  /position:\s*relative/,
  /webkit-touch-callout/,
  /transform-component/,
  /moz-fit-content/,
  /pointer-events:\s*none/,
];

function isGarbageMarkdown(text: string): boolean {
  const matches = GARBAGE_PATTERNS.filter(p => p.test(text));
  return matches.length >= 2; // 2+ CSS patterns = garbage
}

// =============================================================================
// extractMenuText — try markdown first, fallback to screenshot
// =============================================================================

export type ExtractionResult =
  | { type: 'text'; content: string }
  | { type: 'image'; buffer: ArrayBuffer };

/**
 * Extracts menu content from a URL. Tries markdown extraction first.
 * If markdown returns CSS garbage (common with JS SPAs), falls back to
 * a PNG screenshot for Vision OCR processing.
 */
export async function extractMenuContent(url: string): Promise<ExtractionResult> {
  const client = getClient();

  // Attempt 1: markdown extraction
  const mdOptions = screenshotone.TakeOptions.url(url)
    .format('markdown')
    .waitUntil('networkidle2')
    .fullPage(true)
    .delay(2);

  const mdSignedUrl = await client.generateSignedTakeURL(mdOptions);
  const mdResponse = await fetch(mdSignedUrl);

  if (mdResponse.ok) {
    const text = await mdResponse.text();
    if (text.trim().length >= 50 && !isGarbageMarkdown(text)) {
      return { type: 'text', content: text };
    }
    console.log('[screenshotone] Markdown extraction returned garbage, falling back to screenshot');
  }

  // Attempt 2: PNG screenshot for Vision OCR
  const imgOptions = screenshotone.TakeOptions.url(url)
    .format('png')
    .waitUntil('networkidle2')
    .fullPage(true)
    .delay(2);

  const imgSignedUrl = await client.generateSignedTakeURL(imgOptions);
  const imgResponse = await fetch(imgSignedUrl);

  if (!imgResponse.ok) {
    const errorText = await imgResponse.text().catch(() => '(no body)');
    throw new Error(
      `[screenshotone] Screenshot request failed: HTTP ${imgResponse.status} — ${errorText}`
    );
  }

  const buffer = await imgResponse.arrayBuffer();
  return { type: 'image', buffer };
}
