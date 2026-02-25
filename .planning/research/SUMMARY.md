# Project Research Summary

**Project:** NOM (nomnomnom) — Restaurant Menu Scanning + AI Dish Recommendation App
**Domain:** Food-tech mobile app + animated waitlist landing page (pre-launch)
**Researched:** 2026-02-25
**Confidence:** MEDIUM-HIGH

---

## Executive Summary

NOM is a food-tech product with two distinct surfaces: a pre-launch animated waitlist landing page and a consumer mobile app for scanning restaurant menus, translating them, and generating AI-powered dish recommendations. The product is Strasbourg-first, French-facing, and targets a market gap that existing competitors (MenuGuide, AnyMenu) leave wide open — they translate menus, but they do not recommend, personalize, or build a persistent user preference model. NOM's moat is not translation; it is the Taste Profile + AI recommendation layer that turns a one-time utility into a recurring dining companion.

The recommended approach is a sequential two-milestone strategy: ship the landing page first (Next.js 16 + Tailwind v4 + Motion + Supabase waitlist), use it to build a waitlist while the mobile MVP is built, then release the Expo SDK 54 app with the core OCR-to-dish-card pipeline and a generic AI Top 3 recommendation. The architecture is a Turborepo monorepo with two independent apps (landing and mobile) sharing only TypeScript types, with backend logic living in Supabase Edge Functions close to the Postgres database. The hardest architecture decision is the two-tier LLM caching layer (Redis exact-match + pgvector semantic cache), which must be designed into the schema from day one — retrofitting it later is a costly schema migration.

The critical risks are: (1) LLM hallucinating non-menu dish recommendations — mitigated by grounding all LLM calls with item IDs from the parsed menu and validating every returned ID before display; (2) allergen data being perceived as guaranteed rather than inferred — mitigated by mandatory "inféré" labels and server-phrase disclaimers enforced at the component level (EU Regulation 1169/2011 compliance); and (3) LLM cost explosion at scale — mitigated by caching at both the menu level and the dish-enrichment level from the first deployment. A Strasbourg-first launch strategy is strongly recommended over multi-city launch, as dense local restaurant data is what makes leaderboards, social proof, and reverse search feel real rather than empty.

---

## Key Findings

### Recommended Stack

NOM requires two separate codebases with no runtime coupling. The landing page uses the current top-tier web stack: **Next.js 16** (App Router, Vercel-native), **Tailwind CSS v4** (zero-config, 5x faster builds), **motion/react v12** (replaces framer-motion, React 19 compatible), **shadcn/ui** (Tailwind v4 branch), **Resend + react-email** for waitlist confirmation, and **Supabase** for email storage. The mobile app uses **Expo SDK 54** (New Architecture on by default), **Expo Router 6**, **NativeWind v4** with **Tailwind CSS v3.4.17** (critical version pin — NativeWind does NOT support Tailwind v4), **React Native Vision Camera 4** + **react-native-mlkit-ocr** for scanning, **Vercel AI SDK v6** with **@ai-sdk/openai** for streaming AI calls, **Zustand 5** for client state, **TanStack Query 5** for server state, and **react-native-mmkv** for local caching (30x faster than AsyncStorage).

**Core technologies:**
- **Next.js 16 + Tailwind v4 + motion/react**: Landing page — native Vercel deployment, React 19, best-in-class animation stack for 2025/2026
- **Expo SDK 54 + Expo Router 6**: Mobile app — New Architecture stable, file-based routing, managed workflow eliminates native build complexity at launch
- **NativeWind v4 + Tailwind CSS 3.4.17**: Mobile styling — CRITICAL version constraint; Tailwind v4 breaks NativeWind v4 silently
- **Supabase (Postgres + Auth + Storage + Edge Functions)**: Backend — single platform covers DB, auth, serverless API, and file storage; eliminates separate infrastructure setup
- **Vercel AI SDK v6 + GPT-4.1**: AI layer — streaming abstraction, never call OpenAI directly from the mobile client (API key exposure risk)
- **react-native-mlkit-ocr**: On-device OCR — free, offline, covers Latin script (FR/EN/DE/TR); fallback to GPT-4.1 vision for low-confidence captures
- **react-native-mmkv**: Local persistence — mandatory for cache-everything philosophy; synchronous reads, encryption support
- **Zod 4**: Validation — validate AI and translation API responses at runtime to prevent undefined field crashes

