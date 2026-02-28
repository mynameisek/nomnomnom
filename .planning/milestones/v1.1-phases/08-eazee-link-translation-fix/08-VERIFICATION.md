---
phase: 08-eazee-link-translation-fix
verified: 2026-02-26T00:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 8: Eazee-link Translation Fix — Verification Report

**Phase Goal:** Eazee-link menus display properly translated dish names in all 4 languages (FR/EN/TR/DE) instead of identical original text
**Verified:** 2026-02-26
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                          | Status     | Evidence                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| 1   | Scanning an eazee-link QR code and switching language shows different translated text per language (FR/EN/TR/DE) | VERIFIED | `translateEazeeLinkDishes` produces `name_translations` and `description_translations` with distinct FR/EN/TR/DE values before storage in `getOrParseMenu` |
| 2   | The LLM translation step is invoked for eazee-link menus on cache MISS only                   | VERIFIED | `getCachedMenu(canonicalUrl)` called at line 59 of route.ts; early return at line 61 if hit; `translateEazeeLinkDishes` at line 73 reached only on null return |
| 3   | Re-scanning a cached eazee-link menu returns instantly without any LLM call                   | VERIFIED | `if (cachedMenu) { return NextResponse.json({ menuId: cachedMenu.id }); }` at route.ts:60-62 — returns before fetch or translation |
| 4   | `source_language` is stored in the menus row for eazee-link scans (not null)                 | VERIFIED | `sourceLanguage` assigned from `translateEazeeLinkDishes` output at route.ts:74; passed as `source_language: sourceLanguage` in `preParseResult` at line 74; `getOrParseMenu` extracts it at cache.ts:165 and inserts at cache.ts:189 |
| 5   | Cultural context is appended to `description_translations` for dishes with notable origin      | VERIFIED | `translateEazeeLinkDishes` in openai.ts:252-270 appends `(cultural_context)` as parenthetical suffix when `description_original` exists; uses cultural context as standalone description when no `description_original` |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact                        | Expected                                              | Status     | Details                                                                                                    |
| ------------------------------- | ----------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| `lib/types/llm.ts`              | Zod schema for eazee-link translation LLM output      | VERIFIED   | `eazeeLinkDishTranslationSchema` (line 113) and `eazeeLinkMenuTranslationSchema` (line 124) exported; uses `.nullable()` throughout, never `.optional()` |
| `lib/openai.ts`                 | `translateEazeeLinkDishes` function + system prompt   | VERIFIED   | `EAZEE_TRANSLATE_SYSTEM_PROMPT` (line 188) and `translateEazeeLinkDishes` (line 218) both exported; function accepts `DishResponse[]`, returns `{ translatedDishes, sourceLanguage }` |
| `lib/cache.ts`                  | `getCachedMenu` helper + `source_language` in preParseResult type | VERIFIED | `getCachedMenu` exported at line 87; `preParseResult` union type extended with `source_language?: string` at line 133; extraction at line 165 |
| `app/api/scan/url/route.ts`     | Cache-aware eazee-link branch with translation before storage | VERIFIED | Full cache-first pipeline: `getCachedMenu` → `fetchEazeeLinkMenu` → `translateEazeeLinkDishes` → `getOrParseMenu` |

---

### Key Link Verification

| From                            | To                  | Via                                                          | Status   | Details                                                                                   |
| ------------------------------- | ------------------- | ------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------- |
| `app/api/scan/url/route.ts`     | `lib/cache.ts`      | `getCachedMenu(canonicalUrl)` early return on cache HIT      | WIRED    | Imported at line 15; called at line 59; early return at line 60-62 before any LLM work   |
| `app/api/scan/url/route.ts`     | `lib/openai.ts`     | `translateEazeeLinkDishes(dishes, model)` on cache MISS      | WIRED    | Imported at line 17; called at line 73 inside try block after `fetchEazeeLinkMenu`       |
| `app/api/scan/url/route.ts`     | `lib/cache.ts`      | `getOrParseMenu` with `{ dishes: translatedDishes, source_language: sourceLanguage }` | WIRED | `preParseResult` built at lines 70 and 74; passed to `getOrParseMenu` at line 81 |

