---
phase: 04-infrastructure-foundation
plan: 01
subsystem: database
tags: [supabase, postgresql, typescript, zod, schema, rls, enum]

# Dependency graph
requires: []
provides:
  - Supabase SQL schema (menus, menu_items, admin_config tables with enums, indexes, RLS)
  - TypeScript types mirroring DB schema (Menu, MenuItem, MenuWithItems)
  - Zod validation schemas for LLM structured output (dishResponseSchema, menuResponseSchema)
  - AdminConfig type with default constants
  - Service role Supabase client (server-only, bypasses RLS for LLM writes)
  - .env.example template with all 4 required env vars
affects: [04-02, phase-5-scan-pipeline, phase-6-dish-cards, phase-7-admin-panel]

# Tech tracking
tech-stack:
  added: [server-only (planned for Task 2)]
  patterns: [dual Supabase client (anon reads / service role writes), Zod .nullable() for OpenAI structured outputs, single-row admin config with boolean PK check constraint]

key-files:
  created:
    - supabase/schema.sql
    - lib/types/menu.ts
    - lib/types/llm.ts
    - lib/types/config.ts
    - lib/supabase-admin.ts
    - .env.example
  modified: []

key-decisions:
  - "Used .nullable() (not .optional()) in Zod schemas — OpenAI structured outputs require all properties present"
  - "Pinned zod@3.25.76 recommendation documented — AI SDK 6 has unresolved Zod v4 issues as of Dec 2025"
  - "dietary_tags stored as text[] (not PostgreSQL enum) — list may grow in v1.2+ unlike the legally-stable EU 14 allergen list"
  - "admin_config uses boolean PK with CHECK (id = true) for single-row enforcement at DB level"
  - "Service role key named SUPABASE_SERVICE_ROLE_KEY (no NEXT_PUBLIC_ prefix) — never reaches client bundle"

patterns-established:
  - "server-only guard: all server-only modules start with import 'server-only' — build-time error if imported in Client Component"
  - "dual Supabase client: lib/supabase.ts (anon) for reads that preserve Next.js fetch cache, lib/supabase-admin.ts (service role) for LLM result writes"
  - "Zod nullable pattern: use .nullable() not .optional() for all optional LLM response fields"

requirements-completed: [INFR-01]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 4 Plan 01: Infrastructure Foundation - Data Layer Summary

**Supabase schema with 3 tables (menus/menu_items/admin_config), Zod-validated LLM response types, and server-only service role client as the data foundation for v1.1**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-25T12:56:12Z
- **Completed:** 2026-02-25T12:58:45Z
- **Tasks:** 2
- **Files modified:** 6 (all new)

## Accomplishments

- SQL schema covering menus (url_hash cache key with dual index), menu_items (allergen_type[] enum array, JSONB translations, trust_signal enum), and admin_config (single-row boolean PK pattern with default seed)
- RLS policies: public SELECT on menus/menu_items, no public policies on admin_config (service role bypasses RLS entirely)
- TypeScript types mirroring DB schema exactly — Menu, MenuItem, MenuWithItems, TranslationMap, Allergen, DietaryTag, TrustSignal
- Zod schemas for LLM structured output using .nullable() (not .optional()) per OpenAI structured outputs requirement — dishResponseSchema and menuResponseSchema ready for AI SDK integration
- Service role Supabase client with import 'server-only' guard and no NEXT_PUBLIC_ prefix on the key

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SQL schema and TypeScript types** - `e75e506` (feat)
2. **Task 2: Create service role Supabase client** - `4aa26c8` (feat)

**Plan metadata:** _(docs commit follows this summary)_

## Files Created/Modified

- `supabase/schema.sql` - Complete DB schema: 2 enums, 3 tables, 4 indexes, 3 RLS policies, 1 seed row
- `lib/types/menu.ts` - Menu, MenuItem, MenuWithItems TypeScript types mirroring DB schema
- `lib/types/llm.ts` - Zod schemas (allergenEnum, translationMapSchema, dishResponseSchema, menuResponseSchema) + inferred DishResponse/MenuResponse types
- `lib/types/config.ts` - AdminConfig interface + DEFAULT_LLM_MODEL / DEFAULT_CACHE_TTL_HOURS constants
- `lib/supabase-admin.ts` - Service role Supabase client (server-only, persistSession/autoRefreshToken/detectSessionInUrl all false)
- `.env.example` - Template for all 4 required env vars (force-added past .gitignore .env* pattern)

## Decisions Made

- `.nullable()` over `.optional()` in Zod schemas: OpenAI structured outputs API requires all properties to be present — `.optional()` causes "Invalid schema for response_format" errors. All optional LLM response fields use `.nullable()` so they are always present but may be null.
- `dietary_tags` as `text[]` not PostgreSQL enum: EU 14 allergens are legally defined and stable (use enum); dietary tags (vegetarian/vegan/halal) may expand in v1.2+ so `text[]` avoids a migration.
- Single-row `admin_config` with boolean PK: `id boolean PRIMARY KEY DEFAULT true CHECK (id = true)` enforces the single-row constraint at database level — cannot be bypassed by application bugs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Force-added .env.example past .gitignore**
- **Found during:** Task 2 (Create service role Supabase client)
- **Issue:** `.gitignore` uses `.env*` glob pattern which matched `.env.example`. Template env files are intended to be committed (they contain no real secrets).
- **Fix:** Used `git add -f .env.example` to force-add past the .gitignore pattern.
- **Files modified:** .env.example
- **Verification:** File committed and visible in git log
- **Committed in:** 4aa26c8 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — gitignore pattern)
**Impact on plan:** Force-add was necessary and correct. .env.example is a template, not a secret. No scope creep.

## Issues Encountered

None — plan executed as specified aside from the gitignore deviation above.

## User Setup Required

Before v1.1 features can be tested, run the SQL schema in Supabase and add env vars:

1. **Run schema:** Supabase Dashboard -> SQL Editor -> New query -> paste contents of `supabase/schema.sql` -> Run
2. **Add env vars to `.env.local`:**
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase Dashboard -> Project Settings -> API -> service_role key (secret)
   - `OPENAI_API_KEY` — https://platform.openai.com/api-keys

Existing vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` should already be present from v1.0.

## Next Phase Readiness

- Data layer foundation complete — all downstream phases (05 Scan Pipeline, 06 Dish Cards, 07 Admin) can build on this schema and types
- Plan 04-02 can proceed: AI SDK integration (`lib/openai.ts`) and cache layer (`lib/cache.ts`) depend on the Zod schemas and supabaseAdmin client created here
- Zod version must be pinned to 3.25.76 when installing dependencies in Plan 04-02 (AI SDK 6 Zod v4 compatibility issue)

---
*Phase: 04-infrastructure-foundation*
*Completed: 2026-02-25*
