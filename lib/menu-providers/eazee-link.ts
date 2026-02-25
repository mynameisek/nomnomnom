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

  // Build category lookup with parent→child hierarchy
  const categoryMap = new Map<number, EazeeCategory>();
  for (const cat of data.categories) {
    categoryMap.set(cat.categoryId, cat);
  }

  // Resolve the display category for a product.
  // Strategy: use the most specific (deepest) category as the display name.
  // Generic parents like "La carte" are skipped — their children become top-level.
  // 3-level example: "Boissons" → "Bières" → "Bières à la pression"
  //   → category = "Bières", subcategory = "Bières à la pression"
  // 2-level example: "La carte" → "Entrée"
  //   → category = "Entrée", subcategory = null
  // 1-level example: "Nouveautés & suggestions"
  //   → category = "Nouveautés & suggestions", subcategory = null
  function resolveCategory(categoryId: number): { category: string | null; subcategory: string | null } {
    const cat = categoryMap.get(categoryId);
    if (!cat) return { category: null, subcategory: null };

    // Walk up the tree to build the chain: [root, ..., leaf]
    const chain: EazeeCategory[] = [cat];
    let current = cat;
    while (current.parentId) {
      const parent = categoryMap.get(current.parentId);
      if (!parent) break;
      chain.unshift(parent);
      current = parent;
    }

    if (chain.length === 1) {
      // Root-level category (e.g. "Nouveautés & suggestions")
      return { category: chain[0].label, subcategory: null };
    }
    if (chain.length === 2) {
      // 2-level: parent → child. Use child as category (skip generic parent).
      return { category: chain[1].label, subcategory: null };
    }
    // 3+ levels: use second-to-last as category, last as subcategory
    return { category: chain[chain.length - 2].label, subcategory: chain[chain.length - 1].label };
  }

  // Build sort key preserving full hierarchy order.
  // Each level contributes: root_order * 1000000 + mid_order * 1000 + leaf_order
  function categorySort(categoryId: number): number {
    const cat = categoryMap.get(categoryId);
    if (!cat) return 999000000;

    const chain: EazeeCategory[] = [cat];
    let current = cat;
    while (current.parentId) {
      const parent = categoryMap.get(current.parentId);
      if (!parent) break;
      chain.unshift(parent);
      current = parent;
    }

    let sort = 0;
    for (let i = 0; i < chain.length; i++) {
      sort += chain[i].order * Math.pow(1000, chain.length - 1 - i);
    }
    return sort;
  }

  // Convert and sort by category hierarchy
  const enabledProducts = data.products.filter((p) => p.status === 'ENABLED');
  enabledProducts.sort((a, b) => categorySort(a.categoryId) - categorySort(b.categoryId));

  const dishes: DishResponse[] = enabledProducts.map((product) => {
    const price = product.price1 ?? product.price2 ?? product.price3 ?? null;
    const priceLabel = product.price1Label ?? '';
    const priceStr = price ? `${price}€${priceLabel ? ` (${priceLabel})` : ''}` : null;

    const allergens = product.allergens
      .map((id) => ALLERGEN_MAP[id])
      .filter((a): a is Allergen => !!a);

    const { category, subcategory } = resolveCategory(product.categoryId);

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
      category,
      subcategory,
    };
  });

  // Build a text summary for cache storage
  const rawText = data.products
    .filter((p) => p.status === 'ENABLED')
    .map((p) => `${p.label}: ${p.description ?? ''} - ${p.price1 ?? ''}€`)
    .join('\n');

  return { dishes, rawText };
}
