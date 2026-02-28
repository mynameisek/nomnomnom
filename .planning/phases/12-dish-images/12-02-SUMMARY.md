---
phase: 12-dish-images
plan: "02"
subsystem: ui
tags: [next-image, blur-up, gradient-fallback, dish-images, polling, unsplash, pexels, react]

# Dependency graph
requires:
  - phase: 12-dish-images
    plan: "01"
    provides: image_url, image_placeholder, image_credit, image_credit_url, image_source fields in MenuItem + status endpoint exposure

provides:
  - DishImage component with next/image blur-up and parent-controlled aspect ratio
  - DishImageFallback component with cuisine-gradient + ingredient emoji
  - lib/dish-fallback.ts cuisine gradient map (14 cuisines) + category/ingredient emoji lookups
  - DishCard image zone for full-depth enriched dishes (tappable, opens DishDetailSheet)
  - DishDetailSheet 4:3 image at top + photo credit link at bottom
  - useEnrichmentPolling extended to continue until images arrive for full-depth dishes (60s timeout)
  - MenuShell merge includes 5 image fields so polled images reach DishCard/DishDetailSheet

affects:
  - Phase 13+ (visual enrichment UI complete — images ship with full three-level detail pattern)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Parent-controlled aspect ratio — DishImage and DishImageFallback accept className for aspect, no hardcoded aspect-square
    - Three-level dish detail: basic=text-only, detail=square image on card, advanced=4:3 image with attribution in sheet
    - Cuisine gradient lookup: keyword-match on lowercased origin string, 14 cuisine entries + default

key-files:
  created:
    - lib/dish-fallback.ts
    - components/menu/DishImage.tsx
    - components/menu/DishImageFallback.tsx
  modified:
    - components/menu/DishCard.tsx
    - components/menu/DishDetailSheet.tsx
    - hooks/useEnrichmentPolling.ts
    - components/menu/MenuShell.tsx

key-decisions:
  - "Parent-controlled aspect ratio: DishImage and DishImageFallback use className ?? 'aspect-square' — DishCard uses default (square), DishDetailSheet passes aspect-[4/3] for immersive view"
  - "MenuShell cherry-picked enrichment fields in its useMemo merge — image fields added explicitly (Rule 2 auto-fix) to ensure polled images reach DishCard and DishDetailSheet"
  - "useEnrichmentPolling: polling extends to image arrival for full-depth dishes, with 60s safety timeout via startRef to prevent infinite poll on silent image failures"

patterns-established:
  - "Pattern: aspect ratio always set by parent container — components use className prop with fallback default"
  - "Pattern: gradient fallback uses keyword substring match on lowercased origin string for resilient cuisine detection"

requirements-completed:
  - ENRI-05

# Metrics
duration: 2min
completed: 2026-02-28
---

# Phase 12 Plan 02: Dish Images UI Summary

**Square blur-up dish images on DishCard, cuisine-gradient emoji fallback, and 4:3 image with photographer attribution in DishDetailSheet — three-level visual detail pattern complete**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-28T16:58:39Z
- **Completed:** 2026-02-28T17:01:28Z
- **Tasks:** 2 (+ 1 checkpoint awaiting human verify)
- **Files modified:** 7

## Accomplishments

- lib/dish-fallback.ts: cuisine gradient map for 14 cuisines, ingredient/category emoji lookups — provides intentional fallback visuals for dishes without stock photos
- DishImage + DishImageFallback components with parent-controlled aspect ratio; DishCard integrates both for full-depth enriched dishes only
- DishDetailSheet displays 4:3 image at top with photo credit link at bottom (Unsplash/Pexels attribution requirement)
- useEnrichmentPolling extended: continues polling until full-depth dishes have image_url, with 60s safety timeout
- MenuShell merge fixed to include all 5 image fields (image_url, image_source, image_credit, image_credit_url, image_placeholder)

## Task Commits

Each task was committed atomically:

1. **Task 1: DishImage + DishImageFallback + fallback data + DishCard image zone** - `cc47bac` (feat)
2. **Task 2: DishDetailSheet image + attribution + polling hook update + MenuShell image merge** - `e91c2ca` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `lib/dish-fallback.ts` - Cuisine gradient map (14 cuisines), category/ingredient emoji lookup, getCuisineGradient + getDishEmoji exports
- `components/menu/DishImage.tsx` - next/image with fill/object-cover/blur-up, aspect ratio from parent (default: aspect-square)
- `components/menu/DishImageFallback.tsx` - Linear gradient + emoji, aspect ratio from parent (default: aspect-square)
- `components/menu/DishCard.tsx` - Image zone before name row, full-depth items only; tappable to open DishDetailSheet
- `components/menu/DishDetailSheet.tsx` - 4:3 image at top, photo credit link at bottom
- `hooks/useEnrichmentPolling.ts` - hasPendingWork (renamed), polling extended for image arrival, 60s safety timeout
- `components/menu/MenuShell.tsx` - 5 image fields added to enrichment merge in useMemo

## Decisions Made

- Parent-controlled aspect ratio pattern: both DishImage and DishImageFallback accept an optional `className` prop that defaults to `'aspect-square'`. DishCard passes no className (square), DishDetailSheet passes `className="aspect-[4/3]"` (immersive). This keeps the components reusable without props for every aspect.
- MenuShell's merge was cherry-picking specific enrichment fields — image fields were missing. Added all 5 explicitly to ensure polled images propagate through to DishCard and DishDetailSheet.
- 60s safety timeout in useEnrichmentPolling: tracked via `startRef = useRef(Date.now())`, checked at top of each poll cycle. Prevents infinite polling if Unsplash/Pexels silently fails to deliver an image.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added 5 image fields to MenuShell merge**
- **Found during:** Task 2 (MenuShell verification step)
- **Issue:** MenuShell.tsx useMemo merge cherry-picked enrichment fields but omitted image_url, image_source, image_credit, image_credit_url, image_placeholder. Without this fix, polled images would never reach DishCard or DishDetailSheet.
- **Fix:** Added 5 image fields explicitly to the merge object in `mergedItems` useMemo
- **Files modified:** components/menu/MenuShell.tsx
- **Verification:** TypeScript passes, build passes
- **Committed in:** `e91c2ca` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical merge fields)
**Impact on plan:** Essential fix — without it images would never appear in UI despite being fetched. No scope creep.

## Issues Encountered

None.

## User Setup Required

None — setup already documented in Phase 12 Plan 01 SUMMARY.md (UNSPLASH_ACCESS_KEY + PEXELS_API_KEY).

## Next Phase Readiness

- Dish image UI complete: three-level pattern (text → square image → 4:3 image with attribution) ships
- Visual verification checkpoint (Task 3) pending user approval
- Phase 12 is complete upon checkpoint approval
- Phase 13 can proceed

## Self-Check: PASSED

- lib/dish-fallback.ts: FOUND
- components/menu/DishImage.tsx: FOUND
- components/menu/DishImageFallback.tsx: FOUND
- components/menu/DishCard.tsx (modified): FOUND
- components/menu/DishDetailSheet.tsx (modified): FOUND
- hooks/useEnrichmentPolling.ts (modified): FOUND
- components/menu/MenuShell.tsx (modified): FOUND
- Commit cc47bac: FOUND
- Commit e91c2ca: FOUND

---
*Phase: 12-dish-images*
*Completed: 2026-02-28*
