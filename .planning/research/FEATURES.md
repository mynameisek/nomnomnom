# Feature Research

**Domain:** Culinary knowledge enrichment — dish cultural context, canonical naming, reverse search, AI Top 3 recommendation
**Researched:** 2026-02-28
**Confidence:** HIGH on enrichment patterns and Top 3 UX (corroborated by Swiggy, Zomato, TasteAtlas, Beli); MEDIUM on canonical naming implementation (academic evidence strong, production pattern inferred); HIGH on reverse search with pgvector (Supabase official docs + Swiggy production data); MEDIUM on image strategy (Unsplash/Pexels API verified, dish-specific lookup patterns inferred)

---

> **Scope note:** This file covers ONLY the v1.2 milestone features. The foundation (scan methods, dish cards, translation FR/EN/TR/DE, allergen filters, Google Places enrichment, URL hash caching) is already shipped as v1.1. Every feature below assumes those are in place and stable.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that users of any food enrichment or culinary discovery app assume exist. These are non-negotiable for v1.2 to feel complete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Cultural explanation per dish | 76% of consumers say detailed menu descriptions build confidence with unfamiliar dishes (Datassential 2025). A tourist scanning a Turkish menu with only translated names gets zero context on what mantı actually is | MEDIUM | 3–5 sentences max: origin, cooking method, typical taste, how it is eaten. Swiggy confirmed this pattern in production with a configuration module providing taxonomy + example descriptions. Avoid culinary Wikipedia walls of text — write for a hungry tourist, not a food scholar |
| Ingredient summary (typical ingredients) | Any food-allergic user or dietary restriction user expects to see what goes into a dish. Allergen tags alone are insufficient — intolerances extend beyond the EU 14 | MEDIUM | 4–8 key ingredients as a flat list. Not a recipe. "Lamb mince, onion, thin pasta, yogurt, tomato sauce" is enough. This complements allergen tags, not replaces them |
| Dish origin / cuisine type label | Users use origin to anchor unfamiliar dishes: "Oh, this is Anatolian" gives more context than any description. Every competitor (TasteAtlas, Beli, Zomato) shows this | LOW | Single string: cuisine region, not country (prefer "Anatolian" over "Turkish" for specificity). Stored as part of enrichment object |
| Visual representation per dish (image or fallback) | Dish cards without images feel like a spreadsheet. Competitors universally use images. Per product Rule 5: gradient+emoji is the defined fallback — this is already partially solved | MEDIUM | Priority: (1) web image found by canonical name via Unsplash/Pexels API, (2) Google image search via Custom Search API, (3) gradient+emoji generated from dish emoji + dominant color. Never AI-generated photorealistic images — they mislead at the table |
| "How to eat this" field | Particularly valuable for the tourist and expat user journeys. Mantı with yogurt poured on top is not obvious. Döner eaten with a fork versus hands differs by country | LOW | 1–2 sentences. Only populated for dishes where eating method is non-obvious. Empty field is better than a generic filler |
| Enrichment shown inline on dish card (no extra tap) | Users expect enrichment to be accessible without a modal or navigation. TasteAtlas and Zomato both use inline expand patterns — not deep-link pages | LOW | Accordion/expand below existing dish card content. Tap the card to expand. No navigation away from the menu view |

### Differentiators (Competitive Advantage)

