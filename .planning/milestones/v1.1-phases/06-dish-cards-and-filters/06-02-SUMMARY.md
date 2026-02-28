---
phase: 06-dish-cards-and-filters
plan: 02
subsystem: ui
tags: [react, nextjs, i18n, framer-motion, filtering, allergens, dish-cards]

# Dependency graph
requires:
  - phase: 06-01
    provides: "LanguageProvider, useLanguage, useFilteredDishes hook, FR/EN/TR/DE translation dictionaries, DietaryTag spicy"
  - phase: 05-scan-pipeline
    provides: "MenuWithItems type, menu_items data structure, dietary_tags and allergens fields on MenuItem"
provides:
  - "DishCard component — translated name/description/price with trust badge, dietary tags, allergen chips"
  - "AllergenBanner component — localized discreet disclaimer at top of menu page"
  - "LangSwitcher component — globe icon dropdown switching FR/EN/TR/DE page-wide"
  - "FilterBar component — sticky horizontal chip bar for dietary and allergen exclusion filters"
  - "MenuShell coordinator — client component holding language + filter state, wraps LanguageProvider"
  - "Refactored /menu/[id]/page.tsx — thin Server Component delegating to MenuShell"
  - "Post-checkpoint UX polish: search + result count, accent-insensitive search, keyboard dismiss, allergen row layout, LLM dietary prompt improvements, QR race condition fix, URL normalization"
affects: [07-polish, future-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Component shell + Client coordinator pattern (page.tsx fetches, MenuShell owns state)"
    - "LanguageProvider wraps all menu UI — useLanguage() called in leaf components"
    - "Flat animated list (AnimatePresence + motion.div) for filtered view, accordion for unfiltered view"
    - "Sticky FilterBar with backdrop-blur and horizontal chip scroll"
    - "Trust badge coloring: neutral muted for verified, warm orange tint for inferred"
    - "Allergen/dietary palette: warm orange chips — no green anywhere in allergen presentation"

key-files:
  created:
    - components/menu/DishCard.tsx
    - components/menu/AllergenBanner.tsx
    - components/menu/LangSwitcher.tsx
    - components/menu/FilterBar.tsx
    - components/menu/MenuShell.tsx
  modified:
    - components/menu/MenuAccordion.tsx
    - app/menu/[id]/page.tsx

key-decisions:
  - "FilterBar redesigned post-checkpoint: search bar added at top, allergen chips hidden by default behind toggle row to reduce visual noise"
  - "Allergen chips removed from DishCard to avoid redundancy with FilterBar allergen exclusion chips"
  - "Chip auto-scroll ensures newly activated filter chips are always visible"
  - "Result count shown when filters or search are active — helps users understand filtered state"
  - "Accent-insensitive search implemented (normalize + fold) so 'vege' matches 'végétarien'"
  - "Enter key dismisses iOS keyboard on search input"
  - "QR scan race condition fixed with delayed event dispatch until UrlInput mounts"
  - "URL normalization for eazee-link to ensure consistent cache hits across QR variants"

patterns-established:
  - "MenuShell pattern: outer LanguageProvider + inner MenuContent component to access useLanguage() after provider mount"
  - "Client-side filter state lives in MenuShell, passed down to FilterBar via props"
  - "useFilteredDishes result drives conditional rendering: accordion vs flat list vs empty state"

requirements-completed: [DISH-01, DISH-02, DISH-03, DISH-04, DISH-05, DISH-06, FILT-01, FILT-02, FILT-03, FILT-04]

# Metrics
duration: ~110min
completed: 2026-02-25
---

# Phase 6 Plan 02: Dish Cards and Filters Summary

**Translated dish cards with trust badges, sticky filter bar, globe language switcher, and allergen disclaimer — complete /menu/[id] display surface with post-checkpoint UX polish (search, result count, keyboard UX, accent folding)**

## Performance

- **Duration:** ~110 min (17:48 to 19:39 UTC+1)
- **Started:** 2026-02-25T17:48:05+01:00
- **Completed:** 2026-02-25T19:38:57+01:00
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 7 core + multiple additional UX polish passes

## Accomplishments

- Built complete dish card display surface: DishCard with translated name/description/price, trust badge (verified vs inferred), dietary tag chips (warm orange, no green), and clean allergen presentation
- Wired MenuShell client coordinator: LanguageProvider scope, filter state management, animated flat list when filtering vs accordion when unfiltered, empty filter state with clear-all button
- Applied 8 post-checkpoint UX fixes covering FilterBar redesign (search + hidden allergen toggle), accent-insensitive search, result count, keyboard dismiss, QR race condition, and URL cache normalization

## Task Commits

Each task was committed atomically:

1. **Task 1: Create DishCard, AllergenBanner, LangSwitcher, FilterBar components** - `8141bbd` (feat)
2. **Task 2: Create MenuShell coordinator and refactor /menu/[id]/page.tsx** - `f731f4f` (feat)
3. **Task 3: Human verification checkpoint** - approved (no commit — checkpoint)

**Post-checkpoint UX fix commits:**
- `2433de1` — Redesign FilterBar UX and hide allergen chips on DishCard
- `5d73386` — Move allergen toggle to dedicated row, add chip auto-scroll
- `7a60c6d` — Make LLM dietary tag prompt more proactive
- `67f80fa` — Fix QR scan race condition (delayed event dispatch)
- `8601baf` — Normalize eazee-link URL for consistent cache hits
- `664fba3` — Accent-insensitive search
- `6a5de5e` — Enter key dismisses keyboard on search input
- `9759781` — Show result count when filters or search are active

## Files Created/Modified

- `components/menu/DishCard.tsx` - Translated dish card with trust badge and dietary tags
- `components/menu/AllergenBanner.tsx` - Localized allergen disclaimer banner (top of page)
- `components/menu/LangSwitcher.tsx` - Globe icon dropdown for FR/EN/TR/DE switching
- `components/menu/FilterBar.tsx` - Sticky horizontal filter bar with search, dietary chips, allergen exclusion toggle row
- `components/menu/MenuShell.tsx` - Client coordinator holding language + filter state, LanguageProvider wrapper
- `components/menu/MenuAccordion.tsx` - Refactored to use imported DishCard (removed inline version)
- `app/menu/[id]/page.tsx` - Simplified to thin Server Component delegating to MenuShell

## Decisions Made

- **FilterBar redesigned post-checkpoint:** Search bar promoted to top of FilterBar; allergen exclusion chips hidden behind a dedicated toggle row ("Exclure allergènes") to reduce initial visual noise while keeping them accessible
- **Allergen chips removed from DishCard:** Redundant with FilterBar allergen exclusion chips; removal reduces card density
- **Accent-insensitive search:** Used `normalize('NFD').replace(...)` pattern so users typing without accents still match accented dish names
- **Result count display:** Shown conditionally when search or filters active — provides immediate feedback on filtered state

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] QR scan race condition — event fired before UrlInput mounted**
- **Found during:** Post-checkpoint testing
- **Issue:** QR decoded event dispatched immediately on tab switch, before UrlInput component had mounted to listen for it
- **Fix:** Added short delay in event dispatch to allow UrlInput to mount first
- **Files modified:** (QR scan related component)
- **Verification:** QR scan flow populates URL field correctly
- **Committed in:** `67f80fa`

