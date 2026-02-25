# Architecture Research

**Domain:** MVP feature integration — QR scanning, OCR, LLM menu parsing, dish cards, caching into existing Next.js 16 + Supabase web app
**Researched:** 2026-02-25
**Confidence:** HIGH (Next.js App Router patterns verified via official docs; library choices verified via npm registry and official sources)

---

## Context: What Already Exists

The codebase is a **Next.js 16.1.6 App Router** landing page with:

- `app/page.tsx` — single route, all marketing sections
- `app/layout.tsx` — root layout, Nav + Footer
- `app/actions/waitlist.ts` — one Server Action
- `components/sections/` — 8 section components (Hero, DishCarousel, Features, etc.)
- `components/ui/` — 3 primitives (Btn, Pill, FoodImage)
- `components/layout/` — Nav, Footer
- `lib/supabase.ts` — single Supabase client (anon key, browser-safe)
- `lib/data.ts` — static mock data (FOOD[], DISHES[], FEATURES[], FAQS[])
- Tailwind v4 CSS-first `@theme`, motion/react v12, Outfit font

This milestone adds a **functional app surface** to this same Next.js codebase. No new framework. No separate app. New routes are added under `app/`.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     BROWSER (Mobile-first PWA)                      │
│                                                                      │
│  ┌───────────────────┐   ┌───────────────────┐                      │
│  │  Landing routes   │   │  App routes        │                      │
│  │  /                │   │  /scan             │                      │
│  │  (existing)       │   │  /menu/[id]        │                      │
│  └───────────────────┘   └─────────┬─────────┘                      │
│                                    │                                  │
│  Client Components only where     │                                  │
│  browser APIs are needed:          │                                  │
│  - QrScanner (camera)              │                                  │
│  - PhotoCapture (camera)           │                                  │
│  - FilterBar (interactive state)   │                                  │
│  - DishCard list (filter state)    │                                  │
└────────────────────────────────────┼────────────────────────────────┘
                                     │  fetch / Server Actions
┌────────────────────────────────────┼────────────────────────────────┐
│              NEXT.JS API LAYER     │                                 │
│                                    │                                  │
│  ┌─────────────────┐  ┌────────────┴──────┐  ┌──────────────────┐   │
│  │  POST           │  │  POST             │  │  GET             │   │
│  │  /api/scan      │  │  /api/recommend   │  │  /api/menu/[id]  │   │
│  │                 │  │                   │  │                  │   │
│  │  - URL parse    │  │  - taste query    │  │  - cache lookup  │   │
│  │  - OCR (base64) │  │  - item_id        │  │  - return dishes │   │
│  │  - cache check  │  │    grounded Top 3 │  │                  │   │
│  └────────┬────────┘  └────────┬──────────┘  └────────┬─────────┘   │
│           │                    │                       │              │
│           └────────────────────┴───────────────────────┘             │
│                                 │                                     │
│  ┌──────────────────────────────┴─────────────────────────────────┐  │
│  │                    lib/openai.ts (server-only)                  │  │
│  │  - parseMenuFromText(rawText) → ParsedMenu (structured output)  │  │
│  │  - translateDishes(items, targetLocale) → translated[]          │  │
│  │  - getRecommendations(menuId, preference) → item_id[]          │  │
│  └──────────────────────────────────────────────────────────────── │  │
│                                 │                                     │
│  ┌──────────────────────────────┴─────────────────────────────────┐  │
│  │                   lib/supabase-server.ts (server-only)          │  │
│  │  - Service role client for server-side writes                   │  │
│  │  - menu_cache upsert / lookup by url_hash                       │  │
│  └──────────────────────────────────────────────────────────────── │  │
└──────────────────────────────────┬─────────────────────────────────┘
                                   │
┌──────────────────────────────────┼─────────────────────────────────┐
│              DATA + EXTERNAL     │                                   │
│                                  │                                   │
│  ┌─────────────────┐  ┌──────────┴───────┐  ┌──────────────────┐   │
│  │  Supabase       │  │  OpenAI API       │  │  External URL    │   │
│  │  PostgreSQL     │  │  gpt-4o           │  │  (restaurant     │   │
│  │                 │  │  vision + text    │  │   menu pages)    │   │
│  │  tables:        │  │                   │  │                  │   │
│  │  - menus        │  │  structured       │  │  fetch + extract │   │
│  │  - menu_items   │  │  output via       │  │  text server-    │   │
│  │  - admin_config │  │  Zod schema       │  │  side (no CORS)  │   │
│  │  (existing)     │  │                   │  │                  │   │
│  │  - waitlist     │  └──────────────────┘  └──────────────────┘   │
│  └─────────────────┘                                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## New vs Modified: Complete Inventory

