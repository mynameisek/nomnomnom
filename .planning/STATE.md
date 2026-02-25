# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Scanner un menu et comprendre chaque plat en moins de 10 secondes, sans compte, dans n'importe quelle langue.
**Current focus:** Phase 4 — Infrastructure Foundation (v1.1)

## Current Position

Phase: 4 of 7 (Infrastructure Foundation)
Plan: — of TBD in current phase
Status: Ready to plan
Last activity: 2026-02-25 — v1.1 roadmap created (phases 4-7)

Progress: [███░░░░░░░░░░░░░░░░░] 15% (3/7 phases complete, v1.0 shipped)

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

### Pending Todos

- Run Supabase SQL to create `waitlist` table before sharing live link (from v1.0)
- Select screenshot API vendor (Screenshotone vs APIFlash vs Browserless) during Phase 5 planning

### Blockers/Concerns

- Screenshot API vendor not yet selected — needed for Phase 5 (SPA menu parsing)
- GDPR rate limiting strategy (localStorage UUID vs hashed IP) — decision needed in Phase 5/6

## Session Continuity

Last session: 2026-02-25
Stopped at: v1.1 roadmap created, ready to plan Phase 4
Resume file: None
