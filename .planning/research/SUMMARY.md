# Project Research Summary

**Project:** NOM — Restaurant Menu Scanning / AI Translation Web App (MVP Features)
**Domain:** Food-tech mobile web app — menu scanning, OCR, LLM parsing, dish cards, AI recommendation
**Researched:** 2026-02-25
**Confidence:** MEDIUM-HIGH

## Executive Summary

NOM is adding a functional app surface to an existing Next.js 16.1.6 App Router landing page. The product's core promise is scanning restaurant menus (via QR code, URL, or photo) and returning AI-structured dish cards with translation, allergen detection, and an AI "Top 3" recommendation — features no current competitor offers in combination. Research confirms the architecture is well-trodden: Server Component shells with Client Component islands for camera access, Route Handlers as server-side OpenAI proxies, and Supabase as both the database and cache layer. The scan-to-cards pipeline (fetch/OCR → LLM parse → Supabase cache → dish cards) is the entire critical path, and everything else — filters, recommendations, reverse search — is additive on top of it.

The recommended approach is a strict layered build: schema and types first, then the LLM pipeline in isolation, then Route Handlers, then UI. The stack additions are minimal (7 new packages) and all are actively maintained and version-compatible with the existing Next.js 16 / React 19 / Tailwind 4 foundation. The two architectural decisions with the most downstream impact are: (1) using GPT-4o Vision directly for photo OCR instead of Tesseract.js client-side (Tesseract.js freezes mobile browsers for 15-30 seconds and gets killed by the OS on low-RAM devices), and (2) always checking the Supabase menu cache before any LLM call (otherwise OpenAI cost scales linearly with users rather than with unique restaurants).

The highest-risk areas are not technical — they are legal and UX. Allergen inference without a mandatory, un-hideable disclaimer in the user's language is a liability in France. Storing raw IP addresses for rate limiting violates GDPR under French law per the 2025 CNIL clarification. Scraping TheFork or Zenchef URLs violates their ToS and is now subject to DSA/GDPR enforcement. Each pitfall has a clear mitigation: hardcoded `AllergenDisclaimer` component as mandatory wrapper, daily-rotated hashed IPs with 24-hour deletion, and robots.txt checking before any scrape. The strategy is to build these mitigations in during the relevant phase — not as retrofits.

---

## Key Findings

### Recommended Stack

The existing Next.js 16 + Supabase + Tailwind 4 + React 19 foundation requires only 7 new packages. The Vercel AI SDK (`ai` + `@ai-sdk/openai`) is the correct LLM integration layer — it handles streaming and Server Action integration without the boilerplate required by the raw OpenAI npm package. `next-intl` v4.8.3 handles UI string localization for the 6-language requirement, with one critical gotcha: Next.js 16 renamed `middleware.ts` to `proxy.ts`, which will silently break all tutorials written for older versions. The QR scanning library landscape has consolidated — `@yudiel/react-qr-scanner` is the only actively maintained option as of Feb 2026 and `html5-qrcode` (ubiquitous in tutorials) has been abandoned since 2022.

The most impactful architectural choice in the stack is the photo OCR strategy. Research confirms Tesseract.js client-side is unsuitable for mobile menu scanning: 15-30 second UI freezes, WASM worker killed by OS on devices with less than 4GB RAM, and 15MB forced download per session. The correct path is GPT-4o-mini Vision for single-call OCR + structured extraction — faster, simpler, and more accurate for restaurant menu formats at a fraction of the cost of full GPT-4o. The two-tier URL parsing (Cheerio for static HTML, screenshot service API for JavaScript SPAs) handles the full range of restaurant menu page types without headless browsers, which cannot be deployed on Vercel (Chromium binary alone exceeds the 250MB function size limit).

