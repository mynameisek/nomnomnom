# Phase 12: Dish Images - Research

**Researched:** 2026-02-28
**Domain:** Stock photo API integration (Unsplash REST + Pexels), Next.js Image component, blur-up loading, cuisine-based gradient fallback
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 3 levels of dish card detail: basic (text), detail (image + enrichment), advanced (full deep-dive in sheet)
- Image display on DishCard: aspect ratio user leans square (1:1) — blur-up loading transition (blurry placeholder sharpens into real image)
- Tapping the image opens the DishDetailSheet (same as tapping card — no separate full-screen image viewer)
- Photo credit shown in DishDetailSheet only — cards stay clean, no overlay or inline credit
- Gradient color palette: cuisine-based — warm tones for Turkish, greens for Vietnamese, etc.
- Image source (Unsplash → Pexels → gradient+emoji): no AI-generated, no SerpAPI
- Initiate Unsplash production approval application at Phase 12 start (50 req/hr demo vs 5,000 req/hr production)
- Enrichment is always async via after() — never synchronous
- Shared image per canonical name for identical dishes; distinct images for dish variants
- Beverages: already marked 'skipped' in enrichDishBatch — this decision carries into image fetch

### Claude's Discretion
- Exact progressive disclosure pattern for images across the 3 detail levels
- Image aspect ratio (leaning square/1:1)
- Attribution format and source badge per API terms
- Fallback emoji strategy and visual distinctness
- Search query construction
- Fetch timing strategy (lazy vs eager — cost-conscious)
- Result selection heuristic
- Beverage image treatment

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ENRI-05 | Each enriched dish displays an image (Unsplash → Pexels → gradient+emoji fallback, never AI-generated) | Unsplash REST API (search + hotlink), Pexels REST API (search + hotlink), DB columns for image_url/image_credit/image_source, blur-up via blurhash/blurDataURL, cuisine-based gradient fallback with emoji |
</phase_requirements>

---

## Summary

Phase 12 adds stock photos to enriched dish cards using the Unsplash REST API (primary) with Pexels as fallback, and a cuisine-based gradient+emoji when neither service finds a result. The image fetch pipeline follows the same fire-and-forget `after()` pattern already established in Phases 10–11: a new `fetchDishImages(menuId)` function runs after `enrichDishBatch` completes, writes three new columns to `menu_items` (`image_url`, `image_credit`, `image_source`), and the UI picks them up via the existing enrichment polling loop.

The primary technical challenges are: (1) the Unsplash attribution obligation to hotlink URLs and display photographer credit in the DishDetailSheet, (2) converting the `blur_hash` field from Unsplash's response into a `blurDataURL` compatible with `next/image` without a canvas dependency, (3) building the `next.config.ts` `remotePatterns` to allow both `images.unsplash.com` and `images.pexels.com`, and (4) designing the three-level card visual — the current DishCard shows text-only states; we need to introduce an image zone for the "detail" level (full enrichment depth) while keeping the basic level text-only.

Fetch timing is the cost-sensitivity crux: the user wants eventual full coverage but not wasted API calls. The recommended strategy is **eager fetch after enrichment completes for full-depth dishes only** — since beverages are already skipped and minimal-depth dishes are typically French/familiar dishes (lower value from a photo), we fetch images for `enrichment_depth = 'full'` dishes immediately, and fetch `minimal` depth images in a second pass only when the user opens the DishDetailSheet (lazy on-demand). This balances cost and coverage.

**Primary recommendation:** Build `fetchDishImages(menuId)` as a fire-and-forget server function (same pattern as `enrichDishBatch`), called via `after()` chained after `enrichDishBatch`. Store `image_url`, `image_blur_hash`, `image_credit`, `image_source` on `menu_items`. Use blurhash-to-base64 conversion (no canvas) for the blur-up placeholder. Display credit in DishDetailSheet only.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next/image` (built-in) | Next.js 16.1.6 | Image rendering with blur-up, srcset, lazy load | Already in project — zero install cost, handles optimization and CLS prevention |
| Unsplash REST API | v1 | Primary stock photo source | Locked by prior decisions; highest quality food photos; hotlink required |
| Pexels REST API | v1 | Fallback stock photo source | Locked by prior decisions; 200 req/hr free; simpler attribution |
| `blurhash` | ^2.0.5 | Decode Unsplash `blur_hash` string to pixel data | Industry-standard; Wolt's original library; <2KB gzip |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (no additional installs needed) | — | Pexels `avg_color` used as single-pixel base64 placeholder | Use `avg_color` (hex string) as a tiny 1×1 solid-color blurDataURL for Pexels — no library needed |

**Installation:**
```bash
npm install blurhash
```

> Note: `unsplash-js` is archived — do NOT install it. Use plain `fetch()` against `https://api.unsplash.com` directly. The project already uses plain `fetch` elsewhere.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `blurhash` npm package | `plaiceholder` | plaiceholder requires sharp (binary dep, large); blurhash is pure JS, smaller, server-safe |
| Storing `image_url` in DB | Fetching at render time | DB storage prevents re-fetching on every page load; required for rate limit conservation |
| Per-dish image fetch | Batch search per menu | No Unsplash batch endpoint exists; must be per-dish sequential with delays to respect 50 req/hr demo limit |

