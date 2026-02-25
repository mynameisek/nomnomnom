---
phase: 02-content-sections
plan: 01
subsystem: ui
tags: [nextjs, tailwind, react, animation, hero, landing-page]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Tailwind v4 brand tokens, Next.js 16 scaffold, globals.css @theme block, max-w-content utility
provides:
  - Hero section with gradient tagline, capability pills, dual CTAs, and food mosaic
  - Animated PhoneDemo component cycling through 4 phases (scan -> detect -> menu -> AI) on a 9s loop
  - Shared data module (lib/data.ts) with FOOD, DISHES, FEATURES, BELI_FEATURES, FAQS arrays
  - Reusable UI primitives: FoodImage, Pill, Btn components
  - Global CSS keyframes: scan-line, fade-up, blink, float
  - Unsplash remote image pattern in next.config.ts
affects: [02-02, 02-03, 03-waitlist]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Client components for interactive/animated sections (Hero, PhoneDemo use "use client")
    - Server-safe UI primitives for static components (Pill, Btn — no "use client")
    - Shared data module at lib/data.ts (no "use client" — pure data)
    - Memory-safe timeout cleanup in useEffect (array of IDs + forEach clearTimeout)
    - FoodImage component with gradient+emoji fallback for resilient image display
    - clamp() for responsive font sizing via inline style (clamp(34px, 4.5vw, 56px))

key-files:
  created:
    - lib/data.ts (FOOD:8, DISHES:6, FEATURES:6, BELI_FEATURES:4, FAQS:6 arrays + FoodItem type)
    - components/ui/FoodImage.tsx (gradient+emoji fallback image with load/error state)
    - components/ui/Pill.tsx (server-safe pill with glow variant)
    - components/ui/Btn.tsx (server-safe button/anchor with primary/secondary/big variants)
    - components/sections/Hero.tsx (hero with pills, tagline, CTAs, food mosaic)
    - components/sections/PhoneDemo.tsx (4-phase animated phone mockup)
  modified:
    - app/globals.css (added scan-line, fade-up, blink, float keyframes + @utility no-scrollbar)
    - next.config.ts (added images.remotePatterns for images.unsplash.com)
    - app/page.tsx (wired Hero as first visible section)

key-decisions:
  - "Pill and Btn are server-safe (no use client) — only Hero and PhoneDemo need client-side"
  - "FoodImage uses plain HTML img (not next/image) for simplicity inside phone mockup small sizes"
  - "Hero uses CSS grid with grid-cols-[1.15fr_0.85fr] at lg, stacked on mobile"
  - "PhoneDemo cleanup uses array of timeout IDs to prevent memory leaks and stale state"

patterns-established:
  - "components/sections/ for page-level section components"
  - "components/ui/ for reusable atomic UI components"
  - "lib/data.ts as single source of truth for all landing page copy and data"

requirements-completed:
  - HERO-01
  - HERO-02
  - HERO-03
  - HERO-04
  - HERO-05
  - DEMO-01
  - DEMO-02
  - DEMO-03
  - DEMO-04
  - DEMO-05

# Metrics
duration: ~35min
completed: 2026-02-25
---

# Phase 2 Plan 01: Hero + PhoneDemo Summary

**Hero section with gradient tagline, 3 capability pills, dual CTAs, food mosaic, and a 4-phase animated phone demo cycling scan -> detect -> menu -> AI Top 3 on a 9-second loop — user approved**

## Performance

- **Duration:** ~35 min (tasks 1-2 auto + checkpoint:human-verify approved)
- **Started:** 2026-02-25
- **Completed:** 2026-02-25
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify — approved)
- **Files modified:** 3 modified, 6 created

## Accomplishments
- Shared data module with all 5 arrays (FOOD:8, DISHES:6, FEATURES:6, BELI_FEATURES:4, FAQS:6) from v5 reference with exact French copy and Unsplash URLs
- Three reusable UI primitives: FoodImage (gradient+emoji fallback), Pill (glow variant), Btn (primary/secondary/big, renders as a or button)
- Global animation keyframes added to globals.css: scan-line, fade-up, blink, float
- Hero section: "Scanne le menu." + gradient "Comprends chaque plat." tagline, 3 pills, orange CTA + ghost CTA, 5-image food mosaic with "200+" badge
- PhoneDemo: 4-phase animation (QR code area, scan line + detect, menu with dish cards, AI Top 3 panel) on 9-second interval with memory-safe cleanup
- Visual verification approved by user

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared data, UI primitives, and global animation keyframes** - `0df78d5` (feat)
2. **Task 2: Build Hero section and PhoneDemo components, wire into page** - `30f4aed` (feat)
3. **Task 3: Verify hero and phone demo visually** - Checkpoint:human-verify — user approved all visual checks

## Files Created/Modified
- `lib/data.ts` - FOOD, DISHES, FEATURES, BELI_FEATURES, FAQS arrays + FoodItem type (no "use client")
- `components/ui/FoodImage.tsx` - use client, gradient bg + plain img + emoji fallback on error
- `components/ui/Pill.tsx` - server-safe, glow variant for orange-tinted pills
- `components/ui/Btn.tsx` - server-safe, primary/secondary/big variants, renders as a or button based on href
- `components/sections/Hero.tsx` - use client, CSS grid layout, pills + tagline + CTAs + food mosaic
- `components/sections/PhoneDemo.tsx` - use client, 4-phase state machine with interval + timeouts, float animation
- `app/globals.css` - added scan-line/fade-up/blink/float @keyframes outside @theme, @utility no-scrollbar
- `next.config.ts` - images.remotePatterns for images.unsplash.com
- `app/page.tsx` - imports and renders Hero as first section

## Decisions Made
- Pill and Btn kept as server components (no window/state needed) — only Hero and PhoneDemo require "use client"
- FoodImage uses plain HTML `<img>` tag rather than next/image — simpler for small sizes inside phone mockup, avoids layout constraint issues
- Hero font size uses `style={{ fontSize: "clamp(34px, 4.5vw, 56px)" }}` inline style since Tailwind arbitrary clamp values in v4 are verbose
- PhoneDemo stores all timeout IDs in an array and runs `forEach clearTimeout` on unmount — prevents stale state update warnings after component unmount

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required for this plan.

## Next Phase Readiness
- Shared data (lib/data.ts) ready for Plan 02 carousel, feature grid, and FAQ sections to consume
- UI primitives (Pill, Btn, FoodImage) available for all subsequent sections
- Animation keyframes (scan-line, fade-up, blink, float) ready for use via Tailwind animate-* utilities
- Hero renders at top of page — Plan 02 sections append below it in app/page.tsx
- All Unsplash food images configured in next.config.ts remotePatterns

---
*Phase: 02-content-sections*
*Completed: 2026-02-25*

## Self-Check: PASSED

- lib/data.ts — FOUND
- components/ui/FoodImage.tsx — FOUND
- components/ui/Pill.tsx — FOUND
- components/ui/Btn.tsx — FOUND
- components/sections/Hero.tsx — FOUND
- components/sections/PhoneDemo.tsx — FOUND
- Commit 0df78d5 — FOUND
- Commit 30f4aed — FOUND
