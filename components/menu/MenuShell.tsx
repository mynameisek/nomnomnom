'use client';
// =============================================================================
// MenuShell — client coordinator: language + filter state
// =============================================================================
// Wraps everything in LanguageProvider. Holds FilterState, passes to FilterBar.
// Delegates filtered item computation to useFilteredDishes hook.
// Renders:
//   - Header (restaurant name, source badge, dish count, LangSwitcher)
//   - AllergenBanner (always visible)
//   - FilterBar (sticky)
//   - Conditional content:
//       - No active filters → MenuAccordion (section accordion view)
//       - Filters active + results → flat animated list (AnimatePresence + motion)
//       - Filters active + no results → empty state + clear-filters button
// =============================================================================

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LanguageProvider, useLanguage } from '@/lib/i18n';
import { useFilteredDishes } from '@/hooks/useFilteredDishes';
import type { FilterState } from '@/hooks/useFilteredDishes';
import type { MenuWithItems } from '@/lib/types/menu';
import AllergenBanner from '@/components/menu/AllergenBanner';
import FilterBar from '@/components/menu/FilterBar';
import DishCard from '@/components/menu/DishCard';
import LangSwitcher from '@/components/menu/LangSwitcher';
import MenuAccordion from '@/components/menu/MenuAccordion';

// ─── Source badge ─────────────────────────────────────────────────────────────

function SourceBadge({ sourceType }: { sourceType: string | null }) {
  const labels: Record<string, string> = {
    url: 'URL scan',
    photo: 'Photo scan',
    qr: 'QR scan',
  };
  const label = sourceType ? (labels[sourceType] ?? sourceType) : 'Unknown source';
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-brand-muted text-xs font-medium">
      {label}
    </span>
  );
}

// ─── Inner content (must be inside LanguageProvider to use useLanguage) ───────

interface MenuContentProps {
  menu: MenuWithItems;
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
}

const EMPTY_FILTERS: FilterState = { dietaryTags: [], excludeAllergens: [] };

function MenuContent({ menu, filters, onFiltersChange }: MenuContentProps) {
  const { t } = useLanguage();

  const filteredItems = useFilteredDishes(menu.menu_items, filters);
  const hasActiveFilters =
    filters.dietaryTags.length > 0 || filters.excludeAllergens.length > 0;

  const restaurantName = menu.restaurant_name ?? 'Menu';
  // Interpolate count into menu_header template
  const headerText = t('menu_header').replace('{count}', String(menu.menu_items.length));

  return (
    <>
      {/* Header */}
      <div className="px-4 pt-8 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <SourceBadge sourceType={menu.source_type} />
            </div>
            <h1 className="text-2xl font-bold text-brand-white mb-1 truncate">
              {restaurantName}
            </h1>
            <p className="text-brand-muted text-sm">{headerText}</p>
          </div>
          {/* Language switcher — right-aligned in header */}
          <div className="flex-shrink-0 mt-1">
            <LangSwitcher />
          </div>
        </div>
      </div>

      {/* Allergen disclaimer — always visible */}
      <div className="px-4 pb-3">
        <AllergenBanner />
      </div>

      {/* Sticky filter bar */}
      <FilterBar filters={filters} onChange={onFiltersChange} />

      {/* Content area */}
      <div className="px-4 pt-4 pb-10">
        {hasActiveFilters ? (
          filteredItems.length === 0 ? (
            /* Empty filter state */
            <div className="flex flex-col items-center py-16 gap-4 text-center">
              <p className="text-4xl">&#127869;</p>
              <p className="text-brand-muted text-sm">{t('empty_filters')}</p>
              <button
                type="button"
                onClick={() => onFiltersChange(EMPTY_FILTERS)}
                className="px-4 py-2 rounded-xl bg-brand-orange/10 border border-brand-orange/20 text-brand-orange text-sm font-medium hover:bg-brand-orange/15 transition-colors"
              >
                {t('clear_filters')}
              </button>
            </div>
          ) : (
            /* Flat animated list when filters are active */
            <div className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {filteredItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                  >
                    <DishCard item={item} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
        ) : (
          /* No active filters — full accordion */
          <MenuAccordion items={menu.menu_items} />
        )}
      </div>

      {/* Footer */}
      <p className="text-brand-muted/40 text-xs text-center pb-8">
        Dish data parsed by NOM AI — translations may vary
      </p>
    </>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

interface MenuShellProps {
  menu: MenuWithItems;
}

export default function MenuShell({ menu }: MenuShellProps) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  return (
    <LanguageProvider>
      <MenuContent menu={menu} filters={filters} onFiltersChange={setFilters} />
    </LanguageProvider>
  );
}
