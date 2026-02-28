# Phase 6: Dish Cards and Filters - Research

**Researched:** 2026-02-25
**Domain:** Client-side i18n (no library), React filtering with useMemo/useState, dish card UI, sticky filter bar, Motion animation, allergen/trust badge display
**Confidence:** HIGH (codebase investigated directly; all data types verified from source; filtering and i18n patterns verified from official docs and working examples)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Allergen disclaimer
- Single discreet banner at the top of the menu page — not repeated per card
- Light tone, not alarming — e.g. "Les informations sur les allergenes sont indicatives — confirmez aupres du serveur" (localized per display language)
- Never use green/"safe" indicators anywhere in allergen presentation

#### Language switching
- Auto-detect from browser language on first visit to /menu/[id]
- Small globe icon in the header for manual override (FR/EN/TR/DE)
- Language choice persisted (localStorage) across sessions
- Translations are page-wide, not per-card toggle

### Claude's Discretion
- **Card layout:** Translated name prominent, original name secondary (for ordering at restaurant). Claude decides exact hierarchy, spacing, typography
- **Visual density:** Claude picks the best mobile-first approach — likely full cards with all info visible (name, description, price, allergens, trust badge) since tap-to-expand adds friction on a menu people scan quickly
- **Allergen tag colors:** Neutral or warm-toned chips — no green, no color that implies "safe". Claude picks the palette
- **Trust badge design:** "Verified Menu" vs "Inferred" presentation — Claude decides badge style, placement, and visual weight
- **Filter placement:** Claude decides — likely sticky horizontal chips bar below header (most mobile-friendly pattern for dietary toggles)
- **Empty filter state:** Claude decides what to show when no dishes match active filters
- **Price display:** Claude decides formatting and currency handling

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DISH-01 | User sees a dish card for each item with translated name, description, and price | `MenuItem.name_translations`, `description_translations`, `price` fields already in DB — read active language from `useLanguage()` hook |
| DISH-02 | Dish cards show translation in 4 languages (FR/EN/TR/DE) | `TranslationMap` type has `fr/en/tr/de` keys — custom `useLanguage` hook reads from localStorage, falls back to `navigator.language` |
| DISH-03 | Each dish card displays a trust badge (Verified Menu / Inferred) | `MenuItem.trust_signal` is `'verified' \| 'inferred'` — existing `TrustBadge` component already built in MenuAccordion.tsx, needs redesign per constraints |
| DISH-04 | Each dish card shows detected allergens (EU 14 allergens) with warning badge | `MenuItem.allergens: Allergen[]` — 14 allergen values are English keys; localized label lookup table needed in i18n dictionaries |
| DISH-05 | Allergen display always includes mandatory disclaimer ("demandez au serveur") in user's language | Single banner at top of menu page (not per-card) — locked decision; translated via `useLanguage` + dictionary |
| DISH-06 | Each dish card shows dietary tags (végétarien, végan, épicé) | `MenuItem.dietary_tags: DietaryTag[]` — currently `'vegetarian' \| 'vegan' \| 'halal'`; "épicé" (spicy) not in schema — note for planner |
| FILT-01 | User can filter dishes by dietary preference (végétarien, végan) | Client-side: `useState` for active filters + inline `.filter()` on `items` array — no API needed |
| FILT-02 | User can filter dishes by allergen exclusion (gluten, nuts, dairy, etc.) | Client-side: filter items where `item.allergens` does NOT include selected exclusion allergens |
| FILT-03 | User can filter dishes by spice level | Spice level must come from `dietary_tags` — "spicy" tag not currently in schema; filtering would use `item.dietary_tags.includes('spicy')` |
| FILT-04 | Filters apply instantly (client-side, no API call) | `useMemo` or inline `.filter()` on local state — React re-render is instant; no API call path exists |
</phase_requirements>

---

## Summary

Phase 6 is a pure UI phase: all data is already in Supabase and the type system is fully defined. The work is presenting that data well. Three distinct technical domains need to be solved: (1) a lightweight client-side i18n system that auto-detects the browser language and persists manual overrides in localStorage — **without any i18n library**; (2) a client-side filtering system that is instant, stacks multiple active filters, and applies to the complete flat dish array before the accordion/card layout re-renders; (3) the visual design of dish cards, allergen chips, trust badges, filter chips, and the sticky filter bar.

The existing `MenuAccordion.tsx` component must be refactored or replaced. It currently shows `name_original` (not translated), has a basic `TrustBadge` that violates the "no green for allergens" constraint, shows `name_original` prominently (should be translation), and doesn't support filtering or language switching. The accordion structure (category sections) should be preserved since it organizes dishes well, but the data flow must become client-side-reactive to language and filter state.

**Critical schema gap discovered:** `DISH-06` requires "épicé" (spicy) and `FILT-03` requires spice level filtering, but the current `DietaryTag` type only includes `'vegetarian' | 'vegan' | 'halal'`. Since `dietary_tags` is stored as `text[]` (not an enum), adding `'spicy'` is a non-breaking DB change. However, the LLM prompt (Phase 5) must also be updated to detect and output the `'spicy'` tag. The planner needs to address this gap.