Features that no current competitor in NŌM's space (menu scanning apps) offers. These are where v1.2 wins.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Canonical dish name normalization | "Mantı" on one menu, "Manti" on another, "Turkish dumplings" on a third — these are the same dish. Canonical naming is what enables reverse search and cross-restaurant matching. No menu scanning app does this today | HIGH | The canonical name is a separate field from the menu display name. Store: `{ menu_name: "Mantı", canonical_name: "manti", canonical_display: "Mantı (Turkish Dumplings)", variants: ["manti", "manti soup", "mantı", "turkish dumplings"] }`. Canonical names are lowercase, Latin-script, no diacritics for matching. Display form retains diacritics and capitalization |
| Reverse search by dish intent ("je veux des mantı") | Users scan menus before arriving at a restaurant AND when they already know what they want. "I want something like pho" across all scanned restaurants is a zero-competitor feature | HIGH | Two-tier: (1) Client-side tag + canonical name fuzzy match for exact/near-exact dish searches, (2) pgvector semantic similarity on dish descriptions + canonical names for intent queries ("something light and filling"). Supabase has native pgvector — no extra service needed. Use `text-embedding-3-small` (OpenAI) — strong multilingual performance, 44% MIRACL score, cost-effective at $0.02/1M tokens |
| AI Top 3 with explicit criteria (correspondence, diversity, clarity) | Every food app says "AI recommendations". None explain the logic. NŌM's Top 3 exposes three distinct criteria per selection. This transforms a magic-box recommendation into a trustworthy advisor | HIGH | One GPT-4 call per Top 3 request. Input: full parsed dish list + user dietary filters + any active allergen exclusions. Output: 3 dish objects, each with `match_reason` (why it fits constraints), `diversity_note` (what experience it offers that differs from the other 2), `clarity_score` (confidence in description quality). Rate limit: 3/day free, paywall after |
| Culinary knowledge graph growing with each scan | Each new scan of a restaurant enriches the canonical dish database. A dish scanned in Strasbourg's Turkish quarter builds the knowledge base that helps the next user recognize the same dish in Istanbul. Long-term moat | HIGH | The `canonical_dishes` table is the growing asset. Every new scan: (1) parse dishes, (2) look up canonical name match, (3) if no match found → generate enrichment via LLM → store as new canonical record, (4) if match found → link menu dish to canonical record. Cost: enrichment LLM call fires only once per canonical dish, never again |
| Trust badge hierarchy extended to enrichment | v1.1 has "Menu" vs "Inferred". v1.2 adds "Community" — when enrichment has been validated by multiple scans of the same canonical dish. This is the third badge from product Rule 2 | LOW | Simple counter: `enrichment_source: "llm_generated" \| "multi_scan_confirmed"`. Display as ✅ Menu / ⚠ Inferred / 👥 Communauté. Threshold: 3+ independent scans of same canonical dish = Community badge |
| ES/IT translation parity | Per product Rule 6: FR/EN interface, TR/DE/ES/IT for dish translation. ES and IT complete the Strasbourg test market (Italian restaurants are common, Spanish-speaking expat population exists) | LOW | The translation cascade is already built (DeepL → Google → Azure → MyMemory → LLM fallback). ES and IT are added as target languages in the same pipeline. No new infrastructure — just additional language codes |