All three key links are WIRED: imported, called with correct arguments, and response values are consumed.

---

### Requirements Coverage

| Requirement | Source Plan  | Description                                                    | Status    | Evidence                                                                                              |
| ----------- | ------------ | -------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------- |
| DISH-02     | 08-01-PLAN   | Dish cards show translation in 4 languages (FR/EN/TR/DE)       | SATISFIED | `translateEazeeLinkDishes` produces FR/EN/TR/DE `name_translations` and `description_translations` before Supabase storage; `getOrParseMenu` stores them in `menu_items` via the `name_translations` / `description_translations` columns (cache.ts:217-222) |

DISH-02 is the only requirement mapped to Phase 8 in REQUIREMENTS.md traceability table (line 97). No orphaned requirements found.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | — | — | No anti-patterns found |

No TODO/FIXME/placeholder comments, empty implementations, or stub returns detected in any of the four modified files.

Additional schema integrity check: No `.optional()` usage found in the new eazee-link schemas in `lib/types/llm.ts`. All optional fields correctly use `.nullable()` per OpenAI structured output requirement.

---

### TypeScript Compilation

`npx tsc --noEmit` executed with zero output — compilation passes with no type errors across all modified files.

---

### Human Verification Required

The following behaviors cannot be verified programmatically:

#### 1. End-to-end eazee-link scan produces genuinely distinct translations

**Test:** Scan a real eazee-link QR code (or POST to `/api/scan/url` with a valid eazee-link URL). After the scan, inspect the `menu_items` rows in Supabase — query `name_translations` and `description_translations` columns.
**Expected:** Each of the four language keys (`fr`, `en`, `tr`, `de`) contains different text (not identical copies of `name_original`).
**Why human:** Requires a live OPENAI_API_KEY, a real eazee-link sticker ID, and Supabase access to inspect stored rows. The pipeline code is correctly wired; whether the LLM actually returns distinct translations can only be confirmed against real data.

#### 2. Cache-hit path returns the translated (not untranslated) result on re-scan

**Test:** Scan the same eazee-link URL twice. Confirm the second response returns the same `menuId` instantly and that dish cards in the UI show translated text (not originals).
**Expected:** Second scan response time is near-zero; dish names in the menu shell display the translated FR/EN/TR/DE text when the language is switched.
**Why human:** Requires a running app environment and visual inspection of the menu shell language-switching behavior.

#### 3. Translation fallback path stores untranslated dishes gracefully

**Test:** Temporarily break the OpenAI key (or mock a `NoObjectGeneratedError`) and scan an eazee-link URL. Confirm the scan still completes and a menu is returned (with untranslated but present dish names).
**Expected:** HTTP 200 with `menuId`; menu items stored in Supabase with `name_translations` equal to the original eazee-link identity-copy values.
**Why human:** Requires deliberate failure injection in a live environment.

---

### Gaps Summary

No gaps found. All five observable truths are verified, all four required artifacts exist at a substantive level and are wired, the single declared requirement (DISH-02) is satisfied, and TypeScript compilation passes.

The pipeline correctly implements:
- Schema (`eazeeLinkDishTranslationSchema`, `eazeeLinkMenuTranslationSchema`) with `.nullable()` throughout
- Translation function (`translateEazeeLinkDishes`) with index-based merge, cultural context injection, and partial-output fallback
- Cache helper (`getCachedMenu`) that gates the translation LLM call
- Cache-first route ordering: check → fetch → translate → store
- `source_language` threaded from translation output through `preParseResult` into the `menus` row
- Graceful fallback on translation failure (untranslated dishes stored, scan never crashes)

---

_Verified: 2026-02-26_
_Verifier: Claude (gsd-verifier)_