---

## Architecture Patterns

### Recommended Project Structure

New files for Phase 12:

```
lib/
├── images.ts              # fetchDishImages() — fire-and-forget, server-only
lib/types/
├── menu.ts                # Add image fields to MenuItem interface
supabase/migrations/
├── 202602XXXXXX_dish_images.sql  # 4 new columns on menu_items
components/menu/
├── DishCard.tsx            # Add image zone for full-depth level
├── DishDetailSheet.tsx     # Add image display + attribution
├── DishImage.tsx           # New: image/fallback rendering component
hooks/
├── useEnrichmentPolling.ts # Update to also pull image fields
app/api/enrichment/
├── status/route.ts         # Update SELECT to include image fields
```

No new API routes needed — image fetch is fully fire-and-forget from the scan pipeline. No new polling endpoint needed — image fields added to the existing enrichment status response.

### Pattern 1: Fire-and-forget Image Fetch (chained after enrichDishBatch)

**What:** `fetchDishImages(menuId)` runs inside `after()` in scan route, after `enrichDishBatch` completes. Queries for `enriched` food items with no `image_url`, fetches Unsplash/Pexels per dish, upserts results.

**When to use:** Always for `enrichment_depth = 'full'` dishes. For `minimal` depth: skip in the initial pipeline pass; handle lazily when DishDetailSheet opens (or just skip entirely — the sheet shows less content for minimal dishes anyway).

**Example (scan route pattern — already proven):**
```typescript
// Source: app/api/scan/url/route.ts (existing pattern)
after(async () => {
  await generateCanonicalNames(menu.id);
  await enrichDishBatch(menu.id);
  await fetchDishImages(menu.id);  // ← Phase 12 addition
});
```

```typescript
// Source: lib/images.ts (new file, mirrors lib/enrichment.ts pattern)
import 'server-only';
import { supabaseAdmin } from './supabase-admin';

export async function fetchDishImages(menuId: string): Promise<void> {
  try {
    // Fetch full-depth enriched dishes with no image yet
    const { data: items } = await supabaseAdmin
      .from('menu_items')
      .select('id, canonical_name, name_original, enrichment_origin, enrichment_depth')
      .eq('menu_id', menuId)
      .eq('is_beverage', false)
      .eq('enrichment_status', 'enriched')
      .eq('enrichment_depth', 'full')
      .is('image_url', null);

    if (!items || items.length === 0) return;

    for (const item of items) {
      const query = buildImageQuery(item.canonical_name, item.name_original, item.enrichment_origin);
      const result = await fetchFromUnsplash(query)
                  ?? await fetchFromPexels(query);

      if (result) {
        await supabaseAdmin.from('menu_items').update({
          image_url: result.url,
          image_blur_hash: result.blurHash ?? null,
          image_credit: result.credit,
          image_source: result.source, // 'unsplash' | 'pexels'
        }).eq('id', item.id);
      }
      // If no result: leave image_url null → UI renders gradient+emoji fallback
    }
  } catch (error) {
    console.error('[fetchDishImages] Fatal:', error instanceof Error ? error.message : error);
  }
}
```

### Pattern 2: Unsplash REST API Call

**What:** Direct `fetch()` to `https://api.unsplash.com/search/photos`, Authorization header with `Client-ID`, return first result's `urls.small` (400px wide — appropriate for mobile cards).

**Key rules (HIGH confidence, official Unsplash docs):**
- MUST use hotlinked URLs from `photo.urls.*` — never download/re-host
- MUST keep the `ixid` query parameter in the URL (tracks photo views per API guidelines)
- MUST use `photo.urls.small` (400px) for card display — use `photo.urls.regular` (1080px) only for the full sheet
- MUST store `photo.blur_hash` for blur-up placeholder
- MUST display photographer credit (`photo.user.name`) with link to their Unsplash profile using UTM params
- MUST call the `photo.links.download_location` endpoint when a user "selects" the photo — but since we auto-select, call it once per stored image

