# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Scanner un menu et comprendre chaque plat en moins de 10 secondes, sans compte, dans n'importe quelle langue.
**Current focus:** Phase 4 — Infrastructure Foundation (v1.1)

## Current Position

Phase: 4 of 7 (Infrastructure Foundation)
Plan: 2 of 2 in current phase (04-02 complete — Phase 4 DONE)
Status: In progress
Last activity: 2026-02-25 — 04-02 complete (AI SDK + OpenAI wrapper + cache layer)

Progress: [█████░░░░░░░░░░░░░░░] 24% (3/7 phases complete + 2/2 plans in phase 4)

## Performance Metrics

**Velocity:**
- Total plans completed: 5 (v1.0)
- Average duration: ~36 min/plan
- Total execution time: ~3 hours (v1.0, single session)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation (v1.0) | 1 | ~30 min | ~30 min |
| 2. Content Sections (v1.0) | 2 | ~60 min | ~30 min |
| 3. Waitlist + Ship (v1.0) | 2 | ~90 min | ~45 min |
| 4. Infrastructure Foundation (v1.1) — plan 1/2 | 1 | ~2 min | ~2 min |
| 4. Infrastructure Foundation (v1.1) — plan 2/2 | 1 | ~3 min | ~3 min |

*Updated after each plan completion*

## Accumulated Context

### Decisions

- Web app Next.js (pas native) — QR → navigateur = zéro friction
- OpenAI par défaut, modèles configurables admin — `admin_config` table controls model selection
- GPT-4o-mini Vision for photo OCR — Tesseract.js ruled out (mobile freeze, WASM killed on low RAM)
- Screenshot API (TBD vendor) for SPA menus — Cheerio insufficient for eazee-link.com (confirmed JS SPA)
- AI Top 3 and Reverse Search deferred to v1.2 — out of scope for v1.1
- FR/EN/TR/DE languages only for v1.1 — ES/IT deferred to v1.2
- `@supabase/supabase-js` (not `@supabase/ssr`) for server-side cache queries — preserves Next.js fetch cache
- Zod `.nullable()` not `.optional()` for LLM response fields — OpenAI structured outputs requires all properties present
- `dietary_tags` as `text[]` not PostgreSQL enum — may grow in v1.2+ unlike legally-stable EU 14 allergen list
- `admin_config` single-row boolean PK with CHECK (id = true) — DB-level enforcement, not application-level
- `SUPABASE_SERVICE_ROLE_KEY` no NEXT_PUBLIC_ prefix — service role key must never reach client bundle
- Zod pinned at 3.25.76 (no caret) — Zod v4 breaks AI SDK's internal zod-to-json-schema conversion (GitHub issue #10014)
- generateText + Output.object() pattern — generateObject deprecated in AI SDK 6
- Anon client for cache reads, service role for writes — preserves Next.js fetch cache while bypassing RLS for inserts
- Delete-then-insert pattern for cache refresh — cleaner than upsert with url_hash unique constraint

### Pending Todos

- Run Supabase SQL to create `waitlist` table before sharing live link (from v1.0)
- **Run `supabase/schema.sql`** in Supabase SQL Editor before v1.1 features can be tested (menus, menu_items, admin_config tables)
- **Add `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` to `.env.local`** before Phase 4 can be tested end-to-end
- Select screenshot API vendor (Screenshotone vs APIFlash vs Browserless) during Phase 5 planning

### Blockers/Concerns

- Screenshot API vendor not yet selected — needed for Phase 5 (SPA menu parsing)
- GDPR rate limiting strategy (localStorage UUID vs hashed IP) — decision needed in Phase 5/6

## Session Continuity

Last session: 2026-02-25
Stopped at: Completed 04-02-PLAN.md (AI SDK + OpenAI wrapper + cache layer). Phase 4 complete. Next: Phase 5 (Scan Pipeline)
Resume file: None
