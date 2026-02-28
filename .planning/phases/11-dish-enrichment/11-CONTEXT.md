# Phase 11: Dish Enrichment - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Each dish card shows a cultural explanation, origin, and typical ingredients — delivered asynchronously after scan, with a progress indicator and the ability to regenerate. This builds on Phase 10's canonical names and enrichment_status infrastructure. The detail view is a new UI surface; DishCards get a light preview. Regeneration is admin-only for now.

</domain>

<decisions>
## Implementation Decisions

### Enrichment content & depth
- **Adaptive depth**: exotic/foreign dishes get full cultural storytelling (origin, cultural significance, regional variations, how it's eaten); common dishes (steak frites, salade César) get practical-only enrichment (what it is, key ingredients)
- Enrichment is LLM-generated per batch (one call per menu, established in Phase 10 architecture)
- The LLM prompt must distinguish between "needs explanation" vs "self-explanatory" dishes and adjust depth accordingly
- Claude's discretion: exact fields stored per dish (e.g., origin, ingredients, cultural_note, eating_tips), and how to signal depth tier to the LLM

### DishCard progressive UX
- **Two-level progressive disclosure**: light preview on the card → rich detail on tap
- **Light preview on card**: Claude's discretion on format (one-liner cultural hint, origin tag, or combination) — keep it minimal, the card is already dense
- **Detail view on tap**: mobile-first pattern (99% of users are mobile) — Claude's discretion on bottom sheet vs modal, but must feel native on mobile
- **Loading indicator**: Claude's discretion on style (skeleton shimmer vs subtle spinner) — must not take over the card, minimal footprint
- Enrichment appears progressively: card shows loading state → light preview fills in → tap opens detail view with full content
- No page reload required — enrichment updates appear in real-time after the async process completes

### Enrichment triggers & timing
- **Food only**: enrichment fires only for items where `is_beverage = false` — beverages are completely skipped for cultural enrichment (they already have canonical names from Phase 10)
- Enrichment runs inside `after()` (established Phase 10 pattern) — never blocks the scan response
- One batch LLM call per menu (established decision from STATE.md)
- Claude's discretion: whether to chunk large menus for enrichment (like the 80-dish chunking for canonical names), and exact prioritization within a batch

### Regeneration behavior
- **Admin-only**: no user-facing regeneration button — this is an admin/curator tool for now
- **Both per-dish and per-menu**: admin panel provides a "Régénérer" button per dish AND a bulk "Ré-enrichir tout" button per menu
- Bulk regen is useful when switching LLM models or improving prompts
- Claude's discretion: confirmation dialog, visual feedback during regen, and whether regen creates a new version or overwrites

### Claude's Discretion
- Light preview format on DishCard (one-liner vs origin tag + one-liner)
- Detail view pattern (bottom sheet vs modal — must be mobile-native)
- Loading indicator style (skeleton shimmer vs spinner)
- Enrichment data schema (exact fields per dish)
- LLM prompt design for adaptive depth
- Chunking strategy for large menu enrichment
- Regen UX details (confirmation, feedback, versioning)

</decisions>

<specifics>
## Specific Ideas

- "Light enrichment on first display + richer on click opening details" — the core UX pattern is progressive disclosure, not all-at-once
- "L'user voit le menu, légèrement enrichi, clique et ouvre une modal pour explorer la pédagogie, compréhension et aide au choix" (from Phase 10 context — the founding vision for this feature)
- 99% mobile users — every UX decision must prioritize mobile-first
- Regeneration as admin tool — not user-facing, no need for polish on the regen UX yet

</specifics>

<deferred>
## Deferred Ideas

- User-facing regeneration button — revisit when user accounts exist and quality feedback loop is established
- Progressive enrichment for beverages — future milestone (beverages skipped entirely for now)
- On-demand enrichment (tap to enrich individual dish) vs batch — if batch proves too costly, reconsider in a future phase
- Taste profile integration with enrichment data — requires user accounts (Phase 2+)

</deferred>

---

*Phase: 11-dish-enrichment*
*Context gathered: 2026-02-28*