### Anti-Features (Commonly Requested, Often Problematic)

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| Full culinary encyclopedia per dish | "Give users everything about mantı" — origin story, regional variants, famous restaurants, Wikipedia-style article | Kills the mobile-first experience. Users at a restaurant table have 10 seconds of attention. A 500-word article is an anti-pattern. TasteAtlas works because it is a dedicated discovery tool, not an in-meal tool | 3–5 sentence enrichment maximum. Hardcode a character limit in the LLM prompt. Link to TasteAtlas for users who want depth |
| AI-generated photorealistic dish images as fallback | "Every dish should look perfect" — DALL-E 3 or Stable Diffusion for dishes without a real photo | AI food images show idealized presentations. The actual dish at the table will look different. Creates trust breakdown when the real dish arrives. Yelp's Menu Vision showed that real photos (even imperfect) convert better than AI renders | gradient+emoji fallback per product Rule 5. Signal "Illustrative" clearly on any image not sourced from the restaurant or verified web source |
| Nutrition data (calories, macros) per dish | Health-conscious users explicitly ask for this | Restaurant dishes vary wildly in portion size and preparation. Any calorie estimate is unreliable. For celiac or serious medical diets this is dangerous. Yazio and MyFitnessPal own this space with proper databases | The allergen + ingredient list covers the safety use case. Explicitly document that NŌM does not provide calorie estimates |
| User-submitted dish enrichment corrections | "Crowdsource the knowledge base quality" | Moderation overhead at v1.2 scale is unjustifiable. Bad actors can poison canonical dish data and break reverse search. Trust badge system collapses if unreviewed community edits mix with AI-generated data | "Flag as incorrect" button only. Flagged items get reviewed before any change. Community badge earns trust through volume of independent scans, not through free-form edits |
| Reverse search as a standalone page with infinite scroll | "Build a food discovery feed" | Violates product Rule 8: scan = home, never feed. A discovery feed is a different product (Beli, Zomato). Building it now creates navigation architecture decisions that will need to be undone | Reverse search is a modal or bottom sheet overlay on the current scan view. No navigation. Returns matches from previously scanned menus only — not a global discovery engine yet |
| Real-time enrichment on every dish at scan time | "All dishes should be fully enriched immediately" | A typical scanned menu has 30–80 dishes. Enriching all of them synchronously at scan time means 30–80 sequential LLM calls = 15–40 seconds load time + $0.30–$1.00 per scan. Unacceptable | Lazy enrichment: render dish cards immediately with what is parsed (name, description, tags). Enrich on-demand when user taps "learn more" on a specific dish. Cache enrichment permanently in `canonical_dishes` table |
| Cross-restaurant "best mantı in Strasbourg" ranking | "Use the data you're building to rank restaurants" | Ranking requires statistical significance (multiple scans per restaurant), freshness validation (menus change), and user rating data NŌM does not yet have. Publishing bad rankings destroys trust faster than having no rankings | Build the data first. Rankings emerge from the knowledge graph in v2+ after sufficient scan volume. Reverse search shows "where you can get X" without implying a quality ranking |

---

## Feature Dependencies

```
[v1.1 Dish Card]
    └──already has──> [name, description, allergens, dietary tags, translations]
    └──feeds──> [Dish Enrichment]
    └──feeds──> [Canonical Name Lookup]

[Dish Enrichment]
    └──requires──> [Canonical Name] (enrichment is keyed to canonical dish, not menu name)
    └──requires──> [LLM call (GPT-4o-mini)] (fires once per canonical dish, cached forever)
    └──outputs──> [cultural_explanation, origin, typical_ingredients, how_to_eat]
    └──stored_in──> [canonical_dishes table in Supabase]
    └──enhances──> [Dish Card] (accordion expansion on tap)

[Canonical Name]
    └──requires──> [Parsed dish name + description from v1.1 pipeline]
    └──requires──> [LLM normalization call OR fuzzy match against existing canonical_dishes]
    └──outputs──> [canonical_key (lowercase, no-diacritic), display_name, variant_aliases]
    └──enables──> [Cross-restaurant matching]
    └──enables──> [Reverse Search]
    └──enables──> [Knowledge Graph enrichment]

[Reverse Search]
    └──requires──> [canonical_dishes table populated] (search has nothing to find without it)
    └──requires──> [pgvector extension on Supabase] (for semantic mode)
    └──requires──> [Embeddings generated per canonical dish] (text-embedding-3-small)
    └──two modes──>
        [Mode 1: Fuzzy text match]
            └──requires──> [canonical_key + variant_aliases fields]
            └──no extra cost, fast, client-compatible]
        [Mode 2: Semantic similarity]
            └──requires──> [pgvector + stored embeddings]
            └──requires──> [embedding generated at query time]
            └──covers "I want something light and spicy" type queries]

[AI Top 3]
    └──requires──> [Full dish list from current scanned menu] (must be on same scan context)
    └──requires──> [User dietary filters + allergen exclusions from v1.1]
    └──enhanced_by──> [Dish Enrichment] (better context = better Top 3 rationale)
    └──enhanced_by──> [Canonical Name] (deduplication — same dish appearing twice is one choice)
    └──requires──> [Daily rate limit counter (3x/day free)] (session-based, no account)
    └──outputs──> [3 dish picks + match_reason + diversity_note + clarity_score]

[Dish Image]
    └──requires──> [Canonical Name] (image lookup is by canonical name, not raw menu text)
    └──lookup_chain──>
        [1. Unsplash API query by canonical name] → if result → store URL + attribution
        [2. Pexels API query] → if result → store URL + attribution
        [3. gradient+emoji fallback] → always available, no external call
    └──cached_in──> [canonical_dishes.image_url + image_source fields]
    └──never──> [AI-generated photorealistic images as fallback]

[ES/IT Translation]
    └──requires──> [Existing translation cascade from v1.1] (DeepL → Google → LLM fallback)
    └──just adds──> ['es', 'it'] to the target language array
    └──no new infrastructure]

[Trust Badge: Community]
    └──requires──> [Canonical Name] (badge is per canonical dish, not per menu entry)
    └──requires──> [scan_count field on canonical_dishes] (incremented each time dish is matched)
    └──threshold──> [3+ independent scans → "Communauté" badge]
    └──extends──> [v1.1 trust badge system (Menu / Inféré)]
```