**Attribution link format (official requirement):**
```
https://unsplash.com/@{photo.user.username}?utm_source=nomnomnom&utm_medium=referral
```
Credit text: `Photo by {photo.user.name} on Unsplash`

**Response fields to store:**
```typescript
// Source: Unsplash API docs — https://unsplash.com/documentation#search-photos
{
  urls: { small: string, regular: string },  // small=400px, regular=1080px
  blur_hash: string,        // e.g. "LKO2?U%2Tw=w]~RBVZRi};RPxuwH"
  user: { name: string, username: string },
  links: { download_location: string },      // must trigger download tracking
  alt_description: string | null,
}
```

```typescript
async function fetchFromUnsplash(query: string): Promise<ImageResult | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '5');        // evaluate top 5, pick first
  url.searchParams.set('orientation', 'squarish');
  url.searchParams.set('content_filter', 'high');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${key}` },
    // No cache — rate limit awareness requires fresh count
  });

  if (!res.ok) return null;
  const data = await res.json();
  const photo = data.results?.[0];
  if (!photo) return null;

  // Fire-and-forget download tracking (API requirement)
  fetch(photo.links.download_location, {
    headers: { Authorization: `Client-ID ${key}` }
  }).catch(() => {});

  return {
    url: photo.urls.small,           // 400px — card display
    blurHash: photo.blur_hash,
    credit: `Photo by ${photo.user.name} on Unsplash`,
    creditUrl: `https://unsplash.com/@${photo.user.username}?utm_source=nomnomnom&utm_medium=referral`,
    source: 'unsplash' as const,
  };
}
```

### Pattern 3: Pexels REST API Call (fallback)

**What:** Direct `fetch()` to `https://api.pexels.com/v1/search`, Authorization header with API key (no `Client-ID` prefix — just the key string).

**Key rules (HIGH confidence, official Pexels docs):**
- Header: `Authorization: YOUR_API_KEY` (no prefix)
- Use `src.medium` (~350px height) for card display
- Use `avg_color` (hex string like `"#A1B2C3"`) as the blur placeholder — convert to single-pixel data URL
- Display `photographer` with link to `photographer_url`

**Attribution link format:**
```
{photo.photographer_url}?utm_source=nomnomnom
```
Credit text: `Photo by {photo.photographer} on Pexels`

```typescript
async function fetchFromPexels(query: string): Promise<ImageResult | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;

  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '5');
  url.searchParams.set('orientation', 'square');

  const res = await fetch(url.toString(), {
    headers: { Authorization: key },
  });

  if (!res.ok) return null;
  const data = await res.json();
  const photo = data.photos?.[0];
  if (!photo) return null;

  // Pexels avg_color as 1×1 blurDataURL placeholder
  const blurHash = avgColorToDataURL(photo.avg_color); // "#RRGGBB" → data:image/gif;base64,...

  return {
    url: photo.src.medium,
    blurHash,          // actually a data URL here, not a blurhash string
    credit: `Photo by ${photo.photographer} on Pexels`,
    creditUrl: `${photo.photographer_url}?utm_source=nomnomnom`,
    source: 'pexels' as const,
  };
}
```

### Pattern 4: Blurhash → blurDataURL (no canvas, server-safe)

**What:** Convert Unsplash's `blur_hash` string to a tiny base64 PNG data URL that `next/image` accepts as `blurDataURL`. Uses the `blurhash` npm package to decode to pixel data, then manually assembles a minimal BMP/raw format.

**Why it's tricky:** `blurhash` decodes to a `Uint8ClampedArray` of RGBA pixels, but `next/image` needs a `data:image/...;base64,...` string. In a browser you'd draw to canvas; on the server (no canvas), use a pure-JS encoder. A well-known gist pattern converts to a tiny BMP:

```typescript
// Source: https://gist.github.com/mattiaz9/53cb67040fa135cb395b1d015a200aff
import { decode } from 'blurhash';

export function blurhashToDataURL(hash: string): string {
  const pixels = decode(hash, 32, 32); // 32×32 is plenty for blur
  const header = buildBmpHeader(32, 32);
  const bmpData = new Uint8Array(header.length + pixels.length);
  bmpData.set(header);
  bmpData.set(pixels, header.length);
  return `data:image/bmp;base64,${Buffer.from(bmpData).toString('base64')}`;
}
```

**Simpler alternative (recommended):** Store the raw `blur_hash` string in DB, convert to base64 at render time in a small utility called from a server component or from within the API status response. Or: use Unsplash `color` field (returned alongside `blur_hash` — a hex string of the dominant color) as a simple 1×1 solid-color fallback when full blur decode is too costly.