**Core technologies:**
- `@yudiel/react-qr-scanner` ^2.5.1: camera QR detection — only actively maintained React QR library as of Feb 2026
- `react-webcam` ^7.2.0: camera capture UI for photo mode — lightweight, requires `ssr: false`
- `cheerio` ^1.2.0: server-side HTML parsing for static/SSR menus — server-only, never in client bundle
- `ai` ^6.0.97 + `@ai-sdk/openai` ^3.0.31: Vercel AI SDK + OpenAI provider — streaming, typed, App Router native
- `next-intl` ^4.8.3: UI string localization — purpose-built for App Router, Server Component support
- `@supabase/supabase-js` (existing): menu cache + structured dish storage — no new package needed

**Explicitly ruled out:** `html5-qrcode` (unmaintained), `playwright`/`puppeteer` (Vercel 250MB function limit), raw `openai` npm v6 (manual streaming), `next-i18next` (Pages Router only, App Router incompatible), `tesseract.js` on client (mobile performance), `@supabase/ssr` for cache queries (opts out of Next.js fetch cache).

### Expected Features

The competitive landscape is clear: MenuGuide and FoodieLens translate menus but make no recommendations. Yelp Menu Vision overlays photos on a live camera but produces no structured data. NOM's primary differentiators are AI recommendation (Top 3 with rationale) and trust badges — no competitor does either. The paywall strategy is structurally superior: NOM gates the AI "wow moment" (Top 3) rather than the scan itself, meaning users see value before hitting friction.

**Must have (table stakes) — v1:**
- QR code scan → URL → menu extraction — fastest path to dish cards
- URL paste → menu parsing — serves users who find menus on Google before arriving
- Photo OCR via GPT-4o Vision — covers Strasbourg restaurants with paper/chalk menus
- Translation in 6 languages (FR, EN, TR, DE, ES, IT) — full Strasbourg test market coverage
- Dish cards with translated name, 2-sentence description, price
- EU 14-allergen tags + dietary icons (vegetarian/vegan/spicy)
- Allergen disclaimer in user's language — hardcoded locale strings, never AI-generated
- Trust badges per card (Verified / Inferred) — core product rule, no competitor offers this
- Dietary filter UI — real-time client-side card filter, zero API calls
- AI Top 3 assistant — 3x/day free, paywall after — the primary differentiator
- Menu cache in Supabase — hash URL, cache result, serve instantly to next user
- Session-based credit counter (no account required, device fingerprint or localStorage UUID)

**Should have (competitive differentiators) — v1.x:**
- Reverse search ("I want something vegetarian and light") — client-side tag filter first
- Top 3 rationale display ("Why: diverse, matches your no-gluten filter")
- Real dish photo lookup via Yelp Fusion or Google Places Photos API
- Budget flag (price relative to menu average)
- Manual refresh button for cached menus with "last scanned" timestamp

**Defer (v2+):**
- Language support beyond 6 (add based on user location telemetry)
- Account-linked scan history (requires full auth flow)
- B2B restaurant QR codes (NOM-optimised for restaurant tables)
- Advanced personalisation (Taste Profile feeding Top 3)
- Nutrition estimates (only if demand is clear and liability framework is established)

**Anti-features confirmed as out of scope:** guaranteed allergen accuracy, AI-generated dish photos presented as real, social feed of recent scans, real-time scraping on every page load, infinite free AI Top 3 calls.

### Architecture Approach

The architecture adds a functional app surface to the existing Next.js codebase without a separate framework or app. New routes live under `app/` alongside the existing landing page. The consistent pattern is Server Component shell (data fetching, static frame) with Client Component islands (camera, filter state, recommendation input). All LLM calls are server-only via Route Handlers — the OpenAI API key never reaches the browser. Supabase uses two separate clients: the existing anon key for browser-safe operations, and a new service-role client for server-side writes that bypass RLS.

New files are organized under `components/app/` (all functional app components, separated from existing `components/sections/` to prevent accidental client bundle inflation) and `lib/` (server-only modules with `import 'server-only'` guards). No global state store is needed for MVP — URL is the primary state carrier (`/scan` → `/menu/[id]`).

