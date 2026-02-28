# Phase 6: Dish Cards and Filters - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Present parsed dish data as translated cards with trust signals and allergen info. Users can filter the full list by dietary preference instantly (client-side). Creating/editing dishes, search, bookmarking, and rating are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Allergen disclaimer
- Single discreet banner at the top of the menu page — not repeated per card
- Light tone, not alarming — e.g. "Les informations sur les allergenes sont indicatives — confirmez aupres du serveur" (localized per display language)
- Never use green/"safe" indicators anywhere in allergen presentation

### Language switching
- Auto-detect from browser language on first visit to /menu/[id]
- Small globe icon in the header for manual override (FR/EN/TR/DE)
- Language choice persisted (localStorage) across sessions
- Translations are page-wide, not per-card toggle

### Claude's Discretion
- **Card layout:** Translated name prominent, original name secondary (for ordering at restaurant). Claude decides exact hierarchy, spacing, typography
- **Visual density:** Claude picks the best mobile-first approach — likely full cards with all info visible (name, description, price, allergens, trust badge) since tap-to-expand adds friction on a menu people scan quickly
- **Allergen tag colors:** Neutral or warm-toned chips — no green, no color that implies "safe". Claude picks the palette
- **Trust badge design:** "Verified Menu" vs "Inferred" presentation — Claude decides badge style, placement, and visual weight
- **Filter placement:** Claude decides — likely sticky horizontal chips bar below header (most mobile-friendly pattern for dietary toggles)
- **Empty filter state:** Claude decides what to show when no dishes match active filters
- **Price display:** Claude decides formatting and currency handling

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User wants to move fast and iterate later.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-dish-cards-and-filters*
*Context gathered: 2026-02-25*
