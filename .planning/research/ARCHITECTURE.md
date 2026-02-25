# Architecture Research

**Domain:** Food-tech mobile app + marketing landing page (menu translation/recommendation)
**Researched:** 2026-02-25
**Confidence:** MEDIUM-HIGH

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PHASE 1: Landing Page (Vercel)                  │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────────┐  │
│  │  Next.js App   │  │  Waitlist API  │  │  Email (Resend)      │  │
│  │  (marketing)   │  │  Route Handler │  │  Confirmation flow   │  │
│  └────────────────┘  └───────┬────────┘  └──────────────────────┘  │
│                               │                                      │
│                        ┌──────▼──────┐                              │
│                        │  Supabase   │  (waitlist table)            │
│                        └─────────────┘                              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     PHASE 2: Mobile App + Backend                   │
│                                                                     │
│  CLIENT (React Native / Expo)                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  Scan Screen │  │  Dish Cards  │  │  Taste       │             │
│  │  (QR/URL/    │  │  (translate/ │  │  Profile /   │             │
│  │   Photo)     │  │   illustr.)  │  │  History     │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         └─────────────────┴─────────────────┘                      │
│                            │ REST/HTTPS                             │
├────────────────────────────┼────────────────────────────────────────┤
│  API LAYER (Next.js Route  │ Handlers or Supabase Edge Functions)   │
│  ┌──────────────┐  ┌───────┴──────┐  ┌──────────────┐             │
│  │  /scan       │  │  /recommend  │  │  /search     │             │
│  │  (ingest)    │  │  (LLM)       │  │  (reverse)   │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         └─────────────────┴─────────────────┘                      │
│                            │                                        │
├────────────────────────────┼────────────────────────────────────────┤
│  PROCESSING PIPELINE                                                │
│  ┌──────────────┐  ┌───────┴──────┐  ┌──────────────┐             │
│  │  Ingestion   │  │  LLM         │  │  Cache       │             │
│  │  (scrape /   │  │  Orchestrat. │  │  Layer       │             │
│  │   OCR)       │  │  (translate/ │  │  (Redis /    │             │
│  └──────┬───────┘  │   recommend) │  │   Upstash)   │             │
│         │          └──────┬───────┘  └──────────────┘             │
│         │                 │                                         │
├─────────┼─────────────────┼──────────────────────────────────────── │
│  DATA LAYER               │                                         │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────────────┐             │
│  │  Supabase    │  │  pgvector    │  │  Supabase    │             │
│  │  PostgreSQL  │  │  (embeddings │  │  Storage     │             │
│  │  (menus,     │  │   for reverse│  │  (dish       │             │
│  │   users,     │  │   search)    │  │   images)    │             │
│  │   sessions)  │  └──────────────┘  └──────────────┘             │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Landing Page | Marketing, waitlist capture, animations | Next.js 15 on Vercel, Framer Motion |
| Waitlist API | Email collection, dedup, confirmation | Next.js Route Handler + Resend + Supabase |
| Scan Screen | QR decode, URL input, photo capture | Expo Camera, expo-barcode-scanner |
| Ingestion Service | URL fetch → parse HTML/JSON-LD/PDF → normalize menu | Node.js scraper + Playwright (headless) + Tesseract / Google Vision OCR |
| Menu Store | Normalized menu items keyed by restaurant+language | PostgreSQL (menus, menu_items, restaurants tables) |
| LLM Orchestrator | Translation, cultural explanation, Top 3 recs, reverse search | Structured prompt pipeline, item_id grounding |
| Cache Layer | Deduplicate LLM calls; exact + semantic cache | Upstash Redis (exact match) + pgvector semantic similarity |
| Dish Cards UI | Render translated/illustrated cards, confidence badges | React Native, react-native-fast-image |
| Image Service | Progressive image strategy: gradient+emoji → web → community | Supabase Storage + CDN |
| Taste Profile | Per-user preferences, favorite tags | Supabase row, synced via Supabase Realtime |
| Auth | Layered: anonymous session → light account → social | Supabase Auth (magic link / OAuth) |

---

## Recommended Project Structure

