---
phase: 10-db-foundation-canonical-names
plan: "02"
subsystem: pipeline
tags: [canonical-names, llm, cache, after, scan-pipeline, seed-data]
dependency_graph:
  requires:
    - 10-01 (canonical columns on menu_items, known_dishes table, canonicalBatchSchema)
  provides:
    - generateCanonicalNames() function in lib/canonical.ts
    - hashDishNames() function in lib/cache.ts
    - canonicalCache recycling in getOrParseMenu
    - dish_names_hash storage on menu rows
    - after() wiring in url/route.ts (all 4 cache-miss paths)
    - after() wiring in photo/route.ts
    - 124 known_dishes seed entries across 7 cuisines
  affects:
    - Phase 11 (enrichment worker reads enrichment_status='pending', uses is_beverage flag for deprioritization)
    - Phase 14 (known_dishes seed table provides reference data for match_dishes RPC)
tech_stack:
  added: []
  patterns:
    - Fire-and-forget pattern (mirrors google-places.ts) — never throws, logs all errors
    - Batch LLM call with Output.object() + canonicalBatchSchema Zod schema
    - 80-dish chunk ceiling to prevent LLM timeout on large menus
    - Dual-after() pattern — Places enrichment and canonical generation run concurrently
    - canonicalCache Map mirrors translationCache pattern for name_original-keyed recycling
    - dish_names_hash computed from sorted, normalized dish names (order-invariant)
key_files:
  created:
    - lib/canonical.ts
    - supabase/migrations/20260228210000_known_dishes_seed.sql
  modified:
    - lib/cache.ts
    - app/api/scan/url/route.ts
    - app/api/scan/photo/route.ts
decisions:
  - "Canonical generation runs inside after() — never blocking scan HTTP response (KNOW-03)"
  - "All items (food + beverages) get enrichment_status='pending' — is_beverage flag signals Phase 11 to deprioritize beverages, not skip them (KNOW-04)"
  - "Cache HIT paths do NOT call generateCanonicalNames — canonical names survive via canonicalCache recycling in getOrParseMenu"
  - "Per-batch error handling in generateCanonicalNames — one failed batch does not abort remaining chunks"
  - "dish_names_hash stored fire-and-forget after insert — enables future content-aware diff without blocking"
  - "Two separate after() calls (Places + Canonical) per scan path — they run concurrently, not chained"
metrics:
  duration: "15 minutes"
  completed: "2026-02-28"
  tasks_completed: 2
  files_modified: 5
---

# Phase 10 Plan 02: Canonical Name Pipeline Summary

**One-liner:** Batch LLM canonical name generation via after() with 80-dish chunking, canonicalCache recycling on re-scan, dish_names_hash for content diff, and 124-entry known_dishes seed across 7 cuisines.

## What Was Built

### Task 1: lib/canonical.ts + lib/cache.ts + seed migration (commit: 6abfb85)

**lib/canonical.ts** — core canonical name generation module:

1. `generateCanonicalNames(menuId: string): Promise<void>` — fire-and-forget, mirrors google-places.ts pattern
2. **Fetch pending items**: queries `menu_items WHERE menu_id = menuId AND canonical_name IS NULL` — returns early if empty (natural optimization for re-scans where all names were recycled)
3. **80-dish chunking**: prevents LLM timeout on large Turkish/Chinese menus (Research Pitfall 2 mitigation)
4. **System prompt**: canonical name normalization rules — Latin diacritics OK (Mantı, Börek), no CJK/Arabic/Cyrillic, confidence tiers (≥0.80 high, 0.50–0.79 medium, <0.50 low), beverage detection using category/subcategory context
5. **LLM call**: `generateText` + `Output.object({ schema: canonicalBatchSchema })`, `maxRetries: 1`
6. **enrichment_status logic**: failed if canonical_name is null, otherwise 'pending' for all items (is_beverage flag signals Phase 11 deprioritization)
7. **Batch upsert**: `supabaseAdmin.from('menu_items').upsert(updates, { onConflict: 'id' })` — one round-trip per chunk
8. **Error handling**: top-level catch + per-batch catch — never throws, logs with `[generateCanonicalNames]` prefix

