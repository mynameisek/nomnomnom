# Stack Research

**Domain:** Restaurant menu scanning / AI intelligence layer — v1.2 additions to existing Next.js app
**Researched:** 2026-02-28
**Confidence:** HIGH (embeddings/Supabase pgvector via official docs; Unsplash via official docs; DeepL via official docs; AI SDK embed via Context7/official docs)

---

## Context: What Already Exists (Do Not Re-add)

These packages are installed and working in v1.1. Do NOT propose reinstalling them:

| Package | Version | Notes |
|---------|---------|-------|
| `next` | 16.1.6 | App Router |
| `react` / `react-dom` | 19.2.3 | |
| `@supabase/supabase-js` | ^2.97.0 | |
| `ai` (Vercel AI SDK) | ^6.0.99 | `generateText`, `streamText`, `useChat` |
| `@ai-sdk/openai` | ^3.0.33 | GPT-4o, GPT-4o-mini, GPT-4.1-mini |
| `zod` | 3.25.76 | Schema validation |
| `motion` | ^12.34.3 | Framer Motion successor |
| `tailwindcss` | ^4 | CSS-first `@theme` |
| `typescript` | ^5 | |
| `screenshotone-api-sdk` | ^1.1.21 | SPA screenshot capture |
| `qr-scanner` | ^1.4.2 | QR code decoding |
| `browser-image-compression` | ^2.0.2 | Client-side image downscaling |
| `server-only` | ^0.0.1 | Server Action guard |

**Translation cascade already implemented:** DeepL → Google Translate → Azure → MyMemory → LLM fallback.
**Google Places enrichment already implemented** (restaurant-level only).
**URL hash caching in Supabase already implemented.**

Everything below is new and additive for v1.2 only.

---

## v1.2 Feature Scope

| Feature | What Needs to Change |
|---------|---------------------|
| (1) Dish enrichment — cultural explanations, canonical names | Prompt engineering only. Zero new packages. Extend existing `gpt-4o-mini` structured output schema. |
| (2) Reverse search across scanned menus | Supabase pgvector (enable extension + schema). AI SDK `embed` / `embedMany` (already in `ai` package). No new npm packages. |
| (3) AI Top 3 recommendations | Prompt engineering only. Existing `gpt-4o-mini` + `useChat` hook already in stack. No new packages. |
| (4) Dish images from web | Unsplash REST API — direct `fetch` from Server Action. No npm package needed (official JS SDK archived). |
| (5) ES/IT translation support | Locale JSON files only. `next-intl` is already installed. No new packages. |

**Summary: Zero new npm packages required. v1.2 is entirely database schema + prompt + API call additions.**

---

## Feature 1: Dish Enrichment — Cultural Explanations + Canonical Names

**No new packages.** Extend the existing `gpt-4o-mini` structured output schema in the LLM parsing prompt.

### What Changes

Extend the dish JSON schema returned by `gpt-4o-mini` from:

```typescript
{
  name: string,
  description: string,
  allergens: string[],
  dietary: string[],
  translations: { en: string, tr: string, de: string }
}
```

To:

```typescript
{
  name: string,
  canonicalName: string,        // NEW: normalized form for cross-restaurant matching
  description: string,
  culturalContext: string,      // NEW: 1-2 sentence cultural explanation
  origin: string,               // NEW: country/region of origin
  allergens: string[],
  dietary: string[],
  translations: { en: string, tr: string, de: string, es: string, it: string }
}
```

### Canonical Name Strategy

The `canonicalName` field is a normalized, transliteration-free name for deduplication and cross-restaurant matching. Examples:

| Raw (from menu) | `canonicalName` |
|----------------|-----------------|
| "Magret de canard rôti" | "duck breast" |
| "Petto d'anatra" | "duck breast" |
| "Geröstete Entenbrust" | "duck breast" |
| "Tiramisu maison" | "tiramisu" |