**2. [Rule 1 - Bug] URL cache miss on eazee-link due to URL variant normalization**
- **Found during:** Post-checkpoint testing
- **Issue:** Slightly different QR URL formats for same restaurant bypassed cache
- **Fix:** Normalize URL to canonical form before cache key generation
- **Files modified:** (URL normalization utility)
- **Verification:** Repeated scans of same restaurant hit cache
- **Committed in:** `8601baf`

**3. [Rule 2 - UX] FilterBar visual noise — all allergen chips visible by default**
- **Found during:** Checkpoint human-verify
- **Issue:** Displaying 7 allergen exclusion chips inline with dietary chips made the filter bar overwhelming on mobile
- **Fix:** Redesigned FilterBar: search at top, dietary chips below, allergen chips hidden behind "Exclure allergènes" toggle row
- **Files modified:** `components/menu/FilterBar.tsx`
- **Verification:** FilterBar loads clean, allergens accessible via toggle
- **Committed in:** `2433de1`, `5d73386`

**4. [Rule 2 - UX] Missing search functionality**
- **Found during:** Post-checkpoint testing
- **Issue:** No way to search for a specific dish by name — critical for menus with 30+ items
- **Fix:** Added search input at top of FilterBar; accent-insensitive, clears with X button, result count shown
- **Files modified:** `components/menu/FilterBar.tsx`, `hooks/useFilteredDishes.ts` (or similar)
- **Verification:** Typing 'vege' returns vegetarian dishes; 'Enter' dismisses keyboard on iOS
- **Committed in:** `2433de1`, `664fba3`, `6a5de5e`, `9759781`

---

**Total deviations:** 4 auto-fixed (2 bugs, 2 missing critical UX)
**Impact on plan:** All fixes improve correctness, cache reliability, and mobile usability. No scope creep beyond plan objective.

## Issues Encountered

- `LanguageProvider` context access required inner `MenuContent` component pattern — outer `MenuShell` component cannot call `useLanguage()` directly since it renders the provider; solved by splitting into outer shell + inner content component
- Motion/react `AnimatePresence` requires stable `key` props on children — used `item.id` throughout filtered list

## User Setup Required

None - no external service configuration required for this plan's UI components.

## Next Phase Readiness

- Complete /menu/[id] display surface is production-ready for user testing
- Language persistence (localStorage) working across page refreshes
- Filter system fully client-side — no API calls on filter interaction
- All requirements DISH-01 through DISH-06 and FILT-01 through FILT-04 complete
- Phase 7 (Polish) can begin; no blockers from this plan

---
*Phase: 06-dish-cards-and-filters*
*Completed: 2026-02-25*