**lib/cache.ts** additions:

1. `hashDishNames(dishes: { name_original: string }[])` — sorts + normalizes names, computes SHA-256; order-invariant (reordering dishes produces same hash)
2. `canonicalCache` Map alongside `translationCache` in the Step 5.5 harvest block — keyed by `name_original`, populated from old items where `canonical_name IS NOT NULL`
3. Canonical recycling in `menuItems` map — both DishResponse (eazee-link) and DishParse (fast-parse) paths check `canonicalCache.get(dish.name_original)` and include recycled fields
4. `dish_names_hash` computed via `hashDishNames(parsed.dishes)` and stored fire-and-forget on the new menu row

**supabase/migrations/20260228210000_known_dishes_seed.sql** — 124 seed entries:

| Cuisine | Count |
|---------|-------|
| Turkish | 29 |
| North African | 20 |
| Alsatian | 15 |
| Japanese | 15 |
| Italian | 15 |
| Chinese | 15 |
| French gastronomy | 15 |

Each entry has: `canonical_name` (Latin script), `aliases` (3-6 variants), `cuisine`, `is_beverage = FALSE`, `description_fr`, `description_en`. Migration uses `ON CONFLICT (canonical_name) DO NOTHING` — fully idempotent.

Notable entries: Mantı, Börek, Tarte Flambée, Baeckeoffe, Xiaolongbao, İskender Kebab, Blanquette de Veau, Chakchouka, Okonomiyaki — prioritized for dishes hardest to interpret for non-native Strasbourg diners.

### Task 2: Scan route wiring (commit: 27b716f)

**app/api/scan/url/route.ts** — 4 cache-miss paths wired:
- Path A (eazee-link MISS): `after(async () => { await generateCanonicalNames(menu.id); })`
- Path B (generic text): same
- Path B2 (PDF): same
- Path C (screenshot fallback): same

Cache HIT path (Path A cache hit, line 65) returns early at line 80 — intentionally skipped. Canonical names already exist from original scan, or will be recycled via canonicalCache if re-parse is triggered.

**app/api/scan/photo/route.ts** — single path wired after `getOrParseMenu`.

Both routes use two separate `after()` calls — `enrichWithGooglePlaces` and `generateCanonicalNames` run concurrently (Next.js docs confirm multiple `after()` calls are valid).

## Re-scan Canonical Name Preservation Flow

1. Re-scan hits `getOrParseMenu` (cache TTL expired or menu deleted)
2. `oldMenu` exists → `oldItems` queried with canonical fields
3. `canonicalCache` populated from `oldItems` where `canonical_name IS NOT NULL`
4. New `menu_items` inserted with recycled canonical fields from cache
5. `generateCanonicalNames` called via `after()` — queries `WHERE canonical_name IS NULL`
6. If all names were recycled: 0 rows returned, function returns early (log: "No pending items")
7. If some new dishes added: only those get LLM canonical names

## Verification

1. `tsc --noEmit`: PASS — zero errors
2. `lib/canonical.ts` exports `generateCanonicalNames` — YES
3. `lib/cache.ts` exports `hashDishNames` and contains `canonicalCache` — YES
4. Both scan routes import and call `generateCanonicalNames` via `after()` on cache-miss paths — YES
5. Cache HIT path does NOT call `generateCanonicalNames` — YES (returns at line 80)
6. Seed migration has 124 entries across 7 cuisines — YES
7. `ON CONFLICT (canonical_name) DO NOTHING` present — YES
8. Chunking at 80 dishes prevents LLM timeout on large menus — YES

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- File exists: `lib/canonical.ts` — YES
- File exists: `lib/cache.ts` (modified) — YES
- File exists: `app/api/scan/url/route.ts` (modified) — YES
- File exists: `app/api/scan/photo/route.ts` (modified) — YES
- File exists: `supabase/migrations/20260228210000_known_dishes_seed.sql` — YES
- Commit 6abfb85 exists — YES
- Commit 27b716f exists — YES
- `tsc --noEmit` passes — YES
- 124 seed entries confirmed — YES