**Primary recommendation:** Implement a `LanguageProvider` React Context wrapping `/menu/[id]/page.tsx`'s client shell, a `useLanguage()` hook, a 4-language flat dictionary object in `lib/i18n/`, and a `useFilteredDishes()` hook that returns memoized filtered results. No additional npm packages are required.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.3 | `useState`, `useMemo`, `useContext`, `useEffect` — all filtering and i18n hooks | Already in project; React 19 compiler auto-memoizes where safe |
| `motion` | 12.34.3 | `AnimatePresence` + `layout` for smooth filter transitions | Already installed; no extra install needed |
| Tailwind CSS | v4 | Utility styling; `sticky`, `overflow-x-auto`, `no-scrollbar` | Already in project with custom brand tokens |

### No New Libraries Needed

All requirements can be satisfied with the existing stack. The i18n system is simple enough (4 languages, ~30 UI strings, data translations already in DB) that adding `next-intl` or `i18next` would be overengineering. The filtering is pure JavaScript array operations.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom `useLanguage()` hook + flat dictionary | `next-intl` | next-intl requires middleware rewrite, route restructuring (`/[locale]/menu/[id]`), and adds bundle weight. Overkill for 4 languages and ~30 strings. Custom hook is 40 lines. |
| Custom `useLanguage()` hook + flat dictionary | `i18next` + `react-i18next` | Same: heavy dependency for a simple static translation table |
| Inline `.filter()` in render | `react-query` filter invalidation | Filtering is pure client-side; no server state involved; inline filter is correct |
| `motion` `AnimatePresence` | CSS transitions only | CSS `display: none` doesn't animate. Motion is already installed and handles the height-collapse correctly |

**Installation:**
```bash
# No new packages needed — all dependencies already installed
```

---

## Architecture Patterns

### Recommended Project Structure

```
app/
└── menu/
    └── [id]/
        └── page.tsx          # Server Component — fetches menu + items from Supabase, passes to client shell

components/
└── menu/
    ├── MenuAccordion.tsx     # EXISTING — refactor or replace
    ├── MenuShell.tsx         # NEW — 'use client' wrapper: holds lang state + filter state
    ├── DishCard.tsx          # NEW — single dish card with translation + allergens + trust badge
    ├── FilterBar.tsx         # NEW — sticky horizontal chip filters (dietary + allergen exclusion)
    └── AllergenBanner.tsx    # NEW — top-of-page disclaimer (localized)

lib/
├── i18n/
│   ├── index.ts              # NEW — useLanguage() hook + LanguageContext
│   └── translations.ts       # NEW — flat dictionary: { fr: {...}, en: {...}, tr: {...}, de: {...} }
└── types/
    └── menu.ts               # EXISTING — MenuItem, TranslationMap, Allergen, DietaryTag
```

### Pattern 1: LanguageProvider + useLanguage Hook

**What:** A React Context that initializes language from localStorage (or `navigator.language` fallback), exposes `lang` + `setLang`, and provides a `t(key)` translation lookup function. All client components in the menu shell read from this context.

**When to use:** Wrap the entire `<MenuShell>` client component with this provider. Server components (including `page.tsx`) do NOT import from this — they pass raw `MenuItem[]` data down.

```typescript
// lib/i18n/index.ts
'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';

export type Lang = 'fr' | 'en' | 'tr' | 'de';
const SUPPORTED: Lang[] = ['fr', 'en', 'tr', 'de'];
const STORAGE_KEY = 'nom_lang';

// Detect browser language — map navigator.language to supported Lang
function detectBrowserLang(): Lang {
  if (typeof window === 'undefined') return 'fr'; // SSR fallback
  const nav = navigator.language?.slice(0, 2).toLowerCase() as Lang;
  return SUPPORTED.includes(nav) ? nav : 'fr'; // default to FR
}

type LanguageContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'fr',
  setLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr'); // SSR-safe initial value

  useEffect(() => {
    // Client-only: read from localStorage, fallback to browser language
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    setLangState(stored && SUPPORTED.includes(stored) ? stored : detectBrowserLang());
  }, []);

  const setLang = (l: Lang) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
  };

  const t = (key: string): string =>
    (translations[lang] as Record<string, string>)[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
```

**SSR safety:** Initial state is `'fr'` (not from localStorage) to avoid hydration mismatch. The `useEffect` corrects it client-side on mount. Since `MenuShell` is `'use client'`, this pattern is safe.

### Pattern 2: Translation Dictionary

**What:** A flat TypeScript object with all UI strings (not dish names — those come from the DB). Dish names/descriptions come from `item.name_translations[lang]` directly. This dictionary covers: allergen disclaimer, dietary tag labels, allergen labels, trust badge labels, filter bar labels, empty state text, and the globe icon language names.

