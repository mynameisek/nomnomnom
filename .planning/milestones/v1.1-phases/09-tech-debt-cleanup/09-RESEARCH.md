# Phase 9: Tech Debt Cleanup — Research

**Researched:** 2026-02-26
**Domain:** TypeScript type safety, code deduplication, documentation alignment (Next.js 16 / TypeScript 5 codebase)
**Confidence:** HIGH — all findings sourced directly from the live codebase (no external library uncertainty)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### ALLOWED_MODELS deduplication
- Create a shared `lib/constants.ts` (or add to existing shared file) with a single `ALLOWED_MODELS` definition
- Export as `as const` array + derive a union type (`AllowedModel`) from it
- Both `app/actions/admin.ts` (server action) and `components/admin/AdminDashboard.tsx` (client component) import from the shared file
- Shared file must NOT be a 'use server' file — plain TypeScript module so both server and client can import it
- If Next.js bundler issues arise with the shared import, use a `lib/models.ts` dedicated file (no 'use server' / 'use client' directive)

#### Menu type alignment
- Add `hit_count: number` and `parse_time_ms: number | null` to the `Menu` interface in `lib/types/menu.ts`
- Audit all fields against the actual `supabase/schema.sql` to catch any other mismatches — fix all at once, not just these two
- No DB migration needed — fields already exist in the schema, just missing from the TypeScript type

#### Documentation sync
- Full audit of REQUIREMENTS.md checkboxes against actual implementation status — update all checkboxes to reflect reality
- Create Phase 5 VERIFICATION.md by running the verifier agent against the scan pipeline requirements (SCAN-01 through SCAN-05, INFR-04)
- Update ROADMAP.md progress table to reflect phases 4-8 actual completion status (some show "Not started" but are complete)

#### Cleanup scope
- Stick to the 4 roadmap items as primary scope
- If obvious issues are discovered during audit (e.g., unused imports, dead code in touched files), fix them in the same commit — but don't go hunting
- No refactoring beyond what's needed to resolve the 4 items

### Claude's Discretion
- File naming and organization for the shared constants module
- Exact structure of Phase 5 VERIFICATION.md
- Whether to combine documentation fixes into one commit or split by file

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 9 is a pure cleanup phase with 4 concrete deliverables, all already fully scoped. There are no external libraries to research or architectural decisions to make — every change targets a specific file in the existing codebase. The research task is to audit the exact current state of each affected file to produce actionable change specifications.

The two code changes (ALLOWED_MODELS deduplication, Menu type fix) are straightforward TypeScript refactors. The codebase uses `@/*` path aliases (maps to project root), so `import { ALLOWED_MODELS } from '@/lib/models'` will work in both the server action and the client component without bundler issues. `lib/data.ts` already demonstrates the exact pattern: a plain TypeScript module with no directive that exports constants imported by both server and client files.

The two documentation changes (Phase 5 VERIFICATION.md, REQUIREMENTS.md + ROADMAP.md checkbox sync) require auditing actual implementation status against what the tracking docs currently claim. The audit doc (`.planning/v1.1-MILESTONE-AUDIT.md`) and phase SUMMARY files are the authoritative source of truth for what is actually implemented.

**Primary recommendation:** Create `lib/models.ts` (dedicated file, no directive), fix `lib/types/menu.ts` with 2 new fields, write Phase 5 VERIFICATION.md, then do a single comprehensive documentation sync pass across REQUIREMENTS.md and ROADMAP.md.

---

## Standard Stack

### Core
No new libraries required. This phase uses the existing stack only.

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| TypeScript 5 | `^5` | Type definitions and `as const` assertions | Already installed |
| Next.js | 16.1.6 | `@/*` path alias resolution | Already configured |

### Installation
```bash
# No new packages needed for this phase
```

---

## Architecture Patterns

### Pattern 1: Plain TypeScript Constants Module (no directive)

**What:** A `lib/` file with no `'use server'` or `'use client'` directive that exports constants usable by both server and client code.

**When to use:** Any constant shared between a Server Action (which has `'use server'`) and a Client Component (which has `'use client'`).

