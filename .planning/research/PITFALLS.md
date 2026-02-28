# Pitfalls Research

**Domain:** Adding dish enrichment, canonical names, reverse search, and AI Top 3 to an existing Next.js 16 + Supabase + OpenAI menu scanning app (v1.2 milestone)
**Researched:** 2026-02-28
**Confidence:** HIGH for LLM cost/caching (verified against official OpenAI docs); HIGH for pgvector limitations (verified against official Supabase docs); MEDIUM for canonical name quality (pattern-verified, no official benchmarks); MEDIUM for image licensing (verified against official APIs and active litigation); LOW for exact query latency thresholds (environment-dependent)

---

## Critical Pitfalls

### Pitfall 1: Enrichment LLM Call Inserted Synchronously Into the Scan Pipeline Blocks Render

**What goes wrong:**
The enrichment step (cultural explanation, canonical name, ingredients) gets added as a sequential step inside `getOrParseMenu` or the scan API route, after the fast parse. Every new scan now waits for two LLM calls in sequence: parse (~2–4s) + enrich (~3–6s) = 8–10s before the user sees dish cards. On existing cached menus (cache hit), users now wait for enrichment instead of the near-instant response they got before.

**Why it happens:**
The mental model is: "enrichment is part of a dish, so run it during scan." The fast parse already returns dish data; enrichment feels like the next logical step in the same pipeline. But `getOrParseMenu` is synchronous and the user is waiting on the response. Adding enrichment here doubles the wall-clock time for the most common case (first scan of a restaurant).

**How to avoid:**
- Run enrichment as a fire-and-forget background operation after `getOrParseMenu` completes and the initial dishes are stored. The response to the user returns immediately with parsed (un-enriched) dishes.
- Store enrichment data in a separate column (or table) from `menu_items`. The dish card renders immediately with name/price/allergens from the fast parse; enrichment fields appear once available (polling or server-sent event).
- On cache hit, serve the cached enrichment if it exists; skip enrichment if it is already present. Never re-enrich on every hit.
- Add a `enriched_at` nullable column to `menu_items`. If null, enrichment is pending. If set, render the enrichment data.

**Warning signs:**
- `parseDishesFromMenuFast` and an enrichment function are called sequentially in the same `async` function before returning to the client.
- Scan response time increases by more than 3s after adding enrichment.
- Cache hit responses become slower after v1.2 ships (should be instant for already-enriched menus).

**Phase to address:** Dish Enrichment phase — architecture of enrichment pipeline must be decided before any implementation. Async fire-and-forget pattern must be established at schema level first.

---

### Pitfall 2: Enriching All Dishes Per Scan Multiplies LLM Cost by N Dishes

**What goes wrong:**
A Turkish restaurant menu has 45 dishes. Enrichment is implemented as one LLM call per dish. Scan triggers 45 enrichment calls. At GPT-4o-mini pricing ($0.15/M input tokens, $0.60/M output tokens) with ~200 input tokens + ~300 output tokens per dish, cost is ~45 × $0.000245 = $0.011 per scan — small individually but x1000 scans/month = $11/month just in enrichment, before parse cost. With GPT-4o instead of mini, cost is 8–10x higher.

**Why it happens:**
Enrichment per dish feels natural because each dish is a separate entity. Developers don't model the cumulative cost at scale before choosing the call architecture. The per-call cost looks negligible in isolation.

**How to avoid:**
- Batch enrichment: send all dish names from a single menu in one LLM call with a schema returning an array. A 45-dish menu can be enriched in one call returning `{ dishes: [{ canonical_name, origin, cultural_note, typical_ingredients }] }` at ~2,000–3,000 input tokens total — roughly 3–5x cheaper than 45 individual calls.
- Use GPT-4o-mini for enrichment (not GPT-4o). Cultural notes and canonical names are not complex reasoning tasks. Mini is sufficient. Reserve GPT-4o for Top 3 recommendations which require nuanced judgment.
- Enrich only on first scan. Subsequent cache hits serve the stored enrichment — no repeat LLM calls.
- Use OpenAI Batch API for enrichment when low urgency: 50% discount over synchronous API. Suitable if enrichment is async and can tolerate up to 24h completion time.
- Apply a hard `max_tokens` on enrichment output (recommended: 600 output tokens for a 45-dish batch, ~13 tokens per dish).

