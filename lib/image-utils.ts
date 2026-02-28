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

/**
 * Constructs a search query for stock photo APIs from dish metadata.
 * Appends cuisine/origin context for specificity, always ends with "food" term.
 *
 * @param canonicalName - Canonical dish name (preferred), e.g. "Mantı"
 * @param nameOriginal - Original menu name (fallback), e.g. "Manti turc"
 * @param origin - Enrichment origin string, e.g. "Anatolie centrale, Turquie"
 * @returns Search query string, e.g. "Mantı Anatolie centrale food"
 */
export function buildImageQuery(
  canonicalName: string | null,
  nameOriginal: string,
  origin: string | null
): string {
  const name = canonicalName ?? nameOriginal;

  // Use first segment of origin (before comma) as cuisine hint
  // Keep short — Unsplash search performs better with 2-3 terms
  const cuisineHint = origin ? origin.split(',')[0].trim() : null;
  if (cuisineHint && cuisineHint.length < 30) {
    return `${name} ${cuisineHint} food`;
  }

  return `${name} food dish`;
}
