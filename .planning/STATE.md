# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Scanner un menu et comprendre chaque plat en moins de 10 secondes, sans compte, dans n'importe quelle langue.
**Current focus:** v1.2 Dish Enrichment — Phase 10: DB Foundation + Canonical Names

## Current Position

Phase: 10 of 14 (DB Foundation + Canonical Names)
Plan: 2 of 2 in current phase — PHASE COMPLETE
Status: Phase 10 complete, ready for Phase 11
Last activity: 2026-02-28 — Phase 10 Plan 02 complete: canonical name pipeline, cache recycling, seed data

Progress: [██░░░░░░░░░░░░] 12% (v1.2 — 2/16 plans) | [██████████████] 100% (v1.0+v1.1 complete)

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
- Two separate after() calls per scan path (Places + Canonical) run concurrently — not chained

### Pending Todos

- Run Supabase SQL to create `waitlist` table before sharing live link (from v1.0)
- Initiate Unsplash production approval application at Phase 12 start (50 req/hr demo vs 5,000 req/hr production)
- Calibrate match_threshold for match_dishes() RPC in Phase 14 using 20-30 real Strasbourg queries

### Blockers/Concerns

- Canonical name seed table RESOLVED — 124 entries seeded across 7 cuisines in Phase 10 Plan 02
- Reverse search (Phase 14) requires 50+ canonical records in the database before results are meaningful; promote UI only after data threshold is met

## Session Continuity

Last session: 2026-02-28
Stopped at: Phase 10 Plan 02 complete — canonical name pipeline, cache recycling, 124-entry known_dishes seed
Resume file: None