### New Files (create from scratch)

| Path | Type | Purpose |
|------|------|---------|
| `app/scan/page.tsx` | Server Component (layout shell) | Scan entry point route; renders client scanner inside Suspense |
| `app/scan/loading.tsx` | Loading UI | Suspense fallback for scan page |
| `app/menu/[id]/page.tsx` | Server Component | Fetch cached menu from Supabase; pass to client dish list |
| `app/menu/[id]/loading.tsx` | Loading UI | Skeleton while menu loads |
| `app/admin/page.tsx` | Server Component (gated) | Admin config UI; reads `admin_config` table |
| `app/api/scan/route.ts` | Route Handler (POST) | Accepts URL or base64 image; runs cache check → OCR/fetch → LLM parse → upsert |
| `app/api/recommend/route.ts` | Route Handler (POST) | Accepts `menuId` + taste preference string; returns Top 3 item_ids |
| `app/api/menu/[id]/route.ts` | Route Handler (GET) | Returns cached menu dishes for a given menu ID |
| `components/app/QrScanner.tsx` | Client Component | Camera QR code reader using `qr-scanner`; dynamic-imported with `ssr: false` |
| `components/app/PhotoCapture.tsx` | Client Component | File input + camera photo capture; sends base64 to `/api/scan` |
| `components/app/UrlInput.tsx` | Client Component | Controlled input for direct URL paste; calls `/api/scan` |
| `components/app/DishCard.tsx` | Client Component (display) | Single dish card: name, translation, price, allergen tags, spice level |
| `components/app/DishList.tsx` | Client Component | Renders filtered list of DishCards; receives `dishes` prop |
| `components/app/FilterBar.tsx` | Client Component | Allergen/dietary filter toggles; manages local filter state |
| `components/app/RecommendPanel.tsx` | Client Component | Taste preference input + renders Top 3 highlighted results |
| `components/app/ReverseSearch.tsx` | Client Component | Separate from landing `ReverseSearch.tsx`; functional version with real API call |
| `components/app/ScanProgress.tsx` | Client Component | Shows QR scan → processing → dish cards animated step indicator |
| `lib/openai.ts` | Server-only module | OpenAI client init + typed wrappers: `parseMenu`, `translateDishes`, `getRecommendations` |
| `lib/supabase-server.ts` | Server-only module | Service role Supabase client for server-side writes; never exported to client |
| `lib/cache.ts` | Server-only module | `urlHash(url)` + `checkMenuCache(hash)` + `upsertMenuCache(hash, data)` |
| `lib/menu-extract.ts` | Server-only module | URL fetch → HTML text extraction → stripped text for LLM |
| `types/menu.ts` | Shared types | `ParsedMenu`, `MenuItem`, `Allergen`, `DietaryTag`, `MenuCache`, `AdminConfig` |

### Modified Files (existing, targeted edits)

| Path | Change | Reason |
|------|--------|--------|
| `app/layout.tsx` | Add conditional nav link to `/scan` | Expose app entry point in navigation |
| `components/layout/Nav.tsx` | Add "Scanner" CTA button linking to `/scan` | Visible app entry point |
| `lib/supabase.ts` | Keep unchanged — browser client stays as-is | Existing waitlist code uses it; do not break |
| `app/globals.css` | Add `@keyframes shimmer` for skeleton loading, `@keyframes pulse-glow` for scan active state | Match existing animation pattern |
| `lib/data.ts` | Keep unchanged — mock data stays for landing sections | Landing page continues to work |

### New Supabase Tables (SQL migrations)