**Practical recommendation:** Store both `image_blur_hash` (the raw string) and let the client decode with `blurhash` npm package. The `blurhash` package works in browsers without canvas — it renders via a hidden `<canvas>` in the browser environment. For SSR, use `avg_color` / `color` hex field as the placeholder and enable proper `blur_hash` on client.

**Simplest working approach:**
```typescript
// Convert hex color to 1×1 GIF data URL — works server-side, no deps
function hexToDataURL(hex: string): string {
  // Unsplash returns photo.color, Pexels returns photo.avg_color
  // Use as blurDataURL — next/image enlarges and blurs it automatically
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Minimal 1×1 BMP: file header (14) + DIB header (40) + pixel data (4)
  const bmp = [
    0x42, 0x4d,                         // 'BM'
    0x3a, 0, 0, 0,                      // file size = 58 bytes
    0, 0, 0, 0,                         // reserved
    0x36, 0, 0, 0,                      // pixel data offset
    0x28, 0, 0, 0,                      // DIB header size
    1, 0, 0, 0,                         // width
    1, 0, 0, 0,                         // height
    1, 0,                               // color planes
    0x18, 0,                            // bits per pixel (24)
    0, 0, 0, 0,                         // no compression
    4, 0, 0, 0,                         // image size
    0, 0, 0, 0, 0, 0, 0, 0,            // DPI (ignored)
    0, 0, 0, 0, 0, 0, 0, 0,            // color table
    b, g, r, 0,                         // pixel (BGR)
  ];
  return `data:image/bmp;base64,${Buffer.from(bmp).toString('base64')}`;
}
```

This is what we store in `image_blur_hash` (despite the column name — it stores either a real blurhash string OR a data URL for Pexels/color-only cases). Rename the column to `image_placeholder` for clarity.

### Pattern 5: next/image remotePatterns (next.config.ts)

**Already partially configured** — `images.unsplash.com` is already in `remotePatterns`. Add Pexels:

```typescript
// Source: nextjs.org/docs/app/api-reference/components/image — verified 2026-02-27
// next.config.ts (current file already has unsplash; add pexels)
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'images.unsplash.com',
      pathname: '/**',
    },
    {
      protocol: 'https',
      hostname: 'images.pexels.com',
      pathname: '/photos/**',
    },
  ],
},
```

**Note on `unoptimized`:** Do NOT use `unoptimized={true}`. Unsplash requires hotlinking their CDN URLs directly, and Next.js image optimization proxies the URL through `/_next/image?url=...`. This is acceptable — the ixid parameter is preserved in the URL string Next.js passes to the CDN. The optimization layer only resizes/converts format; it does not strip query parameters from the source URL. **Verify this is working** in development before proceeding (the ixid must survive the Next.js optimization proxy).

### Pattern 6: DishCard Three-Level Image Display

Current DishCard has three enrichment states in JSX: pending skeleton, full-depth preview row, minimal-depth ingredients. Phase 12 adds an image zone only to the **full-depth** level:

```
Level 1 — Basic (enrichment_status = pending, or minimal depth):
  No image. Text only. Same as today.

Level 2 — Detail (enrichment_depth = 'full', has image_url):
  [Image zone: square, top of card, blur-up loads]
  [Name + price row]
  [Origin pill + cultural hint — tappable, opens sheet]

Level 3 — Advanced (DishDetailSheet):
  [Larger image at top]
  [Full cultural note, ingredients, eating tips]
  [Attribution: "Photo by X on Unsplash/Pexels" — link to photographer]
```

**Card image zone for Level 2:**
```tsx
// In DishCard — full-depth level with image
{isFullDepth && item.image_url && (
  <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-2">
    <Image
      src={item.image_url}
      alt={item.canonical_name ?? item.name_original}
      fill
      className="object-cover"
      placeholder="blur"
      blurDataURL={item.image_placeholder ?? undefined}
      sizes="(max-width: 768px) calc(100vw - 2rem), 400px"
    />
  </div>
)}

{/* Fallback: no image_url — gradient + emoji */}
{isFullDepth && !item.image_url && (
  <DishImageFallback item={item} />
)}
```

### Pattern 7: Cuisine-Based Gradient Fallback

**What:** When no image is found, render a colored gradient square with a centered emoji. Gradient is keyed off `enrichment_origin` text.