```typescript
// lib/i18n/translations.ts
export const translations = {
  fr: {
    // Allergen banner
    allergen_disclaimer: 'Les informations sur les allergènes sont indicatives — confirmez auprès du serveur.',
    // Trust badge
    trust_verified: 'Menu vérifié',
    trust_inferred: 'Données inférées',
    // Dietary filter chips
    filter_vegetarian: 'Végétarien',
    filter_vegan: 'Végan',
    filter_spicy: 'Épicé',
    // Allergen exclusion filters
    filter_no_gluten: 'Sans gluten',
    filter_no_dairy: 'Sans lactose',
    filter_no_nuts: 'Sans noix',
    filter_no_peanuts: 'Sans arachides',
    filter_no_eggs: 'Sans oeufs',
    filter_no_fish: 'Sans poisson',
    filter_no_shellfish: 'Sans crustacés',
    // Allergen tag labels (on cards)
    allergen_gluten: 'Gluten',
    allergen_dairy: 'Lait',
    allergen_nuts: 'Fruits à coque',
    allergen_peanuts: 'Arachides',
    allergen_soy: 'Soja',
    allergen_eggs: 'Oeufs',
    allergen_fish: 'Poisson',
    allergen_shellfish: 'Crustacés',
    allergen_celery: 'Céleri',
    allergen_mustard: 'Moutarde',
    allergen_sesame: 'Sésame',
    allergen_sulphites: 'Sulfites',
    allergen_lupin: 'Lupin',
    allergen_molluscs: 'Mollusques',
    // Dietary tag labels (on cards)
    tag_vegetarian: 'Végétarien',
    tag_vegan: 'Végan',
    tag_halal: 'Halal',
    tag_spicy: 'Épicé',
    // Empty state
    empty_filters: 'Aucun plat ne correspond à vos filtres.',
    // Language switcher
    lang_fr: 'Français',
    lang_en: 'English',
    lang_tr: 'Türkçe',
    lang_de: 'Deutsch',
  },
  en: {
    allergen_disclaimer: 'Allergen information is indicative — please confirm with the server.',
    trust_verified: 'Verified Menu',
    trust_inferred: 'Inferred Data',
    filter_vegetarian: 'Vegetarian',
    filter_vegan: 'Vegan',
    filter_spicy: 'Spicy',
    filter_no_gluten: 'Gluten-free',
    filter_no_dairy: 'Dairy-free',
    filter_no_nuts: 'Nut-free',
    filter_no_peanuts: 'Peanut-free',
    filter_no_eggs: 'Egg-free',
    filter_no_fish: 'Fish-free',
    filter_no_shellfish: 'Shellfish-free',
    allergen_gluten: 'Gluten',
    allergen_dairy: 'Dairy',
    allergen_nuts: 'Tree nuts',
    allergen_peanuts: 'Peanuts',
    allergen_soy: 'Soy',
    allergen_eggs: 'Eggs',
    allergen_fish: 'Fish',
    allergen_shellfish: 'Shellfish',
    allergen_celery: 'Celery',
    allergen_mustard: 'Mustard',
    allergen_sesame: 'Sesame',
    allergen_sulphites: 'Sulphites',
    allergen_lupin: 'Lupin',
    allergen_molluscs: 'Molluscs',
    tag_vegetarian: 'Vegetarian',
    tag_vegan: 'Vegan',
    tag_halal: 'Halal',
    tag_spicy: 'Spicy',
    empty_filters: 'No dishes match your filters.',
    lang_fr: 'Français',
    lang_en: 'English',
    lang_tr: 'Türkçe',
    lang_de: 'Deutsch',
  },
  tr: {
    allergen_disclaimer: 'Alerjen bilgileri gösterge niteliğindedir — lütfen garsonla teyit edin.',
    trust_verified: 'Doğrulanmış Menü',
    trust_inferred: 'Çıkarılan Veri',
    filter_vegetarian: 'Vejetaryen',
    filter_vegan: 'Vegan',
    filter_spicy: 'Acılı',
    filter_no_gluten: 'Glutensiz',
    filter_no_dairy: 'Süt ürünsüz',
    filter_no_nuts: 'Fındıksız',
    filter_no_peanuts: 'Yerfıstığısız',
    filter_no_eggs: 'Yumurtasız',
    filter_no_fish: 'Balıksız',
    filter_no_shellfish: 'Kabuklu deniz ürünsüz',
    allergen_gluten: 'Gluten',
    allergen_dairy: 'Süt',
    allergen_nuts: 'Sert kabuklu meyveler',
    allergen_peanuts: 'Yerfıstığı',
    allergen_soy: 'Soya',
    allergen_eggs: 'Yumurta',
    allergen_fish: 'Balık',
    allergen_shellfish: 'Kabuklu deniz ürünleri',
    allergen_celery: 'Kereviz',
    allergen_mustard: 'Hardal',
    allergen_sesame: 'Susam',
    allergen_sulphites: 'Sülfitler',
    allergen_lupin: 'Acı bakla',
    allergen_molluscs: 'Yumuşakçalar',
    tag_vegetarian: 'Vejetaryen',
    tag_vegan: 'Vegan',
    tag_halal: 'Helal',
    tag_spicy: 'Acılı',
    empty_filters: 'Filtrelerinizle eşleşen yemek yok.',
    lang_fr: 'Français',
    lang_en: 'English',
    lang_tr: 'Türkçe',
    lang_de: 'Deutsch',
  },
  de: {
    allergen_disclaimer: 'Allergeninformationen sind indikativ — bitte beim Personal bestätigen.',
    trust_verified: 'Verifizierte Speisekarte',
    trust_inferred: 'Abgeleitete Daten',
    filter_vegetarian: 'Vegetarisch',
    filter_vegan: 'Vegan',
    filter_spicy: 'Scharf',
    filter_no_gluten: 'Glutenfrei',
    filter_no_dairy: 'Laktosefrei',
    filter_no_nuts: 'Nussfrei',
    filter_no_peanuts: 'Erdnussfrei',
    filter_no_eggs: 'Eierfrei',
    filter_no_fish: 'Fischfrei',
    filter_no_shellfish: 'Schalentierfrei',
    allergen_gluten: 'Gluten',
    allergen_dairy: 'Milch',
    allergen_nuts: 'Schalenfrüchte',
    allergen_peanuts: 'Erdnüsse',
    allergen_soy: 'Soja',
    allergen_eggs: 'Eier',
    allergen_fish: 'Fisch',
    allergen_shellfish: 'Krebstiere',
    allergen_celery: 'Sellerie',
    allergen_mustard: 'Senf',
    allergen_sesame: 'Sesam',
    allergen_sulphites: 'Sulfite',
    allergen_lupin: 'Lupinen',
    allergen_molluscs: 'Weichtiere',
    tag_vegetarian: 'Vegetarisch',
    tag_vegan: 'Vegan',
    tag_halal: 'Halal',
    tag_spicy: 'Scharf',
    empty_filters: 'Keine Gerichte entsprechen Ihren Filtern.',
    lang_fr: 'Français',
    lang_en: 'English',
    lang_tr: 'Türkçe',
    lang_de: 'Deutsch',
  },
} as const;
```

