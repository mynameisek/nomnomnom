# Phase 8: Eazee-link Translation Fix - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the translation pipeline so eazee-link menus get LLM-translated dish names and descriptions in all 4 languages (FR/EN/TR/DE) instead of identical original text. Currently, `fetchEazeeLinkMenu` sets all 4 translation slots to the same original text, and `preParseResult` causes `getOrParseMenu` to skip LLM translation entirely.

</domain>

<decisions>
## Implementation Decisions

### Translation trigger point
- Claude's Discretion: Where to inject the translation step (inside eazee-link provider vs getOrParseMenu vs separate function) — Claude picks the cleanest, lowest-cost approach based on codebase patterns
- Claude's Discretion: Batching strategy (single batch call vs per-dish) — Claude picks based on typical eazee-link menu sizes and token cost
- Claude's Discretion: Failure fallback behavior — Claude picks the approach that balances UX and cost (show untranslated as fallback is acceptable)
- Claude's Discretion: LLM model selection for translation — Claude picks based on cost vs quality tradeoff (translation is simpler than parsing, cheapest model may suffice)

### Translation scope
- **LOCKED: Translate both dish names AND descriptions** — full translation, not names-only
- **LOCKED: Include brief cultural context/explanation** — matches PROJECT.md vision ("explications culturelles par plat"). e.g., "Flammekueche — Alsatian thin-crust pizza"
- **LOCKED: Auto-detect source language** — don't hardcode French. LLM infers from dish text. Works for any eazee-link menu worldwide
- Claude's Discretion: Whether to reuse the existing full parsing prompt or create a lighter translation-only prompt — Claude picks based on cost (eazee-link already provides allergens/tags, so a dedicated translation prompt may be cheaper)

### Cache strategy
- Claude's Discretion: Storage location (same menu_items table vs separate) — Claude picks what fits existing architecture
- Claude's Discretion: Handling old untranslated cache entries — Claude picks between lazy re-translation on next scan vs new-only. Cost optimization is priority
- Claude's Discretion: UX timing (wait for translation vs show-then-update) — Claude picks based on existing loading/progress patterns

### Overall constraint
- **LOCKED: Cost optimization is a priority** — minimize token usage and API calls. Avoid over-spending. Prefer cheaper models, batched calls, and caching over multiple expensive LLM calls

### Claude's Discretion
Claude has full flexibility on all technical implementation decisions:
- Architecture (where translation lives in the pipeline)
- Batching and prompt design
- Cache invalidation strategy
- Error handling and fallback behavior
- Model selection for translation
- UX timing for translation loading

The only locked decisions are: translate names + descriptions, include cultural context, auto-detect source language, and optimize for cost.

</decisions>

<specifics>
## Specific Ideas

- The existing LLM parsing prompt already produces translations with cultural notes for non-eazee-link menus — the same quality bar should apply
- Eazee-link already extracts allergens, dietary tags, prices, and trust badges — only translation is missing, so a lighter prompt that skips re-extracting those fields would save tokens
- Test reference menu: `https://menu.eazee-link.com/?id=E7FNRP0ET3&o=q`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-eazee-link-translation-fix*
*Context gathered: 2026-02-26*
