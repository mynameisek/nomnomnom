# NŌM

## What This Is

NŌM est une application mobile-first qui transforme n'importe quel menu de restaurant en fiches enrichies, traduites et contextualisées. Au-delà de la simple traduction, NŌM construit une base de connaissances culinaire : chaque plat scanné est normalisé (nom canonique), expliqué culturellement, et indexé pour permettre la recherche inversée ("je veux des mantı" → restaurants qui en servent). À terme, NŌM devient une API/RAG spécialisée cuisine.

## Core Value

Scanner un menu et comprendre chaque plat en moins de 10 secondes, sans compte, dans n'importe quelle langue.

## Requirements

### Validated

- ✓ Landing page NŌM avec le design validé (dark theme, orange #FF6B35, animations) — v1.0
- ✓ Phone demo animée (scan → fiches → assistant Top 3) — v1.0
- ✓ Sections : hero, carousel plats, features, recherche inversée, social/gamification, pricing, FAQ, waitlist — v1.0
- ✓ Formulaire waitlist email fonctionnel avec stockage backend (Supabase + referral system) — v1.0
- ✓ Déploiement sur Vercel (domaine par défaut) — v1.0
- ✓ FR seulement, optimisé mobile-first — v1.0
- ✓ SEO basique (meta tags, OG images, Twitter cards, semantic HTML) — v1.0
- ✓ Scan QR code → détection menu → fiches plats — v1.1
- ✓ Scan URL/lien + PDF → parse menu web → fiches plats — v1.1
- ✓ Scan photo OCR (fallback caméra) → extraction menu → fiches plats — v1.1
- ✓ Traduction FR/EN/TR/DE par plat — v1.1
- ✓ Filtres alimentaires : végé, épicé, allergènes — v1.1
- ✓ Badges de confiance (Menu / Inféré) — v1.1
- ✓ Phrases allergènes multilingues (jamais "garanti", toujours phrase serveur) — v1.1
- ✓ Pas de compte requis pour le scan — v1.1
- ✓ Cache menu : chaque scan enrichit la base pour les suivants — v1.1
- ✓ Admin dashboard protégé avec sélection modèle LLM et stats — v1.1
- ✓ Google Places enrichment (adresse, téléphone, rating, photo) — v1.1

### Active

#### Current Milestone: v1.2 Dish Enrichment

- [ ] Enrichissement plat : explication culturelle, origine, comment ça se mange, ingrédients typiques
- [ ] Nom canonique : normalisation des noms de plats (Mantı = Manti = Turkish Dumplings) pour matching cross-restaurant
- [ ] Recherche inversée : "j'ai envie de X" → plats correspondants dans les menus scannés
- [ ] Assistant IA Top 3 : recommandation contextuelle basée sur le menu réel (3x/jour gratuit)
- [ ] ES/IT translation support
- [ ] Images best-effort par plat (recherche web par nom canonique, gradient+emoji fallback)

### Out of Scope

- Compte utilisateur + historique + favoris — Phase 2 (pas nécessaire pour valider l'enrichissement)
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
- API ouverte — Phase 4 (pas avant produit stable + base de connaissances suffisante)

## Context

**Terrain de test :** Strasbourg — ville frontalière, forte diversité culinaire (turc, allemand, français, italien), population expat/étudiante.

**Concurrence analysée :**
- **Beli** — Leader social food US (75M+ ratings, $12M levés). Restaurant-centric, pas dish-centric. Onboarding forcé (4 invites). Pas de scan/traduction.
- **Zesty (DoorDash)** — IA conversationnelle pour restaurants. Beta SF/NYC. Centré restaurant.
- **Savor** — Journal dish-centric privé iOS. Pas de découverte ni communauté.
- Aucun concurrent ne combine scan + traduction + enrichissement dish-centric + recherche inversée.

**Positionnement NŌM :** L'intersection utilitaire (scan) × intelligence (enrichissement + assistant IA) × social (opt-in). Le différenciateur vs eazee-link/Google Translate : NŌM ne traduit pas seulement, il **explique** et **connecte** les plats entre restaurants.

**Design validé :** Dark theme #09090B, orange #FF6B35 → rouge #E8453C, vert accent #42D392, typo Outfit/Plus Jakarta Sans.

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
- `/Users/ekitcho/Downloads/NOM-Project-v1.2.docx` — Conception produit v1.2 (fait référence)

## Constraints

- **Mobile-first** : L'expérience mobile est la priorité absolue
- **Ship fast** : Itérer rapidement, pas de perfection
- **Cache everything** : Chaque scan enrichit la base pour les suivants (coût OCR ~0.10€ vs URL parse ~0.01€)
- **No placeholders** : Pas de code "pour plus tard"
- **Déploiement** : Vercel, domaine par défaut
- **Langue** : Interface FR/EN, traductions TR/DE + ES/IT en v1.2
- **Budget IA** : APIs LLM = poste de coût principal, cache vital
- **LLM** : OpenAI par défaut (coût), modèles configurables côté admin
- **Platform** : Web app Next.js (mobile-first), pas de native — QR ouvre le navigateur = zéro friction

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Milestones séparés (landing → MVP app) | Ship la landing vite pour collecter emails, puis construire l'app | ✓ Good — landing shipped in 3h |
| Reconstruction propre de la landing | Le JSX v5 est une référence visuelle, pas une base de code | ✓ Good — cleaner architecture |
| Next.js 16 + Tailwind v4 + motion/react + Supabase | Research-driven stack choice | ✓ Good — Server Components, fast builds |
| Web app (pas native) pour le MVP | QR code → navigateur = zéro friction | ✓ Good — confirmed by usage |
| OpenAI par défaut, modèles configurables | Meilleur rapport coût/vitesse pour parsing menu | ✓ Good — admin can switch live |
| Parser menu générique | Heuristiques + LLM pour n'importe quel format web | ✓ Good — handles HTML, SPA, PDF |
| Screenshotone for SPA extraction | format=markdown for JS-rendered menus | ✓ Good — eazee-link confirmed JS SPA |
| AI SDK 6 generateText + Output.object() | generateObject deprecated in AI SDK 6 | ✓ Good |
| Free-tier translation cascade | DeepL → Google → Azure → MyMemory → LLM fallback | ✓ Good — zero cost for translations |
| Lazy translation (on language switch) | No upfront translation cost, translate on demand | ✓ Good — saves LLM cost |
| PDF native file input to GPT-4o | Avoids screenshotting browser PDF viewer | ✓ Good — works end-to-end |

## Current State

**v1.1 MVP App shipped** (2026-02-28). Deployed on Vercel via GitHub CI/CD.

**Codebase:** Next.js 16, React 19, Tailwind v4, Supabase, OpenAI (AI SDK 6), Screenshotone.

**What's live:**
- 3 scan methods: QR camera, URL paste, photo OCR + PDF support
- Eazee-link structured provider + generic URL/photo parser
- Dish cards with 4-language translation, allergens, dietary tags, trust badges
- Client-side instant filters (dietary, allergen exclusion, spice, text search)
- Google Places enrichment (address, phone, rating, photo)
- Protected admin dashboard (model selector, scan statistics)
- URL hash caching with TTL

**What's missing (v1.2 target):**
- Dish enrichment (cultural explanation, origin, how to eat it)
- Canonical dish names (normalization for cross-restaurant matching)
- Reverse search ("je veux X" → matching dishes across scanned menus)
- AI Top 3 recommendations
- ES/IT translations
- Dish images (web search by canonical name)

## Current Milestone: v1.2 Dish Enrichment

**Goal:** Transformer les fiches plats de simples traductions en fiches enrichies — explication culturelle, nom canonique, images, et poser les bases de la recherche inversée et de la base de connaissances culinaire.

**Target features:**
- Enrichissement par plat : explication culturelle, origine, ingrédients typiques, comment ça se mange
- Nom canonique normalisé (graphe de connaissances) pour matching cross-restaurant
- Recherche inversée : "j'ai envie de mantı" → plats correspondants dans les menus scannés
- Assistant IA Top 3 : recommandation contextuelle sur le menu réel
- ES/IT translation support
- Images best-effort par plat (recherche web par nom canonique, gradient+emoji fallback)

**Test references:**
- `https://menu.eazee-link.com/?id=E7FNRP0ET3&o=q` (menu turc — plats peu connus)
- `https://menuonline.fr/en/lecomptoirdufaubourg/carte-restaurant.pdf` (menu PDF)

---
*Last updated: 2026-02-28 after v1.2 milestone started*
