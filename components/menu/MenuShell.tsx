'use client';

import { useMemo, useState } from 'react';
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

interface MenuContentProps {
  menu: MenuWithItems;
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
}

const EMPTY_FILTERS: FilterState = {
  searchQuery: '',
  categoryFilter: null,
  dietaryTags: [],
  excludeAllergens: [],
};

function MenuContent({ menu, filters, onFiltersChange }: MenuContentProps) {
  const { t } = useLanguage();

  const filteredItems = useFilteredDishes(menu.menu_items, filters);
  const hasActiveFilters =
    filters.searchQuery.trim() !== '' ||
    filters.categoryFilter !== null ||
    filters.dietaryTags.length > 0 ||
    filters.excludeAllergens.length > 0;

  const hasActiveAllergenFilters = filters.excludeAllergens.length > 0;

  // Extract unique categories from menu items, preserving menu order
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const cats: string[] = [];
    for (const item of menu.menu_items) {
      const cat = item.category ?? 'Autres';
      if (!seen.has(cat)) {
        seen.add(cat);
        cats.push(cat);
      }
    }
    return cats;
  }, [menu.menu_items]);

  const restaurantName = menu.restaurant_name ?? 'Menu';
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
          <div className="flex-shrink-0 mt-1">
            <LangSwitcher />
          </div>
        </div>
      </div>

      {/* Allergen disclaimer */}
      <div className="px-4 pb-3">
        <AllergenBanner />
      </div>

      {/* Filter bar with search + categories + dietary + allergens */}
      <FilterBar filters={filters} onChange={onFiltersChange} categories={categories} />

      {/* Content area */}
      <div className="px-4 pt-4 pb-10">
        {hasActiveFilters ? (
          filteredItems.length === 0 ? (
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
                    <DishCard item={item} showAllergens={hasActiveAllergenFilters} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
        ) : (
          <MenuAccordion items={menu.menu_items} />
        )}
      </div>

      <p className="text-brand-muted/40 text-xs text-center pb-8">
        Dish data parsed by NOM AI — translations may vary
      </p>
    </>
  );
}

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