| Table | Columns | Purpose |
|-------|---------|---------|
| `menus` | `id uuid pk`, `url_hash text unique`, `source_url text`, `restaurant_name text`, `created_at`, `updated_at` | One row per scanned restaurant URL |
| `menu_items` | `id uuid pk`, `menu_id uuid fk`, `original_name text`, `translated_name text`, `description_translated text`, `price text`, `allergens jsonb`, `dietary_tags jsonb`, `spice_level int`, `position int` | Parsed + translated dishes |
| `admin_config` | `id int pk default 1`, `llm_model text default 'gpt-4o'`, `llm_model_ocr text default 'gpt-4o'`, `updated_at` | Single-row config for model selection |

---

## Recommended Project Structure (additions only)

```
nomnomnom/
├── app/
│   ├── page.tsx             # EXISTING — landing page, unchanged
│   ├── layout.tsx           # MODIFIED — add nav link to /scan
│   ├── globals.css          # MODIFIED — add shimmer/pulse keyframes
│   ├── actions/
│   │   └── waitlist.ts      # EXISTING — unchanged
│   ├── scan/
│   │   ├── page.tsx         # NEW — scan entry (Server Component shell)
│   │   └── loading.tsx      # NEW
│   ├── menu/
│   │   └── [id]/
│   │       ├── page.tsx     # NEW — dish list page (Server Component)
│   │       └── loading.tsx  # NEW
│   ├── admin/
│   │   └── page.tsx         # NEW — admin config (simple password gate)
│   └── api/
│       ├── scan/
│       │   └── route.ts     # NEW — core ingest endpoint
│       ├── recommend/
│       │   └── route.ts     # NEW — Top 3 recommendations
│       └── menu/
│           └── [id]/
│               └── route.ts # NEW — menu data fetch
├── components/
│   ├── sections/            # EXISTING — all unchanged
│   ├── ui/                  # EXISTING — Btn, Pill, FoodImage unchanged
│   ├── layout/              # EXISTING — Nav modified, Footer unchanged
│   └── app/                 # NEW folder — all functional app components
│       ├── QrScanner.tsx
│       ├── PhotoCapture.tsx
│       ├── UrlInput.tsx
│       ├── DishCard.tsx
│       ├── DishList.tsx
│       ├── FilterBar.tsx
│       ├── RecommendPanel.tsx
│       ├── ReverseSearch.tsx
│       └── ScanProgress.tsx
├── lib/
│   ├── supabase.ts          # EXISTING — browser client, unchanged
│   ├── data.ts              # EXISTING — mock data, unchanged
│   ├── openai.ts            # NEW — server-only OpenAI wrappers
│   ├── supabase-server.ts   # NEW — server-only service role client
│   ├── cache.ts             # NEW — URL hash + cache read/write
│   └── menu-extract.ts      # NEW — URL fetch + text extraction
├── types/
│   └── menu.ts              # NEW — shared TypeScript interfaces
└── supabase/
    └── migrations/
        └── 001_mvp_tables.sql  # NEW — menus, menu_items, admin_config
```

### Structure Rationale

- **`components/app/` vs `components/sections/`:** Landing sections and app components have different rendering rules (app components require `"use client"`; most landing sections are already stable). Separating them prevents accidentally adding `"use client"` to marketing components and inflating client bundles.
- **`lib/openai.ts` and `lib/supabase-server.ts` as server-only:** These hold API keys and must never be bundled client-side. Naming convention `*-server.ts` signals intent; add `import 'server-only'` at top to get a build error if accidentally imported from a Client Component.
- **`types/menu.ts` as shared (no directive):** Pure TypeScript interfaces; importable from both Server and Client Components without bundle concerns.
- **`app/api/` Route Handlers:** Prefer Route Handlers over Server Actions for the scan/recommend endpoints because they need to handle `multipart/form-data` (photo upload) and are called from Client Components with `fetch()`. Server Actions are appropriate for form submissions (existing waitlist pattern) but less ergonomic for binary uploads.

---

## Architectural Patterns

### Pattern 1: Server Component Shell + Client Component Islands

**What:** Each new page (`/scan`, `/menu/[id]`) is a Server Component that does data fetching and renders the static frame, then passes data to Client Component children for interactivity.
**When to use:** Every new page route. Server Components handle: Supabase reads, passing initial data, metadata. Client Components handle: camera access, filter state, recommendation input.
**Trade-offs:** Minimal JS shipped to browser; camera/state logic is isolated. Server Components cannot use browser APIs — everything touching `navigator.mediaDevices` or `useState` must be a Client Component.

