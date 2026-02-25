---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [nextjs, tailwind, supabase, vercel, typescript, motion]

# Dependency graph
requires: []
provides:
  - Next.js 16 + TypeScript project scaffold with Turbopack
  - Tailwind v4 brand design system (@theme tokens, 6 colors, Outfit font, noise grain)
  - Fixed Nav component with scroll-aware blur and French CTA button
  - Minimal Footer component with NOM branding
  - Supabase client singleton (env-var-driven, no real calls yet)
  - GitHub repository at https://github.com/mynameisek/nomnomnom
  - Live Vercel production deployment at https://nomnomnom-delta.vercel.app
affects: [02-hero-sections, 03-waitlist]

# Tech tracking
tech-stack:
  added:
    - next@16.1.6 (with Turbopack)
    - react@19
    - tailwindcss@4 (via @tailwindcss/postcss)
    - @supabase/supabase-js
    - motion
    - next/font/google (Outfit)
  patterns:
    - Tailwind v4 @theme block for brand tokens (not tailwind.config)
    - Server Components for static layout pieces (Footer)
    - "use client" only where needed (Nav scroll detection)
    - Env vars in .env.local, excluded from git via .env* gitignore pattern

key-files:
  created:
    - app/globals.css (brand @theme tokens, noise grain overlay)
    - app/layout.tsx (Outfit font, FR metadata, Nav+Footer wiring)
    - app/page.tsx (empty shell)
    - components/layout/Nav.tsx (fixed, scroll-aware, CTA button)
    - components/layout/Footer.tsx (Server Component, NOM branding)
    - lib/supabase.ts (createClient singleton, validates env vars)
    - next.config.ts (turbopack root set)
  modified:
    - package.json (added motion, @supabase/supabase-js)

key-decisions:
  - "create-next-app run in /tmp due to .planning dir conflict, files copied via rsync"
  - "next.config.ts turbopack.root set to suppress multi-lockfile workspace warning"
  - "lib/supabase.ts throws at import time if env vars missing (fail-fast pattern)"
  - "Footer as Server Component — no interactivity needed, avoids client bundle cost"
  - "Nav as use client — scroll detection requires window API"

patterns-established:
  - "Tailwind v4 @theme: use --color-brand-* and --font-sans custom properties for all brand values"
  - "Component location: components/layout/ for layout-level components"
  - "max-w-content: use the custom --max-width-content: 1200px token, not max-w-7xl"

requirements-completed:
  - LAYOUT-01
  - LAYOUT-02
  - LAYOUT-03
  - LAYOUT-04
  - LAYOUT-05
  - DEPLOY-01
  - DEPLOY-02

# Metrics
duration: ~40min
completed: 2026-02-25
---

# Phase 1 Plan 01: Foundation Summary

**Next.js 16 + Tailwind v4 shell with NOM dark brand system deployed to Vercel at https://nomnomnom-delta.vercel.app — visually approved by user**

## Performance

- **Duration:** ~40 min (25 min tasks 1-3 + checkpoint verification)
- **Started:** 2026-02-25T03:17:25Z
- **Completed:** 2026-02-25
- **Tasks:** 4 (3 auto + 1 checkpoint:human-verify — approved)
- **Files modified:** 9 created, 2 modified