### Pattern 3: Client-Side Filtering

**What:** A single `useFilteredDishes` hook that takes all `MenuItem[]` and the active filter state, returns filtered items. Filter state = `{ dietaryTags: DietaryTag[]; excludeAllergens: Allergen[] }`. Filters are AND-stacked: a dish must satisfy ALL active filters to be shown.

**Filter logic:**
- Dietary filter (FILT-01, FILT-03): dish must include ALL active dietary tags in its `dietary_tags[]`
- Allergen exclusion (FILT-02): dish must NOT include ANY excluded allergen in its `allergens[]`

```typescript
// hooks/useFilteredDishes.ts
'use client';
import { useMemo } from 'react';
import type { MenuItem, DietaryTag, Allergen } from '@/lib/types/menu';

export type FilterState = {
  dietaryTags: DietaryTag[];   // e.g. ['vegetarian'] — dish must have ALL of these
  excludeAllergens: Allergen[]; // e.g. ['gluten', 'dairy'] — dish must have NONE of these
};

export function useFilteredDishes(items: MenuItem[], filters: FilterState): MenuItem[] {
  return useMemo(() => {
    return items.filter((item) => {
      // Dietary: item must have every active dietary tag
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
```

**React 19 note:** The React 19 compiler in this project auto-memoizes many values, but `useMemo` is still appropriate here since the dependency array is explicit and the operation is a potentially large array filter. Keep `useMemo` — it's clear intent, not premature optimization.

### Pattern 4: MenuShell — Client Coordinator

**What:** The `MenuShell` is the single `'use client'` component that receives `MenuItem[]` from the Server Component `page.tsx`, holds all state (language, active filters), and passes filtered/localized data down to presentation components.

```typescript
// components/menu/MenuShell.tsx
'use client';
import { useState } from 'react';
import { LanguageProvider } from '@/lib/i18n';
import { useFilteredDishes, type FilterState } from '@/hooks/useFilteredDishes';
import type { MenuWithItems, MenuItem } from '@/lib/types/menu';
import { AllergenBanner } from './AllergenBanner';
import { FilterBar } from './FilterBar';
import { MenuAccordion } from './MenuAccordion'; // refactored to accept translated items

interface MenuShellProps {
  menu: MenuWithItems;
}

export function MenuShell({ menu }: MenuShellProps) {
  const [filters, setFilters] = useState<FilterState>({
    dietaryTags: [],
    excludeAllergens: [],
  });

  const filteredItems = useFilteredDishes(menu.menu_items, filters);

  return (
    <LanguageProvider>
      <AllergenBanner />
      <FilterBar filters={filters} onChange={setFilters} />
      <MenuAccordion items={filteredItems} />
    </LanguageProvider>
  );
}
```

**Why this structure:** Putting `LanguageProvider` inside `MenuShell` (not in `layout.tsx`) keeps the language state scoped to the menu page only. Other pages are unaffected. The Server Component `page.tsx` remains a Server Component — no `'use client'` contamination.

### Pattern 5: Sticky Filter Bar (Horizontal Scroll Chips)

**What:** A horizontally scrollable row of filter chips, sticky below the header. Each chip is a toggle. Active chips have a distinct (but non-green) style. Two groups: dietary positives (vegetarian, vegan, spicy) and allergen exclusions (gluten-free, dairy-free, etc.).

