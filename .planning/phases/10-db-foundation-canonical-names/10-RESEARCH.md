# Phase 10: DB Foundation + Canonical Names - Research

**Researched:** 2026-02-28
**Domain:** Supabase schema migration (pgvector, unaccent), LLM-based canonical name generation, async enrichment via after()
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Canonical name display**
- Canonical name is invisible infrastructure — not a user-facing label
- The user sees a clearer dish name + ability to tap and explore (Phase 11 UX)
- Always Latin script for canonical names — no native script variants
- Universal canonical + localized description (e.g., "Mantı — Raviolis turcs") when displayed in Phase 11+
- Claude's discretion: whether to show canonical name as subtitle, and whether to hide when identical to original

**Seed table scope**
- Strasbourg foreign cuisine focus: Turkish, North African, Chinese, Japanese, Italian, Alsatian — the most common foreign restaurants in Strasbourg
- 100-200 seed entries prioritizing dishes that are hardest to interpret for non-native diners
- Also include French gastronomy dishes that are hard to interpret (not just foreign)
- Claude's discretion: SQL migration vs CSV/JSON format, and whether to include alias variants per entry

**Canonical name confidence tiers**
- High confidence → auto-add to DB + display on DishCard
- Medium confidence → add to DB but don't display (or display with indicator)
- Low confidence → validation queue for manual review or purge via script
- Schema must store a confidence score alongside canonical names

**Beverage vs food logic**
- Beverages get canonical name + "beverage" flag — deprioritized for enrichment, never skipped entirely
- Classification leverages existing menu section context (menus already group by Plats/Boissons/Desserts)
- All beverages treated equally for now — no special cases for exotic drinks (Ayran, Sake, etc.)
- Schema should allow future differentiation (exotic vs standard beverages)
- Desserts: Claude's discretion on whether to treat as food or separate category
- Claude's discretion: exact classification approach (LLM field vs heuristic vs section-based)

**Re-scan behavior**
- Global shared cache — all users benefit from any previous scan of the same URL
- Re-fetch HTML on re-scan (cheap), compare with cached content
- Content-aware diff — only re-parse if actual dish items changed (ignore CSS, layout, price-only changes)
- Incremental updates — only process changed/new items, keep existing canonical names for unchanged items
- Never re-process an entire 200-item menu for a minor change — cost-conscious and ecological by design
- Claude's discretion: exact diff algorithm and change detection strategy

### Claude's Discretion

- Canonical name display approach (subtitle vs hidden when identical)
- Seed table format (SQL vs CSV/JSON)
- Alias handling in seed table
- Dessert classification
- Beverage classification method
- HTML diff algorithm for re-scan change detection
- Exact confidence thresholds for the three tiers

### Deferred Ideas (OUT OF SCOPE)

- Exotic beverage special treatment (Ayran, Lassi, Sake → treat like food) — revisit when beverage enrichment becomes relevant
- On-demand vs pre-loaded enrichment strategy for dish tap → modal — Phase 11 decision
- User-initiated enrichment (tap to enrich) as alternative to batch-enriching entire menus — Phase 11 UX decision
- Progressive enrichment for beverages — future milestone
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| KNOW-01 | Chaque plat scanné reçoit un nom canonique normalisé (Mantı = Manti = Turkish Dumplings) stocké de manière persistante | LLM batch call with structured output (Zod) at parse time; store result in `canonical_name` + `canonical_confidence` columns on `menu_items`; cache prevents re-generation on cache hits |
| KNOW-02 | Une seed table de plats connus ancre la normalisation pour les cuisines régionales (turque, alsacienne, japonaise, etc.) | New `known_dishes` table with seed data in SQL migration; LLM prompt references seed as exemplars; embedding-based lookup (pgvector) enables fuzzy matching against seed entries |
| KNOW-03 | L'enrichissement est batch et async (via `after()`) — le scan reste rapide, l'enrichissement arrive en arrière-plan | `after()` from `next/server` is stable in Next.js 15.1+; already used in both scan routes for Google Places enrichment; canonical name generation fires inside `after()` after response sent |
| KNOW-04 | Les plats sont priorisés sur les boissons pour l'enrichissement (les boissons reçoivent un enrichissement minimal ou aucun) | `is_beverage` boolean flag derived from `category`/`subcategory` fields already present on `menu_items`; enrichment queue skips or deprioritizes rows where `is_beverage = true` |
</phase_requirements>

---

## Summary

Phase 10 has three interlocking components: (1) a SQL migration that adds pgvector, unaccent, and new columns to the existing schema; (2) a canonical name generation pipeline that runs as a batch LLM call inside `after()` after every scan; and (3) a `known_dishes` seed table that anchors normalization for Strasbourg's foreign cuisines.

The existing codebase already validates the `after()` pattern — both `app/api/scan/url/route.ts` and `app/api/scan/photo/route.ts` fire Google Places enrichment inside `after()`. Canonical name generation follows the exact same wiring pattern: call `after()`, pass the freshly stored `menu.id`, run a single batched LLM call for all items, then `UPDATE menu_items` with results. This keeps scan response time within the 3-second budget (canonical generation never blocks the HTTP response).

The schema additions are straightforward: `canonical_name TEXT`, `canonical_confidence FLOAT` (0.0–1.0), `is_beverage BOOLEAN`, and `embedding VECTOR(1536)` on `menu_items`, plus a new `known_dishes` table with a pgvector embedding column for fuzzy seed lookups. The `match_dishes` SQL RPC exposes similarity search via `supabase.rpc()`.

