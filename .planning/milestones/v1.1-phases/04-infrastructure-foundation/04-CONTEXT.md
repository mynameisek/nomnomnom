# Phase 4: Infrastructure Foundation - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Database schema (menus, menu_items, admin_config), TypeScript types, OpenAI wrapper with Zod validation, and Supabase cache layer. Every downstream phase (Scan Pipeline, Dish Cards, Admin) builds on this base. No UI in this phase.

</domain>

<decisions>
## Implementation Decisions

### Schema design
- EU 14 mandatory allergens as the standard set: gluten, dairy, nuts, peanuts, soy, eggs, fish, shellfish, celery, mustard, sesame, sulphites, lupin, molluscs
- Allergens stored per dish as an array of enum values (not free text) — enables reliable client-side filtering in Phase 6
- All 4 translations (FR/EN/TR/DE) returned in a single LLM call and stored together — no on-demand translation
- Translations stored as JSONB columns on `menu_items` (e.g., `name_translations`, `description_translations`) — avoids separate translation table overhead

### LLM response shape
- Single structured call returns: dish name (original), translations (4 langs), description + translations, price (if found), allergens (EU 14 enum array), dietary tags (vegetarian/vegan/halal), trust signal
- Zod schema validates LLM output — no raw string output reaches the app
- Response shape designed so Phase 5 (Scan Pipeline) can store directly and Phase 6 (Dish Cards) can render directly

### Cache behavior
- Cache key: `url_hash` on `menus` table (index exists per roadmap success criteria)
- Guiding principle: admin-configurable where legitimate — TTL and cache purge should be controllable from admin panel
- Second scan of same URL returns from Supabase, no LLM call (roadmap SC #3)

### Admin config
- Guiding principle from user: **best defaults, configurable via admin when possible and legit**
- Model selection (GPT-4o / GPT-4o-mini / GPT-4.1-mini) — admin configurable (confirmed in roadmap)
- Cache TTL — admin configurable
- Other admin-configurable settings: Claude decides what's worth exposing based on implementation

### Claude's Discretion
- Trust signal format (binary verified/inferred vs confidence score) — pick what Phase 6 Dish Cards can display most clearly
- Cache TTL default value and expiry strategy
- Exact JSONB structure for translations and allergens
- RLS policy design
- Index strategy beyond `url_hash`
- TypeScript type organization (single file vs per-domain)
- OpenAI wrapper error handling and retry strategy

</decisions>

<specifics>
## Specific Ideas

- "Make it possibly changeable in admin when possible and legit" — user wants sensible defaults with admin override where it makes sense, not everything exposed
- `@supabase/supabase-js` (not `@supabase/ssr`) for server-side cache queries — preserves Next.js fetch cache (decision from v1.0)
- GPT-4o-mini Vision for photo OCR path (decision from v1.0, relevant for Phase 5 but schema must support it)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-infrastructure-foundation*
*Context gathered: 2026-02-25*
