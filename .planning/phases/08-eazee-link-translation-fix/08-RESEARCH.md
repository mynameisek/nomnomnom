# Phase 8: Eazee-link Translation Fix - Research

**Researched:** 2026-02-26
**Domain:** LLM translation pipeline, eazee-link provider integration, Supabase cache layer
**Confidence:** HIGH — all findings from direct codebase inspection

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **LOCKED: Translate both dish names AND descriptions** — full translation, not names-only
- **LOCKED: Include brief cultural context/explanation** — matches PROJECT.md vision ("explications culturelles par plat"). e.g., "Flammekueche — Alsatian thin-crust pizza"
- **LOCKED: Auto-detect source language** — don't hardcode French. LLM infers from dish text. Works for any eazee-link menu worldwide
- **LOCKED: Cost optimization is a priority** — minimize token usage and API calls. Avoid over-spending. Prefer cheaper models, batched calls, and caching over multiple expensive LLM calls

### Claude's Discretion

- Where to inject the translation step (inside eazee-link provider vs getOrParseMenu vs separate function) — Claude picks the cleanest, lowest-cost approach based on codebase patterns
- Batching strategy (single batch call vs per-dish) — Claude picks based on typical eazee-link menu sizes and token cost
- Failure fallback behavior — Claude picks the approach that balances UX and cost (show untranslated as fallback is acceptable)
- LLM model selection for translation — Claude picks based on cost vs quality tradeoff (translation is simpler than parsing, cheapest model may suffice)
- Whether to reuse the existing full parsing prompt or create a lighter translation-only prompt — Claude picks based on cost (eazee-link already provides allergens/tags, so a dedicated translation prompt may be cheaper)
- Storage location (same menu_items table vs separate) — Claude picks what fits existing architecture
- Handling old untranslated cache entries — Claude picks between lazy re-translation on next scan vs new-only. Cost optimization is priority
- UX timing (wait for translation vs show-then-update) — Claude picks based on existing loading/progress patterns

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DISH-02 | Dish cards show translation in 4 languages (FR/EN/TR/DE) | Fix identified: eazee-link must go through a translation LLM call that populates real translations before cache storage, and the "already translated" guard in MenuShell must not be fooled by identity copies |
</phase_requirements>

---

## Summary

The bug is a two-part pipeline failure specific to the eazee-link provider path. First, `fetchEazeeLinkMenu` constructs `DishResponse` objects where all four `name_translations` keys (`fr`, `en`, `tr`, `de`) are set to the original dish label verbatim — no translation happens. Second, because those dishes are passed to `getOrParseMenu` as `preParseResult` (a shortcut that bypasses the LLM fast-parse step), the records land in `menu_items` with four identical translation slots already filled. When `MenuShell` later calls `triggerTranslation`, it checks `item.name_translations[targetLang]` and finds a non-empty string for every language, so it treats everything as "already translated" and makes no LLM call. The result: switching language on an eazee-link menu shows the original text unchanged in all four tabs.

The fix has one natural seam: after `fetchEazeeLinkMenu` returns structured dishes (names, prices, allergens, tags — all already correct) but before those dishes reach `getOrParseMenu`, inject a single batched LLM translation call that fills real translations for all four languages and adds cultural context. Because eazee-link data is already fully structured, the translation prompt can be a lightweight "translate only" prompt — substantially cheaper than the full parse prompt. The `preParseResult` shortcut is preserved: the translated `DishResponse[]` is still passed directly to `getOrParseMenu`, avoiding any redundant LLM parse.

A secondary fix is required in `getOrParseMenu` (or `fetchEazeeLinkMenu`): `source_language` is currently `null` for all eazee-link menus (it is only populated when `parseDishesFromMenuFast` is called, which is skipped). The translation function must auto-detect and return the source language so it can be stored in the `menus` row. This also ensures the `/api/translate` endpoint's prompt (`Source language: ${sourceLang}`) will be accurate for any future lazy re-translation requests.

