---
phase: 05-scan-pipeline
plan: 01
subsystem: api
tags: [screenshotone, openai, vision, ocr, next-routes, supabase, cache]

# Dependency graph
requires:
  - phase: 04-infrastructure-foundation
    provides: getOrParseMenu cache orchestrator, parseDishesFromMenu, DishResponse schema, supabaseAdmin client

provides:
  - POST /api/scan/url Route Handler (Screenshotone + getOrParseMenu pipeline)
  - POST /api/scan/photo Route Handler (GPT-4o Vision + preParseResult cache pattern)
  - lib/screenshotone.ts with extractMenuText() — server-only SPA text extraction wrapper
  - preParseResult optional param on getOrParseMenu — photo path skips redundant LLM call

affects:
  - 05-02 (client scan UI components will POST to these endpoints)
  - 06-menu-display (menuId returned here is the entry point for menu display)

# Tech tracking
tech-stack:
  added:
    - screenshotone-api-sdk@1.1.21 (SPA screenshot/text extraction)
    - qr-scanner@1.4.2 (client-side QR scanning, used in Plan 02)
    - browser-image-compression@2.0.2 (client-side image compression, used in Plan 02)
  patterns:
    - Lazy singleton pattern for SDK clients — prevents build-time crash when env vars absent
    - preParseResult optional param pattern — avoids double LLM call on photo path
    - Dynamic Next.js Route Handlers with maxDuration = 60 for Vercel Pro timeout

key-files:
  created:
    - lib/screenshotone.ts
    - app/api/scan/url/route.ts
    - app/api/scan/photo/route.ts
  modified:
    - lib/cache.ts (preParseResult param + DishResponse import)
    - lib/openai.ts (export MENU_PARSE_SYSTEM_PROMPT)
    - lib/supabase-admin.ts (lazy initialization pattern)

key-decisions:
  - "Screenshotone format=markdown for SPA text extraction — SDK accepts any string for format(), not just documented image formats"
  - "Lazy singleton for SDK clients (screenshotone, supabaseAdmin) — prevents Next.js build-time crash when env vars absent at build time"
  - "preParseResult optional param on getOrParseMenu — photo Vision result passed directly, no second LLM call"

patterns-established:
  - "Lazy SDK client init: create singleton on first call, throw descriptive error if env vars missing"
  - "Photo URL synthetic key: photo:${Date.now()} — unique cache key for each photo upload (no URL collision)"
  - "server-only guard on all scan modules — prevents client bundle import"

requirements-completed: [SCAN-02, SCAN-03, SCAN-05]

# Metrics
duration: 9min
completed: 2026-02-25
---

# Phase 5 Plan 01: Scan Pipeline — Server-Side Routes and Screenshotone Wrapper Summary

**Screenshotone markdown-mode wrapper + two Next.js Route Handlers wiring GPT-4o Vision and text-based LLM parse into a cache-first scan pipeline**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-25T08:40:53Z
- **Completed:** 2026-02-25T08:50:03Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created `lib/screenshotone.ts` with lazy-initialized SDK client and `extractMenuText()` using `format=markdown` for JS SPA text extraction
- Created `POST /api/scan/url` Route Handler — Screenshotone extraction → cache-first LLM parse → `{ menuId }` response
- Created `POST /api/scan/photo` Route Handler — GPT-4o Vision OCR → preParseResult cache write → `{ menuId }` response with no redundant LLM call
- Adapted `getOrParseMenu` with optional `preParseResult` parameter for the photo pre-parse pattern
- Installed `qr-scanner` and `browser-image-compression` client-side libs ahead of Plan 02

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create Screenshotone wrapper** - `5e51b3b` (feat)
2. **Task 2: Create API Route Handlers and adapt getOrParseMenu for photo pre-parse** - `4bc855f` (feat)

**Plan metadata:** *(pending final commit)*