```typescript
// app/menu/[id]/page.tsx — Server Component
import { createServerSupabase } from '@/lib/supabase-server';
import DishList from '@/components/app/DishList';
import FilterBar from '@/components/app/FilterBar';
import RecommendPanel from '@/components/app/RecommendPanel';

export default async function MenuPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase();
  const { data: menu } = await supabase
    .from('menus')
    .select('*, menu_items(*)')
    .eq('id', params.id)
    .single();

  if (!menu) notFound();

  return (
    <main className="max-w-content mx-auto px-4 py-6">
      <h1 className="font-black text-2xl mb-2">{menu.restaurant_name}</h1>
      {/* FilterBar and DishList are Client Components — get data as props */}
      <FilterBar />
      <DishList dishes={menu.menu_items} />
      <RecommendPanel menuId={menu.id} />
    </main>
  );
}
```

### Pattern 2: QR Scanner with Dynamic Import + SSR Disabled

**What:** `qr-scanner` (nimiq) accesses `getUserMedia` and Worker APIs that don't exist in Node.js/SSR. Wrap in `next/dynamic` with `{ ssr: false }` and a loading fallback.
**When to use:** The `QrScanner` component and any other component that touches camera, canvas, or navigator APIs.
**Trade-offs:** Adds a small waterfall on first render (Suspense boundary shows loading state until scanner JS loads). Non-negotiable — SSR will throw without this.

```typescript
// app/scan/page.tsx — Server Component
import dynamic from 'next/dynamic';

const QrScanner = dynamic(
  () => import('@/components/app/QrScanner'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
        <p className="text-brand-muted text-sm">Chargement de la caméra…</p>
      </div>
    ),
  }
);

export default function ScanPage() {
  return (
    <main className="max-w-content mx-auto px-4 py-8">
      <QrScanner />
      {/* UrlInput and PhotoCapture are also Client Components but don't need ssr:false */}
    </main>
  );
}
```

### Pattern 3: Route Handler as Server-Side Proxy for OpenAI

**What:** Client Components call `/api/scan` and `/api/recommend` via `fetch()`. The Route Handler runs server-side where `OPENAI_API_KEY` is available. Client never sees the API key.
**When to use:** All LLM and OCR calls. Never call OpenAI SDK from a Client Component.
**Trade-offs:** One extra network hop (client → Next.js Route Handler → OpenAI) vs direct client call, but this is mandatory for key security.

```typescript
// app/api/scan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkMenuCache, upsertMenuCache, urlHash } from '@/lib/cache';
import { extractTextFromUrl } from '@/lib/menu-extract';
import { parseMenuFromText } from '@/lib/openai';
import { createServerSupabase } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const url = formData.get('url') as string | null;
  const photo = formData.get('photo') as File | null;

  // Cache check for URL inputs
  if (url) {
    const hash = urlHash(url);
    const cached = await checkMenuCache(hash);
    if (cached) return NextResponse.json({ menuId: cached.id, cached: true });
  }

  // Extract raw text
  const rawText = url
    ? await extractTextFromUrl(url)
    : await extractTextFromPhoto(photo!); // base64 → GPT-4o vision

  // LLM parse → structured output
  const parsed = await parseMenuFromText(rawText);

  // Persist to Supabase
  const supabase = createServerSupabase();
  const { data: menu } = await supabase
    .from('menus')
    .upsert({ url_hash: url ? urlHash(url) : null, source_url: url, restaurant_name: parsed.restaurantName })
    .select('id')
    .single();

  // Upsert dishes
  await supabase.from('menu_items').upsert(
    parsed.items.map((item, i) => ({ ...item, menu_id: menu!.id, position: i }))
  );

  return NextResponse.json({ menuId: menu!.id, cached: false });
}
```

### Pattern 4: OpenAI Structured Output with Zod

**What:** Define the expected menu schema with Zod. Pass to OpenAI's `response_format` using `zodResponseFormat` from the official SDK. Guarantees LLM output matches `ParsedMenu` type at runtime.
**When to use:** `parseMenuFromText()` in `lib/openai.ts`. Also `getRecommendations()`.
**Trade-offs:** Structured output has slightly higher latency than free-form JSON (model must constrain token selection). Eliminates all JSON parsing errors — strongly recommended.

