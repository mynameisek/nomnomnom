---
phase: 10-db-foundation-canonical-names
verified: 2026-02-28T00:00:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
---

# Phase 10: DB Foundation + Canonical Names — Verification Report

**Phase Goal:** Every scanned dish receives a normalized canonical name stored persistently, backed by the full schema needed for all v1.2 intelligence features
**Verified:** 2026-02-28
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | menu_items table has canonical_name, canonical_confidence, canonical_source, is_beverage, enrichment_status, and embedding columns | VERIFIED | `20260228200000_v12_foundation.sql` lines 11-17: all 7 columns added with `ADD COLUMN IF NOT EXISTS` guards |
| 2 | known_dishes table exists with canonical_name (unique), aliases TEXT[], cuisine, is_beverage, description_fr, description_en, embedding columns | VERIFIED | Migration lines 32-43: `CREATE TABLE IF NOT EXISTS known_dishes` with `UNIQUE` on canonical_name and all required columns |
| 3 | match_dishes RPC function exists and accepts query_embedding, match_threshold, match_count parameters | VERIFIED | Migration lines 50-73: `CREATE OR REPLACE FUNCTION match_dishes(query_embedding extensions.vector(1536), match_threshold FLOAT DEFAULT 0.85, match_count INT DEFAULT 5)` returning (id, canonical_name, aliases, cuisine, similarity) |
| 4 | HNSW indexes exist on both menu_items.embedding and known_dishes.embedding | VERIFIED | Migration lines 23-24 and 46-47: `idx_menu_items_embedding` and `idx_known_dishes_embedding` both using `USING hnsw (embedding extensions.vector_cosine_ops)` |
| 5 | TypeScript MenuItem interface includes all new canonical/enrichment fields | VERIFIED | `lib/types/menu.ts` lines 100-105: canonical_name, canonical_confidence, canonical_source, is_beverage, enrichment_status, embedding_model all present |
| 6 | Menu interface includes dish_names_hash field | VERIFIED | `lib/types/menu.ts` line 68: `dish_names_hash: string \| null` present |
| 7 | Scanning a Turkish menu produces canonical_name values stored in menu_items rows | VERIFIED | `lib/canonical.ts` exports `generateCanonicalNames(menuId)` — queries pending items, calls LLM with `canonicalBatchSchema`, upserts results to `menu_items` via `supabaseAdmin.from('menu_items').upsert(updates, { onConflict: 'id' })` |
| 8 | Re-scanning the same URL returns cached canonical names without a new LLM call | VERIFIED | `lib/cache.ts` lines 226-259: `canonicalCache` Map harvests canonical fields from `oldItems`; recycled into new `menu_items` inserts on both DishResponse and DishParse paths; `generateCanonicalNames` queries `WHERE canonical_name IS NULL` — returns early if all recycled |
| 9 | Beverages receive is_beverage=true and enrichment_status='pending'; food items receive enrichment_status='pending' | VERIFIED | `lib/canonical.ts` lines 154-170: all items with a canonical_name (food + beverage) receive `enrichment_status='pending'`; `is_beverage` stored from LLM output; only `canonical_name=null` → `enrichment_status='failed'`; no 'skipped' case for beverages |
| 10 | Canonical name generation runs inside after() and does not block the scan HTTP response | VERIFIED | `app/api/scan/url/route.ts` lines 90, 101, 135, 168: all 4 cache-miss paths call `after(async () => { await generateCanonicalNames(menu.id); })`; `app/api/scan/photo/route.ts` line 70: same pattern |
| 11 | known_dishes table is seeded with 100-200 entries covering Turkish, North African, Alsatian, Japanese, Italian, Chinese, and French cuisines | VERIFIED | `20260228210000_known_dishes_seed.sql`: 124 entry rows confirmed by line count; covers all 7 cuisines; uses `ON CONFLICT (canonical_name) DO NOTHING` |
| 12 | Menus with more than 80 dishes are chunked into batches of 80 for the canonical LLM call | VERIFIED | `lib/canonical.ts` lines 51-57, 101-103: `chunk()` helper splits at `CHUNK_SIZE = 80`; batches processed sequentially with per-batch error isolation |