**Critical version constraints to enforce:**
- NativeWind 4.2.2 requires Tailwind CSS 3.4.17 (not v4)
- Reanimated 4.2.2: do NOT add babel-plugin-reanimated (worklets are built-in)
- motion v12: import from `motion/react`, NOT `framer-motion`
- Vercel AI SDK 6.x: use `expo/fetch`, not `global.fetch`, for streaming in Expo

### Expected Features

The landing page must convert visitors while demonstrating the product concept (menu scanning is unfamiliar to most users, so showing it is essential). The mobile app's differentiation from competitors is entirely in the AI + personalization layer — translation alone is not a moat.

**Must have — Landing Page (v1):**
- Hero with scroll-triggered animated phone demo (QR scan → dish cards → AI Top 3) — the primary conversion hook
- Email-only waitlist form above the fold (single field; every additional field cuts conversion 10-20%)
- Waitlist position counter + referral link post-signup (proven 3-5x conversion rate improvement)
- Feature breakdown section with benefit-oriented copy
- Pricing tier preview (Free / Pass 9.99€ / Pro 3.99€/mo) — anchors perceived value
- Dish carousel with real Strasbourg restaurant content — local trust signal
- FAQ section — handles "when does it launch" and "how does scanning work" objections
- GDPR-compliant email collection + cookie consent — legal requirement for France/EU

**Must have — Mobile App (v1):**
- Camera scan → OCR → AI menu parsing → dish cards
- Translation (50+ languages minimum — table stakes; AnyMenu does 50+ for free)
- Dish description + cultural explanation + allergen flags with mandatory "inféré" disclaimer
- AI Top 3 recommendation (generic, before personalization data accumulates)
- Credits system with free tier (5 scans/day) + Pass/Pro subscription via in-app purchase
- Offline result caching (MMKV local + Supabase sync)
- Basic Taste Profile onboarding (dietary preferences, cuisine likes/dislikes)

**Should have — after v1 validation:**
- Personalized Match Score per dish card (requires accumulated Taste Profile data)
- Dish Stories — cultural context, origin, pairing suggestions
- Leaderboard (defer until Strasbourg active users exceed ~50; hollow below that threshold)
- Reverse search (technically complex: image embeddings + restaurant database; no competitor has this)

**Defer to v2+:**
- NOM Wrapped — requires 12+ months of scan/rating data
- Restaurant-provided QR codes (B2B layer — separate product motion)
- Multi-city expansion — after Strasbourg density is achieved

**Anti-features to avoid:**
- Full account creation before first scan (60-80% drop-off; scan must work anonymously)
- Food delivery integration (scope explosion; use deep links to Uber Eats instead)
- Nutrition/calorie tracking (separate product; Yazio and MyFitnessPal own this)
- Multi-city launch simultaneously (dilutes local database quality and social features)
- Inflated fake waitlist counters (users notice; destroys trust)

### Architecture Approach

The architecture is a Turborepo monorepo with two independent app deployments (landing on Vercel, mobile via EAS Build) sharing only a `packages/shared-types` package for TypeScript interfaces. Backend logic lives in **Supabase Edge Functions** (Deno TypeScript) co-located with the Postgres database for minimal round-trip latency. The LLM pipeline is: on-device OCR (ML Kit) → extract text → Supabase Edge Function → two-tier cache check (Redis exact match → pgvector semantic similarity) → LLM call only on full cache miss → store result in both cache tiers → return to client. Authentication uses a layered progressive model: anonymous session (device UUID) → magic link account → social auth, with anonymous data migrated on account creation via `supabase.auth.linkAnonymousUser()`.

