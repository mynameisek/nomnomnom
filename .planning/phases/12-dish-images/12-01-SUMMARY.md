---
phase: 12-dish-images
plan: "01"
subsystem: api
tags: [unsplash, pexels, stock-photos, image-pipeline, supabase, nextjs, fire-and-forget]

# Dependency graph
requires:
  - phase: 11-dish-enrichment
    provides: enrichDishBatch, enrichment_depth/enrichment_status/is_beverage fields, after() pipeline pattern

provides:
  - SQL migration adding image_url, image_source, image_credit, image_credit_url, image_placeholder to menu_items
  - lib/images.ts with fetchDishImages (Unsplash -> Pexels -> null pipeline)
  - lib/image-utils.ts with hexToDataURL and buildImageQuery utilities
  - fetchDishImages chained after enrichDishBatch in all scan route after() blocks
  - Status endpoint exposes image fields for polling hook consumption

affects:
  - 12-02 (UI phase needs image_url, image_placeholder, image_credit from this pipeline)
  - useEnrichmentPolling hook (needs image fields from status endpoint)
  - DishCard and DishDetailSheet components (consume image_url and image_placeholder)

# Tech tracking
tech-stack:
  added:
    - blurhash ^2.0.5 (installed, for future use — current placeholder uses hexToDataURL)
  patterns:
    - Fire-and-forget image fetch chained after enrichDishBatch via after()
    - Unsplash -> Pexels -> null fallback chain (rate-limit aware)
    - Canonical name deduplication (copy existing image, zero API cost)
    - 1x1 BMP data URL as blurDataURL placeholder (server-safe, no canvas)

key-files:
  created:
    - supabase/migrations/20260228230000_dish_images.sql
    - lib/images.ts
    - lib/image-utils.ts
  modified:
    - lib/types/menu.ts
    - next.config.ts
    - app/api/scan/url/route.ts
    - app/api/scan/photo/route.ts
    - app/api/enrichment/status/route.ts

key-decisions:
  - "fetchDishImages queries only enrichment_depth='full' items — minimal depth dishes skip image fetch in automatic pipeline (cost-conscious)"
  - "hexToDataURL (1x1 BMP) used as blur placeholder for both Unsplash and Pexels — server-safe, no canvas, no external deps"
  - "Canonical name deduplication: before any external API call, check if another menu_item with same canonical_name already has image_url — copy it (zero API cost)"
  - "Unsplash rate limit guard: check X-Ratelimit-Remaining header, fall through to Pexels if < 5 remaining"
  - "Per-item try/catch inside fetchDishImages loop — one item failure never stops batch processing"

patterns-established:
  - "Pattern: image fetch pipeline mirrors enrichment pipeline (server-only, fire-and-forget, top-level try/catch)"
  - "Pattern: canonical name deduplication before external API calls prevents duplicate fetch for same dish name"

requirements-completed:
  - ENRI-05

# Metrics
duration: 5min
completed: 2026-02-28
---

# Phase 12 Plan 01: Dish Images Backend Summary

**Unsplash-first stock photo pipeline (Pexels fallback) with per-item attribution storage, canonical name deduplication, and fire-and-forget wiring after enrichDishBatch in all scan routes**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-28T16:50:43Z
- **Completed:** 2026-02-28T16:55:23Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- SQL migration adds 5 columns to menu_items for full image attribution (url, source, credit, credit_url, placeholder)
- lib/images.ts implements Unsplash -> Pexels -> null chain with rate limit awareness, download tracking, and canonical name deduplication
- lib/image-utils.ts provides hexToDataURL (1x1 BMP, server-safe) and buildImageQuery (cuisine-aware query construction)
- fetchDishImages chained after enrichDishBatch in 4 URL scan route after() blocks + 1 photo route after() block
- Status endpoint SELECT extended with 5 image fields so polling hook picks up images as they arrive

## Task Commits