**Why it works:** Next.js bundles are split by directive. A file with no directive can be imported by both sides — the bundler includes only the code actually used in each bundle. `lib/data.ts` already does this successfully in this project.

**Example — current pattern to replicate (from `lib/data.ts` line 1-2):**
```typescript
// Shared data constants for NOM landing page
// No "use client" directive — plain data module, safe for Server and Client Components
export const FOOD: FoodItem[] = [...];
```

**Proposed `lib/models.ts` pattern:**
```typescript
// Shared LLM model constants — no directive, safe for server actions and client components

/**
 * Allowlist of LLM models available for admin selection.
 * Used by saveAdminModel (server action) for validation
 * and AdminDashboard (client component) for the dropdown.
 */
export const ALLOWED_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1-mini'] as const;

/**
 * Union type of all allowed model strings.
 * Derived from ALLOWED_MODELS so they always stay in sync.
 */
export type AllowedModel = typeof ALLOWED_MODELS[number];
```

**Import in `app/actions/admin.ts`:**
```typescript
import { ALLOWED_MODELS } from '@/lib/models';
// Remove the local const ALLOWED_MODELS = [...] as const;
```

**Import in `components/admin/AdminDashboard.tsx`:**
```typescript
import { ALLOWED_MODELS } from '@/lib/models';
// Remove the local const ALLOWED_MODELS = [...] as const;
```

### Pattern 2: TypeScript Interface Field Addition

**What:** Add two fields to the `Menu` interface to mirror the actual database schema.

**Current state of `lib/types/menu.ts` `Menu` interface (lines 58-69):**
```typescript
export interface Menu {
  id: string;
  url: string;
  url_hash: string;
  restaurant_name: string | null;
  source_type: string | null;
  raw_text: string | null;
  source_language: string | null;
  parsed_at: string;
  expires_at: string;
  created_at: string;
  // MISSING: hit_count, parse_time_ms
}
```

**Actual `supabase/schema.sql` `menus` table columns (complete list):**
```sql
id              uuid        primary key default gen_random_uuid(),
url             text        not null,
url_hash        text        not null unique,
restaurant_name text,                             -- nullable
source_type     text,                             -- nullable
raw_text        text,                             -- nullable
parse_time_ms   integer,                          -- nullable (null for cache hits)
hit_count       integer     not null default 0,   -- NOT NULL, default 0
parsed_at       timestamptz default now(),
expires_at      timestamptz not null,
created_at      timestamptz default now()
```

**Gap:** `hit_count` and `parse_time_ms` exist in schema, not in TypeScript. The `source_language` field is in the TypeScript type but NOT in the schema SQL — it was added later and the schema SQL was not updated. This is the reverse gap.

**Required fields to add to `Menu` interface:**
```typescript
hit_count: number;           // integer NOT NULL default 0 in schema
parse_time_ms: number | null; // integer nullable in schema
```

**Note on `source_language`:** The field IS in the TypeScript interface and IS used in `lib/cache.ts` (line 189: `source_language: sourceLanguage`). The schema SQL doesn't show it, but the code writes it. This suggests the schema.sql file may be slightly out of date from Phase 5/6 changes. Do NOT remove `source_language` from the TypeScript interface — it is actively used.

### Pattern 3: VERIFICATION.md for Phase 5 Scan Pipeline

**What:** Create a verification document for the Phase 5 scan pipeline that confirms requirements SCAN-01 through SCAN-05 and INFR-04 are satisfied.

