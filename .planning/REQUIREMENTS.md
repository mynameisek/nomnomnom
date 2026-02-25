# Requirements: NŌM

**Defined:** 2026-02-25
**Core Value:** Scanner un menu et comprendre chaque plat en moins de 10 secondes, sans compte, dans n'importe quelle langue.

## v1.1 Requirements

Requirements for MVP App. Each maps to roadmap phases.

### Scan

- [ ] **SCAN-01**: User can scan a QR code with phone camera to load a restaurant menu
- [ ] **SCAN-02**: User can paste a URL/link to load a restaurant menu
- [ ] **SCAN-03**: User can take a photo of a physical menu to extract dishes via OCR
- [ ] **SCAN-04**: User sees a loading state with progress feedback during menu parsing
- [ ] **SCAN-05**: Scanned menus are cached in Supabase — repeat scans of the same URL return instant results

### Fiches Plats

- [ ] **DISH-01**: User sees a dish card for each item with translated name, description, and price
- [ ] **DISH-02**: Dish cards show translation in 4 languages (FR/EN/TR/DE)
- [ ] **DISH-03**: Each dish card displays a trust badge (Verified Menu / Inferred)
- [ ] **DISH-04**: Each dish card shows detected allergens (EU 14 allergens) with warning badge
- [ ] **DISH-05**: Allergen display always includes a mandatory disclaimer ("demandez au serveur") in user's language
- [ ] **DISH-06**: Each dish card shows dietary tags (végétarien, végan, épicé)

### Filtres

- [ ] **FILT-01**: User can filter dishes by dietary preference (végétarien, végan)
- [ ] **FILT-02**: User can filter dishes by allergen exclusion (gluten, nuts, dairy, etc.)
- [ ] **FILT-03**: User can filter dishes by spice level
- [ ] **FILT-04**: Filters apply instantly (client-side, no API call)

### Admin

- [ ] **ADMN-01**: Admin can access a protected admin page (secret-based auth)
- [ ] **ADMN-02**: Admin can select the LLM model used for menu parsing (GPT-4o, GPT-4o-mini, etc.)
- [ ] **ADMN-03**: Admin can view basic scan statistics (total scans, cached vs fresh, avg parse time)

### Infrastructure

- [ ] **INFR-01**: Supabase schema with menus, menu_items, and admin_config tables
- [ ] **INFR-02**: OpenAI API integration via Vercel AI SDK (server-only, key never exposed to browser)
- [ ] **INFR-03**: URL hash-based caching — LLM called only on cache miss
- [ ] **INFR-04**: Image resize client-side (1024px max) before sending photo to API
- [ ] **INFR-05**: Navigation integration — CTA on landing page links to /scan

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
| SCAN-01 | — | Pending |
| SCAN-02 | — | Pending |
| SCAN-03 | — | Pending |
| SCAN-04 | — | Pending |
| SCAN-05 | — | Pending |
| DISH-01 | — | Pending |
| DISH-02 | — | Pending |
| DISH-03 | — | Pending |
| DISH-04 | — | Pending |
| DISH-05 | — | Pending |
| DISH-06 | — | Pending |
| FILT-01 | — | Pending |
| FILT-02 | — | Pending |
| FILT-03 | — | Pending |
| FILT-04 | — | Pending |
| ADMN-01 | — | Pending |
| ADMN-02 | — | Pending |
| ADMN-03 | — | Pending |
| INFR-01 | — | Pending |
| INFR-02 | — | Pending |
| INFR-03 | — | Pending |
| INFR-04 | — | Pending |
| INFR-05 | — | Pending |

**Coverage:**
- v1.1 requirements: 23 total
- Mapped to phases: 0
- Unmapped: 23 ⚠️

---
*Requirements defined: 2026-02-25*
*Last updated: 2026-02-25 after initial definition*
