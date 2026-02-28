# Phase 11: Dish Enrichment - Research

**Researched:** 2026-02-28
**Domain:** LLM enrichment pipeline, adaptive prompt design, progressive UI (polling + bottom sheet + skeleton), admin regeneration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Enrichment content & depth**
- Adaptive depth: exotic/foreign dishes get full cultural storytelling (origin, cultural significance, regional variations, how it's eaten); common dishes (steak frites, salade César) get practical-only enrichment (what it is, key ingredients)
- Enrichment is LLM-generated per batch (one call per menu, established in Phase 10 architecture)
- The LLM prompt must distinguish between "needs explanation" vs "self-explanatory" dishes and adjust depth accordingly
- Claude's discretion: exact fields stored per dish (e.g., origin, ingredients, cultural_note, eating_tips), and how to signal depth tier to the LLM

**DishCard progressive UX**
- Two-level progressive disclosure: light preview on the card → rich detail on tap
- Light preview on card: Claude's discretion on format (one-liner cultural hint, origin tag, or combination) — keep it minimal, the card is already dense
- Detail view on tap: mobile-first pattern (99% of users are mobile) — Claude's discretion on bottom sheet vs modal, but must feel native on mobile
- Loading indicator: Claude's discretion on style (skeleton shimmer vs subtle spinner) — must not take over the card, minimal footprint
- Enrichment appears progressively: card shows loading state → light preview fills in → tap opens detail view with full content
- No page reload required — enrichment updates appear in real-time after the async process completes

**Enrichment triggers & timing**
- Food only: enrichment fires only for items where `is_beverage = false` — beverages are completely skipped for cultural enrichment
- Enrichment runs inside `after()` (established Phase 10 pattern) — never blocks the scan response
- One batch LLM call per menu (established decision from STATE.md)
- Claude's discretion: whether to chunk large menus for enrichment, and exact prioritization within a batch

**Regeneration behavior**
- Admin-only: no user-facing regeneration button — this is an admin/curator tool for now
- Both per-dish and per-menu: admin panel provides a "Régénérer" button per dish AND a bulk "Ré-enrichir tout" button per menu
- Bulk regen is useful when switching LLM models or improving prompts
- Claude's discretion: confirmation dialog, visual feedback during regen, and whether regen creates a new version or overwrites

### Claude's Discretion

- Light preview format on DishCard (one-liner vs origin tag + one-liner)
- Detail view pattern (bottom sheet vs modal — must be mobile-native)
- Loading indicator style (skeleton shimmer vs spinner)
- Enrichment data schema (exact fields per dish)
- LLM prompt design for adaptive depth
- Chunking strategy for large menu enrichment
- Regen UX details (confirmation, feedback, versioning)

### Deferred Ideas (OUT OF SCOPE)

- User-facing regeneration button — revisit when user accounts exist and quality feedback loop is established
- Progressive enrichment for beverages — future milestone (beverages skipped entirely for now)
- On-demand enrichment (tap to enrich individual dish) vs batch — if batch proves too costly, reconsider in a future phase
- Taste profile integration with enrichment data — requires user accounts (Phase 2+)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ENRI-01 | Chaque plat enrichi affiche une explication culturelle (origine, ingrédients typiques, comment ça se mange) | Enrichment schema: `origin TEXT`, `typical_ingredients TEXT[]`, `cultural_note TEXT`, `eating_tips TEXT NULLABLE` stored on `menu_items`; rendered in bottom sheet detail view |
| ENRI-02 | L'enrichissement priorise les plats peu connus ou de cuisine étrangère — les plats évidents (steak frites) reçoivent un enrichissement minimal | LLM adaptive depth: prompt instructs model to output `depth_tier: 'full' | 'minimal'` per dish; minimal dishes skip cultural_note and eating_tips |
| ENRI-03 | Un plat peut être re-enrichi (régénération) quand le modèle ou les sources s'améliorent | Server Action `regenerateDishEnrichment(dishId)` + `regenerateMenuEnrichment(menuId)` behind `isAdminAuthenticated()` guard; overwrites existing enrichment columns (no versioning in Phase 11) |
| ENRI-04 | Les DishCards affichent un indicateur visuel d'enrichissement en cours (progressive enhancement) | Polling endpoint `GET /api/enrichment/status?menuId=X` returns per-item enrichment_status; client polls with `setInterval` until all food items are `enriched` or `failed`; `animate-pulse` skeleton shimmer on card while pending |
</phase_requirements>

---

## Summary

Phase 11 has three interlocking components: (1) a `lib/enrichment.ts` module — a batch LLM call inside `after()` that generates cultural context fields per food dish and writes them to `menu_items`; (2) a polling + progressive UI layer — a lightweight status endpoint, a client-side polling hook, and DishCard progressive disclosure with a bottom sheet detail view; and (3) admin regeneration — per-dish and per-menu Server Actions behind the existing `isAdminAuthenticated()` guard, surfaced in AdminDashboard.

Phase 10 delivered everything Phase 11 needs at the data layer: `enrichment_status` column (`pending` / `enriched` / `skipped` / `failed`), `is_beverage` flag for food-only filtering, the `after()` wiring pattern (proven by `generateCanonicalNames`), and the batch LLM pattern (`Output.object()` + Zod). Phase 11 adds new DB columns for the enrichment payload, a new `lib/enrichment.ts` following the exact same fire-and-forget pattern as `lib/canonical.ts`, a polling endpoint mirroring the existing admin RPC pattern, and progressive DishCard UI using the already-installed `motion@^12.34.3` library.

The bottom sheet for the detail view uses `react-modal-sheet@5.2.1` — which requires `motion>=11` as its only peer dependency. Since `motion@^12.34.3` is already installed, no new npm packages are needed. Polling is implemented via `setInterval` in a `useEffect` hook within a new `useEnrichmentPolling` hook (client component pattern, following the translation polling pattern already in `MenuShell`).

**Primary recommendation:** Model `lib/enrichment.ts` exactly after `lib/canonical.ts`. Add enrichment after canonical generation in the same `after()` call chain in both scan routes. Use `react-modal-sheet` (zero new dependencies) for the detail view. Poll via `setInterval` every 3 seconds in `MenuShell` with progressive state updates — mirroring the existing lazy translation `fetch()` pattern.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `motion` | `^12.34.3` (already installed) | Bottom sheet animations, gesture-driven dismiss | Already a project dependency; react-modal-sheet peer requires `>=11` |
| `react-modal-sheet` | `5.2.1` | Mobile-native bottom sheet with drag-dismiss | Only library using the already-installed Motion for gestures; compound API (`Sheet.Container`, `Sheet.Header`, `Sheet.Content`, `Sheet.Backdrop`); `avoidKeyboard` built-in; peer dep `motion>=11` satisfied |
| `@ai-sdk/openai` + `ai` | `^3.0.33` / `^6.0.99` (already installed) | Batch LLM call for enrichment generation | Same `generateText` + `Output.object()` pattern as canonical.ts |
| `zod` | `3.25.76` (already installed, pinned) | Structured output schema validation | Pinned — Zod v4 breaks AI SDK (established codebase constraint) |
| `@supabase/supabase-js` | `^2.97.0` (already installed) | DB writes (service role), enrichment status reads (anon) | Already in project; same upsert pattern as canonical.ts |
| `next/server` `after()` | Next.js 16.1.6 | Non-blocking post-response execution | Already used in both scan routes for Places + Canonical |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind `animate-pulse` | v4 (already configured) | Skeleton shimmer loading indicator on DishCard | While `enrichment_status = 'pending'` for non-beverage items |
| `next/cache` `revalidatePath` | built-in | Bust /admin cache after regen | Used in existing `saveAdminModel` Server Action pattern |
| `node:crypto` | built-in | No new use — SHA-256 already used in cache.ts | N/A for Phase 11 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-modal-sheet` | Build custom bottom sheet with Motion | Custom requires drag gesture, snap point, keyboard avoidance from scratch — react-modal-sheet provides all three; Motion is already installed so no bundle cost |
| `react-modal-sheet` | Full-screen modal with `AnimatePresence` | Modal pattern doesn't feel native on mobile; bottom sheet with drag-to-dismiss is the iOS/Android standard UX pattern; 99% mobile users makes this non-negotiable |
| `setInterval` polling | Server-Sent Events (SSE) | SSE has known issues in Next.js App Router Route Handlers (community-reported connection drops, proxy buffering issues); `setInterval` polling every 3s is simpler, stateless, and proven by the existing lazy translation pattern in MenuShell; enrichment completes in 5-10s so 3-4 poll cycles maximum |
| `setInterval` polling | SWR `refreshInterval` | SWR adds a new dependency for a 10-line hook; the translation polling already demonstrates the pattern in vanilla `useEffect` |
| Overwrite on regen | Version history | Phase 11 constraint: admin-only, no user-facing history required; overwrite is simpler and sufficient; add versioning in a future phase if needed |

**Installation:**
```bash
npm install react-modal-sheet
```
Only new package needed. `motion` is already installed (peer dep satisfied).

---

## Architecture Patterns

### Recommended Project Structure

```
lib/
├── enrichment.ts              # enrichDishBatch() — fire-and-forget, after() wiring
├── types/
│   └── llm.ts                 # Add enrichmentBatchSchema (Zod)
│   └── menu.ts                # Add enrichment payload fields to MenuItem
supabase/migrations/
└── 20260228220000_enrichment_fields.sql  # origin, typical_ingredients, cultural_note, eating_tips, enrichment_depth
app/api/enrichment/
└── status/route.ts            # GET ?menuId=X → per-item enrichment_status array
app/actions/
└── enrichment.ts              # regenerateDishEnrichment() + regenerateMenuEnrichment() Server Actions
components/menu/
├── DishCard.tsx               # Add skeleton shimmer + tap-to-open + light preview
└── DishDetailSheet.tsx        # New: react-modal-sheet bottom sheet for full enrichment detail
components/admin/
└── AdminDashboard.tsx         # Add enrichment section: per-menu + per-dish regen buttons
hooks/
└── useEnrichmentPolling.ts    # setInterval polling hook, stops when all food items enriched
```

### Pattern 1: Enrichment Data Schema — DB Columns on `menu_items`

**What:** Five new columns on `menu_items` that store the enrichment payload. Design follows adaptive depth: `depth_tier` signals whether full or minimal enrichment was applied, so the UI can decide what to show.

**When to use:** Migration runs before any other Phase 11 work. All columns nullable (safe for existing rows).

**Recommended schema (Claude's Discretion — justified below):**

```sql
-- supabase/migrations/20260228220000_enrichment_fields.sql
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS enrichment_origin          TEXT;          -- e.g. "Anatolie centrale, Turquie"
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS enrichment_ingredients     TEXT[];        -- e.g. ['agneau haché', 'oignon', 'persil', 'épices']
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS enrichment_cultural_note   TEXT;          -- cultural storytelling paragraph (full depth only)
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS enrichment_eating_tips     TEXT;          -- how it's eaten / what to expect (full depth only)
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS enrichment_depth           TEXT;          -- 'full' | 'minimal' — signals which tier the LLM assigned
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS enrichment_model           TEXT;          -- model that generated enrichment (for regen tracking)
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS enriched_at               TIMESTAMPTZ;   -- when enrichment was last generated
```

**Schema design rationale:**
- `enrichment_origin` + `enrichment_ingredients` + `enrichment_cultural_note` + `enrichment_eating_tips` = the four ENRI-01 fields as separate columns (not JSONB) for type safety and easy SELECT
- `enrichment_depth` = the LLM's self-assessment (`'full'` | `'minimal'`) — lets the card decide whether to show the cultural hint or just the ingredients
- `enrichment_model` = tracks which model generated the data (crucial for bulk regen after model upgrades)
- `enriched_at` = timestamp for "last enriched" display in admin panel
- `enrichment_status` column already exists from Phase 10 — Phase 11 updates it to `'enriched'` on success, `'skipped'` for beverages, `'failed'` on error
- `TEXT[]` for ingredients (not JSONB array) — simpler, native PostgreSQL array; Supabase client returns as `string[]`

### Pattern 2: Enrichment LLM Prompt — Adaptive Depth

**What:** A single batch LLM call (one per menu) where the model evaluates each dish's "foreignness" and assigns depth tier before generating enrichment content. Food items with `is_beverage = false` only.

**When to use:** Inside `lib/enrichment.ts`, called from `after()` in both scan routes, after `generateCanonicalNames` completes.

**Recommended approach (Claude's Discretion):**

Signal depth to the LLM through the system prompt's explicit criteria, then have it self-assign `depth_tier`. The LLM knows if a dish is exotic by comparing it to common French/European dishes. This avoids a separate classification step.

```typescript
// lib/enrichment.ts — system prompt for adaptive depth batch enrichment
const ENRICHMENT_SYSTEM_PROMPT = `You are a culinary cultural educator specializing in helping French diners understand unfamiliar dishes.

For each dish in the input array, generate cultural enrichment content. Return ALL dishes — do not skip any.

DEPTH ASSIGNMENT:
- depth_tier = "full" if the dish is foreign, exotic, regional, or unfamiliar to an average French diner
  (examples: Mantı, Lahmacun, Okonomiyaki, Börek, Tarte Flambée, Baeckeoffe, Couscous, Mapo Tofu)
- depth_tier = "minimal" if the dish is self-explanatory to a French diner
  (examples: Steak frites, Salade césar, Croque-monsieur, Poulet rôti, Pâtes bolognaise, Pizza)

FULL DEPTH fields (for depth_tier = "full"):
- origin: geographic and cultural origin, concise (e.g. "Anatolie centrale, Turquie", "Alsace, France")
- typical_ingredients: array of 3-6 key ingredients in French (e.g. ["agneau haché", "oignon", "persil"])
- cultural_note: 1-2 sentence cultural/historical context in French — why this dish matters, regional significance
- eating_tips: 1 sentence in French on how to eat it or what to expect (texture, condiments, ritual)

MINIMAL DEPTH fields (for depth_tier = "minimal"):
- origin: null
- typical_ingredients: array of 3-5 key ingredients in French (still useful for allergen-adjacent info)
- cultural_note: null
- eating_tips: null

LANGUAGE: All text output in French. Use canonical dish name if provided.

Return SAME index as input for merging.`;
```

**Chunking strategy (Claude's Discretion):** Chunk at 40 food-only dishes per batch (not 80 like canonical names, because enrichment fields are longer — more tokens per item). Run chunks sequentially inside `after()`.

```typescript
// Food-only filter before chunking
const foodItems = items.filter(item => !item.is_beverage);
const CHUNK_SIZE = 40;
```

### Pattern 3: Enrichment Generation Function — `lib/enrichment.ts`

**What:** Fire-and-forget function mirroring `lib/canonical.ts` exactly. Called inside `after()` after `generateCanonicalNames`.

**Key differences from canonical.ts:**
- Filters to food items only (`is_beverage = false`) before the LLM call
- Updates `enrichment_status` to `'enriched'`, `'skipped'` (beverages), or `'failed'`
- Marks beverages as `'skipped'` without LLM call (DB update only)
- Uses `enriched_at = NOW()` timestamp on success

```typescript
// lib/enrichment.ts — core structure
import 'server-only';
import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { enrichmentBatchSchema } from './types/llm';
import { supabaseAdmin } from './supabase-admin';
import { getAdminConfig } from './cache';

export async function enrichDishBatch(menuId: string): Promise<void> {
  try {
    // Step 1: Fetch items with enrichment_status = 'pending'
    const { data: items, error } = await supabaseAdmin
      .from('menu_items')
      .select('id, canonical_name, name_original, is_beverage, category, subcategory')
      .eq('menu_id', menuId)
      .eq('enrichment_status', 'pending');

    if (error || !items || items.length === 0) return;

    // Step 2: Mark beverages as 'skipped' immediately (no LLM call)
    const beverages = items.filter(i => i.is_beverage);
    if (beverages.length > 0) {
      await supabaseAdmin.from('menu_items').upsert(
        beverages.map(b => ({ id: b.id, enrichment_status: 'skipped' })),
        { onConflict: 'id' }
      );
    }

    // Step 3: Enrich food items only
    const foodItems = items.filter(i => !i.is_beverage);
    if (foodItems.length === 0) return;

    const config = await getAdminConfig();
    const CHUNK_SIZE = 40;
    const batches = chunk(foodItems, CHUNK_SIZE);

    for (const batch of batches) {
      // LLM call per chunk — same Output.object() + Zod pattern as canonical.ts
      // Upsert enrichment columns + set enrichment_status = 'enriched'
      // Never throw — per-batch catch, top-level catch
    }
  } catch (error) {
    console.error('[enrichDishBatch] Fatal:', error instanceof Error ? error.message : error);
  }
}
```

### Pattern 4: Scan Route Wiring — Third `after()` Call

**What:** Add `enrichDishBatch` after `generateCanonicalNames` in both scan routes. The three `after()` calls run concurrently (Places + Canonical + Enrichment).

**Timing concern (important):** `enrichDishBatch` needs `is_beverage` and `enrichment_status='pending'` to be set before it runs. Both are set by `generateCanonicalNames`. If enrichment runs concurrently with canonical generation, it may query `menu_items` before `is_beverage` is populated.

**Recommended approach:** Chain enrichment inside the canonical `after()` call, not as a third concurrent `after()`:

```typescript
// app/api/scan/url/route.ts — revised wiring
after(() => enrichWithGooglePlaces(menu.restaurant_name, url, menu.id));
after(async () => {
  await generateCanonicalNames(menu.id);  // sets is_beverage + enrichment_status='pending'
  await enrichDishBatch(menu.id);          // reads is_beverage, marks beverages 'skipped', enriches food
});
```

This ensures enrichment always runs after canonical names are set. The total `after()` budget is still not blocking the HTTP response.

### Pattern 5: Status Polling Endpoint

**What:** `GET /api/enrichment/status?menuId=X` returns an array of `{ id, enrichment_status }` for all food items in the menu. The client polls until all items have `enrichment_status !== 'pending'`.

**Why not SSE:** SSE in Next.js App Router Route Handlers has known reliability issues with proxies and serverless environments. Polling every 3 seconds (3-4 cycles to completion) is simpler and sufficient. The existing lazy translation pattern in `MenuShell` demonstrates the same approach.

```typescript
// app/api/enrichment/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';  // anon client — read-only

export async function GET(req: NextRequest) {
  const menuId = req.nextUrl.searchParams.get('menuId');
  if (!menuId) return NextResponse.json({ error: 'Missing menuId' }, { status: 400 });

  const { data, error } = await supabase
    .from('menu_items')
    .select('id, enrichment_status, enrichment_origin, enrichment_ingredients, enrichment_cultural_note, enrichment_eating_tips, enrichment_depth')
    .eq('menu_id', menuId)
    .eq('is_beverage', false);  // only food items

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data });
}
```

### Pattern 6: Client-Side Polling Hook

**What:** `useEnrichmentPolling(menuId, initialItems)` — polls every 3 seconds until all food items have `enrichment_status !== 'pending'`, then stops. Returns enriched items for progressive state update in `MenuShell`.

```typescript
// hooks/useEnrichmentPolling.ts
'use client';
import { useEffect, useRef, useState } from 'react';
import type { MenuItem } from '@/lib/types/menu';

