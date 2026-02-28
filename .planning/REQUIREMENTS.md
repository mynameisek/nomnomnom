# Requirements: NŌM

**Defined:** 2026-02-28
**Core Value:** Scanner un menu et comprendre chaque plat en moins de 10 secondes, sans compte, dans n'importe quelle langue.

## v1.2 Requirements

Requirements for Dish Enrichment milestone. Each maps to roadmap phases.

### Base de connaissances

- [ ] **KNOW-01**: Chaque plat scanné reçoit un nom canonique normalisé (Mantı = Manti = Turkish Dumplings) stocké de manière persistante
- [ ] **KNOW-02**: Une seed table de plats connus ancre la normalisation pour les cuisines régionales (turque, alsacienne, japonaise, etc.)
- [ ] **KNOW-03**: L'enrichissement est batch et async (via `after()`) — le scan reste rapide, l'enrichissement arrive en arrière-plan
- [ ] **KNOW-04**: Les plats sont priorisés sur les boissons pour l'enrichissement (les boissons reçoivent un enrichissement minimal ou aucun)

### Enrichissement plat

- [ ] **ENRI-01**: Chaque plat enrichi affiche une explication culturelle (origine, ingrédients typiques, comment ça se mange)
- [ ] **ENRI-02**: L'enrichissement priorise les plats peu connus ou de cuisine étrangère — les plats évidents (steak frites) reçoivent un enrichissement minimal
- [ ] **ENRI-03**: Un plat peut être re-enrichi (régénération) quand le modèle ou les sources s'améliorent
- [ ] **ENRI-04**: Les DishCards affichent un indicateur visuel d'enrichissement en cours (progressive enhancement)
- [ ] **ENRI-05**: Chaque plat enrichi affiche une image (Unsplash → Pexels → gradient+emoji fallback, jamais d'IA-generated)

### Recherche inversée

- [ ] **SRCH-01**: L'utilisateur peut chercher un plat par mots-clés et trouver les menus scannés qui le proposent (FTS)
- [ ] **SRCH-02**: L'utilisateur peut chercher sémantiquement ("boulettes sauce yaourt" → Mantı) via pgvector embeddings multilingues
- [ ] **SRCH-03**: Les résultats de recherche linkent vers les menus/restaurants correspondants

### Assistant IA

- [ ] **TOP3-01**: L'utilisateur reçoit un Top 3 de recommandations basé sur le menu réel et ses envies/contraintes
- [ ] **TOP3-02**: Chaque recommandation affiche une justification (correspondance, diversité, clarté — Règle 3)
- [ ] **TOP3-03**: Le Top 3 est limité à 3x/jour gratuit (rate limiting client-side)
- [ ] **TOP3-04**: Le Top 3 est grounded (UUID validation) — jamais de plat halluciné

## v1.3 Requirements

Deferred to next milestone. Tracked but not in current roadmap.

### Langues

- **LANG-01**: ES/IT translation support added to dish cards

### Polish

- **PLSH-01**: Community trust badge (👥 Communauté) for user-validated dish data

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Compte utilisateur + historique | Pas nécessaire pour valider l'enrichissement |
| Stories de plats | Complexité upload + modération (Phase 2+) |
| Taste Profile | Nécessite assez de données scan (Phase 2+) |
| Crédits (earn & spend) | Nécessite un compte (Phase 2+) |
| Leaderboard local | Nécessite une base utilisateurs (Phase 2+) |
| AI-generated dish photos | Anti-feature — trust violation (Règle produit) |
| Enrichissement boissons en profondeur | Priorisation plats d'abord, boissons minimal |
| Offline mode | Complexité sync (Phase 3+) |
| Monétisation Pass/Pro | Après validation usage (Phase 3+) |
| API ouverte | Pas avant base de connaissances suffisante (Phase 4+) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| KNOW-01 | Phase 10 | Pending |
| KNOW-02 | Phase 10 | Pending |
| KNOW-03 | Phase 10 | Pending |
| KNOW-04 | Phase 10 | Pending |
| ENRI-01 | Phase 11 | Pending |
| ENRI-02 | Phase 11 | Pending |
| ENRI-03 | Phase 11 | Pending |
| ENRI-04 | Phase 11 | Pending |
| ENRI-05 | Phase 12 | Pending |
| SRCH-01 | Phase 14 | Pending |
| SRCH-02 | Phase 14 | Pending |
| SRCH-03 | Phase 14 | Pending |
| TOP3-01 | Phase 13 | Pending |
| TOP3-02 | Phase 13 | Pending |
| TOP3-03 | Phase 13 | Pending |
| TOP3-04 | Phase 13 | Pending |

**Coverage:**
- v1.2 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 — traceability complete, all 16 requirements mapped to Phases 10-14*
