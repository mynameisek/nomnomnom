---
phase: 04-infrastructure-foundation
plan: 02
subsystem: infra
tags: [openai, ai-sdk, zod, cache, supabase, server-only, llm, sha256]

# Dependency graph
requires:
  - phase: 04-01
    provides: "Supabase schema (menus, menu_items, admin_config tables), TypeScript types (Menu, MenuItem, AdminConfig, DishResponse), service role client"
provides:
  - "parseDishesFromMenu: AI SDK 6 server-only wrapper that calls OpenAI and returns Zod-validated { dishes: DishResponse[] }"
  - "hashUrl: deterministic SHA-256 hex from normalized URLs"
  - "getAdminConfig: reads LLM model and cache TTL from admin_config with safe fallback defaults"
  - "getOrParseMenu: cache-aware orchestrator — anon read, LLM on miss, service role write"
affects:
  - "05-scan-pipeline: calls getOrParseMenu(url, sourceType, rawText) to get MenuWithItems"
  - "07-admin-panel: reads/writes admin_config to control LLM model and cache TTL"

# Tech tracking
tech-stack:
  added:
    - "ai@6.0.99 (AI SDK 6, generateText + Output.object pattern)"
    - "@ai-sdk/openai@3.0.33 (OpenAI provider for AI SDK)"
    - "zod@3.25.76 (pinned exactly, no caret — Zod v4 breaks AI SDK)"
    - "server-only@0.0.1 (build-time guard for server-only modules)"
  patterns:
    - "generateText + Output.object() for structured LLM output (NOT deprecated generateObject)"
    - "NoObjectGeneratedError catch pattern with error.text and error.cause logging"
    - "Anon Supabase client for cache reads (preserves Next.js fetch cache)"
    - "Service role client for cache writes (bypasses RLS)"
    - "URL normalization before hashing: trim + lowercase + strip trailing slash"

key-files:
  created:
    - "lib/openai.ts — server-only OpenAI wrapper, parseDishesFromMenu"
    - "lib/cache.ts — hashUrl, getAdminConfig, getOrParseMenu"
  modified:
    - "package.json — added ai, @ai-sdk/openai, zod (pinned), server-only"

key-decisions:
  - "Zod pinned at 3.25.76 (no caret) — Zod v4 breaks AI SDK's internal zod-to-json-schema conversion (GitHub issue #10014)"
  - "generateText + Output.object() pattern — generateObject deprecated in AI SDK 6"
  - "experimental_output destructured from generateText return — AI SDK 6 structured output API"
  - "Anon client for cache reads, service role for writes — preserves Next.js fetch cache while bypassing RLS for inserts"
  - "Delete-then-insert pattern for cache refresh — avoids upsert complexity with url_hash unique constraint"

patterns-established:
  - "Server-only pattern: import 'server-only' at top of any file importing supabaseAdmin or calling openai"
  - "Cache orchestration: hash URL -> check anon client -> LLM on miss -> service role insert"

requirements-completed: [INFR-02, INFR-03]

# Metrics
duration: 3min
completed: 2026-02-25
---

# Phase 4 Plan 02: AI SDK + Cache Layer Summary

**AI SDK 6 OpenAI wrapper with Zod-validated structured dish output and URL-hashed Supabase cache orchestration (anon read / service role write)**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-25T13:01:54Z
- **Completed:** 2026-02-25T13:05:05Z
- **Tasks:** 2
- **Files modified:** 3 (lib/openai.ts, lib/cache.ts, package.json)

## Accomplishments

- Installed ai@6, @ai-sdk/openai, server-only, and zod@3.25.76 (pinned, no caret)
- Created `lib/openai.ts` with `parseDishesFromMenu` using AI SDK 6's `generateText + Output.object()` pattern, returning Zod-validated `{ dishes: DishResponse[] }`
- Created `lib/cache.ts` with `hashUrl` (SHA-256 + URL normalization), `getAdminConfig` (service role read with defaults), and `getOrParseMenu` (full cache-aware orchestrator)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create OpenAI wrapper** - `920bc84` (feat)
2. **Task 2: Create URL hash cache layer** - `5f6043d` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `lib/openai.ts` - Server-only OpenAI wrapper using AI SDK 6, parseDishesFromMenu with system prompt for multilingual menu parsing, NoObjectGeneratedError handling
- `lib/cache.ts` - URL hashing utility (SHA-256, normalized), admin config reader, cache-aware menu fetch orchestrator
- `package.json` - Added ai@6, @ai-sdk/openai, server-only; zod pinned at 3.25.76 (no caret)

## Decisions Made

- **Zod pinned without caret:** `"zod": "3.25.76"` not `"^3.25.76"` — Zod v4 breaks AI SDK's internal zod-to-json-schema conversion. npm added the caret after install; manually removed per plan instructions.
- **generateText + Output.object():** Used AI SDK 6 pattern. The return value uses `experimental_output` key from the `generateText` result object.
- **Delete-then-insert for cache refresh:** On cache miss with an expired entry, delete the old row before inserting new one. Cleaner than upsert which requires conflict handling on url_hash.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- npm automatically added a caret prefix to the zod version (`^3.25.76`) — expected per the plan's warning. Removed caret manually from package.json after install.

## User Setup Required

**External services require manual configuration.** The following environment variables must be set in `.env.local` before this code can be tested:

- `OPENAI_API_KEY` — from OpenAI Dashboard -> API keys -> Create new secret key
- `SUPABASE_SERVICE_ROLE_KEY` — already noted in STATE.md pending todos

## Next Phase Readiness

- Phase 5 (Scan Pipeline) can now call `getOrParseMenu(url, sourceType, rawText)` and receive a full `MenuWithItems`
- `parseDishesFromMenu` is available for direct use if Phase 5 needs to bypass the cache
- `hashUrl` is exported for any component that needs to compute a cache key
- Blockers: OPENAI_API_KEY must be set in `.env.local` before runtime testing; Supabase schema must be applied (noted in STATE.md)

---
*Phase: 04-infrastructure-foundation*
*Completed: 2026-02-25*
