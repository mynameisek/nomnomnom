// =============================================================================
// Menu domain TypeScript types — mirrors the Supabase DB schema exactly
// =============================================================================

/**
 * Supported language codes for v1.1 scope.
 */
export type SupportedLang = 'fr' | 'en' | 'tr' | 'de';

/**
 * Flat translation map for dish names and descriptions.
 * Languages: French, English, Turkish, German (v1.1 scope).
 * Stored as JSONB in Supabase — direct key access: name_translations->>'fr'
 *
 * Partial: lazy translation means not all langs are present immediately.
 * Can be `{}` for freshly parsed items (no translations yet).
 */
export type TranslationMap = Partial<Record<SupportedLang, string>>;

/**
 * EU 14 mandatory allergens (legally defined, stable).
 * Stored as allergen_type[] enum array in PostgreSQL.
 * Note: Supabase client returns enum arrays as plain strings — cast via this type.
 */
export type Allergen =
  | 'gluten'
  | 'dairy'
  | 'nuts'
  | 'peanuts'
  | 'soy'
  | 'eggs'
  | 'fish'
  | 'shellfish'
  | 'celery'
  | 'mustard'
  | 'sesame'
  | 'sulphites'
  | 'lupin'
  | 'molluscs';

/**
 * Dietary tags — stored as text[] (not enum) because list may grow in v1.2+.
 * Current v1.1 values: vegetarian, vegan, halal, spicy.
 */
export type DietaryTag = 'vegetarian' | 'vegan' | 'halal' | 'spicy';

/**
 * Trust signal for allergen/ingredient information.
 * 'verified' — extracted directly from menu text.
 * 'inferred' — inferred by LLM based on dish name and context.
 */
export type TrustSignal = 'verified' | 'inferred';

/**
 * Menu — one row per unique URL (cache entry).
 * Mirrors the `menus` table in Supabase.
 */
export interface Menu {
  id: string;
  url: string;
  url_hash: string;           // SHA-256 hex (64 chars), cache key
  restaurant_name: string | null;
  source_type: string | null; // 'url' | 'photo' | 'qr'
  raw_text: string | null;    // original scraped/OCR text for debugging
  source_language: string | null; // detected menu language (e.g. 'fr', 'en', 'tr')
  parse_time_ms: number | null;   // LLM parse duration in ms (null for cache hits)
  hit_count: number;              // number of cache hits since first parse (default 0)
  category_translations: Record<string, Record<string, string>> | null; // {"de":{"A BOIRE":"GETRÄNKE",...},...}
  parsed_at: string;          // timestamptz as ISO string
  expires_at: string;         // timestamptz as ISO string
  created_at: string;         // timestamptz as ISO string
}

/**
 * MenuItem — one row per dish.
 * Mirrors the `menu_items` table in Supabase.
 */
export interface MenuItem {
  id: string;
  menu_id: string;
  name_original: string;
  name_translations: TranslationMap;  // can be {} for freshly parsed items
  description_original: string | null;
  description_translations: TranslationMap | null;
  price: string | null;       // e.g. "12€", "8.50 TL", null if not on menu
  allergens: Allergen[];
  dietary_tags: DietaryTag[];
  trust_signal: TrustSignal;
  category: string | null;    // top-level category (e.g. "Entrées", "Boissons")
  subcategory: string | null; // sub-category (e.g. "Bières", "Cocktails")
  sort_order: number;         // preserves original menu order
  created_at: string;         // timestamptz as ISO string
}

/**
 * MenuWithItems — menu row joined with its items.
 * Shape returned by: SELECT *, menu_items(*) FROM menus
 */
export type MenuWithItems = Menu & { menu_items: MenuItem[] };
