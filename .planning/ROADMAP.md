# Roadmap: NŌM

## Milestones

- ✅ **v1.0 Landing Page** — Phases 1-3 (shipped 2026-02-25)
- 🚧 **v1.1 MVP App** — Phases 4-7 (in progress)

## Phases

<details>
<summary>✅ v1.0 Landing Page (Phases 1-3) — SHIPPED 2026-02-25</summary>

- [x] Phase 1: Foundation (1/1 plans) — completed 2026-02-25
- [x] Phase 2: Content Sections (2/2 plans) — completed 2026-02-25
- [x] Phase 3: Waitlist + Ship (2/2 plans) — completed 2026-02-25

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 MVP App (In Progress)

**Milestone Goal:** Transform NŌM from a landing page into a working app — scan any restaurant menu (QR/URL/photo), see translated dish cards with allergen info, filter by dietary preference, and configure the LLM model via admin.

- [ ] **Phase 4: Infrastructure Foundation** - Database schema, TypeScript types, and OpenAI/cache wiring
- [ ] **Phase 5: Scan Pipeline** - All three scan methods (QR/URL/photo) through the LLM pipeline to a menu ID
- [x] **Phase 6: Dish Cards and Filters** - Full menu display surface with translations, trust badges, allergens, and client-side filters (completed 2026-02-25)
- [ ] **Phase 7: Navigation and Admin** - Landing CTA wired to /scan, protected admin config panel

## Phase Details

### Phase 4: Infrastructure Foundation
**Goal**: The data layer and server-only LLM tooling exist and are verified — every downstream phase builds on a stable base
**Depends on**: Phase 3 (existing Next.js + Supabase codebase)
**Requirements**: INFR-01, INFR-02, INFR-03
**Success Criteria** (what must be TRUE):
  1. Supabase `menus`, `menu_items`, and `admin_config` tables exist with correct columns, indexes on `url_hash`, and RLS policies applied
  2. A curl call to `lib/openai.ts` wrapper functions returns Zod-validated structured JSON matching the TypeScript types (no raw LLM string output)
  3. A repeated URL parse returns the cached result from Supabase without triggering an OpenAI API call (confirmed via Supabase logs)
**Plans**: 2 plans
- [ ] 04-01-PLAN.md — Schema, TypeScript types, Zod validation, service role client
- [ ] 04-02-PLAN.md — OpenAI wrapper (AI SDK 6), URL hash cache layer

### Phase 5: Scan Pipeline
**Goal**: Users can scan a restaurant menu via QR code, URL paste, or photo — and land on a valid `/menu/[id]` page with parsed dish data
**Depends on**: Phase 4
**Requirements**: SCAN-01, SCAN-02, SCAN-03, SCAN-04, SCAN-05, INFR-04
**Success Criteria** (what must be TRUE):
  1. User points phone camera at a QR code and is redirected to `/menu/[id]` with dishes loaded
  2. User pastes `https://menu.eazee-link.com/?id=E7FNRP0ET3&o=q` and sees dishes (JavaScript SPA — screenshot API path used, not Cheerio)
  3. User takes a photo of a physical menu and dishes are extracted (GPT-4o Vision, no Tesseract.js)
  4. A loading indicator with progress feedback is visible during parsing — user is never looking at a blank page
  5. Scanning the same URL a second time returns instantly from cache (no spinner, no LLM call)
**Plans**: 2 plans
- [ ] 05-01-PLAN.md — Backend: Screenshotone wrapper, URL + photo API Route Handlers, cache adaptation
- [ ] 05-02-PLAN.md — Frontend: /scan page (QR/URL/Photo tabs), progress indicator, /menu/[id] stub page

### Phase 6: Dish Cards and Filters
**Goal**: Every dish is presented as a clear, translated card with trust signal and allergen info — and users can filter the full list instantly
**Depends on**: Phase 5
**Requirements**: DISH-01, DISH-02, DISH-03, DISH-04, DISH-05, DISH-06, FILT-01, FILT-02, FILT-03, FILT-04
**Success Criteria** (what must be TRUE):
  1. Each dish card shows translated name, description, and price in the user's language (FR/EN/TR/DE switchable)
  2. Each card displays a trust badge — "Verified Menu" for items sourced directly from menu text, "Inferred" for LLM-inferred details
  3. Each card shows EU allergen tags with a mandatory "demandez au serveur" disclaimer in the user's language — never a "safe" green indicator
  4. Tapping "végétarien" filter immediately hides non-vegetarian dishes with no API call and no perceptible delay
  5. Tapping "sans gluten" filter immediately hides dishes containing gluten — filter combinations stack correctly
**Plans**: 2 plans
- [ ] 06-01-PLAN.md — i18n system, spicy schema fix, useFilteredDishes hook
- [ ] 06-02-PLAN.md — DishCard, FilterBar, AllergenBanner, LangSwitcher, MenuShell, page refactor

### Phase 7: Navigation and Admin
**Goal**: Users can reach the app from the landing page, and the admin can control which LLM model is used and view scan statistics
**Depends on**: Phase 6
**Requirements**: ADMN-01, ADMN-02, ADMN-03, INFR-05
**Success Criteria** (what must be TRUE):
  1. Clicking the CTA on the landing page hero navigates to `/scan` without a full page reload
  2. Visiting `/admin` without the correct secret returns a 403 or redirect — the page is not accessible publicly
  3. Admin can switch the active LLM model (GPT-4o / GPT-4o-mini / GPT-4.1-mini) and the next scan uses the newly selected model
  4. Admin dashboard shows total scans, cached vs fresh ratio, and average parse time pulled from live Supabase data
**Plans**: TBD

## Progress

**Execution Order:** 4 → 5 → 6 → 7

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 1/1 | Complete | 2026-02-25 |
| 2. Content Sections | v1.0 | 2/2 | Complete | 2026-02-25 |
| 3. Waitlist + Ship | v1.0 | 2/2 | Complete | 2026-02-25 |
| 4. Infrastructure Foundation | v1.1 | 0/2 | Not started | - |
| 5. Scan Pipeline | v1.1 | 0/TBD | Not started | - |
| 6. Dish Cards and Filters | v1.1 | Complete    | 2026-02-25 | - |
| 7. Navigation and Admin | v1.1 | 0/TBD | Not started | - |