**Implementation:** Instruct `gpt-4o-mini` in the system prompt to produce the English common name. This is cheaper and more accurate than a separate embedding pass for normalization — the LLM already understands the dish during parsing.

**Confidence:** HIGH — GPT-4o-mini handles culinary multilingual normalization well. No external lookup needed.

---

## Feature 2: Reverse Search Across Scanned Menus

### What Changes

Two complementary approaches are needed:

#### 2a. Full-Text Search (keyword, fast, zero cost)

**No new packages.** Supabase's built-in `textSearch` via `@supabase/supabase-js` is sufficient for keyword-style reverse search ("show me all dishes containing 'truffe' across menus I've seen").

**Schema addition — generated `tsvector` column on the dishes table:**

```sql
-- Enable if not already enabled
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Add FTS column to menu_cache or a dedicated dishes table
ALTER TABLE dishes ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(canonical_name, '') || ' ' || coalesce(description, ''))
  ) STORED;

CREATE INDEX dishes_fts_idx ON dishes USING GIN (fts);
```

**Query from JS:**

```typescript
const { data } = await supabase
  .from('dishes')
  .select('*')
  .textSearch('fts', query, { type: 'websearch', config: 'simple' });
```

Use `config: 'simple'` (not `'english'`) because dish names are multilingual. `'simple'` skips stop-word removal and stemming — more appropriate for names.

**Confidence:** HIGH — Supabase official docs, verified pattern.

#### 2b. Semantic Search / Canonical Matching (cross-language, similarity-based)

Use `pgvector` + OpenAI embeddings to match "duck breast" with "Magret de canard" stored in another menu.

**No new npm packages.** The `ai` package already installed (v6.0.99) exposes `embed` and `embedMany` functions. The `@ai-sdk/openai` package exposes `openai.embeddingModel()`.

**Model:** `text-embedding-3-small`
- Dimensions: 1536 (default) or 512 (reduced, sufficient for dish names)
- Cost: $0.02 per 1M tokens (batch: $0.01 per 1M tokens)
- A dish name + canonical name is ~10-20 tokens → cost is negligible
- **Recommendation:** Use 512 dimensions to halve storage and query latency with minimal accuracy loss

**Usage pattern (Server Action):**

```typescript
import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';

// At scan time — embed canonical name and store
const { embedding } = await embed({
  model: openai.embeddingModel('text-embedding-3-small'),
  value: dish.canonicalName,  // already normalized by LLM
});

// At search time — embed query, find nearest neighbors
const { embedding: queryEmbedding } = await embed({
  model: openai.embeddingModel('text-embedding-3-small'),
  value: userQuery,
});
```

**Schema addition:**

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to dishes table
ALTER TABLE dishes ADD COLUMN embedding vector(512);

-- HNSW index for fast approximate nearest neighbor search (cosine distance)
CREATE INDEX dishes_embedding_idx ON dishes
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

