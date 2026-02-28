# Phase 10: DB Foundation + Canonical Names - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Schema migration (pgvector, unaccent, new columns) and canonical name generation wired at parse time. Every scanned dish gets a normalized canonical name stored persistently. This is pure infrastructure — the canonical name is invisible to users; it powers deduplication, search, and the enrichment system downstream (Phase 11+).

</domain>

<decisions>
## Implementation Decisions

### Canonical name display
- Canonical name is **invisible infrastructure** — not a user-facing label
- The user sees a clearer dish name + ability to tap and explore (Phase 11 UX)
- Always Latin script for canonical names — no native script variants
- Universal canonical + localized description (e.g., "Mantı — Raviolis turcs") when displayed in Phase 11+
- Claude's discretion: whether to show canonical name as subtitle, and whether to hide when identical to original

### Seed table scope
- **Strasbourg foreign cuisine focus**: Turkish, North African, Chinese, Japanese, Italian, Alsatian — the most common foreign restaurants in Strasbourg
- 100-200 seed entries prioritizing dishes that are hardest to interpret for non-native diners
- Also include French gastronomy dishes that are hard to interpret (not just foreign)
- Claude's discretion: SQL migration vs CSV/JSON format, and whether to include alias variants per entry

### Canonical name confidence tiers
- **High confidence** → auto-add to DB + display on DishCard
- **Medium confidence** → add to DB but don't display (or display with indicator)
- **Low confidence** → validation queue for manual review or purge via script
- Schema must store a confidence score alongside canonical names

### Beverage vs food logic
- Beverages get canonical name + "beverage" flag — deprioritized for enrichment, never skipped entirely
- Classification leverages existing menu section context (menus already group by Plats/Boissons/Desserts)
- All beverages treated equally for now — no special cases for exotic drinks (Ayran, Sake, etc.)
- Schema should allow future differentiation (exotic vs standard beverages)
- Desserts: Claude's discretion on whether to treat as food or separate category
- Claude's discretion: exact classification approach (LLM field vs heuristic vs section-based)

### Re-scan behavior
- **Global shared cache** — all users benefit from any previous scan of the same URL
- Re-fetch HTML on re-scan (cheap), compare with cached content
- **Content-aware diff** — only re-parse if actual dish items changed (ignore CSS, layout, price-only changes)
- **Incremental updates** — only process changed/new items, keep existing canonical names for unchanged items
- Never re-process an entire 200-item menu for a minor change — cost-conscious and ecological by design
- Claude's discretion: exact diff algorithm and change detection strategy

### Claude's Discretion
- Canonical name display approach (subtitle vs hidden when identical)
- Seed table format (SQL vs CSV/JSON)
- Alias handling in seed table
- Dessert classification
- Beverage classification method
- HTML diff algorithm for re-scan change detection
- Exact confidence thresholds for the three tiers

</decisions>

<specifics>
## Specific Ideas

- "L'user voit le menu, légèrement enrichi, clique et ouvre une modal pour explorer la pédagogie, compréhension et aide au choix" — progressive disclosure UX (Phase 11 territory, but informs Phase 10 schema design)
- Strasbourg launch but broader vision — foreign cuisine focus because French gastronomy is also hard to interpret
- Enriching 200-item menus is too heavy — either user-initiated enrichment or pre-enrichment strategy for a large DB (Phase 11 concern but shapes the async architecture in Phase 10)
- Cost-consciousness is a core principle: "irrationnel et anti-écologique by design" to re-process everything for minor changes

</specifics>

<deferred>
## Deferred Ideas

- Exotic beverage special treatment (Ayran, Lassi, Sake → treat like food) — revisit when beverage enrichment becomes relevant
- On-demand vs pre-loaded enrichment strategy for dish tap → modal — Phase 11 decision
- User-initiated enrichment (tap to enrich) as alternative to batch-enriching entire menus — Phase 11 UX decision
- Progressive enrichment for beverages — future milestone

</deferred>

---

*Phase: 10-db-foundation-canonical-names*
*Context gathered: 2026-02-28*
