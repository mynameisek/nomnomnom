# Architecture Research

**Domain:** Intelligence layer integration — dish enrichment, canonical names, reverse search, AI Top 3 into existing Next.js 16 + Supabase app
**Researched:** 2026-02-28
**Confidence:** HIGH (existing codebase read in full; pgvector/Supabase patterns verified via official docs; Next.js `after()` verified via official docs; OpenAI embedding pricing verified via official pricing page)

---

## Context: What Already Exists (v1.1 baseline)

The codebase is a **Next.js 16.1.6 App Router + Supabase** app with:

- `app/menu/[id]/page.tsx` — Server Component, reads `menus` + `menu_items` via anon Supabase client
- `app/api/scan/url` and `app/api/scan/photo` — Route Handlers: URL/photo → LLM parse → Supabase upsert
- `app/api/translate` — lazy on-demand translation per language via free-tier cascade
- `lib/openai.ts` — `parseDishesFromMenuFast()` + `translateEazeeLinkDishes()` with AI SDK 6 structured output (`generateText` + `Output.object()`, Zod v3 pinned)
- `lib/cache.ts` — `getOrParseMenu()` orchestrator, SHA-256 url_hash cache key
- `lib/google-places.ts` — `enrichWithGooglePlaces()` called via `after()` (fire-and-forget post-response)
- `components/menu/MenuShell.tsx` — `'use client'` shell wrapping `DishCard`, `FilterBar`, `LangSwitcher`, `MenuAccordion`
- `hooks/useFilteredDishes.ts` — client-side in-memory filter (search + category + dietary + allergen)
- **Tables:** `menus` (url_hash, restaurant_name, google_place_*, category_translations), `menu_items` (name_original, name_translations, description_translations, allergens, dietary_tags, category, subcategory, sort_order), `admin_config`

The v1.1 Google Places enrichment pattern (`after()` fire-and-forget background task updating a menus row post-response) is the exact model to reuse for dish enrichment.

---

## System Overview: v1.2 Intelligence Layer Additions

```
┌─────────────────────────────────────────────────────────────────────┐
│                     BROWSER (Client Components)                      │
│                                                                      │
│  MenuShell (existing)          ReverseSearchPage (new)               │
│  ├── DishCard (MODIFIED)       ├── ReverseSearchInput (new)          │
│  │   └── enrichment badge      └── ReverseSearchResults (new)        │
│  ├── Top3Panel (NEW)                                                  │
│  │   └── calls /api/top3                                             │
│  └── (existing filter/lang unchanged)                                │
└──────────────┬──────────────────────────┬───────────────────────────┘
               │ fetch                    │ fetch
┌──────────────▼──────────────────────────▼───────────────────────────┐
│                     NEXT.JS API LAYER                                │
│                                                                      │
│  /api/scan/url (MODIFIED)    /api/top3 (NEW)   /api/search (NEW)    │
│  └── after() → enrich        └── LLM call      └── pgvector RPC     │
│                                   grounded          similarity       │
│                                   to menu_items     search           │
│                                                                      │
│  lib/openai.ts (MODIFIED)    lib/enrichment.ts (NEW)                │
│  └── getTop3()               └── enrichDish()                       │
│  └── embedText()             └── generateEmbedding()                │
└──────────────┬──────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────────┐
│                     SUPABASE / POSTGRESQL                            │
│                                                                      │
│  menus (existing)       menu_items (MODIFIED)   dish_enrichments    │
│                         └── embedding vector(1536)  (NEW table)     │
│                         └── canonical_name text     └── dish lookup │
│                         └── enrichment_status text     knowledge    │
│                         └── cultural_context text                    │
│                                                                      │
│  pgvector extension (ENABLE)                                         │
│  └── HNSW index on menu_items.embedding (cosine)                    │
│  └── match_dishes() RPC function for similarity search              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Question 1: Where Does Enrichment Happen?

**Decision: Async post-scan, using the existing `after()` pattern.**

The `after()` pattern is already proven in the codebase for Google Places enrichment. The same mechanism applies here: scan completes, response returns `{ menuId }` immediately, then `after()` triggers `enrichMenuItems(menuId)` as a background task.

**Why not inline (during scan):**
- Scan already runs 3-15s (URL fetch + LLM parse). Adding per-dish LLM enrichment inline would add 5-30s latency for a menu with 30+ dishes.
- Users are redirected to `/menu/[id]` after scan. Enrichment data appearing 10-30s later (progressive enhancement) is acceptable and already the pattern for Google Places.
- Vercel function timeout risk: inline enrichment could push scan route over `maxDuration = 120`.

**Why `after()` over a queue:**
- No queue infrastructure needed (no Inngest, no Upstash QStash, no Vercel Cron).
- `after()` extends the serverless function lifetime after the response — exact use case per Next.js docs.
- For v1.2 scope (small menus, moderate traffic), `after()` is sufficient. A queue is a v1.3+ concern if enrichment volume exceeds Vercel function limits.

**Enrichment flow:**

```
POST /api/scan/url
    |
    v
