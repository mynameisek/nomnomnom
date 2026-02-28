# Roadmap: NŌM

## Milestones

- ✅ **v1.0 Landing Page** — Phases 1-3 (shipped 2026-02-25)
- ✅ **v1.1 MVP App** — Phases 4-9 (shipped 2026-02-28)
- 🚧 **v1.2 Dish Enrichment** — Phases 10-14 (in progress)

## Phases

<details>
<summary>✅ v1.0 Landing Page (Phases 1-3) — SHIPPED 2026-02-25</summary>

- [x] Phase 1: Foundation (1/1 plans) — completed 2026-02-25
- [x] Phase 2: Content Sections (2/2 plans) — completed 2026-02-25
- [x] Phase 3: Waitlist + Ship (2/2 plans) — completed 2026-02-25

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 MVP App (Phases 4-9) — SHIPPED 2026-02-28</summary>

- [x] Phase 4: Infrastructure Foundation (2/2 plans) — completed 2026-02-25
- [x] Phase 5: Scan Pipeline (2/2 plans) — completed 2026-02-25
- [x] Phase 6: Dish Cards and Filters (2/2 plans) — completed 2026-02-25
- [x] Phase 7: Navigation and Admin (2/2 plans) — completed 2026-02-25
- [x] Phase 8: Eazee-link Translation Fix (1/1 plans) — completed 2026-02-26
- [x] Phase 9: Tech Debt Cleanup (1/1 plans) — completed 2026-02-28

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

### 🚧 v1.2 Dish Enrichment (In Progress)

**Milestone Goal:** Construire la couche intelligence de NŌM — chaque scan alimente une base de connaissances culinaire persistante. Les plats sont enrichis, normalisés (nom canonique), et queryables (recherche inversée + Top 3).

- [x] **Phase 10: DB Foundation + Canonical Names** - Schema migration, pgvector, canonical name generation wired at parse time (completed 2026-02-28)
- [ ] **Phase 11: Dish Enrichment** - Cultural context, async batch enrichment, regeneration, progress indicator on DishCards
- [ ] **Phase 12: Dish Images** - Unsplash → Pexels → gradient+emoji fallback chain per dish
- [ ] **Phase 13: AI Top 3** - UUID-grounded recommendations with rationale and rate limiting
- [ ] **Phase 14: Reverse Search** - FTS + semantic pgvector search across all scanned menus

## Phase Details

### Phase 10: DB Foundation + Canonical Names
**Goal**: Every scanned dish receives a normalized canonical name stored persistently, backed by the full schema needed for all v1.2 intelligence features
**Depends on**: Phase 9 (v1.1 shipped)
**Requirements**: KNOW-01, KNOW-02, KNOW-03, KNOW-04
**Success Criteria** (what must be TRUE):
  1. Scanning a Turkish menu produces `canonical_name` values (e.g., "Mantı") stored in `menu_items` — visible in Supabase dashboard
  2. Re-scanning the same URL returns the cached canonical name without a new LLM call
  3. Beverages receive no enrichment flag; food items are queued as pending enrichment
  4. Scan response time does not increase by more than 3 seconds after canonical name generation is wired in
**Plans**: 2 plans

Plans:
- [ ] 10-01-PLAN.md — SQL migration + TypeScript types (pgvector, unaccent, new columns, known_dishes table, HNSW indexes, match_dishes RPC)
- [ ] 10-02-PLAN.md — Canonical name generation + seed table + cache recycling + async wiring via after()

### Phase 11: Dish Enrichment
**Goal**: Each dish card shows a cultural explanation, origin, and typical ingredients — delivered asynchronously after scan, with a progress indicator and the ability to regenerate
**Depends on**: Phase 10
**Requirements**: ENRI-01, ENRI-02, ENRI-03, ENRI-04
**Success Criteria** (what must be TRUE):
  1. Scanning a menu and waiting 5-10 seconds causes DishCards to update with cultural explanation, origin, and typical ingredients without a page reload
  2. A DishCard for "steak frites" shows minimal enrichment; a DishCard for "Mantı" shows full cultural context
  3. Tapping "Régénérer" on an enriched dish fetches fresh LLM data and replaces the stored enrichment
  4. While enrichment is pending, each DishCard shows a visual in-progress indicator
