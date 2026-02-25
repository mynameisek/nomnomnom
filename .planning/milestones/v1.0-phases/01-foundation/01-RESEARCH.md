# Phase 1: Foundation - Research

**Researched:** 2026-02-25
**Domain:** Next.js 16 App Router + Tailwind v4 + brand design system deployment
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Stack locked: Next.js 16 + Tailwind v4 + motion/react + Supabase

### Claude's Discretion

User delegated all Phase 1 design decisions to Claude. Adjust later as needed.

**Nav bar:**
- Fixed top nav, dark background with slight transparency/blur on scroll
- NŌM logo left-aligned, single CTA button ("Rejoindre la liste d'attente") right-aligned
- Mobile: same layout, no hamburger needed (only one CTA link)
- Nav links for section anchors can be added in Phase 2 when sections exist

**Footer:**
- Minimal footer: NŌM logo, copyright line, "Made with [heart] in [city]" or similar
- Keep it light — full footer links (legal, socials) can be added later if needed

**Page shell & layout:**
- Max content width ~1200px, centered
- Sections spaced with generous vertical padding (~120-160px)
- Before Phase 2 content: show the branded shell (nav + footer) with empty body — no placeholder content needed
- Smooth scroll behavior enabled globally

**Brand feel & dark theme:**
- Background: #09090B (near-black, not pure black)
- Subtle noise texture or grain overlay for depth (optional, Claude decides)
- Orange (#FF6B35) as primary accent, used sparingly on CTAs and highlights
- Typography: Outfit font loaded via next/font, weights 400/500/600/700
- Polished enough to feel intentional if someone visits the Vercel URL early

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LAYOUT-01 | Landing page renders correctly on mobile (320px+), tablet, and desktop breakpoints | Tailwind v4 responsive utilities, mobile-first breakpoint system, max-w container centering |
| LAYOUT-02 | Dark theme with brand colors (#09090B background, #FF6B35 orange, #E8453C red, #42D392 green accent) | Tailwind v4 @theme directive with hex color definitions; CSS custom properties |
| LAYOUT-03 | Outfit font loaded and applied across all text elements | next/font/google with variable font weights; CSS variable injection into Tailwind @theme |
| LAYOUT-04 | Fixed navigation bar with NŌM logo and CTA button | `fixed top-0 left-0 right-0 z-50` + `backdrop-blur-md` + scroll-aware opacity; "use client" for scroll detection |
| LAYOUT-05 | Footer with branding and copyright | Server Component; minimal markup using brand colors and Outfit font |
| DEPLOY-01 | Deployed on Vercel with CI/CD from git repository | Vercel GitHub integration: auto-deploys on push, preview URLs per branch |
| DEPLOY-02 | Environment variables secured (Supabase keys, etc.) | NEXT_PUBLIC_ prefix for client-safe vars; Vercel dashboard env var management per environment |
</phase_requirements>

---

## Summary

Phase 1 establishes a deployed Next.js 16 shell with NŌM's brand design system. The work is well-understood: Next.js 16 ships with Turbopack as the default bundler, App Router as the only recommended pattern, and `create-next-app` generates a TypeScript + Tailwind + ESLint project with a single command. Tailwind v4 (released January 2025) completely changes configuration from `tailwind.config.js` to a CSS-first `@theme` directive — there is no config file, colors and fonts are defined directly in `globals.css`. This is the single biggest "gotcha" for developers familiar with Tailwind v3.

Font loading is handled by `next/font/google`, which self-hosts fonts at build time, eliminating Google network requests. The Outfit font supports variable weights, so a single import covers 400/500/600/700. The font is applied globally by setting a CSS variable in `globals.css` and referencing it in the Tailwind `@theme`. For smooth scroll, Next.js 16 removed automatic `scroll-behavior` injection — the new mechanism requires `data-scroll-behavior="smooth"` on the `<html>` element in `layout.tsx`.

Vercel deployment is automated via GitHub integration: every push triggers a preview deployment, merges to main trigger production. Supabase environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) must be added in the Vercel dashboard per environment (production/preview) — the Vercel-Supabase marketplace integration can automate this sync.

**Primary recommendation:** Bootstrap with `npx create-next-app@latest --yes`, replace the Tailwind `globals.css` with brand `@theme` tokens, wire Outfit via `next/font`, build Nav and Footer as separate components (Nav as `"use client"` for scroll detection, Footer as Server Component), then deploy to Vercel before writing any content sections.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.x (latest) | Framework: routing, SSR, font optimization, metadata | App Router is the recommended architecture; Turbopack default |
| react / react-dom | 19.2 (canary) | UI rendering | Bundled by Next.js 16; React 19.2 features (View Transitions) included |
| tailwindcss | 4.x | Utility CSS with CSS-first config | Locked stack; v4 is current stable (Jan 2025 release) |
| @tailwindcss/postcss | 4.x | PostCSS plugin for Tailwind v4 | Required bridge between Tailwind v4 and PostCSS pipeline |
| motion | latest | Animation library (motion/react) | Locked stack; replaces framer-motion package name |
| typescript | 5.1+ | Type safety | Required by Next.js 16 minimum; auto-configured by create-next-app |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | latest | Supabase client | Phase 1: env var validation only; Phase 2+ for actual data |
| postcss | latest | CSS processing | Required by @tailwindcss/postcss |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| next/font/google | Google Fonts CDN link | next/font self-hosts, eliminates FOUT, no external request; CDN link is simpler but slower and leaks user IPs to Google |
| Tailwind v4 @theme | tailwind.config.js (v3 style) | v4 is the locked stack; config file no longer needed or recommended |
| motion/react | framer-motion | Same library; `motion` is the new package name, `framer-motion` is the legacy alias — both work but `motion` is current |

**Installation:**
```bash
# Bootstrap (includes next, react, tailwind, typescript, eslint, turbopack)
npx create-next-app@latest nomnomnom --yes

# Add motion for animations
npm install motion

# Add Supabase client
npm install @supabase/supabase-js
```

> Note: `tailwindcss` and `@tailwindcss/postcss` are included automatically by `create-next-app --yes` when Tailwind is selected (the default).

---

## Architecture Patterns

### Recommended Project Structure

```
nomnomnom/
├── app/
│   ├── layout.tsx          # Root layout: font, metadata, html/body
│   ├── page.tsx            # Home page (shell only in Phase 1)
│   └── globals.css         # Tailwind import + @theme brand tokens
├── components/
│   ├── layout/
│   │   ├── Nav.tsx         # "use client" — scroll-aware fixed nav
│   │   └── Footer.tsx      # Server Component — minimal footer
│   └── ui/                 # Shared UI primitives (Phase 2+)
├── lib/
│   └── supabase.ts         # Supabase client singleton (env var access)
├── public/
│   └── logo.svg            # NŌM logo asset
├── next.config.ts          # Next.js config (minimal for Phase 1)
├── postcss.config.mjs      # Required: @tailwindcss/postcss plugin
└── tsconfig.json           # Auto-generated by create-next-app
```

### Pattern 1: Tailwind v4 CSS-First Brand Tokens

**What:** All brand colors and fonts defined via `@theme` in `globals.css`. No `tailwind.config.js`. Generates utility classes automatically (`bg-brand-bg`, `text-brand-orange`, etc.).

**When to use:** Always — this is the only configuration mechanism in Tailwind v4.

**Example:**
```css
/* Source: https://tailwindcss.com/docs/colors + https://tailwindcss.com/blog/tailwindcss-v4 */
@import "tailwindcss";

@theme {
  /* Brand colors */
  --color-brand-bg: #09090B;
  --color-brand-orange: #FF6B35;
  --color-brand-red: #E8453C;
  --color-brand-green: #42D392;
  --color-brand-white: #FAFAFA;

  /* Typography */
  --font-sans: var(--font-outfit), sans-serif;

  /* Layout */
  --max-width-content: 1200px;
}
```

Generated classes available: `bg-brand-bg`, `text-brand-orange`, `border-brand-red`, `fill-brand-green`, `font-sans`.

### Pattern 2: next/font/google with CSS Variable

**What:** Import Outfit from `next/font/google`, expose it as a CSS variable, inject it into `<html>` className and reference in Tailwind `@theme`.

**When to use:** Any Google Font loaded globally. The CSS variable approach integrates cleanly with Tailwind v4.

**Example:**
```tsx
// Source: https://nextjs.org/docs/app/getting-started/fonts (version 16.1.6, 2026-02-20)
// app/layout.tsx
import { Outfit } from 'next/font/google'
import type { Metadata } from 'next'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-outfit',   // Exposes as CSS custom property
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'NŌM',
  description: 'Découvrez chaque menu, où que vous soyez.',
  openGraph: {
    title: 'NŌM',
    description: 'Découvrez chaque menu, où que vous soyez.',
    locale: 'fr_FR',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="fr"
      className={outfit.variable}
      data-scroll-behavior="smooth"
    >
      <body className="bg-brand-bg text-brand-white font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
```

### Pattern 3: Fixed Nav with Scroll-Aware Backdrop

**What:** Nav is a `"use client"` component that listens to scroll position and transitions from transparent to blurred/dark on scroll. Uses Tailwind utility classes for layout.

**When to use:** Fixed navbars that need different appearance at top vs. scrolled.

**Example:**
```tsx
// Source: Verified pattern from Tailwind docs + Next.js App Router conventions
'use client'

import { useEffect, useState } from 'react'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-brand-bg/90 backdrop-blur-md border-b border-white/5'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-[1200px] px-6 h-16 flex items-center justify-between">
        {/* Logo left */}
        <span className="font-semibold text-brand-white tracking-tight">NŌM</span>
        {/* CTA right */}
        <button className="bg-brand-orange text-white px-4 py-2 rounded-lg text-sm font-medium">
          Rejoindre la liste d'attente
        </button>
      </div>
    </header>
  )
}
```

### Pattern 4: Noise Grain Overlay

**What:** SVG `feTurbulence` filter embedded as a data URI in a `::before` pseudo-element creates a subtle grain texture without loading an external image. Applied at the body level.

**When to use:** Dark backgrounds that feel flat; grain adds depth without color.

**Example:**
```css
/* Source: https://www.bstefanski.com/blog/noisygrainy-backgrounds-and-gradients-in-css */
/* In globals.css, after @theme block */

body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)'/%3E%3C/svg%3E");
  mix-blend-mode: overlay;
}
```

> This is the recommended approach: SVG data URI is more performant than a raster PNG and creates no extra network request.

### Pattern 5: Smooth Scroll (Next.js 16 Breaking Change)

**What:** Next.js 16 removed automatic `scroll-behavior: smooth` injection. Must now opt in explicitly.

**When to use:** Any Next.js 16 app with smooth scroll CSS.

**Example:**
```tsx
// Source: https://nextjs.org/docs/messages/missing-data-scroll-behavior
// Add data-scroll-behavior="smooth" to <html>
<html lang="fr" data-scroll-behavior="smooth" className={outfit.variable}>
```

Also add to `globals.css`:
```css
html {
  scroll-behavior: smooth;
}
```

### Pattern 6: Supabase Client with Environment Variables

**What:** Create a singleton Supabase client that reads from environment variables. Phase 1 only validates the env vars exist — no actual Supabase calls needed.

**Example:**
```ts
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

```
# .env.local (not committed to git)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Anti-Patterns to Avoid

- **Importing motion in Server Components:** `motion` from `motion/react` requires `"use client"`. Wrap animated components in a client boundary — never put motion imports in `layout.tsx` or page-level Server Components.
- **Using tailwind.config.js with Tailwind v4:** The config file is not used in v4. Custom colors defined there will be silently ignored. All customization goes in `globals.css` via `@theme`.
- **Setting `scroll-behavior: smooth` in CSS without `data-scroll-behavior` on `<html>`:** Next.js 16 will log a warning and the behavior is undefined during router navigations.
- **Putting `SUPABASE_SERVICE_ROLE_KEY` in `NEXT_PUBLIC_*`:** Service role key must never be exposed to the browser. Only `SUPABASE_URL` and `SUPABASE_ANON_KEY` use `NEXT_PUBLIC_` prefix.
- **Forgetting `postcss.config.mjs`:** Without the `@tailwindcss/postcss` plugin registered, Tailwind classes will not be processed and the build will produce unstyled output with no error message in some configurations.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Google Font loading | Manual `<link>` tags or @import | `next/font/google` | Eliminates FOUT, self-hosts, generates optimal font-display, no external request |
| CSS utility classes | Custom Sass/CSS utilities | Tailwind v4 @theme + utilities | Tailwind generates optimized, purged CSS automatically; hand-rolled utilities bloat CSS |
| Scroll event management | Raw scroll listeners in multiple components | Single `useEffect` in Nav component with `{ passive: true }` | Passive listeners prevent scroll jank; centralize in one component |
| Noise texture images | PNG/WebP grain overlays | SVG `feTurbulence` data URI | No network request, infinitely scalable, ~200 bytes vs ~50KB PNG |
| Environment variable management | Hardcoded values or custom config | `.env.local` + Vercel dashboard env vars | Next.js built-in env var system, Vercel syncs per-environment automatically |

**Key insight:** Every hand-rolled solution in this domain has already been solved by the framework or its ecosystem. The job is wiring existing tools correctly, not building new ones.

---

## Common Pitfalls

### Pitfall 1: Tailwind v4 Config File Not Found / Styles Not Applied

**What goes wrong:** Developer creates `tailwind.config.js` with custom colors; nothing works. OR: developer uses old `@tailwind base/components/utilities` directives from v3.
**Why it happens:** Tailwind v4 completely replaced config-file-based customization with CSS-first `@theme`. The old `@tailwind` directives are also replaced by `@import "tailwindcss"`.
**How to avoid:** Start fresh. `globals.css` starts with `@import "tailwindcss";` followed by an `@theme {}` block. No `tailwind.config.js` needed.
**Warning signs:** Tailwind utility classes not applying, no errors in terminal, or `text-primary` not resolving.

### Pitfall 2: next/font Variable Not Connected to Tailwind

**What goes wrong:** Outfit font is imported and className applied to `<html>`, but text still renders in system font.
**Why it happens:** The `variable: '--font-outfit'` option creates a CSS custom property, but Tailwind `--font-sans` must reference it. If `@theme` doesn't reference `var(--font-outfit)`, the `font-sans` utility uses the Tailwind default stack.
**How to avoid:** In `@theme`: `--font-sans: var(--font-outfit), sans-serif;`. Apply `font-sans` to `<body>`. Confirm `outfit.variable` (not `outfit.className`) is the className applied to `<html>`.
**Warning signs:** Browser devtools show `font-family: ui-sans-serif, system-ui` instead of `Outfit`.

### Pitfall 3: Fixed Nav Covers Page Content

**What goes wrong:** The fixed nav sits on top of the first section's content, cutting off top padding.
**Why it happens:** `position: fixed` removes the nav from flow; the body content starts at `top: 0`.
**How to avoid:** Add `pt-16` (matching nav height) to the `<main>` element or page wrapper. In Phase 1, the body is empty, so this isn't visible yet — but the `<main>` wrapper should have it from day one.
**Warning signs:** First content section partially hidden under nav on load.

### Pitfall 4: Smooth Scroll Warning in Next.js 16

**What goes wrong:** Console warning: "Missing data-scroll-behavior Attribute for Smooth Scroll". Scroll behavior may behave unexpectedly during navigation.
**Why it happens:** Next.js 16 removed automatic `scroll-behavior` detection. It now requires explicit opt-in via HTML attribute.
**How to avoid:** Add `data-scroll-behavior="smooth"` to `<html>` in `layout.tsx` AND `scroll-behavior: smooth` in `globals.css`.
**Warning signs:** Console warning during development, erratic scroll on browser back/forward.

### Pitfall 5: Supabase Keys in Git

**What goes wrong:** `.env.local` committed to the repository; secrets exposed in GitHub.
**Why it happens:** Developer adds `.env.local` before setting up `.gitignore`.
**How to avoid:** `create-next-app` generates a `.gitignore` that excludes `.env.local` by default. Verify `.gitignore` contains `.env*.local` before first commit. Set Vercel env vars in the Vercel dashboard, never in the repo.
**Warning signs:** `.env.local` appears in `git status` output.

### Pitfall 6: motion/react Used in Server Components

**What goes wrong:** TypeScript error or runtime error: "You're importing a component that needs `useState`..."
**Why it happens:** `motion` components require browser APIs (requestAnimationFrame, Web Animations API) — only available client-side.
**How to avoid:** Any file using `import { motion } from 'motion/react'` must have `'use client'` at the top. For Phase 1, this applies to Nav only (if scroll animation is added). Footer and layout are Server Components with no motion.
**Warning signs:** Build-time error mentioning `useState` or `useEffect` in a Server Component.

---

## Code Examples

Verified patterns from official sources:

### Complete globals.css (Phase 1)

```css
/* Source: https://tailwindcss.com/blog/tailwindcss-v4 + https://tailwindcss.com/docs/colors */
@import "tailwindcss";

@theme {
  /* ── Brand Colors ── */
  --color-brand-bg:     #09090B;
  --color-brand-orange: #FF6B35;
  --color-brand-red:    #E8453C;
  --color-brand-green:  #42D392;
  --color-brand-white:  #FAFAFA;
  --color-brand-muted:  #71717A;

  /* ── Typography ── */
  --font-sans: var(--font-outfit), ui-sans-serif, system-ui, sans-serif;

  /* ── Layout ── */
  --max-width-content: 1200px;
}

/* ── Base resets ── */
html {
  scroll-behavior: smooth;
}

/* ── Optional grain overlay ── */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)'/%3E%3C/svg%3E");
  mix-blend-mode: overlay;
}
```

### Complete app/layout.tsx (Phase 1)

```tsx
/* Source: https://nextjs.org/docs/app/getting-started/fonts (v16.1.6)
          https://nextjs.org/docs/app/getting-started/metadata-and-og-images (v16.1.6)
          https://nextjs.org/docs/messages/missing-data-scroll-behavior */
import { Outfit } from 'next/font/google'
import type { Metadata } from 'next'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-outfit',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'NŌM — Découvrez chaque menu',
  description: 'Scannez, comprenez et explorez n\'importe quel menu, partout dans le monde.',
  openGraph: {
    title: 'NŌM',
    description: 'Scannez, comprenez et explorez n\'importe quel menu.',
    locale: 'fr_FR',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="fr"
      className={outfit.variable}
      data-scroll-behavior="smooth"
    >
      <body className="bg-brand-bg text-brand-white font-sans antialiased min-h-screen">
        <Nav />
        <main className="pt-16">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
```

### postcss.config.mjs (Required for Tailwind v4)

```js
/* Source: https://tailwindcss.com/docs/guides/nextjs */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
export default config
```

### Vercel Deployment Environment Variables

Variables to set in the Vercel dashboard (Settings → Environment Variables):

| Variable | Environment | Notes |
|----------|-------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production + Preview | Public — safe for browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production + Preview | Public — safe for browser (Row Level Security protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | Production only | Secret — server-side only, never expose |

> The Vercel-Supabase marketplace integration at vercel.com/marketplace/supabase can automate syncing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the Supabase dashboard.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` for custom colors/fonts | `@theme {}` in CSS file | Tailwind v4, Jan 2025 | No JS config file; pure CSS customization |
| `@tailwind base; @tailwind components; @tailwind utilities;` | `@import "tailwindcss";` | Tailwind v4, Jan 2025 | Single import replaces three directives |
| `import framer-motion` | `import motion/react` | Motion v11, late 2024 | Same library, new package name; `framer-motion` still works as alias |
| `next lint` script | Direct `eslint` CLI | Next.js 16, Oct 2025 | `next build` no longer runs lint; add `eslint` script to package.json |
| `middleware.ts` | `proxy.ts` (deprecated; renamed) | Next.js 16, Oct 2025 | Rename to `proxy.ts` for Phase 1 setup |
| Automatic smooth scroll | `data-scroll-behavior="smooth"` attribute | Next.js 16, Oct 2025 | Explicit opt-in required on `<html>` element |
| Webpack default bundler | Turbopack default bundler | Next.js 16, Oct 2025 | Faster builds/HMR; no config change needed; opt out with `--webpack` |
| Sync `params` access | `await params` (async) | Next.js 16, Oct 2025 | All dynamic params are now Promises |

**Deprecated/outdated:**
- `experimental.ppr`: Removed in Next.js 16; replaced by `cacheComponents: true`
- `next lint` script: Deprecated; use `eslint` directly
- `serverRuntimeConfig` / `publicRuntimeConfig`: Removed; use `.env` files

---

## Open Questions

1. **NŌM logo format**
   - What we know: The visual reference at `/Users/ekitcho/Downloads/nom-landing-v5.jsx` uses text "NŌM" with the macron character, not an SVG file
   - What's unclear: Whether an SVG logo file exists or will be created, or if the Phase 1 nav should use a styled text mark
   - Recommendation: Use a styled text mark (`<span>NŌM</span>` with Outfit font, weight 700, tracking-tight) as the logo placeholder. Replace with SVG in a later phase if needed.

2. **Vercel project creation timing**
   - What we know: CI/CD auto-deploys on every push once the Vercel project is linked to the GitHub repo
   - What's unclear: Whether the GitHub repo already exists or needs to be created
   - Recommendation: Create the GitHub repo first, then connect to Vercel via the Vercel dashboard import flow. This is a one-time manual step.

3. **motion/react usage in Phase 1**
   - What we know: motion is in the locked stack; Phase 1 is a shell with nav + footer
   - What's unclear: Whether any animation is needed in Phase 1 beyond CSS transitions
   - Recommendation: Install motion but don't use it in Phase 1. The scroll-aware nav state change is handled with CSS `transition-all` only. motion usage begins in Phase 2 with section animations.

---

## Sources

### Primary (HIGH confidence)

- `https://nextjs.org/blog/next-16` — Next.js 16 release notes (published Oct 21, 2025): breaking changes, Turbopack default, smooth scroll change, proxy.ts, create-next-app defaults
- `https://nextjs.org/docs/app/getting-started/fonts` (v16.1.6, last updated 2026-02-20) — next/font/google setup, variable fonts, CSS variable approach
- `https://nextjs.org/docs/app/getting-started/installation` (v16.1.6, last updated 2026-02-20) — create-next-app exact command, default project setup
- `https://nextjs.org/docs/app/getting-started/project-structure` (v16.1.6, last updated 2026-02-20) — App Router conventions, folder structure
- `https://nextjs.org/docs/app/getting-started/metadata-and-og-images` (v16.1.6, last updated 2026-02-20) — Metadata API, static metadata export
- `https://nextjs.org/docs/messages/missing-data-scroll-behavior` — smooth scroll opt-in via `data-scroll-behavior`
- `https://tailwindcss.com/blog/tailwindcss-v4` — Tailwind v4 @theme directive, CSS-first config, @import syntax
- `https://tailwindcss.com/docs/guides/nextjs` — Tailwind v4 + Next.js setup, postcss.config.mjs
- `https://tailwindcss.com/docs/colors` — Custom color definitions with hex values in @theme
- `https://motion.dev/docs/react-installation` (via WebSearch verification) — package name `motion`, import `from 'motion/react'`, `"use client"` requirement

### Secondary (MEDIUM confidence)

- `https://www.bstefanski.com/blog/noisygrainy-backgrounds-and-gradients-in-css` — SVG feTurbulence data URI grain texture technique (verified as cross-browser standard CSS/SVG approach)
- `https://supabase.com/partners/integrations/vercel` — Vercel-Supabase integration env var sync behavior
- `https://vercel.com/docs/git/vercel-for-github` — GitHub auto-deploy on push, preview deployments

### Tertiary (LOW confidence — flagged for validation)

- WebSearch claim: Vercel-Supabase marketplace integration automatically syncs env vars. **Validate:** manually check that env vars are actually set after integration before assuming they exist.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Verified against official Next.js 16 and Tailwind v4 docs (updated Feb 2026)
- Architecture patterns: HIGH — Directly from official Next.js docs with version numbers
- Tailwind v4 @theme: HIGH — From official Tailwind v4 blog and docs
- Pitfalls: HIGH — Most derived from official breaking changes documentation (Next.js 16 upgrade guide)
- Noise texture: MEDIUM — Technique is CSS/SVG standard, but the specific implementation is from a third-party blog (verified as using standard browser APIs)
- Deployment/Supabase env var automation: MEDIUM — Vercel dashboard env var management is HIGH; Supabase integration auto-sync has a known bug report (Issue #18163)

**Research date:** 2026-02-25
**Valid until:** 2026-04-25 (stable APIs; Tailwind v4 and Next.js 16 are stable releases)
