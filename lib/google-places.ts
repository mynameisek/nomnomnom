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
 * @param restaurantName - LLM-extracted restaurant name (may be null)
 * @param menuUrl - Original menu URL (used as search hint if no name)
 * @param menuId - Supabase menu row ID to update
 */
export async function enrichWithGooglePlaces(
  restaurantName: string | null,
  menuUrl: string,
  menuId: string,
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

    // Build search query: prefer restaurant name, fallback to URL domain
    const searchQuery = restaurantName ?? extractDomain(menuUrl);
    if (!searchQuery) return;

    const result = await searchPlace(searchQuery);
    if (!result) return;

    // Update menu row with Places data
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
        // Also set restaurant_name from Places if LLM didn't extract one
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
      languageCode: 'en',
      maxResultCount: 1,
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
 * Extracts a human-readable domain from a URL for Places search fallback.
 * e.g. "https://menu.eazee-link.com/?id=123" → "eazee-link.com"
 */
function extractDomain(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    // Strip common subdomains
    return hostname.replace(/^(www|menu|order|app)\./, '');
  } catch {
    return null;
  }
}
