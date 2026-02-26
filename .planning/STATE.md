# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Scanner un menu et comprendre chaque plat en moins de 10 secondes, sans compte, dans n'importe quelle langue.
**Current focus:** Phase 8 — Eazee-link Translation Fix

## Current Position

Phase: 8 of 8 (Eazee-link Translation Fix — COMPLETE)
Plan: 1 of 1 in current phase (08-01 complete — eazee-link LLM translation pipeline, getCachedMenu helper, cache-aware route)
Status: Phase 8 complete — all plans done.
Last activity: 2026-02-26 — 08-01 fully complete (eazeeLinkMenuTranslationSchema, translateEazeeLinkDishes, getCachedMenu, cache-first eazee-link route)

Progress: [████████████████████] 100% (8/8 phases complete — 1/1 plans in phase 8)

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
| 5. Scan Pipeline (v1.1) — plan 2/2 | 1 | ~4 min | ~4 min |
| 6. Dish Cards and Filters (v1.1) — plan 1/2 | 1 | ~3 min | ~3 min |
| 6. Dish Cards and Filters (v1.1) — plan 2/2 | 1 | ~110 min | ~110 min |
| 7. Navigation and Admin (v1.1) — plan 1/2 | 1 | ~3 min | ~3 min |
| 7. Navigation and Admin (v1.1) — plan 2/2 | 1 | ~4 min | ~4 min |
| 8. Eazee-link Translation Fix — plan 1/1 | 1 | ~3 min | ~3 min |

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
- Custom window event (qr-decoded) for QR->URL handoff — avoids prop drilling when QR tab unmounts on tab switch
- dynamic import('qr-scanner') in useEffect — browser-only library; SSR-safe via Next.js dynamic with ssr: false
- Timer-driven progress simulation (3s/step) with immediate jump on API resolve — acceptable UX for 6-15s opaque background tasks
- lib/i18n/index.tsx uses .tsx extension (not .ts) — JSX syntax in LanguageProvider return requires .tsx
- SSR-safe i18n: useState('fr') default, never read localStorage in initializer — useEffect corrects client-side only (hydration safety)
- useMemo retained in useFilteredDishes despite React 19 compiler — explicit intent for potentially large array filter operations
- DietaryTag 'spicy' added as non-breaking text[] change — no DB migration needed (column accepts any strings)
- [Phase 06-dish-cards-and-filters]: FilterBar redesigned post-checkpoint: search bar at top, allergen chips hidden behind toggle row to reduce mobile visual noise
- [Phase 06-dish-cards-and-filters]: Allergen chips removed from DishCard — redundant with FilterBar allergen exclusion chips; reduces card density
- [Phase 06-dish-cards-and-filters]: Accent-insensitive search via normalize('NFD') — 'vege' matches 'végétarien'
- [Phase 07-navigation-and-admin]: Btn.tsx uses href.startsWith('/') for next/link — hash anchors remain as <a> (non-breaking)
- [Phase 07-navigation-and-admin]: ScanPageShell 'use client' wrapper pattern — thin client wrapper for motion animation while keeping page.tsx as Server Component
- [Phase 07-navigation-and-admin]: hit_count increment is fire-and-forget (.then(() => {})) — avoids adding latency to cache hit response path
- [Phase 07-navigation-and-admin]: parse_time_ms null when preParseResult supplied — no LLM call was made so no timing to record
- [Phase 07]: SHA-256 derived token in admin cookie — raw ADMIN_SECRET never stored, prevents secret recovery from cookie
- [Phase 07]: ALLOWED_MODELS defined locally in AdminDashboard (client component) — Next.js 16 rejects non-async exports from 'use server' files
- [Phase 07]: POST /api/admin/logout route + Déconnexion button — explicit logout completes admin auth lifecycle
- [Phase 07]: Server Component gate for /admin with force-dynamic — cookie reads and Supabase fetches always live, never cached
- [Phase 08-eazee-link-translation-fix]: getCachedMenu standalone helper in lib/cache.ts — route.ts owns cache-first logic for eazee-link, avoids lazy-param complexity in cache layer
- [Phase 08-eazee-link-translation-fix]: Cultural context merged into description_translations as parenthetical suffix — no new DB column needed (Phase 9+ scope if dedicated column desired)
- [Phase 08-eazee-link-translation-fix]: Translation failure caught in route.ts, untranslated fallback stored — user always gets a menu even if LLM fails
- [Phase 08-eazee-link-translation-fix]: Old untranslated eazee-link cache entries remain until TTL expiry — lazy-by-default, zero extra LLM calls, cost optimization priority

### Pending Todos

- Run Supabase SQL to create `waitlist` table before sharing live link (from v1.0)
- **Run `supabase/schema.sql`** in Supabase SQL Editor before v1.1 features can be tested (menus, menu_items, admin_config tables)
- **Add `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `SCREENSHOTONE_ACCESS_KEY`, `SCREENSHOTONE_SECRET_KEY` to `.env.local`** before Phase 5 can be tested end-to-end
- Create Screenshotone free account at https://screenshotone.com (100 screenshots/month free tier)
- **URL normalization in cache layer** — same menu (e.g. E7FNRP0ET3) gets cached multiple times with different URL formats (`/?id=X`, `/menu?o=q&id=X`, `/?id=X&o=q`). Normalize URL before hashing (sort query params, strip irrelevant params) to avoid duplicate LLM calls. v1.2 candidate.

### Blockers/Concerns

- GDPR rate limiting strategy (localStorage UUID vs hashed IP) — decision needed in Phase 5/6
- Env vars still needed for live testing: SCREENSHOTONE_ACCESS_KEY, SCREENSHOTONE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY

## Session Continuity

Last session: 2026-02-26
Stopped at: Completed 08-01-PLAN.md fully — eazee-link LLM translation pipeline complete (schema, translateEazeeLinkDishes, getCachedMenu, cache-aware route). Phase 8 complete.
Resume file: None