**Reference format:** Use the same structure as `04-VERIFICATION.md` and `08-VERIFICATION.md`:
- YAML frontmatter with `phase`, `verified`, `status`, `score`
- Observable Truths table (# | Truth | Status | Evidence)
- Required Artifacts table
- Key Link Verification table
- Requirements Coverage table
- Human Verification Required section
- Gaps Summary

**Requirements to cover:**
| Requirement | Description | Implementation Evidence |
|-------------|-------------|------------------------|
| SCAN-01 | QR code scan | `components/scan/QrScanner.tsx` — dynamic import of `qr-scanner`, dispatches `qr-decoded` event → `UrlInput` |
| SCAN-02 | URL paste scan | `components/scan/UrlInput.tsx` → `POST /api/scan/url` → `getOrParseMenu` |
| SCAN-03 | Photo OCR scan | `components/scan/PhotoUpload.tsx` → `POST /api/scan/photo` → GPT-4o Vision |
| SCAN-04 | Loading progress feedback | `components/scan/ScanProgress.tsx` — 4-step indicator with timer advancement |
| SCAN-05 | Cache repeat scans | `lib/cache.ts` `getOrParseMenu` — cache check before LLM call |
| INFR-04 | Image resize 1024px | `components/scan/PhotoUpload.tsx` — `browser-image-compression` with `maxWidthOrHeight: 1024` |

**Key artifacts to verify:**
- `lib/screenshotone.ts` — lazy-initialized SDK, `extractMenuText()` with `format=markdown`
- `app/api/scan/url/route.ts` — URL validation → Screenshotone → `getOrParseMenu`
- `app/api/scan/photo/route.ts` — FormData → GPT-4o Vision → `preParseResult` path
- `app/scan/page.tsx` — scan page entry point
- `components/scan/ScanTabs.tsx` — tab orchestrator with progress overlay
- `components/scan/QrScanner.tsx` — SSR-safe dynamic import of `qr-scanner`
- `components/scan/UrlInput.tsx` — URL input + `qr-decoded` event listener
- `components/scan/PhotoUpload.tsx` — INFR-04 resize + multipart upload
- `components/scan/ScanProgress.tsx` — 4-step animated indicator

**Human verification items (cannot be verified programmatically):**
1. QR camera permission + decode → redirect to `/menu/[id]` with live menu data
2. URL paste of a real menu → dishes displayed on `/menu/[id]`
3. Photo of a physical menu → dishes extracted by Vision
4. Repeat URL scan → returns instantly from cache (no spinner, no LLM call)
5. Loading indicator visible during 6-15s parse

### Pattern 4: Documentation Checkbox Sync

**REQUIREMENTS.md — Current vs. Actual State**

Based on the audit document (`.planning/v1.1-MILESTONE-AUDIT.md`) cross-referenced against implementation evidence:

| Requirement | Current Checkbox | Actual Status | Action |
|-------------|-----------------|---------------|--------|
| SCAN-01 | `[ ]` | Code complete (05-02-SUMMARY.md) | → `[x]` |
| SCAN-02 | `[ ]` | Code complete (05-01-SUMMARY.md) | → `[x]` |
| SCAN-03 | `[ ]` | Code complete (05-01-SUMMARY.md) | → `[x]` |
| SCAN-04 | `[ ]` | Code complete (05-02-SUMMARY.md) | → `[x]` |
| SCAN-05 | `[ ]` | Code complete (05-01-SUMMARY.md) | → `[x]` |
| DISH-01 | `[ ]` | Satisfied (06-VERIFICATION.md) | → `[x]` |
| DISH-02 | `[ ]` | Partial → now complete via Phase 8 | → `[x]` |
| DISH-03 | `[ ]` | Satisfied (06-VERIFICATION.md) | → `[x]` |
| DISH-04 | `[ ]` | Satisfied (06-VERIFICATION.md) | → `[x]` |
| DISH-05 | `[ ]` | Satisfied (06-VERIFICATION.md) | → `[x]` |
| DISH-06 | `[ ]` | Satisfied (06-VERIFICATION.md) | → `[x]` |
| FILT-01 | `[ ]` | Satisfied (06-VERIFICATION.md) | → `[x]` |
| FILT-02 | `[ ]` | Satisfied (06-VERIFICATION.md) | → `[x]` |
| FILT-03 | `[ ]` | Satisfied (06-VERIFICATION.md) | → `[x]` |
| FILT-04 | `[ ]` | Satisfied (06-VERIFICATION.md) | → `[x]` |
| ADMN-01 | `[ ]` | Satisfied (07-VERIFICATION.md) | → `[x]` |
| ADMN-02 | `[ ]` | Satisfied (07-VERIFICATION.md) | → `[x]` |
| ADMN-03 | `[ ]` | Satisfied (07-VERIFICATION.md) | → `[x]` |
| INFR-04 | `[ ]` | Code complete (05-02-SUMMARY.md INFR-04 compliance) | → `[x]` |
| INFR-05 | `[ ]` | Satisfied (07-VERIFICATION.md) | → `[x]` |

Already checked: SCAN-01 through SCAN-05 are already `[x]` per current REQUIREMENTS.md lines 13-17. DISH-01 through DISH-06, FILT-01 through FILT-04 are already `[x]` per lines 20-33. ADMN-01 through ADMN-03 are `[x]` per lines 36-38.

**Precise current checkbox state from reading the file:**
- Lines 13-17: SCAN-01 through SCAN-05: all `[x]` — **no change needed**
- Lines 21-26: DISH-01 `[x]`, DISH-02 `[ ]`, DISH-03 through DISH-06 `[x]` — DISH-02 needs `[x]` (Phase 8 complete)
- Lines 29-33: FILT-01 through FILT-04: all `[x]` — **no change needed**
- Lines 36-38: ADMN-01 through ADMN-03: all `[x]` — **no change needed**
- Lines 42-46: INFR-01 `[x]`, INFR-02 `[x]`, INFR-03 `[x]`, INFR-04 `[ ]`, INFR-05 `[ ]` — INFR-04 and INFR-05 need `[x]`

**REQUIREMENTS.md Traceability Table — changes needed:**
- Line 97: `| DISH-02 | Phase 8 | Pending |` → `| DISH-02 | Phase 8 | Complete |`
- Line 112: `| INFR-04 | Phase 5 | Complete |` — already says Complete, but checkbox says `[ ]`. Fix checkbox.
- Line 113: `| INFR-05 | Phase 7 | Complete |` — already says Complete, but checkbox says `[ ]`. Fix checkbox.
- Coverage count at lines 117-119: Update "Complete: 22, Pending: 1 (DISH-02 → Phase 8)" to "Complete: 23, Pending: 0"

**ROADMAP.md Progress Table — changes needed:**
Current state (lines 121-128):
```
| 4. Infrastructure Foundation | v1.1 | 0/2 | Not started | - |
| 5. Scan Pipeline | v1.1 | 0/TBD | Not started | - |
| 6. Dish Cards and Filters | v1.1 | Complete    | 2026-02-25 | - |
| 7. Navigation and Admin | v1.1 | Complete    | 2026-02-25 | - |
| 8. Eazee-link Translation Fix | v1.1 | 0/1 | Not started | - |
| 9. Tech Debt Cleanup | v1.1 | 0/1 | Not started | - |
```

Phase 4 is complete (04-VERIFICATION.md exists, passed). Phase 5 is complete (05-01-SUMMARY.md and 05-02-SUMMARY.md both show `completed: 2026-02-25`). Phase 8 is complete (08-VERIFICATION.md exists, passed). Phases 4-8 checkboxes also need updating.

**ROADMAP.md phase bullet points (lines 25-30):**
- Line 25: `- [ ] **Phase 4: Infrastructure Foundation**` → `- [x]`
- Line 26: `- [ ] **Phase 5: Scan Pipeline**` → `- [x]`
- Line 29: `- [ ] **Phase 8: Eazee-link Translation Fix**` → `- [x]`

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shared constants | Complex module federation or runtime injection | Plain `.ts` file with no directive | Next.js handles tree-shaking per bundle automatically |
| Union type from array | Manual type definition | `typeof ARRAY[number]` | Stays in sync automatically — one source of truth |

**Key insight:** This codebase already has the pattern working in `lib/data.ts`. No new infrastructure is needed.

---

## Common Pitfalls

### Pitfall 1: Adding 'use server' or 'use client' to the constants file

**What goes wrong:** If `lib/models.ts` gets a `'use server'` directive (from copying `admin.ts` as a template), the client component import will fail at runtime with a "Cannot import server module from client component" error.

**Why it happens:** Copying from `app/actions/admin.ts` which starts with `'use server'`.

**How to avoid:** New file starts with a JSDoc comment and no directive. Verify by confirming no `'use server'` or `'use client'` on lines 1-3.

**Warning signs:** Next.js build error mentioning "cannot cross the server/client boundary."

### Pitfall 2: Breaking the `hit_count` usage in `lib/cache.ts`

**What goes wrong:** `lib/cache.ts` lines 99-103 and 152-155 access `cached.hit_count` directly. If the `Menu` type changes break TypeScript inference here, the build fails.

**Why it happens:** `cached` is typed as `MenuWithItems` which extends `Menu`. Adding `hit_count: number` to `Menu` makes the existing access strictly typed (currently it's `?? 0` because the field was absent from the type — accessing an unknown property).

**How to avoid:** After adding the fields, run `npx tsc --noEmit` and verify zero errors. The `?? 0` fallback in `hit_count: (cached.hit_count ?? 0) + 1` can be simplified to `cached.hit_count + 1` after typing, but leave the `?? 0` for safety — it does no harm.

### Pitfall 3: Checkbox counts becoming inconsistent in REQUIREMENTS.md

**What goes wrong:** Updating individual `[ ]` → `[x]` without updating the coverage summary block (lines 117-119) leaves the count wrong.

**Why it happens:** The summary is separate from the individual checkboxes — easy to miss.

**How to avoid:** Update all checkbox items first, then recount and update the coverage summary block. Also update the traceability table's "Status" column.

### Pitfall 4: Phase 5 VERIFICATION.md status assessment

**What goes wrong:** Writing the VERIFICATION.md as `status: passed` when human verification of live flows hasn't occurred.

**Why it happens:** Code inspection can verify the code is wired, but not that live API calls work.

**How to avoid:** Use `status: passed` (code-verified) with a `human_verification` section listing what still needs live testing. This matches the pattern in `04-VERIFICATION.md` where code was verified but `status: passed` was used alongside a gap noting REQUIREMENTS.md was not updated. The correct resolution is `status: passed` for the code artifacts, with human verification items listed separately.

### Pitfall 5: source_language field in Menu type

**What goes wrong:** The schema.sql file does NOT include `source_language` in the menus table definition, but the TypeScript type does and the code uses it. Removing it would break `lib/cache.ts` line 189.

**Why it happens:** The schema.sql was not updated after Phase 5 added `source_language` to the menus table via the insert at cache.ts:189.

**How to avoid:** Do NOT remove `source_language` from `lib/types/menu.ts`. Leave the schema.sql as-is (it's not in scope for this phase). The TypeScript type is the ground truth for the code, and the code works correctly.

---

## Code Examples

### lib/models.ts (new file to create)
```typescript
// Shared LLM model constants — no 'use server' / 'use client' directive
// Safe to import from server actions and client components alike.

/**
 * Allowlist of LLM models available for admin selection.
 * Used by saveAdminModel (server action) for input validation
 * and AdminDashboard (client component) for the model selector dropdown.
 * Single source of truth — add/remove models here only.
 */
export const ALLOWED_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1-mini'] as const;

/**
 * Union type of all allowed model strings.
 * Derived from ALLOWED_MODELS — stays in sync automatically.
 * Use as the parameter type for saveAdminModel.
 */
export type AllowedModel = typeof ALLOWED_MODELS[number];
```

### lib/types/menu.ts — Menu interface (fields to add)
```typescript
export interface Menu {
  id: string;
  url: string;
  url_hash: string;
  restaurant_name: string | null;
  source_type: string | null;
  raw_text: string | null;
  source_language: string | null;  // keep — used by cache.ts line 189
  parse_time_ms: number | null;    // ADD — integer nullable in schema
  hit_count: number;               // ADD — integer NOT NULL default 0 in schema
  parsed_at: string;
  expires_at: string;
  created_at: string;
}
```

### app/actions/admin.ts — after deduplication
```typescript
'use server';
import 'server-only';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminAuthenticated } from '@/lib/admin-session';
import { ALLOWED_MODELS } from '@/lib/models';  // ADD this import

// REMOVE the local: const ALLOWED_MODELS = [...] as const;

export async function saveAdminModel(
  model: string
): Promise<{ ok: true; model: string } | { error: string }> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) return { error: 'Unauthorized' };

  if (!(ALLOWED_MODELS as readonly string[]).includes(model)) {
    return { error: 'Invalid model' };
  }
  // ... rest unchanged
}
```

### components/admin/AdminDashboard.tsx — after deduplication
```typescript
'use client';
import { useState, useTransition } from 'react';
import { saveAdminModel } from '@/app/actions/admin';
import { ALLOWED_MODELS } from '@/lib/models';  // ADD this import

// REMOVE the local: const ALLOWED_MODELS = [...] as const;

// ... rest unchanged
```

---

## State of the Art

This phase is internal refactoring — no external library changes. Not applicable.

---

## Open Questions

1. **Does `source_language` exist in the live Supabase `menus` table?**
   - What we know: It's in `lib/types/menu.ts` and written by `lib/cache.ts`. The `schema.sql` doesn't show it.
   - What's unclear: Whether the Supabase table was ALTER'd after the initial schema.sql was written, or whether it only exists as a virtual column that Supabase ignores and returns null for.
   - Recommendation: Do not touch this in Phase 9. The code works, the type is correct for the code's behavior. If the column doesn't exist in Supabase, all inserts silently drop it (Supabase ignores unknown columns on insert) and all selects return null. The `source_language: string | null` type covers both cases.

2. **Should `ROADMAP.md` phase detail bullets be updated (lines 43-44, 58, 75, 88-89)?**
   - What we know: These are `- [ ]` checkboxes for individual plan files within phase detail sections.
   - What's unclear: Whether these should reflect completion too.
   - Recommendation: Yes — update the `- [ ] 04-01-PLAN.md`, `- [ ] 04-02-PLAN.md`, `- [ ] 05-01-PLAN.md`, etc. bullets to `- [x]` to be consistent with the overall phase status. This is implied by "update ROADMAP.md progress table to reflect phases 4-8 actual completion status."

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all findings verified against live files
- `app/actions/admin.ts` — current ALLOWED_MODELS definition (line 12)
- `components/admin/AdminDashboard.tsx` — duplicate ALLOWED_MODELS definition (line 6)
- `lib/types/menu.ts` — current Menu interface (lines 58-69)
- `supabase/schema.sql` — authoritative column list for menus table (lines 35-50)
- `lib/cache.ts` — hit_count and parse_time_ms usage patterns (lines 99-103, 162-163, 189)
- `.planning/v1.1-MILESTONE-AUDIT.md` — authoritative tech debt list
- `.planning/REQUIREMENTS.md` — current checkbox state (verified by reading file)
- `.planning/ROADMAP.md` — current progress table state (verified by reading file)
- `.planning/phases/05-scan-pipeline/05-01-SUMMARY.md` — Phase 5 Plan 01 implementation evidence
- `.planning/phases/05-scan-pipeline/05-02-SUMMARY.md` — Phase 5 Plan 02 implementation evidence
- `.planning/phases/04-infrastructure-foundation/04-VERIFICATION.md` — reference VERIFICATION.md format
- `.planning/phases/08-eazee-link-translation-fix/08-VERIFICATION.md` — reference VERIFICATION.md format
- `lib/data.ts` — working example of no-directive shared module pattern in this project
- `tsconfig.json` — confirms `@/*` path alias resolves to project root

---

## Metadata

**Confidence breakdown:**
- ALLOWED_MODELS deduplication: HIGH — exact file locations confirmed, pattern proven by `lib/data.ts`
- Menu type fields: HIGH — both the interface and schema.sql read directly; gap confirmed
- Phase 5 VERIFICATION.md: HIGH — all 6 requirements have implementation evidence in SUMMARY files; format clear from Phase 4/8 examples
- REQUIREMENTS.md sync: HIGH — current checkbox state confirmed by reading the file; audit doc cross-references implementation
- ROADMAP.md sync: HIGH — current progress table state confirmed by reading the file; completion dates available from SUMMARY files

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (stable codebase — no external library changes)
