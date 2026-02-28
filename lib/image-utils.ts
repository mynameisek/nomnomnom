// =============================================================================
// Image utilities — pure helpers, no external dependencies
// =============================================================================
// These run server-side (inside lib/images.ts) but are not server-only:
// they contain no secrets, no DB access, and can theoretically run client-side too.
// =============================================================================

/**
 * Converts a hex color string to a 1×1 BMP data URL.
 * Used as a blur-up placeholder for next/image blurDataURL.
 *
 * Works server-side without canvas. Builds a minimal 58-byte BMP:
 * 14-byte file header + 40-byte DIB header + 4-byte pixel data (BGR + padding).
 *
 * @param hex - Hex color string e.g. "#A08060" (Unsplash photo.color, Pexels avg_color)
 * @returns data:image/bmp;base64,... data URL
 */
export function hexToDataURL(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // Minimal 1×1 BMP: 14-byte file header + 40-byte DIB header + 4-byte pixel data
  const bmp = [
    // File header (14 bytes)
    0x42, 0x4d,             // 'BM' signature
    0x3a, 0x00, 0x00, 0x00, // file size = 58 bytes
    0x00, 0x00, 0x00, 0x00, // reserved
    0x36, 0x00, 0x00, 0x00, // pixel data offset = 54 bytes
    // DIB header — BITMAPINFOHEADER (40 bytes)
    0x28, 0x00, 0x00, 0x00, // DIB header size = 40
    0x01, 0x00, 0x00, 0x00, // width = 1
    0x01, 0x00, 0x00, 0x00, // height = 1
    0x01, 0x00,             // color planes = 1
    0x18, 0x00,             // bits per pixel = 24 (RGB)
    0x00, 0x00, 0x00, 0x00, // compression = BI_RGB (none)
    0x04, 0x00, 0x00, 0x00, // image size (can be 0 for BI_RGB, use 4 for safety)
    0x00, 0x00, 0x00, 0x00, // horizontal DPI (ignored)
    0x00, 0x00, 0x00, 0x00, // vertical DPI (ignored)
    0x00, 0x00, 0x00, 0x00, // colors in color table = 0 (default)
    0x00, 0x00, 0x00, 0x00, // important color count = 0
    // Pixel data (4 bytes: BGR + 1 byte padding for 4-byte row alignment)
    b, g, r, 0x00,
  ];

  return `data:image/bmp;base64,${Buffer.from(bmp).toString('base64')}`;
}

// =============================================================================
// Food-category keywords — used for both query building and relevance matching
// =============================================================================

/**
 * Maps canonical dish types to search-friendly English terms.
 * Unsplash/Pexels index English descriptions — we need to search in English
 * even though our dish names may be in French/Japanese/etc.
 */
const DISH_TYPE_MAP: Record<string, string> = {
  // Japanese
  ramen: 'ramen noodle soup',
  udon: 'udon noodles',
  soba: 'soba noodles',
  gyoza: 'gyoza dumplings',
  takoyaki: 'takoyaki octopus balls',
  karaage: 'fried chicken',
  mazesoba: 'dry ramen noodles',
  tsukemen: 'dipping ramen noodles',
  mochi: 'mochi ice cream',
  edamame: 'edamame soybeans',
  chashu: 'braised pork belly',
  katsu: 'breaded cutlet',
  tofu: 'tofu',
  tempura: 'tempura',
  teriyaki: 'teriyaki',
  miso: 'miso soup',
  // Korean
  kimchi: 'kimchi fermented cabbage',
  bibimbap: 'bibimbap rice bowl',
  // General
  tiramisu: 'tiramisu dessert',
  carbonara: 'carbonara pasta',
  curry: 'curry',
};

/**
 * Constructs a search query and keyword list for stock photo APIs.
 *
 * Returns both:
 * - query: the search string to send to the API (in English for better results)
 * - keywords: array of lowercase terms for relevance checking against photo descriptions
 *
 * @param canonicalName - Canonical dish name (preferred), e.g. "Mantı"
 * @param nameOriginal - Original menu name (fallback), e.g. "Manti turc"
 * @param origin - Enrichment origin string, e.g. "Anatolie centrale, Turquie"
 * @param ingredients - Enrichment ingredients array, e.g. ["agneau", "pâte fine"]
 */
export function buildImageQuery(
  canonicalName: string | null,
  nameOriginal: string,
  origin: string | null,
  ingredients?: string[] | null,
): { query: string; keywords: string[] } {
  const name = (canonicalName ?? nameOriginal).trim();
  const nameLower = name.toLowerCase();

  // Build keywords from name tokens
  const nameTokens = nameLower
    .replace(/[^a-zA-ZÀ-ÿ\s]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 2);

  // Check if any name token matches a known dish type for better search
  let dishType: string | null = null;
  for (const token of nameTokens) {
    if (DISH_TYPE_MAP[token]) {
      dishType = DISH_TYPE_MAP[token];
      break;
    }
  }

  // Build search query — prefer dish type mapping for accuracy
  let query: string;
  if (dishType) {
    query = `${name} ${dishType}`;
  } else {
    query = `${name} food dish`;
  }

  // Build keywords for relevance checking (lowercase, used against photo alt text)
  const keywords = [...nameTokens];

  // Add ingredient keywords (first 3, useful for matching)
  if (ingredients && ingredients.length > 0) {
    for (const ing of ingredients.slice(0, 3)) {
      const ingTokens = ing.toLowerCase().split(/\s+/).filter(t => t.length > 2);
      keywords.push(...ingTokens);
    }
  }

  // Add dish type keywords if found
  if (dishType) {
    keywords.push(...dishType.toLowerCase().split(/\s+/));
  }

  return { query, keywords: [...new Set(keywords)] };
}

/**
 * Checks if a photo description is relevant to the dish.
 * Returns true if the photo text matches enough dish keywords.
 *
 * Strategy:
 * - Normalize both photo text and keywords to lowercase
 * - Require at least 1 keyword match from the dish name tokens
 * - Also accept if the photo text contains "food", "dish", "bowl", "plate", "soup", "noodle"
 *   AND at least 1 name keyword (prevents totally unrelated food photos)
 *
 * @param photoText - Combined alt_description + description from the photo API
 * @param dishKeywords - Keywords from buildImageQuery
 */
export function isImageRelevant(photoText: string, dishKeywords: string[]): boolean {
  if (!photoText || photoText.length === 0) {
    // No description at all — cannot verify, reject to be safe
    return false;
  }

  const textLower = photoText.toLowerCase();

  // Count how many dish keywords appear in the photo text
  let matchCount = 0;
  for (const kw of dishKeywords) {
    if (textLower.includes(kw)) {
      matchCount++;
    }
  }

  // Need at least 1 keyword match
  if (matchCount === 0) return false;

  // Check for food-related context (prevent matching non-food photos that happen to contain a keyword)
  const foodTerms = ['food', 'dish', 'bowl', 'plate', 'soup', 'noodle', 'rice', 'meat', 'sauce',
    'restaurant', 'cuisine', 'meal', 'lunch', 'dinner', 'dessert', 'fried', 'grilled',
    'ramen', 'udon', 'soba', 'gyoza', 'dumpling', 'pasta', 'curry', 'salad', 'cake'];
  const hasFoodContext = foodTerms.some(term => textLower.includes(term));

  // Accept if: 2+ keyword matches, OR 1 keyword match + food context
  return matchCount >= 2 || (matchCount >= 1 && hasFoodContext);
}