```typescript
// components/menu/FilterBar.tsx
'use client';
import { useLanguage } from '@/lib/i18n';
import type { FilterState } from '@/hooks/useFilteredDishes';
import type { DietaryTag, Allergen } from '@/lib/types/menu';

const DIETARY_FILTERS: DietaryTag[] = ['vegetarian', 'vegan']; // 'spicy' pending schema
const ALLERGEN_EXCLUSIONS: Allergen[] = ['gluten', 'dairy', 'nuts', 'peanuts', 'eggs', 'fish', 'shellfish'];

export function FilterBar({ filters, onChange }: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}) {
  const { t } = useLanguage();

  const toggleDietary = (tag: DietaryTag) => {
    const next = filters.dietaryTags.includes(tag)
      ? filters.dietaryTags.filter((t) => t !== tag)
      : [...filters.dietaryTags, tag];
    onChange({ ...filters, dietaryTags: next });
  };

  const toggleAllergen = (allergen: Allergen) => {
    const next = filters.excludeAllergens.includes(allergen)
      ? filters.excludeAllergens.filter((a) => a !== allergen)
      : [...filters.excludeAllergens, allergen];
    onChange({ ...filters, excludeAllergens: next });
  };

  return (
    <div className="sticky top-16 z-10 bg-brand-bg/90 backdrop-blur-sm border-b border-white/5">
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-3">
        {DIETARY_FILTERS.map((tag) => {
          const active = filters.dietaryTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => toggleDietary(tag)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? 'bg-brand-orange/15 border-brand-orange/30 text-brand-orange'
                  : 'bg-white/5 border-white/10 text-brand-muted'
              }`}
            >
              {t(`filter_${tag}`)}
            </button>
          );
        })}
        {/* Subtle divider between dietary and allergen exclusion groups */}
        <div className="flex-shrink-0 w-px bg-white/10 self-stretch mx-1" />
        {ALLERGEN_EXCLUSIONS.map((allergen) => {
          const active = filters.excludeAllergens.includes(allergen);
          return (
            <button
              key={allergen}
              onClick={() => toggleAllergen(allergen)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? 'bg-brand-orange/15 border-brand-orange/30 text-brand-orange'
                  : 'bg-white/5 border-white/10 text-brand-muted'
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
```

**Sticky top offset:** `top-16` (64px) — matches the `pt-16` on `<main>` in `layout.tsx`, placing the filter bar flush below the global nav.

### Pattern 6: Dish Card (Redesigned)

**What:** Full-width card showing: translated name (large, prominent), original name (small, secondary — for ordering), translated description, price, trust badge, dietary tags, allergen chips. All info visible — no tap-to-expand. Mobile-first.

**Card hierarchy (Claude's discretion):**
1. Translated name (large, `brand-white`) — primary read
2. Original name (smaller, `brand-muted`) — for ordering at restaurant
3. Translated description (small, `brand-muted`)
4. Price (right-aligned, `brand-orange`)
5. Trust badge + dietary tags + allergen chips (bottom row)

```typescript
// components/menu/DishCard.tsx
'use client';
import { useLanguage } from '@/lib/i18n';
import type { MenuItem } from '@/lib/types/menu';

export function DishCard({ item }: { item: MenuItem }) {
  const { lang, t } = useLanguage();

  const translatedName = item.name_translations[lang] ?? item.name_original;
  const translatedDesc = item.description_translations?.[lang] ?? item.description_original;

  return (
    <div className="flex flex-col gap-2 px-4 py-3.5 rounded-xl bg-white/5 border border-white/8">
      {/* Name row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <h3 className="text-brand-white font-semibold text-sm leading-snug">
            {translatedName}
          </h3>
          {translatedName !== item.name_original && (
            <span className="text-brand-muted text-xs leading-snug truncate">
              {item.name_original}
            </span>
          )}
        </div>
        {item.price && (
          <span className="text-brand-orange font-semibold text-sm flex-shrink-0">
            {item.price}
          </span>
        )}
      </div>

      {/* Description */}
      {translatedDesc && (
        <p className="text-brand-muted text-xs leading-relaxed">
          {translatedDesc}
        </p>
      )}

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
        {/* Trust badge */}
        <TrustBadge signal={item.trust_signal} t={t} />

        {/* Dietary tags */}
        {item.dietary_tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded-full bg-brand-orange/8 border border-brand-orange/15 text-brand-orange/80 text-xs"
          >
            {t(`tag_${tag}`)}
          </span>
        ))}

        {/* Allergen chips — warm amber, never green */}
        {item.allergens.map((allergen) => (
          <span
            key={allergen}
            className="px-2 py-0.5 rounded-full bg-white/5 border border-white/12 text-brand-muted text-xs"
          >
            {t(`allergen_${allergen}`)}
          </span>
        ))}
      </div>
    </div>
  );
}

function TrustBadge({ signal, t }: { signal: 'verified' | 'inferred'; t: (k: string) => string }) {
  if (signal === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/15 text-brand-muted text-xs font-medium">
        ✓ {t('trust_verified')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-orange/8 border border-brand-orange/15 text-brand-orange/70 text-xs font-medium">
      ~ {t('trust_inferred')}
    </span>
  );
}
```

**Trust badge design (Claude's discretion):**
- `verified`: neutral muted style — subtle, low visual weight. The "verified" state is the default/expected; it doesn't need to shout.
- `inferred`: warm orange tint — draws attention without alarming; users understand this is a best-guess. No green anywhere.

**Allergen chip design (Claude's discretion):**
- Neutral `white/5` background, `white/12` border, `brand-muted` text — deliberately understated
- Never green — users with allergies should always confirm with server; chips are informational only
- The allergen disclaimer banner at the top reinforces this

### Pattern 7: Motion AnimatePresence for Filter Transitions

**What:** When filters change, some dishes disappear. Using `AnimatePresence` + `layout` makes this feel fluid rather than abrupt. However, since the accordion re-renders sections based on filtered items, animating individual cards within collapsed sections is complex. Recommended approach: animate at the section level only, or use a flat list view when filters are active.

**Simple approach (recommended for v1.1):** When no filters are active, show the accordion. When any filter is active, show a flat filtered list with fade animation — cleaner UX and avoids accordion + AnimatePresence complexity.

```typescript
// In MenuShell or MenuAccordion:
import { AnimatePresence, motion } from 'motion/react';

// When filters are active: flat animated list
<AnimatePresence initial={false}>
  {filteredItems.map((item) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      layout
    >
      <DishCard item={item} />
    </motion.div>
  ))}
</AnimatePresence>
```

**Note on `layout` prop:** Causes remaining items to smoothly flow into new positions when others are removed. Works correctly in `motion@12.x`. The `popLayout` mode is not needed here since we're not removing items from within a constrained scroll container.

### Pattern 8: Globe Icon Language Switcher

**What:** A small globe icon in the menu page header (not the global Nav) opens a 4-option language picker. Clicking a language updates `setLang()` in context, which persists to localStorage and re-renders all translated content instantly.

**Placement:** Right side of the menu page header, next to the restaurant name. This is a page-scoped header element (inside `MenuShell`), NOT the global `Nav` component.

```typescript
// Inline in MenuShell header section:
import { useLanguage, type Lang } from '@/lib/i18n';

const LANGS: Lang[] = ['fr', 'en', 'tr', 'de'];

function LangSwitcher() {
  const { lang, setLang, t } = useLanguage();
  return (
    <div className="relative">
      {/* Globe icon button */}
      <button className="p-2 rounded-full bg-white/5 border border-white/10 text-brand-muted">
        {/* SVG globe icon — inline or from Heroicons */}
      </button>
      {/* Dropdown — 4 options */}
      <div className="absolute right-0 top-full mt-1 bg-brand-bg border border-white/10 rounded-xl overflow-hidden z-20">
        {LANGS.map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`block w-full px-4 py-2 text-left text-sm ${lang === l ? 'text-brand-orange' : 'text-brand-muted'}`}
          >
            {t(`lang_${l}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Putting LanguageProvider in root layout:** Contaminates Server Component layout with client boundary. Scope it to the menu page client shell only.
- **Using `useRouter` or URL params for language:** The user decision locks language to localStorage, not URL. Don't add `/fr/menu/[id]` routing.
- **Green allergen chips or "safe" indicators:** Locked decision — never use green for allergen information. Neutral or warm-toned only.
- **Per-card language toggle:** Locked decision — language is page-wide, not per-card.
- **Filtering via Supabase query:** FILT-04 requires instant client-side filtering — never add an API call on filter change.
- **Initializing language state from localStorage during SSR:** Will cause hydration mismatch. Always initialize to `'fr'` in `useState`, then correct in `useEffect`.
- **Using `display: none` to "filter" cards:** Items should be removed from the DOM (filtered from the array) so `AnimatePresence` exit animations play. Don't use CSS visibility toggling.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Filter animation when items leave DOM | CSS opacity transitions | `motion/react` `AnimatePresence` + `layout` | CSS `transition` can't animate elements that leave the DOM; Motion's `AnimatePresence` tracks key-based removal and plays exit animations |
| Language persistence | Roll a custom localStorage serialization | Simple `localStorage.getItem/setItem` in the `useLanguage` hook | The problem is simple; no library needed |
| Translation lookup | Dictionary with nested objects and fallback chains | Flat `translations[lang][key]` object | Simple enough; deep nesting adds complexity without benefit for 4 langs and ~30 keys |
| Horizontal scroll chip container | Custom touch handling | CSS `overflow-x: auto` + `no-scrollbar` Tailwind utility | Already defined in `globals.css`; native scroll is correct |

**Key insight:** This phase is a UI rendering phase, not a data fetching phase. All complexity is in state management and visual presentation. Resist adding libraries — the existing stack handles everything.

---

## Common Pitfalls

### Pitfall 1: Hydration Mismatch from localStorage Read During SSR

**What goes wrong:** `useState` initializer reads from `localStorage`, which is `undefined` on server. React renders `'fr'` on server, client renders stored language — React throws a hydration mismatch error.

**Why it happens:** `MenuShell` is `'use client'` but Next.js still does server-side rendering of client components (they render to HTML on the server, then hydrate). `localStorage` does not exist in the Node.js environment.

**How to avoid:** Initialize `useState('fr')` (not from localStorage). Use `useEffect` to correct the value client-side after mount. This pattern is well-established and documented.

**Warning signs:** React hydration error in console: "Text content did not match." or component content flickers on page load.

### Pitfall 2: 'spicy' Dietary Tag Missing from Schema

**What goes wrong:** DISH-06 requires "épicé" display and FILT-03 requires spice level filtering, but `DietaryTag` type only defines `'vegetarian' | 'vegan' | 'halal'`. The LLM prompt doesn't output `'spicy'`.

**Why it happens:** The LLM schema in `lib/types/llm.ts` uses `z.enum(['vegetarian', 'vegan', 'halal'])` for `dietary_tags`. The DB stores `text[]` (expandable), but the Zod schema constrains the LLM output.

**How to avoid:** The planner must include a task to:
  1. Update `DietaryTag` type in `lib/types/menu.ts` to add `'spicy'`
  2. Update `dishResponseSchema` in `lib/types/llm.ts` to add `'spicy'` to the enum
  3. Update the LLM system prompt in `lib/openai.ts` to detect and output spicy dishes
  4. No DB migration needed (column is already `text[]`)

**Warning signs:** Filter chips for "Épicé/Spicy" display but no dishes ever match; `dietary_tags` never contains `'spicy'` in existing data.

### Pitfall 3: Filter Bar Overlapping Sticky Nav

**What goes wrong:** Filter bar has `position: sticky; top: 64px` but the global `Nav` is also sticky at `top: 0`. If scroll behavior or CSS z-index is wrong, they overlap or the filter bar scrolls behind the nav.

**Why it happens:** `layout.tsx` sets `<main className="pt-16">` — 64px padding pushes content below the 64px-height nav. The filter bar needs `top: 64px` (Tailwind `top-16`) to stick below the nav, not at the top.

**How to avoid:** Use `sticky top-16 z-10` on the filter bar wrapper. Verify nav height is exactly 64px. Test on iOS Safari which has URL bar height variability.

**Warning signs:** Filter bar appears behind nav bar on scroll; or filter bar and nav stack vertically taking 128px of viewport.

### Pitfall 4: AnimatePresence Key Stability During Filter Changes

**What goes wrong:** When filters change, React re-renders the list. If keys change (e.g., using array index as key), AnimatePresence cannot track which items left/entered, causing chaotic animations or no animations.

**Why it happens:** Developer uses `key={index}` instead of `key={item.id}`.

**How to avoid:** Always use `key={item.id}` — dish IDs are stable UUIDs from Supabase.

**Warning signs:** All items animate in/out on every filter change; animations don't match which items were actually filtered.

### Pitfall 5: Accordion + FilteredItems Mismatch

**What goes wrong:** The accordion `buildSections()` function in `MenuAccordion.tsx` groups items into sections. If the filtered list passes items from different categories but skips others, the section grouping may show empty section headers.

**Why it happens:** `buildSections()` uses a sequential scan assuming items are sorted by category. A filtered list with gaps in `sort_order` can produce unexpected section groupings.

**How to avoid:** Either (a) use the flat list view when filters are active (recommended), or (b) make `buildSections()` filter out sections with 0 items after filtering. Option (a) is simpler and better UX — the accordion structure is for browsing; when filtering, a flat list is the right pattern.

**Warning signs:** Section headers with "(0 items)" appear when filters are active.

### Pitfall 6: Missing Translation Keys Silently Fail

**What goes wrong:** A new allergen or dietary tag is added to the DB without adding its `t('allergen_X')` or `t('tag_X')` key to `translations.ts`. The `t(key)` function falls back to returning the key string, so users see raw internal keys like `allergen_molluscs` in the UI.

**Why it happens:** `t()` fallback returns the key — better than crashing but wrong UX.

**How to avoid:** Keep the `translations.ts` dictionary complete. Consider a TypeScript helper that makes the key type a literal union — then missing keys become TypeScript errors.

**Warning signs:** Raw snake_case strings like `allergen_molluscs` visible in dish card chips.

---

## Code Examples

Verified patterns from official sources and codebase investigation:

### Reading Translated Dish Name (from DB TranslationMap)

```typescript
// Source: lib/types/menu.ts (existing type)
// item.name_translations is TranslationMap: { fr, en, tr, de }
const translatedName = item.name_translations[lang] ?? item.name_original;
const translatedDesc = item.description_translations?.[lang] ?? item.description_original;
// Note: description_translations is TranslationMap | null — use optional chaining
```

### Instant Client-Side Filter (No API)

```typescript
// Source: React 19 docs — useMemo for expensive computations
// Source: FILT-04 requirement
const filtered = useMemo(
  () => items.filter((item) => {
    if (activeDietaryTags.length > 0 && !activeDietaryTags.every(t => item.dietary_tags.includes(t))) return false;
    if (excludeAllergens.length > 0 && excludeAllergens.some(a => item.allergens.includes(a))) return false;
    return true;
  }),
  [items, activeDietaryTags, excludeAllergens]
);
```

### localStorage Language Persistence (SSR-safe)

```typescript
// Source: useLocalStorage hook pattern for Next.js (verified working pattern)
// SSR-safe: initialize to default, correct in useEffect
const [lang, setLangState] = useState<Lang>('fr'); // never read localStorage here

useEffect(() => {
  const stored = localStorage.getItem('nom_lang') as Lang | null;
  if (stored && ['fr', 'en', 'tr', 'de'].includes(stored)) {
    setLangState(stored);
  } else {
    // Auto-detect from browser
    const nav = navigator.language?.slice(0, 2).toLowerCase() as Lang;
    setLangState(['fr', 'en', 'tr', 'de'].includes(nav) ? nav : 'fr');
  }
}, []); // run once after mount
```

### Motion AnimatePresence for Filtered List

```typescript
// Source: https://theodorusclarence.com/blog/list-animation (verified working pattern)
// Source: motion/react v12 (already installed: "motion": "^12.34.3")
import { AnimatePresence, motion } from 'motion/react';

<AnimatePresence initial={false}>
  {filteredItems.map((item) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      layout
    >
      <DishCard item={item} />
    </motion.div>
  ))}
</AnimatePresence>
```

### Horizontal Sticky Filter Bar (Tailwind)

```tsx
// Tailwind v4 — no-scrollbar utility already defined in globals.css
<div className="sticky top-16 z-10 bg-brand-bg/90 backdrop-blur-sm border-b border-white/5">
  <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-3">
    {/* chips */}
  </div>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| URL-based locale routing (`/fr/menu/[id]`) | localStorage-based client-side lang switching | User decision (this phase) | No middleware, no route restructuring, instant switching without page reload |
| `generateObject` for structured LLM output | `generateText` + `Output.object()` | AI SDK 6 (Phase 5 decision) | Confirmed carry-forward — no new LLM calls in Phase 6 |
| React `useMemo` required for array filtering | React 19 compiler may auto-memoize | React 19.2.3 (installed) | Keep `useMemo` for explicit intent; compiler handles simple cases automatically |
| Framer Motion (pre-v11 package name) | `motion` package, import from `"motion/react"` | v11+ rename | Import path changed; `motion@12.34.3` is already installed |

**Deprecated/outdated:**
- `import { motion } from 'framer-motion'`: The package is now `motion`, import from `"motion/react"`. `framer-motion` still works as an alias but the canonical package is `motion`.
- `next-intl` URL-based routing with middleware: Not needed here — user decision locks to localStorage approach.

---

## Open Questions

1. **'spicy' tag in DietaryTag schema and LLM prompt**
   - What we know: `dietary_tags` is `text[]` in DB (flexible), but `DietaryTag` type and Zod schema don't include `'spicy'`. FILT-03 requires spice level filtering.
   - What's unclear: Whether to add `'spicy'` now or treat FILT-03 as "no spicy dishes in current data" (FILT-03 would still work — the filter exists but matches nothing).
   - Recommendation: Add `'spicy'` to schema and LLM prompt in this phase. It's a trivial type change and makes the feature actually functional. The planner should create a sub-task for this.

2. **Allergen disclaimer banner placement vs. page structure**
   - What we know: Locked decision says "single banner at top of menu page." The current `page.tsx` has a header section, then `<MenuAccordion>`.
   - What's unclear: Should the banner be inside `MenuShell` (client-rendered, localized) or in the Server Component `page.tsx` (harder to localize without client state).
   - Recommendation: Inside `MenuShell` — it needs `useLanguage()` to render in the correct language. The banner is always visible, not conditional.

3. **Filter bar allergen exclusion scope**
   - What we know: FILT-02 says "allergen exclusion (gluten, nuts, dairy, etc.)". The full EU 14 list has 14 allergens.
   - What's unclear: Should all 14 allergen exclusion filters be visible in the filter bar, or only the most common ones (gluten, dairy, nuts, peanuts, eggs, fish, shellfish)?
   - Recommendation (Claude's discretion): Show the 7 most common allergens as exclusion filters. The full 14 creates a very long scrollable bar on mobile. Rare allergens (lupin, molluscs, celery, mustard, sesame, sulphites) can be added later. The planner should pick 7 based on statistical prevalence.

4. **Empty filter state visual design**
   - What we know: Claude's discretion — show "something" when no dishes match.
   - Recommendation: Simple centered message + "Clear filters" button. No animation needed here. Copy from `t('empty_filters')` in the dictionary.

5. **Category sections when filters are active**
   - What we know: Accordion groups by category. Filtered list may break category continuity.
   - Recommendation documented in Pattern 7: switch to flat list when any filter is active. Accordion resumes when filters are cleared. Clean UX, avoids empty section header bug.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `/Users/ekitcho/Desktop/dev-claude-lab/nomnomnom/lib/types/menu.ts` — direct inspection of `MenuItem`, `TranslationMap`, `Allergen`, `DietaryTag`, `TrustSignal` types
- Codebase: `/Users/ekitcho/Desktop/dev-claude-lab/nomnomnom/components/menu/MenuAccordion.tsx` — existing component structure, TrustBadge, DishCard, section grouping logic
- Codebase: `/Users/ekitcho/Desktop/dev-claude-lab/nomnomnom/app/globals.css` — brand tokens, `no-scrollbar` utility confirmed
- Codebase: `/Users/ekitcho/Desktop/dev-claude-lab/nomnomnom/package.json` — `motion@^12.34.3` confirmed installed
- [Next.js App Router Internationalization Docs](https://nextjs.org/docs/app/guides/internationalization) — official approach, dictionary pattern, Server Component i18n
- [React useMemo docs](https://react.dev/reference/react/useMemo) — array filtering memoization pattern
- [React 19 Compiler docs](https://react.dev/learn/react-compiler/introduction) — auto-memoization scope and limitations
- EU Regulation 1169/2011 — 14 mandatory allergen list (legally stable)

### Secondary (MEDIUM confidence)
- [theodorusclarence.com: List Animation with Motion](https://theodorusclarence.com/blog/list-animation) — AnimatePresence two-div pattern for height animation, verified working
- [Vercel KB: React Context in Next.js](https://vercel.com/kb/guide/react-context-state-management-nextjs) — Context provider in client component pattern
- [useLocalStorage hook for Next.js (Medium)](https://medium.com/@lean1190/uselocalstorage-hook-for-next-js-typed-and-ssr-friendly-4ddd178676df) — SSR-safe localStorage pattern with useEffect correction
- [motion.dev AnimatePresence docs](https://motion.dev/docs/react-animate-presence) — popLayout mode, key-based exit tracking
- [motion.dev Layout Animation docs](https://motion.dev/docs/react-layout-animations) — `layout` prop for smooth reflow on list changes
- [motion GitHub CHANGELOG.md](https://github.com/motiondivision/motion/blob/main/CHANGELOG.md) — no breaking changes in v12 confirmed
- [mae-innovation.com: EU 14 allergens](https://mae-innovation.com/en/the-14-allergens-with-mandatory-declaration-in-europe/) — complete allergen list with descriptions

### Tertiary (LOW confidence — flag for validation)
- Turkish allergen label translations — generated from knowledge of Turkish food terminology; should be verified by a Turkish speaker before production
- German allergen label translations — generated from knowledge; recommend spot-check with a native speaker

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified from `package.json`; types verified from source files
- Architecture: HIGH — patterns based on existing codebase structure and verified Next.js/React patterns
- i18n approach: HIGH — aligns with official Next.js docs; custom hook pattern well-documented
- Client-side filtering: HIGH — standard React pattern with `useMemo`; no edge cases for this data size
- Motion animations: MEDIUM-HIGH — `motion@12.x` installed; import path `"motion/react"` verified; AnimatePresence pattern cross-verified from multiple sources
- Translation strings: MEDIUM — English/French strings HIGH confidence; Turkish/German strings MEDIUM (generated, not verified by native speakers)
- 'spicy' schema gap: HIGH — directly verified from `lib/types/llm.ts` Zod schema

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (30 days — core React/Next.js patterns are stable; motion v12 is stable; translation strings may need native-speaker review)
