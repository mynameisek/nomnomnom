# Phase 2: Content Sections - Research

**Researched:** 2026-02-25
**Domain:** Next.js landing page sections — React component architecture, motion/react animations, Tailwind v4 patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

None — user granted full discretion across all implementation areas.

### Claude's Discretion

**Animation behavior:**
- Auto-play timing for demos (phone, carousel, reverse search) — match or improve v5 intervals
- Scroll-triggered entrance animations — add where they enhance the experience
- Looping behavior and transition smoothness — use motion/react (already in stack)

**Mobile layout:**
- How sections stack on small screens (mobile-first, already a project priority)
- Phone demo positioning relative to hero text on narrow viewports
- Touch interactions for carousel and interactive demos
- Grid breakdown strategies per section

**Image & asset strategy:**
- Use Unsplash URLs from v5 reference with gradient+emoji fallbacks (same pattern as v5)
- Optimize with Next.js Image component where appropriate
- Lazy loading with the fallback pattern already established in v5

**Fidelity to v5 reference:**
- Use v5 as the visual target but adapt to Tailwind v4 + Next.js patterns
- Same French copy and data (dishes, features, FAQs, pricing tiers)
- Improve layout, spacing, and polish where Tailwind/motion capabilities allow
- All inline styles from v5 should become Tailwind utility classes

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HERO-01 | Hero displays tagline "Scanne le menu. Comprends chaque plat." with gradient text effect | Tailwind v4 `bg-clip-text text-transparent bg-gradient-to-r` pattern |
| HERO-02 | Hero shows capability pills (QR · Photo · Lien · Voix / Sans inscription / 50+ langues) | Reusable Pill component with brand token classes |
| HERO-03 | Primary CTA "Rejoindre la liste d'attente" scrolls to waitlist form | `scrollIntoView({ behavior: 'smooth' })` in `use client` component; `html { scroll-behavior: smooth }` already in globals.css |
| HERO-04 | Secondary CTA "Comment ça marche ↓" scrolls to features section | Same scroll pattern; `#features` section id |
| HERO-05 | Food photo mosaic displaying "200+ cuisines du monde" | FoodImage pattern with Next.js Image + gradient fallback; remotePatterns config needed |
| DEMO-01 | Animated phone mockup cycles through scan → menu detection → dish cards → AI Top 3 | useState phase + useEffect setInterval (v5 pattern: 9000ms loop, phases at 0/1300/2800/4200ms) |
| DEMO-02 | QR scan animation with scanning line effect | CSS keyframe `scanLine` defined in globals.css `@theme` as `--animate-scan-line` |
| DEMO-03 | Menu results show restaurant header (name, cuisine, neighborhood, rating) | Static JSX inside PhoneDemo component, conditional on phase >= 2 |
| DEMO-04 | Dish cards display with food thumbnails, prices, descriptions, and tags | FoodImage component with gradient fallback; conditional on phase >= 2 |
| DEMO-05 | AI suggestion panel appears with "consistant, chaud, poulet, pas épicé" example and Top 3 results | Conditional on phase >= 3; motion `initial/animate` fade-up |
| CAROUSEL-01 | Auto-scrolling carousel of world dishes with country flags, original names, French translations, prices, spice levels | setInterval at 3200ms; useRef scroll control |
| CAROUSEL-02 | Active card scales up with orange border, inactive cards fade and scale down | Tailwind classes conditioned on `i === active`; transition classes |
| CAROUSEL-03 | Cards are clickable to set active state | onClick handler sets active index; resets interval |
| FEAT-01 | Six feature cards displayed in responsive grid | Tailwind `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| FEAT-02 | Each card has icon, title, and description | Static data array; Server Component safe |
| REVERSE-01 | Interactive demo with animated typing "boulettes sauce yaourt turquie" | useEffect interval typing simulation; 48ms per char; 10500ms loop |
| REVERSE-02 | Results appear with match percentages, country flags, dish names, and descriptions | `motion.div` with `initial/animate` staggered entrance |
| REVERSE-03 | Food image grid alongside the demo | Three FoodImage components in a 3-col grid |
| SOCIAL-01 | Four feature cards (Taste Profile, Match Score, Leaderboard, NŌM Wrapped) with descriptions and tags | Static data array rendered as cards |
| SOCIAL-02 | Animated Taste Profile demo with cuisine bar chart, spice/budget/style cards, and Match Score teaser | TasteProfileDemo — CSS bar animation via `motion.div` width transition on mount |
| SOCIAL-03 | "Opt-in uniquement" pill clearly visible | Pill component with `glow` variant |
| PRICE-01 | Three pricing tiers displayed (Gratuit 0€, Pass 9.99€ one-time, Pro 3.99€/mois) | Static data array; Server Component safe |
| PRICE-02 | Pass tier highlighted as "Recommandé" with feature list | Conditional border/bg/badge on `pop: true` tier |
| PRICE-03 | Credits bonus explanation below pricing cards | Static text block below pricing grid |
| FAQ-01 | Accordion FAQ with 6 questions | FaqItem component with useState open; FAQS data array |
| FAQ-02 | Smooth expand/collapse animation | `motion.div` with `initial={{ height: 0 }} animate={{ height: "auto" }}` — confirmed available in motion 12.34.3 |
| WAIT-07 | Final CTA section "Plus jamais hésiter devant un menu" with waitlist button | Static section; links to waitlist (Phase 3 handles form logic) |
| WAIT-08 | Background food collage behind waitlist section | Absolute-positioned grid of FoodImage at low opacity (0.08) |
</phase_requirements>

---

## Summary

Phase 2 builds every visible section of the NŌM landing page. The stack is fully locked from Phase 1: Next.js 16 (with React 19), Tailwind v4 with CSS-first `@theme` configuration, and motion/react (framer-motion 12.34.3). The v5 JSX reference at `/Users/ekitcho/Downloads/nom-landing-v5.jsx` is 747 lines and provides exact copy, timing values, data arrays, and visual structure to replicate.

The primary architectural challenge is partitioning interactive sections (phone demo, carousel, reverse search demo, FAQ accordion) — which require `"use client"` — from static sections (features grid, pricing, section headers) which can remain Server Components. This split minimizes client bundle size per the Phase 1 precedent (Footer is a Server Component, Nav is `use client`).

The secondary challenge is animation: motion/react 12 (`framer-motion` 12.34.3) is confirmed installed and exports `motion`, `AnimatePresence`, `useInView`, `useAnimation`, `useScroll`, `LazyMotion`, and `whileInView` prop support. Custom keyframes (scanLine, fadeUp, blink, float, growBar) from v5 should be migrated to Tailwind v4 `@theme` `--animate-*` variables. Unsplash images require `remotePatterns` added to `next.config.ts`.

**Primary recommendation:** Build each section as a discrete component file in `components/sections/`. Interactive sections get `"use client"`, static sections get no directive (Server Components). Wire them all in `app/page.tsx`. Add all custom keyframes to `globals.css` in the `@theme` block upfront, so all components can reference them as Tailwind utility classes.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App router, Image component, Server/Client split | Already installed; Phase 1 foundation |
| React | 19.2.3 | Component model | Already installed |
| motion (framer-motion) | 12.34.3 | Scroll animations, entrance effects, FAQ accordion, bar chart | Already installed; confirmed exports `motion`, `AnimatePresence`, `useInView`, `whileInView`, `useScroll` |
| Tailwind CSS | v4 | All styling — utility classes, `@theme` tokens | Already configured in globals.css |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next/image` | (bundled) | Optimized Unsplash images with lazy load | Hero mosaic, carousel cards, reverse search grid — any image above the fold or where LCP matters |
| `next/font/google` | (bundled) | Outfit font already loaded | Already wired in layout.tsx; no additional work needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `useEffect` interval for demos | motion `animate()` imperative API | Intervals are simpler for phase-based state machines; motion animate better for timeline sequences — v5 uses intervals, keep it |
| `motion.div` height auto for FAQ | CSS `max-height` transition (v5 approach) | `motion.div` `height: "auto"` is cleaner and avoids the max-height hack; confirmed working in motion 12 |
| Next.js `<Image>` for all images | Plain `<img>` with fallback pattern | For Unsplash thumbnails inside the phone mockup (42px, 60px sizes) plain `<img>` with onError fallback is adequate and avoids `remotePatterns` complexity for micro-thumbnails; use `<Image>` for hero mosaic and carousel |

