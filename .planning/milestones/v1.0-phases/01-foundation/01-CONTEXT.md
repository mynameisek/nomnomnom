# Phase 1: Foundation - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

A deployed Next.js 16 shell on Vercel with the NŌM brand design system applied: dark theme, fixed nav with logo, footer, brand colors (#09090B, #FF6B35, #E8453C, #42D392), Outfit font, and Supabase env vars configured. No content sections — those come in Phase 2.

</domain>

<decisions>
## Implementation Decisions

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

</decisions>

<specifics>
## Specific Ideas

- JSX reference at /Users/ekitcho/Downloads/nom-landing-v5.jsx is visual reference only — not a base to build from
- FR only for landing page copy; mobile-first priority
- Stack locked: Next.js 16 + Tailwind v4 + motion/react + Supabase

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-02-25*
