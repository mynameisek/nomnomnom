// =============================================================================
// Screenshotone wrapper — server-only, SPA text extraction via markdown format
// =============================================================================
// Uses Screenshotone SDK to capture JS-rendered SPAs as markdown text.
// format=markdown is supported by the API but not listed in SDK type docs —
// the SDK's format() method accepts any string, so this works correctly.
// See: Phase 5 Research — eazee-link.com confirmed JS SPA (Cheerio insufficient)
// =============================================================================

import 'server-only';
import * as screenshotone from 'screenshotone-api-sdk';

// Vercel Pro plan: Screenshotone + LLM pipeline can take 6–15s total
export const maxDuration = 60;

// Initialise SDK client once at module load (env vars validated at runtime)
const client = new screenshotone.Client(
  process.env.SCREENSHOTONE_ACCESS_KEY!,
  process.env.SCREENSHOTONE_SECRET_KEY!
);

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
