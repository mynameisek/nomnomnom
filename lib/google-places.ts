// =============================================================================
// Google Places enrichment — fire-and-forget restaurant data lookup
// =============================================================================
// Uses Google Places API (New) Text Search to find restaurant info.
// Called after menu parse — updates menus row with place data asynchronously.
// Gracefully skips if GOOGLE_PLACES_API_KEY is not set or API fails.
// =============================================================================

import 'server-only';
import { supabaseAdmin } from './supabase-admin';

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_TRANSLATE_API_KEY;

// Platform/aggregator domains — domain search would find the platform, not the restaurant
const PLATFORM_DOMAINS = [
  'eazee-link.com', 'vazeetap.com', 'foodles.co', 'zenchef.com',
  'thefork.com', 'lafourchette.com', 'ubereats.com', 'deliveroo.com',
  'justeat.com', 'grubhub.com',
];

interface PlacesResult {
  place_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  rating: number | null;
  photo_ref: string | null;
  google_url: string | null;
}

/**
 * Enriches a menu row with Google Places data (address, rating, phone, etc.).
 * Fire-and-forget: does not throw — logs errors and returns silently.
 *
 * Search strategy:
 * 1. Name + search hint (website/social) → "UMAÏ RAMEN umai-ramen.fr" (best precision)
 * 2. Name only without hint → skip (too ambiguous, would match wrong restaurant)
 * 3. No name but real restaurant URL → search by domain (e.g. "lepetitbistrot.fr")
 * 4. No name + platform URL (eazee-link etc) → skip (would find the platform)
 */
export async function enrichWithGooglePlaces(
  restaurantName: string | null,
  menuUrl: string,
  menuId: string,
  searchHint?: string | null,
): Promise<void> {
  if (!PLACES_API_KEY) return;

  try {
    // Skip if already enriched
    const { data: existing } = await supabaseAdmin
      .from('menus')
      .select('google_place_id')
      .eq('id', menuId)
      .single();

    if (existing?.google_place_id) return;

    // Build search query — cascade from best to weakest signal
    let searchQuery: string | null = null;

    if (restaurantName && searchHint) {
      // Best: name + hint (website domain, instagram handle, etc.)
      searchQuery = `${restaurantName} ${searchHint}`;
    } else if (restaurantName && !searchHint) {
      // Name only without a disambiguating hint — skip to avoid matching the wrong restaurant
      // (e.g. "LA VIGIE" matches dozens of restaurants across France)
      console.log(`[google-places] Skipped: "${restaurantName}" has no search hint — too ambiguous`);
      return;
    } else {
      const domain = extractDomain(menuUrl);
      if (domain && !PLATFORM_DOMAINS.some((p) => domain.includes(p))) {
        searchQuery = `restaurant ${domain}`;
      }
    }

    if (!searchQuery) return;

    const result = await searchPlace(searchQuery);
    if (!result) return;

    // Update menu row with Places data + backfill restaurant_name if missing
    const { error } = await supabaseAdmin
      .from('menus')
      .update({
        google_place_id: result.place_id,
        google_place_name: result.name,
        google_address: result.address,
        google_phone: result.phone,
        google_rating: result.rating,
        google_photo_ref: result.photo_ref,
        google_url: result.google_url,
        ...(!restaurantName ? { restaurant_name: result.name } : {}),
      })
      .eq('id', menuId);

    if (error) {
      console.error('[google-places] Failed to update menu:', error.message);
      return;
    }

    console.log(`[google-places] Enriched: ${result.name} (${result.place_id})`);
  } catch (err) {
    console.error('[google-places] Enrichment failed:', err instanceof Error ? err.message : err);
  }
}

/**
 * Calls Google Places Text Search (New) API.
 */
async function searchPlace(query: string): Promise<PlacesResult | null> {
  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.nationalPhoneNumber',
    'places.rating',
    'places.googleMapsUri',
    'places.photos',
  ].join(',');

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': PLACES_API_KEY!,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: 'fr',
      maxResultCount: 1,
      // Hard restrict to France + neighbors — no results outside this box
      locationRestriction: {
        rectangle: {
          low: { latitude: 41.3, longitude: -5.2 },
          high: { latitude: 51.1, longitude: 9.6 },
        },
      },
    }),
  });

  if (!res.ok) {
    console.error(`[google-places] API error: ${res.status} ${res.statusText}`);
    return null;
  }

  const data = await res.json();
  const place = data.places?.[0];
  if (!place) return null;

  return {
    place_id: place.id,
    name: place.displayName?.text ?? query,
    address: place.formattedAddress ?? null,
    phone: place.nationalPhoneNumber ?? null,
    rating: place.rating ?? null,
    photo_ref: place.photos?.[0]?.name ?? null,
    google_url: place.googleMapsUri ?? null,
  };
}

/**
 * Extracts a clean domain from a URL.
 * e.g. "https://www.lepetitbistrot.fr/menu" → "lepetitbistrot.fr"
 */
function extractDomain(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^(www|menu|order|app)\./, '');
  } catch {
    return null;
  }
}
