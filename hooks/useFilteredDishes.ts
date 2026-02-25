'use client';
// =============================================================================
// useFilteredDishes — client-side dish filtering hook
// =============================================================================
// Filter logic:
//   Dietary (AND inclusion): dish must have ALL active dietary tags
//   Allergen exclusion (OR exclusion): dish must NOT have ANY excluded allergen
//   Both filters stack (AND): dish must pass both checks to be shown
// Returns all items unchanged when no filters are active.
//
// useMemo kept intentionally (React 19 compiler auto-memoizes many values, but
// explicit dependency array is clearer intent for array filtering operations).
// =============================================================================

import { useMemo } from 'react';
import type { MenuItem, DietaryTag, Allergen } from '@/lib/types/menu';

/** Active filter state — passed to useFilteredDishes */
export type FilterState = {
  /** Dietary tags the dish must ALL have (AND logic) — e.g. ['vegetarian'] */
  dietaryTags: DietaryTag[];
  /** Allergens the dish must NOT contain ANY of (OR exclusion) — e.g. ['gluten', 'dairy'] */
  excludeAllergens: Allergen[];
};

/**
 * useFilteredDishes — returns items matching all active dietary tags
 * AND excluding all selected allergens.
 *
 * @param items - Full list of MenuItem objects from the menu
 * @param filters - Active filter state (dietaryTags + excludeAllergens)
 * @returns Filtered array of MenuItem — memoized with useMemo
 */
export function useFilteredDishes(items: MenuItem[], filters: FilterState): MenuItem[] {
  return useMemo(() => {
    return items.filter((item) => {
      // Dietary filter: item must have every active dietary tag (AND logic)
      if (filters.dietaryTags.length > 0) {
        const hasAll = filters.dietaryTags.every((tag) =>
          item.dietary_tags.includes(tag)
        );
        if (!hasAll) return false;
      }

      // Allergen exclusion: item must not contain any excluded allergen
      if (filters.excludeAllergens.length > 0) {
        const hasExcluded = filters.excludeAllergens.some((allergen) =>
          item.allergens.includes(allergen)
        );
        if (hasExcluded) return false;
      }

      return true;
    });
  }, [items, filters]);
}
