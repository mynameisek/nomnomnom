---
phase: 11-dish-enrichment
verified: 2026-02-28T18:00:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
---

# Phase 11: Dish Enrichment Verification Report

**Phase Goal:** Each dish card shows a cultural explanation, origin, and typical ingredients — delivered asynchronously after scan, with a progress indicator and the ability to regenerate
**Verified:** 2026-02-28T18:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

Plan 01 must-haves:

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | After scanning a menu, food dishes receive enrichment_status='enriched' with cultural context fields populated in the DB within 10 seconds | VERIFIED | `lib/enrichment.ts` exports `enrichDishBatch` — fetches pending items, upserts `enrichment_status: 'enriched'` + all 7 enrichment fields. Chained in `after()` in both scan routes after `generateCanonicalNames`. |
| 2  | Beverages receive enrichment_status='skipped' — never sent to the LLM for enrichment | VERIFIED | Lines 105-118 of `lib/enrichment.ts`: beverages filtered and immediately upserted with `{ enrichment_status: 'skipped' }` before any LLM call. |
| 3  | Exotic dishes receive depth_tier='full' with origin, cultural_note, eating_tips; common dishes receive depth_tier='minimal' with ingredients only | VERIFIED | `ENRICHMENT_SYSTEM_PROMPT` in `lib/enrichment.ts` defines depth assignment rules with examples. `enrichmentDishResultSchema` (llm.ts:164) has nullable origin/cultural_note/eating_tips for minimal-depth, always-present `typical_ingredients`. |
| 4  | GET /api/enrichment/status?menuId=X returns per-item enrichment status and enrichment data for food items | VERIFIED | `app/api/enrichment/status/route.ts` exports `GET`, selects `id, name_original, enrichment_status, enrichment_origin, enrichment_ingredients, enrichment_cultural_note, enrichment_eating_tips, enrichment_depth`, filters `is_beverage = false`, uses anon client. |

Plan 02 must-haves:

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 5  | While enrichment is pending, each food DishCard shows a subtle skeleton shimmer line | VERIFIED | `DishCard.tsx` lines 70-73: `isPendingFood` guard renders `<div className="h-3 w-3/4 rounded-full bg-white/10 animate-pulse mt-1" />` |
| 6  | Once enriched, a full-depth DishCard shows an origin pill and truncated cultural hint — tapping opens a bottom sheet with full detail | VERIFIED | `DishCard.tsx` lines 75-92: `isFullDepth` guard renders tappable `<button>` with origin pill + 60-char cultural note. `MenuShell.tsx` renders `DishDetailSheet` at shell level (line 327-331). Detail sheet shows dish name, origin, cultural note, ingredient chips, eating tips. |
| 7  | Once enriched, a minimal-depth DishCard shows key ingredients inline — no cultural hint or bottom sheet trigger | VERIFIED | `DishCard.tsx` lines 94-99: `isMinimalDepth` guard renders first 3 ingredients as `<p>` with no `onClick` handler. |
| 8  | Tapping Régénérer per dish in the admin panel re-enriches that dish and replaces its stored enrichment | VERIFIED | `app/actions/enrichment.ts` exports `regenerateDishEnrichment` with auth guard. `AdminDashboard.tsx` renders `DishRegenButton` inside `MenuDishesExpander` calling `regenerateDishEnrichment(dishId)` with `useTransition`. |
| 9  | Tapping Ré-enrichir tout per menu in the admin panel re-enriches all food dishes in that menu | VERIFIED | `app/actions/enrichment.ts` exports `regenerateMenuEnrichment` with auth guard + 80-item safety cap. `AdminDashboard.tsx` renders `MenuRegenButton` per scan row calling `regenerateMenuEnrichment(menuId)` with confirm-swap UX + `useTransition`. |
| 10 | Enrichment data appears progressively on DishCards without page reload | VERIFIED | `hooks/useEnrichmentPolling.ts` polls `/api/enrichment/status` every 3s, merges enrichment fields via `setEnrichedItems`, stops when no pending items. `MenuShell.tsx` calls hook (line 204), merges results into `menuData.menu_items` via `useMemo` (lines 210-227), passes merged items to `MenuContent`. |

**Score:** 10/10 truths verified

---

### Required Artifacts

#### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260228220000_enrichment_fields.sql` | Enrichment columns on menu_items | VERIFIED | 7 `ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS` statements for all required columns (enrichment_origin, enrichment_ingredients, enrichment_cultural_note, enrichment_eating_tips, enrichment_depth, enrichment_model, enriched_at). All nullable. |
| `lib/enrichment.ts` | Batch LLM enrichment function | VERIFIED | 252 lines. Exports `enrichDishBatch`. Beverage skipping (step 2), chunk-40 food processing (step 4), adaptive-depth LLM call (step 5), upsert results (step 7), failed fallback (step 8). Top-level + per-batch try/catch. |
| `lib/types/llm.ts` | Enrichment Zod schema | VERIFIED | `enrichmentDishResultSchema` (line 164) and `enrichmentBatchSchema` (line 177) both exported. Schema has `depth_tier`, `origin`, `typical_ingredients`, `cultural_note`, `eating_tips` with `.nullable()` for optional fields. |
| `app/api/enrichment/status/route.ts` | Status polling endpoint | VERIFIED | Exports `GET`. Uses anon `supabase` client (not admin). Filters `is_beverage = false`. Returns `{ items: data }` with all enrichment fields plus `name_original`. |

#### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `hooks/useEnrichmentPolling.ts` | Client-side polling hook | VERIFIED | 59 lines. Exports `useEnrichmentPolling`. `'use client'` directive. Polls at 3000ms. Starts only if pending food items exist. Stops when none remain pending. Cleanup on unmount. |
| `components/menu/DishDetailSheet.tsx` | Bottom sheet detail view | VERIFIED | Uses `{ Sheet }` named import from `react-modal-sheet`. `detent="content"`. Renders dish name, origin, cultural note, ingredient chips, eating tips. `Sheet.Backdrop` with `onTap={onClose}`. |
| `app/actions/enrichment.ts` | Admin regeneration Server Actions | VERIFIED | `'use server'` directive. Exports `regenerateDishEnrichment` and `regenerateMenuEnrichment`. Both guarded by `isAdminAuthenticated()`. 80-item safety cap in menu regen. |

---

### Key Link Verification

#### Plan 01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/api/scan/url/route.ts` | `lib/enrichment.ts` | `after()` chained after `generateCanonicalNames` | VERIFIED | All 4 cache-miss paths (lines 91-94, 105-108, 142-145, 178-181) chain `await enrichDishBatch(menu.id)` after `await generateCanonicalNames(menu.id)` inside the same `after()` callback. Cache-hit path (line 82) correctly skips enrichment. |
| `app/api/scan/photo/route.ts` | `lib/enrichment.ts` | `after()` chained after `generateCanonicalNames` | VERIFIED | Single `after()` callback (lines 72-73) chains both calls sequentially. |
| `lib/enrichment.ts` | `lib/types/llm.ts` | Zod schema for LLM structured output | VERIFIED | `import { enrichmentBatchSchema } from './types/llm'` (line 14). Used at line 152 in `Output.object({ schema: enrichmentBatchSchema })`. |
| `app/api/enrichment/status/route.ts` | `supabase menu_items` | anon client read | VERIFIED | Uses `import { supabase } from '@/lib/supabase'` (anon). Queries `menu_items` with `enrichment_status` and enrichment field columns. |