**Primary recommendation:** Add `translateEazeeLinkDishes(dishes, rawText)` in `lib/menu-providers/eazee-link.ts` (or `lib/openai.ts`). Call it inside the eazee-link branch in `app/api/scan/url/route.ts`, between `fetchEazeeLinkMenu` and `getOrParseMenu`. Use a single batched LLM call with `gpt-4o-mini`, return translated `DishResponse[]` + detected `source_language`, and pass both to `getOrParseMenu` via a minor signature extension.

---

## Standard Stack

### Core (already in project — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` (Vercel AI SDK) | ^6.0.99 | LLM structured output via `generateText + Output.object()` | Already used for all LLM calls in the project |
| `@ai-sdk/openai` | ^3.0.33 | OpenAI model provider for AI SDK | Project standard; `openai(model)` factory pattern |
| `zod` | 3.25.76 (pinned) | Schema validation for LLM structured output | Pinned — do NOT upgrade; Zod v4 breaks AI SDK (GitHub #10014) |
| `@supabase/supabase-js` | ^2.97.0 | Cache reads (anon) + writes (service role) | Existing cache architecture |

### No New Packages Required

This phase adds no new dependencies. All required tooling (`generateText`, `Output.object()`, Zod schemas, supabaseAdmin) is already present.

---

## Architecture Patterns

### Recommended Structure — Where the Fix Lives

```
app/api/scan/url/route.ts          ← orchestration point (call translateEazeeLinkDishes here)
lib/menu-providers/eazee-link.ts   ← fetchEazeeLinkMenu stays unchanged; new fn may live here or in openai.ts
lib/openai.ts                      ← translateEazeeLinkDishes (translation fn + new Zod schema)
lib/cache.ts                       ← getOrParseMenu: accept source_language in preParseResult shape
lib/types/llm.ts                   ← new Zod schema for translation LLM output
```

### Pattern 1: generateText + Output.object() — The Established LLM Call Pattern

This is the project's only approved LLM call pattern (generateObject is deprecated in AI SDK 6).

```typescript
// Source: lib/openai.ts (existing parseDishesFromMenu)
const { experimental_output: output } = await generateText({
  model: openai(selectedModel),
  output: Output.object({
    schema: z.object({ source_language: z.string(), dishes: z.array(eazeeLinkTranslationSchema) }),
  }),
  maxRetries: 2,
  system: EAZEE_TRANSLATE_SYSTEM_PROMPT,
  prompt: buildTranslationPrompt(dishes),
});
```

**Critical constraint:** Use `.nullable()`, never `.optional()` in Zod schemas for OpenAI structured outputs. `.optional()` causes "Invalid schema for response_format" errors (established pitfall in this project).

### Pattern 2: Batched Single LLM Call (Preferred Over Per-Dish)

The existing `/api/translate` endpoint already demonstrates the correct pattern: collect all items that need translation, build a single JSON prompt with index-tagged entries, and translate in one call.

```typescript
// Existing pattern in app/api/translate/route.ts
const dishList = needsTranslation.map((item, idx) => ({
  index: idx,
  name: item.name_original,
  description: item.description_original,
}));
// → single generateText call with all dishes in prompt
```

For eazee-link translation, use the same single-batch approach. Typical eazee-link menus have 20–80 dishes. A single batch call for all 4 languages simultaneously is cheaper than 4 per-language calls and far cheaper than 80 per-dish calls.

### Pattern 3: preParseResult Bypass in getOrParseMenu

`getOrParseMenu` already accepts a `preParseResult` to skip the LLM fast-parse step:

```typescript
// lib/cache.ts — current signature
export async function getOrParseMenu(
  url: string,
  sourceType: 'url' | 'photo' | 'qr',
  rawText: string,
  preParseResult?: { dishes: DishResponse[] } | { dishes: DishParse[]; source_language: string }
): Promise<MenuWithItems>
```

The eazee-link path uses `{ dishes }` (no `source_language`). After the fix, it must also pass `source_language` detected by the translation LLM. The `preParseResult` union type needs a third variant or the existing `{ dishes: DishResponse[] }` variant must include an optional `source_language`. Recommendation: extend the existing `DishResponse` variant to `{ dishes: DishResponse[]; source_language: string }`.

### Pattern 4: Anon Client for Reads, supabaseAdmin for Writes

```typescript
// lib/cache.ts — established pattern
const { data: cached } = await supabase        // anon — preserves Next.js fetch cache
  .from('menus').select('...').eq('url_hash', urlHash)...;

await supabaseAdmin                             // service role — bypasses RLS for writes
  .from('menu_items').insert(menuItems)...;
```

No change needed to this pattern for Phase 8.

### Anti-Patterns to Avoid

- **Don't call translation per-dish:** 80 dishes × 1 LLM call = 80 API round-trips. Use one batched call.
- **Don't call `/api/translate` from the scan pipeline:** That endpoint is for client-side lazy translation. The fix must happen server-side during initial scan before cache storage.
- **Don't use generateObject:** Deprecated in AI SDK 6. Use `generateText + Output.object()` (established project rule).
- **Don't use Zod `.optional()`:** Use `.nullable()` for optional fields in LLM output schemas. `.optional()` breaks OpenAI structured output format.
- **Don't re-extract allergens/prices from eazee-link:** The API already provides them accurately. The translation prompt only needs to handle name + description + cultural context. Re-extracting wastes tokens and risks introducing errors on verified data.
- **Don't hardcode French as source language:** Auto-detect from dish text. Eazee-link is used worldwide; some menus may be in English, Dutch, or Arabic.

---

## Bug Root Cause — Exact Diagnosis

### Two-Part Failure

**Bug 1: Identity copies masquerade as translations (eazee-link.ts, lines 200–213)**

```typescript
// CURRENT — BROKEN
return {
  name_original: product.label,
  name_translations: {
    fr: product.label,  // ← identical to original
    en: product.label,  // ← identical to original
    tr: product.label,  // ← identical to original
    de: product.label,  // ← identical to original
  },
  description_translations: product.description
    ? { fr: product.description, en: product.description, tr: product.description, de: product.description }
    : null,
  // ...
};
```

**Bug 2: MenuShell's "already translated" guard is fooled**

```typescript
// MenuShell.tsx, triggerTranslation
const hasTranslation = menuData.menu_items.length > 0 &&
  menuData.menu_items.every((item) => item.name_translations[targetLang]);
// → ALL items have a non-empty string for ALL 4 langs → returns true → no LLM call ever
```

**Bug 3: source_language is null for eazee-link menus**

In `getOrParseMenu`:
```typescript
// Only populated when parseDishesFromMenuFast is called
const sourceLanguage = 'source_language' in parsed ? parsed.source_language : null;
// → eazee-link uses { dishes: DishResponse[] } preParseResult → source_language = null
```

This means `/api/translate` will prompt with `Source language: unknown` if lazy re-translation is ever triggered.

---

## Implementation Design

### Option A: Translate in eazee-link.ts (Provider-Owned)

- Pro: provider is self-contained; `route.ts` stays clean
- Con: eazee-link.ts would need to import from `openai.ts`, making the provider LLM-dependent. Providers are currently pure data-fetch modules.
- Verdict: Avoid — violates separation of concerns.

### Option B: Translate in route.ts inline (Orchestration Layer)

- Pro: all eazee-link orchestration in one place; easy to read the full flow
- Con: route.ts already has three paths (A/B/C); adding a multi-step translation block makes it longer
- Verdict: Acceptable for small implementations. Preferred if function is tiny.

### Option C: New `translateEazeeLinkDishes` function in openai.ts (Recommended)

- Pro: follows existing pattern (parseDishesFromMenu, parseDishesFromMenuFast are both in openai.ts); testable in isolation; route.ts stays clean
- Con: none significant
- Verdict: **Best fit.** Matches project structure. route.ts calls `translateEazeeLinkDishes(dishes, rawText)` between fetch and getOrParseMenu.

### Recommended Implementation Sketch

**Step 1: New Zod schema in `lib/types/llm.ts`**

```typescript
// Translation output from LLM for a single eazee-link dish
export const eazeeLinkDishTranslationSchema = z.object({
  index: z.number(),
  name_translations: translationMapSchema,
  description_translations: translationMapSchema.nullable(),
  cultural_context: z.string().nullable(), // brief note, e.g. "Alsatian thin-crust pizza"
});

export const eazeeLinkMenuTranslationSchema = z.object({
  source_language: z.string(),  // 2-letter ISO, auto-detected
  dishes: z.array(eazeeLinkDishTranslationSchema),
});
```

**Step 2: New system prompt (translation-only, no re-parsing)**

```typescript
// In lib/openai.ts
export const EAZEE_TRANSLATE_SYSTEM_PROMPT = `You are a professional culinary translator...
Rules:
- Auto-detect the source language from the dish names and descriptions.
- Translate each dish name and description into FR, EN, TR, DE simultaneously.
- Add a brief cultural_context note in the target language when the dish has notable cultural origin (e.g. "Alsatian thin-crust tart", "Provençal fish stew"). Return null if no useful context.
- Do NOT re-extract allergens, prices, or dietary tags — those are already correct.
- Preserve proper nouns. Keep "index" matching input index exactly.`;
```

**Step 3: New function in `lib/openai.ts`**

```typescript
export async function translateEazeeLinkDishes(
  dishes: DishResponse[],
  model?: string
): Promise<{ translatedDishes: DishResponse[]; sourceLanguage: string }> {
  const selectedModel = model ?? DEFAULT_LLM_MODEL;  // gpt-4o-mini default

  const dishList = dishes.map((dish, idx) => ({
    index: idx,
    name: dish.name_original,
    description: dish.description_original,
  }));

  const { experimental_output: output } = await generateText({
    model: openai(selectedModel),
    output: Output.object({ schema: eazeeLinkMenuTranslationSchema }),
    maxRetries: 2,
    system: EAZEE_TRANSLATE_SYSTEM_PROMPT,
    prompt: JSON.stringify(dishList, null, 2),
  });

  // Merge translations back into DishResponse array
  const translatedDishes = dishes.map((dish, idx) => {
    const t = output.dishes.find((d) => d.index === idx);
    if (!t) return dish; // fallback: keep original (untranslated) on partial failure
    return {
      ...dish,
      name_translations: t.name_translations,
      description_translations: dish.description_original
        ? (t.description_translations ?? dish.description_translations)
        : null,
    };
  });

  return { translatedDishes, sourceLanguage: output.source_language };
}
```

**Step 4: Route.ts eazee-link branch update**

```typescript
// app/api/scan/url/route.ts — eazee-link path
const eazeeStickerId = getEazeeLinkStickerId(url);
if (eazeeStickerId) {
  const canonicalUrl = `https://menu.eazee-link.com/?id=${eazeeStickerId}`;
  const { dishes, rawText } = await fetchEazeeLinkMenu(eazeeStickerId);

  // NEW: translate before caching
  const config = await getAdminConfig();
  const { translatedDishes, sourceLanguage } = await translateEazeeLinkDishes(dishes, config.llm_model);

  const menu = await getOrParseMenu(
    canonicalUrl,
    'url',
    rawText,
    { dishes: translatedDishes, source_language: sourceLanguage }  // pass source_language
  );
  return NextResponse.json({ menuId: menu.id });
}
```

**Step 5: Extend preParseResult type in `lib/cache.ts`**

```typescript
// Extend to include source_language for eazee-link translated results
export async function getOrParseMenu(
  url: string,
  sourceType: 'url' | 'photo' | 'qr',
  rawText: string,
  preParseResult?:
    | { dishes: DishResponse[]; source_language?: string }  // extended: eazee-link
    | { dishes: DishParse[]; source_language: string }      // fast parse
): Promise<MenuWithItems>