**RPC function for semantic search (required — PostgREST doesn't support pgvector operators directly):**

```sql
CREATE OR REPLACE FUNCTION search_dishes_semantic(
  query_embedding vector(512),
  match_threshold float,
  match_count int
)
RETURNS TABLE (id uuid, name text, canonical_name text, menu_id text, similarity float)
LANGUAGE sql STABLE
AS $$
  SELECT id, name, canonical_name, menu_id,
    1 - (embedding <=> query_embedding) AS similarity
  FROM dishes
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

**Hybrid search option (keyword + semantic, merged via RRF):** Supabase docs confirm this pattern works. For v1.2, start with FTS only for initial launch (zero embedding cost), add semantic search in a sub-phase once the dishes table is populated.

**Confidence:** HIGH — Supabase official docs (pgvector, HNSW, hybrid search), AI SDK official docs.

---

## Feature 3: AI Top 3 Recommendations

**No new packages.** This is prompt engineering over the existing dish array in memory.

### What Changes

The existing `useChat` hook + a Server Action calling `gpt-4o-mini` is all that's needed. The dish array (already loaded for display) is passed as context.

```typescript
// Server Action pattern (already established in v1.1)
const { text } = await generateText({
  model: openai('gpt-4o-mini'),
  system: TOP3_SYSTEM_PROMPT,
  messages: [{
    role: 'user',
    content: JSON.stringify({
      dishes: dishArray.slice(0, 50),  // cap context to avoid token bloat
      preferences: { dietary, allergenFree, language }
    })
  }]
});
```

**Model choice:** `gpt-4o-mini` is sufficient — recommendations are ranking + brief explanation, not complex reasoning. `gpt-4.1-mini` is available as a configurable upgrade via existing admin model switcher.

**Confidence:** HIGH — no new capabilities required beyond existing stack.

---

## Feature 4: Dish Images from Web

### What Changes

**No new npm packages.** The `unsplash-js` official package is archived and unmaintained. Use direct REST fetch from a Server Action instead.

**Approach:** Unsplash Search Photos REST endpoint, called server-side with the dish's `canonicalName` as query.

**Why Unsplash over alternatives:**
- Pexels API: Also works, similar free tier (200 req/hour vs Unsplash's 50 req/hour demo / 5000 req/hour production)
- Google Custom Search Image API: $5 per 1000 queries after 100/day free — too expensive at scale
- LogMeal Food AI: Food-specific but requires subscription, adds cost
- **Decision: Unsplash** — free production tier (5000/hour after approval), no npm package needed, high-quality food photography, requires only `Authorization: Client-ID YOUR_KEY` header

**Free tier limits:**
- Demo (during development): 50 requests/hour
- Production (after application approval): 5000 requests/hour
- Unsplash approval requires following their guidelines (attribution)

**Server Action pattern:**

```typescript
// lib/images.ts (server-only)
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

export async function fetchDishImage(canonicalName: string): Promise<string | null> {
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(canonicalName + ' food')}&per_page=1&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.results?.[0]?.urls?.regular ?? null;
}
```

**Caching critical:** Store the image URL in Supabase alongside the dish record on first fetch. Do NOT call Unsplash on every render. The URL is stable (Unsplash URLs don't expire).

**Attribution requirement:** Unsplash guidelines require displaying photographer credit. A small byline (`Photo by [Name] on Unsplash`) is sufficient. This can be stored as `imageCredit` alongside the URL.

**Environment variable to add:** `UNSPLASH_ACCESS_KEY`

**Confidence:** HIGH — Unsplash official documentation, REST API is stable, no npm dependency risk.

---

## Feature 5: ES/IT Translation Support

**No new packages.** `next-intl` is already installed and supports any ISO 639-1 language code.

### What Changes

1. **Add locale JSON files:**
   - `messages/es.json` — Spanish UI strings (copy from `messages/en.json`, translate values)
   - `messages/it.json` — Italian UI strings

2. **Update `next-intl` routing config** to add `'es'` and `'it'` to the locales array.

3. **Extend dish translation schema** — add `es` and `it` fields to the GPT translation output (already proposed in Feature 1 schema).

4. **Translation cascade** — existing DeepL → Google → Azure → MyMemory → LLM cascade already supports ES and IT (DeepL officially supports both, confirmed Feb 2026).

**No prompt changes needed for the cascade** — it's already language-agnostic. Pass `targetLanguage: 'es'` or `'it'` to the existing batch translation function.

**Confidence:** HIGH — next-intl supports all locale codes, DeepL official language list confirms ES/IT support.

---

## Complete v1.2 Change Summary

### New npm packages: NONE

All v1.2 features are delivered through:
- Database schema additions (pgvector extension, embedding column, FTS column, SQL functions)
- Prompt additions (canonical name, cultural context, ES/IT translation fields)
- One new environment variable (`UNSPLASH_ACCESS_KEY`)
- New locale files (`messages/es.json`, `messages/it.json`)
- New server-side utility functions using existing packages

### Environment Variables to Add

| Variable | Purpose | Where to get |
|----------|---------|--------------|
| `UNSPLASH_ACCESS_KEY` | Dish image search | Unsplash developers portal |

### Database Schema Additions

| Addition | Purpose |
|---------|---------|
| `CREATE EXTENSION IF NOT EXISTS vector` | Enable pgvector |
| `CREATE EXTENSION IF NOT EXISTS unaccent` | Better FTS for accented characters |
| `dishes.canonical_name TEXT` | Normalized dish name for matching |
| `dishes.cultural_context TEXT` | Cultural explanation |
| `dishes.origin TEXT` | Dish origin country/region |
| `dishes.image_url TEXT` | Cached Unsplash image URL |
| `dishes.image_credit TEXT` | Photographer attribution |
| `dishes.embedding vector(512)` | Semantic search vector |
| `dishes.fts tsvector GENERATED` | Keyword search index |
| `dishes_embedding_idx` (HNSW) | Fast vector search |
| `dishes_fts_idx` (GIN) | Fast keyword search |
| `search_dishes_semantic()` RPC fn | pgvector nearest-neighbor search |

---

## Recommended Phasing

Given that zero npm packages are needed, the risk profile is low. Recommended order:

1. **Schema first** — Add pgvector, FTS, and dish enrichment columns before any feature work
2. **Canonical names + cultural context** — Prompt change, no infra risk
3. **FTS keyword search** — Simple, uses existing Supabase client
4. **ES/IT translation** — Locale files + extend translation fields
5. **Dish images** — Add `UNSPLASH_ACCESS_KEY`, implement server-side fetch + cache
6. **AI Top 3** — Prompt + existing AI stack
7. **Semantic search** — Add embedding generation at scan time, expose search UI last (depends on having populated embeddings in the table)

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Dish image source | Unsplash REST API (direct fetch) | `unsplash-js` npm package | Package is archived and unmaintained as of 2025. Direct REST API is stable and needs only one `fetch` call. |
| Dish image source | Unsplash | Google Custom Search Images | $5/1000 queries after 100/day free limit. Cost prohibitive for per-dish lookups. |
| Dish image source | Unsplash | Pexels | Pexels also works (200 req/hr demo). Unsplash preferred for food photography quality and 5000 req/hr production. |
| Semantic search store | Supabase pgvector | Pinecone / Weaviate / Qdrant | Supabase is already in stack. Adding a dedicated vector DB is operational overhead for dish-scale data (thousands, not millions, of vectors). |
| Embedding model | `text-embedding-3-small` (512 dims) | `text-embedding-3-large` (3072 dims) | Dish names are short (< 20 tokens). Large model adds cost and storage with marginal accuracy gain for food vocabulary matching. |
| Canonical name normalization | LLM prompt instruction | Separate embedding + clustering pass | LLM already understands the dish during parsing. Instructing it to output a canonical name is free (zero extra tokens), accurate, and avoids a separate API call. |
| Dish enrichment (cultural context) | GPT-4o-mini structured output | Wikipedia API lookup | GPT-4o-mini already in stack, produces culinary explanations accurately. Wikipedia API adds latency and parsing complexity for uncertain gain. |
| ES/IT translations | Existing cascade (DeepL first) | Add Azure Translator | DeepL already supports ES/IT natively. No change to cascade needed. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `unsplash-js` npm package | Officially archived by Unsplash. No updates since 2022. | Direct `fetch` to `api.unsplash.com` |
| Pinecone / Qdrant / Weaviate | Separate vector DB service when Supabase pgvector is already available | `pgvector` extension on existing Supabase instance |
| `text-embedding-3-large` | 3072 dimensions = 6x storage vs 512-dim for negligible accuracy gain on dish names (< 20 tokens) | `text-embedding-3-small` with `dimensions: 512` |
| Dedicated search service (Algolia, Meilisearch, Typesense) | Overkill for dish-count scale; adds monthly cost; Supabase FTS + pgvector covers the need | Supabase `textSearch` + pgvector RPC |
| Client-side embedding generation | Exposes OpenAI API key in browser | Server Action with `embed()` from `ai` package |
| `IVFFlat` index for pgvector | Requires pre-seeded data to build; not suitable for tables that grow incrementally | `HNSW` index — builds incrementally, no data requirement at creation time |

---

## Version Compatibility

| Package | Compatible With | Critical Note |
|---------|----------------|---------------|
| `ai` ^6.0.99 | `embed`, `embedMany` functions | `openai.embeddingModel('text-embedding-3-small')` is the correct call syntax in AI SDK v6. The old `openai.embedding()` syntax was renamed. |
| `@ai-sdk/openai` ^3.0.33 | `ai` ^6.x | Must stay in sync — do not mix ai v5 with @ai-sdk/openai v3 |
| Supabase pgvector | `@supabase/supabase-js` ^2.97.0 | Use `.rpc('search_dishes_semantic', {...})` — PostgREST does not expose pgvector operators directly |
| `next-intl` ^4.8.3 | ES/IT locale codes | Adding new locales is additive — no breaking changes to existing FR/EN/TR/DE behavior |
| Unsplash REST API | `UNSPLASH_ACCESS_KEY` env var | 50 req/hr in demo mode; apply for production approval (5000 req/hr) before launch |

---

## Sources

- [ai-sdk.dev/docs/ai-sdk-core/embeddings](https://ai-sdk.dev/docs/ai-sdk-core/embeddings) — `embed`, `embedMany` API, `openai.embeddingModel()` syntax confirmed (HIGH confidence, official docs)
- [supabase.com/docs/guides/ai/hybrid-search](https://supabase.com/docs/guides/ai/hybrid-search) — pgvector + tsvector hybrid search, RRF fusion, HNSW index setup (HIGH confidence, official docs)
- [supabase.com/docs/guides/database/extensions/pgvector](https://supabase.com/docs/guides/database/extensions/pgvector) — pgvector extension, vector column, `vector_cosine_ops` (HIGH confidence, official docs)
- [supabase.com/docs/guides/ai/vector-indexes/hnsw-indexes](https://supabase.com/docs/guides/ai/vector-indexes/hnsw-indexes) — HNSW vs IVFFlat recommendation, `m` and `ef_construction` params (HIGH confidence, official docs)
- [platform.openai.com/docs/models/text-embedding-3-small](https://platform.openai.com/docs/models/text-embedding-3-small) — 1536 dimensions default, reducible to 512, $0.02/1M tokens (HIGH confidence, official docs)
- [unsplash.com/documentation](https://unsplash.com/documentation) — REST API endpoint, 50 req/hr demo / 5000 req/hr production, attribution requirements (HIGH confidence, official docs)
- [github.com/unsplash/unsplash-js](https://github.com/unsplash/unsplash-js) — Confirmed archived/unmaintained (HIGH confidence, official repo)
- [developers.deepl.com/docs/getting-started/supported-languages](https://developers.deepl.com/docs/getting-started/supported-languages) — Spanish (ES) and Italian (IT) confirmed supported (HIGH confidence, official docs)
- [next-intl.dev](https://next-intl.dev/) — Any ISO 639-1 locale code supported, no package changes needed (HIGH confidence, official docs)
- [costgoat.com/pricing/openai-embeddings](https://costgoat.com/pricing/openai-embeddings) — text-embedding-3-small batch pricing $0.01/1M tokens (MEDIUM confidence, pricing calculator)

---

*Stack research for: NOM v1.2 — dish enrichment, canonical names, reverse search, AI Top 3, dish images, ES/IT translation*
*Researched: 2026-02-28*