**Major components:**
1. **Landing Page** (Next.js 16, Vercel) — marketing, waitlist capture, animated demo; talks only to Supabase waitlist table and Resend
2. **Scan Screen** (Expo, Vision Camera, ML Kit) — QR decode, URL input, photo capture; client-side only, posts raw input to Edge Function
3. **Ingestion Pipeline** (Supabase Edge Function) — URL fetch → JSON-LD → HTML fallback → LLM structured extraction → normalize to `ParsedMenu`; hashed for deduplication
4. **LLM Orchestrator** (Supabase Edge Function) — item_id-grounded recommendations, per-locale translation, reverse search via pgvector; always uses two-tier cache
5. **Dish Cards UI** (React Native) — progressive image hydration (gradient+emoji → web image → community photo); never blocks on image load
6. **Taste Profile + Auth** (Supabase Postgres) — per-user preferences, scan history, anonymous-to-account migration

**Build order enforced by architecture:**
- Phase 1 (Landing) and Phase 2a (DB schema + auth) can run in parallel
- Phase 2b (Ingestion) requires Phase 2a schema
- Phase 2c (LLM Orchestration) requires Phase 2b normalized menu data
- Phase 2d (Mobile UI) requires stable API contracts from 2b + 2c — do not build UI before APIs are stable

### Critical Pitfalls

1. **LLM hallucinating non-menu dish recommendations** — Ground every recommendation prompt with the full parsed `menu_items` list including IDs. Instruct LLM to return only item_id values. Validate every returned ID against the actual menu before display. This is a must-have before any user testing.

2. **Allergen data presented as guaranteed** — Mandatory "inféré" label on every allergen badge at the component level (not just in ToS). Use warning-style UI (⚠ icon, muted color), never a green "safe" checkmark. Hardcoded server-phrase disclaimer in all 4 languages. Required before public beta — EU Regulation 1169/2011 creates legal exposure.

3. **LLM cost explosion without caching** — Design `parsed_menu` table with `(restaurant_url, menu_hash)` cache key and `dish_enrichment` table keyed by `(canonical_dish_name, language)` before writing any LLM integration code. Retrofitting caching is a schema migration. At 5000 MAU with 10 scans/month, uncached LLM calls cost ~5000€/month.

4. **Menu parsing brittleness causing silent failures** — Implement a fallback cascade (JSON-LD → SPA state extraction → LLM structured extraction) with a parse confidence score surfaced in the UI. Test against 30+ diverse real restaurant URLs (TheFork, Wix, PDF menus, Google Doc QR codes) before public beta. Log parse failures with restaurant URL and failure mode from day one.

5. **API key exposure in mobile app bundle** — ALL LLM calls must go through Supabase Edge Functions. Never put OpenAI API key in the Expo app. Verify with `strings` on the IPA/APK before any TestFlight build.

---

## Implications for Roadmap

Based on the combined research — particularly the architecture dependency graph, feature prioritization matrix, and pitfall-to-phase mapping — the following phase structure is recommended:

### Phase 1: Waitlist Landing Page

**Rationale:** Independent of mobile app (zero runtime coupling); ships value immediately while mobile app is built; builds waitlist that validates demand and seeds beta invites. Strasbourg launch means local trust signals matter — the landing page is how you establish them before having a product.

**Delivers:** Animated waitlist landing page deployed on Vercel; email collection with GDPR compliance; waitlist position + referral loop; pricing preview.

**Addresses:**
- All P1 landing page features from FEATURES.md
- GDPR/EU legal requirement for French email collection

