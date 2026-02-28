// =============================================================================
// Cuisine gradient map and dish emoji lookup for image fallbacks
// =============================================================================

/**
 * Maps cuisine origin keywords (lowercase) to [fromColor, toColor] gradient pairs.
 * Used by DishImageFallback when a dish has no stock photo.
 */
export const CUISINE_GRADIENTS: Record<string, [string, string]> = {
  turquie: ['#C84B31', '#E07B39'],
  ankara: ['#C84B31', '#E07B39'],
  anatolie: ['#C84B31', '#E07B39'],
  istanbul: ['#C84B31', '#E07B39'],
  vietnam: ['#2D6A4F', '#52B788'],
  japon: ['#E63946', '#1D3557'],
  chine: ['#B5171B', '#E9C46A'],
  inde: ['#E9C46A', '#F4A261'],
  france: ['#003087', '#7B8BA4'],
  italie: ['#009246', '#CE2B37'],
  mexique: ['#F4A261', '#E76F51'],
  maroc: ['#C1440E', '#F4D35E'],
  liban: ['#D62828', '#F77F00'],
  allemagne: ['#2C2C2C', '#DAA520'],
  allemand: ['#2C2C2C', '#DAA520'],
  'corée': ['#C1272D', '#FFFFFF'],
  coree: ['#C1272D', '#FFFFFF'],
  'thaïlande': ['#E9C46A', '#2D6A4F'],
  thailande: ['#E9C46A', '#2D6A4F'],
};

const DEFAULT_GRADIENT: [string, string] = ['#2C3E50', '#3498DB'];

/**
 * Returns [fromColor, toColor] for a cuisine origin string.
 * Lowercases origin and checks for keyword matches.
 * Falls back to default dark blue/slate if no match found.
 */
export function getCuisineGradient(origin: string | null): [string, string] {
  if (!origin) return DEFAULT_GRADIENT;
  const lower = origin.toLowerCase();
  for (const [key, colors] of Object.entries(CUISINE_GRADIENTS)) {
    if (lower.includes(key)) return colors;
  }
  return DEFAULT_GRADIENT;
}

/**
 * Category → emoji fallback map.
 */
export const CATEGORY_EMOJIS: Record<string, string> = {
  'entrée': '🥗',
  entree: '🥗',
  plat: '🍽️',
  dessert: '🍮',
  salade: '🥗',
  soupe: '🍜',
  grill: '🥩',
  'pâtes': '🍝',
  pates: '🍝',
  pizza: '🍕',
  default: '🍴',
};

/** Ingredient → emoji map for the top 3 ingredients */
const INGREDIENT_EMOJIS: Record<string, string> = {
  agneau: '🐑',
  poulet: '🍗',
  boeuf: '🥩',
  poisson: '🐟',
  riz: '🍚',
  tomate: '🍅',
  fromage: '🧀',
  crevette: '🦐',
};

/**
 * Returns an emoji for a dish based on its first 3 ingredients (priority),
 * falling back to category emoji, then the universal default.
 */
export function getDishEmoji(category: string | null, ingredients: string[] | null): string {
  // Check first 3 ingredients
  const firstThree = (ingredients ?? []).slice(0, 3);
  for (const ingredient of firstThree) {
    const lower = ingredient.toLowerCase();
    for (const [key, emoji] of Object.entries(INGREDIENT_EMOJIS)) {
      if (lower.includes(key)) return emoji;
    }
  }

  // Fall back to category
  if (category) {
    const lower = category.toLowerCase();
    for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
      if (key !== 'default' && lower.includes(key)) return emoji;
    }
  }

  return CATEGORY_EMOJIS.default;
}