**Major components:**
1. `/api/scan` Route Handler — accepts URL or base64 photo, checks Supabase cache via SHA-256 hash, runs LLM pipeline, upserts menus + menu_items; the core ingest endpoint and cost control mechanism
2. `lib/openai.ts` (server-only) — typed wrappers for parseMenuFromText, translateDishes, getRecommendations using Zod structured output; eliminates JSON parse failures and schema drift
3. `lib/cache.ts` (server-only) — normalized URL hashing + cache read/write; all LLM calls gated behind cache miss
4. `components/app/` — all functional app components (QrScanner, PhotoCapture, UrlInput, DishCard, DishList, FilterBar, RecommendPanel, ScanProgress)
5. Supabase tables: `menus` + `menu_items` + `admin_config` — the cache IS the database; no Redis needed for MVP
6. `/api/recommend` Route Handler — item_id-grounded Top 3 with UUID validation against actual menu; hallucination prevention by design

**Key patterns:** Zod structured output for all LLM calls (eliminates JSON parse failures), item_id-grounded recommendations (LLM returns UUIDs not dish names — no hallucination), URL hash as idempotent cache key, `import 'server-only'` guards on all server modules.

**Suggested build order from architecture research:** Step 1: DB schema + types → Step 2: `lib/openai.ts` + `lib/menu-extract.ts` → Step 3: `/api/scan` Route Handler (URL path) → Step 4: `/menu/[id]` + DishCard + DishList → Step 5: `/api/scan` photo OCR path → Step 6: `/scan` page + camera components → Step 7: FilterBar logic → Step 8: `/api/recommend` + RecommendPanel → Step 9: Admin config → Step 10: Nav integration.

### Critical Pitfalls

1. **iOS Safari PWA camera silently fails in standalone mode** — WebKit bug #185448 breaks `getUserMedia` when app is launched from iPhone home screen bookmark. Prevention: test on physical iPhone before merge (not just desktop Chrome), detect `window.navigator.standalone` and show "open in Safari" banner, always use `playsInline`/`autoPlay`/`muted` on video elements, always release camera tracks via `stream.getTracks().forEach(t => t.stop())` after scan.

2. **LLM vision token cost explosion from full-resolution photos** — A 3024x4032 phone photo generates ~20 vision tiles at ~3,400 tokens = ~$0.0085 per image in input alone. Prevention: resize photos client-side to 1024px max before upload (Canvas API or browser-image-compression), set `detail: "low"` for initial OCR passes, set hard `max_tokens` per call type, cache aggressively (popular restaurants pay LLM cost once regardless of scan volume).

3. **Allergen hallucination without mandatory disclaimer** — Peer-reviewed research (Frontiers in Nutrition, 2025) confirms LLMs make allergen inference errors. In France, absence of a visible disclaimer creates legal liability. Prevention: mandatory `AllergenDisclaimer` component as required wrapper around all allergen display (no dish card can render allergen data without it), hardcoded multilingual disclaimer strings in locale files never generated by AI, never display allergen absence as a positive "safe" indicator (no green checkmarks).

4. **GDPR violation: raw IP addresses stored for rate limiting** — IP addresses are personal data under GDPR per French CNIL and the 2025 EU Digital Services Act. Fine risk up to €20M. Prevention: store only daily-rotated SHA-256 hash of IP (not linkable to user), delete records after 24 hours via pg_cron, document as legitimate interest in privacy policy. Alternative: localStorage UUID (no GDPR risk, bypassable by clearing storage).

5. **Tesseract.js on mobile client destroys performance** — 15-30 second UI freeze on iPhone X and mid-range Android; WASM worker killed by OS on devices with less than 4GB RAM; 15MB forced download. Prevention: use GPT-4o-mini Vision for photo OCR instead (single call handles OCR + structuring), keep Tesseract.js out of the client bundle entirely.