**Avoids:**
- Animation performance pitfall (test on mid-range Android with Chrome throttled CPU; animate only `transform` and `opacity`)
- Waitlist form friction pitfall (email only, CTA above fold, automated confirmation email)
- Multi-page navigation (single scroll page, no exit links)

**Research flag:** Standard patterns — well-documented. Skip `research-phase` for this phase.

---

### Phase 2: Data Foundation + Auth

**Rationale:** The Supabase schema must be designed with cache keys before any LLM integration is written. All subsequent phases depend on this schema. This is also the moment to set up the monorepo structure and shared types package — changing these later is expensive.

**Delivers:** Turborepo monorepo structure; PostgreSQL schema (restaurants, menus, menu_items, menu_item_translations, llm_cache, waitlist); Supabase Auth (anonymous + magic link); shared TypeScript types package; Upstash Redis connection.

**Uses:** Supabase, Turborepo, Zod, TypeScript strict mode.

**Implements:** Data Layer and Auth components from ARCHITECTURE.md.

**Avoids:**
- LLM cost explosion pitfall — `menu_hash` cache key in schema from day one
- Anonymous session data loss — anonymous ID + `linkAnonymousUser()` migration path built in from start
- Missing composite index on `(restaurant_id, language)` — add at schema creation time

**Research flag:** Standard patterns for Supabase schema design. Skip `research-phase`. However, pgvector setup for reverse search semantic cache may need brief investigation if unfamiliar.

---

### Phase 3: Menu Ingestion Pipeline

**Rationale:** The ingestion pipeline is the highest-risk backend component. Building it as a discrete phase (separate from the LLM orchestration and mobile UI) allows it to be tested against a corpus of real restaurant URLs before any UI depends on it. This is the component most likely to require iteration.

**Delivers:** Supabase Edge Function `/scan`; URL fetch → JSON-LD parser → HTML fallback → LLM structured extraction cascade; parse confidence score; Redis URL-hash deduplication; `ParsedMenu` normalized structure in Postgres; parse failure logging.

**Uses:** Supabase Edge Functions (Deno), OpenAI GPT-4.1, Upstash Redis, react-native-mlkit-ocr (on-device, pre-pipeline), Zod validation on LLM output.

**Implements:** Ingestion Pipeline and Layered Menu Ingestion Pattern from ARCHITECTURE.md.

**Avoids:**
- Menu parsing brittleness — fallback chain is built, not hardcoded per-restaurant parsers
- Synchronous LLM calls in handler — use streaming or background job with polling; Supabase Edge has 2s wall clock limit (heavy scraping must offload to bg queue)
- HTML regex parsing — JSON-LD first, then SPA state extraction, then LLM fallback

**Research flag:** Needs `research-phase` during planning. Supabase Edge Function timeout constraints for Playwright-style scraping and the specific JSON-LD schema.org parser approach need implementation-level research.

---

### Phase 4: LLM Orchestration Layer

**Rationale:** Once the ingestion pipeline produces a normalized `ParsedMenu`, the LLM orchestration can be layered on top. Translation, enrichment, and recommendations are all driven by the same normalized data structure. Building this as a separate phase ensures the API contracts are stable before the mobile UI is built against them.

**Delivers:** Supabase Edge Function `/recommend` (item_id-grounded Top 3); translation pipeline (`menu_item_translations` table, per-locale, cached); allergen inference with confidence scores; two-tier cache (Redis exact-match + pgvector semantic similarity); streaming response to mobile client via Vercel AI SDK.

**Uses:** Vercel AI SDK v6, @ai-sdk/openai, GPT-4.1 (Top 3) + GPT-4.1-mini (translation), pgvector, Upstash Redis.

**Implements:** LLM Orchestrator, Two-Tier Cache Pattern, and item_id-Grounded Recommendations Pattern from ARCHITECTURE.md.

**Avoids:**
- LLM hallucination — item_id grounding enforced; every returned ID validated against `menu_items` before response
- LLM cost explosion — two-tier cache with >90% hit rate target for repeat restaurants
- Max_tokens not set — hardcode per call type (enrichment: ~500, Top 3: ~200)