const POLL_INTERVAL_MS = 3000;

export function useEnrichmentPolling(menuId: string, initialItems: MenuItem[]) {
  const [items, setItems] = useState(initialItems);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasPendingFoodItems = (itemList: MenuItem[]) =>
    itemList.some(i => !i.is_beverage && i.enrichment_status === 'pending');

  useEffect(() => {
    // Don't poll if nothing is pending on mount
    if (!hasPendingFoodItems(initialItems)) return;

    const poll = async () => {
      const res = await fetch(`/api/enrichment/status?menuId=${menuId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.items) return;

      setItems(prev =>
        prev.map(item => {
          const fresh = data.items.find((d: Partial<MenuItem>) => d.id === item.id);
          return fresh ? { ...item, ...fresh } : item;
        })
      );

      // Stop polling when no more pending
      if (!hasPendingFoodItems(data.items)) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    };

    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [menuId]); // stable: menuId doesn't change

  return items;
}
```

This hook integrates into `MenuShellInner` alongside the existing translation polling, replacing `initialMenu.menu_items` with the progressively updated items array.

### Pattern 7: DishCard Progressive Enhancement

**What:** DishCard shows a skeleton shimmer while pending, a light preview once enriched (origin tag + one-liner cultural hint for full-depth dishes), and opens a bottom sheet on tap.

**Light preview format (Claude's Discretion — recommendation):** For `depth_tier = 'full'` dishes, show `origin` as a small pill badge + first 60 chars of `cultural_note` as a muted one-liner. For `depth_tier = 'minimal'` dishes, show the ingredients only (no cultural hint — dish is self-explanatory). This keeps the card minimal while giving the exotic dishes a clear hook to tap.

```typescript
// DishCard.tsx — enrichment preview section (added below description)
const isEnriched = item.enrichment_status === 'enriched';
const isPending = item.enrichment_status === 'pending' && !item.is_beverage;
const hasCulturalContext = isEnriched && item.enrichment_depth === 'full';

// Loading skeleton (minimal footprint — single line, animate-pulse)
{isPending && (
  <div className="h-3 w-3/4 rounded-full bg-white/10 animate-pulse mt-1" />
)}

// Light preview — origin pill + cultural hint truncated
{hasCulturalContext && (
  <button
    type="button"
    onClick={() => setDetailOpen(true)}
    className="w-full text-left mt-1 flex items-center gap-1.5 group"
  >
    {item.enrichment_origin && (
      <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full bg-brand-orange/10 border border-brand-orange/20 text-brand-orange/70 text-[10px] font-medium">
        {item.enrichment_origin.split(',')[0].trim()} {/* country/region only */}
      </span>
    )}
    <span className="text-brand-muted/70 text-xs truncate group-hover:text-brand-muted transition-colors">
      {item.enrichment_cultural_note?.slice(0, 60)}…
    </span>
  </button>
)}

// For minimal-depth enriched dishes: show ingredients inline (no tap needed)
{isEnriched && item.enrichment_depth === 'minimal' && item.enrichment_ingredients && (
  <p className="text-brand-muted/60 text-xs mt-1">
    {item.enrichment_ingredients.slice(0, 3).join(', ')}
  </p>
)}
```

### Pattern 8: Bottom Sheet Detail View — `DishDetailSheet`

**What:** `react-modal-sheet` bottom sheet that opens on tap of the light preview. Shows the full enrichment: cultural_note, typical_ingredients, eating_tips, origin. Mobile-native: drag handle at top, drag-to-dismiss, keyboard avoidance built-in.

**Key API (verified from GitHub):**
- Compound pattern: `<Sheet>`, `<Sheet.Container>`, `<Sheet.Header>`, `<Sheet.Content>`, `<Sheet.Backdrop>`
- `isOpen` / `onClose` props on `<Sheet>`
- `avoidKeyboard` defaults to `true` — no extra work needed
- `detent="content-height"` for height that fits the content

```typescript
// components/menu/DishDetailSheet.tsx
'use client';
import Sheet from 'react-modal-sheet';
import type { MenuItem } from '@/lib/types/menu';

interface DishDetailSheetProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
}

export default function DishDetailSheet({ item, isOpen, onClose }: DishDetailSheetProps) {
  return (
    <Sheet isOpen={isOpen} onClose={onClose} detent="content-height">
      <Sheet.Container className="bg-brand-bg border-t border-white/10">
        <Sheet.Header className="bg-brand-bg" />
        <Sheet.Content>
          <div className="px-4 pb-8 pt-2 space-y-4">
            {/* Dish name + origin */}
            <div>
              <h2 className="text-brand-white font-bold text-lg">{item.canonical_name ?? item.name_original}</h2>
              {item.enrichment_origin && (
                <p className="text-brand-orange/70 text-sm mt-0.5">{item.enrichment_origin}</p>
              )}
            </div>
            {/* Cultural note */}
            {item.enrichment_cultural_note && (
              <p className="text-brand-muted text-sm leading-relaxed">{item.enrichment_cultural_note}</p>
            )}
            {/* Typical ingredients */}
            {item.enrichment_ingredients && item.enrichment_ingredients.length > 0 && (
              <div>
                <p className="text-brand-white/60 text-xs uppercase tracking-wider mb-2">Ingrédients typiques</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.enrichment_ingredients.map((ing, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-brand-muted text-xs">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {/* Eating tips */}
            {item.enrichment_eating_tips && (
              <p className="text-brand-muted/70 text-xs italic">{item.enrichment_eating_tips}</p>
            )}
          </div>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop onTap={onClose} />
    </Sheet>
  );
}
```

### Pattern 9: Admin Regeneration — Server Actions

**What:** Two Server Actions behind `isAdminAuthenticated()` guard. No versioning — overwrites existing enrichment columns. Resets `enrichment_status` to `'pending'` then re-triggers `enrichDishBatch`.

```typescript
// app/actions/enrichment.ts
'use server';
import 'server-only';
import { isAdminAuthenticated } from '@/lib/admin-session';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { enrichDishBatch } from '@/lib/enrichment';

// Per-dish regeneration
export async function regenerateDishEnrichment(dishId: string): Promise<{ ok: true } | { error: string }> {
  if (!await isAdminAuthenticated()) return { error: 'Unauthorized' };

  // Fetch the menu_id for this dish (needed to call enrichDishBatch)
  const { data: item } = await supabaseAdmin
    .from('menu_items')
    .select('menu_id')
    .eq('id', dishId)
    .single();
  if (!item) return { error: 'Dish not found' };

  // Reset enrichment_status to 'pending' — enrichDishBatch will pick it up
  await supabaseAdmin
    .from('menu_items')
    .update({ enrichment_status: 'pending', enrichment_origin: null, enrichment_ingredients: null, enrichment_cultural_note: null, enrichment_eating_tips: null })
    .eq('id', dishId);

  // Re-enrich (not inside after() — admin regen can be synchronous, feedback is immediate)
  await enrichDishBatch(item.menu_id);
  return { ok: true };
}

// Per-menu bulk regeneration
export async function regenerateMenuEnrichment(menuId: string): Promise<{ ok: true; count: number } | { error: string }> {
  if (!await isAdminAuthenticated()) return { error: 'Unauthorized' };

  // Reset all food items for this menu
  const { data, error } = await supabaseAdmin
    .from('menu_items')
    .update({ enrichment_status: 'pending', enrichment_origin: null, enrichment_ingredients: null, enrichment_cultural_note: null, enrichment_eating_tips: null })
    .eq('menu_id', menuId)
    .eq('is_beverage', false)
    .select('id');

  if (error) return { error: error.message };

  await enrichDishBatch(menuId);
  return { ok: true, count: data?.length ?? 0 };
}
```

**Regen UX in AdminDashboard (Claude's Discretion — recommendation):**
- Per-dish: inline "Régénérer" button in the scans table (new column) — no confirmation dialog (admin-only, low risk)
- Per-menu: "Ré-enrichir tout" button per menu row — show a simple inline confirmation ("Confirmer ?") before calling the bulk action (bulk is slower, worth one extra click)
- Visual feedback: `isPending` state from `useTransition()` — button becomes disabled + shows "En cours…" while the Server Action runs
- No modal for confirmation — inline text swap is lighter and keeps the admin panel fast

### Anti-Patterns to Avoid

- **Running enrichDishBatch concurrently with generateCanonicalNames:** Enrichment reads `is_beverage` which is set by canonical generation. Run enrichment sequentially after canonical in the same `after()` callback.
- **Fetching enrichment data in the status polling endpoint with the admin client:** The status endpoint is public (no auth); use the anon client (`lib/supabase.ts`), not `supabaseAdmin`. The enrichment fields are safe to expose — no PII.
- **Using `enrichment_status = 'pending'` for beverages:** Beverages must be set to `'skipped'` immediately. If they remain `'pending'`, the polling hook never resolves.
- **Rendering `DishDetailSheet` inside `MenuAccordion`:** The sheet must be rendered at the MenuShell level (or near the root), not inside the accordion list — portal-based sheets need a stable DOM parent. React Modal Sheet uses a portal under the hood.
- **Passing the full enrichment payload as page props on initial load:** The initial server render has `enrichment_status='pending'` for all items (enrichment hasn't completed yet). Enrichment data arrives only via polling — don't try to SSR it.
- **Calling `after()` inside a Server Action (regen):** `after()` is valid in Route Handlers. In Server Actions, admin regen can be synchronous — just `await enrichDishBatch(menuId)` directly. Server Action timeout on Vercel Pro is 60s — sufficient for a 40-dish menu enrichment.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mobile-native bottom sheet | Custom sheet with Motion drag gestures + snap points + keyboard avoidance | `react-modal-sheet` | Snap point math, drag velocity dismiss, iOS keyboard avoidance — 3 non-trivial problems solved; Motion already installed so zero bundle cost |
| Polling with cleanup | Raw `setInterval` without ref cleanup | `useEnrichmentPolling` hook with `useRef` + cleanup return | `setInterval` callback captures stale state; ref pattern prevents memory leaks on unmount |
| Enrichment queue for beverages | Custom beverage filter in enrichDishBatch logic | Mark as `'skipped'` in DB immediately at start of `enrichDishBatch` | Beverages stay `'pending'` forever if they're just skipped in the filter — polling hook never resolves; explicit `'skipped'` status is the contract with the UI |
| Adaptive prompt depth | Two separate LLM calls (classify then enrich) | Single LLM call with `depth_tier` self-assignment | One API call per batch instead of two; the LLM can classify and enrich simultaneously with a well-structured prompt |

**Key insight:** Every new primitive needed for Phase 11 is either already in the codebase (`after()`, AI SDK, Zod, `supabaseAdmin`, `motion`, `useTransition`) or one new npm package (`react-modal-sheet`, zero new transitive deps since Motion is already installed). Phase 11 is composition, not invention.

---

## Common Pitfalls

### Pitfall 1: Race condition between canonical generation and enrichment

**What goes wrong:** If `enrichDishBatch` runs as a third concurrent `after()` (separate from canonical generation), it may query `menu_items` before `generateCanonicalNames` has written `is_beverage`. All items appear as `is_beverage = false` (default), causing beverages to be enriched unnecessarily.

**Why it happens:** Phase 10's `generateCanonicalNames` is what sets `is_beverage` based on LLM output. Before it runs, all items have `is_beverage = DEFAULT FALSE`.

**How to avoid:** Chain `enrichDishBatch` sequentially after `generateCanonicalNames` inside the same `after()` callback:
```typescript
after(async () => {
  await generateCanonicalNames(menu.id);
  await enrichDishBatch(menu.id);
});
```

**Warning signs:** Beverages showing enrichment content, or `enrichment_status = 'enriched'` on beverage items.

### Pitfall 2: Polling hook never stops — beverages remain 'pending'

**What goes wrong:** The polling hook checks `enrichment_status !== 'pending'` to stop. If beverages are never updated from `'pending'` (e.g. they're just skipped in the LLM filter but not updated in DB), the hook polls indefinitely.

**Why it happens:** `enrichDishBatch` filters beverages out of the LLM call but forgets to mark them as `'skipped'` in the DB.

**How to avoid:** At the start of `enrichDishBatch`, explicitly upsert `{ enrichment_status: 'skipped' }` for all beverage items before the LLM call. The polling endpoint filters `is_beverage = false`, so this doesn't affect the UI — but it's still a clean contract.

**Warning signs:** Browser dev tools showing repeated `GET /api/enrichment/status` calls that never stop.

### Pitfall 3: react-modal-sheet portal renders outside styled context

**What goes wrong:** The bottom sheet portal renders at the document body level, outside the Tailwind CSS variable scope and the dark background context. Background colors and brand colors resolve incorrectly.

**Why it happens:** `react-modal-sheet` uses a React portal. CSS custom properties (like `--color-brand-bg`) defined on a parent element are not inherited through the portal mount point if the portal is mounted outside that element.

**How to avoid:** Verify that Tailwind CSS v4 custom properties are defined on `:root` (not on a specific component wrapper). In this project, `globals.css` likely defines brand colors on `:root` — confirm before shipping. If needed, pass explicit className to `Sheet.Container`.

**Warning signs:** Bottom sheet appears with white/default background instead of `bg-brand-bg`.

### Pitfall 4: enrichment_ingredients stored as TEXT[] — Supabase client quirk

**What goes wrong:** Supabase JS client may return `TEXT[]` columns as a string like `{agneau,oignon}` instead of `string[]` in some query paths, depending on how the RLS/PostgREST layer serializes arrays.

**Why it happens:** PostgREST serializes PostgreSQL arrays as JSON arrays by default in recent versions, but there are edge cases with certain select patterns.

**How to avoid:** When reading `enrichment_ingredients`, always check `typeof ingredients === 'string'` and parse with a simple split if needed. Alternatively, store as JSONB (not TEXT[]) if this proves problematic. TEST this in the status polling endpoint response before building the UI.

**Warning signs:** DishDetailSheet renders `{agneau,oignon}` as raw text instead of separate ingredient chips.

**Alternative approach:** Store as `JSONB` instead of `TEXT[]` — avoids the serialization edge case entirely. JSONB is already used for `name_translations`, `description_translations`, and `category_translations` in this project. Recommendation: use `JSONB` for ingredients to match the project's existing array-as-JSONB pattern.

### Pitfall 5: Admin Server Action timeout on bulk regen

**What goes wrong:** `regenerateMenuEnrichment` awaits `enrichDishBatch(menuId)` synchronously. For a 200-dish menu with 40-dish chunks, this is 5 sequential LLM calls. On Vercel Pro, Server Actions have a 60-second timeout. A large menu with slow LLM responses may time out.

**Why it happens:** Server Actions share the same serverless function timeout as Route Handlers (60s on Pro).

**How to avoid:** Add a 40-dish cap per regen call in the admin action, or run enrichment in background via `after()` even in the Server Action context. Actually, `after()` is NOT supported inside Server Actions in Next.js 16 — only in Route Handlers. Alternative: create a Route Handler for admin regen (`POST /api/admin/enrichment/regenerate`) that wraps `enrichDishBatch` inside `after()`.

**Warning signs:** Server Action returning 500 with "Function timed out" for large menus.

**Recommended mitigation:** For Phase 11, limit bulk regen to menus with ≤ 80 food items. Add a count check at the start of `regenerateMenuEnrichment` — return early with `{ error: 'Menu too large for sync regen' }` if over the limit. Large-menu async regen can be addressed in a future phase.

### Pitfall 6: Zod schema for enrichment_ingredients must use .array() not TEXT[]

**What goes wrong:** Zod schema for LLM output uses `z.string()` for ingredients instead of `z.array(z.string())`, causing the LLM to return a comma-separated string instead of an array.

**Why it happens:** LLM structured output (OpenAI JSON mode) returns JSON types. The Zod schema must explicitly be `z.array(z.string())` to get a JSON array.

**How to avoid:**
```typescript
// lib/types/llm.ts — enrichment schema
export const enrichmentDishResultSchema = z.object({
  index: z.number(),
  depth_tier: z.enum(['full', 'minimal']),
  origin: z.string().nullable(),
  typical_ingredients: z.array(z.string()),   // NOT z.string() — must be array
  cultural_note: z.string().nullable(),
  eating_tips: z.string().nullable(),
});
```

**Warning signs:** DB upsert fails with "invalid input syntax for type text[]".

---

## Code Examples

Verified patterns from the existing codebase and official sources:

### Enrichment Zod schema (lib/types/llm.ts addition)

```typescript
// Source: mirrors canonicalDishResultSchema pattern in existing lib/types/llm.ts
// .nullable() throughout (not .optional()) — OpenAI structured output requirement

export const enrichmentDishResultSchema = z.object({
  index: z.number(),
  depth_tier: z.enum(['full', 'minimal']),
  origin: z.string().nullable(),
  typical_ingredients: z.array(z.string()),
  cultural_note: z.string().nullable(),
  eating_tips: z.string().nullable(),
});

export const enrichmentBatchSchema = z.object({
  dishes: z.array(enrichmentDishResultSchema),
});

export type EnrichmentDishResult = z.infer<typeof enrichmentDishResultSchema>;
export type EnrichmentBatchResult = z.infer<typeof enrichmentBatchSchema>;
```

### react-modal-sheet import and usage (verified from official README)

```typescript
// Source: https://github.com/Temzasse/react-modal-sheet
import Sheet from 'react-modal-sheet';

// motion peer dep already installed: "motion": "^12.34.3"
// react-modal-sheet requires: "motion": ">=11" — SATISFIED
```

### MenuItem interface additions (lib/types/menu.ts)

```typescript
// After existing enrichment_status field:
enrichment_origin: string | null;
enrichment_ingredients: string[] | null;   // or JsonValue — test serialization
enrichment_cultural_note: string | null;
enrichment_eating_tips: string | null;
enrichment_depth: string | null;           // 'full' | 'minimal'
enrichment_model: string | null;
enriched_at: string | null;               // ISO timestamptz
```

### setInterval cleanup pattern (mirrors MenuShell translation polling)

```typescript
// Source: existing MenuShell.tsx lines 245-273 — same fetch + cancel pattern
let cancelled = false;
const id = setInterval(async () => {
  if (cancelled) return;
  // fetch + update state
}, 3000);
return () => { cancelled = true; clearInterval(id); };
```

### Supabase upsert for beverage skipping (mirrors canonical.ts upsert)

```typescript
// Source: lib/canonical.ts lines 179-185 — same upsert pattern
await supabaseAdmin
  .from('menu_items')
  .upsert(
    beverages.map(b => ({ id: b.id, enrichment_status: 'skipped' })),
    { onConflict: 'id' }
  );
```

### Server Action auth guard pattern (mirrors existing admin.ts)

```typescript
// Source: app/actions/admin.ts — existing pattern
'use server';
import 'server-only';
const authenticated = await isAdminAuthenticated();
if (!authenticated) return { error: 'Unauthorized' };
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom bottom sheet with raw CSS transitions | Motion-powered libraries (`react-modal-sheet`) | 2024 (Motion split from Framer Motion) | `motion` package is now standalone; react-modal-sheet v5 migrated from `framer-motion` to `motion` — same gesture API, lighter package |
| SSE for real-time updates | Short polling (setInterval) for 5-10s async ops | Ongoing preference for simple async | SSE has persistent Next.js Route Handler reliability issues in serverless environments; for enrichment that completes in < 30s, polling is simpler and equivalent |
| `generateObject()` AI SDK | `generateText()` + `Output.object()` | AI SDK v6 (late 2024) | `generateObject` deprecated; codebase already uses correct pattern — no change needed |
| Framer Motion | Motion | 2024 | `framer-motion` package renamed/split; project correctly imports from `motion` package |

**Deprecated/outdated:**
- `framer-motion` package: superseded by `motion` — do NOT `npm install framer-motion`. The existing `motion@^12.34.3` is the correct package.
- `react-spring-bottom-sheet`: uses react-spring, not motion; would add a new animation library — avoid.

---

## Open Questions

1. **ingredients as TEXT[] vs JSONB**
   - What we know: Project already uses JSONB for `name_translations`, `description_translations`, `category_translations`
   - What's unclear: Whether Supabase PostgREST returns TEXT[] as `string[]` or as raw PostgreSQL array syntax in all query paths
   - Recommendation: Use JSONB for `enrichment_ingredients` to match project convention and avoid serialization surprises. Migrate with `JSONB DEFAULT '[]'::jsonb` instead of `TEXT[]`.

2. **Chunking: 40 dishes or less?**
   - What we know: Enrichment fields are longer than canonical names (4 text fields per dish vs 1). Token budget is tighter.
   - What's unclear: Actual token count per enrichment response — depends on LLM verbosity for cultural notes
   - Recommendation: Start with 40-dish chunks. If `NoObjectGeneratedError` appears in logs for 40-dish batches, reduce to 20. Log chunk sizes in the `[enrichDishBatch]` prefix for monitoring.

3. **Where to render `DishDetailSheet` in the component tree?**
   - What we know: React Modal Sheet uses a portal; must render near the root to avoid CSS context issues
   - Recommendation: Lift the sheet state to `MenuContent` level (not inside individual `DishCard`). Pass a single `selectedItem` state and one `DishDetailSheet` instance. Individual DishCards call an `onOpenDetail(item)` prop. This avoids N sheet instances mounted simultaneously.

4. **Admin enrichment section: which menus to show?**
   - What we know: AdminDashboard currently shows "last 20 scans" with basic info (url, source_type, parsed_at, parse_time_ms)
   - What's unclear: Whether to add a separate "Enrichment" section or integrate regen into the existing scans table
   - Recommendation: Add an "Enrichissement" section in AdminDashboard below the existing scans table. For each scan, show: enrichment progress (X enriched / Y total food items), "Régénérer" per-menu button, and a link to expand dishes for per-dish regen. Reuse the existing section pattern (h2 + card layout).

5. **Re-enrichment on re-scan**
   - What we know: When a menu is re-scanned, `canonicalCache` recycling preserves canonical names. Enrichment columns are stored on `menu_items` rows that are deleted and re-inserted (delete-then-insert pattern in cache.ts).
   - What's unclear: Phase 11 needs to verify whether enrichment data survives re-scan through an `enrichmentCache` recycling pattern (mirroring `canonicalCache`)
   - Recommendation: Add `enrichmentCache` recycling in `getOrParseMenu` (step 5.5 of cache.ts, alongside existing `canonicalCache`). Harvest `enrichment_origin`, `enrichment_ingredients`, `enrichment_cultural_note`, `enrichment_eating_tips`, `enrichment_depth`, `enrichment_model` by `name_original` before delete. Re-apply on insert. If recycled, set `enrichment_status = 'enriched'` directly. This mirrors the exact canonicalCache pattern — no new patterns needed.

---

## Sources

### Primary (HIGH confidence)

- Existing codebase — `lib/canonical.ts` (fire-and-forget pattern, batch LLM, after() wiring, chunk helper)
- Existing codebase — `lib/google-places.ts` (enrichment function template)
- Existing codebase — `components/menu/MenuShell.tsx` (fetch polling + setInterval + cancelled pattern)
- Existing codebase — `app/actions/admin.ts` (Server Action auth guard pattern)
- Existing codebase — `lib/types/llm.ts` (canonicalBatchSchema — Zod enrichment schema follows same pattern)
- Existing codebase — `lib/types/menu.ts` (MenuItem interface additions follow existing nullable field pattern)
- Existing codebase — `supabase/migrations/20260228200000_v12_foundation.sql` (enrichment_status column already present)
- Next.js docs — `after()` in Route Handlers vs Server Actions: https://nextjs.org/docs/app/api-reference/functions/after
- react-modal-sheet GitHub — version 5.2.1, peer deps, compound API: https://github.com/Temzasse/react-modal-sheet

### Secondary (MEDIUM confidence)

- WebSearch — react-modal-sheet version 5.2.1, peer dep `motion>=11` (satisfied by installed `motion@^12.34.3`)
- WebSearch — SSE reliability issues in Next.js Route Handlers (multiple community sources); polling preferred for < 30s async ops: https://github.com/vercel/next.js/discussions/48427
- WebSearch — Tailwind `animate-pulse` for skeleton shimmer: https://tailwindcss.com/docs/animation
- WebSearch — `setInterval` in React `useEffect` with ref-based cleanup for polling: https://dev.to/tangoindiamango/polling-in-react-3h8a

### Tertiary (LOW confidence)

- Supabase TEXT[] serialization behavior in PostgREST responses — needs empirical verification in development; recommendation to use JSONB instead is a precautionary measure based on known PostgREST edge cases (community reports, no official doc).

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project except react-modal-sheet; peer deps verified against installed versions
- Architecture: HIGH — all patterns derived directly from existing codebase (canonical.ts, MenuShell, admin.ts); new patterns are compositions of existing ones
- Pitfalls: HIGH for race condition (Pitfall 1), beverage polling loop (Pitfall 2), Zod array schema (Pitfall 6) — directly verifiable from codebase; MEDIUM for portal CSS (Pitfall 3) — needs runtime testing; MEDIUM for Server Action timeout (Pitfall 5) — Vercel Pro docs confirm 60s limit
- Enrichment schema: HIGH for field selection; MEDIUM for TEXT[] vs JSONB (empirical verification needed)

**Research date:** 2026-02-28
**Valid until:** 2026-04-01 (stable ecosystem — react-modal-sheet, motion, Supabase, Next.js after() API all stable)