**Primary recommendation:** Model canonical name generation after the existing `enrichWithGooglePlaces` pattern — a standalone async function called inside `after()`, updating `menu_items` rows in bulk, with no changes to the synchronous scan path.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pgvector | pre-installed on Supabase | Vector similarity search, embedding storage | Official Supabase extension; HNSW index for fast nearest-neighbor lookup |
| unaccent | pre-installed on Supabase | Strip diacritics for accent-insensitive canonical matching (Mantı → manti) | PostgreSQL bundled extension; zero runtime cost |
| `@ai-sdk/openai` + `ai` | `^3.0.33` / `^6.0.99` | Batch LLM call for canonical name generation | Already in project; same pattern as `parseDishesFromMenuFast` |
| `zod` | `3.25.76` | Structured output schema validation | Already pinned; Zod v4 breaks AI SDK (documented pitfall in codebase) |
| `@supabase/supabase-js` | `^2.97.0` | DB writes (service role for UPDATE), RPC calls for vector search | Already in project |
| `next/server` `after()` | Next.js 16.1.6 | Non-blocking post-response execution | Already used in both scan routes; stable since 15.1 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| OpenAI Embeddings API (text-embedding-3-small) | - | Generate 1536-dim vectors for canonical name semantic search | Phase 10 only if seed lookup via embedding is implemented; locked model per prior decisions |
| `node:crypto` SHA-256 | built-in | Content hashing for re-scan diff detection | Already used in `lib/cache.ts` via `hashUrl()` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pgvector HNSW | IVFFlat | IVFFlat requires data to exist before building index; HNSW builds incrementally — better for a growing seed table |
| Batch LLM call (all dishes at once) | Per-dish LLM calls | Batch = 1 API call per menu (cost-efficient); per-dish = N API calls (expensive and slow) |
| SQL seed in migration file | CSV seeded via script | SQL migration is atomic and versioned; CSV requires a separate load step |

**Installation:** No new npm packages required. pgvector and unaccent are already available as Supabase extensions.

---

## Architecture Patterns

### Recommended Project Structure

```
lib/
├── canonical.ts          # generateCanonicalNames() — batch LLM call, update menu_items
├── types/
│   └── llm.ts            # Add canonicalBatchSchema (Zod) for LLM output validation
supabase/
├── migrations/
│   └── 20260228XXXXXX_v12_foundation.sql   # pgvector, unaccent, new columns, HNSW, RPC
│   └── 20260228XXXXXX_known_dishes_seed.sql # known_dishes table + seed data
```

The canonical generation function lives in `lib/canonical.ts` (mirroring `lib/google-places.ts`). Both scan routes import and call it inside `after()`, identical to how `enrichWithGooglePlaces` is already wired.

### Pattern 1: Schema Migration for pgvector + new columns

**What:** Single SQL migration that enables pgvector, unaccent, adds columns to `menu_items`, creates `known_dishes` table, creates HNSW index, and creates `match_dishes` RPC function.

**When to use:** First task of Phase 10. All subsequent work depends on schema being in place.

```sql
-- Source: Supabase docs https://supabase.com/docs/guides/database/extensions/pgvector
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- New columns on menu_items
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS canonical_name        TEXT,
  ADD COLUMN IF NOT EXISTS canonical_confidence  FLOAT,         -- 0.0 to 1.0
  ADD COLUMN IF NOT EXISTS canonical_source      TEXT,          -- 'seed_match' | 'llm_generated'
  ADD COLUMN IF NOT EXISTS is_beverage           BOOLEAN        NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS enrichment_status     TEXT           NOT NULL DEFAULT 'pending',
  -- 'pending' | 'enriched' | 'skipped' | 'failed'
  ADD COLUMN IF NOT EXISTS embedding             extensions.vector(1536);

-- HNSW index on embedding — build immediately, fills as rows are added
-- Source: https://supabase.com/docs/guides/ai/vector-indexes/hnsw-indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_embedding
  ON menu_items USING hnsw (embedding extensions.vector_cosine_ops);

-- Partial index on enrichment_status for efficient queue polling
CREATE INDEX IF NOT EXISTS idx_menu_items_enrichment_status
  ON menu_items (enrichment_status)
  WHERE enrichment_status = 'pending';

-- known_dishes seed table
CREATE TABLE IF NOT EXISTS known_dishes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name   TEXT        NOT NULL UNIQUE,   -- e.g. "Mantı"
  aliases          TEXT[]      NOT NULL DEFAULT '{}', -- e.g. ["Manti", "Turkish dumplings"]
  cuisine          TEXT,                           -- e.g. "turkish", "alsatian", "japanese"
  is_beverage      BOOLEAN     NOT NULL DEFAULT FALSE,
  description_fr   TEXT,                           -- brief cultural description (FR)
  description_en   TEXT,
  embedding        extensions.vector(1536),        -- embedding of canonical_name for fuzzy lookup
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_known_dishes_embedding
  ON known_dishes USING hnsw (embedding extensions.vector_cosine_ops);

-- match_dishes RPC — called from supabase.rpc() for semantic lookup
-- Source: Supabase semantic search docs
CREATE OR REPLACE FUNCTION match_dishes(
  query_embedding  extensions.vector(1536),
  match_threshold  FLOAT    DEFAULT 0.85,
  match_count      INT      DEFAULT 5
)
RETURNS TABLE (
  id              UUID,
  canonical_name  TEXT,
  aliases         TEXT[],
  cuisine         TEXT,
  similarity      FLOAT
)
LANGUAGE sql AS $$
  SELECT
    id,
    canonical_name,
    aliases,
    cuisine,
    1 - (embedding <=> query_embedding) AS similarity
  FROM known_dishes
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

### Pattern 2: Canonical Name Generation — Batch LLM Call

**What:** Single `generateText` call with `Output.object()` that processes all dish names from one menu in one batch. Returns `canonical_name`, `confidence`, and `is_beverage` for each dish.

**When to use:** Inside `after()` callback in both scan route handlers, after `menu` row is stored.

```typescript
// lib/canonical.ts
// Source: mirrors lib/google-places.ts pattern + lib/openai.ts Output.object() pattern