**Research flag:** Needs `research-phase` during planning. pgvector semantic cache configuration, OpenAI prefix caching setup, and streaming via Vercel AI SDK through Supabase Edge Functions are niche enough to warrant focused research.

---

### Phase 5: Mobile App Core (Scan → Dish Cards)

**Rationale:** With stable API contracts from Phases 3 and 4, the mobile UI can be built without risk of API-driven rework. The scan-to-dish-card loop is the product's core value — everything else in the mobile app depends on this working reliably.

**Delivers:** Expo SDK 54 app; Scan Screen (QR, URL input, photo capture); on-device ML Kit OCR; Vision Camera integration; DishCard component with progressive image hydration; allergen badges with mandatory "inféré" disclaimer; offline MMKV caching; anonymous session (no account required for first scan).

**Uses:** Expo SDK 54, Expo Router 6, NativeWind v4 + Tailwind CSS 3.4.17, Vision Camera 4, react-native-mlkit-ocr, react-native-mmkv, Reanimated 4, Zustand 5, expo-haptics.

**Implements:** Scan Screen, Dish Cards UI, Progressive Image Hydration Pattern from ARCHITECTURE.md.

**Avoids:**
- Forcing account creation before scan — anonymous session from first launch
- API key in app bundle — all LLM calls proxied through Edge Functions
- Camera permission crash — `NSCameraUsageDescription` and Android permission flow handled before TestFlight
- Blocking UI on image load — gradient+emoji placeholder rendered immediately; images are async enhancement
- Vision Camera multi-fire — debounce QR decode; disable scanner after first valid read

**Research flag:** Vision Camera + Expo dev client setup (cannot use Expo Go) may need a brief `research-phase` focused on EAS Build configuration for first native build.

---

### Phase 6: Monetization + Account Layer

**Rationale:** Once the core scan loop is validated with real users, add the monetization layer and account features. These depend on the core loop working reliably and on having real user feedback about where the credit limits feel right.

**Delivers:** Credits system with free tier (5 scans/day); Pass + Pro subscription via in-app purchase (RevenueCat or Expo IAP); account creation (magic link); anonymous history migration to account; basic Taste Profile onboarding (dietary prefs, cuisine likes/dislikes); scan history sync to Supabase.

**Uses:** Supabase Auth, Supabase Realtime (Taste Profile sync), Stripe or Expo IAP, react-hook-form, Zod.

**Implements:** Account Layers (Phase 2e) from ARCHITECTURE.md build order.

**Avoids:**
- Anonymous session data silently lost — `linkAnonymousUser()` migration on account creation
- Rate limit bypass — enforce day limits server-side at Edge Function level, not only client-side

**Research flag:** In-app purchase implementation (Expo IAP vs RevenueCat) needs `research-phase` — billing integration is complex and platform-specific.

---

### Phase 7: Personalization + Social (Post-Validation)

**Rationale:** These features require accumulated user data and a critical mass of Strasbourg users to feel meaningful. Building them before validation wastes engineering effort on features that may need to pivot. NOM Wrapped requires 12+ months of data — start collecting now, ship the feature later.

**Delivers:** Personalized Match Score per dish (requires Taste Profile data); Dish Stories; Leaderboard (gated behind Strasbourg user threshold of ~50 active users); Reverse search (pgvector image embeddings + restaurant database); data collection infrastructure for NOM Wrapped.

**Uses:** pgvector, GPT-4.1 vision (reverse search), Supabase Realtime (leaderboard updates).

**Avoids:**
- Leaderboard cold-start — show privately ("you are #4 in Strasbourg") until public threshold met
- Reverse search before database — requires pre-indexed Strasbourg dish image embeddings; cannot ship without restaurant database populated

