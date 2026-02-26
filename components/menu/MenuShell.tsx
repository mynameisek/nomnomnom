'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LanguageProvider, useLanguage } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import { useFilteredDishes } from '@/hooks/useFilteredDishes';
import type { FilterState } from '@/hooks/useFilteredDishes';
import type { MenuWithItems, MenuItem } from '@/lib/types/menu';
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
  isTranslating: boolean;
}

const EMPTY_FILTERS: FilterState = {
  searchQuery: '',
  categoryFilter: null,
  dietaryTags: [],
  excludeAllergens: [],
};

function MenuContent({ menu, filters, onFiltersChange, isTranslating }: MenuContentProps) {
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

      {/* Lazy translation indicator */}
      {isTranslating && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-orange/5 border border-brand-orange/15">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-brand-orange border-t-transparent animate-spin flex-shrink-0" />
            <span className="text-brand-orange/80 text-xs font-medium">{t('translating')}</span>
          </div>
        </div>
      )}

      {/* Filter bar with search + categories + dietary + allergens */}
      <FilterBar filters={filters} onChange={onFiltersChange} categories={categories} />

      {/* Result count */}
      {hasActiveFilters && filteredItems.length > 0 && (
        <div className="px-4 pt-3">
          <p className="text-brand-muted text-xs">
            {filters.searchQuery.trim()
              ? t('search_results')
                  .replace('{count}', String(filteredItems.length))
                  .replace('{query}', filters.searchQuery.trim())
              : t('filter_results').replace('{count}', String(filteredItems.length))}
          </p>
        </div>
      )}

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

/**
 * Inner component that has access to LanguageProvider context.
 * Handles lazy translation triggering based on user's language.
 */
function MenuShellInner({ menu: initialMenu }: MenuShellProps) {
  const { lang } = useLanguage();
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [menuData, setMenuData] = useState<MenuWithItems>(initialMenu);
  const [isTranslating, setIsTranslating] = useState(false);
  const translatedLangs = useRef(new Set<Lang>());
  const menuItemsRef = useRef(initialMenu.menu_items);
  const menuIdRef = useRef(initialMenu.id);
  const sourceLangRef = useRef(initialMenu.source_language);

  // Keep refs in sync with state
  useEffect(() => {
    menuItemsRef.current = menuData.menu_items;
    menuIdRef.current = menuData.id;
  }, [menuData]);

  // Trigger translation when language changes or on mount
  useEffect(() => {
    const targetLang = lang;
    const items = menuItemsRef.current;

    // Skip if no items to translate
    if (items.length === 0) return;

    if (translatedLangs.current.has(targetLang)) return;

    // Skip if menu source language matches — name_original is already in user's lang
    if (sourceLangRef.current === targetLang) {
      translatedLangs.current.add(targetLang);
      return;
    }

    // Check if translations already exist for this lang
    const hasTranslation = items.length > 0 &&
      items.every((item) => item.name_translations[targetLang]);

    if (hasTranslation) {
      translatedLangs.current.add(targetLang);
      return;
    }

    let cancelled = false;
    setIsTranslating(true);

    fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menuId: menuIdRef.current, lang: targetLang }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.items) return;
        setMenuData((prev) => ({
          ...prev,
          menu_items: data.items as MenuItem[],
        }));
        translatedLangs.current.add(targetLang);
      })
      .catch((err) => {
        if (!cancelled) console.error('[MenuShell] Translation failed:', err);
      })
      .finally(() => {
        if (!cancelled) setIsTranslating(false);
      });

    return () => { cancelled = true; };
  }, [lang]); // only re-run when lang changes

  return (
    <MenuContent
      menu={menuData}
      filters={filters}
      onFiltersChange={setFilters}
      isTranslating={isTranslating}
    />
  );
}

export default function MenuShell({ menu }: MenuShellProps) {
  return (
    <LanguageProvider>
      <MenuShellInner menu={menu} />
    </LanguageProvider>
  );
}
