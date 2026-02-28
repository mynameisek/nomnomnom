---
phase: 11-dish-enrichment
plan: "02"
subsystem: enrichment-ui
tags: [enrichment, polling, bottom-sheet, progressive-disclosure, admin, server-actions]
dependency_graph:
  requires: [11-01]
  provides: [useEnrichmentPolling, DishDetailSheet, enriched-DishCard, regenerateDishEnrichment, regenerateMenuEnrichment]
  affects: [components/menu/DishCard.tsx, components/menu/MenuShell.tsx, components/menu/MenuAccordion.tsx, components/admin/AdminDashboard.tsx]
tech_stack:
  added: [react-modal-sheet@5.2.1]
  patterns: [progressive-disclosure, client-polling, bottom-sheet, server-actions, useTransition]
key_files:
  created:
    - hooks/useEnrichmentPolling.ts
    - components/menu/DishDetailSheet.tsx
    - app/actions/enrichment.ts
  modified:
    - components/menu/DishCard.tsx
    - components/menu/MenuShell.tsx
    - components/menu/MenuAccordion.tsx
    - components/admin/AdminDashboard.tsx
    - app/api/enrichment/status/route.ts
decisions:
  - Named import { Sheet } from react-modal-sheet (not default export) — fixed at type check
  - detent="content" not "content-height" — corrected to match SheetDetent type union
  - Enrichment and translation states kept separate and merged at render via useMemo — avoids polling restart on lang change
  - Status endpoint extended with name_original field — needed by admin per-dish expander
  - Confirm swap UX for per-menu bulk regen (one extra click) — lower accident risk for slow operation
metrics:
  duration: "~20 minutes"
  completed: "2026-02-28"
  tasks_completed: 2
  files_modified: 8
---

# Phase 11 Plan 02: Progressive DishCard UI + Admin Regen Summary

Progressive enrichment disclosure (pending shimmer -> full-depth tappable row -> bottom sheet detail) with client polling and admin per-dish/per-menu regeneration via Server Actions.

## What Was Built

### Task 1: Polling Hook + DishDetailSheet + Enhanced DishCard + Shell Integration

- **`hooks/useEnrichmentPolling.ts`**: Client-side polling hook that fetches `/api/enrichment/status` every 3s. Starts only if any food item has `enrichment_status === 'pending'`. Stops automatically when no food items remain pending. Cleanup on unmount prevents memory leaks. Returns progressively updated items array.

- **`components/menu/DishDetailSheet.tsx`**: Bottom sheet using `react-modal-sheet` with `Sheet.Container`, `Sheet.Header` (drag handle), `Sheet.Content` (dish name, origin, cultural note, ingredient chips, eating tips), and `Sheet.Backdrop` (tap to close). Uses `detent="content"` for content-height behavior.

- **`components/menu/DishCard.tsx`**: Added `onTapDetail` optional prop and three enrichment states rendered between description and bottom row:
  1. **Pending shimmer**: `animate-pulse` skeleton line for food items with `enrichment_status === 'pending'`
  2. **Full-depth preview**: Origin pill + truncated cultural note (60 chars) in a tappable `<button>` calling `onTapDetail`
  3. **Minimal-depth**: First 3 ingredients inline as muted text — no tap interaction

- **`components/menu/MenuAccordion.tsx`**: `onTapDetail` prop threaded through `MenuAccordion` -> `SectionAccordion` -> `SubAccordion` -> `DishCard`.

- **`components/menu/MenuShell.tsx`**: Polling hook called with stable `initialMenu.id` and `initialMenu.menu_items`. Enrichment state merged with translation state via `useMemo` (enrichment fields merged onto `menuData.menu_items` — non-overlapping fields, no conflicts). `detailDish` state controls `DishDetailSheet` open/close. `DishDetailSheet` rendered at shell level outside content tree (portal handles layout isolation).

### Task 2: Admin Regeneration Server Actions + Dashboard UI

- **`app/actions/enrichment.ts`**: Two Server Actions behind `isAdminAuthenticated()`:
  - `regenerateDishEnrichment(dishId)`: Fetches menu_id, resets enrichment fields to pending, calls `enrichDishBatch` synchronously.
  - `regenerateMenuEnrichment(menuId)`: Safety cap at 80 food items (Vercel 60s timeout protection), bulk-resets all food items, calls `enrichDishBatch` synchronously.

