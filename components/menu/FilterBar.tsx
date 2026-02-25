'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import type { FilterState } from '@/hooks/useFilteredDishes';
import type { DietaryTag, Allergen } from '@/lib/types/menu';

interface FilterBarProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  categories: string[];
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

export default function FilterBar({ filters, onChange, categories }: FilterBarProps) {
  const { t } = useLanguage();
  const [allergensOpen, setAllergensOpen] = useState(false);

  function updateFilter(partial: Partial<FilterState>) {
    onChange({ ...filters, ...partial });
  }

  function toggleDietary(tag: DietaryTag) {
    const active = filters.dietaryTags.includes(tag);
    updateFilter({
      dietaryTags: active
        ? filters.dietaryTags.filter((d) => d !== tag)
        : [...filters.dietaryTags, tag],
    });
  }

  function toggleAllergen(allergen: Allergen) {
    const active = filters.excludeAllergens.includes(allergen);
    updateFilter({
      excludeAllergens: active
        ? filters.excludeAllergens.filter((a) => a !== allergen)
        : [...filters.excludeAllergens, allergen],
    });
  }

  const hasActiveAllergens = filters.excludeAllergens.length > 0;

  return (
    <div className="sticky top-0 z-10 bg-brand-bg/95 backdrop-blur-sm border-b border-white/5">
      {/* Row 1: Search */}
      <div className="px-4 pt-3 pb-2">
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) => updateFilter({ searchQuery: e.target.value })}
          placeholder={t('search_placeholder')}
          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-brand-white text-sm placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-orange/30 transition-colors"
        />
      </div>

      {/* Row 2: Category chips + dietary chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-2 items-center">
        {/* Category: All */}
        <button
          type="button"
          onClick={() => updateFilter({ categoryFilter: null })}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            filters.categoryFilter === null
              ? 'bg-brand-orange/15 border-brand-orange/30 text-brand-orange'
              : 'bg-white/5 border-white/10 text-brand-muted hover:bg-white/8'
          }`}
        >
          {t('category_all')}
        </button>

        {/* Category chips from menu sections */}
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() =>
              updateFilter({ categoryFilter: filters.categoryFilter === cat ? null : cat })
            }
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filters.categoryFilter === cat
                ? 'bg-brand-orange/15 border-brand-orange/30 text-brand-orange'
                : 'bg-white/5 border-white/10 text-brand-muted hover:bg-white/8'
            }`}
          >
            {cat}
          </button>
        ))}

        {/* Divider */}
        <div className="flex-shrink-0 w-px h-5 bg-white/10 mx-1" />

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

        {/* Divider */}
        <div className="flex-shrink-0 w-px h-5 bg-white/10 mx-1" />

        {/* Allergens expandable toggle */}
        <button
          type="button"
          onClick={() => setAllergensOpen(!allergensOpen)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${
            hasActiveAllergens
              ? 'bg-brand-orange/15 border-brand-orange/30 text-brand-orange'
              : 'bg-white/5 border-white/10 text-brand-muted hover:bg-white/8'
          }`}
        >
          {t('filter_allergens')}
          {hasActiveAllergens && (
            <span className="bg-brand-orange/30 text-brand-orange px-1.5 rounded-full text-xs">
              {filters.excludeAllergens.length}
            </span>
          )}
          <svg
            className={`w-3 h-3 transition-transform ${allergensOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Row 3: Allergen exclusion chips (expandable) */}
      {allergensOpen && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-3 items-center">
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
      )}
    </div>
  );
}
