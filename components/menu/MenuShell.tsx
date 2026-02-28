'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LanguageProvider, useLanguage } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import { useFilteredDishes } from '@/hooks/useFilteredDishes';
import type { FilterState } from '@/hooks/useFilteredDishes';
import type { MenuWithItems, MenuItem } from '@/lib/types/menu';
import { useEnrichmentPolling } from '@/hooks/useEnrichmentPolling';
import AllergenBanner from '@/components/menu/AllergenBanner';
import FilterBar from '@/components/menu/FilterBar';
import DishCard from '@/components/menu/DishCard';
import LangSwitcher from '@/components/menu/LangSwitcher';
import MenuAccordion from '@/components/menu/MenuAccordion';
import RestaurantCard from '@/components/menu/RestaurantCard';
import DishDetailSheet from '@/components/menu/DishDetailSheet';

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
  categoryTranslations: Record<string, string>;
  onTapDetail: (item: MenuItem) => void;
}

const EMPTY_FILTERS: FilterState = {
  searchQuery: '',
  categoryFilter: null,
  dietaryTags: [],
  excludeAllergens: [],
};

function MenuContent({ menu, filters, onFiltersChange, isTranslating, categoryTranslations, onTapDetail }: MenuContentProps) {
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

  const headerText = t('menu_header').replace('{count}', String(menu.menu_items.length));

  return (
    <>
      {/* Header */}
      <div className="px-4 pt-8 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <SourceBadge sourceType={menu.source_type} />
              <a
                href="/scan"
                className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-brand-muted text-xs font-medium hover:text-brand-orange hover:border-brand-orange/30 transition-colors"
              >
                + {t('scan_another')}
              </a>
            </div>
            <RestaurantCard menu={menu} />
            <p className="text-brand-muted text-sm mt-1">{headerText}</p>
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
      <FilterBar filters={filters} onChange={onFiltersChange} categories={categories} categoryTranslations={categoryTranslations} />

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
                    <DishCard item={item} showAllergens={hasActiveAllergenFilters} onTapDetail={onTapDetail} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
        ) : (
          <MenuAccordion items={menu.menu_items} categoryTranslations={categoryTranslations} onTapDetail={onTapDetail} />
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
  const [detailDish, setDetailDish] = useState<MenuItem | null>(null);
  const catTranslationsRef = useRef<Record<string, Record<string, string>>>({});
  const [catTranslations, setCatTranslations] = useState<Record<string, string>>({});
  const translatedLangs = useRef(new Set<Lang>());
  const menuItemsRef = useRef(initialMenu.menu_items);
  const menuIdRef = useRef(initialMenu.id);
  const sourceLangRef = useRef(initialMenu.source_language);

  // Polling hook: progressively updates enrichment fields on food items.
  // Uses menuData.menu_items as the base so translation updates are visible.
  // The hook merges enrichment fields (from polling) on top of whatever the
  // current translation state is. This avoids polling restart on lang change
  // because we only pass menuId (stable) and initialItems (used only for
  // hasPendingFoodItems check + initial state).
  const enrichedItems = useEnrichmentPolling(initialMenu.id, initialMenu.menu_items);

  // Merge enrichment fields from polling onto the current translation state.
  // Enrichment fields don't overlap with translation fields, so a simple Object.spread
  // works: translation updates win for name/desc fields; enrichment polling wins for
  // enrichment_* fields.
  const mergedItems = useMemo(() => {
    const enrichmentById = new Map(enrichedItems.map(i => [i.id, i]));
    return menuData.menu_items.map(item => {
      const enriched = enrichmentById.get(item.id);
      if (!enriched) return item;
      return {
        ...item,
        enrichment_status: enriched.enrichment_status,
        enrichment_origin: enriched.enrichment_origin,
        enrichment_ingredients: enriched.enrichment_ingredients,
        enrichment_cultural_note: enriched.enrichment_cultural_note,
        enrichment_eating_tips: enriched.enrichment_eating_tips,
        enrichment_depth: enriched.enrichment_depth,
        enrichment_model: enriched.enrichment_model,
        enriched_at: enriched.enriched_at,
        // Enrichment translations — merge both sources: translate API (item) + polling (enriched)
        // Translate API writes per-lang keys; polling returns the DB state at poll time.
        // Spread item first (has fresh translations), then enriched (may have newer enrichment data).
        enrichment_translations: {
          ...(enriched.enrichment_translations ?? {}),
          ...(item.enrichment_translations ?? {}),
        },
        // Image fields — added for Phase 12 image display
        image_url: enriched.image_url,
        image_source: enriched.image_source,
        image_credit: enriched.image_credit,
        image_credit_url: enriched.image_credit_url,
        image_placeholder: enriched.image_placeholder,
      };
    });
  }, [menuData.menu_items, enrichedItems]);

  // Keep refs in sync with state
  useEffect(() => {
    menuItemsRef.current = menuData.menu_items;
    menuIdRef.current = menuData.id;
  }, [menuData]);

  // Trigger translation when lang changes (including initial mount)
  useEffect(() => {
    const targetLang = lang;
    const items = menuItemsRef.current;

    // Skip if no items to translate
    if (items.length === 0) return;

    if (translatedLangs.current.has(targetLang)) {
      setCatTranslations(catTranslationsRef.current[targetLang] ?? {});
      return;
    }

    // Skip if menu source language matches — name_original is already in user's lang
    if (sourceLangRef.current === targetLang) {
      translatedLangs.current.add(targetLang);
      setCatTranslations({});
      setIsTranslating(false);
      return;
    }

    // Load stored category translations for this lang if available
    const storedCatTrans = (initialMenu.category_translations ?? {}) as Record<string, Record<string, string>>;
    const catTransForLang = storedCatTrans[targetLang];

    // Check if translations already exist for this lang
    // Guard against stale data where "translations" are just the original text copied verbatim
    const hasTranslation = items.length > 0 &&
      items.every((item) => item.name_translations[targetLang]) &&
      !items.every((item) => item.name_translations[targetLang] === item.name_original);

    if (hasTranslation && catTransForLang) {
      // Items and categories both translated — nothing to do
      translatedLangs.current.add(targetLang);
      catTranslationsRef.current[targetLang] = catTransForLang;
      setCatTranslations(catTransForLang);
      setIsTranslating(false);
      return;
    }

    if (hasTranslation) {
      // Items translated but categories missing — still need to call API for categories
      // (e.g. eazee-link menus where items arrive pre-translated but categories don't)
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
        if (data.categoryTranslations) {
          catTranslationsRef.current[targetLang] = data.categoryTranslations as Record<string, string>;
          setCatTranslations(data.categoryTranslations as Record<string, string>);
        }
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

  // Build the merged menu to pass to MenuContent
  const mergedMenu = useMemo(() => ({
    ...menuData,
    menu_items: mergedItems,
  }), [menuData, mergedItems]);

  return (
    <>
      <MenuContent
        menu={mergedMenu}
        filters={filters}
        onFiltersChange={setFilters}
        isTranslating={isTranslating}
        categoryTranslations={catTranslations}
        onTapDetail={setDetailDish}
      />
      <DishDetailSheet
        item={detailDish}
        isOpen={!!detailDish}
        onClose={() => setDetailDish(null)}
      />
    </>
  );
}

export default function MenuShell({ menu }: MenuShellProps) {
  return (
    <LanguageProvider>
      <MenuShellInner menu={menu} />
    </LanguageProvider>
  );
}
