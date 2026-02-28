# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Scanner un menu et comprendre chaque plat en moins de 10 secondes, sans compte, dans n'importe quelle langue.
**Current focus:** v1.2 Dish Enrichment — Phase 11: Dish Enrichment

## Current Position

Phase: 11 of 14 (Dish Enrichment)
Plan: 1 of 2 complete in current phase
Status: Phase 11 Plan 01 complete — enrichment backend pipeline shipped
Last activity: 2026-02-28 — Phase 11 Plan 01 complete: enrichment pipeline, adaptive depth, scan wiring, status endpoint

Progress: [███░░░░░░░░░░░] 18% (v1.2 — 3/16 plans) | [██████████████] 100% (v1.0+v1.1 complete)

## Performance Metrics

**Velocity (v1.0 + v1.1):**
- Total plans completed: 10
- v1.0: 5 plans, single session (~3h)
- v1.1: 10 plans, 4 days

**By Phase:**

| Phase | Milestone | Plans |
|-------|-----------|-------|
| 1-3 | v1.0 | 5 |
| 4-9 | v1.1 | 10 |
| 10 | v1.2 | 2 |
| 11 | v1.2 | 1 (ongoing) |

*v1.2 metrics start fresh from Phase 10*

## Accumulated Context

### Decisions

(Full log in PROJECT.md Key Decisions table)

Key decisions affecting v1.2:
- Canonical name is the keystone — Phase 10 must ship before any other v1.2 feature
- Enrichment is always async via after() — never synchronous, even during development/testing
- Batch enrichment: one LLM call per menu (array schema), not one per dish
- Embed model locked to text-embedding-3-small for all of v1.2 — store embedding_model column from day one
- Images: Unsplash REST API (no unsplash-js, it's archived) → Pexels → gradient+emoji; no AI-generated, no SerpAPI
- Top 3 rate gate: localStorage (no account), 3x/day free
- embedding column is DB-only (not in TypeScript types) — vectors never transported as JSON
- canonicalDishResultSchema uses .nullable() on canonical_name (not .optional()) per OpenAI structured output requirement
- All items (food + beverages) get enrichment_status='pending' — is_beverage flag signals Phase 11 to deprioritize beverages, not skip them (KNOW-04)
- Cache HIT paths skip generateCanonicalNames — canonical names survive re-scan via canonicalCache recycling in getOrParseMenu
- enrichDishBatch chained sequentially after generateCanonicalNames (not concurrent after()) — is_beverage must be set before enrichment reads it
- Chunk size 40 for enrichment batches (vs 80 for canonical names) — enrichment JSON output is longer per dish
- Beverages marked skipped immediately in enrichDishBatch (before LLM call) — prevents front-end polling stall
- Status endpoint uses anon Supabase client — enrichment fields contain no PII

### Pending Todos

- Run Supabase SQL to create `waitlist` table before sharing live link (from v1.0)
- Initiate Unsplash production approval application at Phase 12 start (50 req/hr demo vs 5,000 req/hr production)
- Calibrate match_threshold for match_dishes() RPC in Phase 14 using 20-30 real Strasbourg queries
- Apply enrichment migration (20260228220000_enrichment_fields.sql) to Supabase before Phase 11 Plan 02 UI work

### Blockers/Concerns

- Canonical name seed table RESOLVED — 124 entries seeded across 7 cuisines in Phase 10 Plan 02
- Reverse search (Phase 14) requires 50+ canonical records in the database before results are meaningful; promote UI only after data threshold is met

## Session Continuity

Last session: 2026-02-28
Stopped at: Phase 11 Plan 01 complete — enrichment pipeline (lib/enrichment.ts), adaptive depth system prompt, scan route chaining, GET /api/enrichment/status endpoint
Resume file: None