**Warning signs:**
- `for (const dish of dishes) { await enrichDish(dish) }` in enrichment code — sequential per-dish calls.
- No `max_tokens` set on enrichment calls.
- Using `gpt-4o` model string for enrichment rather than `gpt-4o-mini`.
- OpenAI usage dashboard shows enrichment calls exceeding parse call count for the same scan session.

**Phase to address:** Dish Enrichment phase — before writing enrichment prompt, design the batching schema and cost model.

---

### Pitfall 3: Canonical Name Quality Degrades for Non-Western Dishes Without Prompt Engineering

**What goes wrong:**
The canonical name normalizer works well for French and Italian dishes ("Confit de canard" → "Duck Confit", "Spaghetti carbonara" → "Spaghetti Carbonara") but produces inconsistent results for Turkish, Arabic, and regional dishes. "Mantı" appears as "Manti", "Turkish Dumplings", "Manti (Turkish)", and "Mantı" across different scans of different restaurants. Cross-restaurant matching breaks because the canonical form is not deterministic.

**Why it happens:**
LLMs have uneven culinary coverage by cuisine. Western/Italian/French dishes have extensive training data and standardized names. Turkish, Moroccan, Levantine, and regional dishes have multiple transliteration schemes and no single authoritative canonical form. The LLM chooses whichever form is most common in its training data, which varies by model version and prompt phrasing.

**How to avoid:**
- Maintain a seed canonical name table in Supabase for common regional dishes in the Strasbourg market (Turkish, Alsatian, German, North African). ~100–200 entries covers the majority of cases.
- The enrichment prompt should check the seed table first: include the seed list in the system prompt as reference. "When a canonical name appears in the following list, always use the exact form listed: [Mantı → Manti, Döner → Doner Kebab, ...]"
- Define canonical name format rules in the prompt: use English, use singular form, remove brand-specific qualifiers (e.g., "Le Comptoir's" prefix), preserve proper nouns (Alsace, Provence, etc.).
- Add a human-reviewable canonical name queue in the admin dashboard where mismatches can be corrected and added to the seed table.
- After enrichment, normalize via a lightweight post-processing step: lowercase, trim, collapse whitespace, remove trailing punctuation.

**Warning signs:**
- Same physical dish appears with 3+ different canonical names in the `menu_items` table across different restaurants.
- Canonical names for Turkish dishes use Turkish characters (ı, ş, ğ) inconsistently — sometimes transliterated, sometimes not.
- No seed/reference table exists; canonical names are entirely LLM-generated without anchoring.

**Phase to address:** Dish Enrichment phase — before shipping canonical names, run a quality check across 5 different restaurant menus covering 3+ cuisines. Seed table should exist before first production enrichment.

---

### Pitfall 4: Embedding Generation Added to Scan Pipeline Silently Doubles Per-Scan LLM Cost

**What goes wrong:**
Reverse search requires vector embeddings for each dish. Adding embedding generation to the scan pipeline means every new menu scan triggers: (1) fast parse LLM call, (2) batch enrichment LLM call, and (3) N embedding API calls (one per dish). For a 45-dish menu: 45 × text-embedding-3-small tokens ≈ 45 × 20 tokens = 900 input tokens at $0.02/M = $0.000018 — negligible per scan but the architectural coupling creates latency. The embedding calls add 200–500ms sequential latency if not parallelized, or add failure modes if the embedding API rate-limits.

**Why it happens:**
Reverse search is conceptually linked to ingesting new menus, so developers add embedding generation to `getOrParseMenu`. When embedding API calls are added inline, they block the response. When they fail (rate limit, network error), the entire scan fails even though dish data was successfully parsed.

**How to avoid:**
- Generate embeddings in the same background task as enrichment — not in the main scan pipeline. Treat embeddings as enrichment metadata: generate after scan, store in a separate column (`embedding vector(1536)`), serve reverse search from pre-computed embeddings.
- Generate embeddings from the canonical name + cultural note + typical ingredients concatenated as a single string — richer semantic content than the name alone. This improves reverse search recall.
- Use `text-embedding-3-small` (1536 dimensions, $0.02/M tokens) rather than `text-embedding-3-large` (3072 dimensions, $0.13/M tokens). For dish name matching, small model is sufficient. Confidence: HIGH (official OpenAI pricing).
- Parallelize embedding generation: `Promise.all(dishes.map(dish => generateEmbedding(dish)))` with rate-limit retry wrapper.
- Add HNSW index on the embedding column before the table has more than ~1,000 dishes. Without the index, every reverse search is a sequential scan. Confidence: HIGH (Supabase official docs).