```typescript
// lib/openai.ts
import 'server-only';
import OpenAI, { zodResponseFormat } from 'openai';
import { z } from 'zod';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MenuItemSchema = z.object({
  original_name: z.string(),
  translated_name: z.string(),
  description_translated: z.string(),
  price: z.string().nullable(),
  allergens: z.array(z.string()),
  dietary_tags: z.array(z.string()),
  spice_level: z.number().int().min(0).max(3),
});

const ParsedMenuSchema = z.object({
  restaurant_name: z.string(),
  items: z.array(MenuItemSchema),
});

export async function parseMenuFromText(rawText: string, model = 'gpt-4o') {
  const response = await client.beta.chat.completions.parse({
    model,
    messages: [
      { role: 'system', content: 'Extract menu dishes with French translations and allergens.' },
      { role: 'user', content: rawText },
    ],
    response_format: zodResponseFormat(ParsedMenuSchema, 'parsed_menu'),
  });
  return response.choices[0].message.parsed!;
}
```

### Pattern 5: URL Hash as Idempotent Cache Key

**What:** SHA-256 the source URL (normalized: lowercase, trailing-slash stripped, query params sorted). Store `url_hash` as a unique key in `menus` table. On every scan request, check this hash before any LLM call.
**When to use:** All URL-based scans. Photo scans use a content hash of the extracted text instead.
**Trade-offs:** Does not handle menu changes (restaurant updates their menu → stale cache). Mitigation: add `updated_at` and allow forced re-scan from UI with `?refresh=1`.

```typescript
// lib/cache.ts
import 'server-only';
import { createHash } from 'crypto';

export function urlHash(url: string): string {
  const normalized = new URL(url);
  normalized.hostname = normalized.hostname.toLowerCase();
  normalized.pathname = normalized.pathname.replace(/\/$/, '');
  normalized.searchParams.sort();
  return createHash('sha256').update(normalized.toString()).digest('hex');
}
```

### Pattern 6: item_id-Grounded Recommendations

**What:** The LLM receives the full list of `menu_items` records (with their database UUIDs) and is instructed to return only UUIDs. Never free-text names. Validate every returned UUID against the actual menu before display.
**When to use:** `/api/recommend` exclusively.
**Trade-offs:** Prompt includes all menu items (~100-200 tokens per menu). Eliminates hallucinated dishes entirely.

```typescript
// app/api/recommend/route.ts (simplified)
const RecommendSchema = z.object({
  recommendations: z.array(z.object({
    item_id: z.string().uuid(),
    reason: z.string().max(100),
  })).length(3),
});

// Validate returned IDs exist in the actual menu
const validIds = new Set(menuItems.map(i => i.id));
const safe = parsed.recommendations.filter(r => validIds.has(r.item_id));
```

---

## Data Flow

### Flow 1: QR Code Scan (primary path)

```
User opens /scan → QrScanner (Client Component) activates camera
    |
    v
nimiq/qr-scanner decodes QR → returns URL string
    |
    v
Client calls POST /api/scan { url }
    |
    v
Route Handler: urlHash(url) → query menus table
    |
    ├── Cache HIT: return { menuId, cached: true } → redirect to /menu/[id]
    |
    └── Cache MISS:
            |
            v
        fetch(url) server-side (no CORS issue)
        extract visible text (strip HTML, navigation, footers)
            |
            v
        POST to OpenAI gpt-4o with ParsedMenuSchema
            |
            v
        Upsert menus + menu_items in Supabase
            |
            v
        Return { menuId }
    |
    v
Client redirects to /menu/[id]
    |
    v
/menu/[id] Server Component fetches from Supabase → renders DishList
```

### Flow 2: Photo OCR Scan

```
User taps "Photo" on /scan → PhotoCapture component activates
    |
    v
User takes/uploads photo → FileReader converts to base64
    |
    v
Client calls POST /api/scan (multipart FormData, 'photo' field)
    |
    v
Route Handler: no cache key for photos — always process
    |
    v
Send base64 image to OpenAI gpt-4o vision with OCR + parse prompt
(single call handles both OCR and structured extraction)
    |
    v
Same upsert flow → return { menuId }
    |
    v
Client redirects to /menu/[id]
```