Each task was committed atomically:

1. **Task 1: SQL migration + MenuItem image fields + image utilities + Pexels remotePattern** - `587ced8` (feat)
2. **Task 2: image fetch pipeline + scan route wiring + status endpoint image fields** - `9b6e1dd` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `supabase/migrations/20260228230000_dish_images.sql` - Adds 5 nullable image columns to menu_items
- `lib/images.ts` - fetchFromUnsplash, fetchFromPexels, fetchDishImages (main export)
- `lib/image-utils.ts` - hexToDataURL (1x1 BMP data URL), buildImageQuery (cuisine-hint search)
- `lib/types/menu.ts` - MenuItem interface extended with 5 image fields
- `next.config.ts` - images.pexels.com added to remotePatterns alongside images.unsplash.com
- `app/api/scan/url/route.ts` - fetchDishImages imported + chained in 4 enrichment after() blocks
- `app/api/scan/photo/route.ts` - fetchDishImages imported + chained in 1 enrichment after() block
- `app/api/enrichment/status/route.ts` - SELECT extended with image_url, image_source, image_credit, image_credit_url, image_placeholder

## Decisions Made

- Used hexToDataURL (1x1 BMP, pure-JS, no canvas) rather than full blurhash decode for server-side placeholder generation. The `blurhash` package is installed for potential future client-side use. The BMP approach works identically for both Unsplash (photo.color) and Pexels (avg_color) since both return a dominant hex color.
- Only `enrichment_depth = 'full'` dishes get images in the automatic pipeline. Minimal-depth dishes (French/familiar) are intentionally skipped to conserve Unsplash demo rate limit (50 req/hr). This matches the plan's cost-conscious guidance.
- Canonical name deduplication check happens before any external API call — if the same canonical_name already has an image in the database (from any menu), it copies those fields instead of making a new API call.
- Unsplash download tracking fires as a fire-and-forget fetch (catch ignored) immediately upon photo selection — required by Unsplash API guidelines, treating our automated store as equivalent to a user "selecting" the photo.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration before images will be fetched:**

### Environment Variables (add to .env.local and Vercel dashboard)

```
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
PEXELS_API_KEY=your_pexels_api_key
```

### Unsplash Setup
1. Go to https://unsplash.com/developers -> Your Apps -> New Application
2. Accept guidelines -> Copy Access Key -> set as UNSPLASH_ACCESS_KEY
3. Apply for Production approval (50 req/hr demo vs 5,000 req/hr production)
   - Location: https://unsplash.com/developers -> Your App -> Request Production
   - Approval timeline: ~48 hours to 5 business days

### Pexels Setup
1. Go to https://www.pexels.com/api/new/
2. Generate API Key -> set as PEXELS_API_KEY

### Notes
- Without API keys, fetchDishImages returns null for all items (both functions return null if key is missing)
- Images for beverages are skipped automatically (is_beverage filter)
- Rate limit fallback: if Unsplash X-Ratelimit-Remaining < 5, automatically falls through to Pexels
- SQL migration must be applied to Supabase before images can be stored

## Next Phase Readiness

- Backend pipeline complete: scan -> enrich -> fetch images is fully wired
- Status endpoint returns image fields — UI polling hook can consume them
- Phase 12 Plan 02 can build DishImage component, DishCard image zone, and DishDetailSheet attribution
- Prerequisite: Apply SQL migration to Supabase and configure UNSPLASH_ACCESS_KEY / PEXELS_API_KEY

## Self-Check: PASSED

- supabase/migrations/20260228230000_dish_images.sql: FOUND
- lib/images.ts: FOUND
- lib/image-utils.ts: FOUND
- .planning/phases/12-dish-images/12-01-SUMMARY.md: FOUND
- Commit 587ced8: FOUND
- Commit 9b6e1dd: FOUND

---
*Phase: 12-dish-images*
*Completed: 2026-02-28*