## Accomplishments
- Next.js 16 + TypeScript + Tailwind v4 + Turbopack scaffolded and building clean
- Brand design system: 6 colors (#09090B bg, #FF6B35 orange, #E8453C red, #42D392 green, #FAFAFA white, #71717A muted), Outfit font, noise grain overlay — all via Tailwind @theme
- Fixed Nav with scroll-aware backdrop blur and "Rejoindre la liste d'attente" CTA
- Minimal Footer with NOM branding, tagline, copyright, Strasbourg credit
- Supabase client singleton created (wired for Phase 3 waitlist)
- Code pushed to https://github.com/mynameisek/nomnomnom
- Production deployment live at https://nomnomnom-delta.vercel.app

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js 16 project and configure brand design system** - `7bfb7c6` (feat)
2. **Task 2: Build Nav and Footer components** - `5dda21b` (feat)
3. **Task 3: Initialize git repo, push to GitHub, deploy to Vercel** - `692df3c` (docs — checkpoint commit, code pushed to GitHub)
4. **Task 4: Verify deployed shell visually** - Checkpoint:human-verify — user approved all visual checks (dark theme, Nav blur, Outfit font, footer, responsive at 320px)

## Files Created/Modified
- `app/globals.css` - Tailwind v4 @theme brand tokens, noise grain overlay, smooth scroll
- `app/layout.tsx` - Outfit font via next/font/google, FR metadata, Nav+Footer layout shell
- `app/page.tsx` - Empty shell (no placeholder content)
- `components/layout/Nav.tsx` - use client, fixed positioning, scroll detection, orange CTA button
- `components/layout/Footer.tsx` - Server Component, NOM branding, tagline, copyright, city
- `lib/supabase.ts` - createClient singleton reading NEXT_PUBLIC_SUPABASE_URL/ANON_KEY
- `next.config.ts` - turbopack.root configured
- `package.json` - added motion + @supabase/supabase-js

## Decisions Made
- Used /tmp scaffold + rsync to work around create-next-app refusing to run in non-empty directory (.planning dir conflict)
- Set `turbopack.root` in next.config.ts to suppress multi-lockfile workspace detection warning
- lib/supabase.ts throws at import time when env vars missing — fail-fast approach for easier debugging in Phase 3
- Footer is a Server Component (no window/state needed) to keep client bundle lean
- Nav is "use client" only for scroll detection (window.scrollY)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used rsync copy instead of create-next-app in-place**
- **Found during:** Task 1 (scaffolding)
- **Issue:** create-next-app refuses to run in a non-empty directory — the existing `.planning/` folder caused it to abort
- **Fix:** Ran create-next-app in /tmp/nomnomnom-scaffold then rsync'd all files (excluding node_modules and .git) to the project root, then ran `npm install`
- **Files modified:** All scaffolded files
- **Verification:** npm run build passes cleanly
- **Committed in:** 7bfb7c6

**2. [Rule 1 - Bug] Fixed turbopack workspace root warning**
- **Found during:** Task 1 (build verification)
- **Issue:** next build emitted warning about multiple lockfiles and incorrect workspace root detection (picking /Users/ekitcho/yarn.lock instead of project root)
- **Fix:** Added `turbopack: { root: path.resolve(__dirname) }` to next.config.ts
- **Files modified:** next.config.ts
- **Verification:** npm run build no longer shows workspace warning
- **Committed in:** 7bfb7c6

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for correct scaffolding. No scope creep.

## Issues Encountered
- create-next-app incompatible with non-empty directory — resolved via /tmp scaffold pattern (see deviation above)

## User Setup Required

**External services require manual configuration for full functionality:**

### Supabase (for Phase 3 waitlist — configure now to avoid Phase 3 delays)
1. Go to https://supabase.com/dashboard and create a new project (or use existing)
2. In Supabase Dashboard → Project Settings → API:
   - Copy **Project URL** → This is `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **anon/public key** → This is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. In Vercel Dashboard → Project (nomnomnom) → Settings → Environment Variables:
   - Add `NEXT_PUBLIC_SUPABASE_URL` with your Supabase project URL
   - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` with your anon key
   - Apply to Production, Preview, Development

### Verification
After adding env vars, trigger a new Vercel deployment (push any commit or redeploy from dashboard). The site should still load correctly (Supabase calls only happen in Phase 3).

## Next Phase Readiness
- Foundation complete — Phase 2 can build hero section, carousel, and feature sections into the empty `app/page.tsx`
- Brand tokens available as Tailwind utilities: `bg-brand-bg`, `bg-brand-orange`, `text-brand-green`, `text-brand-muted`, etc.
- `max-w-content` available for all page-width containers
- Outfit font auto-applied via `font-sans` class (set as --font-sans in @theme)
- Supabase client ready in `lib/supabase.ts` for Phase 3 waitlist integration
- Vercel + GitHub CI/CD in place — all future pushes to main auto-deploy

---
*Phase: 01-foundation*
*Completed: 2026-02-25*

## Self-Check: PASSED

- app/globals.css — FOUND
- app/layout.tsx — FOUND
- components/layout/Nav.tsx — FOUND
- components/layout/Footer.tsx — FOUND
- lib/supabase.ts — FOUND
- Commit 7bfb7c6 — FOUND
- Commit 5dda21b — FOUND
- Commit 692df3c — FOUND
