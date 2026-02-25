// =============================================================================
// eazee-link.com provider — direct API extraction (no screenshot needed)
// =============================================================================
// eazee-link.com is a popular French digital menu platform (SPA).
// Their public API returns structured JSON: categories, products, prices, allergens.
// URL format: https://menu.eazee-link.com/?id={STICKER_ID}&o=q
// API: https://api-menu.vazeetap.com/v2/public/stickers/{STICKER_ID}/menu
// =============================================================================

import 'server-only';
import type { DishResponse } from '@/lib/types/llm';
import { allergenEnum } from '@/lib/types/llm';

type Allergen = (typeof allergenEnum)['options'][number];

const EAZEE_API_BASE = 'https://api-menu.vazeetap.com/v2/public/stickers';

// EU 14 allergen IDs used by eazee-link → DishResponse allergen enum values
const ALLERGEN_MAP: Record<number, string> = {
  1: 'gluten',
  2: 'shellfish',
  3: 'eggs',
  4: 'fish',
  5: 'peanuts',
  6: 'soy',
  7: 'dairy',
  8: 'nuts',
  9: 'celery',
  10: 'mustard',
  11: 'sesame',
  12: 'sulphites',
  13: 'lupin',
  14: 'molluscs',
};

interface EazeeProduct {
  productId: number;
  categoryId: number;
  label: string;
  description: string | null;
  allergens: number[];
  price1Label: string | null;
  price1: number | null;
  price2Label: string | null;
  price2: number | null;
  price3Label: string | null;
  price3: number | null;
  status: string;
}

interface EazeeCategory {
  categoryId: number;
  parentId: number | null;
  label: string;
  description: string | null;
  order: number;
  status: string;
}

interface EazeeMenuResponse {
  menuId: number;
  categories: EazeeCategory[];
  products: EazeeProduct[];
}

/**
 * Check if a URL is an eazee-link.com menu URL.
 * Returns the sticker ID if it matches, null otherwise.
 */
export function getEazeeLinkStickerId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('eazee-link.com')) return null;
    return parsed.searchParams.get('id');
  } catch {
    return null;
  }
}

/**
 * Fetch menu data directly from eazee-link's public API.
 * Returns structured dish data — no LLM call needed.
 */
export async function fetchEazeeLinkMenu(stickerId: string): Promise<{
  dishes: DishResponse[];
  rawText: string;
}> {
  const apiUrl = `${EAZEE_API_BASE}/${stickerId}/menu`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(
      `[eazee-link] API error: HTTP ${response.status} for sticker ${stickerId}`
    );
  }

  const data: EazeeMenuResponse = await response.json();

  // Build category lookup for grouping context
  const categoryMap = new Map<number, EazeeCategory>();
  for (const cat of data.categories) {
    categoryMap.set(cat.categoryId, cat);
  }

  // Convert eazee-link products to our DishResponse format
  const dishes: DishResponse[] = data.products
    .filter((p) => p.status === 'ENABLED')
    .map((product) => {
      // Get the best price (first non-null)
      const price = product.price1 ?? product.price2 ?? product.price3 ?? null;
      const priceLabel = product.price1Label ?? '';
      const priceStr = price ? `${price}€${priceLabel ? ` (${priceLabel})` : ''}` : null;

      // Map allergen IDs to enum values
      const allergens = product.allergens
        .map((id) => ALLERGEN_MAP[id])
        .filter((a): a is Allergen => !!a);

      // Get category name for context
      const category = categoryMap.get(product.categoryId);

      return {
        name_original: product.label,
        name_translations: {
          fr: product.label,
          en: product.label,
          tr: product.label,
          de: product.label,
        },
        description_original: product.description ?? null,
        description_translations: product.description
          ? {
              fr: product.description,
              en: product.description,
              tr: product.description,
              de: product.description,
            }
          : null,
        price: priceStr,
        allergens: allergens.length > 0 ? allergens : [],
        dietary_tags: [],
        trust_signal: 'verified' as const,
      };
    });

  // Build a text summary for cache storage
  const rawText = data.products
    .filter((p) => p.status === 'ENABLED')
    .map((p) => `${p.label}: ${p.description ?? ''} - ${p.price1 ?? ''}€`)
    .join('\n');

  return { dishes, rawText };
}
