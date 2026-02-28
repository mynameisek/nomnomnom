---
phase: 08-eazee-link-translation-fix
plan: 01
subsystem: api
tags: [llm, openai, zod, supabase, translation, eazee-link, cache]

# Dependency graph
requires:
  - phase: 07-navigation-and-admin
    provides: admin_config for llm_model, cache layer with getOrParseMenu, preParseResult bypass pattern
  - phase: 05-scan-pipeline
    provides: fetchEazeeLinkMenu, DishResponse type, getOrParseMenu signature

provides:
  - eazeeLinkMenuTranslationSchema and eazeeLinkDishTranslationSchema Zod schemas in lib/types/llm.ts
  - translateEazeeLinkDishes function in lib/openai.ts — batched 4-lang translation with cultural context
  - getCachedMenu helper in lib/cache.ts — lightweight cache-check-only helper
  - Cache-aware eazee-link scan route: check cache first, translate on miss, fallback on LLM error
  - source_language stored in menus row for all eazee-link scans

affects:
  - Any future phase touching eazee-link scan pipeline
  - Phase 09+ if cultural context field is promoted to its own DB column

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "translateEazeeLinkDishes: single batched LLM call for all 4 languages, merge-by-index, cultural context appended to description_translations"
    - "getCachedMenu: lightweight cache-check helper before expensive LLM calls — avoids translation cost on cache hits"
    - "Cache-first pattern in route.ts: getCachedMenu -> fetchEazeeLinkMenu -> translateEazeeLinkDishes -> getOrParseMenu"
    - "Translation failure graceful fallback: catch translateEazeeLinkDishes error, store untranslated dishes"

key-files:
  created: []
  modified:
    - lib/types/llm.ts
    - lib/openai.ts
    - lib/cache.ts
    - app/api/scan/url/route.ts

key-decisions:
  - "getCachedMenu helper added to lib/cache.ts (not getOrParseMenu internal check) — keeps cache layer clean, avoids callback complexity"
  - "Cultural context appended to description_translations as parenthetical suffix — no DB migration needed, fits existing MenuItem shape"
  - "Translation fallback: catch error in route.ts, store untranslated dishes (same as before fix) — user always gets a menu"
  - "preParseResult DishResponse variant extended with optional source_language — minimal signature change, backward compatible"

patterns-established:
  - "Cache-first before LLM: getCachedMenu -> [LLM step] -> getOrParseMenu pattern for any future provider-specific translation"
  - "Batched index-tagged translation: build dishList with index, find by index in LLM output, fallback on miss (Pitfall 3 guard)"

requirements-completed:
  - DISH-02

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 8 Plan 01: Eazee-link Translation Fix Summary

**Single batched LLM call injects real FR/EN/TR/DE translations with cultural context for eazee-link dishes before Supabase cache storage, with cache-first check to avoid translation cost on re-scans.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-26T00:00:19Z
- **Completed:** 2026-02-26T00:03:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `eazeeLinkDishTranslationSchema` and `eazeeLinkMenuTranslationSchema` Zod schemas with `.nullable()` throughout (OpenAI structured output compatible)
- Added `EAZEE_TRANSLATE_SYSTEM_PROMPT` (auto-detect source lang, translate names + descriptions into 4 languages simultaneously, add cultural context) and `translateEazeeLinkDishes` function with index-based merge and partial-output fallback
- Added `getCachedMenu` helper to `lib/cache.ts` that returns cached menu or null — used to gate the translation LLM call in the eazee-link route
- Rewrote eazee-link branch in `app/api/scan/url/route.ts`: cache check first (instant return on hit), fetch + translate + store on miss, graceful fallback to untranslated dishes if LLM fails

## Task Commits

Each task was committed atomically:

1. **Task 1: Add translation Zod schema, system prompt, and translateEazeeLinkDishes function** - `fbe11ec` (feat)
2. **Task 2: Add getCachedMenu helper and wire cache-aware translation into eazee-link route** - `2702bcf` (feat)

**Plan metadata:** `[docs commit hash]` (docs: complete plan)

## Files Created/Modified
- `lib/types/llm.ts` - Added `eazeeLinkDishTranslationSchema`, `eazeeLinkMenuTranslationSchema`, `EazeeLinkDishTranslation`, `EazeeLinkMenuTranslation` types
- `lib/openai.ts` - Added `EAZEE_TRANSLATE_SYSTEM_PROMPT` and `translateEazeeLinkDishes` function
- `lib/cache.ts` - Added `getCachedMenu` helper; extended `getOrParseMenu` preParseResult type to accept `source_language` from DishResponse variant
- `app/api/scan/url/route.ts` - Rewrote eazee-link branch with cache-first pattern, translation step, and graceful fallback

## Decisions Made
- `getCachedMenu` implemented as a standalone helper in `lib/cache.ts` (not as an internal check inside `getOrParseMenu`) — avoids adding callback/lazy-param complexity to the cache layer. Route.ts owns the cache-first logic for eazee-link specifically.
- Cultural context merged into `description_translations` (parenthetical suffix if description exists, standalone if no description) — no new DB column needed. Dedicated column is Phase 9+ scope.
- `preParseResult` DishResponse union variant extended with optional `source_language` — backward compatible with existing photo/QR paths that don't pass it.
- Translation error is caught in route.ts, not propagated — user always gets a menu (untranslated fallback acceptable per CONTEXT.md).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Uses existing OPENAI_API_KEY and Supabase env vars.

## Next Phase Readiness
- Eazee-link scan pipeline now produces genuinely translated dish cards in FR/EN/TR/DE on first scan
- Re-scans of cached eazee-link URLs return instantly (zero LLM cost)
- `source_language` is stored in `menus` row for all eazee-link scans, fixing `/api/translate` prompt quality for any future lazy re-translation
- Old untranslated cache entries will remain until TTL expires (7 days default) — lazy-by-default strategy per RESEARCH.md recommendation

---
*Phase: 08-eazee-link-translation-fix*
*Completed: 2026-02-26*