```
nomnomnom/
├── apps/
│   ├── landing/                # Next.js 15 — Phase 1
│   │   ├── app/
│   │   │   ├── page.tsx        # Hero, waitlist form, animations
│   │   │   └── api/
│   │   │       └── waitlist/
│   │   │           └── route.ts  # Email capture endpoint
│   │   └── components/
│   └── mobile/                 # Expo / React Native — Phase 2
│       ├── app/                # Expo Router (file-based)
│       │   ├── (tabs)/
│       │   │   ├── scan.tsx
│       │   │   ├── history.tsx
│       │   │   └── profile.tsx
│       │   └── menu/[id].tsx   # Dish cards screen
│       ├── components/
│       │   ├── DishCard.tsx
│       │   ├── ConfidenceBadge.tsx
│       │   └── ProgressiveImage.tsx
│       └── services/
│           ├── api.ts          # typed fetch wrappers
│           └── cache.ts        # local AsyncStorage cache
├── packages/
│   ├── shared-types/           # TS interfaces (MenuItem, Restaurant, etc.)
│   └── shared-ui/              # Optional: shared design tokens
├── supabase/
│   ├── migrations/             # SQL migration files
│   └── functions/              # Edge Functions (scan, recommend, search)
│       ├── scan/
│       │   └── index.ts
│       ├── recommend/
│       │   └── index.ts
│       └── reverse-search/
│           └── index.ts
└── turbo.json                  # Turborepo task graph
```

### Structure Rationale

- **apps/landing vs apps/mobile:** Independent deployments, no coupling. Landing deploys to Vercel Day 1; mobile ships to App Store when ready.
- **supabase/functions/:** Co-locating Edge Functions with the DB keeps the backend close to data, reducing round-trips. Deno TypeScript first. Scales automatically.
- **packages/shared-types/:** Single source of truth for `MenuItem`, `Restaurant`, `ScanResult` interfaces — prevents drift between landing, mobile, and API.
- **supabase/migrations/:** Version-controlled schema, enables reproducible environments and safe CI deploys.

---

## Architectural Patterns

### Pattern 1: Layered Menu Ingestion Pipeline

**What:** A sequential pipeline that handles diverse input types (QR → URL, direct URL, photo) and normalizes to a single canonical `ParsedMenu` structure before any LLM call.
**When to use:** Every scan entry point funnels through this pipeline before hitting the LLM.
**Trade-offs:** Adds latency on first scan (~3-8s), but separates parsing complexity from LLM concerns and makes each stage independently testable.

```typescript
// supabase/functions/scan/index.ts
type ScanInput =
  | { type: "url"; url: string }
  | { type: "photo"; base64: string };

async function ingestMenu(input: ScanInput): Promise<ParsedMenu> {
  // Stage 1: Resolve URL or run OCR
  const rawText = input.type === "url"
    ? await fetchAndExtract(input.url)   // HTML → JSON-LD → fallback scrape
    : await runOCR(input.base64);        // Google Vision / VLM

  // Stage 2: Normalize to canonical structure
  const normalized = await normalizeMenu(rawText); // LLM structured extraction

  // Stage 3: Persist (idempotent by URL hash / content hash)
  return await upsertMenu(normalized);
}
```

### Pattern 2: item_id-Grounded LLM Recommendations

**What:** The LLM receives the full list of `menu_item` records (with their IDs) and is instructed to return only `item_id` references. Never free-text item names. This is the anti-hallucination contract.
**When to use:** Every call to `/recommend` and `/reverse-search`.
**Trade-offs:** Slightly more prompt complexity; eliminates hallucinated dish names entirely.

```typescript
// supabase/functions/recommend/index.ts
async function getRecommendations(menuId: string, userProfile: TasteProfile) {
  const items = await db.query<MenuItem>(
    "SELECT id, name, description, tags FROM menu_items WHERE menu_id = $1",
    [menuId]
  );

  const prompt = `
You are a food guide. From the following menu items, select the top 3 for this user.
IMPORTANT: Return ONLY item_id values from the list below. Do not invent items.

Menu items:
${JSON.stringify(items.map(i => ({ id: i.id, name: i.name, tags: i.tags })))}

User preferences: ${JSON.stringify(userProfile)}

Return JSON: { "recommendations": ["<item_id>", "<item_id>", "<item_id>"] }
  `;

  const result = await llm.complete(prompt, { response_format: { type: "json_object" } });
  const { recommendations } = JSON.parse(result);

  // Validate: every returned ID must exist in items
  const validIds = new Set(items.map(i => i.id));
  return recommendations.filter((id: string) => validIds.has(id));
}
```

### Pattern 3: Two-Tier Cache (Exact + Semantic)

**What:** Check exact URL/content hash first (sub-millisecond Redis hit). On miss, check semantic similarity via pgvector embeddings for "close enough" cached results. Only call the LLM on full cache miss.
**When to use:** All LLM orchestrator calls.
**Trade-offs:** Adds ~50ms for embedding lookup on semantic check; saves ~0.14€ per avoided LLM call.