**Plans**: TBD

Plans:
- [ ] 11-01: lib/enrichment.ts + enrichDish() batch LLM call + after() integration in scan routes
- [ ] 11-02: Status polling endpoint + DishCard progressive enhancement + regeneration action

### Phase 12: Dish Images
**Goal**: Each enriched dish card displays a relevant licensed photo, falling back gracefully to gradient+emoji when no image is found
**Depends on**: Phase 11
**Requirements**: ENRI-05
**Success Criteria** (what must be TRUE):
  1. A DishCard for "Mantı" displays a photo from Unsplash or Pexels with an attribution caption
  2. A DishCard for an obscure dish with no Unsplash/Pexels result displays a gradient+emoji fallback — no broken image
  3. Image source and credit are stored in the database alongside the dish record
**Plans**: TBD

Plans:
- [ ] 12-01: lib/images.ts + Unsplash → Pexels → gradient fallback + DishCard image display with attribution

### Phase 13: AI Top 3
**Goal**: A user on any scanned menu can ask for Top 3 dish recommendations grounded to the actual items present, with a rationale for each pick, limited to 3 requests per day without an account
**Depends on**: Phase 11
**Requirements**: TOP3-01, TOP3-02, TOP3-03, TOP3-04
**Success Criteria** (what must be TRUE):
  1. Tapping Top 3 on a scanned menu returns three dish recommendations, each corresponding to a real dish UUID on that menu
  2. Each recommendation displays a rationale (why this dish matches the user's preference, diversity note, clarity score)
  3. After 3 Top 3 requests in a day, the button is disabled with a clear message until the next day
  4. The API rejects any Top 3 response containing a UUID not present in the actual menu items
**Plans**: TBD

Plans:
- [ ] 13-01: getTop3() + /api/top3 route with UUID grounding and Zod validation + localStorage rate gate
- [ ] 13-02: Top3Panel.tsx + rationale display + DishCard UUID highlighting

### Phase 14: Reverse Search
**Goal**: A user can search for a dish by name or intent and find all scanned menus that serve it — using both keyword and semantic matching
**Depends on**: Phase 11 (requires enriched canonical records in the database)
**Requirements**: SRCH-01, SRCH-02, SRCH-03
**Success Criteria** (what must be TRUE):
  1. Searching "mantı" returns menus containing Turkish dumplings with links to the corresponding restaurant menu pages
  2. Searching "boulettes sauce yaourt" (semantic intent) returns Mantı results even though the words don't match exactly
  3. A search result row shows the dish name, restaurant name, and a working link to the scanned menu
**Plans**: TBD

Plans:
- [ ] 14-01: /api/search route (FTS + pgvector match_dishes RPC) + ReverseSearchShell.tsx component + search results page

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 1/1 | Complete | 2026-02-25 |
| 2. Content Sections | v1.0 | 2/2 | Complete | 2026-02-25 |
| 3. Waitlist + Ship | v1.0 | 2/2 | Complete | 2026-02-25 |
| 4. Infrastructure Foundation | v1.1 | 2/2 | Complete | 2026-02-25 |
| 5. Scan Pipeline | v1.1 | 2/2 | Complete | 2026-02-25 |
| 6. Dish Cards and Filters | v1.1 | 2/2 | Complete | 2026-02-25 |
| 7. Navigation and Admin | v1.1 | 2/2 | Complete | 2026-02-25 |
| 8. Eazee-link Translation Fix | v1.1 | 1/1 | Complete | 2026-02-26 |
| 9. Tech Debt Cleanup | v1.1 | 1/1 | Complete | 2026-02-28 |
| 10. DB Foundation + Canonical Names | v1.2 | Complete    | 2026-02-28 | - |
| 11. Dish Enrichment | v1.2 | 0/2 | Not started | - |
| 12. Dish Images | v1.2 | 0/1 | Not started | - |
| 13. AI Top 3 | v1.2 | 0/2 | Not started | - |
| 14. Reverse Search | v1.2 | 0/1 | Not started | - |
