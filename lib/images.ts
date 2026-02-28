// =============================================================================
// Dish image fetch pipeline — server-only, fire-and-forget
// =============================================================================
// Fetches a dish photo via Serper.dev Google Image search for each full-depth
// enriched food dish. Called inside after() chained after enrichDishBatch —
// NEVER throws, NEVER blocks scan response.
//
// Strategy:
// 1. Serper.dev Google Image search (primary) — returns real web images
// 2. null (no result) — detail sheet shows text-only enrichment content
//
// Deduplication: dishes sharing the same canonical_name share one image fetch.
// Beverages: skipped (enrichment_depth = 'full' filter excludes them already).
// =============================================================================

import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-admin';

// =============================================================================
// Internal types
// =============================================================================

interface ImageResult {
  url: string;          // thumbnailUrl from Serper (Google-hosted, optimized)
  source: 'google';
  credit: string;       // e.g. "Source: sitename.com"
  creditUrl: string;    // link to the source page
}

// =============================================================================
// fetchFromSerper — Google Image search via Serper.dev
// =============================================================================

/**
 * Fetches a dish photo using Serper.dev Google Image search API.
 * Returns the first result's thumbnail URL (hosted on Google's CDN).
 *
 * Serper returns actual Google Image results — much more relevant for
 * specific dishes like "Chashu Mazesoba" than stock photo APIs.
 *
 * @param query - Search query, e.g. "Chashu Mazesoba food"
 * @returns ImageResult or null if no results / API error
 */
async function fetchFromSerper(query: string): Promise<ImageResult | null> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return null;

  let res: Response;
  try {
    res = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: {
        'X-API-KEY': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 5 }),
    });
  } catch (err) {
    console.warn('[fetchFromSerper] Network error:', err instanceof Error ? err.message : err);
    return null;
  }

  if (!res.ok) {
    console.warn(`[fetchFromSerper] API error: ${res.status} ${res.statusText}`);
    return null;
  }

  const data = await res.json() as {
    images?: Array<{
      title: string;
      imageUrl: string;
      thumbnailUrl: string;
      source: string;
      link: string;
    }>;
  };

  // Pick first result with a valid thumbnail
  const image = data.images?.find(img => img.thumbnailUrl && img.link);
  if (!image) return null;

  return {
    url: image.thumbnailUrl,
    source: 'google',
    credit: `Source: ${image.source}`,
    creditUrl: image.link,
  };
}

// =============================================================================
// buildSearchQuery — simple, direct query for Google Image search
// =============================================================================

/**
 * Builds a search query for Google Image search.
 * Google Images is much better at understanding dish names directly
 * than stock photo APIs — we can use simpler queries.
 */
function buildSearchQuery(
  canonicalName: string | null,
  nameOriginal: string,
): string {
  const name = (canonicalName ?? nameOriginal).trim();
  return `${name} food dish`;
}

// =============================================================================
// fetchDishImages — main export
// =============================================================================

/**
 * Fetches and stores photos for full-depth enriched food dishes in a menu.
 * Fire-and-forget: does not throw — logs errors and returns silently.
 * Called inside after() chained after enrichDishBatch.
 *
 * @param menuId - The menu UUID whose dishes need images
 */
export async function fetchDishImages(menuId: string): Promise<void> {
  try {
    const { data: items, error: fetchError } = await supabaseAdmin
      .from('menu_items')
      .select('id, canonical_name, name_original, enrichment_origin')
      .eq('menu_id', menuId)
      .eq('is_beverage', false)
      .eq('enrichment_status', 'enriched')
      .eq('enrichment_depth', 'full')
      .is('image_url', null);

    if (fetchError) {
      console.error('[fetchDishImages] Failed to fetch items:', fetchError.message);
      return;
    }

    if (!items || items.length === 0) {
      console.log(`[fetchDishImages] No items needing images for menu ${menuId}`);
      return;
    }

    console.log(`[fetchDishImages] Fetching images for ${items.length} items in menu ${menuId}`);

    let storedCount = 0;

    for (const item of items) {
      try {
        // Canonical name deduplication — reuse existing image from sibling dish
        if (item.canonical_name) {
          const { data: existing } = await supabaseAdmin
            .from('menu_items')
            .select('image_url, image_source, image_credit, image_credit_url, image_placeholder')
            .eq('canonical_name', item.canonical_name)
            .not('image_url', 'is', null)
            .limit(1)
            .single();

          if (existing?.image_url) {
            await supabaseAdmin
              .from('menu_items')
              .update({
                image_url: existing.image_url,
                image_source: existing.image_source,
                image_credit: existing.image_credit,
                image_credit_url: existing.image_credit_url,
                image_placeholder: existing.image_placeholder,
              })
              .eq('id', item.id);

            console.log(`[fetchDishImages] Reused image for "${item.canonical_name}" (item ${item.id})`);
            storedCount++;
            continue;
          }
        }

        // Fetch from Serper (Google Images)
        const query = buildSearchQuery(item.canonical_name, item.name_original);
        const result = await fetchFromSerper(query);

        if (result) {
          const { error: updateError } = await supabaseAdmin
            .from('menu_items')
            .update({
              image_url: result.url,
              image_source: result.source,
              image_credit: result.credit,
              image_credit_url: result.creditUrl,
              image_placeholder: null,  // Google thumbnails load fast, no blur needed
            })
            .eq('id', item.id);

          if (updateError) {
            console.error(`[fetchDishImages] DB update failed for item ${item.id}:`, updateError.message);
          } else {
            storedCount++;
            console.log(`[fetchDishImages] Stored image for "${item.name_original}" (item ${item.id})`);
          }
        } else {
          console.log(`[fetchDishImages] No image for "${item.name_original}" — text-only detail`);
        }
      } catch (itemError) {
        console.error(
          `[fetchDishImages] Error for item ${item.id}:`,
          itemError instanceof Error ? itemError.message : itemError
        );
      }
    }

    console.log(`[fetchDishImages] Completed for menu ${menuId}: ${storedCount} images stored`);
  } catch (error) {
    console.error(
      '[fetchDishImages] Fatal error:',
      error instanceof Error ? error.message : error
    );
  }
}