```typescript
async function cachedLLMCall(cacheKey: string, prompt: string): Promise<string> {
  // Tier 1: exact match
  const exact = await redis.get(cacheKey);
  if (exact) return exact;

  // Tier 2: semantic similarity (pgvector)
  const embedding = await embed(prompt);
  const similar = await db.query(
    "SELECT response FROM llm_cache ORDER BY embedding <=> $1 LIMIT 1",
    [embedding]
  );
  if (similar.rows[0] && cosineSim(embedding, similar.rows[0].embedding) > 0.97) {
    return similar.rows[0].response;
  }

  // Tier 3: LLM call + store both caches
  const response = await llm.complete(prompt);
  await redis.setex(cacheKey, 86400, response);
  await db.query(
    "INSERT INTO llm_cache (key, prompt, response, embedding) VALUES ($1, $2, $3, $4)",
    [cacheKey, prompt, response, embedding]
  );
  return response;
}
```

### Pattern 4: Progressive Image Hydration

**What:** Render dish cards immediately with gradient + emoji placeholder. Attempt web image fetch in background. Accept community photo uploads. Never block the UI on image availability.
**When to use:** All `DishCard` renders.
**Trade-offs:** Users always see content instantly; image quality improves asynchronously.

```typescript
// components/DishCard.tsx — simplified
function DishCard({ item }: { item: MenuItem }) {
  const [imageSource, setImageSource] = useState<"placeholder" | "web" | "community">("placeholder");

  useEffect(() => {
    if (item.communityImageUrl) { setImageSource("community"); return; }
    if (item.webImageUrl) { setImageSource("web"); return; }
    // fallback: gradient+emoji — already rendered
  }, [item]);

  return (
    <View style={[styles.card, { backgroundColor: item.gradientColor }]}>
      {imageSource === "placeholder" && <Text style={styles.emoji}>{item.emoji}</Text>}
      {imageSource !== "placeholder" && (
        <ProgressiveImage uri={imageSource === "community" ? item.communityImageUrl : item.webImageUrl} />
      )}
      <ConfidenceBadge level={item.confidenceLevel} />
    </View>
  );
}
```

---

## Data Flow

### Request Flow: First Menu Scan (cache miss)

```
User opens camera / pastes URL
    |
    v
[Expo app] — POST /scan { url or base64 } ──────────────────────>
                                                [Supabase Edge: scan]
                                                    |
                                                    v
                                            Check URL hash in Redis
                                                    |
                                              Cache MISS
                                                    |
                                                    v
                                        Fetch URL (Playwright/fetch)
                                        OR run OCR (Google Vision)
                                                    |
                                                    v
                                        Parse: JSON-LD schema.org first
                                        → fallback: HTML scrape
                                        → fallback: LLM structured extract
                                                    |
                                                    v
                                        Normalize → upsert PostgreSQL
                                        (restaurants + menu_items tables)
                                                    |
                                                    v
                                            POST /recommend
                                                    |
                                                    v
                                        LLM call (item_id grounded)
                                        Store result in Redis + pgvector
                                                    |
    <─── ParsedMenu + recommendations ──────────────
    |
    v
Render DishCards (gradient+emoji immediately)
Background: fetch web images
```

### Request Flow: Repeat Scan (cache hit)

```
User scans same restaurant
    |
    v
[Expo app] — POST /scan { url }
                    |
                    v
            Redis key: sha256(url) → HIT (~1ms)
                    |
                    v
            Return cached ParsedMenu + cached recommendations
                    |
    <───────────────
    |
Render DishCards — total latency ~200ms vs ~4-8s on first scan
```

### State Management (Client)

```
[Zustand Store]
    |
    |── scanHistory[]      (local + synced to Supabase for Layer 1 accounts)
    |── currentMenu        (active ParsedMenu)
    |── tasteProfile       (synced to Supabase for Layer 1 accounts)
    |── aiQuestionCount    (rate-limit counter, resets daily — Layer 0)
    |
[Components] ← subscribe to slices → [Actions] → [Store mutations]
```

### Key Data Flows