getOrParseMenu() → returns MenuWithItems (unchanged from v1.1)
    |
    v
return NextResponse.json({ menuId })  ← user gets response here
    |
    v
after(async () => {
  await enrichMenuItems(menu.id, menu.menu_items)
})
    |
    v
enrichMenuItems():
  - for each item: generateEmbedding(name_original + description_original)
  - call enrichDish() LLM → { canonical_name, cultural_context }
  - UPDATE menu_items SET embedding = ..., canonical_name = ...,
    cultural_context = ..., enrichment_status = 'done'
    WHERE id = item.id
```

**Progressive enhancement on `/menu/[id]`:**
- On first load, `enrichment_status` is null → DishCard renders without enrichment badge
- Client polls `/api/enrich/status?menuId=X` (lightweight SELECT) or uses Supabase Realtime subscription
- When enrichment completes, enrichment badges appear on DishCards without page reload
- Simpler alternative: just reload once 15s after scan. The enrichment completes within that window for typical menus.

---

## Question 2: Canonical Names — New Table or Column?

**Decision: Column on `menu_items`, not a separate dishes knowledge base.**

A separate `dish_knowledge` table (shared canonical dishes across all menus) is the "right" long-term architecture but introduces complexity that isn't needed for v1.2:
- Deduplication logic across menus is non-trivial (same dish, different restaurants, different spellings)
- No user-facing feature requires cross-menu canonical resolution in v1.2
- The column approach is simpler and fully reversible — the column can be migrated to a FK later

**New columns on `menu_items`:**

```sql
ALTER TABLE menu_items
  ADD COLUMN canonical_name       text,        -- normalized dish name (e.g. "Tarte Flambée" for "Flammekueche")
  ADD COLUMN cultural_context     text,        -- short English note, e.g. "Alsatian thin-crust pizza"
  ADD COLUMN enrichment_status    text,        -- null | 'pending' | 'done' | 'error'
  ADD COLUMN embedding            vector(1536); -- text-embedding-3-small output
```

`cultural_context` already exists as a field in `translateEazeeLinkDishes()` (stored inside `description_translations` as a parenthetical). The v1.2 enrichment gives it a proper dedicated column, decoupled from translations.

**Why `vector(1536)`:** OpenAI `text-embedding-3-small` produces 1536-dimensional vectors. At $0.02/1M tokens, embedding a dish name + description (~15-30 tokens) costs ~$0.0000004 per dish — negligible. `text-embedding-3-large` (3072 dims) offers marginal improvement for 5x the cost; not justified here.

---

## Question 3: Reverse Search — How to Implement?

**Decision: pgvector semantic search via Supabase RPC function.**

Three options evaluated:

| Option | Approach | Verdict |
|--------|----------|---------|
| Client-side full-text search | `useFilteredDishes` in-memory substring match | Already exists for exact text. Cannot handle "boulettes sauce yaourt" → "Yogurtlu Köfte". |
| Supabase `pg_trgm` trigram search | `similarity()` on `name_original + description_original` | Good for typos and partial matches. Poor for semantic/cross-lingual queries ("meatballs yogurt sauce" → Turkish dish). |
| pgvector semantic search | Embed query text → cosine similarity vs `menu_items.embedding` | Handles cross-lingual, semantic, descriptive queries. The `ReverseSearch` landing section already demos this exact UX. |

**Use pgvector.** The existing `ReverseSearch.tsx` demo (hardcoded results) reveals the intended UX. The query "boulettes sauce yaourt turquie" should return Turkish dishes by semantic match. Only embeddings handle this correctly.

**Implementation:**

PostgREST does not support pgvector operators directly (no `<=>` in `.filter()`). Wrap in a Postgres function called via `.rpc()` — the standard Supabase pgvector pattern.

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- HNSW index for fast cosine search (recommended over IVFFlat for dynamic data)
CREATE INDEX ON menu_items
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- RPC function for similarity search
CREATE OR REPLACE FUNCTION match_dishes(
  query_embedding  vector(1536),
  match_threshold  float DEFAULT 0.3,
  match_count      int   DEFAULT 10
)
RETURNS TABLE (
  id               uuid,
  menu_id          uuid,
  name_original    text,
  canonical_name   text,
  cultural_context text,
  name_translations jsonb,
  description_original text,
  category         text,
  similarity       float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    mi.id,
    mi.menu_id,
    mi.name_original,
    mi.canonical_name,
    mi.cultural_context,
    mi.name_translations,
    mi.description_original,
    mi.category,
    1 - (mi.embedding <=> query_embedding) AS similarity
  FROM menu_items mi
  WHERE mi.embedding IS NOT NULL
    AND 1 - (mi.embedding <=> query_embedding) > match_threshold
  ORDER BY mi.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

**Scope of reverse search in v1.2:**
- Searches across ALL menu_items in the database (cross-menu, cross-restaurant)
- Returns dishes with their canonical names and cultural context
- Links back to the menu/restaurant where the dish appears
- The landing page `ReverseSearch.tsx` demo becomes functional by calling `/api/search`

---

## Question 4: Top 3 — Real-Time LLM or Cached?

**Decision: Real-time LLM call, grounded to menu_items UUIDs, per request (no cache).**

The existing v1.1 `ARCHITECTURE.md` (Phase 4 research) already established the correct pattern: item_id-grounded recommendations with UUID validation. v1.2 implements it.

**Why not cache:**
- Top 3 depends on user preference input (free-text: "quelque chose de chaud et consistant")
- Preference strings are unbounded — no practical cache key
- At typical usage (tens of requests/day), OpenAI cost per Top 3 call (~200 tokens in + 100 out with gpt-4o-mini) is ~$0.0001 — not worth the complexity of caching

**Why grounded to UUIDs:**
- LLM cannot hallucinate dishes that don't exist on this menu
- Every returned UUID is validated against the actual `menu_items` for this `menuId`
- Eliminates "dish sounds plausible but isn't on the menu" class of errors

**Schema (Zod):**

```typescript
// lib/types/llm.ts — add to existing file
export const top3Schema = z.object({
  recommendations: z.array(z.object({
    item_id: z.string().uuid(),
    reason: z.string().max(120),   // short explanation in user's language
  })).min(1).max(3),
});
```

**LLM prompt approach:**

```
System: You are a menu recommendation assistant.
        Given a list of dishes (with IDs) and a user preference,
        return 1-3 dishes that best match.
        Only return IDs from the provided list.
        Return reasons in the same language as the user preference.

