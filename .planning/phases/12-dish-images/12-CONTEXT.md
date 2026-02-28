# Phase 12: Dish Images - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Each enriched dish card displays a relevant licensed photo from Unsplash or Pexels, falling back gracefully to a gradient+emoji placeholder when no image is found. Image source and credit are stored in the database. This phase does NOT add new card interactions, recommendations, or search — only image display and attribution.

</domain>

<decisions>
## Implementation Decisions

### Progressive detail levels
- 3 levels of dish card detail: basic (text), detail (image + enrichment), advanced (full deep-dive in sheet)
- Claude's discretion on exactly how the image integrates across these levels (thumbnail at basic vs image only at detail)

### Image display on DishCard
- Aspect ratio: user leans square (1:1) — Claude picks best practice, square is the default direction
- Loading transition: blur-up effect (blurry placeholder sharpens into real image, à la Medium/Unsplash)
- Tapping the image opens the DishDetailSheet (same as tapping the card — no separate full-screen image viewer)

### Attribution & credits
- Photo credit shown in DishDetailSheet only — cards stay clean, no overlay or inline credit
- Credit format and link structure: Claude's discretion, must satisfy Unsplash/Pexels API terms
- Source badge (Unsplash vs Pexels): Claude's discretion based on API requirements
- No-image fallback in detail sheet: Claude's discretion — follow best UX practice (silent fallback vs subtle note)

### Fallback design
- Gradient color palette: cuisine-based — warm tones for Turkish, greens for Vietnamese, etc.
- Emoji selection: Claude's discretion based on available enrichment data (category, cuisine type)
- Fallback visual style: Claude's discretion — should feel intentional, not "broken"
- Beverages: Claude's discretion on whether to fetch images or always use fallback

### Search query strategy
- Search terms: Claude's discretion on how to query Unsplash/Pexels (canonical name, cuisine context, enrichment keywords)
- Fetch timing: cost-conscious approach — user wants to avoid over-fetching images users never see, but acknowledges all dishes eventually need images. Claude decides the timing strategy (lazy vs eager vs hybrid)
- Image caching: shared image per canonical name when dishes are identical (e.g., two "Mantı" = same photo), but when dish has specific qualifiers (e.g., "Shoyu Ramen" vs "Miso Ramen"), use distinct images reflecting the variation
- Result selection: Claude's discretion on how many results to evaluate before picking one

### Claude's Discretion
- Exact progressive disclosure pattern for images across the 3 detail levels
- Image aspect ratio (leaning square/1:1)
- Attribution format and source badge per API terms
- Fallback emoji strategy and visual distinctness
- Search query construction
- Fetch timing strategy (lazy vs eager — cost-conscious)
- Result selection heuristic
- Beverage image treatment

</decisions>

<specifics>
## Specific Ideas

- User wants cuisine-based gradient colors for fallback — not generic or brand-colored
- Blur-up loading transition specifically requested (like Medium/Unsplash)
- Cost sensitivity: don't over-spend API calls on images users may never see, but plan for eventual full coverage
- Dish variations should be visually distinct: "Shoyu Ramen" and "Miso Ramen" should show different photos, but two generic "Mantı" can share one
- 3 levels of detail is a cross-cutting UX pattern the user wants: basic, detail (image + enrichment), advanced

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-dish-images*
*Context gathered: 2026-02-28*