**Score:** 12/12 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260228200000_v12_foundation.sql` | pgvector + unaccent extensions, new columns, known_dishes table, HNSW indexes, match_dishes RPC, dish_names_hash on menus | VERIFIED | 74 lines; all vector references use `extensions.vector(1536)`; both extensions use `WITH SCHEMA extensions`; all CREATE/ALTER use IF NOT EXISTS guards |
| `lib/types/menu.ts` | Updated MenuItem and Menu interfaces with canonical/enrichment fields | VERIFIED | MenuItem has 6 new fields (canonical_name, canonical_confidence, canonical_source, is_beverage, enrichment_status, embedding_model); Menu has dish_names_hash; embedding intentionally absent from TS type |
| `lib/types/llm.ts` | canonicalBatchSchema Zod schema for LLM structured output | VERIFIED | `canonicalDishResultSchema` and `canonicalBatchSchema` exported at lines 138-151; `CanonicalDishResult` and `CanonicalBatchResult` types exported at lines 163-164; uses `.nullable()` not `.optional()` per OpenAI requirement |
| `lib/canonical.ts` | generateCanonicalNames() function — batch LLM call, confidence tiers, beverage flagging, chunking | VERIFIED | 207 lines; `server-only`; fire-and-forget (never throws); 80-dish chunking; per-batch error isolation; upserts via `supabaseAdmin` |
| `lib/cache.ts` | Canonical name recycling on re-parse + dish_names_hash computation | VERIFIED | `hashDishNames()` exported at line 56; `canonicalCache` Map at line 226; recycled on both DishResponse and DishParse paths; `dish_names_hash` computed and stored fire-and-forget at lines 357-362 |
| `app/api/scan/url/route.ts` | after() wiring for canonical name generation on all cache-miss paths | VERIFIED | 4 cache-miss paths wired (lines 90, 101, 135, 168); cache HIT path (line 80 early return) correctly skips canonical generation |
| `app/api/scan/photo/route.ts` | after() wiring for canonical name generation | VERIFIED | Single path wired at line 70 after `getOrParseMenu` |
| `supabase/migrations/20260228210000_known_dishes_seed.sql` | 100-200 seed entries for known_dishes table | VERIFIED | 124 entries; `ON CONFLICT (canonical_name) DO NOTHING`; all entries have canonical_name, aliases (3-6 variants), cuisine, is_beverage=FALSE, description_fr, description_en |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `app/api/scan/url/route.ts` | `lib/canonical.ts` | import generateCanonicalNames, called inside after() | WIRED | Import at line 23; 4 `after(async () => { await generateCanonicalNames(menu.id); })` calls confirmed |
| `app/api/scan/photo/route.ts` | `lib/canonical.ts` | import generateCanonicalNames, called inside after() | WIRED | Import at line 18; `after(async () => { await generateCanonicalNames(menu.id); })` at line 70 |
| `lib/canonical.ts` | `supabaseAdmin.from('menu_items')` | batch upsert of canonical results | WIRED | `.upsert(updates, { onConflict: 'id' })` at line 181; updates array contains id, canonical_name, canonical_confidence, canonical_source, is_beverage, enrichment_status |
| `lib/cache.ts` | `canonicalCache recycling` | canonicalCache recycling mirrors translationCache pattern | WIRED | Map populated at line 250 from old items; consumed at lines 309 and 327 for DishResponse and DishParse paths respectively |
| `supabase/migrations/20260228200000_v12_foundation.sql` | `lib/types/menu.ts` | TypeScript types mirror DB columns exactly | WIRED | DB adds: canonical_name, canonical_confidence, canonical_source, is_beverage, enrichment_status, embedding_model, dish_names_hash — all present in MenuItem/Menu interfaces with matching nullability |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| KNOW-01 | 10-01, 10-02 | Each scanned dish receives a normalized canonical name stored persistently | SATISFIED | `generateCanonicalNames()` fetches pending items, calls LLM with `canonicalBatchSchema`, upserts canonical_name to `menu_items`; schema column is persistent DB storage |
| KNOW-02 | 10-01, 10-02 | A seed table of known dishes anchors normalization for regional cuisines | SATISFIED | `known_dishes` table created in foundation migration; 124 seed entries across 7 cuisines in seed migration; HNSW index ready for Phase 14 similarity matching |
| KNOW-03 | 10-02 | Enrichment is batch and async (via after()) — scan remains fast | SATISFIED | All scan paths (url: 4 paths, photo: 1 path) call `generateCanonicalNames` inside `after()` — HTTP response returned before canonical generation begins |
| KNOW-04 | 10-02 | Dishes are prioritized over beverages for enrichment | SATISFIED | `is_beverage` field stored from LLM output; all items receive `enrichment_status='pending'`; is_beverage flag signals Phase 11 to deprioritize beverages without skipping them entirely |

No orphaned requirements — all 4 Phase 10 requirements (KNOW-01 through KNOW-04) are claimed by plans 10-01 and 10-02 and verified with implementation evidence.

---

## Anti-Patterns Found

None. No TODO/FIXME/placeholder comments, no empty implementations, no stub returns found in any of the 5 modified files.

---

## Human Verification Required

### 1. End-to-end canonical name generation for a live Turkish menu

**Test:** Scan a Turkish restaurant menu URL (e.g., an eazee-link sticker ID pointing to a Turkish restaurant). After ~10-30 seconds (after() delay), query `menu_items WHERE menu_id = <returned_id>` in Supabase dashboard.
**Expected:** Rows show `canonical_name` populated (e.g., "Mantı", "Lahmacun"), `canonical_confidence` in 0.5-1.0 range, `canonical_source = 'llm_generated'`, `is_beverage = true` for drink items, `enrichment_status = 'pending'` for all.
**Why human:** LLM output quality and timing cannot be verified programmatically — requires a live Supabase + OpenAI environment.

### 2. Re-scan canonical name recycling

**Test:** Scan a URL, wait for canonical names to populate, then force a cache miss (delete the menu row in Supabase or wait for TTL expiry) and re-scan the same URL.
**Expected:** Canonical names for matching dishes (same `name_original`) should survive the re-scan — `canonicalCache` recycles them without triggering a new LLM call. Verify via Supabase dashboard: rows should have `canonical_source` preserved from original scan.
**Why human:** Requires a live environment with cache TTL manipulation and Supabase inspection.

### 3. Beverage deprioritization signal for Phase 11

**Test:** After scanning a menu with beverages, verify that beverage items have `is_beverage = true` and `enrichment_status = 'pending'` (not 'skipped').
**Expected:** The is_beverage flag is the signal to Phase 11 — beverages get canonical names but are queued at lower priority. All items should show `enrichment_status = 'pending'` unless canonical_name was null (→ 'failed').
**Why human:** Requires verifying actual LLM beverage classification accuracy against known test data.

---

## Gaps Summary

No gaps found. All 12 must-haves verified, all 4 requirements satisfied, all key links wired, TypeScript compiles cleanly (`tsc --noEmit` exits 0), 124 seed entries confirmed, anti-pattern scan clean.

The phase delivers exactly what was specified: every scanned dish receives a normalized canonical name stored persistently, backed by the full schema needed for v1.2 intelligence features (pgvector, HNSW indexes, known_dishes seed, match_dishes RPC, async generation pipeline).

---

_Verified: 2026-02-28_
_Verifier: Claude (gsd-verifier)_
