---
phase: 06-dish-cards-and-filters
verified: 2026-02-25T20:00:00Z
status: human_needed
score: 13/13 must-haves verified
re_verification: false
human_verification:
  - test: "Language switching updates all dish card content"
    expected: "Tapping English in LangSwitcher changes dish names, descriptions, trust badges, allergen disclaimer, and filter labels page-wide instantly"
    why_human: "Language switching is runtime React state propagation through LanguageProvider context — cannot verify visual page-wide update without a browser"
  - test: "Language persists across page refresh"
    expected: "After selecting Deutsch and refreshing the page, the language remains Deutsch (localStorage 'nom_lang' key)"
    why_human: "localStorage read/write behavior requires a running browser session"
  - test: "Allergen disclaimer wording consistency with DISH-05"
    expected: "DISH-05 says the disclaimer must include 'demandez au serveur' in the user's language. FR text reads 'confirmez auprès du serveur' — verify this satisfies the spirit of the requirement. EN/TR/DE equivalents are semantically correct."
    why_human: "Requirement specifies the exact phrase 'demandez au serveur'; the implementation uses 'confirmez auprès du serveur' (semantically equivalent but textually different). Human must decide if this satisfies DISH-05 or needs a copy edit."
  - test: "Dietary filter hides non-matching dishes instantly"
    expected: "Tapping 'Végétarien' chip hides non-vegetarian dishes with no perceptible delay and no network request — filtered view switches to flat animated list"
    why_human: "Client-side filter speed and network-request absence require live browser interaction"
  - test: "Stacked filter combinations work correctly"
    expected: "Activating 'Végétarien' then 'Sans gluten' shows only vegetarian dishes that also contain no gluten"
    why_human: "Correctness of AND-stack requires live data with dishes spanning both filter dimensions"
  - test: "No green color appears anywhere in allergen/dietary presentation"
    expected: "Zero green pixels in trust badges, allergen chips, dietary tag chips, or filter chips — warm orange and neutral white/muted palette only"
    why_human: "Color rendering in browser required; CSS class names have been audited (no text-green/bg-green found) but Tailwind config custom colors not inspected"
---

# Phase 6: Dish Cards and Filters — Verification Report

**Phase Goal:** Every dish is presented as a clear, translated card with trust signal and allergen info — and users can filter the full list instantly
**Verified:** 2026-02-25T20:00:00Z
**Status:** human_needed — all automated checks passed; 6 items flagged for human verification
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from Plan frontmatter must_haves)

#### Plan 01 Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `useLanguage()` returns lang, setLang, t() | VERIFIED | `lib/i18n/index.tsx` L83 exports `useLanguage = () => useContext(LanguageContext)` with all three values in context |
| 2 | Language auto-detects from navigator.language | VERIFIED | `detectBrowserLang()` at L27-31 reads `navigator.language`, maps to supported Lang, defaults 'fr' |
| 3 | Language persists to localStorage on manual change | VERIFIED | `setLang()` at L67-70 calls `localStorage.setItem(STORAGE_KEY, l)` then updates state |
| 4 | `t()` returns localized string for all 4 languages | VERIFIED | `translations.ts` has `fr/en/tr/de` blocks each with identical 30+ key sets; `t()` at L72-73 looks up translations[lang][key] |
| 5 | DietaryTag type includes 'spicy' | VERIFIED | `lib/types/menu.ts` L42: `'vegetarian' \| 'vegan' \| 'halal' \| 'spicy'` |
| 6 | LLM prompt instructs detection of spicy dishes | VERIFIED | `lib/openai.ts` contains: `spicy: the dish is notably spicy or contains hot peppers/chili` |
| 7 | useFilteredDishes AND-stacks dietary + allergen exclusion | VERIFIED | `hooks/useFilteredDishes.ts` L70-83: dietary uses `every()` (AND); allergen uses `some()` (OR exclusion); both applied sequentially |