// In the body, extract source_language from both shapes:
const sourceLanguage =
  preParseResult && 'source_language' in preParseResult
    ? (preParseResult.source_language ?? null)
    : parsed && 'source_language' in parsed
    ? parsed.source_language
    : null;
```

---

## Cache Strategy

### Old Untranslated Cache Entries

Eazee-link menus already in cache have `name_translations` with 4 identical slots filled. `MenuShell.triggerTranslation` will not re-translate them (the guard short-circuits). Two options:

1. **Force-invalidate by bumping cache TTL manually** (admin action, one-time)
2. **Lazy-by-default:** Old entries stay broken until their TTL expires (7 days by default). New scans will get correct translations. Cost: zero extra LLM calls.

**Recommendation:** Lazy-by-default (option 2). Cost optimization is the priority. The next natural re-scan (cache miss after expiry) will automatically get translated dishes. No special migration needed.

### Cache HIT on Already-Translated Entry

When `getOrParseMenu` finds a cache HIT, it returns early — the translation LLM call happens before `getOrParseMenu` is reached in `route.ts`. This means a cache HIT will correctly short-circuit before any LLM call is made. The translation call only runs on a cache MISS.

**Concern:** If the cache HIT path returns early before `translateEazeeLinkDishes` is called, the translation LLM is never invoked. This is correct and desirable — cache hits should be instant and free.

**Implementation note:** The translation call must be placed BEFORE `getOrParseMenu` in route.ts, which means it runs even on a cache hit. This wastes tokens.

**Recommended fix:** Move the translation call INSIDE `getOrParseMenu` to only run on cache miss. Alternative: keep it in route.ts but check cache first. Since `getOrParseMenu` owns the cache check, the cleanest approach is:

- Pass the untranslated `dishes` + a `translateFn` to `getOrParseMenu`, or
- Keep translation in route.ts but accept that it runs before the cache check (wastes 1 LLM call per cache hit)

**Cost analysis:** Eazee-link menus are cached for 7 days. After the first scan (cache miss → translation call), subsequent scans within 7 days are cache HITs. If translation is in route.ts before `getOrParseMenu`, every re-scan of a cached eazee-link menu triggers a wasted translation call. For a production app with repeat scans, this is non-trivial cost.

**Recommended architecture:** Call `getOrParseMenu` first with untranslated dishes (as a pre-check). If cache HIT, return immediately. If cache MISS, call `translateEazeeLinkDishes`, then re-enter storage. This requires refactoring or a two-phase approach.

**Simpler alternative:** Add a cache-check helper (`checkCache(url)`) that returns the cached entry if it exists, or null. Route.ts checks this first; if hit, return early; if miss, translate then call `getOrParseMenu`. This is the cleanest separation:

```typescript
// route.ts — eazee-link path (cache-aware translation)
const eazeeStickerId = getEazeeLinkStickerId(url);
if (eazeeStickerId) {
  const canonicalUrl = `https://menu.eazee-link.com/?id=${eazeeStickerId}`;

  // 1. Check cache first (no LLM call if HIT)
  const cached = await getCachedMenu(canonicalUrl);  // new lightweight helper
  if (cached) return NextResponse.json({ menuId: cached.id });

  // 2. Cache MISS: fetch + translate + store
  const { dishes, rawText } = await fetchEazeeLinkMenu(eazeeStickerId);
  const config = await getAdminConfig();
  const { translatedDishes, sourceLanguage } = await translateEazeeLinkDishes(dishes, config.llm_model);
  const menu = await getOrParseMenu(canonicalUrl, 'url', rawText, { dishes: translatedDishes, source_language: sourceLanguage });
  return NextResponse.json({ menuId: menu.id });
}
```

OR — even simpler — pass the translation as a callback/lazy param into `getOrParseMenu`. But that adds complexity to the cache layer. The `getCachedMenu` helper approach avoids that.

---

## Model Selection

**Recommendation: `gpt-4o-mini` (already the project default)**

Translation quality requirements:
- Translate dish names and descriptions accurately
- Add brief cultural context note
- Auto-detect source language
- Handle FR/EN/TR/DE simultaneously

`gpt-4o-mini` is fully capable of all of these tasks. It is the project's `DEFAULT_LLM_MODEL` (see `lib/types/config.ts`). Using a cheaper/different model is not necessary — `gpt-4o-mini` is already the cheapest capable model in the project stack. Using `config.llm_model` (from admin_config) is the correct pattern, preserving admin override capability.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LLM structured output with schema validation | Custom JSON parser | `generateText + Output.object()` with Zod schema | Existing project pattern; handles retry, validation, error types |
| Batch translation ordering | Array index bookkeeping by hand | `index` field in LLM output schema (existing pattern in `/api/translate`) | LLM may reorder output; index field is the established guard |
| Cache invalidation | Custom TTL logic | Existing `expires_at` + delete-then-insert pattern in `getOrParseMenu` | Already handles TTL correctly |
| Source language detection | `franc` or similar library | LLM auto-detection in translation prompt | LLM already has this capability; no new dependency needed |

---

## Common Pitfalls

### Pitfall 1: Translation Before Cache Check = Wasted LLM Calls on Cache HIT

**What goes wrong:** If `translateEazeeLinkDishes` is called before `getOrParseMenu` in route.ts, every re-scan of a cached eazee-link menu (which is the majority of scans after first scan) wastes a full translation LLM call.

**Why it happens:** The cache check is inside `getOrParseMenu`, so calling translate before it bypasses the cost optimization.

**How to avoid:** Either (a) extract a `getCachedMenu(url)` helper that checks the cache before translation, or (b) move translation inside `getOrParseMenu`'s cache-miss branch. Option (a) is simpler given existing code structure.

**Warning signs:** No caching-related test in CI, but you can verify manually: scan the same eazee-link URL twice. Second scan should return instantly (no LLM call). If it takes as long as first scan, translation is running on cache hit.

### Pitfall 2: MenuShell Guard Still Blocks Re-Translation After Fix

**What goes wrong:** Even after fixing eazee-link to store real translations, the `MenuShell.triggerTranslation` guard `item.name_translations[targetLang]` will still short-circuit correctly — this is now the DESIRED behavior (translations are real). No change needed to MenuShell.

**Why it matters:** Verify that translated strings are actually different from `name_original`. If the LLM returns the same string (e.g. for French text already in French), that is correct — a French dish displayed in French mode should show the French name. The guard works correctly once real translations are stored.

### Pitfall 3: Partial LLM Output (Missing Dish Indices)

**What goes wrong:** LLM returns fewer dishes than submitted (e.g., 75 of 80 dishes). Indices not returned are silently dropped.

**Why it happens:** Token limits, LLM truncation, or prompt complexity with large menus.

**How to avoid:** Implement fallback in merge step: if `output.dishes.find(d => d.index === idx)` returns undefined, fall back to the original (untranslated) dish. This is the acceptable fallback behavior per CONTEXT.md. Also: `maxRetries: 2` is already set in other LLM calls — include it here.

**Warning signs:** Menus with 80+ items partially showing original text after scan.

### Pitfall 4: Zod Schema Uses `.optional()` Instead of `.nullable()`

**What goes wrong:** OpenAI structured outputs require all schema properties to be present in JSON. `.optional()` creates a schema without the property key. Result: "Invalid schema for response_format" error.

**How to avoid:** Use `.nullable()` for all fields that can be absent. This is an established project pitfall documented in `lib/types/llm.ts`.

### Pitfall 5: Cultural Context Appended to Translation Instead of Separate Field

**What goes wrong:** If cultural context is embedded in the `name_translations` string (e.g. "Flammekueche — Alsatian thin-crust pizza"), the DishCard will display the cultural note as part of the dish name. This may be acceptable or may look cluttered.

**Design decision:** Keep `cultural_context` as a separate field in the LLM output schema. In Phase 8, merge it into `description_translations` if the dish has no description, or append it. This keeps `name_translations` clean. Alternatively, add `cultural_context` to the `MenuItem` DB column (requires migration). Given cost and scope, recommend: append cultural context to description as a suffix, only when description is null.

**Warning signs:** Dish cards showing "Flammekueche — Alsatian thin-crust pizza" as the dish name.

### Pitfall 6: source_language Not Stored = `/api/translate` Prompt Degradation

**What goes wrong:** If `source_language` is null in the `menus` row, the translate endpoint uses `Source language: unknown` in its prompt, reducing translation quality for any future lazy re-translation.

**How to avoid:** Ensure `translateEazeeLinkDishes` returns `sourceLanguage` and that it is threaded through to `getOrParseMenu`'s `source_language` insert field.

---

## Code Examples

### Existing Working Pattern: parseDishesFromMenuFast (reference for new function)

```typescript
// Source: lib/openai.ts
export async function parseDishesFromMenuFast(
  menuText: string,
  model?: string
): Promise<MenuParse> {
  const selectedModel = model ?? DEFAULT_LLM_MODEL;

  try {
    const { experimental_output: output } = await generateText({
      model: openai(selectedModel),
      output: Output.object({
        schema: menuParseSchema,
      }),
      maxRetries: 2,
      system: MENU_PARSE_FAST_PROMPT,
      prompt: menuText,
    });

    return output;
  } catch (error) {
    if (error instanceof NoObjectGeneratedError) {
      console.error('[parseDishesFromMenuFast] NoObjectGeneratedError — raw LLM output:', error.text);
      throw new Error(...);
    }
    throw error;
  }
}
```

New `translateEazeeLinkDishes` follows this exact pattern.

### Existing Working Pattern: Batch Translation with Index (reference for prompt design)

```typescript
// Source: app/api/translate/route.ts
const dishList = needsTranslation.map((item, idx) => ({
  index: idx,
  name: item.name_original,
  description: item.description_original,
}));