### Flow 3: Top 3 Recommendations

```
User types preference in RecommendPanel ("chaud, consistant, pas épicé")
    |
    v
Client calls POST /api/recommend { menuId, preference }
    |
    v
Route Handler fetches menu_items from Supabase (id, original_name, dietary_tags)
    |
    v
OpenAI gpt-4o with item_id-grounded RecommendSchema
    |
    v
Validate returned UUIDs against actual menu_items
    |
    v
Return { recommendations: [{ item_id, reason }] }
    |
    v
Client highlights matching DishCards in DishList
```

### Flow 4: Allergen / Dietary Filtering (client-only, no API)

```
User toggles "Sans gluten" in FilterBar
    |
    v
FilterBar updates local state (useState) → emits callback with active filters
    |
    v
DishList receives filters as prop → filters dishes in memory
(all dish data already loaded from /menu/[id] Server Component)
    |
    v
Filtered DishCard list renders instantly — zero API calls
```

### State Architecture

```
Per-session state (React useState, not global):
  /scan page:
    - scanMode: 'qr' | 'photo' | 'url'
    - scanStatus: 'idle' | 'scanning' | 'processing' | 'done' | 'error'
    - pendingMenuId: string | null

  /menu/[id] page:
    - activeFilters: Set<string>
    - recommendationResults: { item_id: string; reason: string }[]
    - preferenceInput: string
    - recommendLoading: boolean

No global state store needed for MVP.
URL is the primary state carrier:
  - /scan → user scans
  - /menu/[id] → dishes are shown
  - ?ref=qr | ?ref=photo | ?ref=url for analytics tracking
```

---

## Integration Points

### New API Routes ↔ Existing Architecture

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Client Component → `/api/scan` | `fetch` POST (FormData or JSON) | Route Handler runs server-side; OpenAI key never exposed to browser |
| `/api/scan` → OpenAI | `openai` npm package, server-only | Use `beta.chat.completions.parse()` for structured output |
| `/api/scan` → Supabase | `lib/supabase-server.ts` (service role) | Separate from existing `lib/supabase.ts` (anon key) — service role can bypass RLS for server writes |
| `/menu/[id]` Server Component → Supabase | `lib/supabase-server.ts` direct query | No API hop needed — Server Component talks to Supabase directly |
| `app/actions/waitlist.ts` (existing) | Unchanged | Continues using `lib/supabase.ts` anon client |
| Landing sections (existing) | Unchanged | No integration needed; `lib/data.ts` mock data unchanged |

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| OpenAI gpt-4o | Via `lib/openai.ts` (server-only) | Use `zodResponseFormat` for guaranteed structured output; model configurable via `admin_config` table |
| Supabase PostgreSQL | Two clients: anon (browser, existing waitlist) + service role (new server routes) | Never use service role key in Client Components |
| External restaurant URLs | `fetch()` in Route Handler (server-side) | Bypasses browser CORS restrictions; parse HTML to plain text before sending to LLM |

### Environment Variables (additions)

| Variable | Where Used | Notes |
|----------|------------|-------|
| `OPENAI_API_KEY` | `lib/openai.ts` (server-only) | Never prefix with `NEXT_PUBLIC_` |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase-server.ts` | Never prefix with `NEXT_PUBLIC_`; admin-only write access |
| `ADMIN_SECRET` | `app/admin/page.tsx` middleware check | Simple string compare for MVP admin gate |
| `NEXT_PUBLIC_SUPABASE_URL` | Existing + new client code | Already in `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Existing waitlist client | Already in `.env.local` |

---

## Suggested Build Order

Dependencies drive the order. Later steps rely on earlier steps being stable.