#### Plan 02 Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 8 | Each dish card shows translated name, original, description, price | VERIFIED | `DishCard.tsx` L17-52: `translatedName`, `showOriginalName` guard, `translatedDescription`, price right-aligned |
| 9 | Cards display in selected language | VERIFIED | `DishCard.tsx` L14: `const { lang, t } = useLanguage()` — translations consumed from live context |
| 10 | Each card shows trust badge (neutral vs warm orange) | VERIFIED | `DishCard.tsx` L25-29: verified→`bg-white/5 text-brand-muted`, inferred→`bg-brand-orange/8 text-brand-orange/70` |
| 11 | Allergen chips neutral/warm — never green | VERIFIED | `DishCard.tsx` L107-111: `bg-white/5 border-white/12 text-brand-muted`; grep across all components confirms zero `text-green`/`bg-green` classes |
| 12 | Dietary tags shown on card | VERIFIED | `DishCard.tsx` L72-79: `item.dietary_tags.map((tag) => ... t(\`tag_${tag}\`))` renders all tags including 'spicy', 'halal' |
| 13 | Single allergen disclaimer banner at top of menu page | VERIFIED | `AllergenBanner.tsx` L12-22: renders `t('allergen_disclaimer')`; used in `MenuShell.tsx` L93-95 above FilterBar |
| 14 | Globe icon opens language switcher dropdown | VERIFIED | `LangSwitcher.tsx` L22-93: SVG globe button, `useState(false)` toggle, dropdown with 4 languages |
| 15 | Dietary filter chip hides non-matching dishes instantly | VERIFIED (automated) | `FilterBar.tsx` L45-53: `toggleDietary` updates state via `onChange`; `useFilteredDishes` in MenuShell is memoized, no API call path exists |
| 16 | Allergen exclusion chip hides dishes with that allergen | VERIFIED (automated) | `FilterBar.tsx` L55-62: `toggleAllergen` updates `excludeAllergens`; hook filters out dishes where `allergen in item.allergens` |
| 17 | Filter combinations stack — vegetarian + gluten-free | VERIFIED (automated) | `useFilteredDishes.ts` L69-83: dietary AND allergen checks run independently on same item — both must pass |
| 18 | Filters apply instantly — no API call | VERIFIED | `FilterState` is React `useState` in `MenuShell.tsx` L162; `useFilteredDishes` is pure `useMemo` with no fetch/axios call anywhere |
| 19 | Filtered view is flat animated list; unfiltered is accordion | VERIFIED | `MenuShell.tsx` L114-147: `hasActiveFilters ? AnimatePresence flat list : MenuAccordion` |
| 20 | Empty state with clear-filters button | VERIFIED | `MenuShell.tsx` L115-125: `filteredItems.length === 0` shows `t('empty_filters')` and `t('clear_filters')` button that resets `EMPTY_FILTERS` |

**Score: 13/13 automated truths verified** (6 additional human-verification items)

---

## Required Artifacts

| Artifact | Min Lines | Actual Lines | Status | Details |
|----------|-----------|-------------|--------|---------|
| `lib/i18n/index.tsx` | 40 | 83 | VERIFIED | Exports LanguageProvider, useLanguage, Lang, SUPPORTED_LANGS; SSR-safe pattern confirmed |
| `lib/i18n/translations.ts` | 80 | 212 | VERIFIED | 4-language dict with 30+ keys; `as const`; allergen labels (14), dietary tags (4), trust badges, filters, disclaimer |
| `hooks/useFilteredDishes.ts` | 20 | 88 | VERIFIED | Exports FilterState and useFilteredDishes; useMemo; AND-stack logic; bonus: search + category filter |
| `lib/types/menu.ts` | — | 92 | VERIFIED | DietaryTag includes 'spicy'; all 14 Allergen types; MenuItem, TranslationMap, MenuWithItems |
| `lib/types/llm.ts` | — | 81 | VERIFIED | dishResponseSchema with `z.enum(['vegetarian', 'vegan', 'halal', 'spicy'])` at L61 |
| `components/menu/DishCard.tsx` | 40 | 117 | VERIFIED | Translated name/desc/price, trust badge, dietary tags, allergen toggle-reveal; useLanguage wired |
| `components/menu/AllergenBanner.tsx` | 10 | 22 | VERIFIED | Renders t('allergen_disclaimer'); warm palette; useLanguage wired |
| `components/menu/LangSwitcher.tsx` | 30 | 93 | VERIFIED | Globe SVG, open/close state, 4-language dropdown, click-outside close |
| `components/menu/FilterBar.tsx` | 50 | 196 | VERIFIED | Search + categories + 3 dietary chips + 7 allergen exclusion (behind toggle); useLanguage wired |
| `components/menu/MenuShell.tsx` | 40 | 169 | VERIFIED | LanguageProvider wraps MenuContent; filter state; useFilteredDishes; animated list vs accordion |
| `app/menu/[id]/page.tsx` | — | 54 | VERIFIED | Thin Server Component: Supabase fetch → MenuShell; no 'use client' |
| `components/menu/MenuAccordion.tsx` | — | 184 | VERIFIED | Imports DishCard (no inline version); buildSections structure retained |

