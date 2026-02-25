---
phase: 03-waitlist-ship
plan: 02
subsystem: ui
tags: [seo, og-image, twitter-card, semantic-html, next-og, performance]

# Dependency graph
requires:
  - phase: 03-waitlist-ship/03-01
    provides: FinalCta waitlist form and referral dashboard

provides:
  - OG image (1200x630) branded dark card at /opengraph-image
  - Twitter card image (1200x628) at /twitter-image
  - Updated layout.tsx metadata with metadataBase, title, OG, Twitter
  - Correct semantic HTML: one h1, h2 per section, nav/main/section/footer landmarks
  - All below-fold images lazy-loaded

affects: [vercel-deployment, social-sharing, SEO, accessibility]

# Tech tracking
tech-stack:
  added: [next/og (ImageResponse)]
  patterns: [Next.js file-convention OG image auto-wiring via metadataBase]

key-files:
  created:
    - app/opengraph-image.tsx
    - app/twitter-image.tsx
  modified:
    - app/layout.tsx
    - app/page.tsx
    - components/layout/Nav.tsx
    - components/sections/FinalCta.tsx
    - components/sections/PhoneDemo.tsx

key-decisions:
  - "metadataBase set to NEXT_PUBLIC_SITE_URL env var with fallback to Vercel URL"
  - "page.tsx changed from <main> wrapper to React Fragment — layout.tsx already provides <main>"
  - "Nav.tsx: <nav aria-label> added inside <header> for proper landmark hierarchy"
  - "FinalCta.tsx: h3 promoted to h2 for the waitlist section heading"

patterns-established:
  - "OG/Twitter images use inline style={{}} objects only — no Tailwind (Satori constraint)"
  - "All <img> tags below the fold have loading=lazy; hero phone image also lazy since it appears after 2.8s delay"

requirements-completed:
  - PERF-01
  - PERF-02
  - PERF-03
  - SEO-01
  - SEO-02

# Metrics
duration: 18min
completed: 2026-02-25
---

# Phase 3 Plan 02: SEO Metadata, OG/Twitter Images, and Semantic HTML Audit Summary

**Next.js OG image generation (1200x630 dark branded card), Twitter card, full SEO metadata with metadataBase, and semantic HTML audit fixing nested main, missing nav landmark, and h3-to-h2 promotion — all verified via TypeScript and build.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-02-25T16:58:01Z
- **Completed:** 2026-02-25T17:16:00Z
- **Tasks:** 1 of 2 complete (Task 2 is checkpoint:human-verify)
- **Files modified:** 7

## Accomplishments
- Created OG image (1200x630) and Twitter image (1200x628) using `next/og` ImageResponse — both dark branded cards with NOM name, orange tagline, muted subtitle, food emoji row
- Updated `layout.tsx` metadata with `metadataBase`, new canonical title/description, full `openGraph` (siteName, locale, type), and `twitter.card = summary_large_image`
- Fixed semantic HTML: removed nested `<main>` in `page.tsx`, added `<nav aria-label>` landmark in Nav, promoted FinalCta section heading from `<h3>` to `<h2>`
- Confirmed exactly ONE `<h1>` on page (Hero), all sections use `<h2>`, all images have `loading="lazy"`
- All animations use `transform` + `opacity` only (GPU composited) — verified via globals.css keyframes audit

## Task Commits

Each task was committed atomically:

1. **Task 1: SEO metadata, OG/Twitter images, semantic HTML audit** - `91057a0` (feat)

**Plan metadata:** TBD (docs: complete plan — awaiting Task 2 human-verify checkpoint)

## Files Created/Modified
- `app/layout.tsx` - Updated metadata export with metadataBase, new title, OG, Twitter card
- `app/opengraph-image.tsx` - Created: 1200x630 dark branded ImageResponse (NOM branding, orange tagline)
- `app/twitter-image.tsx` - Created: 1200x628 dark branded ImageResponse (same content, Twitter aspect ratio)
- `app/page.tsx` - Removed duplicate `<main>` wrapper (layout.tsx provides the landmark)
- `components/layout/Nav.tsx` - Added `<nav aria-label="Navigation principale">` inside `<header>`
- `components/sections/FinalCta.tsx` - Promoted `<h3>` to `<h2>` for "Rejoins les premiers testeurs"
- `components/sections/PhoneDemo.tsx` - Added `loading="lazy"` to the restaurant image

## Decisions Made
- `metadataBase` reads from `NEXT_PUBLIC_SITE_URL` env var with fallback to the Vercel deployment URL — this allows local dev and production to resolve OG image URLs correctly
- `page.tsx` changed from `<main>` to React Fragment `<>` — layout.tsx already wraps children in `<main className="pt-16">`, so the component-level `<main>` was creating nested main elements (invalid HTML)
- PhoneDemo restaurant image got `loading="lazy"` even though it's in the Hero — the image only appears after a 2.8s timer delay (`phase >= 2`), so it's never LCP-critical

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed nested `<main>` elements (invalid semantic HTML)**
- **Found during:** Task 1 (semantic HTML audit)
- **Issue:** `page.tsx` wrapped children in `<main>`, but `layout.tsx` already renders `<main className="pt-16">{children}</main>`. Two `<main>` elements is invalid HTML (only one per page).
- **Fix:** Changed `page.tsx` wrapper from `<main>` to React Fragment `<>`
- **Files modified:** `app/page.tsx`
- **Verification:** Inspected layout.tsx — confirms single `<main>` landmark
- **Committed in:** `91057a0` (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added `<nav>` landmark inside Nav header**
- **Found during:** Task 1 (landmark audit)
- **Issue:** `Nav.tsx` used `<header>` but had no `<nav>` element — screen readers need a `<nav>` landmark for navigation accessibility
- **Fix:** Wrapped nav link content in `<nav aria-label="Navigation principale">`
- **Files modified:** `components/layout/Nav.tsx`
- **Verification:** Nav renders `<header><nav>...</nav></header>` — both landmarks present
- **Committed in:** `91057a0` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical accessibility)
**Impact on plan:** Both necessary for HTML validity and accessibility. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required for this plan.

## Next Phase Readiness
- OG image and Twitter card are live at /opengraph-image and /twitter-image
- SEO metadata fully configured — awaiting Task 2 human verification (Lighthouse, view-source, OG image visual check)
- After human verification, phase 03-waitlist-ship is complete

---
*Phase: 03-waitlist-ship*
*Completed: 2026-02-25*