**Research flag:** Reverse search (image embeddings + similarity search at scale) and Strasbourg restaurant database ingestion strategy both need `research-phase` during planning.

---

### Phase Ordering Rationale

- **Landing page first** — independent, ships immediately, validates demand, builds waitlist for beta invites.
- **Schema before LLM** — caching must be in the data model from day one; retrofitting is a schema migration that breaks deployed features.
- **Ingestion before orchestration** — `ParsedMenu` is the contract that LLM orchestration and mobile UI both depend on; stable contract = no rework.
- **API stable before mobile UI** — mobile UI changes (especially React Native) are expensive; wait for stable API contracts before building screens.
- **Core loop before monetization** — validate that the scan → dish card experience is good before asking users to pay.
- **Social features last** — require data, user mass, and a validated core loop before they deliver value.

### Research Flags

**Needs `research-phase` during planning:**
- **Phase 3 (Ingestion Pipeline):** Supabase Edge Function timeout limits for scraping, Playwright offload to background queue (BullMQ on Railway vs Supabase pg_cron), JSON-LD schema.org parser implementation
- **Phase 4 (LLM Orchestration):** pgvector semantic cache configuration, OpenAI prefix caching setup, streaming through Supabase Edge Functions to Expo client
- **Phase 6 (Monetization):** Expo IAP vs RevenueCat, App Store review for credit-based monetization model
- **Phase 7 (Reverse Search):** Image embedding strategy, Strasbourg restaurant database ingestion pipeline design

**Standard patterns — skip `research-phase`:**
- **Phase 1 (Landing Page):** Next.js + Tailwind v4 + Motion + Resend + Supabase waitlist is a well-documented Vercel template pattern
- **Phase 2 (Data Foundation):** Supabase schema design with Turborepo monorepo is standard; official templates exist
- **Phase 5 (Mobile Core):** Expo SDK 54 + Vision Camera + NativeWind is well-documented; main risk is version constraints (already captured)

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All package versions verified via npm registry; version compatibility matrix verified via official docs and community consensus |
| Features | MEDIUM | Landing page patterns HIGH confidence (well-documented conversion research); competitor feature analysis HIGH (direct site verification); gamification specifics LOW (single sources) |
| Architecture | MEDIUM-HIGH | Core patterns (Supabase Edge Functions, pgvector, two-tier cache) backed by official docs; specific LLM orchestration patterns backed by authoritative sources; ingestion pipeline brittleness risk is domain-specific and harder to quantify |
| Pitfalls | MEDIUM | Legal/allergen liability findings are HIGH confidence (EU Regulation 1169/2011 is clear); LLM cost and caching pitfalls are MEDIUM (multiple sources agree on direction); Lottie animation optimization is LOW (single source) |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **NativeWind v4 + Tailwind CSS 3.4.17 compatibility:** Verified via community sources (multiple agree), but no single official doc page covers this exact version matrix. Validate with a test scaffold at project setup before committing to NativeWind styling architecture.

- **Supabase Edge Function timeout for heavy scraping:** The 2s wall clock limit is documented; the recommended fix (BullMQ on Railway or Supabase pg_cron) is community-sourced. Validate the background queue architecture during Phase 3 planning research.

- **OpenAI GPT-4.1 for food domain multilingual text:** Vision capability and multilingual support are confirmed; food-specific accuracy benchmarks (especially for Turkish/Alsatian French menu text) are not validated. Plan a translation accuracy review with human review of 20 TR/DE dish translations before public beta.

- **pgvector semantic cache threshold (0.97 cosine similarity):** The threshold value in the architecture research is a starting point, not a validated value. Tune empirically during Phase 4 implementation with real menu data.

- **Strasbourg restaurant database scope:** The feasibility and timeline for pre-indexing Strasbourg restaurant dish images for reverse search is unresearched. This may significantly affect Phase 7 timeline.

