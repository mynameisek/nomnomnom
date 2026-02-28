// =============================================================================
// Image utilities — kept minimal after Serper migration
// =============================================================================
// hexToDataURL still used by DishDetailSheet blur placeholder (for any
// images that were stored before the Serper migration with a placeholder).
// =============================================================================

/**
 * Converts a hex color string to a 1×1 BMP data URL.
 * Used as a blur-up placeholder for next/image blurDataURL.
 *
 * @param hex - Hex color string e.g. "#A08060"
 * @returns data:image/bmp;base64,... data URL
 */
export function hexToDataURL(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const bmp = [
    0x42, 0x4d, 0x3a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x36, 0x00, 0x00, 0x00, 0x28, 0x00, 0x00, 0x00, 0x01, 0x00,
    0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x18, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    b, g, r, 0x00,
  ];

  return `data:image/bmp;base64,${Buffer.from(bmp).toString('base64')}`;
}