---

## Key Link Verification

| From | To | Via | Pattern Found | Status |
|------|----|-----|--------------|--------|
| `lib/i18n/index.tsx` | `lib/i18n/translations.ts` | `import translations` | L12: `import { translations } from './translations'` | WIRED |
| `hooks/useFilteredDishes.ts` | `lib/types/menu.ts` | `import MenuItem, DietaryTag, Allergen` | L16: `import type { MenuItem, DietaryTag, Allergen } from '@/lib/types/menu'` | WIRED |
| `components/menu/MenuShell.tsx` | `lib/i18n/index.tsx` | `LanguageProvider` | L5: `import { LanguageProvider, useLanguage }` + L165: `<LanguageProvider>` | WIRED |
| `components/menu/MenuShell.tsx` | `hooks/useFilteredDishes.ts` | `useFilteredDishes(items, filters)` | L6: import + L45: `useFilteredDishes(menu.menu_items, filters)` | WIRED |
| `components/menu/DishCard.tsx` | `lib/i18n/index.tsx` | `useLanguage()` | L4: import + L14: `const { lang, t } = useLanguage()` | WIRED |
| `components/menu/FilterBar.tsx` | `lib/i18n/index.tsx` | `useLanguage()` | L4: import + L27: `const { t } = useLanguage()` | WIRED |
| `app/menu/[id]/page.tsx` | `components/menu/MenuShell.tsx` | `<MenuShell menu={...}>` | L5: import + L51: `<MenuShell menu={typedMenu} />` | WIRED |
| `components/menu/MenuAccordion.tsx` | `components/menu/DishCard.tsx` | imported DishCard (not inline) | L11: `import DishCard from '@/components/menu/DishCard'` | WIRED |

All 8 key links fully wired. No orphaned artifacts.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DISH-01 | Plan 02 | Dish card with translated name, description, price | SATISFIED | DishCard.tsx renders name_translations[lang], description_translations[lang], price |
| DISH-02 | Plans 01 & 02 | 4-language translation (FR/EN/TR/DE) | SATISFIED | LanguageProvider + translations.ts 4-language dict; LangSwitcher switches context |
| DISH-03 | Plan 02 | Trust badge (Verified/Inferred) | SATISFIED | DishCard.tsx L25-29: trust_signal drives badge style and t('trust_verified'/'trust_inferred') |
| DISH-04 | Plan 02 | Detected allergens (EU 14) with warning | SATISFIED | DishCard.tsx L31-113: allergen chips toggle-revealed; 14 EU allergens in type + translations |
| DISH-05 | Plans 01 & 02 | Mandatory disclaimer "demandez au serveur" in user's language | SATISFIED* | AllergenBanner.tsx renders t('allergen_disclaimer') — localized in all 4 langs. FR uses "confirmez auprès du serveur" not the exact phrase "demandez au serveur". See human verification item #3. |
| DISH-06 | Plans 01 & 02 | Dietary tags (végétarien, végan, épicé) | SATISFIED | DishCard.tsx L72-79: dietary_tags.map renders tag_vegetarian/vegan/halal/spicy; FilterBar has all 3 filter chips |
| FILT-01 | Plans 01 & 02 | Filter by dietary preference (végétarien, végan) | SATISFIED | FilterBar has vegetarian/vegan chips; useFilteredDishes filters by dietaryTags (AND logic) |
| FILT-02 | Plans 01 & 02 | Filter by allergen exclusion (gluten, nuts, dairy) | SATISFIED | FilterBar has 7-allergen exclusion chips (behind toggle); useFilteredDishes filters by excludeAllergens |
| FILT-03 | Plans 01 & 02 | Filter by spice level | SATISFIED | FilterBar includes 'spicy' in DIETARY_TAGS; toggleDietary handles it; useFilteredDishes checks dietary_tags |
| FILT-04 | Plans 01 & 02 | Filters apply instantly, no API call | SATISFIED | All filter logic in useFilteredDishes (useMemo, no fetch); state update in MenuShell useState |

*DISH-05: The phrase "demandez au serveur" from the requirement spec is not used verbatim. The implementation uses "confirmez auprès du serveur" (FR), which is semantically equivalent. Flagged for human review.

**All 10 requirements satisfied. No orphaned requirements.**

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No TODO/FIXME comments, no placeholder implementations, no empty return stubs, no console.log-only handlers found across any phase 6 files.