import 'server-only';
import { generateText, Output, NoObjectGeneratedError } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { supabaseAdmin } from './supabase-admin';
import { DEFAULT_LLM_MODEL } from './types/config';

const canonicalDishSchema = z.object({
  index: z.number(),
  canonical_name: z.string().nullable(),    // null if LLM cannot determine
  confidence: z.number(),                    // 0.0–1.0
  is_beverage: z.boolean(),
});

const canonicalBatchSchema = z.object({
  dishes: z.array(canonicalDishSchema),
});

const CANONICAL_SYSTEM_PROMPT = `You are a culinary normalizer. Given a list of dish names from a restaurant menu, produce a canonical name for each.

Rules:
1. CANONICAL NAME: The standard international name in Latin script. Use the most widely recognized form (e.g. "Mantı" not "Manti" or "Turkish Dumplings", "Tarte Flambée" not "Flammekueche").
2. CONFIDENCE: Score from 0.0 to 1.0. High (>0.8) when you are certain. Medium (0.5–0.8) when the dish matches a known type but with variation. Low (<0.5) when the name is ambiguous or you are guessing.
3. IS_BEVERAGE: true if the item is a drink (water, wine, beer, juice, coffee, tea, etc.). false otherwise.
4. If the dish name is already its canonical form (e.g. a simple French dish like "Steak frites"), return it unchanged with high confidence.
5. Desserts are food, not beverages. is_beverage = false for all desserts.
6. Return the same "index" as the input.`;

export async function generateCanonicalNames(menuId: string, model?: string): Promise<void> {
  const selectedModel = model ?? DEFAULT_LLM_MODEL;

  try {
    // Fetch all pending items for this menu
    const { data: items, error } = await supabaseAdmin
      .from('menu_items')
      .select('id, name_original, category, subcategory')
      .eq('menu_id', menuId)
      .is('canonical_name', null);   // only unprocessed items

    if (error || !items || items.length === 0) return;

    const dishList = items.map((item, idx) => ({
      index: idx,
      name: item.name_original,
      category: item.category,    // provides beverage context
      subcategory: item.subcategory,
    }));

    const { experimental_output: output } = await generateText({
      model: openai(selectedModel),
      output: Output.object({ schema: canonicalBatchSchema }),
      maxRetries: 1,
      system: CANONICAL_SYSTEM_PROMPT,
      prompt: JSON.stringify(dishList, null, 2),
    });

    // Map results back and batch update
    const updates = output.dishes.map((result) => {
      const item = items[result.index];
      if (!item) return null;

      const confidence = result.confidence;
      const enrichmentStatus =
        confidence >= 0.8 ? 'enriched' :
        confidence >= 0.5 ? 'enriched' :   // medium: still stored, display gated by confidence
        'pending';                          // low: leave in queue for manual review

      return {
        id: item.id,
        canonical_name: result.canonical_name,
        canonical_confidence: confidence,
        canonical_source: 'llm_generated' as const,
        is_beverage: result.is_beverage,
        enrichment_status: result.canonical_name ? enrichmentStatus : 'failed',
      };
    }).filter(Boolean);

    // Batch upsert — one round-trip for entire menu
    if (updates.length > 0) {
      await supabaseAdmin
        .from('menu_items')
        .upsert(updates, { onConflict: 'id' });
    }
  } catch (error) {
    if (error instanceof NoObjectGeneratedError) {
      console.error('[generateCanonicalNames] NoObjectGeneratedError for menu:', menuId, error.text);
    } else {
      console.error('[generateCanonicalNames] Error for menu:', menuId, error);
    }
    // Never throw — this is fire-and-forget inside after()
  }
}
```

### Pattern 3: Wiring inside scan routes — after()

**What:** Import and call `generateCanonicalNames` inside the existing `after()` block, or chain a second `after()`.

**When to use:** In all scan routes where `getOrParseMenu` is called. Identical pattern to `enrichWithGooglePlaces`.

```typescript
// app/api/scan/url/route.ts — existing pattern, add canonical call
import { generateCanonicalNames } from '@/lib/canonical';

// After getOrParseMenu returns:
const menu = await getOrParseMenu(url, 'url', result.content);

after(() => {
  enrichWithGooglePlaces(menu.restaurant_name, url, menu.id);
});
after(async () => {
  await generateCanonicalNames(menu.id);
});