```typescript
// lib/dish-fallback.ts
const CUISINE_GRADIENTS: Record<string, [string, string]> = {
  turquie:    ['#C84B31', '#E07B39'],  // warm reds/oranges — Turkish
  ankara:     ['#C84B31', '#E07B39'],
  anatolie:   ['#C84B31', '#E07B39'],
  vietnam:    ['#2D6A4F', '#52B788'],  // greens — Vietnamese
  japon:      ['#E63946', '#1D3557'],  // red/navy — Japanese
  chine:      ['#B5171B', '#E9C46A'],  // red/gold — Chinese
  inde:       ['#E9C46A', '#F4A261'],  // saffron/orange — Indian
  france:     ['#003087', '#FFFFFF'],  // blue/white — French
  italie:     ['#009246', '#CE2B37'],  // green/red — Italian
  mexique:    ['#F4A261', '#E76F51'],  // warm orange — Mexican
  maroc:      ['#C1440E', '#F4D35E'],  // terracotta/gold — Moroccan
  liban:      ['#D62828', '#F77F00'],  // red/amber — Lebanese
  default:    ['#2C3E50', '#3498DB'],  // dark blue — generic
};

function getCuisineGradient(origin: string | null): [string, string] {
  if (!origin) return CUISINE_GRADIENTS.default;
  const lower = origin.toLowerCase();
  for (const [key, colors] of Object.entries(CUISINE_GRADIENTS)) {
    if (lower.includes(key)) return colors;
  }
  return CUISINE_GRADIENTS.default;
}
```

**Emoji strategy:** Use `enrichment_ingredients` to guess a representative ingredient emoji, falling back to a category-based emoji. Simple lookup table:
```typescript
// Map first ingredient word to food emoji
const INGREDIENT_EMOJIS: Record<string, string> = {
  'agneau': '🐑', 'poulet': '🍗', 'boeuf': '🥩', 'poisson': '🐟',
  'pâte': '🍝', 'riz': '🍚', 'tomate': '🍅', 'fromage': '🧀',
  // ...
};
// Category fallback
const CATEGORY_EMOJIS: Record<string, string> = {
  'entrée': '🥗', 'plat': '🍽️', 'dessert': '🍮', 'default': '🍴',
};
```

### Anti-Patterns to Avoid

- **Calling fetchDishImages synchronously in the scan route:** Must always use `after()` — never block the HTTP response.
- **Downloading and re-hosting Unsplash images:** The API terms explicitly forbid this. Always hotlink `photo.urls.*`.
- **Using unsplash-js package:** It is archived. Use plain `fetch()`.
- **Using `unoptimized={true}` globally:** Kills Next.js image optimization for the whole app. Use only if specifically needed per-image.
- **Fetching images for beverages:** Already skipped in enrichment, continue skipping in image fetch.
- **Fetching 1 result and blindly using it:** Fetch `per_page=5`, check `orientation=squarish` filter — the first result is usually best with this filter on food queries.
- **Storing photographer name without URL:** Both Unsplash and Pexels require linking the credit. Store `image_credit` (text) and `image_credit_url` (link) as separate columns, or store as JSON.
- **Forgetting UTM params on Unsplash links:** Required by API guidelines. Always append `?utm_source=nomnomnom&utm_medium=referral`.
- **Not triggering Unsplash download_location endpoint:** Required by API guidelines whenever a photo is "selected" (which our fetch-and-store constitutes). Fire-and-forget from `fetchFromUnsplash`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Blurhash decode | Custom base64/BMP encoder from scratch | `blurhash` npm package | Edge cases in BMP format; package is 2KB gzip, pure JS, maintained |
| Dominant color extraction | Color analysis algorithm | Unsplash `photo.color` / Pexels `photo.avg_color` | APIs return this directly — free placeholder |
| Image optimization/resize | Custom resize proxy | `next/image` + remotePatterns | Already handles srcset, WebP, lazy load, CLS |
| Rate limit tracking | Custom counter in DB | Unsplash `X-Ratelimit-Remaining` response header | Track remaining on each response; pause if <5 remaining in demo mode |

**Key insight:** Both Unsplash and Pexels return everything needed for blur placeholders and attribution directly in their API responses — no secondary library or analysis step is needed.

---

## Common Pitfalls

### Pitfall 1: Unsplash Rate Limit in Demo Mode (50 req/hr)

**What goes wrong:** With 50 req/hr in demo mode and menus that have 20+ full-depth dishes, a single large menu scan could consume 20 of the 50 hourly requests. Two large menus in an hour → rate limited.

**Why it happens:** Demo mode limit is 50/hr, shared across all app instances.