User: Preference: "quelque chose de léger et végétarien"
      Menu items: [{ id: "uuid1", name: "Salade César", dietary_tags: ["vegetarian"] }, ...]
```

**Context sent to LLM:**
- Item fields: `id`, `name_original`, `canonical_name`, `category`, `dietary_tags`, `allergens`, `price`
- Do NOT send: `embedding`, `description_translations`, full translation maps (token waste)
- Truncate to 60 items max if menu is large (most restaurant menus are under 60 dishes)

---

## Question 5: Dish Images — Where to Store?

**Decision: Do not implement dish images in v1.2. Defer to v1.3.**

Reasons:
- No image source identified: Google Places `photo_ref` is for the restaurant exterior, not individual dishes
- Stock food photos (Unsplash, Pexels API) require per-dish matching — another LLM call per dish
- CDN storage (Supabase Storage or Cloudflare Images) adds infra cost and complexity disproportionate to value
- The `FoodImage` component in `components/ui/FoodImage.tsx` uses local static images — sufficient for landing page demos

If implemented in v1.3: store a `dish_image_url` column on `menu_items`, populate via a background task using Unsplash/Pexels API with the `canonical_name` as search query. Cache via Supabase Storage.

---

## New vs Modified: Complete Inventory

### New Files

| Path | Type | Purpose |
|------|------|---------|
| `app/api/top3/route.ts` | Route Handler (POST) | Accept `{ menuId, preference, lang }` → return Top 3 item_ids + reasons |
| `app/api/search/route.ts` | Route Handler (POST) | Accept `{ query }` → embed query → pgvector RPC → return matching dishes |
| `app/api/enrich/status/route.ts` | Route Handler (GET) | Accept `?menuId=X` → return `{ enrichmentStatus: 'pending'|'done' }` for polling |
| `app/search/page.tsx` | Server Component | Reverse search page shell (`/search` route) |
| `lib/enrichment.ts` | Server-only module | `enrichMenuItems(menuId, items)`: orchestrate LLM enrichment + embedding generation per item |
| `components/menu/Top3Panel.tsx` | Client Component | Preference input + renders Top 3 highlighted DishCards |
| `components/search/ReverseSearchShell.tsx` | Client Component | Full functional reverse search UI (input + results); replaces demo in landing `ReverseSearch.tsx` |
| `supabase/migrations/YYYYMMDDHHMMSS_intelligence_layer.sql` | SQL migration | Enable pgvector, add columns to menu_items, create HNSW index, create match_dishes() RPC |

### Modified Files

| Path | Change | Reason |
|------|--------|--------|
| `app/api/scan/url/route.ts` | Add `after(() => enrichMenuItems(menu.id, menu.menu_items))` after existing Google Places `after()` | Trigger async enrichment post-scan |
| `app/api/scan/photo/route.ts` | Same `after()` addition | Photo scan path also needs enrichment |
| `lib/openai.ts` | Add `getTop3()` function, add `generateEmbedding()` function | New LLM call patterns for Top 3 and embeddings |
| `components/menu/DishCard.tsx` | Add optional `canonical_name` + `cultural_context` display | Show enrichment data when available |
| `components/menu/MenuShell.tsx` | Mount `Top3Panel` component, pass `menuId` | Add Top 3 panel to menu view |
| `lib/types/llm.ts` | Add `top3Schema` Zod schema | Type-safe Top 3 LLM output |
| `lib/types/menu.ts` | Add `canonical_name`, `cultural_context`, `enrichment_status`, `embedding` fields to `MenuItem` interface | Reflect new DB columns in TypeScript |

### New Supabase Schema

```sql
-- Migration: enable pgvector + intelligence layer columns

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE menu_items
  ADD COLUMN canonical_name     text,
  ADD COLUMN cultural_context   text,
  ADD COLUMN enrichment_status  text DEFAULT NULL,  -- null | 'pending' | 'done' | 'error'
  ADD COLUMN embedding          vector(1536);

