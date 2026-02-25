# Roadmap: NŌM — Milestone 1 (Landing Page)

## Overview

Build and deploy the NŌM waitlist landing page in three phases: scaffold the Next.js project and deploy the shell to Vercel, then build all visible content sections (hero, demo, carousel, features, reverse search, social, pricing, FAQ), then wire the waitlist backend with referral tracking and ship with full SEO and performance validation.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (1.1, 1.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Next.js 16 project scaffolded, deployed to Vercel, brand tokens applied
- [ ] **Phase 2: Content Sections** - All visible page sections rendered with animations
- [ ] **Phase 3: Waitlist + Ship** - Supabase waitlist, referral system, SEO, performance, go-live

## Phase Details

### Phase 1: Foundation
**Goal**: A deployed Next.js shell with the correct brand design system that the team can build sections into
**Depends on**: Nothing (first phase)
**Requirements**: LAYOUT-01, LAYOUT-02, LAYOUT-03, LAYOUT-04, LAYOUT-05, DEPLOY-01, DEPLOY-02
**Success Criteria** (what must be TRUE):
  1. Visiting the Vercel URL shows a dark-themed page with the NŌM logo in the nav and a footer
  2. Brand colors (#09090B background, #FF6B35 orange, #E8453C red, #42D392 green) are applied correctly across breakpoints
  3. Outfit font renders on all text elements with no fallback flash
  4. The fixed nav bar remains visible while scrolling on mobile (320px) and desktop
  5. Supabase environment variables are set and secured in Vercel; no secrets in the repo
**Plans**: 1 plan

Plans:
- [ ] 01-01-PLAN.md — Scaffold project, configure brand design system (tokens, Outfit font, Nav, Footer), deploy shell to Vercel

### Phase 2: Content Sections
**Goal**: Every visible section of the landing page is rendered with correct copy, interactions, and animations matching the v5 reference design
**Depends on**: Phase 1
**Requirements**: HERO-01, HERO-02, HERO-03, HERO-04, HERO-05, DEMO-01, DEMO-02, DEMO-03, DEMO-04, DEMO-05, CAROUSEL-01, CAROUSEL-02, CAROUSEL-03, FEAT-01, FEAT-02, REVERSE-01, REVERSE-02, REVERSE-03, SOCIAL-01, SOCIAL-02, SOCIAL-03, PRICE-01, PRICE-02, PRICE-03, FAQ-01, FAQ-02, WAIT-07, WAIT-08
**Success Criteria** (what must be TRUE):
  1. Scrolling from top to bottom shows all sections in order: hero, phone demo, dish carousel, features, reverse search demo, social/gamification, pricing, FAQ, final CTA
  2. The animated phone mockup cycles through scan → menu detection → dish cards → AI Top 3 without user interaction
  3. The dish carousel auto-scrolls and clicking a card makes it active with orange border and scaling effect
  4. The reverse search demo shows animated typing followed by match results with percentages and flags
  5. Clicking "Rejoindre la liste d'attente" or "Comment ça marche" scrolls to the correct section
**Plans**: TBD

Plans:
- [ ] 02-01: Build hero section and animated phone demo (HERO-*, DEMO-*)
- [ ] 02-02: Build dish carousel, features grid, reverse search demo, social section, pricing, FAQ, and final CTA sections (CAROUSEL-*, FEAT-*, REVERSE-*, SOCIAL-*, PRICE-*, FAQ-*, WAIT-07, WAIT-08)

### Phase 3: Waitlist + Ship
**Goal**: Users can join the waitlist, get a referral link, and the page is SEO-ready and performant — ready for public launch
**Depends on**: Phase 2
**Requirements**: WAIT-01, WAIT-02, WAIT-03, WAIT-04, WAIT-05, WAIT-06, PERF-01, PERF-02, PERF-03, SEO-01, SEO-02
**Success Criteria** (what must be TRUE):
  1. A user can enter their email and receive the success message "Parfait ! On te prévient dès que c'est prêt." — email is stored in Supabase
  2. After signing up, the user sees a unique referral link they can share; sharing it moves them up the queue
  3. The user can see their current waitlist position and how many friends they have referred
  4. The page scores above 80 on Lighthouse performance on a simulated 3G connection; all images lazy-load with gradient+emoji fallbacks
  5. OG image, Twitter card, meta title, and description are set; semantic HTML headings and landmarks pass an accessibility tree check
**Plans**: TBD

Plans:
- [ ] 03-01: Implement Supabase waitlist table, email form with validation, success state, referral link generation, position tracking, referral dashboard (WAIT-01 through WAIT-06)
- [ ] 03-02: Add SEO meta tags and OG image, validate semantic HTML, run Lighthouse audit and fix performance issues, final QA across breakpoints (PERF-01, PERF-02, PERF-03, SEO-01, SEO-02)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/1 | Not started | - |
| 2. Content Sections | 0/2 | Not started | - |
| 3. Waitlist + Ship | 0/2 | Not started | - |