- **`components/admin/AdminDashboard.tsx`**: New "Enrichissement" column in scans table with:
  - `MenuRegenButton`: Confirm swap UX (first click → "Confirmer?", second click → runs). `useTransition` for "En cours..." state. Inline success/error message.
  - `MenuDishesExpander`: Lazy-loads food dish list via `/api/enrichment/status` on expand. Shows per-dish `DishRegenButton` with individual `useTransition` and inline "Régénérer" / "En cours..." / "Enrichi" states.

- **`app/api/enrichment/status/route.ts`**: Added `name_original` to the select query — required by admin `MenuDishesExpander` for dish display names.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Named import `{ Sheet }` | react-modal-sheet v5 exports named `Sheet`, not default export — type error caught at first tsc run |
| `detent="content"` not `"content-height"` | SheetDetent type is `'default' \| 'full' \| 'content'` — plan used wrong value |
| Separate enrichment + translation state, merged via useMemo | Passing `menuData.menu_items` as `initialItems` to the polling hook would restart polling on every lang change (initialItems changes on translation update). Keeping them separate avoids the restart. |
| `name_original` added to status endpoint | Admin per-dish expander uses the status endpoint for dish names — was missing from original select |
| Confirm swap for bulk regen | Per-menu regen is slow (synchronous LLM call for N dishes) — one extra click prevents accidental bulk ops |

## Verification Results

1. `npx tsc --noEmit` — PASS (zero errors)
2. `npm run build` — PASS (all 13 pages build successfully)
3. `useEnrichmentPolling` imported and called in `MenuShellInner` — PASS
4. `DishDetailSheet` rendered at shell level in `MenuShellInner` — PASS
5. `DishCard` has all three enrichment states — PASS
6. Both Server Actions export from `app/actions/enrichment.ts` with auth guard — PASS
7. AdminDashboard imports both Server Actions — PASS
8. `useTransition` used in `MenuRegenButton` and `DishRegenButton` — PASS

## Commits

| Hash | Description |
|------|-------------|
| d88bd44 | feat(11-02): polling hook, DishDetailSheet, enriched DishCard, MenuAccordion/MenuShell integration |
| 26ce296 | feat(11-02): admin enrichment Server Actions + AdminDashboard regen UI |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed react-modal-sheet import style**
- **Found during:** Task 1, first tsc run
- **Issue:** Plan used `import Sheet from 'react-modal-sheet'` (default import) but v5 uses named export `{ Sheet }`
- **Fix:** Changed to `import { Sheet } from 'react-modal-sheet'`
- **Files modified:** `components/menu/DishDetailSheet.tsx`
- **Commit:** d88bd44

**2. [Rule 1 - Bug] Fixed invalid detent value**
- **Found during:** Task 1, first tsc run
- **Issue:** Plan specified `detent="content-height"` but SheetDetent type is `'default' | 'full' | 'content'`
- **Fix:** Changed to `detent="content"` — same semantic (height matches content)
- **Files modified:** `components/menu/DishDetailSheet.tsx`
- **Commit:** d88bd44

**3. [Rule 2 - Missing functionality] Added name_original to status endpoint**
- **Found during:** Task 2, implementing MenuDishesExpander
- **Issue:** Admin per-dish expander fetches `/api/enrichment/status` to get food items and display their names, but the endpoint didn't select `name_original`
- **Fix:** Added `name_original` to the select query in the status endpoint
- **Files modified:** `app/api/enrichment/status/route.ts`
- **Commit:** 26ce296

**4. [Rule 1 - Design] Polling state/translation state merge strategy**
- **Found during:** Task 1, implementing MenuShellInner
- **Issue:** Plan's suggested strategy (pass `menuData.menu_items` as `initialItems` to polling hook) would cause polling to restart on every translation update because `initialItems` reference changes
- **Fix:** Keep enrichment state separate (polling hook uses stable `initialMenu.menu_items` as base), merge with translation state at render via `useMemo` — enrichment fields are non-overlapping with translation fields so `{ ...item, ...enrichedFields }` is clean
- **Files modified:** `components/menu/MenuShell.tsx`
- **Commit:** d88bd44

## Self-Check: PASSED

All 8 files exist on disk. Both commits (d88bd44, 26ce296) confirmed in git history. Build passes. Zero TypeScript errors.
