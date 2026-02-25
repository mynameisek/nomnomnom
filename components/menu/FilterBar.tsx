'use client';
// =============================================================================
// FilterBar — sticky horizontal chip filter bar (dietary + allergen exclusion)
// =============================================================================
// Two groups separated by a subtle vertical divider:
//   1. Dietary positives: vegetarian, vegan, spicy (AND inclusion)
//   2. Allergen exclusions: 7 most common (OR exclusion)
// Active chip: warm orange. Inactive chip: neutral muted.
// Sticky below nav, horizontal scroll on mobile, backdrop blur.
// =============================================================================

import { useLanguage } from '@/lib/i18n';
import type { FilterState } from '@/hooks/useFilteredDishes';
import type { DietaryTag, Allergen } from '@/lib/types/menu';

interface FilterBarProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}

const DIETARY_TAGS: DietaryTag[] = ['vegetarian', 'vegan', 'spicy'];

const ALLERGEN_EXCLUSIONS: Allergen[] = [
  'gluten',
  'dairy',
  'nuts',
  'peanuts',
  'eggs',
  'fish',
  'shellfish',
];

export default function FilterBar({ filters, onChange }: FilterBarProps) {
  const { t } = useLanguage();

  function toggleDietary(tag: DietaryTag) {
    const active = filters.dietaryTags.includes(tag);
    onChange({
      ...filters,
      dietaryTags: active
        ? filters.dietaryTags.filter((d) => d !== tag)
        : [...filters.dietaryTags, tag],
    });
  }

  function toggleAllergen(allergen: Allergen) {
    const active = filters.excludeAllergens.includes(allergen);
    onChange({
      ...filters,
      excludeAllergens: active
        ? filters.excludeAllergens.filter((a) => a !== allergen)
        : [...filters.excludeAllergens, allergen],
    });
  }

  return (
    <div className="sticky top-16 z-10 bg-brand-bg/90 backdrop-blur-sm border-b border-white/5">
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-3 items-center">
        {/* Dietary filter chips */}
        {DIETARY_TAGS.map((tag) => {
          const isActive = filters.dietaryTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleDietary(tag)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isActive
                  ? 'bg-brand-orange/15 border-brand-orange/30 text-brand-orange'
                  : 'bg-white/5 border-white/10 text-brand-muted hover:bg-white/8'
              }`}
            >
              {t(`filter_${tag}`)}
            </button>
          );
        })}

        {/* Divider between dietary and allergen groups */}
        <div className="flex-shrink-0 w-px h-5 bg-white/10 mx-1" />

        {/* Allergen exclusion chips */}
        {ALLERGEN_EXCLUSIONS.map((allergen) => {
          const isActive = filters.excludeAllergens.includes(allergen);
          return (
            <button
              key={allergen}
              type="button"
              onClick={() => toggleAllergen(allergen)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isActive
                  ? 'bg-brand-orange/15 border-brand-orange/30 text-brand-orange'
                  : 'bg-white/5 border-white/10 text-brand-muted hover:bg-white/8'
              }`}
            >
              {t(`filter_no_${allergen}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
