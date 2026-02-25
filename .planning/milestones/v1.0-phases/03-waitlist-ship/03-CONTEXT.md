# Phase 3: Waitlist + Ship - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the Supabase waitlist backend (email signup, referral link generation, position tracking, referral dashboard), add SEO meta tags and OG image, validate Lighthouse performance above 80, and ensure the page is ready for public launch. The FinalCta section from Phase 2 already has a static placeholder button — this phase replaces it with a working form.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

User granted full discretion across all implementation areas — make the best choices aligned with project scope and potential.

**Referral mechanics:**
- Unique referral link generated after signup using a short hash/code (e.g., `?ref=abc123`)
- "Moving up the queue" = referral count displayed, position decreases as friends sign up via your link
- Position calculated as: signup order minus referral bonus (simple formula — each referral moves you up N spots)
- Referral dashboard shows: your position, number of friends referred, your unique share link with copy button
- Keep it simple — no complex tier system, just a linear queue with referral bumps

**Signup flow & feedback:**
- Email validation (format check + prevent obvious junk)
- Duplicate email handling: show friendly message "Tu es déjà inscrit(e) !" with their existing referral link
- Success state: "Parfait ! On te prévient dès que c'est prêt." (exact copy from requirements)
- After success: reveal referral dashboard inline (no separate page) — share link, position, referral count
- Error states: network error with retry suggestion, validation error inline on the input

**SEO & launch assets:**
- OG image: branded dark card with NŌM logo, tagline, and food imagery — generate as a static asset
- Meta title: "NŌM — Scanne le menu. Comprends chaque plat."
- Meta description: concise FR pitch mentioning scan, translation, 50+ languages
- Twitter card: summary_large_image format
- No analytics pixels for now — keep it clean for launch

**Performance targets:**
- Lighthouse performance > 80 on simulated 3G (requirement PERF-02)
- All Unsplash images lazy-loaded with gradient+emoji fallbacks (already partially done in Phase 2)
- Optimize largest images (hero mosaic, carousel cards) with proper sizing
- Minimize client JS bundle — leverage Server Components where possible (already done)
- Semantic HTML with proper headings (h1 → h2 → h3) and landmarks (nav, main, section, footer)

</decisions>

<specifics>
## Specific Ideas

- Supabase is already configured (env vars set in Phase 1, `@supabase/supabase-js` in stack)
- FinalCta.tsx already has the waitlist section layout with `id="waitlist"` — replace static button with working form
- The success message copy is locked by requirements: "Parfait ! On te prévient dès que c'est prêt."
- All French copy — no English fallbacks
- Referral dashboard should feel integrated, not like a separate app — keep it within the same page section

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-waitlist-ship*
*Context gathered: 2026-02-25*