**How to avoid:**
1. Check `X-Ratelimit-Remaining` header on each Unsplash response
2. If remaining < 5, skip to Pexels for remaining dishes in that batch
3. Apply for Unsplash production approval at Phase 12 start (approval ~48 hrs–5 business days)
4. Only fetch for `enrichment_depth = 'full'` dishes in the automatic pipeline (fewer fetches, higher value)

**Warning signs:** HTTP 429 responses from Unsplash. Monitor server logs for `fetchFromUnsplash` returning null due to `!res.ok`.

### Pitfall 2: Unsplash ixid Parameter Loss Through next/image

**What goes wrong:** Next.js image optimization proxy rewrites the URL as `/_next/image?url=<encoded-url>`. If the ixid parameter is dropped during encoding/decoding, Unsplash API guidelines are violated (they track views via ixid).

**Why it happens:** URL encoding of query parameters in the `url` param of `/_next/image`.

**How to avoid:** Test in development: inspect the network request that the browser makes to `images.unsplash.com` when loading via `next/image`. The actual CDN request should contain the original URL parameters. If ixid is stripped, fall back to `unoptimized={true}` for Unsplash images specifically (use a custom `loader` prop).

**Warning signs:** Unsplash dashboard showing no view attribution despite images loading correctly.

### Pitfall 3: DB Schema Missing Enough Columns for Attribution

**What goes wrong:** Storing only `image_url` and `image_credit` (as a string) without a separate `image_credit_url` column means the DishDetailSheet can't render a proper hyperlink without parsing the stored string.

**How to avoid:** Add four columns to `menu_items` from the start:
- `image_url TEXT` — the hotlink URL (Unsplash `urls.small` or Pexels `src.medium`)
- `image_source TEXT` — `'unsplash'` | `'pexels'` (for source badge)
- `image_credit TEXT` — display text: `"Photo by X on Unsplash"`
- `image_credit_url TEXT` — photographer profile URL with UTM
- `image_placeholder TEXT` — either raw blurhash string OR 1×1 BMP data URL (for blurDataURL)

### Pitfall 4: Canonical Name Deduplication for Shared Images

**What goes wrong:** Two items named "Mantı" in the same menu (or two different menus) each trigger separate Unsplash fetches, burning rate limit for the same query.

**How to avoid:** Before calling the API, check if another `menu_item` with the same `canonical_name` already has an `image_url`. If yes, copy it:
```typescript
// Before external API call:
const { data: existing } = await supabaseAdmin
  .from('menu_items')
  .select('image_url, image_source, image_credit, image_credit_url, image_placeholder')
  .eq('canonical_name', item.canonical_name)
  .not('image_url', 'is', null)
  .limit(1)
  .single();

if (existing?.image_url) {
  // Copy from sibling — zero API cost
  await supabaseAdmin.from('menu_items').update({ ...existing }).eq('id', item.id);
  continue;
}
```

For distinct variants ("Shoyu Ramen" vs "Miso Ramen"): different `canonical_name` values → different queries → no deduplication → correct behavior.

### Pitfall 5: Square Crop vs Food Photography Aspect Ratios

**What goes wrong:** Stock photos are mostly landscape (3:2 or 16:9). Forcing 1:1 square crop on a landscape food photo often cuts off the subject.

**How to avoid:**
- For Unsplash: pass `orientation=squarish` in the search query — this filters for near-square images
- For Pexels: pass `orientation=square`
- In the `next/image` component: use `fill` + `object-cover` on a square container — `object-cover` handles the crop. This is correct behavior for the design intention
- The Unsplash CDN supports dynamic crop via `?fit=crop&w=400&h=400` appended to the URL — but this modifies the hotlinked URL, which is allowed by their CDN (Imgix-powered)

### Pitfall 6: DishDetailSheet Needs Image Update When Sheet Opens

**What goes wrong:** If image fetch runs after the user has already opened DishDetailSheet, the sheet shows no image even though one is being fetched in the background.

**Why it happens:** The enrichment polling loop stops when all enrichment fields are non-pending. If image fetch runs async after the enrichment poll has already stopped, the sheet never updates.

**How to avoid:** Two options:
1. Include `image_url` in the enrichment status polling response (`/api/enrichment/status`) — the polling loop continues until images are present for full-depth items
2. Add a separate field `image_status` (`'pending'|'fetched'|'none'`) to drive polling continuation

Recommendation: Option 1 is simpler — just add `image_url`, `image_source`, `image_credit`, `image_credit_url` to the SELECT in `/api/enrichment/status/route.ts`. Update `useEnrichmentPolling` to merge image fields alongside enrichment fields. Update the poll termination condition to also check that full-depth items have non-null `image_url`.

---

