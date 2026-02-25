# Phase 5: Scan Pipeline - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

All three scan methods (QR code, URL paste, photo upload) through the LLM pipeline to a valid `/menu/[id]` page with parsed dish data. Display surface (dish cards, filters) is Phase 6. Navigation wiring is Phase 7.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
User deferred all implementation choices to Claude — pick best practices for each area.

**Scan page layout:**
- Claude decides how the three scan methods are presented on `/scan` (tabs, cards, unified input, etc.)
- Claude decides page structure, visual hierarchy, and mobile-first layout
- Claude decides how to handle the QR → URL redirect flow vs in-app scanning

**Loading experience:**
- Claude decides loading indicator style (progress steps, skeleton, spinner, etc.)
- Claude decides what feedback to show during parsing stages
- Claude decides how to handle long parse times (>5s) — keep user informed, never blank screen

**Camera & photo flow:**
- Claude decides camera vs gallery picker behavior
- Claude decides whether to show preview before sending
- Claude decides image guidance (framing hints, quality feedback)
- INFR-04: Client-side resize to 1024px max before upload — this is a requirement, not discretionary

**Error handling UX:**
- Claude decides how scan failures are presented (toast, inline, full-page)
- Claude decides recovery options (retry, try different method, manual entry)
- Claude decides what happens with unrecognized QR codes or unparseable menus

**Screenshot API vendor:**
- Pending decision from STATE.md — select during research (Screenshotone vs APIFlash vs Browserless)
- Must handle JavaScript SPAs (eazee-link.com confirmed JS SPA)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User trusts Claude to pick best practices for mobile-first restaurant menu scanning UX.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-scan-pipeline*
*Context gathered: 2026-02-25*
