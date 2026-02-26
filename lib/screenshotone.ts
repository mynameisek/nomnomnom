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
// Direct HTML fetch + strip tags — fallback when Screenshotone markdown fails
// =============================================================================

/**
 * Strips HTML tags, scripts, styles, and collapses whitespace.
 * Lightweight alternative to cheerio/jsdom for extracting readable text.
 */
function htmlToText(html: string): string {
  return html
    // Remove script and style blocks entirely
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Replace block-level tags with newlines for readability
    .replace(/<\/?(div|p|br|h[1-6]|li|tr|section|article|header|footer|blockquote|ul|ol|table|thead|tbody)[^>]*>/gi, '\n')
    // Strip remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&euro;/g, '€')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    // Collapse whitespace: multiple spaces → single space, multiple newlines → double
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Fetches a URL directly and extracts text from HTML.
 * Returns null if fetch fails or text is too short to be useful.
 * Timeout: 8s to avoid blocking the pipeline.
 */
async function fetchDirectText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NomNomNom/1.0; menu parser)',
        'Accept': 'text/html',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) return null;

    const html = await response.text();
    const text = htmlToText(html);

    // Must have meaningful content — at least 100 chars of clean text
    if (text.length < 100) return null;

    return text;
  } catch {
    return null;
  }
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

  // Attempt 1: Direct HTML fetch — fast path for static HTML sites (saves 15-30s)
  const directText = await fetchDirectText(url);
  if (directText) {
    console.log(`[screenshotone] Direct HTML fetch succeeded (${directText.length} chars)`);
    return { type: 'text', content: directText };
  }
  console.log('[screenshotone] Direct HTML fetch failed or too short, trying Screenshotone markdown');

  // Attempt 2: Screenshotone markdown extraction (handles JS-rendered SPAs)
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

  // Attempt 3: PNG screenshot for Vision OCR (last resort)
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
