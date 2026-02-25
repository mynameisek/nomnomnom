// =============================================================================
// Screenshotone wrapper — server-only, SPA text extraction via markdown format
// =============================================================================
// Uses Screenshotone SDK to capture JS-rendered SPAs as markdown text.
// format=markdown is supported by the API but not listed in SDK type docs —
// the SDK's format() method accepts any string, so this works correctly.
// See: Phase 5 Research — eazee-link.com confirmed JS SPA (Cheerio insufficient)
//
// Client is lazily initialized to avoid module-level crash when env vars
// are absent during Next.js build-time page data collection.
// =============================================================================

import 'server-only';
import * as screenshotone from 'screenshotone-api-sdk';

// Vercel Pro plan: Screenshotone + LLM pipeline can take 6–15s total
export const maxDuration = 60;

// Lazy singleton — created on first call to extractMenuText
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

// =============================================================================
// extractMenuText — fetch SPA menu as markdown text
// =============================================================================

/**
 * Captures a URL via Screenshotone and returns the page content as markdown text.
 * Uses format=markdown which renders the JS SPA and returns structured text
 * instead of an image — ideal for LLM menu parsing.
 *
 * @param url - The menu URL to capture (must be publicly accessible)
 * @returns The markdown text of the rendered page
 * @throws Error if Screenshotone returns a non-OK status or empty content
 */
export async function extractMenuText(url: string): Promise<string> {
  const client = getClient();

  const options = screenshotone.TakeOptions.url(url)
    .format('markdown')           // text extraction mode (not an image format)
    .waitUntil('networkidle2')    // wait until JS SPA is fully rendered
    .fullPage(true)               // capture entire page, not just viewport
    .delay(2);                    // extra 2s buffer for slow SPA JS execution

  const signedUrl = await client.generateSignedTakeURL(options);

  const response = await fetch(signedUrl);

  if (!response.ok) {
    const errorText = await response.text().catch(() => '(no body)');
    throw new Error(
      `[extractMenuText] Screenshotone request failed: HTTP ${response.status} — ${errorText}`
    );
  }

  const text = await response.text();

  if (text.trim().length < 50) {
    throw new Error(
      `[extractMenuText] Screenshotone returned empty or near-empty content for URL: ${url} (${text.trim().length} chars)`
    );
  }

  return text;
}