**Warning signs:**
- `generateEmbedding()` called inside `getOrParseMenu` before returning to the client.
- Embedding generation failure causing the entire scan to throw a 500 error.
- No HNSW index on the `embedding` column — confirmed by `EXPLAIN ANALYZE` showing `Seq Scan`.
- Using `text-embedding-3-large` for dish names (overkill, 6x more expensive per token).

**Phase to address:** Reverse Search phase — embedding pipeline architecture must be established as async. HNSW index migration must be part of the schema migration, not added later.

---

### Pitfall 5: pgvector Embedding Model Switching Invalidates the Entire Search Index

**What goes wrong:**
Reverse search ships with `text-embedding-3-small`. After a few weeks, the decision is made to switch to `text-embedding-3-large` for better recall. The existing embeddings in the database (generated by small) are now incompatible with query embeddings (generated by large). Cosine similarity between a large-model query vector and small-model dish vectors produces meaningless scores. All reverse search results are garbage, silently — no error is thrown.

**Why it happens:**
Embedding model consistency is a non-obvious constraint. Developers often switch embedding models as "just an API upgrade" without realizing all stored vectors must be regenerated. The failure is silent: the search returns results (no errors), but the ranking is random.

**How to avoid:**
- Store the embedding model name alongside each embedding: add `embedding_model text NOT NULL DEFAULT 'text-embedding-3-small'` column to `menu_items`.
- At query time, check that the query embedding model matches the stored embedding model. If they differ, either regenerate all stored embeddings or maintain parallel columns for different models.
- Changing embedding models is a breaking migration: requires a background job to re-embed all existing dishes before switching the query path. Plan this as a multi-hour or multi-day operation for large tables.
- Commit to `text-embedding-3-small` for the entire v1.2 scope. Do not switch models mid-milestone.

**Warning signs:**
- No `embedding_model` column tracking which model produced each embedding.
- Embedding model changed in an env var without a corresponding re-embedding migration.
- Reverse search results stop matching obvious queries (e.g., "mantı" returns unrelated dishes) after a model upgrade.

**Phase to address:** Reverse Search phase — schema design must include model tracking before first embedding is generated.

---

### Pitfall 6: Reverse Search Threshold Misconfiguration Returns Garbage or Nothing

**What goes wrong:**
The semantic search `match_threshold` (cosine similarity cutoff) is set either too high (0.95) or too low (0.5). Too high: "je veux des mantı" returns 0 results even when Mantı is in the database. Too low: "I want something spicy" returns every dish in the database. Neither failure throws an error — the UI shows either an empty state or an unfiltered list of dishes.

**Why it happens:**
Developers copy the Supabase semantic search example which uses `match_threshold: 0.78` without understanding that this value is data-dependent. Turkish dish names in French queries may have lower cosine similarity than French-to-French queries simply due to transliteration differences in the embedding space.

**How to avoid:**
- Do not hardcode the threshold. Make it configurable in the admin dashboard (same pattern as LLM model selection already in v1.1 admin).
- During development, run 20–30 test queries representative of real user intent and measure the precision/recall at threshold values 0.60, 0.70, 0.78, 0.85. Pick the value that balances recall (finding relevant dishes) with precision (not returning everything).
- Add result count logging: if a query returns 0 results above threshold, log the query and the max similarity score found — this gives calibration data.
- Consider a two-stage approach: first try threshold 0.78, if 0 results try 0.60 with a "broader results" indicator.
- The query embedding should include the user's language as context: "je veux des mantı" → embed with a prefix like "dish request: {query}" to improve cross-language recall.

**Warning signs:**
- Threshold hardcoded as a magic number in the search query without comment.
- No A/B testing or calibration data for the chosen threshold.
- Test queries only include the app's primary language (FR) but not cross-language queries (EN user searching for FR-named dishes).

**Phase to address:** Reverse Search phase — threshold must be calibrated against real menu data before shipping. Admin config for threshold should be added alongside model config.

---

### Pitfall 7: Top 3 LLM Call Recommends Dishes Not Present in the Scanned Menu (Hallucination)

**What goes wrong:**
The Top 3 recommendation prompt asks the LLM to suggest the best dishes given user preferences. The LLM confidently recommends "the duck confit" but the current restaurant's menu has no duck confit — the LLM is drawing on its general food knowledge, not the specific parsed dishes. The user asks the waiter for duck confit, who is confused. Trust in the app collapses.

