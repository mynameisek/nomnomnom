# Phase 7: Navigation and Admin - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the landing page CTA to `/scan` (client-side navigation, no full reload) and build a protected `/admin` page for LLM model selection and scan statistics. No new scanning, parsing, or display features — this is navigation glue and operational tooling.

</domain>

<decisions>
## Implementation Decisions

### Admin access & auth
- Password page at `/admin` — shows a simple password input, secret not visible in URL bar
- Secret stored as `ADMIN_SECRET` environment variable in `.env.local` — standard, secure, easy to rotate
- On correct password: set a session cookie or short-lived token so admin doesn't re-enter on every page load
- On incorrect password: show inline error, no redirect — keep it simple
- No password → 403-style blocked state (password input stays visible, not a redirect)

### Admin dashboard layout
- Single-page layout: model selector at top, stats section below
- Stats: total scans, cached vs fresh ratio, average parse time — the 3 numbers from success criteria
- Recent scans list (last 10-20) with URL/timestamp below counters — useful for debugging without over-engineering
- Clean, minimal design — this is an internal tool, not user-facing polish

### Model switching UX
- Dropdown selector with the 3 model options (GPT-4o / GPT-4o-mini / GPT-4.1-mini)
- Save button pattern — explicit confirmation prevents accidental model changes
- Show current active model clearly before any change
- Success toast/indicator after save — confirm the change took effect

### Landing → App transition
- Subtle fade/slide transition when CTA navigates to `/scan` — makes it feel like entering the app rather than jumping pages
- Standard Next.js `<Link>` for client-side routing (no full reload)
- CTA should be prominent and clear — "Scanner un menu" or similar action-oriented text

### Claude's Discretion
- Exact transition animation implementation (CSS transition, Framer Motion, or View Transitions API)
- Admin page styling details (spacing, typography, color scheme)
- Cookie/token duration and implementation for admin session
- Error state designs for failed stat queries
- Whether to show model descriptions alongside the dropdown options

</decisions>

<specifics>
## Specific Ideas

- User explicitly wants a subtle visual transition from landing to /scan — not just a plain link jump
- Admin is a solo-founder tool for v1.1 — keep it functional, not fancy
- The 3 stats (total scans, cache ratio, avg parse time) map directly to success criteria — don't over-scope

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-navigation-and-admin*
*Context gathered: 2026-02-25*
