---
phase: 07-navigation-and-admin
plan: 01
subsystem: ui, database
tags: [next/link, motion/react, framer-motion, supabase, postgresql, caching, navigation]

# Dependency graph
requires:
  - phase: 06-dish-cards-and-filters
    provides: ScanTabs, MenuShell, DishCard — the /scan page content this plan wraps with animation
  - phase: 05-scan-pipeline
    provides: getOrParseMenu in lib/cache.ts — instrumented in this plan with timing + hit_count
provides:
  - next/link integration in Btn.tsx for client-side navigation on internal hrefs
  - Hero CTA wired to /scan with "Scanner un menu" text
  - ScanPageShell client component with motion.div fade-slide entry animation
  - supabase/migration-07-stats.sql with parse_time_ms column, hit_count column, get_scan_stats() RPC
  - lib/cache.ts instrumented to record LLM parse timing and increment cache hit_count
affects: [07-02-admin-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Internal href detection in Btn: href.startsWith('/') → next/link Link component, else <a> tag (non-breaking)"
    - "Client wrapper pattern: ScanPageShell 'use client' wraps Server Component children to add motion animation"
    - "Fire-and-forget supabaseAdmin update for hit_count — .then(() => {}) avoids blocking response"
    - "Null parse_time_ms when preParseResult supplied — LLM wasn't called, no timing to record"

key-files:
  created:
    - components/scan/ScanPageShell.tsx
    - supabase/migration-07-stats.sql
  modified:
    - components/ui/Btn.tsx
    - components/sections/Hero.tsx
    - app/scan/page.tsx
    - supabase/schema.sql
    - lib/cache.ts

key-decisions:
  - "Btn.tsx uses href.startsWith('/') to detect internal routes for next/link — hash anchors (#waitlist, #features) remain as <a> tags (non-breaking)"
  - "ScanPageShell wraps Server Component children as thin 'use client' wrapper — keeps page.tsx as Server Component"
  - "hit_count increment is fire-and-forget (no await) — avoids adding latency to cache hit response path"
  - "parse_time_ms is null when preParseResult provided — no LLM call was made, so no timing to record"

patterns-established:
  - "Client wrapper pattern for animations: create thin 'use client' component wrapping server component children"
  - "Fire-and-forget analytics updates: .then(() => {}) for non-blocking background DB updates"

requirements-completed: [INFR-05]

# Metrics
duration: 3min
completed: 2026-02-25
---

# Phase 7 Plan 01: Navigation and Stats Foundation Summary

**Client-side navigation from landing to /scan via next/link in Btn, motion.div fade-slide entry on ScanPageShell, plus SQL migration adding parse_time_ms/hit_count columns and get_scan_stats() RPC for admin dashboard**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-25T21:26:23Z
- **Completed:** 2026-02-25T21:29:10Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Btn.tsx now uses next/link for internal hrefs (href starting with '/'), enabling SPA navigation without full page reload
- Hero primary CTA changed from waitlist link to "/scan" with "Scanner un menu" text — direct product entry point
- ScanPageShell client component provides subtle fade/slide (opacity 0→1, y 10→0, 300ms easeOut) on /scan entry
- SQL migration file ready to run: adds parse_time_ms + hit_count to menus table + get_scan_stats() admin RPC
- lib/cache.ts instruments every fresh parse with LLM timing and every cache hit with hit_count increment

## Task Commits

Each task was committed atomically:

1. **Task 1: Btn next/link integration + Hero CTA + ScanPageShell animation** - `0c1123b` (feat)
2. **Task 2: Schema migration + cache timing instrumentation** - `6d02f7a` (feat)

## Files Created/Modified
- `components/ui/Btn.tsx` - Added Link from next/link; internal hrefs use Link, external/hash use <a>
- `components/sections/Hero.tsx` - Primary CTA changed to href="/scan" with text "Scanner un menu"
- `components/scan/ScanPageShell.tsx` - New client wrapper with motion.div fade-slide entry animation
- `app/scan/page.tsx` - Wrapped content in ScanPageShell for animated entry
- `supabase/migration-07-stats.sql` - ALTER TABLE adds parse_time_ms + hit_count; CREATE FUNCTION get_scan_stats()
- `supabase/schema.sql` - Canonical schema updated with parse_time_ms + hit_count columns
- `lib/cache.ts` - Records parse_time_ms on insert; fire-and-forget hit_count increment on cache hits

## Decisions Made
- Btn.tsx uses `href.startsWith('/')` to detect internal routes — hash anchors (#waitlist, #features) remain as `<a>` tags, fully non-breaking change
- ScanPageShell wraps Server Component children as a thin `'use client'` wrapper — page.tsx stays a Server Component
- hit_count increment is fire-and-forget (no await, `.then(() => {})`) — avoids adding latency to the cache hit response path
- parse_time_ms is null when preParseResult is supplied — no LLM call was made so there is no timing to record

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
**Run migration SQL before admin dashboard (plan 07-02) can display stats.** In Supabase SQL Editor, run the contents of `supabase/migration-07-stats.sql` to add the `parse_time_ms` and `hit_count` columns and create the `get_scan_stats()` function.

## Next Phase Readiness
- Plan 07-02 (admin dashboard) can now call `supabaseAdmin.rpc('get_scan_stats')` to retrieve total_scans, active_cache_count, avg_parse_time_ms, and total_cache_hits
- The migration SQL must be run in Supabase before admin stats will function
- Navigation and animation fully wired — landing → /scan is a smooth SPA transition

## Self-Check: PASSED

All created files verified on disk. All task commits verified in git history.

- components/ui/Btn.tsx: FOUND
- components/sections/Hero.tsx: FOUND
- components/scan/ScanPageShell.tsx: FOUND
- app/scan/page.tsx: FOUND
- supabase/migration-07-stats.sql: FOUND
- supabase/schema.sql: FOUND
- lib/cache.ts: FOUND
- Commit 0c1123b: FOUND
- Commit 6d02f7a: FOUND

---
*Phase: 07-navigation-and-admin*
*Completed: 2026-02-25*