## Code Examples

Verified patterns from official sources:

### next/image with blur placeholder and fill (official docs, verified 2026-02-27)

```typescript
// Source: nextjs.org/docs/app/api-reference/components/image — version 16.1.6
<Image
  src="https://images.unsplash.com/photo-..."
  alt="Mantı — Turkish dumplings"
  fill
  className="object-cover"
  placeholder="blur"
  blurDataURL="data:image/bmp;base64,..."
  sizes="(max-width: 768px) calc(100vw - 2rem), 400px"
/>
// Parent must have position: relative and a defined height (for fill to work)
// Use aspect-ratio CSS (e.g. aspect-square Tailwind class) to set 1:1 ratio
```

### remotePatterns for Unsplash + Pexels (verified from official docs and existing next.config.ts)

```typescript
// Source: next.config.ts (already partially configured) + nextjs.org docs
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'images.unsplash.com',
      pathname: '/**',
    },
    {
      protocol: 'https',
      hostname: 'images.pexels.com',
      pathname: '/photos/**',
    },
  ],
},
```

### Unsplash search endpoint (verified via official docs + WebFetch)

```typescript
// Source: https://unsplash.com/documentation — verified 2026-02-28
GET https://api.unsplash.com/search/photos
  ?query=manti+turkish+dumpling
  &per_page=5
  &orientation=squarish
  &content_filter=high
Authorization: Client-ID YOUR_ACCESS_KEY
```

Response:
```json
{
  "results": [{
    "id": "abc123",
    "blur_hash": "LKO2?U%2Tw=w]~RBVZRi};RPxuwH",
    "color": "#A08060",
    "urls": {
      "raw": "...", "full": "...", "regular": "...", "small": "...", "thumb": "..."
    },
    "user": { "name": "Jane Doe", "username": "janedoe" },
    "links": { "download_location": "https://api.unsplash.com/photos/abc123/download?ixid=..." },
    "alt_description": "brown dumplings in a bowl"
  }]
}
```

### Pexels search endpoint (verified via docs + WebSearch)

```typescript
// Source: https://www.pexels.com/api/documentation/ — verified 2026-02-28
GET https://api.pexels.com/v1/search
  ?query=manti+dumpling
  &per_page=5
  &orientation=square
Authorization: YOUR_API_KEY
```

Response photo shape:
```json
{
  "id": 156934,
  "url": "https://www.pexels.com/photo/...",
  "photographer": "Jane Doe",
  "photographer_url": "https://www.pexels.com/@janedoe",
  "avg_color": "#A08060",
  "src": {
    "medium": "https://images.pexels.com/...&h=350",
    "large": "https://images.pexels.com/...&h=650&w=940",
    "small": "https://images.pexels.com/...&h=130"
  }
}
```

### Image search query construction (Claude's discretion — recommended approach)