**Installation:**
```bash
# Nothing new to install — all dependencies present in package.json
# Only config change needed: add remotePatterns to next.config.ts
```

---

## Architecture Patterns

### Recommended Project Structure

```
components/
├── layout/              # Phase 1 (Nav, Footer) — done
│   ├── Nav.tsx
│   └── Footer.tsx
└── sections/            # Phase 2 — build here
    ├── Hero.tsx          # "use client" — CTA scroll handlers
    ├── PhoneDemo.tsx     # "use client" — animated phase state machine
    ├── DishCarousel.tsx  # "use client" — auto-scroll + active state
    ├── Features.tsx      # Server Component — static grid
    ├── ReverseSearch.tsx # "use client" — typing animation state
    ├── Social.tsx        # "use client" — TasteProfileDemo animation
    ├── Pricing.tsx       # Server Component — static tiers
    ├── Faq.tsx           # "use client" — accordion open/close state
    └── FinalCta.tsx      # Server Component — static CTA

lib/
└── data.ts              # DISHES, FEATURES, BELI_FEATURES, FAQS, FOOD, PRICING constants
                         # Extracted from v5; used by both Server and Client components

app/
└── page.tsx             # Imports all sections in order; pure Server Component
```

### Pattern 1: Client/Server Section Split

**What:** Interactive sections declare `"use client"`, static sections omit the directive (default Server Component in Next.js App Router).