const prompt = `Source language: ${sourceLang}\nTarget language: ${targetLangName}\n\nDishes to translate:\n${JSON.stringify(dishList, null, 2)}`;
```

New translation prompt sends ALL 4 target languages simultaneously (different from the lazy translate endpoint which handles one language per call).

### Existing Working Pattern: getOrParseMenu preParseResult branch

```typescript
// Source: lib/cache.ts
// Step 4: Cache MISS — use pre-parsed result or call fast LLM parse (no translations)
const parseStart = Date.now();
const parsed = preParseResult ?? await parseDishesFromMenuFast(rawText, config.llm_model);
const parseTimeMs = preParseResult ? null : Date.now() - parseStart;

// Detect source language from fast parse result
const sourceLanguage = 'source_language' in parsed ? parsed.source_language : null;
```

After the fix, `source_language` will be present in `preParseResult` for eazee-link menus, so this existing extraction will work correctly once the type union is extended.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `generateObject` | `generateText + Output.object()` | generateObject removed in AI SDK 6; project already uses correct pattern |
| Zod v4 | Zod 3.25.76 (pinned) | Zod v4 breaks AI SDK internal zod-to-json-schema; must NOT upgrade |
| One LLM call per language | Single batched call for all 4 languages | Cost: ~4× cheaper for eazee-link translation |

---

## Open Questions

1. **Cultural context storage location**
   - What we know: CONTEXT.md requires cultural context/explanation per dish ("explications culturelles par plat"). The `MenuItem` DB type has no `cultural_context` column. `description_translations` exists and is nullable.
   - What's unclear: Should cultural context get its own DB column (requires migration) or be merged into description?
   - Recommendation: For Phase 8 scope, append cultural context to `description_translations` when no description exists, or as a parenthetical suffix when description exists (e.g., "Rich beef stew (traditional Burgundy dish)"). No schema migration needed. If a dedicated column is desired, that's Phase 9+ scope.

2. **Large menu token budget**
   - What we know: Eazee-link menus can have 50–100 products. Sending all names + descriptions for 4-language translation in a single call may hit context limits for large menus.
   - What's unclear: Real token counts for the test menu (`?id=E7FNRP0ET3`). Unknown without fetching.
   - Recommendation: For Phase 8, use a single batch call and rely on `maxRetries: 2`. If menus exceed ~60 dishes, consider chunking into 2 batches. The test reference menu should be fetched during implementation to verify.

3. **Failure behavior: partial translation vs full rollback**
   - What we know: CONTEXT.md says "show untranslated as fallback is acceptable."
   - What's unclear: If `translateEazeeLinkDishes` throws (LLM error), should route.ts (a) propagate the error (scan fails), or (b) fall back to storing untranslated dishes?
   - Recommendation: Catch the translation error in route.ts, log it, and fall back to storing untranslated dishes with `{ dishes }` (no source_language). This ensures the user gets a menu even if translation fails. The untranslated state is the same as today (acceptable fallback per CONTEXT.md).

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)

- `/Users/ekitcho/Desktop/dev-claude-lab/nomnomnom/lib/menu-providers/eazee-link.ts` — confirmed identity-copy bug (lines 200–213), confirmed structure
- `/Users/ekitcho/Desktop/dev-claude-lab/nomnomnom/lib/cache.ts` — confirmed preParseResult bypass, source_language extraction logic, delete-then-insert pattern
- `/Users/ekitcho/Desktop/dev-claude-lab/nomnomnom/lib/openai.ts` — confirmed generateText + Output.object() pattern, both parse functions, system prompts
- `/Users/ekitcho/Desktop/dev-claude-lab/nomnomnom/lib/types/llm.ts` — confirmed Zod schemas, .nullable() constraint, pinned Zod version
- `/Users/ekitcho/Desktop/dev-claude-lab/nomnomnom/app/api/scan/url/route.ts` — confirmed 3-path orchestration, eazee-link branch, getOrParseMenu call
- `/Users/ekitcho/Desktop/dev-claude-lab/nomnomnom/app/api/translate/route.ts` — confirmed lazy translation pattern, batch index strategy, per-language update
- `/Users/ekitcho/Desktop/dev-claude-lab/nomnomnom/components/menu/MenuShell.tsx` — confirmed triggerTranslation guard logic, "already translated" short-circuit
- `/Users/ekitcho/Desktop/dev-claude-lab/nomnomnom/lib/types/menu.ts` — confirmed MenuItem shape, TranslationMap as Partial record
- `/Users/ekitcho/Desktop/dev-claude-lab/nomnomnom/lib/types/config.ts` — confirmed DEFAULT_LLM_MODEL = 'gpt-4o-mini', admin_config pattern
- `/Users/ekitcho/Desktop/dev-claude-lab/nomnomnom/package.json` — confirmed AI SDK 6.0.99, @ai-sdk/openai 3.0.33, Zod 3.25.76 pinned

### Secondary (MEDIUM confidence)

None — all findings are from direct codebase inspection, no external sources needed for this phase.

---

## Metadata

**Confidence breakdown:**
- Bug diagnosis: HIGH — traced exact code paths, both bugs confirmed in source
- Fix architecture: HIGH — follows established patterns in the same codebase
- Prompt design for translation: MEDIUM — LLM prompt quality requires testing; cultural context integration needs iteration
- Cache-hit cost optimization: HIGH — logic follows from existing cache.ts patterns
- Token budget for large menus: LOW — unknown without fetching the test reference menu; estimate only

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (30 days — stable codebase, no fast-moving external dependencies)
