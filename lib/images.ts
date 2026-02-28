// =============================================================================
// Dish image fetch pipeline — server-only, fire-and-forget
// =============================================================================
// Fetches a licensed stock photo for each full-depth enriched food dish.
// Called inside after() chained after enrichDishBatch — NEVER throws,
// NEVER blocks scan response.
//
// Strategy:
// 1. Unsplash REST API (primary) — squarish food photos, attribution required
// 2. Pexels REST API (fallback) — square food photos, simpler attribution
// 3. null (no result) — UI renders cuisine-based gradient + emoji fallback
//
// Deduplication: dishes sharing the same canonical_name share one image fetch.
// Beverages: skipped (enrichment_depth = 'full' filter excludes them already).
// =============================================================================

import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { hexToDataURL, buildImageQuery } from '@/lib/image-utils';

// =============================================================================
// Internal types
// =============================================================================

interface ImageResult {
  url: string;
  placeholder: string;  // data URL for blur-up (1x1 BMP from dominant color)
  credit: string;       // e.g. "Photo by Jane on Unsplash"
  creditUrl: string;    // photographer profile URL with UTM params
  source: 'unsplash' | 'pexels';
}

// =============================================================================
// fetchFromUnsplash
// =============================================================================

/**
 * Fetches a squarish food photo from Unsplash.
 * Returns null if: key missing, API error, rate limit low (<5 remaining), or no results.
 *
 * API compliance:
 * - Always fires download tracking request (required by Unsplash guidelines)
 * - Returns hotlink URL from photo.urls.small — never re-hosts
 * - UTM params on photographer credit URL (required by attribution guidelines)
 */
async function fetchFromUnsplash(query: string): Promise<ImageResult | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '5');
  url.searchParams.set('orientation', 'squarish');
  url.searchParams.set('content_filter', 'high');

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${key}` },
    });
  } catch (err) {
    console.warn('[fetchFromUnsplash] Network error:', err instanceof Error ? err.message : err);
    return null;
  }

  if (!res.ok) {
    console.warn(`[fetchFromUnsplash] API error: ${res.status} ${res.statusText}`);
    return null;
  }

  // Check rate limit header — fall through to Pexels if running low
  const remaining = parseInt(res.headers.get('X-Ratelimit-Remaining') ?? '999', 10);
  if (remaining < 5) {
    console.warn(`[fetchFromUnsplash] Rate limit low (${remaining} remaining) — skipping to Pexels`);
    return null;
  }

  const data = await res.json() as { results?: Array<{
    urls: { small: string };
    color: string;
    user: { name: string; username: string };
    links: { download_location: string };
  }> };

  const photo = data.results?.[0];
  if (!photo) return null;

  // Fire-and-forget download tracking — required by Unsplash API guidelines
  // (constitutes "selection" of the photo per their terms)
  fetch(photo.links.download_location, {
    headers: { Authorization: `Client-ID ${key}` },
  }).catch(() => {});

  return {
    url: photo.urls.small,
    placeholder: hexToDataURL(photo.color),
    credit: `Photo by ${photo.user.name} on Unsplash`,
    creditUrl: `https://unsplash.com/@${photo.user.username}?utm_source=nomnomnom&utm_medium=referral`,
    source: 'unsplash',
  };
}

// =============================================================================
// fetchFromPexels
// =============================================================================

/**
 * Fetches a square food photo from Pexels.
 * Used as fallback when Unsplash returns no result or is rate limited.
 *
 * API compliance:
 * - Raw API key in Authorization header (no "Client-ID" prefix — Pexels differs from Unsplash)
 * - Returns hotlink URL from photo.src.medium — never re-hosts
 * - avg_color used as blur placeholder (Pexels provides this in response)
 */
async function fetchFromPexels(query: string): Promise<ImageResult | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;

  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '5');
  url.searchParams.set('orientation', 'square');

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { Authorization: key },
    });
  } catch (err) {
    console.warn('[fetchFromPexels] Network error:', err instanceof Error ? err.message : err);
    return null;
  }

  if (!res.ok) {
    console.warn(`[fetchFromPexels] API error: ${res.status} ${res.statusText}`);
    return null;
  }

  const data = await res.json() as { photos?: Array<{
    src: { medium: string };
    avg_color: string;
    photographer: string;
    photographer_url: string;
  }> };

  const photo = data.photos?.[0];
  if (!photo) return null;

  return {
    url: photo.src.medium,
    placeholder: hexToDataURL(photo.avg_color),
    credit: `Photo by ${photo.photographer} on Pexels`,
    creditUrl: `${photo.photographer_url}?utm_source=nomnomnom`,
    source: 'pexels',
  };
}

// =============================================================================
// fetchDishImages — main export
// =============================================================================

/**
 * Fetches and stores stock photos for full-depth enriched food dishes in a menu.
 * Fire-and-forget: does not throw — logs errors and returns silently.
 * Called inside after() chained after enrichDishBatch.
 *
 * Flow:
 * 1. Fetch full-depth enriched food items with no image_url
 * 2. For each item: check canonical_name deduplication (share existing image, zero API cost)
 * 3. Build search query and fetch: Unsplash → Pexels → null
 * 4. Update menu_items with all 5 image fields
 * 5. Per-item try/catch — one failure never stops the batch
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
      console.log(`[fetchDishImages] No full-depth enriched food items needing images for menu ${menuId}`);
      return;
    }

    console.log(`[fetchDishImages] Fetching images for ${items.length} items in menu ${menuId}`);

    for (const item of items) {
      try {
        // Step 1: Canonical name deduplication — before any external API call
        // If another menu_item with the same canonical_name already has an image, reuse it
        if (item.canonical_name) {
          const { data: existing } = await supabaseAdmin
            .from('menu_items')
            .select('image_url, image_source, image_credit, image_credit_url, image_placeholder')
            .eq('canonical_name', item.canonical_name)
            .not('image_url', 'is', null)
            .limit(1)
            .single();

          if (existing?.image_url) {
            // Copy from sibling — zero API cost
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
            continue;
          }
        }

        // Step 2: Build search query and fetch from APIs
        const query = buildImageQuery(item.canonical_name, item.name_original, item.enrichment_origin);
        const result = (await fetchFromUnsplash(query)) ?? (await fetchFromPexels(query));

        if (result) {
          const { error: updateError } = await supabaseAdmin
            .from('menu_items')
            .update({
              image_url: result.url,
              image_source: result.source,
              image_credit: result.credit,
              image_credit_url: result.creditUrl,
              image_placeholder: result.placeholder,
            })
            .eq('id', item.id);

          if (updateError) {
            console.error(`[fetchDishImages] DB update failed for item ${item.id}:`, updateError.message);
          } else {
            console.log(`[fetchDishImages] Stored ${result.source} image for "${item.name_original}" (item ${item.id})`);
          }
        } else {
          // No result — leave image_url null; UI renders gradient+emoji fallback
          console.log(`[fetchDishImages] No image found for "${item.name_original}" — will use gradient fallback`);
        }
      } catch (itemError) {
        // Per-item catch — one failure never stops processing remaining items
        console.error(
          `[fetchDishImages] Error for item ${item.id}:`,
          itemError instanceof Error ? itemError.message : itemError
        );
      }
    }

    console.log(`[fetchDishImages] Completed image fetch for menu ${menuId}`);
  } catch (error) {
    // Top-level catch — NEVER throw from after() context
    console.error(
      '[fetchDishImages] Fatal error:',
      error instanceof Error ? error.message : error
    );
  }
}