### Dependency Notes

- **Canonical Name is the architectural keystone of v1.2.** Every other feature — enrichment, reverse search, image lookup, community badge, cross-restaurant matching — depends on it. Build canonical naming first, before any other v1.2 feature.

- **Enrichment is lazy by design.** Generating enrichment for all 30–80 dishes at scan time would cost $0.30–$1.00 per scan in LLM calls. The correct pattern is: generate enrichment once when a user first taps "learn more" on a dish, store it permanently in `canonical_dishes`, serve from cache forever after. Cost amortizes to zero quickly.

- **Reverse search has two tiers with different unlock conditions.** Tier 1 (fuzzy text match on canonical keys) requires only the `canonical_dishes` table. Tier 2 (semantic similarity via pgvector) requires stored embeddings — an additional async job that can run after canonical records are created. Build Tier 1 first, add Tier 2 when the dish database has enough records to make semantic search meaningful.

- **Top 3 is enhanced by enrichment but does not require it.** The v1.1 dish card data (name, description, tags) is sufficient for Top 3 to work. Enrichment improves the quality of rationale strings but is not a blocker.

- **ES/IT translation is independent.** It does not depend on any of the above. It can be built in parallel or added as a fast win before the enrichment pipeline is complete.

---

## MVP Definition

### Launch With (v1.2.0)

The minimum that makes this milestone meaningful. Users should be able to tap a dish and get cultural context, and be able to ask "where can I get X" across their scan history.

- [ ] Canonical name normalization — run on every dish at parse time, store in `canonical_dishes` — the foundation everything else requires
- [ ] Dish enrichment on-demand — tap to expand cultural explanation, origin, ingredients, how to eat — lazy loading, LLM call only on first view, cached forever
- [ ] Dish image lookup by canonical name — Unsplash → Pexels → gradient+emoji fallback, attribution shown, cached in canonical record
- [ ] AI Top 3 recommendations — GPT-4 call with full menu + dietary filters + diversity/clarity criteria, 3x/day free rate gate
- [ ] Top 3 rationale display — show `match_reason` + `diversity_note` per recommendation, not just the dish name
- [ ] ES/IT translation support — add both languages to the existing translation cascade
- [ ] Community trust badge trigger — increment scan count per canonical dish, show 👥 badge at 3+ scans

### Add After Validation (v1.2.x)

Add when the canonical dish table has 50+ records and the basic enrichment flow is stable.

- [ ] Reverse search Tier 1 (fuzzy match on canonical keys + aliases) — text input → matching dishes across scanned menus
- [ ] Reverse search Tier 2 (pgvector semantic similarity) — activate when 100+ canonical dish embeddings are stored
- [ ] Reverse search UI — bottom sheet, not a page; returns cards from existing scan history

### Future Consideration (v2+)

Defer until product-market fit confirmed and scan volume is meaningful.

