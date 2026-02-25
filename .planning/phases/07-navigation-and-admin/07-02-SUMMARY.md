---
phase: 07-navigation-and-admin
plan: 02
subsystem: auth, ui, api
tags: [next.js, cookies, sha256, server-actions, supabase, admin, server-components]

# Dependency graph
requires:
  - phase: 07-navigation-and-admin
    plan: 01
    provides: get_scan_stats() RPC, parse_time_ms/hit_count columns — admin stats depend on these
  - phase: 05-scan-pipeline
    provides: supabaseAdmin, getAdminConfig from lib/cache.ts — admin page fetches currentModel from same source
  - phase: 04-infrastructure
    provides: admin_config single-row table — saveAdminModel updates this table
provides:
  - Cookie-based admin auth with SHA-256 derived token (isAdminAuthenticated, setAdminCookie, clearAdminCookie)
  - POST /api/admin/login endpoint that validates ADMIN_SECRET and sets httpOnly session cookie
  - /admin Server Component gate that renders AdminLogin or AdminDashboard based on cookie state
  - AdminLogin client component with password input and inline error feedback
  - AdminDashboard client component with model selector, 3 stat cards, recent scans table
  - saveAdminModel Server Action with auth guard, ALLOWED_MODELS allowlist, revalidatePath
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SHA-256 derived token in cookie — raw ADMIN_SECRET never stored, derived hash prevents secret recovery from cookie"
    - "Server Component gate pattern — page.tsx reads cookie server-side, renders login or dashboard without JS redirect"
    - "window.location.reload() after login — forces Server Component re-render to pick up new cookie"
    - "useTransition for Server Action calls — isPending state prevents double-submit"
    - "ALLOWED_MODELS as const exported from server action — dashboard imports it for dropdown, single source of truth"

key-files:
  created:
    - lib/admin-session.ts
    - app/api/admin/login/route.ts
    - app/admin/page.tsx
    - components/admin/AdminLogin.tsx
    - components/admin/AdminDashboard.tsx
    - app/actions/admin.ts
  modified:
    - .env.example

key-decisions:
  - "SHA-256 derived token (not raw password) stored in cookie — even if cookie is readable, ADMIN_SECRET cannot be recovered"
  - "window.location.reload() after successful login — simplest way to trigger Server Component re-render with new cookie"
  - "ALLOWED_MODELS exported from app/actions/admin.ts — dashboard uses the same constant for dropdown options, no duplication"
  - "useTransition wraps saveAdminModel call — isPending disables save button during flight, prevents double submit"
  - "force-dynamic on /admin page — cookie reads and Supabase fetches must always be fresh, never cached"

patterns-established:
  - "Admin gate pattern: async Server Component reads cookie, renders login or authenticated view — no redirect, no middleware"
  - "Server Action auth guard: every action re-checks isAdminAuthenticated() — cannot bypass via direct POST"

requirements-completed: [ADMN-01, ADMN-02, ADMN-03]

# Metrics
duration: 4min
completed: 2026-02-25
---

# Phase 7 Plan 02: Admin Dashboard Summary

**Cookie-based admin auth via SHA-256 session token + /admin dashboard with LLM model selector (saveAdminModel Server Action), 3 live stat cards (total scans, cache ratio, avg parse time), and recent 20 scans table**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-25T21:31:51Z
- **Completed:** 2026-02-25T21:35:xx Z
- **Tasks:** 2 (Task 3 is human-verify checkpoint)
- **Files modified:** 7

## Accomplishments
- lib/admin-session.ts: server-only SHA-256 token auth — isAdminAuthenticated, setAdminCookie, clearAdminCookie
- /api/admin/login POST endpoint validates ADMIN_SECRET, sets httpOnly cookie (8h, secure in production)
- /admin Server Component: reads cookie server-side, renders AdminLogin (unauthenticated) or AdminDashboard (authenticated) — no JS redirect
- AdminLogin: centered password form with inline "Mot de passe incorrect" error, reloads on success
- AdminDashboard: model selector dropdown + "Enregistrer" button with 3s green toast, 3 stat cards, recent 20 scans table with relative timestamps
- saveAdminModel Server Action: auth guard + ALLOWED_MODELS allowlist + revalidatePath('/admin')

## Task Commits

Each task was committed atomically:

1. **Task 1: Admin session library + login Route Handler + admin page gate** - `6028c50` (feat)
2. **Task 2: Admin dashboard — model selector + stats + recent scans** - `bfe1e44` (feat)

*Task 3 is a human-verify checkpoint — no code changes, user verification of end-to-end flow.*

## Files Created/Modified
- `lib/admin-session.ts` - server-only cookie auth: SHA-256 token derivation, isAdminAuthenticated, setAdminCookie, clearAdminCookie
- `app/api/admin/login/route.ts` - POST /api/admin/login: validates password, sets session cookie on match
- `app/admin/page.tsx` - Server Component gate: force-dynamic, reads cookie, renders AdminLogin or AdminDashboard with live data
- `components/admin/AdminLogin.tsx` - Password form with inline error, window.location.reload() on success
- `components/admin/AdminDashboard.tsx` - Model dropdown + Enregistrer + success toast, 3 stat cards, recent scans table
- `app/actions/admin.ts` - saveAdminModel Server Action with ALLOWED_MODELS, auth check, revalidatePath
- `.env.example` - Added ADMIN_SECRET documentation

## Decisions Made
- SHA-256 derived token stored in cookie (not raw ADMIN_SECRET) — cookie interception cannot reveal the plaintext password
- window.location.reload() after successful login — simplest mechanism to make Server Component re-read the new cookie state
- ALLOWED_MODELS exported from app/actions/admin.ts — dashboard dropdown uses the same constant, single source of truth
- useTransition wraps saveAdminModel — isPending state disables button during Server Action flight
- force-dynamic on /admin — cookie reads and Supabase fetches must always be live data

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed apostrophe syntax error in AdminDashboard.tsx**
- **Found during:** Task 1 build verification
- **Issue:** `'à l'instant'` used single quotes with embedded apostrophe — JavaScript syntax error
- **Fix:** Changed to double quotes: `"à l'instant"`
- **Files modified:** components/admin/AdminDashboard.tsx
- **Verification:** Build passed after fix
- **Committed in:** bfe1e44 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — syntax error)
**Impact on plan:** Minor fix, no scope change. Build would not have compiled without it.

## Issues Encountered
- Apostrophe in French string literal caused Turbopack parse error — fixed inline, one-line change

## User Setup Required
- Add `ADMIN_SECRET=your-admin-secret-here` to `.env.local` before testing /admin
- Run Supabase migration SQL (from plan 07-01) before stats display will show real data

## Next Phase Readiness
- Phase 7 is complete — all 2 plans done
- /admin is protected, functional, and ready for live testing
- LLM model selection is operational: dropdown reflects admin_config, save action persists change
- Stats require Supabase migration-07-stats.sql to have been run in production

## Self-Check: PASSED

All created files verified on disk. All task commits verified in git history.

- lib/admin-session.ts: FOUND
- app/api/admin/login/route.ts: FOUND
- app/admin/page.tsx: FOUND
- components/admin/AdminLogin.tsx: FOUND
- components/admin/AdminDashboard.tsx: FOUND
- app/actions/admin.ts: FOUND
- Commit 6028c50: FOUND
- Commit bfe1e44: FOUND

---
*Phase: 07-navigation-and-admin*
*Completed: 2026-02-25*