```
Step 1: Database Foundation
  └── Add Supabase tables: menus, menu_items, admin_config
  └── Write types/menu.ts interfaces
  └── Add lib/supabase-server.ts (service role client)
  └── Verify: can write + read from new tables via Supabase dashboard
  (No UI changes. No OpenAI. Purely schema + types.)

Step 2: lib/openai.ts + parseMenuFromText
  └── Implement with Zod ParsedMenuSchema
  └── Test with curl / ts-node against a known menu URL
  └── Verify structured output matches schema
  └── Add lib/menu-extract.ts (URL fetch → stripped text)
  (Server-only. No routes yet. Can test in isolation.)

Step 3: /api/scan Route Handler (URL path only)
  └── Wire lib/menu-extract.ts → lib/openai.ts → Supabase upsert
  └── Implement lib/cache.ts urlHash + cache check
  └── Test with Postman/curl: POST { url: "https://..." }
  └── Verify menu + items appear in Supabase
  (No UI. API only. Validates the full server pipeline.)

Step 4: /menu/[id] page + DishCard + DishList
  └── Server Component fetches from Supabase
  └── DishCard component (Tailwind, matching dark theme)
  └── DishList renders all dishes
  └── Static FilterBar (visual only, no filter logic yet)
  └── Test: navigate to /menu/[known-uuid] — dishes render
  (First visible UI. No camera yet. Shows something real.)

Step 5: /api/scan — Photo OCR path
  └── Extend route.ts to handle FormData 'photo' field
  └── Send base64 to GPT-4o vision in lib/openai.ts
  └── Test with a real menu photo
  (Extends Step 3. URL path must work first.)

Step 6: /scan page + QrScanner + UrlInput + PhotoCapture
  └── ScanPage Server Component shell
  └── QrScanner (dynamic import, ssr:false) using nimiq/qr-scanner
  └── UrlInput controlled form
  └── PhotoCapture file input
  └── ScanProgress step indicator
  └── Wire all three to POST /api/scan + redirect to /menu/[id]
  (Full scan flow now works end-to-end.)

Step 7: FilterBar logic + allergen filtering
  └── FilterBar useState + callback
  └── DishList consumes activeFilters prop — filters in memory
  (Pure client-side. Zero new API calls.)

Step 8: /api/recommend + RecommendPanel
  └── Route Handler: fetch menu_items → OpenAI item_id-grounded Top 3
  └── RecommendPanel component: preference input + highlights matching cards
  └── Wire RecommendPanel into /menu/[id] page
  (Depends on Steps 3 + 4. Menu data must exist first.)

Step 9: Admin config page
  └── /admin/page.tsx with simple ADMIN_SECRET env check
  └── Read/write admin_config table
  └── Model selector dropdown (gpt-4o / gpt-4o-mini / gpt-4-turbo)
  └── Pass selected model through to lib/openai.ts calls
  (Optional last step. Does not block any user-facing features.)

Step 10: Nav integration
  └── Add "Scanner" CTA to Nav.tsx pointing to /scan
  └── Landing page hero Btn "Tester maintenant" links to /scan
  (Last — only after /scan is fully functional.)
```

---

## Anti-Patterns

### Anti-Pattern 1: Server-Only Modules Imported in Client Components

**What people do:** Import `lib/openai.ts` or `lib/supabase-server.ts` directly inside a `"use client"` component to call the API "directly."
**Why it's wrong:** Next.js bundles that import into the browser bundle, exposing `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in the client JS — visible in DevTools.
**Do this instead:** Add `import 'server-only'` at the top of both files. Next.js will throw a build error if they're accidentally imported client-side. All LLM calls go through Route Handlers.

### Anti-Pattern 2: Single Supabase Client for Everything

**What people do:** Use the existing `lib/supabase.ts` (anon key) in Route Handlers and Server Components for writes.
**Why it's wrong:** The anon key respects RLS. Writes to `menus` and `menu_items` from server-side code need the service role key to bypass RLS, or you must write overly permissive public-insert policies.
**Do this instead:** `lib/supabase.ts` (anon key) for browser-only code. `lib/supabase-server.ts` (service role) for all Route Handlers and Server Components that write data.

### Anti-Pattern 3: Calling OpenAI from FilterBar or DishList

**What people do:** Add "smart filter" that calls the LLM on every filter toggle to re-rank dishes.
**Why it's wrong:** Every toggle = 1 OpenAI API call = ~0.01-0.05€. A user toggling 10 filters = 0.50€ per session. At 100 users/day that's 50€/day on filtering alone.
**Do this instead:** Filtering is purely in-memory on `dietary_tags` and `allergens` JSONB fields already stored in Supabase. The LLM is called once at scan time (to parse/tag) and once for Top 3 recommendations. Never on filter interactions.