- [ ] "Find this dish near me" — reverse search → map view of restaurants — requires accounts + location permission
- [ ] Cross-restaurant "serving X today" — real-time menu validity is unverifiable without restaurant partnerships
- [ ] Bulk enrichment backfill — retroactively enrich all cached menus — worth doing at 500+ canonical dishes, not before
- [ ] API/RAG endpoint for canonical dish knowledge — explicitly in product vision as Phase 4; requires stable and large enough knowledge base

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Canonical name normalization | HIGH — unlocks everything else | MEDIUM — LLM call + Supabase table | P1 |
| Dish enrichment (cultural, ingredients, how-to-eat) | HIGH — core of this milestone | MEDIUM — lazy LLM + cache pattern | P1 |
| AI Top 3 with criteria rationale | HIGH — primary differentiator | MEDIUM — one GPT-4 call + rate limit | P1 |
| Dish images (web lookup + emoji fallback) | HIGH — cards feel incomplete without | MEDIUM — 2 API calls + fallback | P1 |
| ES/IT translation | MEDIUM — market coverage | LOW — existing pipeline, new language codes | P1 |
| Community trust badge (scan count) | MEDIUM — trust + social proof | LOW — counter increment + badge display | P1 |
| Top 3 rationale display (match/diversity/clarity) | HIGH — differentiates from magic-box AI | LOW — prompt output + render | P1 |
| Reverse search Tier 1 (fuzzy canonical match) | HIGH — unique cross-restaurant feature | MEDIUM — requires canonical table built | P2 |
| Reverse search Tier 2 (pgvector semantic) | HIGH — covers intent queries | HIGH — embeddings + pgvector index | P2 |
| Reverse search UI (bottom sheet) | MEDIUM — UX for the above | LOW — no new data work | P2 |

**Priority key:**
- P1: Must ship for v1.2.0 milestone to be complete
- P2: Add when canonical dish table has 50+ records
- P3: Future milestone

---

## Competitor Feature Analysis

| Feature | TasteAtlas | Beli | Zomato/Swiggy | Yelp Menu Vision | NŌM v1.2 (planned) |
|---------|-----------|------|---------------|-----------------|---------------------|
| Cultural dish explanation | Yes — deep editorial content | No | Basic LLM-generated descriptions | No | Yes — 3–5 sentence scan-contextual enrichment |
| Ingredient listing | Yes | No | Partial (structured menus only) | No | Yes — typical ingredients, complementing allergen tags |
| Dish origin label | Yes — map-centric | No | Cuisine type label | No | Yes — cuisine region string |
| Canonical dish naming | Yes — editorial-curated 19K+ dishes | No | No | No | Yes — LLM-generated, auto-growing with each scan |
| Reverse search (dish → restaurant) | No | No | "Search by dish" in Swiggy (city-level) | No | Yes — within scanned menus, semantic mode via pgvector |
| AI recommendation Top 3 | No | No | Swiggy: personalized suggestions | No | Yes — with explicit criteria: correspondence + diversity + clarity |
| Cross-restaurant dish matching | No | No | Partial (same dish, same platform) | No | Yes — via canonical name key |
| Dish images | Yes — editorial | User-submitted photos | Crowdsourced + scraping | Real menu photos | Web lookup by canonical name + emoji fallback |
| Scan-to-enrichment flow | No — browse-only tool | No | No — delivery-first | No | Yes — enrichment is triggered by scan, not standalone |
| No account required | No | No | Delivery requires account | Yelp login preferred | Yes — session-based, no friction |

**Takeaway:** TasteAtlas has the deepest culinary knowledge base but is a browse-first tool with no scan integration. Swiggy has production-scale dish enrichment and semantic search (50M dishes) but is delivery-centric and requires an account. Beli is dish-centric but relies entirely on user-submitted content. No competitor combines scan → canonical naming → enrichment → reverse search in a single no-account-required mobile flow. NŌM's v1.2 does.

---

## User Journey Alignment

