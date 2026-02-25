# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Scanner un menu et comprendre chaque plat en moins de 10 secondes, sans compte, dans n'importe quelle langue.
**Current focus:** Phase 5 — Scan Pipeline (v1.1)

## Current Position

Phase: 5 of 7 (Scan Pipeline)
Plan: 1 of 2 in current phase (05-01 complete — server-side scan routes done)
Status: In progress
Last activity: 2026-02-25 — 05-01 complete (Screenshotone wrapper + URL/photo Route Handlers + cache layer adaptation)

Progress: [██████░░░░░░░░░░░░░░] 29% (4/7 phases complete + 1/2 plans in phase 5)

## Performance Metrics

**Velocity:**
- Total plans completed: 5 (v1.0) + 2 (v1.1 phase 4) + 1 (v1.1 phase 5) = 8 total
- Average duration: ~36 min/plan (v1.0), ~3-9 min/plan (v1.1)
- Total execution time: ~3 hours (v1.0, single session)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation (v1.0) | 1 | ~30 min | ~30 min |
| 2. Content Sections (v1.0) | 2 | ~60 min | ~30 min |
| 3. Waitlist + Ship (v1.0) | 2 | ~90 min | ~45 min |
| 4. Infrastructure Foundation (v1.1) — plan 1/2 | 1 | ~2 min | ~2 min |
| 4. Infrastructure Foundation (v1.1) — plan 2/2 | 1 | ~3 min | ~3 min |
| 5. Scan Pipeline (v1.1) — plan 1/2 | 1 | ~9 min | ~9 min |

*Updated after each plan completion*

## Accumulated Context

### Decisions

- Web app Next.js (pas native) — QR → navigateur = zéro friction
- OpenAI par défaut, modèles configurables admin — `admin_config` table controls model selection
- GPT-4o-mini Vision for photo OCR — Tesseract.js ruled out (mobile freeze, WASM killed on low RAM)
- Screenshotone selected as screenshot API vendor — format=markdown for SPA text extraction (eazee-link.com confirmed JS SPA)
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
- Lazy singleton pattern for SDK clients (Screenshotone, supabaseAdmin) — prevents Next.js build-time crash when env vars absent
- preParseResult optional param on getOrParseMenu — photo Vision result passed directly, avoids redundant LLM call
- Synthetic photo URL key (`photo:${Date.now()}`) — unique cache key per photo upload, no URL collision

### Pending Todos

- Run Supabase SQL to create `waitlist` table before sharing live link (from v1.0)
- **Run `supabase/schema.sql`** in Supabase SQL Editor before v1.1 features can be tested (menus, menu_items, admin_config tables)
- **Add `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `SCREENSHOTONE_ACCESS_KEY`, `SCREENSHOTONE_SECRET_KEY` to `.env.local`** before Phase 5 can be tested end-to-end
- Create Screenshotone free account at https://screenshotone.com (100 screenshots/month free tier)

### Blockers/Concerns

- GDPR rate limiting strategy (localStorage UUID vs hashed IP) — decision needed in Phase 5/6
- Env vars still needed for live testing: SCREENSHOTONE_ACCESS_KEY, SCREENSHOTONE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY

## Session Continuity

Last session: 2026-02-25
Stopped at: Completed 05-01-PLAN.md (Screenshotone wrapper + URL/photo Route Handlers + cache adaptation). Phase 5 plan 1/2 done. Next: Phase 5 Plan 02 (client scan UI components)
Resume file: None