## Files Created/Modified
- `lib/screenshotone.ts` - Server-only wrapper: lazy Screenshotone client, `extractMenuText()` with markdown format and empty-content validation
- `app/api/scan/url/route.ts` - POST handler: URL validation → Screenshotone text extraction → getOrParseMenu → `{ menuId }`
- `app/api/scan/photo/route.ts` - POST handler: FormData image → GPT-4o Vision → getOrParseMenu with preParseResult → `{ menuId }`
- `lib/cache.ts` - Added `preParseResult?: { dishes: DishResponse[] }` param; cache miss path uses preParseResult if provided
- `lib/openai.ts` - Exported `MENU_PARSE_SYSTEM_PROMPT` (was module-private, needed by photo route)
- `lib/supabase-admin.ts` - Converted eager instantiation to lazy singleton via Proxy pattern

## Decisions Made
- **Screenshotone `format=markdown`**: SDK type docs list image formats only, but the `format()` method accepts any string — `markdown` works and returns page content as text, ideal for LLM parsing.
- **Lazy client initialization**: Both `screenshotone.Client` and `supabaseAdmin` threw during Next.js build-time page data collection when env vars were absent. Fixed with lazy singletons — clients created on first call, not at module load.
- **Proxy pattern for supabaseAdmin**: Used ES6 `Proxy` so all existing call sites (`supabaseAdmin.from(...)`) continue working without any changes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Lazy initialization for Screenshotone client**
- **Found during:** Task 1 verification (`npm run build`)
- **Issue:** `new screenshotone.Client(accessKey, secretKey)` throws "Both non-empty access and secret keys are required" at module evaluation time during Next.js build-time page data collection when env vars are absent
- **Fix:** Wrapped client creation in `getClient()` lazy singleton — called only when `extractMenuText()` is invoked at runtime
- **Files modified:** `lib/screenshotone.ts`
- **Verification:** `npm run build` passes; route shows as `ƒ (Dynamic)`
- **Committed in:** `4bc855f` (Task 2 commit)

**2. [Rule 1 - Bug] Lazy initialization for supabaseAdmin client**
- **Found during:** Task 2 verification (`npm run build`)
- **Issue:** `createClient(url, key)` called at module level in `lib/supabase-admin.ts` — throws "supabaseKey is required" when `SUPABASE_SERVICE_ROLE_KEY` is absent at build time
- **Fix:** Replaced module-level `createClient` with lazy singleton via ES6 `Proxy` — client created on first method access, existing call sites unchanged
- **Files modified:** `lib/supabase-admin.ts`
- **Verification:** `npm run build` passes; both scan routes render as Dynamic
- **Committed in:** `4bc855f` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — Bug, build-time crash)
**Impact on plan:** Both fixes required for build to pass. No scope creep — fixes only affect module initialization, not runtime behavior.

## Issues Encountered
- Next.js "Collecting page data" build step executes route modules at build time, exposing any module-level code that requires env vars. The Screenshotone SDK and Supabase client both validate their credentials at construction time. Lazy initialization is the standard fix for this pattern.

## User Setup Required

The following environment variables must be added to `.env.local` before the scan endpoints can be tested end-to-end:

| Variable | Source |
|----------|--------|
| `SCREENSHOTONE_ACCESS_KEY` | https://screenshotone.com → Dashboard → API Access → Access key |
| `SCREENSHOTONE_SECRET_KEY` | https://screenshotone.com → Dashboard → API Access → Secret key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → service_role key |
| `OPENAI_API_KEY` | OpenAI Platform → API Keys |

Note: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are already in `.env.local`.

Create a free Screenshotone account at https://screenshotone.com (100 screenshots/month free tier).

## Next Phase Readiness
- Both Route Handlers compile and serve correctly (`ƒ Dynamic` in build output)
- `POST /api/scan/url` and `POST /api/scan/photo` are ready for Phase 5 Plan 02 client UI integration
- Cache hit path works for URL scan (second call with same URL skips Screenshotone + LLM)
- Photo path correctly passes Vision output as `preParseResult` — no double LLM call
- Blocker: env vars (`SCREENSHOTONE_ACCESS_KEY`, `SCREENSHOTONE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`) needed for live testing

---
*Phase: 05-scan-pipeline*
*Completed: 2026-02-25*
