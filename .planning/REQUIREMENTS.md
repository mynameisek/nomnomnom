# Requirements: NŌM

**Defined:** 2026-02-25
**Core Value:** Scanner un menu et comprendre chaque plat en moins de 10 secondes, sans compte, dans n'importe quelle langue.

## v1 Requirements

Requirements for initial release (Milestone 1 — Landing Page).

### Structure & Layout

- [ ] **LAYOUT-01**: Landing page renders correctly on mobile (320px+), tablet, and desktop breakpoints
- [ ] **LAYOUT-02**: Dark theme with brand colors (#09090B background, #FF6B35 orange, #E8453C red, #42D392 green accent)
- [ ] **LAYOUT-03**: Outfit font loaded and applied across all text elements
- [ ] **LAYOUT-04**: Fixed navigation bar with NŌM logo and CTA button
- [ ] **LAYOUT-05**: Footer with branding and copyright

### Hero Section

- [ ] **HERO-01**: Hero displays tagline "Scanne le menu. Comprends chaque plat." with gradient text effect
- [ ] **HERO-02**: Hero shows capability pills (QR · Photo · Lien · Voix / Sans inscription / 50+ langues)
- [ ] **HERO-03**: Primary CTA "Rejoindre la liste d'attente" scrolls to waitlist form
- [ ] **HERO-04**: Secondary CTA "Comment ça marche ↓" scrolls to features section
- [ ] **HERO-05**: Food photo mosaic displaying "200+ cuisines du monde"

### Phone Demo

- [ ] **DEMO-01**: Animated phone mockup cycles through scan → menu detection → dish cards → AI Top 3 recommendation
- [ ] **DEMO-02**: QR scan animation with scanning line effect
- [ ] **DEMO-03**: Menu results show restaurant header (name, cuisine, neighborhood, rating)
- [ ] **DEMO-04**: Dish cards display with food thumbnails, prices, descriptions, and tags
- [ ] **DEMO-05**: AI suggestion panel appears with "consistant, chaud, poulet, pas épicé" example and Top 3 results

### Dish Carousel

- [ ] **CAROUSEL-01**: Auto-scrolling carousel of world dishes with country flags, original names, French translations, prices, and spice levels
- [ ] **CAROUSEL-02**: Active card scales up with orange border, inactive cards fade and scale down
- [ ] **CAROUSEL-03**: Cards are clickable to set active state

### Features Section

- [ ] **FEAT-01**: Six feature cards displayed in responsive grid (scan, AI assistant, translation, stories, reverse search, credits)
- [ ] **FEAT-02**: Each card has icon, title, and description

### Reverse Search Demo

- [ ] **REVERSE-01**: Interactive demo with animated typing "boulettes sauce yaourt turquie"
- [ ] **REVERSE-02**: Results appear with match percentages (96%, 74%, 38%), country flags, dish names, and descriptions
- [ ] **REVERSE-03**: Food image grid alongside the demo

### Social & Gamification Section

- [ ] **SOCIAL-01**: Four feature cards (Taste Profile, Match Score, Leaderboard, NŌM Wrapped) with descriptions and tags
- [ ] **SOCIAL-02**: Animated Taste Profile demo with cuisine bar chart, spice/budget/style cards, and Match Score teaser
- [ ] **SOCIAL-03**: "Opt-in uniquement" pill clearly visible

### Pricing Section

- [ ] **PRICE-01**: Three pricing tiers displayed (Gratuit 0€, Pass 9.99€ one-time, Pro 3.99€/mois)
- [ ] **PRICE-02**: Pass tier highlighted as "Recommandé" with feature list
- [ ] **PRICE-03**: Credits bonus explanation below pricing cards

### FAQ Section

- [ ] **FAQ-01**: Accordion FAQ with 6 questions covering account, AI reliability, allergies, social, international, credits
- [ ] **FAQ-02**: Smooth expand/collapse animation

### Waitlist & CTA

- [ ] **WAIT-01**: Email input form with validation and "C'est parti" submit button
- [ ] **WAIT-02**: Success feedback message "Parfait ! On te prévient dès que c'est prêt."
- [ ] **WAIT-03**: Emails stored in backend database (Supabase)
- [ ] **WAIT-04**: Referral system: after signup, user gets a unique referral link
- [ ] **WAIT-05**: Referral tracking: referring friends moves user up in the waitlist queue
- [ ] **WAIT-06**: Referral dashboard: user can see their position and how many friends referred
- [ ] **WAIT-07**: Final CTA section "Plus jamais hésiter devant un menu" with waitlist button
- [ ] **WAIT-08**: Background food collage behind waitlist section

### Performance & SEO

- [ ] **PERF-01**: Animations run at 60fps on mobile devices (tested with throttled CPU)
- [ ] **PERF-02**: Page loads under 3s on 3G connection (Lighthouse performance > 80)
- [ ] **PERF-03**: Images lazy-loaded with gradient+emoji fallbacks
- [ ] **SEO-01**: Meta title, description, OG image, Twitter card configured
- [ ] **SEO-02**: Semantic HTML structure (proper headings, landmarks)

### Deployment

- [ ] **DEPLOY-01**: Deployed on Vercel with CI/CD from git repository
- [ ] **DEPLOY-02**: Environment variables secured (Supabase keys, etc.)

## v2 Requirements

Deferred to Milestone 2+ (MVP App). Tracked but not in current roadmap.

### Menu Scanning

- **SCAN-01**: User can scan QR code to load restaurant menu
- **SCAN-02**: User can paste URL to load restaurant menu
- **SCAN-03**: User can take photo of paper menu (OCR)
- **SCAN-04**: Menu parsed into individual dish cards

### Dish Cards

- **DISH-01**: Each dish card shows original name, translation, cultural explanation
- **DISH-02**: Dietary filters (végé, épicé, budget, allergènes probables)
- **DISH-03**: Confidence badges (✅ Menu / ⚠ Inféré)
- **DISH-04**: Allergen disclaimer with translated phrase for server

### AI Assistant

- **AI-01**: User can describe what they want to eat in natural language
- **AI-02**: Assistant recommends Top 3 dishes from actual menu items only
- **AI-03**: 3 free questions per day, paywall after

### Translation

- **TRANS-01**: Dish translation in FR/EN/TR/DE
- **TRANS-02**: Cultural context and pronunciation

### Reverse Search

- **SEARCH-01**: User can describe a dish from memory
- **SEARCH-02**: AI finds matching dishes with confidence scores

## Out of Scope

| Feature | Reason |
|---------|--------|
| User accounts / authentication | Milestone 2 — not needed for landing page |
| Actual menu scanning functionality | Milestone 2 — landing page shows demos only |
| Stories / video uploads | Milestone 2 — requires moderation infrastructure |
| Real Taste Profile generation | Milestone 2 — requires scan data |
| Credit system (earn & spend) | Milestone 2 — requires user accounts |
| Match Score, Leaderboard, Streaks | Milestone 2-3 — requires user base |
| NŌM Wrapped | Milestone 3 — requires 6+ months data |
| Payment processing (Pass/Pro) | Milestone 3 — after usage validation |
| Multi-language interface (EN) | Future — FR only for Milestone 1 |
| Restaurant dashboard B2B | Milestone 3+ |
| Token on-chain | Milestone 4 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LAYOUT-01 | Phase 1 | Pending |
| LAYOUT-02 | Phase 1 | Pending |
| LAYOUT-03 | Phase 1 | Pending |
| LAYOUT-04 | Phase 1 | Pending |
| LAYOUT-05 | Phase 1 | Pending |
| DEPLOY-01 | Phase 1 | Pending |
| DEPLOY-02 | Phase 1 | Pending |
| HERO-01 | Phase 2 | Pending |
| HERO-02 | Phase 2 | Pending |
| HERO-03 | Phase 2 | Pending |
| HERO-04 | Phase 2 | Pending |
| HERO-05 | Phase 2 | Pending |
| DEMO-01 | Phase 2 | Pending |
| DEMO-02 | Phase 2 | Pending |
| DEMO-03 | Phase 2 | Pending |
| DEMO-04 | Phase 2 | Pending |
| DEMO-05 | Phase 2 | Pending |
| CAROUSEL-01 | Phase 2 | Pending |
| CAROUSEL-02 | Phase 2 | Pending |
| CAROUSEL-03 | Phase 2 | Pending |
| FEAT-01 | Phase 2 | Pending |
| FEAT-02 | Phase 2 | Pending |
| REVERSE-01 | Phase 2 | Pending |
| REVERSE-02 | Phase 2 | Pending |
| REVERSE-03 | Phase 2 | Pending |
| SOCIAL-01 | Phase 2 | Pending |
| SOCIAL-02 | Phase 2 | Pending |
| SOCIAL-03 | Phase 2 | Pending |
| PRICE-01 | Phase 2 | Pending |
| PRICE-02 | Phase 2 | Pending |
| PRICE-03 | Phase 2 | Pending |
| FAQ-01 | Phase 2 | Pending |
| FAQ-02 | Phase 2 | Pending |
| WAIT-07 | Phase 2 | Pending |
| WAIT-08 | Phase 2 | Pending |
| WAIT-01 | Phase 3 | Pending |
| WAIT-02 | Phase 3 | Pending |
| WAIT-03 | Phase 3 | Pending |
| WAIT-04 | Phase 3 | Pending |
| WAIT-05 | Phase 3 | Pending |
| WAIT-06 | Phase 3 | Pending |
| PERF-01 | Phase 3 | Pending |
| PERF-02 | Phase 3 | Pending |
| PERF-03 | Phase 3 | Pending |
| SEO-01 | Phase 3 | Pending |
| SEO-02 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 45 total
- Mapped to phases: 45
- Unmapped: 0

---
*Requirements defined: 2026-02-25*
*Last updated: 2026-02-25 after roadmap creation*