**When to use:** Every section — decide based on whether it uses `useState`, `useEffect`, browser APIs, or event handlers.

**Decision table:**
```
Hero.tsx         → "use client"  — onClick scroll handlers (HERO-03, HERO-04)
PhoneDemo.tsx    → "use client"  — useState phase, useEffect setInterval
DishCarousel.tsx → "use client"  — useState active, useEffect setInterval, useRef scroll
Features.tsx     → Server        — static data rendering only
ReverseSearch.tsx → "use client" — useState query/results/typing, useEffect interval
Social.tsx       → "use client"  — TasteProfileDemo animation (motion bar chart)
Pricing.tsx      → Server        — static tier cards
Faq.tsx          → "use client"  — useState open per accordion item
FinalCta.tsx     → Server        — static heading + button (button links to anchor, no JS needed)
```

**Example (static section):**
```tsx
// components/sections/Features.tsx — NO "use client"
import { FEATURES } from "@/lib/data";

export default function Features() {
  return (
    <section id="features" className="py-20">
      <div className="mx-auto max-w-content px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map((f, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-orange/[0.06] border border-brand-orange/10 flex items-center justify-center text-xl flex-shrink-0">
                {f.icon}
              </div>
              <div>
                <h3 className="text-sm font-bold mb-1">{f.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

### Pattern 2: Phase-Based Animation State Machine (Phone Demo)

**What:** A `useState` integer cycles through demo phases on a `setInterval`. Each phase renders different UI.

**When to use:** DEMO-01 through DEMO-05 — the phone mockup.

**Timing from v5 (confirmed):**
```
Phase 0 → Phase 1: 1300ms  (scan starts)
Phase 1 → Phase 2: 2800ms  (menu appears)
Phase 2 → Phase 3: 4200ms  (AI panel appears)
Full loop: 9000ms
```

**Example:**
```tsx
"use client";
import { useState, useEffect } from "react";

