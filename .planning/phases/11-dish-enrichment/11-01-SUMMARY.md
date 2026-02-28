---
phase: 11-dish-enrichment
plan: "01"
subsystem: enrichment-backend
tags: [enrichment, llm, batch, supabase, migration, api]
dependency_graph:
  requires: [10-02]
  provides: [enrichDishBatch, enrichment-status-endpoint, enrichment-migration]
  affects: [app/api/scan/url/route.ts, app/api/scan/photo/route.ts]
tech_stack:
  added: []
  patterns: [fire-and-forget, adaptive-depth, batch-llm, anon-client-polling]
key_files:
  created:
    - supabase/migrations/20260228220000_enrichment_fields.sql
    - lib/enrichment.ts
    - app/api/enrichment/status/route.ts
  modified:
    - lib/types/llm.ts
    - lib/types/menu.ts
    - app/api/scan/url/route.ts
    - app/api/scan/photo/route.ts
decisions:
  - Chunk size 40 for enrichment (vs 80 for canonical names) because enrichment output is longer per dish
  - Beverages marked skipped immediately in enrichDishBatch before any LLM call to prevent polling stall
  - enrichDishBatch chained sequentially after generateCanonicalNames in same after() callback to guarantee is_beverage is set before enrichment reads it
  - Status endpoint uses anon Supabase client (no PII in enrichment fields)
  - Items not returned by LLM marked as failed (not stuck as pending)
metrics:
  duration: "~5 minutes"
  completed: "2026-02-28"
  tasks_completed: 2
  files_modified: 7
---

# Phase 11 Plan 01: Enrichment Backend Pipeline Summary

Batch LLM enrichment pipeline with adaptive depth (full/minimal) for food dishes, beverage skipping, scan route chaining, and status polling endpoint.

## What Was Built

### Task 1: SQL Migration + Zod Schema + MenuItem Type
- **SQL migration** (`20260228220000_enrichment_fields.sql`): Adds 7 enrichment columns to `menu_items` using `ADD COLUMN IF NOT EXISTS` guards — all nullable for safe rollout on existing rows.
- **Zod schemas** in `lib/types/llm.ts`: `enrichmentDishResultSchema` (per-dish with `depth_tier`, `origin`, `typical_ingredients`, `cultural_note`, `eating_tips`) and `enrichmentBatchSchema` (top-level wrapper). Uses `.nullable()` per OpenAI structured output requirement.
- **MenuItem interface** in `lib/types/menu.ts`: Added 7 enrichment fields (`enrichment_origin`, `enrichment_ingredients`, `enrichment_cultural_note`, `enrichment_eating_tips`, `enrichment_depth`, `enrichment_model`, `enriched_at`).

### Task 2: enrichment.ts + Scan Wiring + Status Endpoint
- **`lib/enrichment.ts`**: Fire-and-forget `enrichDishBatch(menuId)` function mirroring `lib/canonical.ts` pattern. Immediately marks beverages as `skipped` (critical: prevents polling stall). Chunks food items at 40 per batch. Calls LLM with adaptive depth system prompt. Upserts enriched results; marks LLM-dropped items as `failed`. Top-level and per-batch try/catch — never throws.
- **Scan routes**: Both `app/api/scan/url/route.ts` (4 cache-miss paths) and `app/api/scan/photo/route.ts` (single path) now chain `enrichDishBatch` sequentially after `generateCanonicalNames` in the same `after()` callback — guarantees `is_beverage` is set before enrichment reads it.
- **`app/api/enrichment/status/route.ts`**: `GET /api/enrichment/status?menuId=X` returns `{ items: [...] }` for all non-beverage food items. Uses anon Supabase client (no PII). Filters `is_beverage = false`.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Chunk size 40 (not 80) | Enrichment JSON output per dish is 4-5x larger than canonical names |
| Sequential chaining (not concurrent after()) | `is_beverage` must be set by canonical gen before enrichment can safely skip beverages |
| Beverages skipped immediately at Step 2 | If beverages stay `pending`, the front-end polling hook never resolves (Research Pitfall 2) |
| Anon client for status endpoint | Enrichment fields (ingredients, cultural notes) contain zero PII |
| Failed fallback on LLM drops | Items not returned by LLM marked `failed` — prevents infinite `pending` state |

## Verification Results

1. `npx tsc --noEmit` — PASS (zero errors)
2. SQL migration has 7 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements — PASS
3. `enrichmentBatchSchema` exported from `lib/types/llm.ts` with all required fields — PASS
4. `enrichDishBatch` exported, marks beverages `skipped`, chunks food at 40 — PASS
5. Both scan routes chain `enrichDishBatch` after `generateCanonicalNames` in same `after()` — PASS
6. `GET /api/enrichment/status` uses anon client, filters `is_beverage = false` — PASS

## Commits

| Hash | Description |
|------|-------------|
| ac7d247 | feat(11-01): SQL migration + enrichment Zod schema + MenuItem type fields |
| 28173c6 | feat(11-01): enrichment pipeline, scan wiring, status endpoint |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

All created files exist on disk. Both commits (ac7d247, 28173c6) confirmed in git history.
