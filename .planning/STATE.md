# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Scanner un menu et comprendre chaque plat en moins de 10 secondes, sans compte, dans n'importe quelle langue.
**Current focus:** v1.2 Dish Enrichment — Phase 10: DB Foundation + Canonical Names

## Current Position

Phase: 10 of 14 (DB Foundation + Canonical Names)
Plan: 0 of 2 in current phase
Status: Ready to plan
Last activity: 2026-02-28 — v1.2 roadmap created, Phase 10 ready

Progress: [░░░░░░░░░░░░░░] 0% (v1.2) | [██████████████] 100% (v1.0+v1.1 complete)

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

### Pending Todos

- Run Supabase SQL to create `waitlist` table before sharing live link (from v1.0)
- Initiate Unsplash production approval application at Phase 12 start (50 req/hr demo vs 5,000 req/hr production)
- Calibrate match_threshold for match_dishes() RPC in Phase 14 using 20-30 real Strasbourg queries

### Blockers/Concerns

- Canonical name seed table (100-200 entries for Turkish/Alsatian/North African dishes) is a content task, not code — must be ready before first production enrichment fires in Phase 11
- Reverse search (Phase 14) requires 50+ canonical records in the database before results are meaningful; promote UI only after data threshold is met

## Session Continuity

Last session: 2026-02-28
Stopped at: v1.2 roadmap created — 5 phases (10-14), 16/16 requirements mapped
Resume file: None