1. **Waitlist flow (Phase 1):** Form submit → Next.js Route Handler → Supabase `waitlist` table → Resend confirmation email. Rate-limited via Upstash Redis (1 signup per email per hour).
2. **Scan ingestion (Phase 2):** QR/URL/photo → Edge Function → parse pipeline → PostgreSQL upsert → LLM recommendations → Redis cache → mobile client.
3. **Translation flow:** Menu items stored in source language. On first request for a target locale, LLM translates + explains. Result stored in `menu_item_translations` table keyed by `(item_id, locale)`. Subsequent requests for same locale served from DB — no LLM call.
4. **Reverse search flow:** User describes craving in natural language → embed query → pgvector similarity search across `menu_item_translations.embedding` → return matching items with confidence score.
5. **Account sync (Layer 1):** Anonymous session data (history, favorites) migrated on account creation via Supabase `link_anonymous_user` flow.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Single Supabase project, Upstash free tier Redis, Vercel hobby. Supabase Edge Functions handle all backend. LLM cost covered by caching — estimate <50€/month. |
| 1k-100k users | Upgrade Supabase to Pro. Add Upstash Redis paid tier. Enable Supabase read replicas for menu queries. Add rate-limiting per-user at Edge Function level. Consider moving OCR to dedicated worker (e.g. Modal.com) to avoid Edge Function timeout limits. |
| 100k+ users | Separate ingestion workers from recommendation API. Add dedicated image CDN (Cloudflare R2). Consider pgvector → dedicated vector DB (Qdrant) if embedding table exceeds 10M rows. Split mobile API from landing domain. |

### Scaling Priorities

1. **First bottleneck: LLM API cost** — hits at ~1k DAU without caching. Prevention: two-tier cache from day one. Target: >90% cache hit rate for repeat restaurants.
2. **Second bottleneck: Ingestion latency** — Playwright/Puppeteer is CPU-heavy. Supabase Edge has 2s wall clock limit, which is insufficient for heavy scraping. Fix: offload to background job queue (Supabase pg_cron or BullMQ on Railway) and return a `scanId` for polling.

---

## Anti-Patterns

### Anti-Pattern 1: Free-Text LLM Dish Name Returns

**What people do:** Prompt says "recommend dishes" and accept LLM free-text response like "the pasta primavera." Parse out dish names and try to match to menu items.
**Why it's wrong:** LLM hallucinates dish names, misspells them, or combines items. Matching logic fails silently. Users see recommendations for dishes not on the menu.
**Do this instead:** Ground all recommendation prompts with the full `menu_items` list including IDs. Instruct LLM to return only `item_id` values. Validate every returned ID against the actual menu before displaying.

### Anti-Pattern 2: Calling OCR and LLM on Every Scan

**What people do:** Every scan triggers: OCR call + LLM parse + LLM translate + LLM recommend. No deduplication.
**Why it's wrong:** A single popular restaurant gets 1000 users scanning it. Each scan costs ~0.15€. Total: 150€ for one restaurant. At scale this becomes the dominant cost.
**Do this instead:** Hash the URL (or image content hash for photos). Check Redis before every pipeline stage. Store all LLM outputs in PostgreSQL keyed by `(restaurant_id, locale)`. Serve from cache for all subsequent requests.

### Anti-Pattern 3: Parsing HTML with Regex Directly

**What people do:** Regex patterns to extract menu sections from restaurant HTML. Works for 3 sites. Breaks on update #4.
**Why it's wrong:** Restaurant websites are wildly heterogeneous. Maintenance becomes a full-time job. Parser breaks silently (returns empty menu).
**Do this instead:** Use a priority cascade — (1) schema.org JSON-LD (`MenuItem` type) — works for ~30% of modern sites; (2) `window.__PRELOADED_STATE__` extraction for SPA menus (Zomato, Yelp patterns); (3) Generic LLM-based structured extraction from visible text as the fallback. Log which parser succeeded per domain to improve over time.

### Anti-Pattern 4: Anonymous Session Data Silently Lost

**What people do:** Layer 0 anonymous users generate history. On account creation (Layer 1), a new session is created. Old data gone. User feels punished for signing up.
**Why it's wrong:** Reduces Layer 1 conversion. Erodes trust.
**Do this instead:** Generate a device-local UUID on first launch. Store scan history in Supabase with `anonymous_id`. On account creation, call `supabase.auth.linkAnonymousUser()` or run a migration query: `UPDATE scans SET user_id = $new_user_id WHERE anonymous_id = $device_id`.

### Anti-Pattern 5: Blocking UI on Image Loading