- **Reverse search Wrapped timing constraint:** NOM Wrapped requires 12+ months of user data. If NOM launches in early 2026, the first Wrapped cannot ship until early 2027. Confirm this is acceptable in product planning; start data collection hooks in Phase 5.

---

## Sources

### Primary (HIGH confidence)
- [npmjs.com — Next.js, Expo, Motion, Tailwind, Supabase, NativeWind packages](https://npmjs.com) — all version numbers verified
- [docs.expo.dev/guides/new-architecture/](https://docs.expo.dev/guides/new-architecture/) — New Architecture on by default in SDK 52+
- [ai-sdk.dev/docs/getting-started/expo](https://ai-sdk.dev/docs/getting-started/expo) — Vercel AI SDK Expo setup, expo/fetch requirement
- [ui.shadcn.com/docs/tailwind-v4](https://ui.shadcn.com/docs/tailwind-v4) — shadcn Tailwind v4 support confirmed
- [react-native-vision-camera.com/docs/guides/code-scanning](https://react-native-vision-camera.com/docs/guides/code-scanning) — QR scanning via CodeScanner hook
- [supabase.com/docs/guides/functions/architecture](https://supabase.com/docs/guides/functions/architecture) — Edge Functions architecture
- [schema.org/Menu](https://schema.org/Menu) — Menu / MenuItem JSON-LD types
- [EU Regulation 1169/2011 on Allergen Labelling](https://sites.manchester.ac.uk/foodallergens/information-for-food-businesses/eu-legal-requirements-on-food-allergen-labelling/) — allergen disclaimer legal basis
- [MenuGuide official site](https://menuguide.app/) — competitor feature verification
- [AnyMenu official site](https://anymenu.app/) — competitor feature verification
- [motion.dev/docs/react-upgrade-guide](https://motion.dev/docs/react-upgrade-guide) — framer-motion → motion migration

### Secondary (MEDIUM confidence)
- [redis.io/blog/what-is-semantic-caching/](https://redis.io/blog/what-is-semantic-caching/) — two-tier LLM cache pattern
- [vercel.com/templates/saas/waitly](https://vercel.com/templates/saas/waitly) — waitlist template (Next.js + Supabase + Resend + Upstash)
- [scrapingbee.com/blog/web-scraping-challenges/](https://www.scrapingbee.com/blog/web-scraping-challenges/) — menu parsing brittleness and 4-8 week breakage cycle
- [waitlister.me — Waitlist Landing Page Guide](https://waitlister.me/growth-hub/guides/waitlist-landing-page-optimization-guide) — conversion patterns
- [viral-loops.com/blog/how-to-build-a-waitlist/](https://viral-loops.com/blog/how-to-build-a-waitlist/) — referral/viral mechanics
- [revenuecat.com/blog/growth/2025-app-monetization-trends/](https://www.revenuecat.com/blog/growth/2025-app-monetization-trends/) — credits/freemium strategy
- NativeWind v4 + Tailwind v3.4.17 compatibility — multiple community sources agree; no single official doc

### Tertiary (LOW confidence — needs validation)
- [trophy.so/blog/food-drink-gamification-examples](https://trophy.so/blog/food-drink-gamification-examples) — gamification features (single source)
- [theninehertz.com/blog/ai-in-food-industry](https://theninehertz.com/blog/ai-in-food-industry) — food tech feature landscape (single source)
- [Optimizing Lottie Animations in React Native](https://mukkadeepak.medium.com/optimizing-lottie-animations-in-react-native-with-the-lottie-format-8f7a31ff53ed) — Lottie size guidance (single practitioner account)
- [AI Translation Accuracy Gap — GetBlend](https://www.getblend.com/blog/ai-translation-accuracy-gap/) — translation accuracy concerns (vendor blog)
- OCR pipeline VLM replacement trend — multiple MEDIUM confidence sources agree on direction; specific accuracy for degraded menu photos unvalidated

---
*Research completed: 2026-02-25*
*Ready for roadmap: yes*