### Tourist lost in Istanbul (or Strasbourg Turkish quarter)
**Before v1.2:** Scans menu, gets translated dish names with allergen tags. Names like "Beyran çorbası" are translated but unexplained.
**After v1.2:** Taps dish card → sees "Slow-cooked lamb soup from Gaziantep, garnished with spiced butter and served with flatbread. Eaten hot, traditionally for breakfast." Dish origin: "Southeastern Anatolian". Image from Unsplash.

### Celiac traveler
**Before v1.2:** Allergen filter removes gluten dishes. What remains still lacks context.
**After v1.2:** Top 3 with allergen exclusion active → 3 safe dishes + rationale "Matches gluten-free filter. High diversity: this is the only fish option on this menu. Clear description: ingredients well-listed."

### Expat nostalgic for home cuisine
**Before v1.2:** Scans a new menu, has no way to find "what they had last time" across restaurants.
**After v1.2:** Reverse search — types "mantı" — sees every restaurant in their scan history that served it, with canonical matching handling spelling variants.

### Foodie building a culinary vocabulary
**Before v1.2:** Gets translated dish names. Learns nothing about what makes the cuisine distinctive.
**After v1.2:** Cultural explanation per dish builds genuine knowledge. Top 3 with diversity criteria ensures they try different culinary experiences, not just the safest-sounding items.

---

## Implementation Patterns (Recommended Approaches)

### Canonical Name Generation
**Pattern:** On dish parse, send batch of dish names + descriptions to GPT-4o-mini with prompt: "For each dish, return: (1) canonical_key (lowercase, Latin script, no diacritics, no spaces — use hyphens), (2) canonical_display (proper name with diacritics), (3) cuisine_region. Match against these existing canonical keys if similar: [top 20 most common from DB]. Return JSON array." This batches the normalization cost across all dishes in one call.

**Do not:** Build a custom NLP pipeline or use an external dish ontology (FoodOn, FOODS). The LLM handles linguistic normalization better than rule-based systems for the multilingual Strasbourg use case. Academic ontologies are built for nutrition science, not for Turkish/French/German restaurant menus.

### Lazy Enrichment with Permanent Cache
**Pattern:** Dish card renders immediately at scan time with what v1.1 already produces. When user taps a dish:
1. Check `canonical_dishes` table for `enrichment` JSONB field — if populated, render immediately.
2. If null: call GPT-4o-mini with canonical dish name + cuisine region → generate enrichment → store in `canonical_dishes.enrichment` → render.

Once stored, this canonical record is served to every future user who sees this dish on any scanned menu. Cost: one LLM call per unique canonical dish, ever.

### Reverse Search with pgvector
**Pattern:** At canonical dish creation time, run `text-embedding-3-small` on the canonical display name + cuisine region + first sentence of enrichment → store as `embedding vector(1536)` in `canonical_dishes`. Query: user types search term → embed it → `SELECT * FROM canonical_dishes ORDER BY embedding <=> $1 LIMIT 10`. Supabase has native pgvector — no extra service, no Pinecone.

**Why text-embedding-3-small:** 44% multilingual MIRACL benchmark (40% improvement over ada-002). Cross-language search works — user types "mantı" in French context, finds dishes even if stored with Turkish canonical name. Cost: $0.02/1M tokens — effectively free at NŌM scale.

### Top 3 Rate Limiting Without Accounts
**Pattern:** Store usage count in `localStorage` with daily reset key `top3_date` + `top3_count`. Gate at 3. On cap: show paywall with "Upgrade for unlimited Top 3" message. No server-side enforcement needed at v1.2 scale — device fingerprinting adds complexity without meaningful abuse protection at this user count. Server-side rate limiting can be added in v2 when account system exists.

**Why this works:** Product Rule 7 — paywall on costly operations, not on the wow moment. The "wow moment" IS the Top 3. The paywall hits after the user has seen value 3 times in a day, not before.

