---
phase: 03-waitlist-ship
plan: 01
subsystem: database, ui
tags: [supabase, server-action, react, useActionState, referral, waitlist, animation]

# Dependency graph
requires:
  - phase: 02-content-sections
    provides: FinalCta component with static placeholder form

provides:
  - Supabase waitlist table schema with RLS (SQL ready for user to run)
  - app/actions/waitlist.ts — Server Action handling signup, duplicate detection, referral logic
  - components/sections/FinalCta.tsx — interactive email form with referral dashboard

affects:
  - phase 03 plan 02 and beyond (waitlist data, position API)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useActionState with Server Action for progressive form enhancement
    - Suspense boundary wrapping useSearchParams() hook
    - AnimatePresence for form/dashboard state transitions
    - Race condition handling on unique constraint violations (code 23505)
    - Referral position calculation with bonus spot offset

key-files:
  created:
    - app/actions/waitlist.ts
  modified:
    - components/sections/FinalCta.tsx

key-decisions:
  - "useActionState(joinWaitlist) for form state — no useState/useEffect for submission logic"
  - "WaitlistForm as inner component wrapped in Suspense to isolate useSearchParams boundary"
  - "getDashboard() as shared helper used by both new signups and duplicate detection"
  - "Supabase SQL table creation deferred to user action — code is written, table schema documented in plan"

patterns-established:
  - "Server Action pattern: 'use server' + FormData input + WaitlistState union type output"
  - "Referral bonus: each referral moves user up REFERRAL_BONUS_SPOTS (5) positions"

requirements-completed:
  - WAIT-01
  - WAIT-02
  - WAIT-03
  - WAIT-04
  - WAIT-05
  - WAIT-06

# Metrics
duration: 12min
completed: 2026-02-25
---

# Phase 03 Plan 01: Waitlist Ship Summary

**Supabase waitlist Server Action with referral system and interactive FinalCta form — email signup, position tracking, and copy-able referral link via useActionState**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-02-25T05:10:58Z
- **Completed:** 2026-02-25T05:22:00Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 converted)

## Accomplishments
- Created `app/actions/waitlist.ts` Server Action with full signup/duplicate/error/dashboard logic
- Converted static FinalCta placeholder into working `'use client'` form with `useActionState`
- Referral dashboard shows position, referral count, and copy-able share URL after signup
- Duplicate email detection returns existing dashboard (no re-registration confusion)
- Race condition handling for concurrent signups via Postgres error code 23505
- `?ref=CODE` captured from URL and stored as `referrer_code` on signup
- AnimatePresence transitions between form and dashboard states
- Build passes, TypeScript passes with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Supabase waitlist table and Server Action** - `1fb9822` (feat)
2. **Task 2: Replace FinalCta static button with working waitlist form and referral dashboard** - `2db244f` (feat)

**Plan metadata:** (docs commit — see final commit below)

## Files Created/Modified
- `app/actions/waitlist.ts` — Server Action: WaitlistState type, joinWaitlist, getDashboard, generateRefCode, isValidEmail
- `components/sections/FinalCta.tsx` — Converted to 'use client', WaitlistForm with Suspense/useSearchParams, email form, referral dashboard

## Decisions Made
- Used `useActionState` (not `useState` + `fetch`) — cleaner progressive enhancement pattern matching React 19 / Next.js 16 idioms
- WaitlistForm extracted as inner component so `useSearchParams()` can be wrapped in `<Suspense>` without blocking the entire section
- `getDashboard()` helper shared between new signups and duplicate returns — avoids duplicating position calculation logic
- Native `<button>` for submit (not Btn component) — enables `disabled` state management during pending without extra props

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**The Supabase `waitlist` table must be created before the form can function.** Run the following SQL in the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql):

```sql
CREATE TABLE public.waitlist (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  ref_code    TEXT UNIQUE NOT NULL,
  referrer_code TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_can_insert" ON public.waitlist
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_can_select" ON public.waitlist
  FOR SELECT TO anon USING (true);

CREATE INDEX waitlist_referrer_code_idx ON public.waitlist (referrer_code);
CREATE INDEX waitlist_created_at_idx ON public.waitlist (created_at);
```

After running this SQL, test the form at your local dev server (`npm run dev`) or deployed URL.

## Next Phase Readiness
- Waitlist form is functional once Supabase table is created
- Referral system is complete: URL capture, storage, position calculation, dashboard display
- Phase 03 Plan 02 (if any) can build on top of the `waitlist` table and `WaitlistState` types

---
*Phase: 03-waitlist-ship*
*Completed: 2026-02-25*