-- HNSW index for fast approximate nearest-neighbor search
-- cosine distance (vector_cosine_ops) is correct for normalized OpenAI embeddings
CREATE INDEX menu_items_embedding_hnsw_idx
  ON menu_items
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Partial index on enrichment_status for fast "pending enrichment" queries
CREATE INDEX menu_items_enrichment_pending_idx
  ON menu_items (menu_id)
  WHERE enrichment_status IS NULL OR enrichment_status = 'pending';

-- match_dishes RPC — called via supabase.rpc('match_dishes', { query_embedding, ... })
CREATE OR REPLACE FUNCTION match_dishes(
  query_embedding  vector(1536),
  match_threshold  float DEFAULT 0.3,
  match_count      int   DEFAULT 10
)
RETURNS TABLE (
  id                uuid,
  menu_id           uuid,
  name_original     text,
  canonical_name    text,
  cultural_context  text,
  name_translations jsonb,
  description_original text,
  category          text,
  similarity        float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    mi.id,
    mi.menu_id,
    mi.name_original,
    mi.canonical_name,
    mi.cultural_context,
    mi.name_translations,
    mi.description_original,
    mi.category,
    1 - (mi.embedding <=> query_embedding) AS similarity
  FROM menu_items mi
  WHERE mi.embedding IS NOT NULL
    AND 1 - (mi.embedding <=> query_embedding) > match_threshold
  ORDER BY mi.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

---

## Recommended Project Structure (additions only)

```
nomnomnom/
├── app/
│   ├── api/
│   │   ├── scan/              # EXISTING — modified to add after() enrichment
│   │   ├── translate/         # EXISTING — unchanged
│   │   ├── top3/
│   │   │   └── route.ts       # NEW — Top 3 recommendations endpoint
│   │   ├── search/
│   │   │   └── route.ts       # NEW — reverse search via pgvector
│   │   └── enrich/
│   │       └── status/
│   │           └── route.ts   # NEW — enrichment status polling
│   └── search/
│       └── page.tsx           # NEW — /search route (reverse search page)
├── components/
│   ├── menu/
│   │   ├── DishCard.tsx       # MODIFIED — show canonical_name, cultural_context
│   │   ├── MenuShell.tsx      # MODIFIED — add Top3Panel
│   │   └── Top3Panel.tsx      # NEW — preference input + Top 3 highlighted results
│   └── search/
│       └── ReverseSearchShell.tsx  # NEW — functional reverse search UI
├── lib/
│   ├── openai.ts              # MODIFIED — add getTop3(), generateEmbedding()
│   ├── enrichment.ts          # NEW — enrichMenuItems() orchestrator
│   └── types/
│       ├── llm.ts             # MODIFIED — add top3Schema
│       └── menu.ts            # MODIFIED — add canonical_name etc. to MenuItem
└── supabase/
    └── migrations/
        └── YYYYMMDDHHMMSS_intelligence_layer.sql  # NEW
```

---

## Architectural Patterns

### Pattern 1: Async Enrichment via `after()` (Mirror of Google Places Pattern)

**What:** After scan response is sent, background task enriches each menu_item with canonical name, cultural context, and embedding vector.
**When to use:** Any post-scan work that doesn't block the user response and is not needed for initial render.
**Trade-offs:** Background task runs in the same serverless invocation (extended lifetime via `waitUntil`). If the function is killed before enrichment completes (e.g., Vercel timeout), items remain at `enrichment_status = 'pending'`. A retry mechanism is a v1.3 concern.

```typescript
// app/api/scan/url/route.ts — modified section
const menu = await getOrParseMenu(url, 'url', rawText);

after(async () => {
  // Existing: Google Places enrichment
  await enrichWithGooglePlaces(menu.restaurant_name, url, menu.id);
  // New: Dish intelligence enrichment
  await enrichMenuItems(menu.id, menu.menu_items);
});

return NextResponse.json({ menuId: menu.id });
```

```typescript
// lib/enrichment.ts (new)
import 'server-only';
import { supabaseAdmin } from './supabase-admin';
import { generateEmbedding, enrichDish } from './openai';
import type { MenuItem } from './types/menu';

export async function enrichMenuItems(menuId: string, items: MenuItem[]): Promise<void> {
  // Mark all items as pending
  await supabaseAdmin
    .from('menu_items')
    .update({ enrichment_status: 'pending' })
    .eq('menu_id', menuId)
    .is('enrichment_status', null);

  // Process items in batches of 10 to avoid rate limits
  const BATCH_SIZE = 10;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (item) => {
      try {
        const textForEmbedding = [item.name_original, item.description_original]
          .filter(Boolean).join(' — ');
        const [embedding, enrichment] = await Promise.all([
          generateEmbedding(textForEmbedding),
          enrichDish(item.name_original, item.description_original, item.category),
        ]);
        await supabaseAdmin
          .from('menu_items')
          .update({
            embedding,
            canonical_name: enrichment.canonical_name,
            cultural_context: enrichment.cultural_context,
            enrichment_status: 'done',
          })
          .eq('id', item.id);
      } catch {
        await supabaseAdmin
          .from('menu_items')
          .update({ enrichment_status: 'error' })
          .eq('id', item.id);
      }
    }));
  }
}
```

### Pattern 2: pgvector Semantic Search via RPC

**What:** Client sends a natural-language query to `/api/search`. Server embeds query using `text-embedding-3-small`, calls `match_dishes()` Supabase RPC, returns ranked results.
**When to use:** Reverse search feature only. In-menu search (`useFilteredDishes`) stays as client-side substring match — it's faster and appropriate for within-menu lookup.
**Trade-offs:** Requires `embedding` column populated first (async enrichment must have completed). Results are empty if no items have been enriched yet. Show a loading/empty state when `embedding` IS NULL for all items in the searched menu.

```typescript
// app/api/search/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/openai';

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  const queryEmbedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc('match_dishes', {
    query_embedding: queryEmbedding,
    match_threshold: 0.3,
    match_count: 10,
  });

  if (error) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }

  return NextResponse.json({ results: data });
}
```

### Pattern 3: UUID-Grounded Top 3 (from v1.1 Phase 4 research, now implemented)

**What:** LLM receives menu items with their actual UUIDs. Returns only UUIDs. Every returned UUID is validated against the real item list before returning to client.
**When to use:** Top 3 recommendations exclusively. Never use free-text dish names in LLM output for this feature.
**Trade-offs:** Prompt includes all item IDs + names (~500-1500 tokens for typical menus). Completely eliminates hallucinated dishes. Latency: 1-3s per call with gpt-4o-mini.

```typescript
// lib/openai.ts — new function
export async function getTop3(
  menuItems: Pick<MenuItem, 'id' | 'name_original' | 'canonical_name' | 'category' | 'dietary_tags' | 'allergens' | 'price'>[],
  preference: string,
  userLang: string,
  model?: string,
): Promise<{ item_id: string; reason: string }[]> {
  const selectedModel = model ?? DEFAULT_LLM_MODEL;

  const itemList = menuItems.slice(0, 60).map(item => ({
    id: item.id,
    name: item.canonical_name ?? item.name_original,
    category: item.category,
    tags: item.dietary_tags,
    allergens: item.allergens,
    price: item.price,
  }));

  const { experimental_output: output } = await generateText({
    model: openai(selectedModel),
    output: Output.object({ schema: top3Schema }),
    system: `You are a menu recommendation assistant. Given menu items with IDs and a user preference,
             return 1-3 best matching dishes. Only return IDs from the provided list.
             Write reasons in ${userLang} language. Be concise (max 80 chars per reason).`,
    prompt: `Preference: "${preference}"\n\nMenu:\n${JSON.stringify(itemList, null, 2)}`,
  });

  // Validate all returned UUIDs exist in the actual menu
  const validIds = new Set(menuItems.map(i => i.id));
  return output.recommendations.filter(r => validIds.has(r.item_id));
}
```

### Pattern 4: `generateEmbedding()` as a Shared Utility

**What:** Single function in `lib/openai.ts` wraps OpenAI Embeddings API. Reused by both dish enrichment (batch, background) and search (single, real-time).
**When to use:** All embedding generation. Never call the Embeddings API endpoint directly from routes.
**Trade-offs:** text-embedding-3-small returns 1536-dim vectors. This is sufficient for semantic food/dish search. Do not use text-embedding-3-large (3072 dims) — marginal quality gain, 5x storage cost.

```typescript
// lib/openai.ts — new function
import OpenAI from 'openai';

const embeddingClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await embeddingClient.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8191), // model max input length
  });
  return response.data[0].embedding;
}
```

Note: The existing `lib/openai.ts` uses AI SDK 6 (`generateText` + `Output.object()`). The Embeddings API is not yet wrapped in AI SDK's OpenAI provider the same way. Use the `openai` npm package directly for embeddings — it is already installed as a peer dep of `@ai-sdk/openai`.

---

## Data Flow

### Flow 1: Enrichment (background, post-scan)

```
POST /api/scan/url → getOrParseMenu() → return { menuId }
    |
    └── after() runs:
          enrichWithGooglePlaces()           (existing)
          enrichMenuItems(menuId, items)     (new)
              |
              ├── mark items enrichment_status = 'pending'
              |
              └── for each item (batched):
                    generateEmbedding(name + description) → vector(1536)
                    enrichDish(name, desc, category) → { canonical_name, cultural_context }
                    UPDATE menu_items SET embedding, canonical_name,
                                         cultural_context, enrichment_status = 'done'
```

### Flow 2: Top 3 Recommendations (real-time per request)

```
User types preference in Top3Panel → click "Recommander"
    |
    v
POST /api/top3 { menuId, preference, lang }
    |
    v
SELECT menu_items WHERE menu_id = menuId (id, name_original, canonical_name,
                                           category, dietary_tags, allergens, price)
    |
    v
getTop3(items, preference, lang) → LLM call → Zod-validated top3Schema output
    |
    v
Validate all returned UUIDs are in actual item list
    |
    v
Return [{ item_id, reason }] (1-3 items)
    |
    v
Top3Panel highlights matching DishCards in MenuShell (by item_id)
```

### Flow 3: Reverse Search (semantic, cross-menu)

```
User types query in ReverseSearchShell → "boulettes sauce yaourt turquie"
    |
    v
POST /api/search { query }
    |
    v
generateEmbedding(query) → vector(1536)
    |
    v
supabase.rpc('match_dishes', { query_embedding, match_threshold: 0.3, match_count: 10 })
    |
    v
Postgres: find menu_items WHERE embedding IS NOT NULL
          ORDER BY embedding <=> query_embedding
          LIMIT 10
    |
    v
Return [{ id, name_original, canonical_name, cultural_context, similarity, menu_id }]
    |
    v
ReverseSearchShell renders results with similarity scores + cultural context
Each result links to /menu/[menu_id]
```

### Flow 4: Enrichment Status Polling (client progressive enhancement)

```
/menu/[id] loads → MenuShell checks if any items have enrichment_status = null
    |
    ├── All enriched: render DishCards with canonical_name + cultural_context badges
    |
    └── Some null: render DishCards without badges, start polling
          |
          └── every 5s: GET /api/enrich/status?menuId=X
                |
                ├── { status: 'pending' }: continue polling
                └── { status: 'done' }: re-fetch menu_items, update DishCards
                    (simple setMenuData() update, no full page reload)
```

---

## Integration Points

### Modified API Routes

| Route | Change | Integration with Existing |
|-------|--------|--------------------------|
| `POST /api/scan/url` | Add `after(() => enrichMenuItems(...))` | Existing `after()` for Places already present — add second `after()` call |
| `POST /api/scan/photo` | Same `after()` addition | Mirror of URL route change |

### New API Routes

| Route | Inputs | Outputs | Notes |
|-------|--------|---------|-------|
| `POST /api/top3` | `{ menuId, preference, lang }` | `[{ item_id, reason }]` | Calls `getTop3()` from `lib/openai.ts` |
| `POST /api/search` | `{ query }` | `[{ id, name_original, canonical_name, cultural_context, similarity, menu_id }]` | Calls `generateEmbedding()` + Supabase RPC |
| `GET /api/enrich/status` | `?menuId=X` | `{ status: 'pending'|'done'|'error'|null }` | Reads `enrichment_status` from menu_items |

### New vs Modified Components

| Component | Status | Change |
|-----------|--------|--------|
| `DishCard.tsx` | MODIFIED | Show `canonical_name` (if differs from `name_original`), `cultural_context` as a small badge/tooltip |
| `MenuShell.tsx` | MODIFIED | Mount `<Top3Panel menuId={menu.id} items={menu.menu_items} />` |
| `Top3Panel.tsx` | NEW | `'use client'` — preference text input, submit button, calls `/api/top3`, highlights 3 DishCards by ID |
| `ReverseSearchShell.tsx` | NEW | `'use client'` — search input, debounced POST to `/api/search`, renders result list with similarity scores |

### New `lib/` Modules

| Module | Exports | Imports |
|--------|---------|---------|
| `lib/enrichment.ts` | `enrichMenuItems()` | `lib/openai.ts` (generateEmbedding, enrichDish), `lib/supabase-admin.ts` |
| `lib/openai.ts` (additions) | `generateEmbedding()`, `getTop3()`, `enrichDish()` | `openai` npm package (for embeddings), existing `ai` SDK (for getTop3/enrichDish) |

### RLS Considerations

- `menu_items.embedding` vector column: anon SELECT is allowed (existing public read policy covers all columns). No policy change needed.
- `match_dishes()` RPC: public function, no auth required. Add `SECURITY DEFINER` if cross-schema access is needed, but not required with current setup.
- `enrichMenuItems()` writes via `supabaseAdmin` (service role) — same pattern as all existing server-side writes.

---

## Suggested Build Order

Dependencies drive the order: DB schema must precede code; enrichment must precede search; search must precede the search page UI.

```
Step 1: DB Schema + Types (no visible features, ~1h)
  ├── SQL migration: CREATE EXTENSION vector, ALTER TABLE menu_items (4 new columns),
  │   CREATE INDEX hnsw, CREATE FUNCTION match_dishes()
  ├── Update MenuItem interface in lib/types/menu.ts (add 4 fields)
  └── Add top3Schema to lib/types/llm.ts
  Verify: migration applies cleanly, types compile

Step 2: generateEmbedding() + enrichDish() in lib/openai.ts (~1h)
  ├── generateEmbedding(text): call openai.embeddings.create() → number[]
  └── enrichDish(name, desc, category): LLM call → { canonical_name, cultural_context }
  Test: unit test with a real dish name, verify 1536-dim vector returned

Step 3: lib/enrichment.ts — enrichMenuItems() orchestrator (~1h)
  ├── Mark items pending → process in batches → update rows
  └── Error handling per item (don't fail whole menu if one dish errors)
  Test: call directly with a real menuId from Supabase dashboard, check columns populate

Step 4: Wire enrichment into scan routes (~30m)
  ├── Add after(() => enrichMenuItems(menu.id, menu.menu_items)) to /api/scan/url
  └── Same for /api/scan/photo
  Test: scan a fresh URL, wait 15-30s, check Supabase — embedding and canonical_name populated

Step 5: GET /api/enrich/status + DishCard enrichment display (~1h)
  ├── Route: SELECT enrichment_status FROM menu_items WHERE menu_id = ? GROUP
  │   Return aggregate: all done → 'done', any pending → 'pending'
  ├── DishCard: show cultural_context as a small italic badge below description
  └── MenuShell: poll /api/enrich/status every 5s until 'done', then re-fetch items
  Test: open /menu/[id] for a just-scanned menu, watch enrichment badges appear

Step 6: POST /api/top3 + Top3Panel component (~2h)
  ├── getTop3() in lib/openai.ts
  ├── /api/top3 route handler
  └── Top3Panel client component: text input, submit, highlight 3 DishCards by UUID
  Test: open a menu page, type a preference, verify 3 relevant dishes are highlighted

Step 7: POST /api/search + ReverseSearchShell (~2h)
  ├── /api/search route handler: embed query → rpc match_dishes → return results
  ├── ReverseSearchShell client component: search input + results list
  └── /search page route (Server Component shell wrapping ReverseSearchShell)
  Test: search "pasta with seafood", verify Italian dishes from scanned menus appear

Step 8: Wire ReverseSearch landing demo to real /search page (~30m)
  └── Update ReverseSearch.tsx landing section: typing animation stays,
      "Essayer" CTA links to /search
  (The demo remains animated/hardcoded — only the CTA becomes functional)
```

---

## Anti-Patterns

### Anti-Pattern 1: Inline Enrichment During Scan

**What people do:** Call `enrichMenuItems()` synchronously inside the scan Route Handler before returning `{ menuId }`.
**Why it's wrong:** For a 40-dish menu, 40 embedding calls + 40 enrichment LLM calls = 10-30s added to scan latency. Users experience a loading spinner that never ends. Likely triggers Vercel function timeout.
**Do this instead:** Use `after()`. Response returns in 3-8s (existing scan time). Enrichment happens in background. UI shows progressive enhancement when enrichment completes.

### Anti-Pattern 2: Using `pg_trgm` for Cross-Lingual Reverse Search

**What people do:** Add `similarity(name_original, 'boulettes yaourt')` to the dish search query.
**Why it's wrong:** Trigram similarity is character-based. "boulettes sauce yaourt" has 0 trigram overlap with "Yogurtlu Köfte". pg_trgm cannot bridge language or semantic gaps.
**Do this instead:** pgvector cosine similarity on embeddings. The `match_dishes()` RPC handles all of: typos, synonyms, cross-lingual queries, and descriptive queries ("creamy pasta" → carbonara).

### Anti-Pattern 3: Storing Embeddings Outside Postgres

**What people do:** Write embeddings to a separate vector database (Pinecone, Weaviate, Qdrant) while keeping other dish data in Supabase.
**Why it's wrong:** Creates a split-brain architecture: two systems to keep in sync, two billing accounts, two sets of backups. pgvector + Supabase is production-proven at moderate scale and eliminates this complexity entirely.
**Do this instead:** `vector(1536)` column directly on `menu_items`. HNSW index handles query performance. Supabase's managed Postgres handles backups, replication, and scaling.

### Anti-Pattern 4: Free-Text Dish Names in Top 3 LLM Output

**What people do:** Ask the LLM "recommend 3 dishes from this menu" and parse the returned dish names, then fuzzy-match back to database rows.
**Why it's wrong:** LLM will hallucinate dish names or return names that don't exactly match `name_original`. Fuzzy matching is brittle and fails on multilingual menus ("Flammekueche" vs "Tarte Flambée").
**Do this instead:** Ground the LLM to return only the UUIDs it received in the prompt. Validate every UUID against the actual `menu_items` set. This is the established pattern from Phase 4 research, now being implemented.

### Anti-Pattern 5: Embedding Every Language Variation

**What people do:** Generate separate embeddings for `name_original`, `name_translations.fr`, `name_translations.en`, etc. — one per language.
**Why it's wrong:** 4x storage cost, 4x embedding API cost, 4x background task time. OpenAI's `text-embedding-3-small` model was trained on multilingual data and handles cross-lingual similarity natively.
**Do this instead:** Embed only `name_original + description_original` (the source language text). The model's multilingual training means a French query finds a Turkish dish's embedding. If accuracy is insufficient in v1.3, add English canonical name to the embed string.

### Anti-Pattern 6: Blocking `/menu/[id]` Page Load on Enrichment

**What people do:** Add `WHERE enrichment_status = 'done'` to the menu_items SELECT in the page Server Component, causing the page to wait for enrichment before rendering.
**Why it's wrong:** Enrichment happens asynchronously. If a user opens the menu URL before enrichment completes, the page shows no dishes. This turns an optional progressive enhancement into a hard dependency.
**Do this instead:** Always return all `menu_items` regardless of `enrichment_status`. Render DishCards with whatever data is available. Add enrichment badges only when `canonical_name IS NOT NULL`. Poll for status client-side as progressive enhancement.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k menus enriched | Current `after()` pattern is sufficient. Embedding + enrichment per menu takes 15-60s depending on dish count. HNSW index not needed until >1k rows (but safe to add now). |
| 1k-10k menus | Monitor `after()` timeout rate. If >5% of enrichments fail mid-way (function killed), add a retry mechanism: a cron job every 15min that enriches items still in `enrichment_status = 'pending'`. Use Vercel Cron or Supabase pg_cron. |
| 10k+ menus | HNSW index performance: optimal up to ~1M rows. Search latency stays <100ms. The `match_dishes()` RPC with `match_threshold = 0.3` naturally excludes irrelevant results — no pagination needed at this scale. |

### First Bottleneck

**What breaks first:** OpenAI rate limits on embedding generation during `after()` for large menus. At tier 1, `text-embedding-3-small` is rate-limited to 1M tokens/min — a 100-dish menu needs ~5k tokens, well within limits.
**Real bottleneck:** Vercel function timeout for `after()` on very large menus (100+ dishes × 2 LLM calls each). `after()` extends lifetime but Vercel still has a max duration.
**Fix:** Process in smaller batches. Cap enrichment at 50 dishes per menu on first enrichment. Remaining dishes enrich on subsequent requests.

### Second Bottleneck

**What breaks next:** `match_dishes()` scan performance as `menu_items` table grows without good HNSW parameters.
**Fix:** Tune HNSW `ef_search` at query time: `SET hnsw.ef_search = 100` before calling the RPC for better recall. Current defaults (m=16, ef_construction=64) are appropriate for up to ~100k rows.

---

## Sources

- [Next.js `after()` API Reference](https://nextjs.org/docs/app/api-reference/functions/after) — HIGH confidence, official Next.js docs
- [Supabase pgvector documentation](https://supabase.com/docs/guides/database/extensions/pgvector) — HIGH confidence, official Supabase docs
- [Supabase HNSW indexes](https://supabase.com/docs/guides/ai/vector-indexes/hnsw-indexes) — HIGH confidence, official Supabase docs
- [Supabase hybrid search](https://supabase.com/docs/guides/ai/hybrid-search) — HIGH confidence, official Supabase docs
- [OpenAI Embeddings pricing](https://platform.openai.com/docs/pricing) — HIGH confidence, official OpenAI pricing page (text-embedding-3-small: $0.02/1M tokens standard, $0.01/1M batch)
- [OpenAI text-embedding-3-small model](https://platform.openai.com/docs/models/text-embedding-3-small) — HIGH confidence, official OpenAI docs (1536 dimensions)
- [Supabase pgvector RPC pattern](https://supabase.com/docs/guides/ai/semantic-search) — HIGH confidence, official Supabase docs (PostgREST does not support pgvector operators directly; RPC wrapping is required)
- [OpenAI Cookbook — Semantic search with Supabase](https://cookbook.openai.com/examples/vector_databases/supabase/semantic-search) — MEDIUM confidence, official OpenAI cookbook

---

*Architecture research for: NŌM v1.2 — dish enrichment, canonical names, reverse search, AI Top 3 integration*
*Researched: 2026-02-28*