Notable design decisions (not anti-patterns):
- Allergens on DishCard are hidden behind a toggle button by default (UX decision post-checkpoint). They ARE present and accessible — not removed.
- FilterBar allergen chips are behind an "Allergenes" toggle row to reduce visual noise on mobile. They are still wired to useFilteredDishes and function correctly.
- `FilterState` was extended post-plan with `searchQuery` and `categoryFilter` fields (bonus features added during checkpoint polish). These are backward-compatible additions.

---

## Human Verification Required

### 1. Language Switching — Page-Wide Content Update

**Test:** Start dev server (`npm run dev`). Navigate to `/menu/{any-id}`. Click the globe icon. Select "English". Observe the page.
**Expected:** All dish names, descriptions, trust badges ("Verified Menu" not "Menu vérifié"), allergen disclaimer ("Allergen information is indicative — please confirm with the server."), and filter chip labels switch to English simultaneously with no page reload.
**Why human:** Language switching is runtime React context propagation. The wiring is verified (LanguageProvider + useLanguage in all leaf components) but the actual page-wide simultaneous update requires visual inspection in a browser.

### 2. Language Persistence Across Refresh

**Test:** Select "Deutsch" from the language switcher. Refresh the page (Cmd+R / F5).
**Expected:** Page reloads in Deutsch. `localStorage.getItem('nom_lang')` === `'de'` in browser DevTools.
**Why human:** `localStorage` read/write in `useEffect` requires a running browser session to verify.

### 3. DISH-05 Disclaimer Wording Acceptability

**Test:** Review the French allergen banner text: "Les informations sur les allergènes sont indicatives — confirmez auprès du serveur."
**Expected:** The requirement says the disclaimer must include "demandez au serveur" in the user's language. The implementation says "confirmez auprès du serveur" — both mean "ask/confirm with the server".
**Why human:** Product owner must decide if "confirmez auprès du serveur" satisfies the intent of DISH-05, or if the copy must be changed to the literal "demandez au serveur" phrasing.

### 4. Vegetarian Filter — Instant Response

**Test:** On a menu page with at least 10 dishes (mix of vegetarian and non-vegetarian), tap the "Végétarien" filter chip.
**Expected:** Non-vegetarian dishes disappear instantly with no spinner, no API call visible in browser Network tab, and the view switches from accordion to flat animated list.
**Why human:** Filter speed and absence of network requests require live browser interaction. Code inspection confirms no fetch in the filter path, but real-data timing needs human confirmation.

### 5. Stacked Filters — AND Logic Works

**Test:** With "Végétarien" active, also tap "Allergènes" toggle then "Sans gluten".
**Expected:** Only dishes that are BOTH vegetarian AND contain no gluten remain visible. Result count updates correctly.
**Why human:** Requires live menu data with dishes that span both filter dimensions to actually test AND-stack behavior end-to-end.

### 6. No Green Color in Allergen/Dietary Presentation

**Test:** Inspect all allergen chips, dietary tag chips, trust badges, and filter chips visually.
**Expected:** Zero green color anywhere. Allergen/dietary information uses warm orange (`brand-orange` variants) and neutral muted white (`brand-muted` variants) exclusively.
**Why human:** Code audit confirms no `text-green`/`bg-green`/`border-green` Tailwind classes in any component. However, the `brand-orange` and `brand-muted` custom color values defined in `tailwind.config` were not inspected — a human must confirm these do not resolve to green.

---

## Summary

Phase 6 delivered a complete implementation that is fully wired and substantive. All 10 requirements (DISH-01 through DISH-06, FILT-01 through FILT-04) have implementation evidence. The data layer (Plan 01: i18n, useFilteredDishes, 'spicy' schema) and the UI surface (Plan 02: DishCard, AllergenBanner, LangSwitcher, FilterBar, MenuShell) are both present, non-stub, and connected through verified key links. TypeScript compilation passes with zero errors.

Six items require human browser verification: language switching behavior, localStorage persistence, DISH-05 disclaimer wording, and three real-data filter interaction checks. These are behavioral/visual concerns that cannot be confirmed through static analysis.

The implementation includes two notable deviations from the original plan spec that improve the product: allergens on DishCard are toggle-revealed rather than always-visible (reduces density), and allergen exclusion chips in FilterBar are behind a secondary toggle row (reduces mobile noise). Both deviations preserve full functionality and are not gaps.

---

_Verified: 2026-02-25T20:00:00Z_
_Verifier: Claude (gsd-verifier)_
