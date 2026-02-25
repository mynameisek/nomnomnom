# Phase 2: Content Sections - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Build all visible landing page sections — hero, phone demo, dish carousel, features grid, reverse search demo, social/gamification, pricing, FAQ, and final CTA — with correct French copy, interactions, and animations. The v5 JSX reference (/Users/ekitcho/Downloads/nom-landing-v5.jsx) defines the visual target. Nav and Footer already exist from Phase 1.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

User granted full discretion across all implementation areas with freedom to improve on the v5 reference where possible.

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

</decisions>

<specifics>
## Specific Ideas

- v5 reference at /Users/ekitcho/Downloads/nom-landing-v5.jsx is the definitive visual target (747 lines, single-file React)
- All copy is in French — maintain exact same text content
- Stack from Phase 1: Next.js 16 + Tailwind v4 (with @theme tokens in globals.css) + motion/react
- Brand tokens already defined: #09090B bg, #FF6B35 orange, #E8453C red, #42D392 green, Outfit font
- Nav and Footer already built as Phase 1 components — sections go between them in app/page.tsx

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-content-sections*
*Context gathered: 2026-02-25*