6. **`@supabase/ssr` opts out of Next.js fetch caching** — Using `@supabase/ssr` for menu cache lookups means every page render hits the database (documented in Supabase GitHub discussion #28157). Prevention: use plain `@supabase/supabase-js` for server-side cache queries (no cookies = Next.js can cache), reserve `@supabase/ssr` for auth operations only (NOM MVP has no user auth).

7. **Web scraping TheFork/Zenchef violates ToS and GDPR** — France CNIL treats `robots.txt` disallow as a strong negative signal against legitimate interest under GDPR + DSA 2025. Prevention: check `robots.txt` before any scrape, never scrape third-party restaurant platform paths, prioritize user-submitted photo OCR as the universal fallback.

---

## Implications for Roadmap

The dependency graph drives the phase order: schema before pipeline, pipeline before UI, UI before polish, legal compliance woven into the phase where the risk surface is created.

### Phase 1: Database Foundation and Types

**Rationale:** Every downstream phase depends on Supabase tables and TypeScript types existing. No UI is possible without schema. No LLM pipeline can persist results without a cache layer. Establishing this first with no UI risk prevents cascading schema migrations later. The schema must encode the caching strategy from day one.

**Delivers:** `menus`, `menu_items`, `admin_config` tables with correct indexes (especially on `url_hash`); `types/menu.ts` interfaces (`ParsedMenu`, `MenuItem`, `Allergen`, `DietaryTag`, `MenuCache`, `AdminConfig`); `lib/supabase-server.ts` service-role client; verified read/write from Supabase dashboard.

**Addresses:** Menu caching (FEATURES.md), cache idempotency (ARCHITECTURE.md Pattern 5), Supabase SSR caching conflict prevention (PITFALLS.md Pitfall 5).

**Avoids:** Using `@supabase/ssr` for cache queries — enforce plain `supabase-js` on server from day one. No index on `url_hash` is a common omission that causes full table scans on every cache lookup.

**Research flag:** Standard patterns. Skip `/gsd:research-phase` — official Supabase docs are authoritative.

---

### Phase 2: LLM Pipeline (Server-Only, No UI)

**Rationale:** The LLM pipeline is the core value engine. It must be built and validated in isolation — separate from UI, separate from camera, separate from Route Handlers. Testing `parseMenuFromText` with curl before wiring any UI catches prompt engineering issues and token cost problems early. This is the phase to establish allergen + translation in a single LLM call (halves API cost vs two separate calls).

**Delivers:** `lib/openai.ts` with Zod-validated `parseMenuFromText`, `translateDishes`, `getRecommendations`; `lib/menu-extract.ts` for URL fetch + HTML stripping; `lib/cache.ts` for URL hash + cache read/write; verified structured output matching schema with real restaurant URLs.

**Uses:** `ai` + `@ai-sdk/openai`, `cheerio`, Zod (via OpenAI structured output API).

**Implements:** Architecture Pattern 4 (Zod structured output), Pattern 6 (item_id-grounded recommendations), Pattern 5 (URL hash as idempotent cache key).

**Avoids:** Prompt injection via menu content — content delimiters (`<MENU_CONTENT_START>` / `<MENU_CONTENT_END>`) and input sanitization must be implemented here (PITFALLS.md Pitfall 9). Storing raw LLM output — only normalized structured data goes to Supabase.

**Research flag:** Needs `/gsd:research-phase` during planning for prompt engineering: allergen extraction accuracy with EU 14-allergen taxonomy, multi-language translation + allergen tagging in a single LLM call, token count benchmarks for large menus (50+ dishes), and screenshot service vendor evaluation for SPA menus (Screenshotone vs APIFlash vs Browserless).

---

### Phase 3: Scan Route Handler (`/api/scan`)

**Rationale:** Connects the LLM pipeline to the web surface. The Route Handler is the server-side proxy that keeps the OpenAI key secure, enforces cache-first logic, and normalizes URL vs photo inputs into a unified output. Must exist and be verified via Postman/curl before any scanning UI is built.

**Delivers:** `app/api/scan/route.ts` handling URL and base64 photo inputs; cache check before any LLM call; Supabase upsert of parsed results; image resize enforcement (1024px max) before vision API call; verified via curl before UI is wired.

**Addresses:** OpenAI key security (never browser-exposed), caching as cost control, two-tier URL parsing (Cheerio for static HTML, screenshot service for SPAs).

**Avoids:** Playwright/Puppeteer on Vercel (Chromium binary 280MB vs 250MB limit). Image resize + `max_tokens` enforced here (PITFALLS.md Pitfall 3). SSRF protection: validate URL scheme (https only), reject private IP ranges before fetch (PITFALLS.md Security Mistakes).

**Research flag:** Screenshot API vendor selection needs evaluation in Phase 2 research (see above). SPA detection heuristic (when to fall back from Cheerio to screenshot) needs a clear decision rule.

---

### Phase 4: Dish Cards UI (`/menu/[id]`)

**Rationale:** First visible user-facing output. Server Component fetches from Supabase, passes structured data to Client Component DishList. Can be built and tested with a known menu UUID before any camera UI exists. Validating the data model renders correctly before investing in the scan input flow isolates data bugs from UI bugs.

**Delivers:** `app/menu/[id]/page.tsx` + loading skeleton; `DishCard` component with translated name, description, price, allergen tags, spice level, trust badge; `DishList` rendering full card grid; static `FilterBar` visual shell; mandatory `AllergenDisclaimer` wrapper component with hardcoded multilingual strings.

**Addresses:** Dish cards (FEATURES.md table stakes), trust badges, allergen disclaimer with EU-compliant wording in all 6 languages.

**Avoids:** Allergen hallucination without disclaimer — `AllergenDisclaimer` must be a mandatory wrapper at the component level enforced by code structure, not developer discipline (PITFALLS.md Pitfall 4). No green "safe" indicators for allergen absence — amber/orange warning only.

**Research flag:** Standard patterns. Component structure well-documented in ARCHITECTURE.md. Skip `/gsd:research-phase`.

---

### Phase 5: Scan Input UI (`/scan`)

**Rationale:** Camera and QR scanning are the highest-risk technical components (iOS Safari PWA bugs, SSR incompatibility, camera stream cleanup). They come after the data pipeline is stable so UI bugs can be isolated from data bugs. Building scan input after the dish card destination is validated means the happy path is working before testing the most unpredictable component.

**Delivers:** `app/scan/page.tsx` Server Component shell; `QrScanner` (dynamic import, `ssr: false`), `PhotoCapture`, `UrlInput`, `ScanProgress` Client Components; end-to-end scan → redirect to `/menu/[id]` flow working on a physical iPhone.

**Uses:** `@yudiel/react-qr-scanner` (dynamic, ssr:false), `react-webcam` (ssr:false), image resize before upload to `/api/scan`.

**Avoids:** iOS PWA standalone camera failure — must test on physical iPhone before merge, not just desktop Chrome (PITFALLS.md Pitfall 1). Raw `deviceId` persistence for camera selection — persist `facingMode` instead (PITFALLS.md Pitfall 2). Camera stream not released after scan — `stream.getTracks().forEach(t => t.stop())` in cleanup. `getUserMedia` called outside user gesture — trigger only from onClick/onTouchEnd.

**Research flag:** Needs `/gsd:research-phase` specifically for iOS PWA camera testing protocol — the WebKit bug patterns (bugs #185448 and #215884) require explicit test cases documented before implementation starts.

---

### Phase 6: Allergen Filtering and AI Top 3

**Rationale:** Both features depend on structured dish data from Phase 4 and the recommend Route Handler. Allergen filtering is purely client-side (zero API cost, instant). AI Top 3 is the primary differentiator and paywall trigger — implementing together validates the freemium conversion mechanic with real data before further investment.

**Delivers:** `FilterBar` filter logic (useState + activeFilters prop passed to DishList); `app/api/recommend/route.ts` with item_id-grounded Top 3 and UUID validation; `RecommendPanel` with preference input and highlighted dish cards; session-based credit counter (3x/day free gate using localStorage UUID or hashed IP).

**Addresses:** Dietary filter UI (FEATURES.md differentiator), AI Top 3 assistant (primary differentiator), session credit counter.

**Avoids:** LLM calls on every filter toggle — filtering is pure in-memory array intersection on already-loaded dish data (ARCHITECTURE.md Anti-Pattern 3). GDPR-compliant rate limiting: if IP-based, use daily-rotated SHA-256 hash with 24-hour pg_cron deletion; if localStorage UUID-based, no GDPR risk but bypassable (PITFALLS.md Pitfall 6).

**Research flag:** Needs `/gsd:research-phase` for GDPR-compliant rate limiting implementation (localStorage UUID vs hashed IP tradeoffs and legal review recommendation for French market) and Top 3 prompt engineering (diversity + clarity + filter-match criteria).

---

### Phase 7: Navigation Integration and Admin Config

**Rationale:** Nav integration comes last — only after `/scan` is fully functional on a real device. Adding the entry point before the destination is stable creates user-facing broken states. Admin config is low-risk and can be built alongside nav integration as a parallel track.

**Delivers:** "Scanner" CTA in Nav.tsx linking to `/scan`; landing page hero button wired to `/scan`; `app/admin/page.tsx` with `ADMIN_SECRET` env gate, `admin_config` table read/write, model selector dropdown (gpt-4o / gpt-4o-mini / gpt-4.1-mini).

**Addresses:** No-account-required first scan (FEATURES.md table stakes), admin model configurability.

**Avoids:** Middleware conflicts between landing page and app routes — explicit `matcher` exclusion pattern must be configured to exclude `/_next/static`, `/_next/image`, and existing landing routes before the middleware chain is active (PITFALLS.md Pitfall 10).

**Research flag:** Standard patterns. Skip `/gsd:research-phase`.

---

### Phase 8: Reverse Search and v1.x Polish (Post-Validation)

**Rationale:** Reverse search is a differentiator but not a launch blocker. Client-side tag filter covers 80% of use cases instantly. Add after the core loop is validated with real users (first 50 scans), so feature decisions are data-driven.

**Delivers:** `ReverseSearch` client component with natural language input; client-side tag filter for simple queries ("vegetarian", "no nuts"); optional GPT-4o ranking call for nuanced queries; real dish photo lookup via Yelp Fusion or Google Places Photos; budget flag on dish cards; "last scanned" timestamp with manual refresh.

**Addresses:** Reverse search (FEATURES.md differentiator), Top 3 rationale display, real photo sourcing.

**Research flag:** Needs `/gsd:research-phase` for Yelp Fusion vs Google Places API comparison: quota limits, cost per request, coverage in the Strasbourg market specifically.

---

### Phase Ordering Rationale

- **Schema before pipeline:** Supabase tables and TypeScript types must exist before any LLM output can be persisted. The cache strategy must be in the schema from day one.
- **Pipeline before UI:** LLM structured output bugs are best caught with curl, not with a camera pointed at a menu. Isolating the pipeline also makes token cost visible before any user can trigger it.
- **Route Handler before scan UI:** `/api/scan` must exist and return `menuId` before the scan UI can redirect to `/menu/[id]`.
- **Dish cards before camera:** The destination (`/menu/[id]`) must render correctly before building the source (scan UI). This isolates UI bugs from data bugs.
- **Camera last among core features:** iOS Safari PWA camera bugs are the highest-risk unknown. Everything else should be stable before engaging the most unpredictable component.
- **Legal compliance integrated per phase, not at the end:** Allergen disclaimer in Phase 4, GDPR rate limiting in Phase 6, robots.txt checking in Phase 2/3. Not a separate "compliance phase" — enforced when the risk surface is created.

---

### Research Flags

**Needs `/gsd:research-phase` during planning:**
- **Phase 2 (LLM Pipeline):** Prompt engineering for allergen + translation in a single LLM call, token benchmarks for large menus, screenshot API vendor evaluation for SPA handling
- **Phase 5 (Scan UI):** iOS PWA camera testing protocol, physical device test matrix for iOS versions affected by WebKit bugs #185448 and #215884
- **Phase 6 (Top 3 + Filtering):** GDPR-compliant rate limiting implementation, Top 3 prompt diversity/clarity criteria engineering
- **Phase 8 (v1.x Polish):** Yelp Fusion vs Google Places API for Strasbourg market dish photo coverage

**Standard patterns — skip `/gsd:research-phase`:**
- **Phase 1 (DB Foundation):** Supabase schema design is well-documented; official migration tooling
- **Phase 3 (Route Handler):** Next.js Route Handler patterns from official docs; architecture is prescribed
- **Phase 4 (Dish Cards UI):** Component structure fully specified in ARCHITECTURE.md with code examples
- **Phase 7 (Nav + Admin):** Middleware matcher config is documented; admin pattern is simple env-gated read/write

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Package versions verified via npm registry; Vercel AI SDK and next-intl confirmed via official docs; `@yudiel/react-qr-scanner` as sole active QR library is MEDIUM (community consensus, not official benchmark); `@ai-sdk/openai` ^3.0.31 last published 15 hours before research — active but version may increment quickly |
| Features | MEDIUM-HIGH | Competitor analysis verified Feb 2026 (MenuGuide, FoodieLens, Yelp Blog); allergen UX HIGH via regulatory sources and peer-reviewed research; AI recommendation patterns MEDIUM (market-verified, but no NOM-specific precedent for the paywall-on-AI-moment model) |
| Architecture | HIGH | Next.js App Router patterns from official docs; Supabase service-role pattern from official docs; Zod structured output from official OpenAI docs; SSR disable for camera components confirmed via official Next.js docs and community patterns |
| Pitfalls | HIGH for camera/LLM/Next.js (official sources, WebKit bug tracker); MEDIUM for legal (GDPR analysis corroborated by multiple sources, no specific ruling for AI allergen apps); LOW for web scraping legality (jurisdiction-dependent, no case law specific to this domain) |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Screenshot API vendor selection:** Research recommends a screenshot service for SPA menus (eazee-link.com confirmed JavaScript SPA via direct fetch) but did not evaluate specific vendors. Screenshotone, APIFlash, and Browserless all exist; pricing, cold-start latency, and reliability need evaluation in Phase 2 research before architecture is locked.

- **Dish photo sourcing for v1.x:** Yelp Fusion API and Google Places Photos are candidates for real dish images. Neither was evaluated for rate limits, cost per request, or actual coverage in the Strasbourg restaurant market. Flag for Phase 8 research.

- **Top 3 prompt quality with real menus:** The LLM prompt structure for diversity + clarity + filter-match criteria was not tested with real Strasbourg restaurant menus. Token count for large menus (50+ dishes) with full 6-language translations was not benchmarked. Flag for Phase 2 research.

- **iOS camera testing matrix:** WebKit bug #185448 was partially fixed in iOS 16.4 but issues persist on specific iOS versions. The iOS version distribution of NOM's Strasbourg target users is unknown. A physical device test protocol must be established in Phase 5 planning.

- **GDPR rate limiting legal review:** Research identifies daily-rotated hashed IP as compliant but this has not been reviewed by a French DPO. For an EU-market consumer app with potential liability exposure, a brief legal review before public beta is recommended. The localStorage UUID alternative avoids the question entirely.

- **Next.js 16 middleware rename:** The `middleware.ts` → `proxy.ts` rename is confirmed for next-intl. Whether this applies to all Next.js 16 middleware or only next-intl's integration middleware needs clarification in Phase 7 to avoid silently broken middleware.

---

## Sources

### Primary (HIGH confidence)
- [next-intl.dev](https://next-intl.dev/) — Next.js 16 compatibility, `proxy.ts` rename, App Router Server Component support
- [ai-sdk.dev/docs](https://ai-sdk.dev/docs/introduction) — Vercel AI SDK v6 architecture and Next.js App Router integration
- [nextjs.org/docs](https://nextjs.org/docs/app/building-your-application) — Route Handlers, Server Components, dynamic import with `ssr: false`, middleware matcher config
- [platform.openai.com/docs](https://platform.openai.com/docs/guides/structured-outputs) — Structured Outputs with Zod, vision pricing token calculation (170 tokens per 512x512 tile)
- [supabase.com/docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS, anon vs service role key patterns
- [github.com/naptha/tesseract.js](https://github.com/naptha/tesseract.js/blob/master/docs/performance.md) — OCR performance benchmarks on mobile (2-20s recognition time)
- [bugs.webkit.org #185448](https://bugs.webkit.org/show_bug.cgi?id=185448) — getUserMedia in iOS PWA standalone mode failure
- [bugs.webkit.org #215884](https://bugs.webkit.org/show_bug.cgi?id=215884) — getUserMedia recurring permissions on hash change in standalone
- [github.com/orgs/supabase/discussions/28157](https://github.com/orgs/supabase/discussions/28157) — `@supabase/ssr` opts out of Next.js fetch cache
- [vercel.com/docs/functions/limitations](https://vercel.com/docs/functions/limitations) — 250MB serverless function size limit (blocking Playwright/Puppeteer)
- [frontiersin.org/journals/nutrition 2025](https://www.frontiersin.org/journals/nutrition/articles/10.3389/fnut.2025.1635682/full) — peer-reviewed LLM allergen hallucination confirmation
- [owasp.org — LLM Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) — prompt injection prevention patterns

### Secondary (MEDIUM confidence)
- [MenuGuide official site + pricing](https://menuguide.app/) — competitor feature/pricing verification Feb 2026
- [FoodieLens feature page](https://foodielens.app/) — competitor feature analysis Feb 2026
- [TechCrunch — Yelp AI Menu Vision, Oct 2025](https://techcrunch.com/2025/10/21/yelps-ai-assistant-can-now-scan-restaurant-menus-to-show-you-what-dishes-look-like/) — industry direction
- [npmjs.com — @yudiel/react-qr-scanner](https://www.npmjs.com/package/@yudiel/react-qr-scanner) — maintenance status and React 19 compatibility
- [STRICH Knowledge Base — iOS PWA camera](https://kb.strich.io/article/29-camera-access-issues-in-ios-pwa) — specialist QR vendor corroboration
- [github.com/mebjas/html5-qrcode/issues/713](https://github.com/mebjas/html5-qrcode/issues/713) — iOS PWA camera failure community confirmation
- [OpenAI community — Vision cost thread](https://community.openai.com/t/cost-of-vision-using-gpt-4o/775002) — community-verified vision token pricing
- [cookieyes.com — IP as personal data under GDPR](https://www.cookieyes.com/blog/ip-address-personal-data-gdpr/) — GDPR analysis corroborated by EC 2025 clarification
- [Web Scraping GDPR 2025 enforcement](https://medium.com/deep-tech-insights/web-scraping-in-2025-the-20-million-gdpr-mistake-you-cant-afford-to-make-07a3ce240f4f) — robots.txt + DSA enforcement context
- [roboflow.com — Tesseract vs GPT-4o accuracy](https://roboflow.com/compare/tesseract-vs-gpt-4o) — OCR accuracy comparison confirming ~60-70% Tesseract accuracy on menu photos
- [zenrows.com — Playwright on Vercel](https://www.zenrows.com/blog/playwright-vercel) — function size limit corroboration
- [github.com/yudielcurbelo/react-qr-scanner](https://github.com/yudielcurbelo/react-qr-scanner) — `@yudiel/react-qr-scanner` v2.5.1 maintenance status
- Direct HTTP fetch of test menu URL (https://menu.eazee-link.com/?id=E7FNRP0ET3&o=q) — confirmed JavaScript SPA, Cheerio cannot parse it

### Tertiary (LOW confidence — needs validation)
- Screenshot API vendor comparison (Screenshotone, APIFlash, Browserless) — not evaluated; needs Phase 2 validation before architecture lock
- Yelp Fusion API / Google Places Photos Strasbourg market coverage — not verified; needs Phase 8 validation
- Web scraping legality for menu data specifically — general GDPR/DSA analysis applies, but no case law specific to restaurant menu aggregation

---

*Research completed: 2026-02-25*
*Ready for roadmap: yes*
