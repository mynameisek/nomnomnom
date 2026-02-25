# NŌM

## What This Is

NŌM est une application mobile qui transforme n'importe quel menu de restaurant en fiches claires, traduites et illustrées. Le cœur du produit est un outil utilitaire : scanner un QR code, un lien web, un PDF ou une photo de menu, et obtenir instantanément des fiches par plat avec traduction, explication culturelle, filtres alimentaires et un assistant IA qui recommande un Top 3 selon les envies de l'utilisateur. Le social est un mode opt-in, pas un mur.

## Core Value

Scanner un menu et comprendre chaque plat en moins de 10 secondes, sans compte, dans n'importe quelle langue.

## Requirements

### Validated

(None yet — ship to validate)

### Active

#### Milestone 1 — Landing Page

- [ ] Landing page NŌM avec le design validé (dark theme, orange #FF6B35, animations)
- [ ] Phone demo animée (scan → fiches → assistant Top 3)
- [ ] Sections : hero, carousel plats, features, recherche inversée, social/gamification, pricing, FAQ, waitlist
- [ ] Formulaire waitlist email fonctionnel avec stockage backend
- [ ] Déploiement sur Vercel (domaine par défaut)
- [ ] FR seulement, optimisé mobile-first
- [ ] SEO basique (meta tags, OG images)

#### Milestone 2+ — MVP App (Phase 1 du doc v1.2)

- [ ] Scan QR + URL → parse menu → fiches plats
- [ ] Traduction FR/EN/TR/DE + explications culturelles
- [ ] Filtres : végé, épicé, budget, allergènes (probables)
- [ ] Assistant Top 3 (3x/jour gratuit)
- [ ] Recherche inversée basique
- [ ] Scan OCR photo (fallback caméra)
- [ ] Badges de confiance (✅ Menu / ⚠ Inféré)
- [ ] Phrases allergènes multilingues
- [ ] Pas de compte requis pour le scan

### Out of Scope

- Compte utilisateur + historique + favoris — Phase 2 (pas nécessaire pour valider le scan)
- Stories de plats — Phase 2 (complexité upload + modération)
- Taste Profile — Phase 2 (nécessite assez de données scan)
- Crédits (earn & spend) — Phase 2 (nécessite un compte)
- Leaderboard local — Phase 2 (nécessite une base utilisateurs)
- Match Score — Phase 3 (nécessite données croisées)
- Pairwise plats — Phase 3 (flow complexe)
- NŌM Wrapped — Phase 3 (nécessite 6+ mois de données)
- Pass/Pro monétisation — Phase 3 (après validation usage)
- Dashboard restaurant B2B — Phase 3 (après 10+ restos actifs)
- Mode voyage offline — Phase 3 (complexité sync)
- Token on-chain — Phase 4 (uniquement si communauté mature)
- API ouverte — Phase 4 (pas avant produit stable)
- Placeholders "pour plus tard" dans le code — Règle MVP scope lock

## Context

**Terrain de test :** Strasbourg — ville frontalière, forte diversité culinaire (turc, allemand, français, italien), population expat/étudiante.

**Concurrence analysée :**
- **Beli** — Leader social food US (75M+ ratings, $12M levés). Restaurant-centric, pas dish-centric. Onboarding forcé (4 invites). Pas de scan/traduction.
- **Zesty (DoorDash)** — IA conversationnelle pour restaurants. Beta SF/NYC. Centré restaurant.
- **Savor** — Journal dish-centric privé iOS. Pas de découverte ni communauté.
- Aucun concurrent ne combine scan + traduction + assistant IA plat + social opt-in.

**Positionnement NŌM :** L'intersection utilitaire (scan) × intelligence (assistant IA) × social (opt-in).

**Design validé :** Landing page v5 (JSX existant) — dark theme #09090B, orange #FF6B35 → rouge #E8453C, vert accent #42D392, typo Outfit/Plus Jakarta Sans. Phone mockup animé avec scan → fiches → Top 3.

**10 Règles produit (doc v1.2) :**
1. Définition d'un "plat" : nom menu → nom canonique → variantes
2. Trois badges de confiance : ✅ Menu / ⚠ Inféré / 👥 Communauté
3. Critères du Top 3 : correspondance, diversité, clarté
4. Story = extension du scan (pas un post social libre)
5. Stratégie images : gradient+emoji → web → communauté
6. Langues J1 : FR/EN (interface) + TR/DE/ES/IT (traduction)
7. Paywall sur opérations coûteuses, pas sur le wow moment
8. Scan = home (jamais le Feed)
9. Crédits = monnaie de contribution (pas de spam)
10. Allergènes : jamais "garanti", toujours phrase serveur

**Branding :** NŌM (NomNomNom en version longue). Universel, mémorable, viral. Tagline : "Chaque plat a une histoire."

**8 User journeys documentés :** touriste perdu, allergique, date night, expatrié nostalgique, vegan voyage d'affaires, foodie social, parent pressé, restaurateur curieux.

**Documents source :**
- `/Users/ekitcho/Downloads/nom-landing-v5.jsx` — Landing page React (référence visuelle)
- `/Users/ekitcho/Downloads/NOM-Project-v1.docx` — Conception produit v1.0
- `/Users/ekitcho/Downloads/NOM-Project-v1.2.docx` — Conception produit v1.2 (plus récent, fait référence)

## Constraints

- **Mobile-first** : L'expérience mobile est la priorité absolue
- **Ship fast** : MVP fonctionnel en 4-6 semaines, pas de perfection
- **Cache everything** : Chaque scan enrichit la base pour les suivants (coût OCR ~0.10€ vs URL parse ~0.01€)
- **No placeholders** : Pas de code "pour plus tard" dans le MVP (MVP scope lock strict)
- **Déploiement** : Vercel, domaine par défaut en attendant un nom de domaine dédié
- **Langue** : Landing en FR seulement pour le milestone 1
- **Budget IA** : APIs LLM = poste de coût principal, cache vital

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Milestones séparés (landing → MVP app) | Ship la landing vite pour collecter emails, puis construire l'app | — Pending |
| Reconstruction propre de la landing | Le JSX v5 est une référence visuelle, pas une base de code | — Pending |
| Design validé (dark, orange, animations) | Le look & feel v5 est approuvé | ✓ Good |
| FR seulement pour la landing | Cible Strasbourg d'abord, anglais plus tard | — Pending |
| Vercel pour le déploiement | Gratuit, rapide, idéal pour React/Next | — Pending |
| Stack technique à déterminer par recherche | Laisser la recherche choisir (React/Vite vs Next.js, service waitlist) | — Pending |
| Doc v1.2 fait référence sur le scope | MVP scope lock : si pas Phase 1, pas dans le code | ✓ Good |

---
*Last updated: 2026-02-25 after initialization*
