# Phase 4: Infrastructure Foundation - Research

**Researched:** 2026-02-25
**Domain:** Supabase schema design, Vercel AI SDK structured output, Next.js server-only patterns, Zod validation
**Confidence:** MEDIUM-HIGH (critical Zod v4 compatibility issue requires version pinning decision)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Schema design
- EU 14 mandatory allergens as the standard set: gluten, dairy, nuts, peanuts, soy, eggs, fish, shellfish, celery, mustard, sesame, sulphites, lupin, molluscs
- Allergens stored per dish as an array of enum values (not free text) — enables reliable client-side filtering in Phase 6
- All 4 translations (FR/EN/TR/DE) returned in a single LLM call and stored together — no on-demand translation
- Translations stored as JSONB columns on `menu_items` (e.g., `name_translations`, `description_translations`) — avoids separate translation table overhead

#### LLM response shape
- Single structured call returns: dish name (original), translations (4 langs), description + translations, price (if found), allergens (EU 14 enum array), dietary tags (vegetarian/vegan/halal), trust signal
- Zod schema validates LLM output — no raw string output reaches the app
- Response shape designed so Phase 5 (Scan Pipeline) can store directly and Phase 6 (Dish Cards) can render directly

#### Cache behavior
- Cache key: `url_hash` on `menus` table (index exists per roadmap success criteria)
- Guiding principle: admin-configurable where legitimate — TTL and cache purge should be controllable from admin panel
- Second scan of same URL returns from Supabase, no LLM call (roadmap SC #3)

#### Admin config
- Guiding principle from user: **best defaults, configurable via admin when possible and legit**
- Model selection (GPT-4o / GPT-4o-mini / GPT-4.1-mini) — admin configurable (confirmed in roadmap)
- Cache TTL — admin configurable
- Other admin-configurable settings: Claude decides what's worth exposing based on implementation

### Claude's Discretion
- Trust signal format (binary verified/inferred vs confidence score) — pick what Phase 6 Dish Cards can display most clearly
- Cache TTL default value and expiry strategy
- Exact JSONB structure for translations and allergens
- RLS policy design
- Index strategy beyond `url_hash`
- TypeScript type organization (single file vs per-domain)
- OpenAI wrapper error handling and retry strategy

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFR-01 | Supabase schema with menus, menu_items, and admin_config tables | Schema patterns, enum arrays, JSONB columns, RLS policies, index strategy documented below |
| INFR-02 | OpenAI API integration via Vercel AI SDK (server-only, key never exposed to browser) | AI SDK 6 `generateText` + `Output.object()` pattern, `server-only` package usage, `@ai-sdk/openai` provider documented below |
| INFR-03 | URL hash-based caching — LLM called only on cache miss | Node.js `crypto.createHash('sha256')` for url_hash, Supabase `created_at` + `expires_at` TTL pattern, service role client for writes documented below |
</phase_requirements>

---

## Summary

Phase 4 builds the data layer and server-only LLM tooling that every downstream phase depends on. Three components must be in place: the Supabase schema (menus, menu_items, admin_config tables), the OpenAI wrapper using the Vercel AI SDK with Zod validation, and the URL hash-based cache layer.

The most significant risk in this phase is the **Zod v4 / AI SDK compatibility issue**. As of late 2025, the Vercel AI SDK still has unresolved compatibility issues with Zod v4 (the version currently latest on npm at 4.3.6). The AI SDK internally depends on `zod-to-json-schema` which does not support Zod v4's internal structure changes. The safe resolution is to **pin Zod at v3** (`zod@3.25.76`) for this project. This is verified through multiple GitHub issues that were still open as of December 2025. AI SDK 6 is shipping but issues (#10014, #8784, #12020) confirm problems remain in edge cases.

The Vercel AI SDK is at version 6.0.99 as of the research date. In AI SDK 6, `generateObject` and `streamObject` have been deprecated in favor of `generateText` / `streamText` with an `output` parameter using `Output.object()`. Since the project does not yet have `ai` installed, this phase will adopt the current AI SDK 6 pattern from day one rather than migrating from v4.

The Supabase schema requires a deliberate design decision between PostgreSQL native enums and `text[]` arrays for allergens. The EU 14 allergen list is fixed and stable — this is a textbook use case for PostgreSQL enums. However, the Supabase client returns enum arrays as plain strings in JavaScript, so TypeScript types must reflect `string[]` from the database layer with a cast to the allergen enum type.

**Primary recommendation:** Pin `zod@3.25.76`, use AI SDK 6 with `generateText` + `Output.object()`, create a PostgreSQL allergen enum, store translations as JSONB, and use a dual Supabase client pattern (anon for reads, service_role for LLM-triggered writes).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` | 6.0.99 | Vercel AI SDK core — `generateText` with `Output.object()` | Official Vercel SDK, provider-agnostic, handles structured outputs |
| `@ai-sdk/openai` | latest | OpenAI provider adapter for AI SDK | Required to use OpenAI models with AI SDK 6 |
| `zod` | 3.25.76 (pinned) | Schema definition and runtime validation | AI SDK 6 has unresolved Zod v4 issues as of Dec 2025 — use v3 |
| `server-only` | latest | Prevents server modules from being bundled client-side | Next.js official pattern, build-time error if imported in Client Component |
| `@supabase/supabase-js` | 2.97.0 (already installed) | Supabase client — already in project | Preserves Next.js fetch cache (vs `@supabase/ssr` which uses cookies and opts out) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:crypto` | built-in | SHA-256 hashing for `url_hash` cache key | Generating deterministic cache keys from URLs — no external dependency needed |
| `typescript` | 5.x (already installed) | Type definitions for schema types | Already in project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `zod@3.25.76` (pinned) | `zod@4.x` | Zod v4 has native JSON schema but breaks AI SDK as of Dec 2025. Pin v3 until AI SDK officially resolves. |
| `generateText` + `Output.object()` | `generateObject` (deprecated) | `generateObject` still works in AI SDK 6 but is deprecated — use the unified API from the start |
| PostgreSQL enum for allergens | `text[]` array | Enum gives constraint enforcement and better performance; downside is schema migration needed to add values. EU 14 allergens are stable, so enum is correct. |
| `created_at` + `expires_at` columns | TTL extension | Simple timestamp-based expiry is queryable without extensions and supports admin-configurable TTL |

**Installation:**
```bash
npm install ai @ai-sdk/openai zod@3.25.76 server-only
```

> Note: `@supabase/supabase-js` is already installed at 2.97.0.

---

## Architecture Patterns

### Recommended Project Structure

```
lib/
├── openai.ts          # AI SDK wrapper — server-only, generateText + Output.object()
├── supabase.ts        # Existing anon client (public read queries)
├── supabase-admin.ts  # Service role client (LLM write path, bypasses RLS)
├── cache.ts           # url_hash helpers — createHash('sha256')
└── types/
    ├── menu.ts        # Menu, MenuItem TypeScript types (mirrors DB schema)
    ├── llm.ts         # Zod schema for LLM response + inferred TypeScript types
    └── config.ts      # AdminConfig type
```

**TypeScript type organization:** Per-domain files under `lib/types/` is preferred over a single `types.ts`. The LLM response shape (Zod schema), the DB schema types, and the admin config are distinct enough domains that a single file would grow unwieldy by Phase 7.

### Pattern 1: Server-Only OpenAI Wrapper

**What:** `lib/openai.ts` is marked `server-only`, imports `@ai-sdk/openai` and `ai`, exports a typed function that calls `generateText` with `Output.object()` and a Zod schema. The OpenAI key is read from `process.env.OPENAI_API_KEY` (no `NEXT_PUBLIC_` prefix — server only).

**When to use:** Every LLM call in the app goes through this wrapper. Phase 5 (Scan Pipeline) imports from here.

```typescript
// Source: https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0
// Source: https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text
import 'server-only';
import { generateText, Output, NoObjectGeneratedError } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { dishResponseSchema } from './types/llm';

export async function parseDishesFromText(menuText: string, model: string = 'gpt-4o-mini') {
  const { output } = await generateText({
    model: openai(model),
    output: Output.object({
      schema: z.object({ dishes: z.array(dishResponseSchema) }),
    }),
    system: SYSTEM_PROMPT,
    prompt: menuText,
    maxRetries: 2,
  });
  return output; // fully typed, Zod-validated
}
```

**Error handling:** Catch `NoObjectGeneratedError` from `ai` — it exposes `error.text` (the raw LLM output), `error.usage`, and `error.cause` for debugging. This is preferable to catching generic errors because it gives context for why structured generation failed.

### Pattern 2: Dual Supabase Client

**What:** Two separate Supabase clients — the existing anon client for public reads (preserves Next.js fetch cache), and a new service_role client for server-side writes (LLM results stored after cache miss).

**When to use:** Anon client for cache lookups (`SELECT` on `menus` by `url_hash`). Service role client for inserting LLM results (`INSERT` on `menus` and `menu_items`). The service role key is a server-only env var — never `NEXT_PUBLIC_`.

```typescript
// lib/supabase-admin.ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Service role bypasses RLS entirely — never expose client-side
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // no NEXT_PUBLIC_ prefix
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);
```

```typescript
// lib/supabase.ts (existing — anon client, reads only)
// Already correct — no changes needed
```

### Pattern 3: URL Hash Cache Key

**What:** SHA-256 hash of the normalized URL, stored as `url_hash` (text, 64 chars hex) on the `menus` table with a unique index. Cache lookup: `SELECT * FROM menus WHERE url_hash = $1 AND expires_at > NOW()`.

```typescript
// lib/cache.ts
import { createHash } from 'node:crypto';

export function hashUrl(url: string): string {
  // Normalize: lowercase, trim whitespace
  const normalized = url.trim().toLowerCase();
  return createHash('sha256').update(normalized).digest('hex');
}
```

**Cache expiry strategy:** Store `created_at` (auto by Supabase) and `expires_at` (computed at insert: `NOW() + interval`). TTL comes from `admin_config` at call time. On cache hit where `expires_at < NOW()`: treat as cache miss, re-parse, update row. This is a simple "lazy expiry" pattern — no cron job required.

**Default TTL recommendation:** 7 days. Restaurant menus change infrequently. Admin can lower to 1 day for high-turnover venues. Expose `cache_ttl_hours` in `admin_config`.

### Pattern 4: Admin Config Table Design

**What:** A single-row key-value config table. Use a typed approach with known keys rather than a generic string-string store, because known keys can be typed in TypeScript.

**Recommended design:** Single row with named columns (not key-value rows), since the config set is small and known.

```sql
create table admin_config (
  id boolean primary key default true check (id = true), -- enforces single row
  llm_model text not null default 'gpt-4o-mini',
  cache_ttl_hours integer not null default 168, -- 7 days
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

The `check (id = true)` constraint on a boolean primary key is a PostgreSQL pattern for enforcing a single-row table. This is cleaner than a sequence-based ID with application-level enforcement.

**Admin-configurable settings worth exposing (Claude's discretion):**
- `llm_model` — confirmed by user (GPT-4o / GPT-4o-mini / GPT-4.1-mini)
- `cache_ttl_hours` — confirmed by user
- `max_retries` — borderline; leave as code constant for now, expose in Phase 7 if needed

### Pattern 5: JSONB Translation Structure

**What:** Each `menu_items` row has `name_translations` and `description_translations` as JSONB columns. The structure is a flat object keyed by ISO language code.

**Recommended JSONB structure:**
```json
{
  "fr": "Moules farcies au riz épicé",
  "en": "Stuffed mussels with spiced rice",
  "tr": "Midye dolma",
  "de": "Gefüllte Muscheln mit Gewürzreis"
}
```

**Why this structure:** Direct key access (`name_translations->>'fr'`) is O(1). No array scanning needed. Zod schema for the LLM response mirrors this exactly, making `Phase 5 store → Phase 6 render` a direct pass-through with no transformation.

**TypeScript type:**
```typescript
type TranslationMap = {
  fr: string;
  en: string;
  tr: string;
  de: string;
};
```

### Pattern 6: Trust Signal Design (Claude's Discretion)

**Recommendation:** Use a binary enum `'verified' | 'inferred'` rather than a confidence score (0–1).

**Rationale for Phase 6 Dish Cards:**
- A confidence score (0.85) is meaningless to a restaurant customer
- A binary badge ("Verified Menu" vs "Inferred") maps directly to the Phase 6 success criteria: "Verified Menu for items sourced directly from menu text, Inferred for LLM-inferred details"
- The user's Phase 6 decision uses this exact language
- A boolean `is_verified` column is equivalent but less readable in queries than `trust_signal = 'verified'`

**Implementation:** PostgreSQL `text` column with a check constraint: `check (trust_signal in ('verified', 'inferred'))`. Alternatively a `CREATE TYPE trust_signal_type AS ENUM ('verified', 'inferred')` — use the enum since it's equally stable to the allergen enum.

### Anti-Patterns to Avoid

- **Using `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`**: The service role key must never be prefixed with `NEXT_PUBLIC_` — this would embed it in the client bundle and expose it publicly (equivalent to giving anyone full database access).
- **Importing `lib/openai.ts` in a Client Component**: The `import 'server-only'` guard at the top of the file will catch this at build time, not runtime — this is the correct protection layer.
- **Using `zod@4.x` with AI SDK**: As of Dec 2025, Zod v4 breaks AI SDK's internal schema conversion. Pin `zod@3.25.76` explicitly in `package.json` to avoid accidental upgrades.
- **Using `@supabase/ssr` for the cache client**: The existing project uses `@supabase/supabase-js` (decided in v1.0). The SSR package uses cookies which opts out of Next.js fetch cache — defeating the caching benefit.
- **Storing allergens as free text**: Decided against this. Enum array enables `array_contains` queries for Phase 6 client-side filtering.
- **Generic key-value admin_config table**: A single-row typed table is better than rows like `('cache_ttl_hours', '168')` because TypeScript can type the config object directly without string parsing.
- **Calling `hashUrl` in a Client Component**: The url_hash computation should happen server-side only. The URL comes from user input, so it's fine to compute client-side technically, but the lookup and LLM call are server-side — keep the hash computation there too for consistency.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LLM structured output | Custom JSON parser, regex extraction | `generateText` + `Output.object()` from AI SDK | Handles provider differences, retries, `NoObjectGeneratedError` with full context |
| Schema-to-JSON-schema conversion | Manual JSON Schema construction | Zod v3 schema passed to AI SDK | zod-to-json-schema handles all edge cases (optional, nullable, arrays, enums) |
| URL hashing | Custom hash function | `node:crypto` `createHash('sha256')` | Built-in, no external dep, deterministic, collision-resistant |
| Single-row table enforcement | Application code checking row count | PostgreSQL `check (id = true)` on boolean PK | Database enforces the constraint — cannot be bypassed by application bugs |
| RLS for public menu data | Complex auth-aware policies | `to anon using (true)` for reads + service_role for writes | Menus are public data; RLS complexity should match the actual access model |

**Key insight:** The AI SDK's value in this phase is not streaming or UI — it's the structured output + retry + error handling pipeline. Hand-rolling a `JSON.parse(llmResponse)` with try/catch misses provider-level retries and loses the `NoObjectGeneratedError` context that makes debugging tractable.

---

## Common Pitfalls

### Pitfall 1: Zod v4 Breaking AI SDK Structured Outputs
**What goes wrong:** `generateText` with `Output.object()` throws "Invalid schema for response_format" or produces an empty schema sent to the LLM provider.
**Why it happens:** AI SDK's `@ai-sdk/provider-utils` depends on `zod-to-json-schema` which imports `ZodFirstPartyTypeKind` — an export removed in Zod v4.
**How to avoid:** Pin `"zod": "3.25.76"` in `package.json` dependencies (exact version, not `^3`). Run `npm install zod@3.25.76`.
**Warning signs:** TypeScript peer dependency warnings about zod version mismatch; LLM returns raw text instead of structured object.
**Resolution timeline:** GitHub issue #10014 still open in Dec 2025. Check again before upgrading to Zod v4.

### Pitfall 2: Service Role Key Exposed Client-Side
**What goes wrong:** `process.env.SUPABASE_SERVICE_ROLE_KEY` is accidentally prefixed with `NEXT_PUBLIC_` or used in a Client Component.
**Why it happens:** Developers copy the anon key pattern and change the variable name without changing the prefix convention.
**How to avoid:** The service_role client must be in a file with `import 'server-only'` at the top. The env var must NOT have `NEXT_PUBLIC_` prefix. Name it `SUPABASE_SERVICE_ROLE_KEY`.
**Warning signs:** Next.js build shows the variable in the client bundle analysis.

### Pitfall 3: Cache Miss on URL Casing Variations
**What goes wrong:** `https://Menu.restaurant.com/carte` and `https://menu.restaurant.com/carte` generate different hashes, causing duplicate LLM calls for the same menu.
**Why it happens:** SHA-256 is case-sensitive; two URLs that point to the same page hash to different values.
**How to avoid:** Normalize the URL before hashing: `url.trim().toLowerCase()`. Consider stripping trailing slashes and common tracking params (`?utm_source=...`).
**Warning signs:** Supabase logs show multiple LLM calls for the same restaurant's menu URL with different casings.

### Pitfall 4: RLS Blocking Service Role Writes
**What goes wrong:** INSERT operations from the service role client are blocked by RLS policies.
**Why it happens:** Service role bypasses RLS entirely by design — but only if the client is initialized with the service role key. If the wrong key is used (anon key), RLS applies.
**How to avoid:** Verify the admin client is initialized with `process.env.SUPABASE_SERVICE_ROLE_KEY`. According to Supabase docs: "a Supabase client with the Authorization header set to the service role API key will ALWAYS bypass RLS."
**Warning signs:** INSERT returns a 403 or RLS policy violation error despite using the "admin" client.

### Pitfall 5: Allergen Enum Migration Pain
**What goes wrong:** A new allergen needs to be added post-launch, requiring a schema migration.
**Why it happens:** PostgreSQL enums require `ALTER TYPE ... ADD VALUE` to add entries — a DDL operation that requires careful migration handling in production.
**How to avoid:** The EU 14 allergens are legally defined and stable — this is an acceptable tradeoff. Document the list clearly. If flexibility is needed post-launch, the migration is: `ALTER TYPE allergen_type ADD VALUE 'new_allergen';` — this is an append-only operation (safe in PostgreSQL 9.1+, no table rewrite).
**Warning signs:** Requirements change from EU 14 to a broader set during planning — if so, consider `text[]` instead.

### Pitfall 6: Optional Fields in Zod Schema Causing OpenAI Errors
**What goes wrong:** Using `.optional()` in the Zod schema for fields like `price` causes OpenAI structured outputs to reject the schema.
**Why it happens:** OpenAI's structured outputs API does not support JSON Schema `optional` without `nullable` — it requires all properties to be present.
**How to avoid:** Use `.nullable()` instead of `.optional()` for optional fields in the LLM response schema: `z.string().nullable()` instead of `z.string().optional()`. This means `price` is always present but can be `null` if not found.
**Warning signs:** LLM returns "Invalid schema for response_format" error; schema fields with `.optional()` are the cause.

---

## Code Examples

Verified patterns from official sources:

### Full Zod Schema for LLM Response
```typescript
// lib/types/llm.ts
// Source: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
// Note: Use .nullable() not .optional() for OpenAI structured outputs compatibility
import { z } from 'zod';

const allergenEnum = z.enum([
  'gluten', 'dairy', 'nuts', 'peanuts', 'soy', 'eggs',
  'fish', 'shellfish', 'celery', 'mustard', 'sesame',
  'sulphites', 'lupin', 'molluscs'
]);

const translationMapSchema = z.object({
  fr: z.string(),
  en: z.string(),
  tr: z.string(),
  de: z.string(),
});

export const dishResponseSchema = z.object({
  name_original: z.string(),
  name_translations: translationMapSchema,
  description_original: z.string().nullable(),
  description_translations: translationMapSchema.nullable(),
  price: z.string().nullable(), // e.g. "12€" or null
  allergens: z.array(allergenEnum),
  dietary_tags: z.array(z.enum(['vegetarian', 'vegan', 'halal'])),
  trust_signal: z.enum(['verified', 'inferred']),
});

export type DishResponse = z.infer<typeof dishResponseSchema>;
```

### generateText with Output.object() (AI SDK 6)
```typescript
// lib/openai.ts
// Source: https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0
import 'server-only';
import { generateText, Output, NoObjectGeneratedError } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { dishResponseSchema } from './types/llm';

export async function parseDishesFromMenu(
  menuText: string,
  model: string = 'gpt-4o-mini'
): Promise<{ dishes: DishResponse[] }> {
  try {
    const { output } = await generateText({
      model: openai(model),
      output: Output.object({
        schema: z.object({ dishes: z.array(dishResponseSchema) }),
      }),
      system: `You are a multilingual menu parser...`,
      prompt: menuText,
      maxRetries: 2,
    });
    return output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      // Structured output failed — log raw text for debugging
      console.error('LLM structured output failed:', error.text, error.cause);
      throw new Error('Menu parsing failed: LLM did not return valid structured data');
    }
    throw error;
  }
}
```

### Supabase Schema (SQL)
```sql
-- Allergen type (EU 14 mandatory)
create type allergen_type as enum (
  'gluten', 'dairy', 'nuts', 'peanuts', 'soy', 'eggs',
  'fish', 'shellfish', 'celery', 'mustard', 'sesame',
  'sulphites', 'lupin', 'molluscs'
);

-- Trust signal type
create type trust_signal_type as enum ('verified', 'inferred');

-- Menus table (one row per unique URL)
create table menus (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  url_hash text not null unique,      -- SHA-256 hex (64 chars)
  restaurant_name text,
  source_type text,                   -- 'url' | 'photo' | 'qr'
  raw_text text,                      -- original scraped/OCR text (for debugging)
  parsed_at timestamptz default now(),
  expires_at timestamptz not null,    -- parsed_at + cache_ttl_hours
  created_at timestamptz default now()
);

-- Index for cache lookups
create index idx_menus_url_hash on menus (url_hash);
-- Compound index to filter expired entries efficiently
create index idx_menus_url_hash_expires on menus (url_hash, expires_at);

-- Menu items table
create table menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references menus(id) on delete cascade,
  name_original text not null,
  name_translations jsonb not null,           -- {"fr":"...","en":"...","tr":"...","de":"..."}
  description_original text,
  description_translations jsonb,             -- same shape, nullable
  price text,                                 -- "12€", null if not found
  allergens allergen_type[] not null default '{}',
  dietary_tags text[] not null default '{}',  -- ['vegetarian','vegan','halal']
  trust_signal trust_signal_type not null default 'inferred',
  sort_order integer not null default 0,      -- preserves menu order
  created_at timestamptz default now()
);

-- Index for fast menu item fetch by menu_id
create index idx_menu_items_menu_id on menu_items (menu_id);

-- Admin config (single-row table)
create table admin_config (
  id boolean primary key default true check (id = true),
  llm_model text not null default 'gpt-4o-mini',
  cache_ttl_hours integer not null default 168,  -- 7 days
  updated_at timestamptz default now()
);

-- Seed default config
insert into admin_config (llm_model, cache_ttl_hours) values ('gpt-4o-mini', 168);
```

### RLS Policies
```sql
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security

-- menus: public read, service role writes (service role bypasses RLS entirely)
alter table menus enable row level security;

create policy "Public can read menus"
  on menus for select
  to anon, authenticated
  using (true);

-- menu_items: public read, service role writes
alter table menu_items enable row level security;

create policy "Public can read menu_items"
  on menu_items for select
  to anon, authenticated
  using (true);

-- admin_config: no public access (service role only)
alter table admin_config enable row level security;
-- No anon/authenticated policies — only service role can read/write
```

### URL Hash Cache Check Pattern
```typescript
// Usage in Phase 5 scan handler
import { hashUrl } from '@/lib/cache';
import { supabase } from '@/lib/supabase';       // anon — for reads
import { supabaseAdmin } from '@/lib/supabase-admin'; // service role — for writes

export async function getOrParseMenu(url: string) {
  const urlHash = hashUrl(url);

  // Cache check (anon client — preserves Next.js fetch cache)
  const { data: cached } = await supabase
    .from('menus')
    .select('*, menu_items(*)')
    .eq('url_hash', urlHash)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (cached) return cached; // Cache HIT — no LLM call

  // Cache MISS — parse and store
  const parsed = await parseDishesFromMenu(menuText, model);

  // Write with service role (bypasses RLS)
  const { data: menu } = await supabaseAdmin
    .from('menus')
    .insert({ url, url_hash: urlHash, expires_at: computeExpiry(ttlHours) })
    .select()
    .single();

  await supabaseAdmin
    .from('menu_items')
    .insert(parsed.dishes.map(dish => ({ menu_id: menu.id, ...dish })));

  return menu;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `generateObject()` from AI SDK | `generateText()` + `Output.object()` | AI SDK 6 (late 2025) | `generateObject` deprecated; unified API going forward |
| `@supabase/ssr` for all Supabase clients | `@supabase/supabase-js` for server cache reads | v1.0 decision | Preserves Next.js fetch cache behavior |
| Separate translation table | JSONB columns on `menu_items` | Phase 4 design decision | Eliminates JOIN on every dish fetch |
| OpenAI SDK directly (`openai` npm package) | AI SDK with `@ai-sdk/openai` provider | AI SDK adoption | Provider abstraction, structured output handling, retry built-in |

**Deprecated/outdated:**
- `generateObject` from `ai`: Deprecated in AI SDK 6, still works but do not use for new code
- `@supabase/ssr` for this use case: Opts out of Next.js fetch cache — use `@supabase/supabase-js` as decided in v1.0
- Zod v4 with AI SDK: Not yet usable as of Dec 2025 — track issue #10014 on vercel/ai

---

## Open Questions

1. **AI SDK 6 + Zod v4 resolution status**
   - What we know: Issue #10014 was still open as of December 2025 with workaround of deleting node_modules. Issue #8784 and #12020 show edge cases still failing.
   - What's unclear: Whether AI SDK 6.0.99 (latest as of research date) has a clean Zod v4 fix.
   - Recommendation: Pin `zod@3.25.76` now. Add a comment in `package.json` explaining the pin. Revisit when AI SDK 6.x explicitly documents Zod v4 as fully supported.

2. **GPT-4.1-mini support in `@ai-sdk/openai`**
   - What we know: The roadmap lists GPT-4o / GPT-4o-mini / GPT-4.1-mini as admin-configurable models.
   - What's unclear: Whether `@ai-sdk/openai` currently supports `gpt-4.1-mini` as a model ID (it may be `gpt-4o-mini` only). Model IDs change as OpenAI releases versions.
   - Recommendation: The admin config stores the model string as `text` — whatever string the admin enters is passed directly to `openai(model)`. This is correct by design. Validate at runtime, not schema level.

3. **`dietary_tags` as `text[]` vs typed enum**
   - What we know: Values are `vegetarian`, `vegan`, `halal` — a small, potentially stable list.
   - What's unclear: Whether halal/vegan/vegetarian coverage is complete for v1.1. v1.2 might add `gluten-free` as a dietary tag (vs allergen).
   - Recommendation: Use `text[]` for `dietary_tags` (not a PostgreSQL enum) since this list may grow more than allergens. The allergen enum is legally defined; dietary tags are app-defined.

---

## Sources

### Primary (HIGH confidence)
- [AI SDK docs — Generating Structured Data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) — `Output.object()`, `generateText` structured output
- [AI SDK Migration Guide 6.0](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0) — `generateObject` deprecation, `Output.object()` pattern
- [AI SDK `generateText` reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text) — `output` parameter, `Output` types
- [AI SDK `zodSchema` reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/zod-schema) — `.describe()` placement, `useReferences` option
- [Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — Policy patterns, performance (`select auth.uid()`), `TO` clause
- [Supabase Enum docs](https://supabase.com/docs/guides/database/postgres/enums) — `CREATE TYPE ... AS ENUM`, `ALTER TYPE ... ADD VALUE`
- [Supabase Arrays docs](https://supabase.com/docs/guides/database/arrays) — `text[]`, `enum[]`, supabase-js array insert
- [Supabase JSONB docs](https://supabase.com/docs/guides/database/json) — `->` and `->>` operators, JSONB column creation
- [Node.js crypto docs](https://nodejs.org/api/crypto.html) — `createHash('sha256').update(url).digest('hex')`
- [AI SDK Next.js App Router quickstart](https://ai-sdk.dev/docs/getting-started/nextjs-app-router) — `npm install ai @ai-sdk/react zod`, `@ai-sdk/openai` provider

### Secondary (MEDIUM confidence)
- [OpenAI node issue #1664 — Zod v4 resolved in openai-node 6.7.0](https://github.com/openai/openai-node/issues/1664) — Confirmed closed Oct 2025; openai-node resolved but AI SDK uses its own zod-to-json-schema
- [Supabase service role in Next.js discussion #30739](https://github.com/orgs/supabase/discussions/30739) — `persistSession: false` pattern for server-side service client
- [AI SDK troubleshooting — Zod v4 JSON schema type error](https://v4.ai-sdk.dev/docs/troubleshooting/zod-v4-json-schema-type-error) — confirms pin Zod v3 recommendation

### Tertiary (LOW confidence — flag for validation)
- [vercel/ai issue #10014](https://github.com/vercel/ai/issues/10014) — Zod v4 still broken in AI SDK 5.0.86 (Dec 2025); AI SDK 6 status unclear
- [Zod v4 release notes](https://zod.dev/v4) — breaking changes summary; `z.toJSONSchema()` now native in Zod v4

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified via official AI SDK docs and npm version checks; Zod pin is confirmed via multiple GitHub issues
- Architecture: HIGH — schema patterns are standard PostgreSQL/Supabase; dual client pattern documented by Supabase
- Pitfalls: MEDIUM-HIGH — Zod v4 issue is verified; OpenAI `.optional()` restriction verified via community reports; other pitfalls are standard patterns
- Zod v4 status: LOW — exact resolution in AI SDK 6.x could not be confirmed definitively; pin v3 is the safe path

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (30 days — stable libraries; check Zod v4/AI SDK compatibility before date)
