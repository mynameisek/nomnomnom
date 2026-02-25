# Requirements: NŌM

**Defined:** 2026-02-25
**Core Value:** Scanner un menu et comprendre chaque plat en moins de 10 secondes, sans compte, dans n'importe quelle langue.

## v1.1 Requirements

Requirements for MVP App. Each maps to roadmap phases.

### Scan

- [x] **SCAN-01**: User can scan a QR code with phone camera to load a restaurant menu
- [x] **SCAN-02**: User can paste a URL/link to load a restaurant menu
- [x] **SCAN-03**: User can take a photo of a physical menu to extract dishes via OCR
- [x] **SCAN-04**: User sees a loading state with progress feedback during menu parsing
- [x] **SCAN-05**: Scanned menus are cached in Supabase — repeat scans of the same URL return instant results

### Fiches Plats

- [x] **DISH-01**: User sees a dish card for each item with translated name, description, and price
- [ ] **DISH-02**: Dish cards show translation in 4 languages (FR/EN/TR/DE)
- [x] **DISH-03**: Each dish card displays a trust badge (Verified Menu / Inferred)
- [x] **DISH-04**: Each dish card shows detected allergens (EU 14 allergens) with warning badge
- [x] **DISH-05**: Allergen display always includes a mandatory disclaimer ("demandez au serveur") in user's language
- [x] **DISH-06**: Each dish card shows dietary tags (végétarien, végan, épicé)

### Filtres

- [x] **FILT-01**: User can filter dishes by dietary preference (végétarien, végan)
- [x] **FILT-02**: User can filter dishes by allergen exclusion (gluten, nuts, dairy, etc.)
- [x] **FILT-03**: User can filter dishes by spice level
- [x] **FILT-04**: Filters apply instantly (client-side, no API call)

### Admin

- [x] **ADMN-01**: Admin can access a protected admin page (secret-based auth)
- [x] **ADMN-02**: Admin can select the LLM model used for menu parsing (GPT-4o, GPT-4o-mini, etc.)
- [x] **ADMN-03**: Admin can view basic scan statistics (total scans, cached vs fresh, avg parse time)

### Infrastructure

- [x] **INFR-01**: Supabase schema with menus, menu_items, and admin_config tables
- [x] **INFR-02**: OpenAI API integration via Vercel AI SDK (server-only, key never exposed to browser)
- [x] **INFR-03**: URL hash-based caching — LLM called only on cache miss
- [x] **INFR-04**: Image resize client-side (1024px max) before sending photo to API
- [x] **INFR-05**: Navigation integration — CTA on landing page links to /scan

## v1.2 Requirements

Deferred to next milestone. Tracked but not in current roadmap.

### AI Recommendation

- **RECO-01**: User receives AI Top 3 dish recommendations based on preferences
- **RECO-02**: Top 3 limited to 3x/day free (paywall after)
- **RECO-03**: User can describe what they want and get matching dishes (reverse search)

### Extended Languages

- **LANG-01**: ES/IT translation support added to dish cards

### Polish

- **PLSH-01**: Real dish photos from Yelp Fusion or Google Places
- **PLSH-02**: Budget flag on dish cards (price vs menu average)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Compte utilisateur + historique | Pas nécessaire pour valider le scan |
| Stories de plats | Complexité upload + modération (Phase 2+) |
| Taste Profile | Nécessite assez de données scan (Phase 2+) |
| Crédits (earn & spend) | Nécessite un compte (Phase 2+) |
| Leaderboard local | Nécessite une base utilisateurs (Phase 2+) |
| Push notifications | Pas de PWA standalone pour v1.1 |
| ES/IT translation | Ajouter après validation FR/EN/TR/DE |
| Nutrition estimates | Liability framework pas établi |
| Guaranteed allergen accuracy | Légalement impossible — toujours "demandez au serveur" |
| AI-generated dish photos as real | Anti-feature — trust violation |
| Social feed of recent scans | Phase 2+ |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCAN-01 | Phase 5 | Complete |
| SCAN-02 | Phase 5 | Complete |
| SCAN-03 | Phase 5 | Complete |
| SCAN-04 | Phase 5 | Complete |
| SCAN-05 | Phase 5 | Complete |
| DISH-01 | Phase 6 | Complete |
| DISH-02 | Phase 8 | Pending |
| DISH-03 | Phase 6 | Complete |
| DISH-04 | Phase 6 | Complete |
| DISH-05 | Phase 6 | Complete |
| DISH-06 | Phase 6 | Complete |
| FILT-01 | Phase 6 | Complete |
| FILT-02 | Phase 6 | Complete |
| FILT-03 | Phase 6 | Complete |
| FILT-04 | Phase 6 | Complete |
| ADMN-01 | Phase 7 | Complete |
| ADMN-02 | Phase 7 | Complete |
| ADMN-03 | Phase 7 | Complete |
| INFR-01 | Phase 4 | Complete |
| INFR-02 | Phase 4 | Complete |
| INFR-03 | Phase 4 | Complete |
| INFR-04 | Phase 5 | Complete |
| INFR-05 | Phase 7 | Complete |

**Coverage:**
- v1.1 requirements: 23 total
- Complete: 22
- Pending: 1 (DISH-02 → Phase 8)
- Mapped to phases: 23
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-25*
*Last updated: 2026-02-25 — traceability filled after roadmap creation*
