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
// Relevance check: each candidate photo's alt_description is matched against
// dish keywords. Irrelevant photos are rejected before storing.
//
// Deduplication: dishes sharing the same canonical_name share one image fetch.
// Beverages: skipped (enrichment_depth = 'full' filter excludes them already).
// =============================================================================

import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { hexToDataURL, buildImageQuery, isImageRelevant } from '@/lib/image-utils';

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
// fetchFromUnsplash — with relevance filtering
// =============================================================================

/**
 * Fetches a relevant food photo from Unsplash.
 * Returns null if: key missing, API error, rate limit low, no results, or no relevant match.
 *
 * Iterates up to 5 results and picks the first whose alt_description
 * contains keywords matching the dish name.
 */
async function fetchFromUnsplash(query: string, dishKeywords: string[]): Promise<ImageResult | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '10');
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
    alt_description: string | null;
    description: string | null;
    user: { name: string; username: string };
    links: { download_location: string };
  }> };

  if (!data.results || data.results.length === 0) return null;

  // Find the first relevant photo — check alt_description + description against dish keywords
  for (const photo of data.results) {
    const photoText = [photo.alt_description, photo.description].filter(Boolean).join(' ');
    if (!isImageRelevant(photoText, dishKeywords)) continue;

    // Fire-and-forget download tracking — required by Unsplash API guidelines
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

  // No relevant photo found among results
  return null;
}

// =============================================================================
// fetchFromPexels — with relevance filtering
// =============================================================================

/**
 * Fetches a relevant food photo from Pexels.
 * Iterates up to 5 results and picks the first whose alt text
 * contains keywords matching the dish name.
 */
async function fetchFromPexels(query: string, dishKeywords: string[]): Promise<ImageResult | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;

  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '10');

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
    alt: string | null;
    photographer: string;
    photographer_url: string;
  }> };

  if (!data.photos || data.photos.length === 0) return null;

  // Find first relevant photo
  for (const photo of data.photos) {
    if (!isImageRelevant(photo.alt ?? '', dishKeywords)) continue;

    return {
      url: photo.src.medium,
      placeholder: hexToDataURL(photo.avg_color),
      credit: `Photo by ${photo.photographer} on Pexels`,
      creditUrl: `${photo.photographer_url}?utm_source=nomnomnom`,
      source: 'pexels',
    };
  }

  // No relevant photo found among results
  return null;
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
 * 3. Build search query + dish keywords, fetch with relevance check: Unsplash → Pexels → null
 * 4. Update menu_items with all 5 image fields
 * 5. Per-item try/catch — one failure never stops the batch
 *
 * @param menuId - The menu UUID whose dishes need images
 */
export async function fetchDishImages(menuId: string): Promise<void> {
  try {
    const { data: items, error: fetchError } = await supabaseAdmin
      .from('menu_items')
      .select('id, canonical_name, name_original, enrichment_origin, enrichment_ingredients')
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

    let storedCount = 0;
    let skippedCount = 0;

    for (const item of items) {
      try {
        // Step 1: Canonical name deduplication — before any external API call
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

        // Step 2: Build search query and dish keywords for relevance check
        const { query, keywords } = buildImageQuery(
          item.canonical_name,
          item.name_original,
          item.enrichment_origin,
          item.enrichment_ingredients,
        );

        // Step 3: Fetch with relevance filtering — Unsplash → Pexels → null
        const result = (await fetchFromUnsplash(query, keywords)) ?? (await fetchFromPexels(query, keywords));

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
            storedCount++;
            console.log(`[fetchDishImages] Stored ${result.source} image for "${item.name_original}" (item ${item.id})`);
          }
        } else {
          skippedCount++;
          console.log(`[fetchDishImages] No relevant image for "${item.name_original}" — will use gradient fallback`);
        }
      } catch (itemError) {
        console.error(
          `[fetchDishImages] Error for item ${item.id}:`,
          itemError instanceof Error ? itemError.message : itemError
        );
      }
    }

    console.log(`[fetchDishImages] Completed for menu ${menuId}: ${storedCount} stored, ${skippedCount} no relevant match`);
  } catch (error) {
    console.error(
      '[fetchDishImages] Fatal error:',
      error instanceof Error ? error.message : error
    );
  }
}