return NextResponse.json({ menuId: menu.id });
```

Note: Two separate `after()` calls are valid — they run concurrently and Next.js docs confirm `after` can be nested or called multiple times.

### Pattern 4: Re-scan content-aware diff

**What:** Compare raw_text hash of new scan against stored raw_text hash. If different, check if dish names changed (not just prices/layout). Only re-trigger canonical generation for changed/new items.

**When to use:** Inside `getOrParseMenu` when a cache entry exists but the user re-scans.

**Recommended approach:** Hash the sorted list of `name_original` values (stripped of prices/descriptions). If hash matches stored value, skip LLM re-parse and re-use existing canonical names.

```typescript
// lib/cache.ts — content-aware diff helper
import { createHash } from 'node:crypto';

export function hashDishNames(dishes: { name_original: string }[]): string {
  const names = dishes
    .map(d => d.name_original.trim().toLowerCase())
    .sort()
    .join('|');
  return createHash('sha256').update(names).digest('hex');
}
```

Store `dish_names_hash TEXT` on the `menus` table. On re-scan, compare new hash with stored. If equal, return cached menu without LLM call. If different, identify new/changed dishes only and call `generateCanonicalNames` for those IDs.

### Pattern 5: Beverage classification from existing category fields

**What:** Derive `is_beverage` from `category` and `subcategory` already stored on `menu_items`. No new LLM field required at classification time — the LLM confirms during canonical name generation.

**When to use:** As a heuristic pre-filter before the canonical LLM call, to skip beverages from enrichment queue.

```typescript
// Heuristic based on existing category data
function isBeverageCategory(category: string | null, subcategory: string | null): boolean {
  const BEVERAGE_PATTERNS = [
    /boisson/i, /drink/i, /beverage/i, /biere/i, /bière/i, /vin/i, /wine/i,
    /cocktail/i, /café/i, /cafe/i, /thé/i, /tea/i, /eau/i, /water/i,
    /jus/i, /juice/i, /soda/i, /alcool/i, /spirit/i, /bier/i, /getränk/i,
  ];
  const text = `${category ?? ''} ${subcategory ?? ''}`;
  return BEVERAGE_PATTERNS.some(p => p.test(text));
}
```

This runs synchronously at insert time or as the first step of `generateCanonicalNames`, before the LLM call.

### Pattern 6: Seed table format — SQL in migration

**What:** 100-200 known dishes in a dedicated SQL migration file. Each row has `canonical_name`, `aliases[]`, `cuisine`, `description_fr`, `description_en`.

**Recommendation:** SQL migration (not CSV/JSON). Reasons: (a) atomic with schema creation; (b) no separate load script; (c) version-controlled alongside schema; (d) aliases stored as PostgreSQL `TEXT[]`.

**Aliases recommendation:** Include 3-5 aliases per entry — common misspellings, transliterations, and English equivalents. Example:

```sql
-- supabase/migrations/XXXXXX_known_dishes_seed.sql
INSERT INTO known_dishes (canonical_name, aliases, cuisine, description_fr, description_en) VALUES
-- Turkish
('Mantı',          ARRAY['Manti', 'Turkish dumplings', 'ravioli turc'],       'turkish',   'Petits raviolis farcis à la viande, servis avec yaourt et sauce tomate',          'Small meat-filled dumplings served with yoghurt and tomato sauce'),
('Lahmacun',       ARRAY['Lahmajun', 'pizza turque', 'Turkish pizza'],         'turkish',   'Fine galette de pain garnie de viande hachée épicée',                             'Thin flatbread topped with spiced minced meat'),
('Köfte',          ARRAY['Kofta', 'Kofte', 'boulettes turques'],               'turkish',   'Boulettes de viande épicées, grillées ou cuites à la poêle',                      'Spiced meatballs, grilled or pan-fried'),
('Döner Kebab',    ARRAY['Doner', 'Döner', 'kebab'],                           'turkish',   'Viande grillée à la broche, servie en sandwich ou en assiette',                   'Spit-grilled meat served in a wrap or on a plate'),
('İskender',       ARRAY['Iskender', 'Iskender kebab', 'Alexander kebab'],     'turkish',   'Döner sur pain, nappé de sauce tomate et beurre fondu',                           'Döner on bread topped with tomato sauce and melted butter'),
('Mercimek Çorbası', ARRAY['Mercimek corbasi', 'soupe lentilles turque'],      'turkish',   'Soupe crémeuse de lentilles rouges épicée',                                       'Creamy spiced red lentil soup'),
('Börek',          ARRAY['Borek', 'burek', 'feuilleté turc'],                  'turkish',   'Feuilleté de pâte fine farci au fromage, viande ou légumes',                      'Thin pastry filled with cheese, meat or vegetables'),
('Pide',           ARRAY['pide ekmek', 'pain turc', 'Turkish flatbread'],      'turkish',   'Pain plat turc, nature ou garni',                                                 'Turkish flatbread, plain or topped'),
-- North African
('Couscous',       ARRAY['couscous royal', 'couscous marocain'],               'north_african', 'Semoule fine accompagnée de légumes et viande mijotés',                       'Fine semolina served with braised vegetables and meat'),
('Tajine',         ARRAY['Tagine', 'tajine marocain'],                         'north_african', 'Ragoût mijoté lentement dans un plat en argile conique',                      'Slow-cooked stew in a conical clay pot'),
('Merguez',        ARRAY['saucisse merguez', 'saucisse nord-africaine'],       'north_african', 'Saucisse épicée à la harissa, de boeuf ou mouton',                            'Spiced harissa sausage of beef or lamb'),
('Pastilla',       ARRAY['bastilla', 'bstilla', 'pastela'],                    'north_african', 'Tourte feuilletée sucrée-salée, traditionnellement au pigeon ou poulet',      'Sweet-savoury flaky pie, traditionally pigeon or chicken'),
('Harira',         ARRAY['soupe harira', 'harira soup'],                       'north_african', 'Soupe épaisse de tomates, lentilles et pois chiches',                         'Thick tomato, lentil and chickpea soup'),
-- Alsatian
('Tarte Flambée',  ARRAY['Flammekueche', 'flammkuche', 'tarte à la flamme'],  'alsatian',  'Fine tarte à la crème fraîche, oignons et lardons',                               'Thin tart with crème fraîche, onions and bacon'),
('Choucroute',     ARRAY['choucroute garnie', 'sauerkraut'],                   'alsatian',  'Chou fermenté accompagné de charcuteries et pommes de terre',                    'Fermented cabbage served with cold cuts and potatoes'),
('Baeckeoffe',     ARRAY['Beckenofe', 'baeckenoffe', 'potée alsacienne'],      'alsatian',  'Ragoût de viandes et légumes mijoté lentement en terrine fermée',                'Slow-braised meat and vegetable terrine'),
('Munster',        ARRAY['fromage munster', 'Munster fermier'],                 'alsatian',  'Fromage à pâte molle et croûte lavée, au goût fort et parfumé',                  'Soft washed-rind cheese with a strong pungent flavour'),
('Presskopf',      ARRAY['tête de veau', 'fromage de tête alsacien'],          'alsatian',  'Terrine de viandes de tête en gelée, spécialité charcutière alsacienne',          'Pressed head-meat terrine in aspic, an Alsatian charcuterie speciality'),
-- Japanese
('Ramen',          ARRAY['râmen', 'soupe ramen'],                              'japanese',  'Soupe de nouilles japonaises dans un bouillon riche, garnie de viande et légumes', 'Japanese noodle soup in rich broth, topped with meat and vegetables'),
('Gyoza',          ARRAY['raviolis japonais', 'jiaozi', 'dumpling japonais'],  'japanese',  'Raviolis japonais poêlés à la viande et aux légumes',                             'Pan-fried Japanese dumplings filled with meat and vegetables'),
('Takoyaki',       ARRAY['boulettes pieuvre', 'octopus balls'],                'japanese',  'Boulettes de pâte garnies de morceaux de pieuvre, sauce et mayonnaise',           'Batter balls filled with octopus, topped with sauce and mayo'),
('Okonomiyaki',    ARRAY['crêpe japonaise', 'Japanese pancake'],               'japanese',  'Crêpe épaisse japonaise garnie de chou, viande ou fruits de mer',                 'Thick Japanese savoury pancake with cabbage, meat or seafood'),
('Tonkatsu',       ARRAY['côtelette panée japonaise', 'Japanese pork cutlet'], 'japanese',  'Escalope de porc panée et frite, servie avec sauce tonkatsu',                    'Breaded and fried pork cutlet served with tonkatsu sauce'),
('Tempura',        ARRAY['beignets japonais', 'friture japonaise'],            'japanese',  'Beignets légers de légumes ou fruits de mer en pâte aérée',                      'Light battered and fried vegetables or seafood'),
('Soba',           ARRAY['nouilles soba', 'buckwheat noodles'],                'japanese',  'Nouilles de sarrasin japonaises, servies froides ou en soupe chaude',             'Japanese buckwheat noodles, served cold or in hot broth'),
('Udon',           ARRAY['nouilles udon', 'udon noodles'],                     'japanese',  'Épaisses nouilles de blé japonaises en soupe ou sautées',                        'Thick Japanese wheat noodles in soup or stir-fried'),
-- Italian (harder to interpret)
('Osso Buco',      ARRAY['ossobuco', 'osso bucco'],                            'italian',   'Jarret de veau mijoté à la tomate et aux légumes aromatiques',                   'Braised veal shank with tomato and aromatics'),
('Risotto',        ARRAY['risotto crémeux'],                                   'italian',   'Riz à grain court cuit lentement dans un bouillon, texture crémeuse',             'Short-grain rice slow-cooked in broth to a creamy consistency'),
('Arancini',       ARRAY['arancine', 'rice balls', 'boulettes riz'],           'italian',   'Boulettes de riz farcies, panées et frites, spécialité sicilienne',              'Stuffed, breaded and fried rice balls, a Sicilian speciality'),
('Burrata',        ARRAY['burrata fresca', 'fromage burrata'],                 'italian',   'Fromage frais crémeux à cœur liquide, spécialité des Pouilles',                  'Fresh creamy cheese with liquid centre, a Puglia speciality'),
('Tiramisu',       ARRAY['tiramisù', 'tiramis'],                               'italian',   'Dessert en couches de biscuits imbibés de café et crème mascarpone',             'Layered dessert of coffee-soaked biscuits and mascarpone cream'),
-- Chinese
('Dim Sum',        ARRAY['dim-sum', 'dumplings chinois', 'yum cha'],           'chinese',   'Petits plats vapeur servis dans des paniers en bambou',                           'Small steamed dishes served in bamboo baskets'),
('Peking Duck',    ARRAY['canard laqué de Pékin', 'canard pékinois'],          'chinese',   'Canard rôti à la peau croustillante, servi avec galettes et hoisin',             'Roast duck with crispy skin, served with pancakes and hoisin sauce'),
('Mapo Tofu',      ARRAY['ma po tofu', 'tofu sichuan'],                        'chinese',   'Tofu tendre dans une sauce épicée au piment et poivre du Sichuan',               'Soft tofu in spicy chilli and Sichuan pepper sauce'),
('Baozi',          ARRAY['bao', 'bao bun', 'pain vapeur farci'],               'chinese',   'Pain vapeur moelleux farci à la viande ou aux légumes',                           'Fluffy steamed bun filled with meat or vegetables'),
-- French gastronomy (hard to interpret)
('Pot-au-feu',     ARRAY['pot au feu'],                                        'french',    'Plat mijoté de boeuf et légumes dans un bouillon clair',                         'Slow-simmered beef and vegetables in clear broth'),
('Blanquette de Veau', ARRAY['blanquette', 'veal blanquette'],                 'french',    'Ragout de veau crémeux en sauce blanche, sans coloration',                       'Creamy white veal ragout, cooked without browning'),
('Bouillabaisse',  ARRAY['bouillabaisse marseillaise'],                        'french',    'Soupe de poissons et crustacés provençale, servi avec rouille et croûtons',      'Provençal fish and shellfish soup, served with rouille and croutons'),
('Quenelle',       ARRAY['quenelle de brochet', 'quenelles lyonnaises'],       'french',    'Boulette légère et mousseline de poisson ou viande, spécialité lyonnaise',       'Light and airy fish or meat dumpling, a Lyon speciality'),
('Tête de Veau',   ARRAY['tête de veau sauce gribiche', 'veal head'],          'french',    'Plat traditionnel français de joues et langue de veau, sauce gribiche',          'Traditional French dish of veal cheek and tongue with gribiche sauce')
ON CONFLICT (canonical_name) DO NOTHING;
```

### Anti-Patterns to Avoid

- **Generating canonical names synchronously in getOrParseMenu:** Adds 3-8 seconds to every scan response. All enrichment must be `after()`.
- **Per-dish LLM calls:** One API call per dish for 200-item menus = 200 API calls. Always batch the entire menu in one call.
- **Using IVFFlat for the embedding index:** Requires data before building the index. HNSW builds incrementally, safe to create on empty table.
- **Storing canonical names only on first scan:** On re-parse, if you DELETE old menu_items rows (current pattern in cache.ts), canonical names are lost. Must either recycle them (like the existing `translationCache` pattern) or skip re-generation for unchanged dishes.
- **Calling `cookies()` or `headers()` inside `after()` in Server Components:** Throws a runtime error per Next.js docs. Route Handlers (the scan routes) are fine — they allow request API access inside `after()` callbacks.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Vector similarity search | Custom cosine distance function | pgvector HNSW + `match_dishes` RPC | Handles indexing, approximate search, and operator optimization |
| Accent normalization | Custom diacritic stripping | `unaccent()` PostgreSQL function | Handles all Unicode diacritics correctly; language-aware |
| Post-response background execution | Manual promise queuing or worker threads | `after()` from `next/server` | Already in use; Vercel-native; no extra infrastructure |
| Batch LLM structured output | Custom JSON parsing | AI SDK `Output.object()` + Zod | Already established pattern in codebase; handles retries, validation |
| Content hash for diff | String comparison | `node:crypto` SHA-256 on sorted dish names | Already used for URL hashing; deterministic, fast |

**Key insight:** Every primitive needed for Phase 10 is either already in the codebase (after(), AI SDK, Zod, supabaseAdmin, SHA-256 hashing) or available as a Supabase extension (pgvector, unaccent). This phase is wiring, not invention.

---

## Common Pitfalls

### Pitfall 1: Canonical names lost on re-parse

**What goes wrong:** `getOrParseMenu` deletes the existing menu row and all its `menu_items` (cascade delete) before inserting a fresh parse. Canonical names stored in the old rows are destroyed.

**Why it happens:** The current re-parse strategy is delete-then-insert (see `cache.ts` lines 221-241). This works for translations because of the `translationCache` recycling pattern, but canonical names need the same treatment.

**How to avoid:** Before deleting the old menu, fetch existing canonical data keyed by `name_original`, exactly like the existing `translationCache` pattern. Re-apply the harvested canonical names to matching new items. Only run `generateCanonicalNames` for items that are genuinely new (not in the harvest map).

**Warning signs:** Canonical names are `null` after a re-scan of a previously scanned URL.

### Pitfall 2: LLM batch call timing out for large menus

**What goes wrong:** A 200-dish menu sent to the LLM in one call may time out or hit token limits, especially with `maxRetries: 1`.

**Why it happens:** The codebase already truncates `rawText` to 12,000 chars for the parse call, but canonical name generation operates on dish names only (much shorter). However, 200 dish names could still be 3,000-5,000 tokens.

**How to avoid:** Chunk menus larger than 80 dishes into batches of 80 max. Run batches sequentially inside `after()`. Since this is not blocking the response, sequential chunking is fine.

**Warning signs:** `NoObjectGeneratedError` in server logs for large menus.

### Pitfall 3: pgvector extension schema mismatch

**What goes wrong:** If pgvector is enabled under the `extensions` schema, column type must be declared as `extensions.vector(1536)`, not just `vector(1536)`. Mismatched references cause migration errors.

**Why it happens:** Supabase installs extensions in the `extensions` schema by default, not `public`. Type references must be fully qualified.

**How to avoid:** Consistently use `extensions.vector(1536)` in all column definitions and index creation statements. Verify with `\dx` in psql after enabling.

**Warning signs:** Migration error "type vector does not exist".

### Pitfall 4: after() runs at build time on static pages

**What goes wrong:** If `after()` were called in a Server Component page (not a Route Handler), it would execute at build time during static prerendering.

**Why it happens:** Next.js docs explicitly state: "if it's used within a static page, the callback will execute at build time, or whenever a page is revalidated."

**How to avoid:** Only call `generateCanonicalNames` inside Route Handlers (`app/api/scan/*/route.ts`), never in page components. This is already the pattern for `enrichWithGooglePlaces`.

**Warning signs:** N/A — scan routes are Route Handlers, not pages. Not a risk if the wiring follows the existing pattern.

### Pitfall 5: Confidence threshold values require calibration

**What goes wrong:** Setting confidence thresholds too high results in all canonical names landing in the "pending" queue; too low results in bad canonical names being auto-displayed.

**Why it happens:** LLM confidence scores are soft probabilities that need empirical calibration against actual menu data.

**How to avoid:** Start with conservative thresholds: HIGH ≥ 0.80, MEDIUM 0.50–0.79, LOW < 0.50. After a few dozen menus are processed, review the distribution in Supabase dashboard and adjust. Store thresholds in `admin_config` or as constants to make adjustment easy.

**Warning signs:** All items in the "pending" queue, or many obviously-wrong canonical names with high confidence.

### Pitfall 6: Re-scan diff operating on raw HTML vs. dish names

**What goes wrong:** Hashing raw HTML (or raw_text from Screenshotone) is fragile — CSS changes, layout changes, ad injections all trigger false "content changed" signals.

**Why it happens:** The diff must operate at the semantic level (dish names and prices), not the HTML level.

**How to avoid:** Store a `dish_names_hash` on the `menus` table computed from the sorted list of `name_original` values after parsing (not before). On re-scan, parse the new HTML into dish names, compute the new hash, compare with stored hash. Only re-enrich if hash differs.

**Warning signs:** Canonical name re-generation triggered for every re-scan despite no menu changes.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### Enabling pgvector and unaccent in a migration

```sql
-- Source: https://supabase.com/docs/guides/database/extensions
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
```

### HNSW index creation

```sql
-- Source: https://supabase.com/docs/guides/ai/vector-indexes/hnsw-indexes
-- Build immediately on empty table — safe, fills as data arrives
CREATE INDEX IF NOT EXISTS idx_menu_items_embedding
  ON menu_items USING hnsw (embedding extensions.vector_cosine_ops);
```

### match_dishes RPC call from TypeScript

```typescript
// Source: https://supabase.com/docs/guides/ai/semantic-search
const { data: matches } = await supabase.rpc('match_dishes', {
  query_embedding: embedding,   // number[] from openai.embeddings.create()
  match_threshold: 0.85,
  match_count: 3,
});
```

### Generating an embedding for seed lookup

```typescript
// Source: OpenAI docs — text-embedding-3-small, 1536 dimensions default
import OpenAI from 'openai';
const openai = new OpenAI();

const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: dishName,
});
const embedding = response.data[0].embedding; // number[1536]
```

### Wiring canonical names in scan route (complete pattern)

```typescript
// app/api/scan/url/route.ts — add after existing Google Places after() call
import { generateCanonicalNames } from '@/lib/canonical';

const menu = await getOrParseMenu(url, 'url', result.content);
after(() => enrichWithGooglePlaces(menu.restaurant_name, url, menu.id));
after(async () => { await generateCanonicalNames(menu.id); });
return NextResponse.json({ menuId: menu.id });
```

### Canonical name recycling during re-parse (mirrors existing translationCache)

```typescript
// lib/cache.ts — add alongside existing translationCache logic
const canonicalCache = new Map<string, { canonical_name: string; canonical_confidence: number; is_beverage: boolean }>();
if (oldItems) {
  for (const old of oldItems) {
    if (old.name_original && old.canonical_name) {
      canonicalCache.set(old.name_original, {
        canonical_name: old.canonical_name,
        canonical_confidence: old.canonical_confidence,
        is_beverage: old.is_beverage ?? false,
      });
    }
  }
}
// When inserting new menu_items, recycle canonical data for unchanged dishes
const recycledCanonical = canonicalCache.get(dish.name_original);
```

### unaccent for accent-insensitive matching (SQL)

```sql
-- Source: https://www.postgresql.org/docs/current/unaccent.html
-- Case-insensitive, accent-insensitive match
SELECT canonical_name FROM known_dishes
WHERE unaccent(lower(canonical_name)) = unaccent(lower($1))
   OR $1 = ANY(aliases);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| IVFFlat vector index | HNSW index | pgvector 0.6+ (2023) | HNSW safe to create on empty table; fills incrementally; faster queries |
| `generateObject()` (AI SDK) | `generateText()` + `Output.object()` | AI SDK v6 (late 2024) | `generateObject` deprecated; current codebase already uses correct pattern |
| `unstable_after()` | `after()` | Next.js 15.1.0 (stable) | Stable API; already used in both scan routes |
| OpenAI ada-002 embeddings | text-embedding-3-small | Jan 2024 | Locked by prior decision; 1536 dims default; $0.02/M tokens |

**Deprecated/outdated:**
- `generateObject()`: deprecated in AI SDK v6. The codebase correctly uses `Output.object()` instead.
- `unstable_after()`: renamed to `after()` in Next.js 15.1. Current import is already `from 'next/server'` — correct.

---

## Open Questions

1. **Seed table embeddings: when to generate them?**
   - What we know: `known_dishes` table needs `embedding` populated to enable `match_dishes` RPC lookups.
   - What's unclear: Should embeddings be generated in the migration itself (using a pg function), in a one-time seed script, or lazily on first canonical name lookup?
   - Recommendation: One-time seed script run after migration — cleaner than SQL, easier to maintain. The script fetches each canonical_name, generates its embedding via `text-embedding-3-small`, and UPDATEs the row. Cost: 150 names × ~3 tokens × $0.02/M ≈ negligible.

2. **Canonical names for items already in the DB (before Phase 10)**
   - What we know: Existing `menu_items` rows have `canonical_name = null` before migration.
   - What's unclear: Whether to backfill existing items or leave them as pending until re-scan.
   - Recommendation: Leave as pending. Re-scan triggers canonical generation naturally. A backfill script is a cleanup operation, not a Phase 10 requirement.

3. **Dessert classification: food or separate category?**
   - What we know: Desserts must be classified. Decision deferred to Claude's discretion.
   - Recommendation: Treat desserts as food (`is_beverage = false`). Desserts are enrichable content (cultural context is valuable for items like Riz au lait, Crème brûlée, Baklava). Add `is_dessert BOOLEAN DEFAULT FALSE` to `menu_items` only if Phase 11 needs to deprioritize them differently from mains — skip for Phase 10.

4. **Confidence thresholds: exact values**
   - What we know: Three tiers (high/medium/low) are locked. Exact thresholds are at discretion.
   - Recommendation: HIGH ≥ 0.80 (auto-display), MEDIUM 0.50–0.79 (store, don't display), LOW < 0.50 (enrichment_status = 'pending' for manual review). Adjust after observing real LLM output distribution.

5. **match_dishes RPC: will it be used in Phase 10?**
   - What we know: The RPC is in the schema plan but canonical name generation in Phase 10 is LLM-based, not embedding-based.
   - What's unclear: Whether Phase 10 needs the RPC at all, or whether it's purely Phase 11 infrastructure.
   - Recommendation: Create the RPC in the migration (infrastructure for Phase 11) but do not call it in Phase 10 logic. The seed table lookup in Phase 10 is done via the LLM prompt context, not via embedding similarity.

---

## Sources

### Primary (HIGH confidence)

- Supabase docs — pgvector extension: https://supabase.com/docs/guides/database/extensions/pgvector
- Supabase docs — HNSW indexes: https://supabase.com/docs/guides/ai/vector-indexes/hnsw-indexes
- Supabase docs — Semantic search + match_documents pattern: https://supabase.com/docs/guides/ai/semantic-search
- Supabase docs — Extensions overview (pgvector and unaccent available by default): https://supabase.com/docs/guides/database/extensions
- Next.js docs — after() API (v16.1.6, last updated 2026-02-27): https://nextjs.org/docs/app/api-reference/functions/after
- Existing codebase — `lib/cache.ts` (translationCache pattern, delete-then-insert, getOrParseMenu)
- Existing codebase — `app/api/scan/url/route.ts` (after() wiring for Google Places)
- Existing codebase — `lib/openai.ts` (Output.object() + Zod batch pattern)
- PostgreSQL docs — unaccent extension: https://www.postgresql.org/docs/current/unaccent.html

### Secondary (MEDIUM confidence)

- OpenAI embeddings pricing (text-embedding-3-small $0.02/M tokens, 1536 dims): https://platform.openai.com/docs/models/text-embedding-3-small
- Supabase semantic search guide (match_documents SQL function pattern): https://supabase.com/docs/guides/ai/semantic-search

### Tertiary (LOW confidence)

- Vercel after() serverless behavior (community reports of blocking in some configurations): https://github.com/vercel/next.js/discussions/77813 — The official Next.js docs confirm after() works in Route Handlers; community reports of issues are older or misconfigured setups.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project or Supabase-native; verified via official docs
- Architecture: HIGH — canonical pattern derived directly from existing `enrichWithGooglePlaces` + `translationCache` patterns in codebase
- Schema migration: HIGH — pgvector/unaccent SQL verified via Supabase docs; HNSW syntax confirmed
- Pitfalls: HIGH for canonical recycling (Pitfall 1) and pgvector schema (Pitfall 3) — directly observable in codebase; MEDIUM for confidence threshold calibration (Pitfall 5) — empirical
- Seed data: MEDIUM — content is correct, count (100-200 entries) is an estimate; actual coverage needs review after initial implementation

**Research date:** 2026-02-28
**Valid until:** 2026-04-01 (stable ecosystem — pgvector, Next.js after(), Supabase extensions change slowly)
