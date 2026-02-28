---
phase: 06-dish-cards-and-filters
plan: 01
subsystem: ui
tags: [react, i18n, typescript, hooks, filtering, zod, openai]

# Dependency graph
requires:
  - phase: 05-scan-pipeline
    provides: MenuItem type, DietaryTag type, Allergen type, dishResponseSchema

provides:
  - LanguageProvider React context + useLanguage hook (lib/i18n/index.tsx)
  - 4-language translation dictionary covering all UI strings (lib/i18n/translations.ts)
  - useFilteredDishes hook with AND-stacked dietary + allergen exclusion filtering
  - DietaryTag type updated with 'spicy' (lib/types/menu.ts)
  - Zod dishResponseSchema updated with 'spicy' in dietary_tags enum (lib/types/llm.ts)
  - LLM system prompt updated to detect and output 'spicy' dietary tag (lib/openai.ts)

affects:
  - 06-02 (Plan 02 - dish cards and filter bar UI components consume all outputs from this plan)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SSR-safe i18n: useState('fr') default, useEffect corrects from localStorage/navigator.language on client mount
    - Flat translation dictionary as const TypeScript object — no i18n library needed for 4 languages
    - useFilteredDishes with explicit useMemo + [items, filters] dependency array for array filter operations
    - 'nom_lang' localStorage key for language persistence

key-files:
  created:
    - lib/i18n/index.tsx
    - lib/i18n/translations.ts
    - hooks/useFilteredDishes.ts
  modified:
    - lib/types/menu.ts
    - lib/types/llm.ts
    - lib/openai.ts

key-decisions:
  - "lib/i18n/index.tsx uses .tsx extension (not .ts) — JSX syntax required for LanguageProvider's return statement"
  - "SSR-safe initialization: useState('fr') default, never read localStorage in initializer — useEffect corrects client-side only"
  - "useMemo retained in useFilteredDishes despite React 19 compiler — explicit intent for potentially large array filter operations"
  - "DietaryTag 'spicy' added as text[] non-breaking change — no DB migration needed (column already accepts any strings)"

patterns-established:
  - "Pattern: i18n hook reads t(key) from flat dictionary; dish names/descriptions come from DB TranslationMap directly"
  - "Pattern: Filter AND-stacking — dietary (dish must have ALL tags) + allergen exclusion (dish must have NONE) both applied"

requirements-completed: [DISH-02, DISH-05, DISH-06, FILT-01, FILT-02, FILT-03, FILT-04]

# Metrics
duration: 3min
completed: 2026-02-25
---

# Phase 6 Plan 01: i18n System, Filtering Hook, and Spicy Schema Summary

**Custom React i18n context with 4-language flat dictionary (FR/EN/TR/DE), AND-stacked useFilteredDishes hook, and 'spicy' DietaryTag propagated through TypeScript type, Zod schema, and LLM system prompt**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-25T16:40:48Z
- **Completed:** 2026-02-25T16:43:56Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- LanguageProvider + useLanguage hook with SSR-safe initialization (no hydration mismatch risk) and localStorage persistence
- Complete 4-language translation dictionary (FR/EN/TR/DE) with 30+ keys covering all UI strings needed by Plan 02: allergen labels, dietary tags, trust badges, filter chips, empty state, language switcher, menu header, clear filters
- useFilteredDishes hook with AND-stacked filtering: dietary inclusion (all active tags required) + allergen exclusion (no excluded allergens allowed)
- 'spicy' dietary tag closed across the full stack: TypeScript type, Zod validation schema, and LLM system prompt

## Task Commits

Each task was committed atomically:

1. **Task 1: i18n system — LanguageProvider, useLanguage hook, 4-language dictionary** - `3b6194c` (feat)
2. **Task 2: Add 'spicy' to DietaryTag, Zod schema, and LLM prompt** - `9338bf1` (feat)
3. **Task 3: Create useFilteredDishes hook** - `14a87ba` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `lib/i18n/index.tsx` — LanguageProvider context + useLanguage hook, SSR-safe, localStorage persistence
- `lib/i18n/translations.ts` — Flat const dictionary: FR/EN/TR/DE, 30+ UI string keys with `as const` for type safety
- `hooks/useFilteredDishes.ts` — FilterState type + useFilteredDishes hook, useMemo, AND-stacked filters
- `lib/types/menu.ts` — DietaryTag extended to include 'spicy'
- `lib/types/llm.ts` — dishResponseSchema dietary_tags Zod enum updated to include 'spicy'
- `lib/openai.ts` — MENU_PARSE_SYSTEM_PROMPT section 6 updated with spicy detection instructions

## Decisions Made

- `lib/i18n/index.tsx` uses `.tsx` extension (not `.ts`) because the LanguageProvider component returns JSX; TypeScript requires `.tsx` for JSX syntax
- SSR-safe i18n: `useState('fr')` as initial value — never read localStorage in the initializer to avoid hydration mismatch between server and client render
- Kept `useMemo` in `useFilteredDishes` despite React 19 compiler — explicit dependency array is clearer intent for array filter operations
- No DB migration needed for 'spicy' — `dietary_tags` is stored as `text[]` (not a PostgreSQL enum), so adding the tag is a non-breaking change

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Renamed lib/i18n/index.ts to lib/i18n/index.tsx**
- **Found during:** Task 1 (i18n system creation)
- **Issue:** File created as `.ts` but contains JSX return statement in LanguageProvider component. TypeScript reported 4 parse errors because JSX syntax is only valid in `.tsx` files
- **Fix:** Renamed to `lib/i18n/index.tsx` — TypeScript check passed immediately
- **Files modified:** lib/i18n/index.tsx (renamed from index.ts)
- **Verification:** `npx tsc --noEmit` passes with 0 errors
- **Committed in:** `3b6194c` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — file extension mismatch)
**Impact on plan:** Minimal — the plan specified `lib/i18n/index.ts` but JSX requires `.tsx`. Auto-fixed inline with no scope change.

## Issues Encountered

None beyond the .ts→.tsx fix documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 can now import `LanguageProvider`, `useLanguage` from `@/lib/i18n`
- Plan 02 can import `useFilteredDishes`, `FilterState` from `@/hooks/useFilteredDishes`
- All translation keys are in place for AllergenBanner, FilterBar, DishCard, and language switcher components
- DietaryTag type, Zod schema, and LLM prompt all include 'spicy' — future menu parses will detect spicy dishes

---
*Phase: 06-dish-cards-and-filters*
*Completed: 2026-02-25*

## Self-Check: PASSED

All files verified present. All task commits verified in git log.