### Anti-Pattern 4: Re-running OCR + LLM on Every Page Load

**What people do:** The `/menu/[id]` page calls `/api/scan` again to "refresh" data.
**Why it's wrong:** Duplicates LLM cost. A popular restaurant scanned by 500 users generates 500 OpenAI calls instead of 1.
**Do this instead:** `/menu/[id]` page reads exclusively from Supabase (the cache). Only `/api/scan` triggers LLM processing, and only on a cache miss (new URL hash). The `menus` + `menu_items` tables ARE the cache.

### Anti-Pattern 5: QrScanner Without SSR Disable

**What people do:** Import `qr-scanner` at the top of a page or component without `ssr: false`.
**Why it's wrong:** Node.js has no `window`, `navigator`, or `Worker` — the import crashes Next.js SSR with a ReferenceError.
**Do this instead:** Always wrap camera/media API components in `dynamic(() => import('...'), { ssr: false })`. Apply to the component, not the package.

### Anti-Pattern 6: Storing OpenAI Responses as Raw Text

**What people do:** Cache the raw LLM response string in Supabase. Re-parse JSON on each request.
**Why it's wrong:** If the response was malformed once, it stays malformed in cache. Parsing on every read adds latency. Schema migrations become impossible without re-scanning.
**Do this instead:** Parse + validate with Zod at scan time. Store normalized structured data in `menu_items` rows with typed columns. Never store raw LLM output in the cache tables.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Current architecture is sufficient. Supabase free tier handles the load. `menus` + `menu_items` as cache is sufficient — no Redis needed. |
| 1k-100k users | Add Upstash Redis for `url_hash` → `menu_id` lookup (faster than Supabase SELECT for hot restaurants). Move image OCR to a separate queue worker (Route Handler timeout at ~60s on Vercel hobby). Add rate limiting on `/api/scan` (1 request/IP/minute). |
| 100k+ users | Separate the LLM pipeline from the Next.js app into a dedicated service. Add pgvector for semantic similarity matching in reverse search. Consider per-locale translation pre-warming for popular menus. |

### First Bottleneck

**What breaks first:** Vercel function timeout on `/api/scan` for complex menus. URL fetch + LLM parse can exceed 10s on slow restaurant sites.
**Fix:** Return `{ scanId }` immediately and poll status. Store scan progress in Supabase (`scans` table with `status: 'pending' | 'done' | 'error'`). Client polls `/api/scan/[scanId]` every 2s. Only implement this if timeout issues appear in practice — don't over-engineer upfront.

### Second Bottleneck

**What breaks next:** OpenAI cost on LLM-per-scan if cache hit rate is low.
**Fix:** The `menus` table IS the cache. As long as URL hashing is working, popular restaurants generate 1 LLM call total regardless of user count. Monitor `cached: true` vs `cached: false` ratio in response logs.

---

## Sources

- [Next.js App Router Route Handlers docs](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) — HIGH confidence, official docs
- [Next.js dynamic import with ssr:false](https://nextjs.org/docs/pages/building-your-application/optimizing/lazy-loading#with-no-ssr) — HIGH confidence, official docs
- [OpenAI Structured Outputs with Zod](https://platform.openai.com/docs/guides/structured-outputs) — HIGH confidence, official OpenAI docs
- [nimiq/qr-scanner — Next.js SSR handling](https://github.com/nimiq/qr-scanner) — MEDIUM confidence (community patterns confirmed across multiple sources)
- [Supabase Row Level Security — anon vs service role](https://supabase.com/docs/guides/database/postgres/row-level-security) — HIGH confidence, official Supabase docs
- [Next.js server-only package](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#keeping-server-only-code-out-of-the-client-environment) — HIGH confidence, official Next.js docs
- [Vercel AI SDK Getting Started Next.js App Router](https://ai-sdk.dev/docs/getting-started/nextjs-app-router) — HIGH confidence, official Vercel AI SDK docs
- [Next.js formData() in Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers#request-body-formdata) — HIGH confidence, official docs

---

*Architecture research for: NŌM — MVP feature integration into existing Next.js 16 + Supabase codebase*
*Researched: 2026-02-25*