#### Plan 02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `components/menu/MenuShell.tsx` | `hooks/useEnrichmentPolling.ts` | hook call in `MenuShellInner` | VERIFIED | Line 10: `import { useEnrichmentPolling }`. Line 204: `const enrichedItems = useEnrichmentPolling(initialMenu.id, initialMenu.menu_items)`. Merged into `mergedItems` via `useMemo` (lines 210-227). |
| `components/menu/DishCard.tsx` | `components/menu/DishDetailSheet.tsx` | state-driven sheet open on tap | VERIFIED | `DishCard` calls `onTapDetail?.(item)` (line 79). `MenuShell` passes `onTapDetail={setDetailDish}` (line 325). `DishDetailSheet` rendered with `isOpen={!!detailDish}` (lines 327-331). `onTapDetail` threaded through `MenuAccordion -> SectionAccordion -> SubAccordion -> DishCard`. |
| `components/admin/AdminDashboard.tsx` | `app/actions/enrichment.ts` | Server Action calls for regen | VERIFIED | Line 5: imports both `regenerateDishEnrichment` and `regenerateMenuEnrichment`. `MenuRegenButton` calls `regenerateMenuEnrichment(menuId)` inside `startTransition`. `DishRegenButton` calls `regenerateDishEnrichment(dishId)` inside `startTransition`. |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ENRI-01 | 11-01, 11-02 | Chaque plat enrichi affiche une explication culturelle (origine, ingrédients typiques, comment ça se mange) | SATISFIED | `DishCard.tsx` renders origin pill, cultural note snippet, and ingredient list. `DishDetailSheet.tsx` renders full cultural note, all ingredients, and eating tips. Data populated by `enrichDishBatch` via LLM with `cultural_note`, `typical_ingredients`, `eating_tips` fields. |
| ENRI-02 | 11-01 | L'enrichissement priorise les plats peu connus ou de cuisine étrangère — les plats évidents reçoivent un enrichissement minimal | SATISFIED | `ENRICHMENT_SYSTEM_PROMPT` in `lib/enrichment.ts` defines `depth_tier = "full"` for exotic/foreign dishes and `depth_tier = "minimal"` for self-explanatory French dishes. `enrichmentDishResultSchema` enforces the `depth_tier` enum. `DishCard.tsx` renders different UI per depth tier. |
| ENRI-03 | 11-02 | Un plat peut être re-enrichi (régénération) quand le modèle ou les sources s'améliorent | SATISFIED | `app/actions/enrichment.ts` provides `regenerateDishEnrichment` (per-dish reset + re-enrich) and `regenerateMenuEnrichment` (bulk reset + re-enrich). Both guarded by admin auth. `AdminDashboard.tsx` exposes both buttons. |
| ENRI-04 | 11-01, 11-02 | Les DishCards affichent un indicateur visuel d'enrichissement en cours (progressive enhancement) | SATISFIED | `DishCard.tsx` shows `animate-pulse` skeleton shimmer while `enrichment_status === 'pending'`. `useEnrichmentPolling` provides live updates every 3s, transitioning cards from shimmer to enriched state without page reload. |

No orphaned requirements — ENRI-05 maps to Phase 12 (dish images, not in scope here).

---

### Anti-Patterns Found

None. No TODO/FIXME/placeholder comments, no empty return stubs, no unconnected state in any phase file. TypeScript passes with zero errors (`npx tsc --noEmit` clean).

---

### Human Verification Required

The following behaviors can only be confirmed by running the application:

#### 1. Progressive Shimmer to Enrichment Transition

**Test:** Scan a new menu URL. On the resulting menu page, observe DishCards for food items before enrichment completes.
**Expected:** Food dish cards show a single animated pulse line. Within ~5-10 seconds, cards update in place to show either an origin pill + cultural hint (full-depth) or inline ingredients (minimal-depth) — no page reload required.
**Why human:** Timing, visual appearance of shimmer, and real-time DOM update behavior cannot be verified programmatically.

#### 2. Full-Depth Bottom Sheet on Tap

**Test:** On a menu with an exotic dish (e.g. Mantı, Börek, Couscous), tap the enrichment preview row on a full-depth DishCard.
**Expected:** A bottom sheet slides up from the bottom edge showing the dish canonical name, origin line (orange text), cultural note paragraph, ingredient chips in flex-wrap, and eating tips in italic. Dragging down or tapping the backdrop closes it.
**Why human:** Touch interaction, sheet animation, brand-color styling, and portal rendering in dark-mode cannot be verified programmatically.

#### 3. Minimal-Depth Card Appearance

**Test:** On a menu with familiar French dishes (steak frites, poulet rôti), verify no bottom sheet trigger appears.
**Expected:** Minimal-depth enriched cards show 3 inline ingredients as muted text. Tapping anywhere on the card does not open a sheet.
**Why human:** Requires verifying absence of interactive element on specific dish types with actual LLM-assigned depth tiers.

#### 4. Admin Regeneration Flow

**Test:** In admin panel, expand a menu's dish list via "Plats" expander. Click "Régénérer" on a single dish. Then click "Ré-enrichir tout" on a menu (requires confirm click).
**Expected:** Per-dish: button shows "En cours...", then "Enrichi" for 3 seconds, then returns to "Régénérer". Per-menu: first click shows "Confirmer?", second click shows "En cours...", then success count message for 5 seconds.
**Why human:** Transition states, timing, and visual feedback of `useTransition` cannot be verified without running the application.

---

### Gaps Summary

No gaps. All 10 observable truths verified, all 7 required artifacts exist and are substantive, all 7 key links are wired. TypeScript compiles clean. All 4 commits (ac7d247, 28173c6, d88bd44, 26ce296) confirmed in git history. Requirements ENRI-01 through ENRI-04 are fully satisfied.

---

_Verified: 2026-02-28T18:00:00Z_
_Verifier: Claude (gsd-verifier)_
