---
phase: 05-scan-pipeline
plan: 02
subsystem: ui
tags: [qr-scanner, browser-image-compression, next-app-router, supabase, tailwind, scan-ui]

# Dependency graph
requires:
  - phase: 05-scan-pipeline plan 01
    provides: POST /api/scan/url, POST /api/scan/photo Route Handlers

provides:
  - /scan page with QR/URL/Photo tab-based scan UI
  - components/scan/ScanTabs.tsx — tab orchestrator with progress overlay
  - components/scan/UrlInput.tsx — URL paste input wired to /api/scan/url
  - components/scan/QrScanner.tsx — in-browser QR via dynamic import('qr-scanner')
  - components/scan/PhotoUpload.tsx — photo capture + INFR-04 resize (maxWidthOrHeight: 1024)
  - components/scan/ScanProgress.tsx — 4-step animated progress indicator
  - /menu/[id] Server Component — loads menu + items from Supabase, renders dishes with translations/allergens/trust signals

affects:
  - 06-menu-display (replaces menu/[id] stub with full dish card design)

# Tech tracking
tech-stack:
  added: []  # qr-scanner and browser-image-compression were installed in Plan 01 ahead of schedule
  patterns:
    - dynamic import('qr-scanner') in useEffect for browser-only library (SSR-safe)
    - Custom event (qr-decoded) to pass QR result from scanner to UrlInput without prop drilling
    - ScanTabs progress overlay: isScanning state replaces tab content with ScanProgress
    - Timer-driven step advancement (every 3s) with immediate jump to final step on API resolve
    - image/jpeg compression via browser-image-compression before multipart FormData upload

key-files:
  created:
    - app/scan/page.tsx
    - app/menu/[id]/page.tsx
    - components/scan/ScanTabs.tsx
    - components/scan/QrScanner.tsx
    - components/scan/UrlInput.tsx
    - components/scan/PhotoUpload.tsx
    - components/scan/ScanProgress.tsx
  modified: []

key-decisions:
  - "Custom window event (qr-decoded) for QR->URL handoff — avoids prop drilling through ScanTabs into UrlInput when QR tab is unmounted on tab switch"
  - "dynamic import('qr-scanner') in useEffect — qr-scanner accesses navigator.mediaDevices at import time; SSR-safe via browser-only dynamic load"
  - "ScanProgress uses timer advancement (3s per step) with isComplete jump — gives live feedback during 6-15s parse without coupling to API progress events"

patterns-established:
  - "Timer-driven progress simulation: advance steps on fixed intervals, jump to done on resolve — acceptable UX for long-running background tasks without streaming"
  - "QR scanner feeds decoded URL through URL scan flow via custom event — single code path for all text URL sources"

requirements-completed: [SCAN-01, SCAN-04]

# Metrics
duration: 4min
completed: 2026-02-25
---

# Phase 5 Plan 02: Scan Pipeline — Client UI Components and Menu Display Page Summary

**Three-tab scan UI (/scan) with QR/URL/Photo methods, INFR-04 client-side image resize, 4-step progress indicator, and /menu/[id] Server Component rendering Supabase dish data**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-25T13:53:17Z
- **Completed:** 2026-02-25T13:57:25Z
- **Tasks:** 2 of 3 (Task 3 is checkpoint:human-verify — awaiting human verification)
- **Files modified:** 7

## Accomplishments
- Built `/scan` page with three tab inputs (URL default, QR Code, Photo) and a progress overlay during pipeline execution
- `QrScanner` uses dynamic `import('qr-scanner')` inside `useEffect` — browser-safe, feeds decoded URLs through the same URL scan flow via `qr-decoded` custom event
- `PhotoUpload` compresses images to max 1024px with `browser-image-compression` before multipart upload (INFR-04 compliance)
- `ScanProgress` shows 4-step animated indicator (Reading → Identifying → Translating → Done) with spinner on active step and 15s slow-message fallback
- `/menu/[id]` Server Component queries `menus` + `menu_items` from Supabase, renders dish names, FR/EN translations, prices, allergens, dietary tags, and trust signal badges; returns 404 for invalid IDs

## Task Commits

Each task was committed atomically:

1. **Task 1: Create scan page and input components** - `b8bfebf` (feat)
2. **Task 2: Create /menu/[id] stub page with data loading** - `56b4d46` (feat)

**Plan metadata:** *(pending final commit)*

## Files Created/Modified
- `app/scan/page.tsx` — Server component scan page with metadata export
- `components/scan/ScanTabs.tsx` — Tab orchestrator: manages scanState, error, currentStep, progress overlay; QR decoded event listener
- `components/scan/UrlInput.tsx` — URL form with fetch to `/api/scan/url`; listens for `qr-decoded` custom event for QR->URL handoff
- `components/scan/QrScanner.tsx` — Dynamic qr-scanner import in useEffect; environment camera; calls `onResult(decoded_url)` on scan
- `components/scan/PhotoUpload.tsx` — File input with `capture="environment"`; preview thumbnail; browser-image-compression (maxWidthOrHeight: 1024); fetch to `/api/scan/photo` without Content-Type header
- `components/scan/ScanProgress.tsx` — 4-step progress indicator with pulse animation on active step, checkmark on completed, 15s slow-message via setTimeout
- `app/menu/[id]/page.tsx` — Dynamic Server Component; Supabase query with `menu_items(*)`; `notFound()` guard; DishCard with translations, allergens, dietary tags, trust signal badge; `generateMetadata`

## Decisions Made
- **QR->URL event handoff via `window.dispatchEvent`**: When QR scans a code, ScanTabs switches to the URL tab and dispatches `qr-decoded` event. UrlInput listens for this event, sets the URL value, and auto-submits. This avoids prop drilling through the tab-switching logic when the QR component is about to unmount.
- **`dynamic()` with `ssr: false` for QrScanner**: qr-scanner accesses `navigator.mediaDevices` at module evaluation time; wrapping with Next.js dynamic import prevents SSR errors.
- **Timer-driven progress**: Steps advance every 3 seconds regardless of API state — standard UX pattern for opaque long-running tasks. API resolve jumps immediately to final step.

## Deviations from Plan

None — plan executed exactly as written. The QR->URL event pattern was implied by the plan ("onResult callback feeds decoded URL into URL scan flow") and implemented with a custom window event as the simplest SSR-safe mechanism.

## Issues Encountered
None.

## User Setup Required

Before end-to-end testing (Task 3 checkpoint):
- `SCREENSHOTONE_ACCESS_KEY` and `SCREENSHOTONE_SECRET_KEY` in `.env.local`
- `OPENAI_API_KEY` in `.env.local`
- `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- Supabase schema applied (`supabase/schema.sql` run in SQL Editor)

## Next Phase Readiness
- All client UI components compile and pass `npm run build`
- `/scan` and `/menu/[id]` routes are in the build output
- Complete scan pipeline (client + server) ready for end-to-end human verification (Task 3 checkpoint)
- Phase 6 (menu display) will replace the `/menu/[id]` stub with full dish card components

---
*Phase: 05-scan-pipeline*
*Completed: 2026-02-25*