**Why it happens:**
The Top 3 prompt provides user preferences and a description of the restaurant but does not strictly ground the LLM to the exact list of available dishes. The LLM's training on food knowledge overrides the grounding. This is especially likely when the prompt is vague: "recommend good dishes for someone who likes spicy food."

**How to avoid:**
- Always pass the complete list of available dish names (and canonical names) as a numbered list in the Top 3 system prompt. The prompt must explicitly say: "You MUST only recommend dishes from the numbered list below. Do not invent or suggest dishes not in this list."
- Use structured output for Top 3: schema `{ recommendations: [{ dish_index: number, reason: string }] }` — the `dish_index` must be a valid index from the provided list. Validate the index server-side before returning to the client.
- After receiving Top 3 output, always verify each recommended `dish_index` maps to an actual dish in the current menu before rendering. If any index is invalid, discard the recommendation and retry with a more constrained prompt.
- Keep the dish list compact: include only `name_original`, `canonical_name`, `dietary_tags`, and `category`. Do not send full descriptions to the Top 3 prompt — reduces tokens and hallucination surface.

**Warning signs:**
- Top 3 prompt includes "based on typical French cuisine" type phrasing without grounding to the specific menu.
- Top 3 output is a dish name string rather than a structured index reference.
- No server-side validation that returned dish names exist in `menu_items` for the current menu.

**Phase to address:** AI Top 3 phase — grounding strategy and output validation must be in the initial implementation. Never ship without server-side dish-index validation.

---

### Pitfall 8: Top 3 Rate Limiting With Raw IPs Repeats the GDPR Mistake From v1.1 (Already Solved — Must Not Regress)

**What goes wrong:**
The Top 3 rate limit (3 per day per user) was designed in the v1.0 pitfalls research using daily-rotated hashed IPs. When v1.2 is implemented, a developer implements the rate limit table freshly without referencing the v1.1 design, stores raw IP addresses, and re-introduces the GDPR violation that was already identified and solved.

**Why it happens:**
Milestone transitions cause institutional memory loss. The GDPR-safe IP hashing pattern is documented in PITFALLS.md from v1.1 but not in the v1.2 implementation plan. New implementation follows the path of least resistance (raw IP) rather than the established safe pattern.

