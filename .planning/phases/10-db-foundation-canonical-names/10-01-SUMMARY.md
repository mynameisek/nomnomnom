---
phase: 10-db-foundation-canonical-names
plan: "01"
subsystem: database
tags: [migration, pgvector, supabase, typescript, zod, schema]
dependency_graph:
  requires: []
  provides:
    - pgvector extension enabled
    - unaccent extension enabled
    - menu_items canonical enrichment columns
    - menu_items embedding column
    - menus dish_names_hash column
    - known_dishes table
    - match_dishes RPC
    - HNSW indexes on menu_items.embedding and known_dishes.embedding
    - MenuItem TypeScript interface with canonical fields
    - Menu TypeScript interface with dish_names_hash
    - canonicalBatchSchema Zod schema
  affects:
    - Phase 10 Plan 02 (LLM canonical name generation)
    - Phase 11 (enrichment worker reads enrichment_status)
    - Phase 14 (match_dishes RPC, embedding search)
tech_stack:
  added:
    - pgvector (extensions.vector) — semantic embedding storage and cosine similarity
    - unaccent — accent-insensitive dish name matching
  patterns:
    - HNSW index with cosine ops for approximate nearest neighbor search
    - Partial index on enrichment_status='pending' for queue polling
    - IF NOT EXISTS guards for idempotent migration
    - extensions.vector(1536) schema qualification (Supabase pgvector pattern)
    - .nullable() (not .optional()) for OpenAI structured output compatibility
key_files:
  created:
    - supabase/migrations/20260228200000_v12_foundation.sql
    - (conceptually) — no new app files, only DB migration
  modified:
    - lib/types/menu.ts
    - lib/types/llm.ts
decisions:
  - "embedding column NOT included in MenuItem TypeScript type — vectors are DB-only, never transported as JSON (too large)"
  - "embedding_model column added from day one, locked to text-embedding-3-small for v1.2 per STATE.md decision"
  - "canonicalDishResultSchema uses .nullable() on canonical_name, not .optional(), per OpenAI structured output requirement"
metrics:
  duration: "2 minutes"
  completed: "2026-02-28"
  tasks_completed: 2
  files_modified: 3
---

# Phase 10 Plan 01: SQL Migration and TypeScript Types Summary

**One-liner:** pgvector + unaccent extensions, canonical enrichment columns on menu_items, known_dishes seed table, HNSW indexes, match_dishes RPC, and matching TypeScript/Zod types for v1.2 dish enrichment foundation.

## What Was Built

### Task 1: SQL Migration (commit: 0fad6a5)

Created `supabase/migrations/20260228200000_v12_foundation.sql` — a single atomic migration that provisions the entire v1.2 schema foundation:

1. **Extensions:** `vector` and `unaccent` both enabled with `WITH SCHEMA extensions` (Supabase pattern)
2. **menu_items columns added:**
   - `canonical_name TEXT` — normalized dish name in Latin script
   - `canonical_confidence FLOAT` — 0.0 to 1.0 confidence score
   - `canonical_source TEXT` — 'seed_match' | 'llm_generated'
   - `is_beverage BOOLEAN NOT NULL DEFAULT FALSE`
   - `enrichment_status TEXT NOT NULL DEFAULT 'pending'`
   - `embedding extensions.vector(1536)` — for Phase 14 semantic search
   - `embedding_model TEXT` — which model generated the embedding
3. **menus column added:** `dish_names_hash TEXT` — SHA-256 of sorted dish names for content-aware re-scan diff
4. **HNSW index:** `idx_menu_items_embedding` on `menu_items.embedding` using `vector_cosine_ops`
5. **Partial index:** `idx_menu_items_enrichment_pending` on `enrichment_status='pending'` for efficient queue polling
6. **known_dishes table:** with UNIQUE `canonical_name`, `aliases TEXT[]`, cuisine, is_beverage, bilingual descriptions, embedding, embedding_model
7. **HNSW index:** `idx_known_dishes_embedding` on `known_dishes.embedding` using `vector_cosine_ops`
8. **match_dishes RPC:** cosine similarity search with configurable `match_threshold` (default 0.85) and `match_count` (default 5), returns (id, canonical_name, aliases, cuisine, similarity)

All CREATE statements use `IF NOT EXISTS`. All ALTER TABLE uses `ADD COLUMN IF NOT EXISTS`. Migration is fully idempotent.

### Task 2: TypeScript Types + Zod Schema (commit: f835b46)

**lib/types/menu.ts — MenuItem interface additions:**
- `canonical_name: string | null`
- `canonical_confidence: number | null`
- `canonical_source: string | null` — 'seed_match' | 'llm_generated'
- `is_beverage: boolean`
- `enrichment_status: string` — 'pending' | 'enriched' | 'skipped' | 'failed'
- `embedding_model: string | null`

Note: `embedding` column is intentionally absent from the TypeScript type — vectors are DB-only, never transported as JSON.

**lib/types/menu.ts — Menu interface addition:**
- `dish_names_hash: string | null` — SHA-256 of sorted dish names for re-scan diff

**lib/types/llm.ts — New Zod schemas:**
- `canonicalDishResultSchema` — validates a single dish's canonical name result (index, canonical_name, confidence, is_beverage)
- `canonicalBatchSchema` — top-level batch schema wrapping array of canonical results, ready for Plan 02 LLM call

**New TypeScript exports:**
- `CanonicalDishResult`
- `CanonicalBatchResult`

## Verification

- `tsc --noEmit`: PASS — zero type errors
- All `vector` references use `extensions.vector(1536)` — no bare `vector` type
- Both extensions use `WITH SCHEMA extensions`
- All ALTER TABLE uses `ADD COLUMN IF NOT EXISTS` guards
- `known_dishes.canonical_name` has UNIQUE constraint
- `match_dishes` returns (id, canonical_name, aliases, cuisine, similarity)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- File exists: `supabase/migrations/20260228200000_v12_foundation.sql` — YES
- File exists: `lib/types/menu.ts` (modified) — YES
- File exists: `lib/types/llm.ts` (modified) — YES
- Commit 0fad6a5 exists — YES
- Commit f835b46 exists — YES
- `tsc --noEmit` passes — YES