**What people do:** DishCard waits for web image fetch before rendering. Slow network = blank card = perceived app failure.
**Why it's wrong:** First impression is blank white squares. Users abandon.
**Do this instead:** Render gradient+emoji immediately on card mount. Images are enhancement, not prerequisites. Use `react-native-fast-image` with `onLoad`/`onError` transitions.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| OpenAI / Anthropic (LLM) | REST API via Edge Function, structured JSON output | Always use `response_format: json_object`. Set max_tokens budget. Cache all responses. |
| Google Cloud Vision (OCR) | REST API, base64 image upload | Used only for photo menus. Fallback: open-source VLM (PaddleOCR) for cost control at scale. |
| Resend (email) | REST API from Next.js Route Handler and Edge Functions | Waitlist confirmation + future notification flows. |
| Upstash Redis (cache) | REST SDK (`@upstash/redis`) | Serverless-compatible. Use for exact-match LLM cache + rate limiting. |
| Expo (mobile distribution) | EAS Build + Submit | OTA updates via Expo Updates for non-native changes. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Mobile app ↔ Supabase Edge Functions | HTTPS REST + Supabase Auth JWT | Mobile sends Bearer token; Edge validates via `supabase.auth.getUser()` |
| Landing page ↔ Supabase | Supabase JS client (server-side in Route Handlers) | Only `waitlist` table needed for Phase 1 |
| Edge Functions ↔ PostgreSQL | Supabase internal `supabase-js` (no external round-trip) | Runs in same region as DB — low latency |
| Ingestion pipeline ↔ LLM | Direct REST call from Edge Function | Wrap in retry logic (3 attempts, exponential backoff) |
| Edge Functions ↔ Redis | `@upstash/redis` REST SDK | HTTP-based, compatible with Deno runtime |

---

## Build Order Implications

The dependency graph drives phase ordering:

```
Phase 1: Landing Page
  └── Supabase project setup (waitlist table)
  └── Next.js landing app
  └── Waitlist API + Resend email
  └── Vercel deploy
       |
       v (no dependency on Phase 2)

Phase 2a: Data Foundation (must come first within Phase 2)
  └── PostgreSQL schema (restaurants, menus, menu_items, menu_item_translations)
  └── Supabase Auth setup (anonymous + magic link)
  └── Shared types package
       |
       v

Phase 2b: Ingestion Pipeline (depends on 2a schema)
  └── URL fetch + JSON-LD parser
  └── OCR integration (Google Vision)
  └── LLM structured extraction fallback
  └── Two-tier cache (Redis + pgvector)
       |
       v

Phase 2c: LLM Orchestration (depends on 2b normalized menu)
  └── Translation pipeline (per item, per locale)
  └── item_id-grounded recommendations
  └── Reverse search (embedding + pgvector)
       |
       v

Phase 2d: Mobile UI (depends on 2b + 2c APIs)
  └── Scan screen
  └── DishCard component + progressive images
  └── Confidence badges
  └── AI question quota (Layer 0)
       |
       v

Phase 2e: Account Layers (depends on 2d working anonymously)
  └── Layer 1: account creation + history migration
  └── Taste Profile
  └── Layer 2: social features (Stories, Match Score)
```

Phases 1 and 2a can run in parallel. Never build UI (2d) before the API contracts are stable (2b + 2c) — mobile UI changes are expensive.

---

## Sources

- [schema.org Menu / MenuItem types](https://schema.org/Menu) — HIGH confidence, official spec
- [Supabase Edge Functions architecture](https://supabase.com/docs/guides/functions/architecture) — HIGH confidence, official docs
- [Redis semantic caching for LLMs](https://redis.io/blog/what-is-semantic-caching/) — HIGH confidence, official Redis blog
- [LiteLLM caching system architecture](https://deepwiki.com/BerriAI/litellm/5.1-caching-system-architecture) — MEDIUM confidence
- [Upstash Redis LLM token optimization](https://redis.io/blog/llm-token-optimization-speed-up-apps/) — HIGH confidence
- [Turborepo + React Native + Next.js monorepo](https://vercel.com/templates/next.js/turborepo-react-native) — HIGH confidence, official Vercel template
- [Expo documentation](https://expo.dev/) — HIGH confidence, official docs
- [PaddleOCR / open-source OCR models 2025](https://www.e2enetworks.com/blog/complete-guide-open-source-ocr-models-2025) — MEDIUM confidence
- [OCR pipeline: VLMs replacing traditional OCR](https://intuitionlabs.ai/articles/non-llm-ocr-technologies) — MEDIUM confidence
- [react-native-fast-image progressive loading](https://medium.com/@harshitkishor2/supercharge-your-apps-image-performance-with-react-native-fast-image-3e9e1a74c141) — MEDIUM confidence
- [Vercel waitlist template (Next.js + Supabase + Resend + Upstash)](https://vercel.com/templates/saas/waitly) — HIGH confidence

---

*Architecture research for: NOM — restaurant menu translation and recommendation app*
*Researched: 2026-02-25*