### Image Lookup Strategy
**Pattern:**
1. Query Unsplash API with `canonical_key` as search term. If result with relevance score > threshold: store URL + photographer attribution in `canonical_dishes.image_url`.
2. If no Unsplash result: query Pexels API same way.
3. If neither: store `null` for `image_url`, render gradient+emoji fallback per product Rule 5.

**Attribution requirement:** Both Unsplash and Pexels APIs require attribution display. Show photographer name as small caption on dish card image. Non-negotiable per their terms of service.

**Never:** Use Google Image Search scraping — ToS violation with real legal risk. Never DALL-E 3 as a fallback — misleading at the restaurant table.

---

## Sources

- [Datassential: Global Flavors Redefining Restaurant Trends 2025](https://datassential.com/resource/global-flavors-restaurants-growth-2025/) — consumer expectation for detailed menu descriptions (MEDIUM confidence)
- [Swiggy: Building Comprehensive LLM Platform for Food Delivery](https://www.zenml.io/llmops-database/building-a-comprehensive-llm-platform-for-food-delivery-services) — production pattern for dish description enrichment with taxonomy (HIGH confidence)
- [Swiggy: Neural Search and Conversational AI for Food Discovery](https://www.zenml.io/llmops-database/neural-search-and-conversational-ai-for-food-delivery-and-restaurant-discovery) — semantic search architecture at scale (HIGH confidence)
- [Swiggy Bytes: Semantic Embeddings for Food Search Using Siamese Networks](https://bytes.swiggy.com/find-my-food-semantic-embeddings-for-food-search-using-siamese-networks-abb55be0b639) — embedding-based food search production data (HIGH confidence)
- [TasteAtlas — World Food Atlas](https://www.tasteatlas.com/) — 19K+ dish knowledge base, canonical dish reference model (HIGH confidence, product analysis)
- [Supabase pgvector Docs](https://supabase.com/docs/guides/database/extensions/pgvector) — native vector search in Postgres (HIGH confidence, official docs)
- [Supabase Semantic Search Guide](https://supabase.com/docs/guides/ai/semantic-search) — implementation pattern for semantic dish search (HIGH confidence, official docs)
- [OpenAI text-embedding-3-small](https://platform.openai.com/docs/models/text-embedding-3-small) — multilingual capability + cost ($0.02/1M tokens) (HIGH confidence, official docs)
- [Pinecone: OpenAI Embeddings v3](https://www.pinecone.io/learn/openai-embeddings-v3/) — MIRACL multilingual benchmark data (MEDIUM confidence)
- [FoodKG: Semantics-Driven Knowledge Graph for Food Recommendation](https://www.researchgate.net/publication/336599164_FoodKG_A_Semantics-Driven_Knowledge_Graph_for_Food_Recommendation) — food knowledge graph normalization challenges (MEDIUM confidence, academic)
- [Applications of Knowledge Graphs for Food Science — ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2666389922000691) — canonical naming challenges across languages (MEDIUM confidence, academic)
- [Unsplash API Docs](https://unsplash.com/developers) — free image API, attribution requirements (HIGH confidence, official)
- [Pexels API Docs](https://www.pexels.com/api/) — free image API, attribution requirements (HIGH confidence, official)
- [Kinde: Freemium to Premium Billing Triggers](https://www.kinde.com/learn/billing/conversions/freemium-to-premium-converting-free-ai-tool-users-with-smart-billing-triggers/) — metered paywall UX patterns, 3x/day gate analysis (MEDIUM confidence)
- [AI-Powered Dining: Text Extraction and ML for Menu Recommendations — ResearchGate](https://www.researchgate.net/publication/383505496_AI-powered_dining_text_information_extraction_and_machine_learning_for_personalized_menu_recommendations_and_food_allergy_management) — allergen + recommendation intersection (MEDIUM confidence, academic)

---

*Feature research for: NŌM v1.2 — dish enrichment, canonical naming, reverse search, AI Top 3*
*Researched: 2026-02-28*
*Milestone: Dish Enrichment (adding to v1.1 scan + dish card foundation)*