**How to avoid:**
- Reference v1.1 PITFALLS.md Pitfall 6 explicitly in the v1.2 Top 3 rate limiting implementation plan.
- The rate limit table schema is already designed (daily-rotated SHA-256 hashed IP, pg_cron deletion after 24h). Reuse it exactly — do not create a new table or new pattern.
- If using localStorage UUID as the device fingerprint (more privacy-friendly, already available in the codebase since it's a web app), this is strictly better than IP hashing. Prefer it. The UUID is not personal data under GDPR.

**Warning signs:**
- New `top3_rate_limits` table in a migration that has an `ip_address text` column (not `ip_hash text`).
- Rate limit implementation code contains `request.headers.get('x-forwarded-for')` stored directly.

**Phase to address:** AI Top 3 phase — rate limiting schema review before first migration is applied.

---

### Pitfall 9: Dish Image Licensing Exposes the App to DMCA Takedowns

**What goes wrong:**
Dish images are sourced by searching a canonical dish name (e.g., "Mantı") and using the first Google Images result URL directly in the `<img src>`. This displays third-party copyrighted images without permission. A food photographer or restaurant sends a DMCA takedown. The image URLs also break when the source site removes or moves the image (hotlinking), leaving broken image icons.

**Why it happens:**
"Web search by canonical name" sounds like a simple feature. Developers assume images found via Google/Bing search are free to use because they're publicly accessible. The Bing Image Search API was a common approach but was retired August 11, 2025. SerpAPI is currently under active DMCA litigation with Google (filed December 2025, case ongoing as of February 2026). Using any scraping-based image source carries legal risk.

**How to avoid:**
- Use only licensed image sources:
  - **Wikimedia Commons API** (`https://api.wikimedia.org/core/v1/commons/file/`) — free, properly licensed (CC/PD), searchable by dish name. Best option for well-known dishes. Confidence: HIGH (official Wikimedia API, stable).
  - **Unsplash API** (50 demo req/hr, 5,000 production req/hr after approval) — free license for programmatic use, requires attribution. Confidence: HIGH (official Unsplash API docs).
  - **Pexels API** (200 req/hr, 20,000 req/month) — free license, requires attribution. Confidence: HIGH (official Pexels API docs).
- Store the image URL and attribution metadata (`image_url`, `image_source`, `image_license`) in the `menu_items` table. Do not hotlink — either proxy and store locally, or cache the URL and verify it periodically.
- The v1.1 product rule already specifies "gradient+emoji → web → community" fallback. Stick to this hierarchy. Many Turkish dishes will not have Wikimedia/Unsplash results — gradient+emoji fallback is the correct degradation, not scraping Google.
- Do not use SerpAPI or any SERP scraper for images given the active Google litigation (as of February 2026). This is a rapidly changing legal landscape.

**Warning signs:**
- Image `src` contains `googleusercontent.com`, `bing.com`, or direct restaurant website domains.
- No `image_source` or `image_license` column in the database schema.
- Image search implemented via scraping Google Images with `cheerio` or `playwright`.
- SerpAPI included as a dependency in `package.json`.

**Phase to address:** Dish Images phase — licensing strategy must be decided before any implementation. Wikimedia/Unsplash/Pexels are the only defensible options. Gradient+emoji fallback must always be the final fallback.

---

### Pitfall 10: Enrichment Cache Miss on Re-Parse Discards Previously Enriched Data

**What goes wrong:**
A menu is parsed, enriched, and has embeddings. The cache TTL expires. A user scans the same restaurant again, triggering `getOrParseMenu` cache miss path. The existing pattern (from v1.1 cache.ts) correctly recycles `name_translations` from old items. But enrichment data (`canonical_name`, `cultural_note`, `typical_ingredients`), images, and embeddings are not recycled — they are silently discarded and must be regenerated. This triggers unnecessary enrichment LLM calls and embedding generation for the same dishes.

**Why it happens:**
The v1.1 translation-recycling logic (`translationCache` in `getOrParseMenu`) was designed for translations only. When v1.2 adds enrichment fields, the recycling logic is not extended to include them. The pattern exists but its scope is not expanded.

**How to avoid:**
- Extend the existing `translationCache` pattern in `cache.ts` to also recycle `canonical_name`, `cultural_note`, `typical_ingredients`, `image_url`, `image_source`, `image_license`, and `embedding` from old items — keyed by `name_original` (same key as translation recycling).
- Add `enriched_at` timestamp. If recycled item has `enriched_at` set, skip re-enrichment. Re-enrich only if `name_original` changed significantly (use simple string equality for MVP).
- Log recycled-vs-regenerated enrichment counts in the admin dashboard stats — provides visibility into cache efficiency.

**Warning signs:**
- `getOrParseMenu` deletes old items and re-inserts without checking if enrichment data from old items could be recycled.
- OpenAI usage shows enrichment calls for restaurants that were previously enriched.
- `canonical_name` column is null for all items after a cache TTL expiry + rescan.

**Phase to address:** Dish Enrichment phase — enrichment data recycling must be added to `getOrParseMenu` in `cache.ts` before enrichment is enabled in production. This is a modification to existing working code.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Per-dish enrichment LLM call (not batched) | Simpler prompt engineering | N × LLM calls per scan; 45-dish menu = 45 calls; cost scales linearly with menu size | Never in production — batch all dishes in one call |
| Synchronous enrichment in scan pipeline | No async complexity | 8–10s scan response time; breaks cache-hit performance | Never — enrichment must be async fire-and-forget |
| Hardcoded `match_threshold: 0.78` | Works in demo | Zero-results or over-recall in production with different cuisine mix | MVP only, must be made configurable before beta |
| Using GPT-4o for enrichment | Better canonical names | 8–10x higher cost vs GPT-4o-mini; negligible quality improvement for structured enrichment | Never — GPT-4o-mini is sufficient for enrichment |
| Storing raw image URLs without license tracking | Faster to implement | DMCA risk; broken images when source URL changes | Never — always store `image_source` and `image_license` |
| Not extending translation-recycling to enrichment data | Less code change | Re-enrichment on every cache TTL expiry; unnecessary LLM cost | Never — extend recycling before first production enrichment |
| No `embedding_model` column on embeddings | Simpler schema | Silent search degradation when model changes; full re-embed required with no tracking | Never in production — add model column in initial migration |
| Top 3 prompt without dish-index grounding | Simpler prompt | Hallucinated recommendations from general food knowledge | Never — always ground to numbered dish list with index validation |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| OpenAI Embeddings API | Calling embedding API inside `getOrParseMenu` synchronously | Background task after scan completes; `Promise.all` with retry for batch embedding |
| OpenAI Embeddings API | Switching from `text-embedding-3-small` to `text-embedding-3-large` without re-embedding | Lock embedding model for entire milestone; track model name per row; re-embed migration required before any switch |
| Supabase pgvector | No HNSW index on `embedding` column | Add `CREATE INDEX ON menu_items USING hnsw (embedding vector_cosine_ops)` in initial migration, not as a fix later |
| Supabase pgvector | Using sequential scan (no index) until table is "large enough" | HNSW is safe to create immediately (unlike IVFFlat); create it from day one |
| Supabase pgvector | `match_threshold: 0.78` copied from example without calibration | Calibrate threshold against real data; expose via admin config |
| OpenAI Batch API | Using synchronous API for async enrichment tasks | Batch API offers 50% cost discount for non-time-sensitive enrichment |
| Wikimedia Commons | Searching dish names in English only | Search in multiple languages (English + French + Turkish) for better coverage; use fallback chain |
| Top 3 prompt | Including full dish descriptions in context | Include only `dish_index`, `name_original`, `canonical_name`, `dietary_tags`, `category` — reduces tokens and hallucination surface |
| AI SDK 6 | `generateObject` deprecated — not usable for enrichment schema | Use `generateText + Output.object()` pattern (already established in existing codebase) |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Per-dish enrichment calls (not batched) | Scan latency 30–60s for large menus; LLM cost 45x higher than batched | Batch all dishes in one call with array schema | Immediately with menus > 10 dishes |
| Sequential embedding generation | 200–500ms extra latency per batch of dishes | `Promise.all(dishes.map(...))` with retry wrapper; limit concurrent calls to 10 | At menus > 5 dishes if called synchronously |
| Missing HNSW index on embedding column | Reverse search latency >500ms; full sequential scan in Postgres | Create HNSW index in initial schema migration | At >500 dishes in database (table grows fast with multiple restaurants) |
| HNSW index evicted from memory (Supabase free tier) | First query after inactivity is slow; index loaded from disk | Upgrade compute if index size exceeds available shared_buffers; monitor with `pg_prewarm` | On Supabase free tier with >10k embedding rows |
| Top 3 prompt with full dish text | Token cost 10–20x higher; response latency 5–8s | Minimal dish representation (index + name + tags only) | At menus > 20 dishes with full descriptions |
| Re-enriching on every cache TTL expiry | Enrichment LLM calls fire every 24–48h per restaurant | Recycle enrichment from old items by `name_original` key | Immediately if recycling not implemented before first TTL expiry |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| SERP scraping for dish images (SerpAPI, ScrapingBee) | Active DMCA litigation (Google v. SerpAPI, Dec 2025); cease-and-desist risk | Use Wikimedia Commons, Unsplash, or Pexels APIs only |
| Hotlinking third-party image URLs without caching | Broken images when source removes file; implicit reliance on third-party CDN | Cache image URL + metadata; verify periodically; always have emoji fallback |
| Top 3 output displayed without dish-index validation | Hallucinated dish recommendations for dishes not on menu | Validate `dish_index` server-side against current menu before returning to client |
| Reverse search query embedded client-side and sent to OpenAI | API key exposure if embedding call made from browser | All embedding calls through Next.js API routes (established pattern from v1.1) |
| Enrichment data cached with no model provenance | Silent quality degradation when LLM model changes; wrong canonical names served | Store `enrichment_model` alongside enrichment data; validate on admin model change |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Blank enrichment fields while loading | Users see "loading..." for 5–10s where cultural notes should appear | Show dish card immediately with name/price/allergens; fill enrichment fields progressively as they arrive |
| "0 results" for reverse search without feedback | Users think the app is broken, not that threshold missed | Show "No matches found — try a broader term" with example queries; log for threshold calibration |
| Top 3 confidence shown as absolute (e.g., "Perfect match") | User orders a dish they dislike; feels lied to | Show Top 3 as "Based on your preferences" without certainty language; always allow dismissal |
| Dish image from Unsplash for generic "pasta" shown for a specific Italian regional pasta | Misleading visual; dish looks nothing like the image | Caption images with "Illustrative photo" + license attribution; never imply the image is the exact dish from this restaurant |
| Canonical name shown to user instead of original menu name | Confusion ("I asked for Manti but menu says Mantı") | Canonical name is an internal system concept — surface only `name_original` and translations to users; canonical is for search indexing only |
| Enrichment cultural note in wrong language | French-speaking user sees English cultural context | Enrich cultural notes in all 4 supported languages (FR/EN/TR/DE); add ES/IT as planned for v1.2 |

---

## "Looks Done But Isn't" Checklist

- [ ] **Enrichment async:** Scan of a new restaurant completes in < 5s. Verify that cultural notes appear 3–8s later via polling/SSE — not that they block the initial response.
- [ ] **Enrichment recycling:** Same restaurant scanned twice (TTL reset in between). Verify that `enriched_at` is not null on the second scan for items with matching `name_original` — no enrichment LLM calls should fire.
- [ ] **Canonical name determinism:** Scan "Mantı" menu at two different restaurants. Verify both show "Manti" (or whichever seeded canonical form) — not two different forms.
- [ ] **Embedding model consistency:** Query embedding generated with same model as stored embeddings. Verify by checking `embedding_model` column equals the model in the query path.
- [ ] **HNSW index exists:** Run `EXPLAIN ANALYZE` on a reverse search query. Verify "Index Scan using hnsw" appears, not "Seq Scan".
- [ ] **Top 3 grounding:** Request Top 3 on a menu with 5 dishes. Verify all 3 recommendations correspond to actual `dish_index` values in the current menu — no invented dishes.
- [ ] **Top 3 rate limit:** Uses hashed IP or localStorage UUID (not raw IP). Verify `top3_rate_limits` table stores `ip_hash text` not `ip_address text`.
- [ ] **Dish images licensed:** Image column populated. Verify `image_source` is "wikimedia", "unsplash", or "pexels" — not a Google, Bing, or restaurant domain URL.
- [ ] **Canonical name hidden from UI:** Dish card UI shows `name_original` (and translation). Verify `canonical_name` does not appear in any rendered dish card component.
- [ ] **Threshold logged:** Run a reverse search query that returns 0 results. Verify the max similarity score of non-matching results is logged for calibration data collection.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Enrichment blocking scan pipeline | MEDIUM | Move enrichment call to background job; add `enriched_at` null check; deploy with feature flag; 1 day work |
| Canonical name inconsistency in production | MEDIUM | Build seed table from most common canonical forms; re-enrich affected dishes; normalize existing table in migration; 2–3 days |
| Embedding model switched without re-embedding | HIGH | Stop reverse search feature; background job to re-embed all dishes with new model; update `embedding_model` column; restore search; hours to days depending on database size |
| DMCA takedown for unlicensed dish image | MEDIUM | Emergency: null out `image_url` for affected dishes (gradient+emoji fallback activates); response to DMCA within 72h; switch to Wikimedia/Unsplash for that dish class; 1 day |
| Top 3 recommending non-existent dishes | LOW | Add server-side dish-index validation with immediate deploy; log and discard invalid recommendations; 4 hours work |
| Reverse search returning garbage (threshold wrong) | LOW | Update threshold in admin config (no code deploy needed if made configurable); recalibrate against live data; 1 day |
| Re-enrichment on every cache TTL expiry discovered post-launch | MEDIUM | Add enrichment recycling to `getOrParseMenu`; deploy; existing un-recycled enrichments remain but stop multiplying; 1 day |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Enrichment blocking scan pipeline (P1) | Dish Enrichment — architecture decision | Scan response time < 5s on new restaurant; enrichment arrives asynchronously after |
| Per-dish enrichment cost explosion (P2) | Dish Enrichment — prompt design | One LLM call per menu (not per dish) in OpenAI usage dashboard |
| Canonical name inconsistency for non-Western dishes (P3) | Dish Enrichment — seed table + prompt engineering | Same dish shows same canonical form across 3+ restaurant scans |
| Embedding generation in scan pipeline (P4) | Reverse Search — pipeline architecture | Scan API response does not wait for embeddings; `embedding` column populated 5–30s post-scan |
| Embedding model switch invalidates index (P5) | Reverse Search — schema design | `embedding_model` column exists in initial migration; no model change without re-embed plan |
| Threshold misconfiguration (P6) | Reverse Search — calibration | 20 test queries calibrated; threshold in admin config; zero-result logging active |
| Top 3 hallucination (P7) | AI Top 3 — prompt engineering | 10 manual tests confirm all recommended dishes appear in current menu `menu_items` |
| Top 3 rate limiting GDPR regression (P8) | AI Top 3 — schema design | `top3_rate_limits` migration has `ip_hash` column, not `ip_address` |
| Dish image DMCA exposure (P9) | Dish Images — licensing decision | `image_source` in {wikimedia, unsplash, pexels, null}; no external image domains in database |
| Enrichment discarded on cache TTL expiry (P10) | Dish Enrichment — cache.ts modification | Second scan of expired menu: `enriched_at` not null for known dishes; zero enrichment API calls |

---

## Sources

- [OpenAI GPT-4o-mini Pricing](https://platform.openai.com/docs/models/gpt-4o-mini) — HIGH confidence (official OpenAI docs); $0.15/M input, $0.60/M output tokens
- [OpenAI Batch API — 50% discount for async workloads](https://platform.openai.com/docs/guides/batch) — HIGH confidence (official OpenAI docs)
- [OpenAI Embeddings — text-embedding-3-small pricing](https://platform.openai.com/docs/models/text-embedding-3-small) — HIGH confidence (official OpenAI docs); $0.02/M tokens
- [Supabase pgvector — Semantic Search Documentation](https://supabase.com/docs/guides/ai/semantic-search) — HIGH confidence (official Supabase docs); match_threshold calibration guidance
- [Supabase HNSW Index Documentation](https://supabase.com/docs/guides/ai/vector-indexes/hnsw-indexes) — HIGH confidence (official Supabase docs); HNSW safe to create before table has data, unlike IVFFlat
- [Supabase Going to Production — pgvector](https://supabase.com/docs/guides/ai/going-to-prod) — HIGH confidence (official Supabase docs); memory as primary bottleneck
- [OWASP LLM Top 10 2025 — Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) — HIGH confidence (official OWASP)
- [Google v. SerpAPI DMCA Lawsuit](https://ipwatchdog.com/2025/12/26/google-sues-serpapi-parasitic-scraping-circumvention-protection-measures/) — HIGH confidence (court filing, December 2025)
- [SerpAPI Motion to Dismiss (February 2026)](https://searchengineland.com/serpapi-motion-dismiss-google-scraping-lawsuit-469889) — HIGH confidence (case ongoing as of research date)
- [Bing Search APIs Retirement — August 11, 2025](https://learn.microsoft.com/en-us/lifecycle/announcements/bing-search-api-retirement) — HIGH confidence (official Microsoft announcement)
- [Wikimedia Commons API](https://commons.wikimedia.org/wiki/Commons:API) — HIGH confidence (official Wikimedia)
- [Unsplash API Guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines) — HIGH confidence (official Unsplash); 50 demo / 5,000 production req/hr
- [Pexels API Documentation](https://www.pexels.com/api/documentation/) — HIGH confidence (official Pexels); 200 req/hr, 20,000 req/month
- [DoorDash LLMs for food canonicalization — engineering blog](https://careersatdoordash.com/blog/doordash-llms-for-grocery-preferences-from-restaurant-orders/) — MEDIUM confidence (engineering post-mortem on food tag canonicalization inconsistency)
- [LLM Content Normalization pitfalls — LinkedIn/ScrapingAnt](https://scrapingant.com/blog/llm-powered-data-normalization-cleaning-scraped-data) — MEDIUM confidence (practitioner article, corroborates LLM variability on non-standard names)
- [Optimizing pgvector at Scale — Medium](https://medium.com/@dikhyantkrishnadalai/optimizing-vector-search-at-scale-lessons-from-pgvector-supabase-performance-tuning-ce4ada4ba2ed) — MEDIUM confidence (practitioner post, consistent with official Supabase docs)
- [Microsoft AI Recommendation Poisoning Research — February 2026](https://www.microsoft.com/en-us/security/blog/2026/02/10/manipulating-ai-memory-for-profit-the-rise-of-ai-recommendation-poisoning/) — MEDIUM confidence (recent Microsoft Security research on RAG poisoning patterns)

---
*Pitfalls research for: NOM v1.2 — dish enrichment, canonical names, reverse semantic search, AI Top 3 recommendations, and dish images added to existing Next.js 16 + Supabase + OpenAI menu scanning app*
*Researched: 2026-02-28*