```typescript
function buildImageQuery(
  canonicalName: string | null,
  nameOriginal: string,
  origin: string | null
): string {
  const name = canonicalName ?? nameOriginal;
  // Append cuisine/origin context for specificity — helps distinguish
  // "Ramen" (generic) from "Shoyu Ramen" (specific variation)
  // Keep short — Unsplash search performs better with 2-3 terms
  const cuisineHint = origin ? origin.split(',')[0].trim() : null;
  if (cuisineHint && cuisineHint.length < 30) {
    return `${name} ${cuisineHint} food`;
  }
  return `${name} food dish`;
}
// Examples:
// "Mantı" + "Anatolie centrale, Turquie" → "Mantı Anatolie centrale food"
// "Shoyu Ramen" + "Japon" → "Shoyu Ramen Japon food"
// "Pad Thai" + null → "Pad Thai food dish"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `unsplash-js` SDK | Plain `fetch()` — SDK is archived | 2023 (SDK archived) | Must use REST API directly; no SDK wrapper |
| `onLoadingComplete` prop | `onLoad` prop (next/image) | Next.js 14 | Use `onLoad` — `onLoadingComplete` deprecated |
| `priority` prop | `preload` prop (next/image) | Next.js 16 | Use `preload` for LCP images; `priority` deprecated in 16 |
| Canvas-based blurhash decode | Pure-JS decode or color placeholder | ~2022 | blurhash npm works in browser; server needs color hex approach |
| `domains` array in next.config | `remotePatterns` array | Next.js 12.3 | `domains` deprecated; use `remotePatterns` |

**Deprecated/outdated:**
- `unsplash-js`: Officially archived on npm — do not install.
- `next/image` `priority` prop: Deprecated in Next.js 16, replaced by `preload`.
- `next/image` `domains` config: Use `remotePatterns` (already done in this project).

---

## Open Questions

1. **Does Next.js image optimization preserve the Unsplash `ixid` parameter?**
   - What we know: Next.js proxies external images through `/_next/image?url=<encoded>`. The source URL (with ixid) is passed as a query parameter.
   - What's unclear: Whether the `/_next/image` handler re-fetches from Unsplash with the full original URL intact (ixid preserved) or strips query params.
   - Recommendation: Test in development — load an Unsplash image via `next/image` and inspect the actual CDN request in browser devtools. If ixid is missing, use `unoptimized={true}` per image (or a custom Unsplash loader).

2. **Should minimal-depth dishes ever get images?**
   - What we know: `minimal` depth = French/familiar dishes (steak frites, pizza margherita). The DishCard shows fewer enrichment fields for these.
   - What's unclear: User said "cost-conscious" — whether minimal-depth images add enough value to justify API calls.
   - Recommendation: Skip minimal-depth dishes entirely in the automatic pipeline. If DishDetailSheet is opened for a minimal-depth dish with no image, trigger a lazy fetch via a new API route `/api/images/fetch?itemId=`. This gives coverage on demand without burning rate limit on dishes that may never be opened.

3. **Unsplash production approval timeline**
   - What we know: Demo mode is 50 req/hr; production is 5,000 req/hr. Approval takes ~48 hours to 5 business days.
   - What's unclear: Whether the approval is granted before Phase 12 is deployed to production.
   - Recommendation: Submit the Unsplash production application at Phase 12 kickoff. In the meantime, implement demo-safe rate limit awareness (check `X-Ratelimit-Remaining`, fall back to Pexels if < 5 remaining).

---

## Sources

### Primary (HIGH confidence)

- Next.js Image Component official docs — `https://nextjs.org/docs/app/api-reference/components/image` — version 16.1.6, last updated 2026-02-27. Verified: `placeholder="blur"`, `blurDataURL`, `fill`, `remotePatterns`, `preload` vs deprecated `priority`, `onLoad` vs deprecated `onLoadingComplete`.
- Unsplash API Documentation — `https://unsplash.com/documentation` — fetched 2026-02-28. Verified: search endpoint URL, response shape (`blur_hash`, `urls`, `user`, `links.download_location`), rate limits (50 demo / 5000 production), hotlink requirement, ixid requirement, download tracking requirement.
- Unsplash Attribution Guidelines — `https://help.unsplash.com/en/articles/2511315-guideline-attribution` — fetched 2026-02-28. Verified: UTM params format, "Photo by X on Unsplash" pattern.
- Pexels API docs (shape via WebSearch) — `https://www.pexels.com/api/documentation/` — 2026-02-28. Verified: `Authorization` header format (no prefix), `src.medium`, `avg_color`, `photographer`, `photographer_url`, rate limits (200/hr, 20k/month).
- Existing project codebase — `next.config.ts` already has `images.unsplash.com` in `remotePatterns`. `lib/enrichment.ts` and scan route establish the `after()` fire-and-forget pattern to mirror.
- `blurhash` npm package — `https://www.npmjs.com/package/blurhash` — pure JS, no canvas dependency for decode in browser; server-side needs manual conversion.

### Secondary (MEDIUM confidence)

- Blurhash canvas-free server conversion — `https://gist.github.com/mattiaz9/53cb67040fa135cb395b1d015a200aff` — community gist, widely referenced in Next.js discussions; pattern verified by multiple sources agreeing on BMP approach.
- Pexels `avg_color` as placeholder — `https://pypexels.readthedocs.io/en/latest/` — confirmed field name and hex format via multiple sources.
- Unsplash `orientation=squarish` search parameter — confirmed in official docs fetch and multiple tutorial sources.

### Tertiary (LOW confidence)

- Unsplash production approval timeline (48 hrs–5 business days) — multiple help articles and community reports; Unsplash's official page says "usually under 5 business days" but community reports ~48 hours. Plan for 5 days.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified via official docs and existing codebase
- Architecture: HIGH — directly mirrors existing enrichment pipeline patterns
- API response shapes: HIGH (Unsplash) / MEDIUM (Pexels — shape verified via multiple secondary sources but direct doc fetch failed with 403)
- Pitfalls: HIGH (rate limits, ixid, attribution) / MEDIUM (deduplication pattern — inferred from domain logic)
- next/image blurhash integration: MEDIUM — the conversion approach is verified but the specific behavior of ixid through Next.js proxy is an open question requiring dev testing

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (30 days — APIs are stable but Next.js updates frequently)