export default function PhoneDemo() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const run = () => {
      setPhase(0);
      setTimeout(() => setPhase(1), 1300);
      setTimeout(() => setPhase(2), 2800);
      setTimeout(() => setPhase(3), 4200);
    };
    run();
    const loop = setInterval(run, 9000);
    return () => clearInterval(loop);
  }, []);
  // ...
}
```

### Pattern 3: motion/react Scroll-Triggered Entrance

**What:** `motion.div` with `whileInView` + `viewport={{ once: true }}` animates on first scroll into view.

**When to use:** Section headers, feature cards, pricing cards — adds polish without user interaction.

**Confirmed API (framer-motion 12.34.3 types):**
```tsx
// Source: framer-motion dist/types/index.d.ts — AnimationType includes "whileInView"
import { motion } from "motion/react";

<motion.div
  initial={{ opacity: 0, y: 16 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.2 }}
  transition={{ duration: 0.5, ease: "easeOut" }}
>
  {/* content */}
</motion.div>
```

### Pattern 4: FAQ Accordion with motion/react `height: "auto"`

**What:** `AnimatePresence` + `motion.div` animating from `height: 0` to `height: "auto"`. This is the modern replacement for the v5 `max-height` CSS hack.

**When to use:** FAQ-01 and FAQ-02.

**Confirmed:** `height: "auto"` is documented as a supported animation target in motion 12 layout animations. `AnimatePresence` is exported from `framer-motion` (confirmed in types).

```tsx
"use client";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-2xl mb-2 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex justify-between items-center text-left text-sm font-bold"
      >
        <span>{q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          className="text-brand-orange text-lg ml-3 flex-shrink-0"
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-4 text-sm text-white/45 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### Pattern 5: Tailwind v4 Custom Keyframes in `@theme`

**What:** All CSS keyframe animations from v5 are moved into `globals.css` `@theme` block as `--animate-*` variables.

**When to use:** `scanLine`, `fadeUp`, `blink`, `float`, `growBar` — needed by PhoneDemo, ReverseSearch, TasteProfileDemo.

**Confirmed syntax (verified from Tailwind v4 official docs):**
```css
/* In globals.css @theme block — add alongside existing tokens */
@theme {
  /* ... existing tokens ... */

  --animate-scan-line: scan-line 1.5s ease-in-out infinite;
  --animate-fade-up: fade-up 0.4s ease both;
  --animate-blink: blink 0.8s infinite;
  --animate-float: float 7s ease-in-out infinite;
  --animate-grow-bar: grow-bar 1.2s ease both;

  @keyframes scan-line {
    0%, 100% { transform: translateY(-65px); }
    50% { transform: translateY(65px); }
  }
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  @keyframes grow-bar {
    from { width: 0; }
    to { width: var(--bar-width); }
  }
}
```

Usage in JSX: `className="animate-scan-line"`, `className="animate-float"` etc.

**NOTE:** `growBar` in v5 uses `to { width: var(--w) }` which requires a CSS custom property per element. When converting to Tailwind, use inline `style={{ '--bar-width': `${pct}%` }}` alongside the Tailwind animation class, or use motion/react `animate={{ width: pct + '%' }}` instead (simpler).

### Pattern 6: Carousel Scroll Snap

**What:** Horizontal scroll container with `snap-x snap-mandatory` and `overflow-x-auto`. Cards have `snap-center`. Active card has orange border and scale-up via Tailwind conditionals.

**When to use:** DishCarousel (CAROUSEL-01, CAROUSEL-02, CAROUSEL-03).

```tsx
"use client";
import { useRef, useState, useEffect } from "react";
import { DISHES } from "@/lib/data";

export default function DishCarousel() {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const iv = setInterval(() => setActive(p => (p + 1) % DISHES.length), 3200);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTo({ left: active * 218, behavior: "smooth" });
    }
  }, [active]);

  return (
    <div
      ref={ref}
      className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-2"
    >
      {DISHES.map((d, i) => (
        <div
          key={i}
          onClick={() => setActive(i)}
          className={`
            min-w-[206px] max-w-[206px] flex-shrink-0 snap-center rounded-2xl overflow-hidden cursor-pointer
            border transition-all duration-400
            ${i === active
              ? "border-brand-orange/40 scale-[1.03] opacity-100"
              : "border-white/[0.04] scale-95 opacity-40"
            }
          `}
        >
          {/* card content */}
        </div>
      ))}
    </div>
  );
}
```

**Note on scrollbar hiding in Tailwind v4:** No built-in `scrollbar-none` utility. Use arbitrary CSS `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden` directly in className, OR define `@utility no-scrollbar { scrollbar-width: none; &::-webkit-scrollbar { display: none; } }` in `globals.css`.

### Pattern 7: Next.js Image with Unsplash + Gradient Fallback

**What:** `next/image` for performance, with a gradient div shown while loading or on error. Requires `remotePatterns` in `next.config.ts`.

**When to use:** Hero mosaic (HERO-05), carousel card images (CAROUSEL-01). Plain `<img>` with onError is acceptable for tiny phone mockup thumbnails (42px) to keep the component simpler.

**Required `next.config.ts` change:**
```typescript
const nextConfig: NextConfig = {
  turbopack: { root: path.resolve(__dirname) },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};
```

**Usage pattern:**
```tsx
import Image from "next/image";

// With state-based fallback matching v5 pattern:
function FoodImage({ index, className }: { index: number; className?: string }) {
  const [error, setError] = useState(false);
  const f = FOOD[index % FOOD.length];

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: f.grad }}>
      {!error && (
        <Image
          src={f.url}
          alt=""
          fill
          className="object-cover"
          onError={() => setError(true)}
          sizes="(max-width: 768px) 100vw, 400px"
        />
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-2xl">
          {f.emoji}
        </div>
      )}
    </div>
  );
}
```

**Note:** `FoodImage` requires `"use client"` because of `useState`. If this becomes a perf concern, use plain `<img>` with inline `onError` (like v5) for the many small thumbnails.

### Pattern 8: Scroll-to-Section CTA (Hero buttons)

**What:** CTA buttons in Hero that scroll to `#features` or `#waitlist` sections. `html { scroll-behavior: smooth }` is already set in globals.css, so `scrollIntoView` without behavior option works, OR simply use a standard `<a href="#features">` anchor link.

**When to use:** HERO-03 and HERO-04.

```tsx
// Simplest approach — no JS needed, CSS scroll-behavior: smooth already set
<a href="#waitlist" className="...">Rejoindre la liste d'attente</a>
<a href="#features" className="...">Comment ça marche ↓</a>
```

Or with JS for the button styling:
```tsx
const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
};
<button onClick={() => scrollTo("waitlist")}>Rejoindre la liste d'attente</button>
```

### Anti-Patterns to Avoid

- **Putting all sections in a single `app/page.tsx` file:** Makes the file enormous. Create discrete component files in `components/sections/`.
- **Marking static sections as `"use client"`:** Features, Pricing, FinalCta have no interactivity — keeping them as Server Components avoids shipping unnecessary JS.
- **Using CSS `max-height` for accordion animation:** The v5 approach (`max-height: 0 → 200px`) causes layout jank. Use `motion.div` with `height: "auto"` instead.
- **Importing from `framer-motion` directly:** The project uses `motion` as the package. Import from `"motion/react"` (which re-exports all of framer-motion). Don't mix import sources.
- **Forgetting `remotePatterns` for Unsplash:** Next.js Image will throw a configuration error at runtime without it. Add to `next.config.ts` before creating any Image components that point to Unsplash.
- **Using `useEffect` with `setTimeout` without cleanup:** The phone demo creates multiple timeouts per interval tick — store them in an array and clear all on cleanup to avoid state updates after unmount.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FAQ accordion height animation | Custom ResizeObserver + JS height calculation | `motion.div` with `height: "auto"` + `AnimatePresence` | motion handles `height: "auto"` correctly across all browsers |
| Scroll-triggered animations | `IntersectionObserver` boilerplate | `whileInView` + `viewport={{ once: true }}` | Built into motion; zero boilerplate |
| Typing animation cursor | Custom CSS animation class | `@keyframes blink` in `@theme` → `animate-blink` class | Already a Tailwind utility after globals.css addition |
| Custom carousel scroll position | `scrollLeft` calculations with custom easing | `useRef` + `.scrollTo({ behavior: "smooth" })` | Native smooth scroll is sufficient; same as v5 |
| Bar chart width animation | Manually computing percentages + requestAnimationFrame | `motion.div` `animate={{ width: \`${pct}%\` }}` | motion handles the width tween cleanly |

**Key insight:** The v5 reference already solved most animation problems with simple React patterns. Upgrade only the accordion (max-height → motion height:auto) and scroll triggers (add whileInView). Everything else can be a faithful port.

---

## Common Pitfalls

### Pitfall 1: Unsplash Images Blocked at Runtime

**What goes wrong:** Next.js throws `Error: Invalid src prop` or blank images at runtime.
**Why it happens:** `next/image` blocks all external hostnames not listed in `remotePatterns`.
**How to avoid:** Add `images.remotePatterns` to `next.config.ts` before any Image component using Unsplash URLs. Dev server restart required after config change.
**Warning signs:** Console error mentioning "un-configured host" or blank image placeholders.

### Pitfall 2: `"use client"` Boundary Contamination

**What goes wrong:** A Server Component accidentally imports a client component and gets pulled into the client bundle, or vice versa — a client component tries to import a Server Component module.
**Why it happens:** In Next.js App Router, `"use client"` marks a module boundary. Any module imported BY a client component also runs on the client.
**How to avoid:** Keep data constants in `lib/data.ts` (no directives). Server Components import data directly. Client Components also import data directly. Never import a Server Component into a Client Component — pass as `children` props instead.
**Warning signs:** "You're importing a component that needs X. It only works in a Client Component" build error.

### Pitfall 3: setInterval Memory Leaks in Demo Components

**What goes wrong:** Phase state updates fire after component unmounts; React warns about memory leaks.
**Why it happens:** The phone demo and carousel use both `setInterval` AND `setTimeout` inside the interval callback. If the component unmounts between ticks, the dangling timeouts still fire.
**How to avoid:** In cleanup, clear both the interval AND all pending timeouts:
```tsx
useEffect(() => {
  const timeouts: ReturnType<typeof setTimeout>[] = [];
  const run = () => {
    timeouts.push(setTimeout(() => setPhase(1), 1300));
    timeouts.push(setTimeout(() => setPhase(2), 2800));
    timeouts.push(setTimeout(() => setPhase(3), 4200));
  };
  run();
  const loop = setInterval(() => { setPhase(0); run(); }, 9000);
  return () => { clearInterval(loop); timeouts.forEach(clearTimeout); };
}, []);
```
**Warning signs:** React DevTools "Warning: Can't perform a React state update on an unmounted component."

### Pitfall 4: Tailwind v4 Arbitrary CSS vs @utility

**What goes wrong:** Using arbitrary `[scrollbar-width:none]` inline in className works, but pseudo-element variants like `[&::-webkit-scrollbar]:hidden` may not generate correctly in all Tailwind v4 builds.
**Why it happens:** Tailwind v4's JIT engine handles pseudo-elements in arbitrary variants, but complex selectors can sometimes be missed.
**How to avoid:** Define `@utility no-scrollbar` in `globals.css` for the carousel scrollbar-hiding pattern — more reliable than inline arbitrary values for multi-rule utilities.
**Warning signs:** Scrollbar visible on Webkit browsers despite `[&::-webkit-scrollbar]:hidden` class.

### Pitfall 5: `motion.div` with `height: "auto"` Requires `overflow: hidden`

**What goes wrong:** FAQ content visually overflows during the height animation.
**Why it happens:** motion animates height from 0, but without `overflow: hidden` on the wrapping div, content is visible before the animation completes.
**How to avoid:** Always add `className="overflow-hidden"` to the `motion.div` used for height animation.
**Warning signs:** FAQ content briefly visible before collapse animation completes.

### Pitfall 6: `clamp()` Font Sizes — Tailwind v4 vs Inline Style

**What goes wrong:** v5 uses inline `fontSize: "clamp(34px, 4.5vw, 56px)"`. Tailwind v4 doesn't have a `text-clamp` utility.
**Why it happens:** `clamp()` is a CSS function requiring direct CSS value setting.
**How to avoid:** Use Tailwind's responsive prefixes for the closest approximation (`text-4xl lg:text-5xl xl:text-6xl`), OR keep `style={{ fontSize: "clamp(...)" }}` for the specific elements where exact v5 sizing matters. The hero h1 warrants keeping clamp for fidelity.
**Warning signs:** Hero heading too large on tablet or too small on large screens.

---

## Code Examples

Verified patterns from official sources and v5 reference analysis:

### Scroll-triggered entrance (motion/react 12)
```tsx
// Source: framer-motion dist/types/index.d.ts — AnimationType includes "whileInView"
import { motion } from "motion/react";

<motion.section
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.15 }}
  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
>
```

### Staggered card entrance
```tsx
import { motion } from "motion/react";

{FEATURES.map((f, i) => (
  <motion.div
    key={i}
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: i * 0.08, duration: 0.45, ease: "easeOut" }}
  >
    {/* card */}
  </motion.div>
))}
```

### Typing animation (ReverseSearch)
```tsx
// Source: Ported from v5 — confirmed pattern
useEffect(() => {
  const fullQ = "boulettes sauce yaourt turquie";
  let i = 0;
  const startDelay = setTimeout(() => {
    setTyping(true);
    const iv = setInterval(() => {
      if (i <= fullQ.length) {
        setQuery(fullQ.slice(0, i));
        i++;
      } else {
        clearInterval(iv);
        setTyping(false);
        setTimeout(() => setResults(res), 280);
      }
    }, 48);
    return () => clearInterval(iv);
  }, 1400);
  return () => clearTimeout(startDelay);
}, []);
```

### Gradient text (Hero tagline)
```tsx
// Tailwind v4 — bg-clip-text pattern
<span className="bg-gradient-to-br from-brand-orange to-brand-red bg-clip-text text-transparent">
  Comprends chaque plat.
</span>
```

### Custom @utility for scrollbar hiding
```css
/* In globals.css, outside @theme */
@utility no-scrollbar {
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
```

### TasteProfileDemo bar animation with motion
```tsx
// Replace v5's CSS @keyframes growBar with motion animate
import { motion } from "motion/react";

{cuisines.map((c, i) => (
  <motion.div
    key={i}
    className="h-3.5 rounded-full"
    style={{ backgroundColor: c.color }}
    initial={{ width: 0 }}
    animate={{ width: `${c.pct}%` }}
    transition={{ delay: i * 0.1, duration: 1.2, ease: "easeOut" }}
  />
))}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` for custom animations | `@theme { --animate-* + @keyframes }` in CSS | Tailwind v4 (2025) | All custom keyframes live in globals.css, no JS config file |
| `max-height` CSS for accordion | `motion.div height: "auto"` with AnimatePresence | motion v10+ | No magic number needed; smooth animation to real height |
| `framer-motion` import | `motion/react` import | motion 11+ rebrand | Same API; `motion/react` is the new canonical import path for React |
| `priority` on next/image for LCP | `preload` prop | Next.js 15+ | `priority` is deprecated in favor of explicit `preload` prop (LOW confidence — may not apply to Next.js 16.1.6 exactly) |
| `IntersectionObserver` boilerplate | `whileInView` + `viewport` prop | framer-motion v5+ | Declarative scroll triggers; confirmed in motion 12 type exports |

**Deprecated/outdated:**
- `useViewportScroll`: Deprecated — use `useScroll()` (confirmed in framer-motion types: "deprecated. Convert to useScroll()")
- `useElementScroll`: Deprecated — use `useScroll({ container: ref })` (confirmed in framer-motion types)
- `tailwind.config.js` `theme.extend.animation`: v4 replaces this with `@theme` CSS block

---

## Open Questions

1. **`next/image` with `fill` inside phone mockup**
   - What we know: The phone mockup contains 42px images inside absolutely-positioned containers. `next/image` with `fill` requires the parent to have `position: relative` and explicit dimensions.
   - What's unclear: Whether Next.js `<Image fill>` is worth the config overhead for 42px thumbnails that are inside a "fake phone UI."
   - Recommendation: Use plain `<img>` with `onError` fallback for the phone mockup thumbnails (matching v5). Use `<Image>` for hero mosaic (48px visible on page) and carousel cards (110px image area). This avoids `"use client"` on FoodImage for server-side contexts.

2. **`FoodImage` component — Server vs Client**
   - What we know: v5's `FoodImage` uses `useState` for load/error state, requiring client-side rendering.
   - What's unclear: Whether to create two versions (server-safe `<img>` + client `FoodImage` with state) or just accept all image components as client components.
   - Recommendation: Create a single `FoodImage` client component. Mark it `"use client"`. It will be used within already-client-component sections, so no Server Component boundary issues.

3. **`growBar` animation with CSS custom property**
   - What we know: v5's `@keyframes growBar` uses `to { width: var(--w) }` with a per-element `--w` custom property. The Tailwind `--animate-grow-bar` approach in `@theme` can't set per-element `var(--bar-width)` easily.
   - What's unclear: Whether arbitrary inline style `style={{ '--bar-width': `${pct}%` } as React.CSSProperties}` works reliably with `@keyframes` in Tailwind v4.
   - Recommendation: Use `motion.div` `animate={{ width: `${pct}%` }}` instead for the taste profile bar chart — cleaner and avoids the CSS variable complexity.

---

## Sources

### Primary (HIGH confidence)
- `/Users/ekitcho/Downloads/nom-landing-v5.jsx` — definitive visual reference; all timing values, copy, data arrays extracted directly
- `/Users/ekitcho/Desktop/dev-claude-lab/nomnomnom/node_modules/framer-motion/dist/types/index.d.ts` — confirmed: `AnimatePresence`, `useInView`, `motion`, `useScroll`, `LazyMotion`, `whileInView` (AnimationType), `height: "auto"` layout animation all present in 12.34.3
- `/Users/ekitcho/Desktop/dev-claude-lab/nomnomnom/app/globals.css` — confirmed `@theme` token structure; `scroll-behavior: smooth` already set
- `/Users/ekitcho/Desktop/dev-claude-lab/nomnomnom/app/layout.tsx` — confirmed `main.pt-16` wrapper; Nav/Footer wired; Outfit font at 400/500/600/700 weights
- Tailwind v4 official docs (tailwindcss.com/docs/theme) — confirmed `@theme { --animate-* + @keyframes }` syntax (HIGH — official docs)

### Secondary (MEDIUM confidence)
- WebSearch: Next.js `remotePatterns` for Unsplash — confirmed configuration shape; cross-verified with nextjs.org docs structure
- WebSearch: Tailwind v4 scrollbar hiding — `@utility no-scrollbar` approach confirmed as the v4-canonical method (multiple sources agree)
- WebSearch: motion/react accordion pattern — `height: "auto"` with AnimatePresence confirmed working in motion 12 (official motion.dev examples)
- WebSearch: Next.js 16 `preload` deprecating `priority` — MEDIUM confidence; could be Next.js 15 only

### Tertiary (LOW confidence)
- `growBar` CSS custom property behavior in Tailwind v4 `@theme` `@keyframes` — not verified against official docs; using motion alternative instead

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in node_modules with exact versions; framer-motion type exports confirmed
- Architecture: HIGH — v5 reference is ground truth; component split decision table derived from interactivity analysis
- Animation patterns: HIGH — motion 12 type definitions confirm all APIs; Tailwind v4 docs confirm @theme keyframe syntax
- Pitfalls: MEDIUM-HIGH — most derived from v5 analysis + known Next.js patterns; timeout cleanup is a well-known React issue

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable stack; 30-day window appropriate)
