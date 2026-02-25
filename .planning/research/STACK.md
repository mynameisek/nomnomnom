# Stack Research

**Domain:** Restaurant menu scanning / AI translation web app — MVP feature additions to existing Next.js app
**Researched:** 2026-02-25
**Confidence:** MEDIUM-HIGH (versions verified via npm registry search and GitHub; framework choices verified via official docs and multiple sources)

---

## Context: What Already Exists (Do Not Re-add)

The project already has these packages — do not propose reinstalling them:

| Package | Version | Notes |
|---------|---------|-------|
| `next` | 16.1.6 | App Router |
| `react` / `react-dom` | 19.2.3 | |
| `@supabase/supabase-js` | ^2.97.0 | |
| `motion` | ^12.34.3 | Framer Motion successor |
| `tailwindcss` | ^4 | CSS-first `@theme` |
| `typescript` | ^5 | |
| `eslint` / `eslint-config-next` | ^9 / 16.1.6 | |

Everything below is new, additive, and scoped to the MVP feature set.

---

## Recommended Stack (New Additions Only)

### Feature 1: QR Code Scanning (Camera)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@yudiel/react-qr-scanner` | ^2.5.1 | Camera-based QR code detection | The only actively maintained React QR scanning library as of Feb 2026. Built on the native Barcode Detection API with ZXing WASM fallback. Supports torch, zoom, front/back camera switching. Last published ~1 month ago. Requires `dynamic()` with `ssr: false` in Next.js. |

**What to avoid:** `html5-qrcode` and the un-scoped `react-qr-scanner` are both unmaintained (2+ years, no fixes). `@yudiel/react-qr-scanner` is the direct replacement.

---

### Feature 2: Photo OCR (Camera Fallback)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `react-webcam` | ^7.2.0 | Camera capture UI for photo mode | Lightweight, `facingMode: "environment"` for mobile rear camera, returns base64 still frames. Stable, ~113K weekly downloads. Requires `ssr: false`. |
| `tesseract.js` | ^7.0.0 | Client-side OCR on captured photos | Pure JS, runs entirely in the browser via WASM, no server cost per image. Supports 100+ languages including FR/EN/TR/DE. v7.0.0 (Dec 2024) adds 15-35% faster recognition via `relaxedsimd` build. |

**Architecture decision:** Run `tesseract.js` client-side first (free, instant). If extracted text quality is low (confidence score < threshold), route the image to GPT-4o Vision via a Server Action as fallback. This avoids paying OpenAI API costs for every scan while maintaining quality.

**Accuracy reality:** Tesseract.js on menu photos produces ~60-70% accurate extraction without preprocessing. GPT-4o Vision achieves ~80%+ AND returns structured JSON with dish names, descriptions, and allergens in one pass. The dual-path approach is the pragmatic tradeoff.

---

### Feature 3: Generic Menu Web Parsing (URL input)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `cheerio` | ^1.2.0 | Server-side HTML parsing for static/SSR menus | jQuery-like API, runs in Next.js Server Actions and Route Handlers, zero browser overhead, fast. Works for static/server-rendered HTML menu pages. |

**Critical finding on the test menu (`https://menu.eazee-link.com/?id=E7FNRP0ET3&o=q`):** Direct fetch returns only `"You need to enable JavaScript to run this app"`. This is a React SPA. Cheerio CANNOT parse it — there is no HTML content without JavaScript execution.

**Do NOT use Playwright or Puppeteer on Vercel.** Chromium binary alone exceeds 280 MB. Vercel's serverless function limit is 250 MB unzipped. Deployment will fail.

**Two-tier URL parsing strategy (no headless browser required):**
1. `cheerio` fetch-and-parse — works for ~40-50% of menus (static HTML, server-rendered pages)
2. For JavaScript SPAs: call a screenshot API (e.g., Screenshotone, APIFlash) from a Server Action → pass the resulting image to GPT-4o Vision for structured extraction

This pattern handles both cases with no bundle size risk, no headless browser, and predictable behavior.

---

### Feature 4: LLM Integration (OpenAI — dish structuring, translation, Top 3 AI assistant)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `ai` (Vercel AI SDK) | ^6.0.97 | Streaming AI responses, `generateText`, `useChat` hooks | Purpose-built for Next.js App Router. Abstracts OpenAI streaming over Server Actions. Eliminates manual ReadableStream / SSE boilerplate. Last published 4 days ago (highly active). |
| `@ai-sdk/openai` | ^3.0.31 | OpenAI provider for Vercel AI SDK | Official Vercel-maintained provider. Typed model selection. Supports GPT-4o, GPT-4o-mini, GPT-4.1, GPT-4.1-mini. Last published 15 hours ago (very active). |

**Do NOT use** the raw `openai` npm package (currently v6.x) directly in Server Actions — it requires manual streaming and lacks the App Router integration that Vercel AI SDK provides.

**Model strategy:**

| Model | Use Case | Rationale |
|-------|----------|-----------|
| `gpt-4o-mini` | Dish structuring from Cheerio-extracted text, FR/EN/TR/DE translation, allergen tagging | Cheap (~$0.15/1M tokens), fast, excellent multilingual performance for short culinary text |
| `gpt-4o` | Vision-based parsing (photo OCR fallback, SPA screenshot parsing) | Vision input capability; balance of cost and quality for image tasks |
| `gpt-4.1-mini` | Configurable upgrade path for Top 3 AI assistant | Outperforms GPT-4o across benchmarks; available as drop-in swap via `@ai-sdk/openai` config |

**Key pattern:** All OpenAI calls are Server Actions (`"use server"`). The API key lives in `OPENAI_API_KEY` env var only. Never call the API from the browser.

---

### Feature 5: Translation (FR / EN / TR / DE)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `next-intl` | ^4.8.3 | UI string localization (labels, filters, navigation, error messages) | Purpose-built for Next.js App Router. Server Components and Client Components both supported. Last published 8 days ago. **Note:** Next.js 16 renamed middleware to `proxy.ts` — this is a breaking change from pre-16 next-intl tutorials. |

**Translation architecture split:**

- `next-intl` handles **static UI strings** — button labels, allergen category names, filter names, navigation. These go in JSON locale files.
- **GPT-4o-mini** handles **dish name and description translation** — dynamic, AI-generated, stored in Supabase after first translation.

**Do NOT add Google Translate API or DeepL** — adds another paid service when GPT-4o-mini is already in the stack, cheaper, and produces higher-quality culinary translations with cultural context (e.g., "magret de canard" stays as-is in FR but gets a proper translation in EN/TR/DE, not a literal word-by-word rendering).

---

### Feature 6: Menu Caching (Supabase)

No new packages — `@supabase/supabase-js` is already installed.

**Caching schema:**

```sql
CREATE TABLE menu_cache (
  url_hash      TEXT PRIMARY KEY,        -- SHA-256 of input URL or image fingerprint
  raw_content   JSONB,                   -- cheerio-extracted or GPT-extracted raw data
  parsed_dishes JSONB,                   -- structured dish cards array
  translations  JSONB,                   -- { "fr": [...], "en": [...], "tr": [...], "de": [...] }
  created_at    TIMESTAMPTZ DEFAULT now(),
  expires_at    TIMESTAMPTZ              -- now() + interval '7 days'
);
```

**Cache hit flow:** hash input → query Supabase → if found and not expired → return `parsed_dishes` + `translations` directly, skip ALL AI calls.

**Supabase client selection:** Use `@supabase/supabase-js` (not `@supabase/ssr`) for cache operations in Server Actions. The `@supabase/ssr` package uses cookies, which opts out of Next.js fetch caching. Service-role key for cache reads/writes is fine since no user PII is stored.

---

### Feature 7: Allergen / Dietary Filters

**No new packages.** Client-side `useState` / `useReducer` is sufficient. The GPT-4o-mini prompt instructs the model to return structured JSON per dish:

```json
{
  "name": "...",
  "description": "...",
  "allergens": ["gluten", "dairy"],
  "dietary": ["vegetarian"],
  "translations": { "en": "...", "tr": "...", "de": "..." }
}
```

Filter logic is pure array intersection on the client — no search library needed.

---

### Feature 8: Reverse Search

**No new packages for MVP.** Client-side fuzzy filter over loaded dish cards. If full-text search at scale is needed later, Supabase's built-in `fts` on the `parsed_dishes` JSONB column covers it — no Algolia or Meilisearch required at this stage.

---

## Complete New Dependencies Summary

### Core Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@yudiel/react-qr-scanner` | ^2.5.1 | QR scan via device camera | QR code input mode |
| `react-webcam` | ^7.2.0 | Camera capture UI for photo OCR | Photo input mode |
| `tesseract.js` | ^7.0.0 | Client-side OCR (browser WASM) | Photo input, free tier path |
| `cheerio` | ^1.2.0 | Server-side HTML parsing | URL input, static HTML menus |
| `ai` | ^6.0.97 | Vercel AI SDK (streaming, hooks) | All LLM calls |
| `@ai-sdk/openai` | ^3.0.31 | OpenAI provider for AI SDK | All LLM calls via OpenAI |
| `next-intl` | ^4.8.3 | UI string localization | All pages |

---

## Installation

```bash
# Camera + QR scanning
npm install @yudiel/react-qr-scanner react-webcam

# Client-side OCR
npm install tesseract.js

# Server-side HTML parsing
npm install cheerio

# AI / LLM (Vercel AI SDK + OpenAI provider)
npm install ai @ai-sdk/openai

# UI localization
npm install next-intl
```

No new dev dependencies required — TypeScript types are bundled in all recommended packages.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| QR scanning | `@yudiel/react-qr-scanner` | `html5-qrcode` | Unmaintained since 2022. Uses deprecated ZXing-js. No React 19 support. |
| QR scanning | `@yudiel/react-qr-scanner` | `react-qr-barcode-scanner` | Wraps deprecated `@zxing/library`. Less maintained. |
| Web parsing | `cheerio` + screenshot API | `playwright` / `puppeteer` | Chromium binary = 280 MB. Vercel serverless limit = 250 MB. Hard deployment blocker. |
| LLM client | Vercel AI SDK (`ai` + `@ai-sdk/openai`) | Raw `openai` v6 package | Manual streaming implementation in App Router; more boilerplate; less type-safe; no `useChat` hook. |
| UI localization | `next-intl` | `next-i18next` | Officially incompatible with App Router — only works with Pages Router. |
| UI localization | `next-intl` | `react-i18next` directly | Works, but next-intl has better Server Component support and is purpose-built for App Router. |
| Dish translation | GPT-4o-mini (already in stack) | Google Translate API / DeepL | Adds another paid third-party dependency. GPT-4o-mini is cheaper and handles food vocabulary nuance better. |
| OCR | Tesseract.js (client) + GPT-4o Vision (fallback) | Tesseract.js only | Single-engine accuracy ~60-70% on restaurant menu photos — insufficient quality for MVP. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `html5-qrcode` | Unmaintained since 2022. Uses deprecated ZXing-js. No bug fixes. | `@yudiel/react-qr-scanner` ^2.5.1 |
| `react-qr-reader` (un-scoped) | Last published 3+ years ago. Not compatible with React 19. | `@yudiel/react-qr-scanner` ^2.5.1 |
| `playwright` / `puppeteer` in Vercel serverless | Chromium binary (280 MB) exceeds Vercel 250 MB function limit. Deployment fails. | `cheerio` for static HTML + screenshot service for SPAs |
| `next-i18next` | Not compatible with Next.js App Router. Well-documented breakage. | `next-intl` ^4.8.3 |
| Raw `openai` npm package (v6.x) | Requires manual ReadableStream / SSE handling in Server Actions. No `useChat`. | `ai` + `@ai-sdk/openai` |
| `@supabase/ssr` for caching | Uses cookies, which opts out of Next.js fetch caching entirely. | `@supabase/supabase-js` directly for Server Action cache calls |
| Google Translate API / DeepL | Additional paid service. GPT-4o-mini covers the same need already. | GPT-4o-mini via `@ai-sdk/openai` |

---

## Stack Patterns by Variant

**If menu input is a QR code scan:**
- `@yudiel/react-qr-scanner` decodes the QR → extracts URL → treat as URL input path below

**If menu input is a URL pointing to static/SSR HTML:**
- Server Action fetches URL → `cheerio` parses dish names/descriptions → `gpt-4o-mini` structures and translates → cache in Supabase

**If menu input is a URL pointing to a JavaScript SPA (like eazee-link.com):**
- Server Action calls screenshot API with URL → receives image → `gpt-4o` Vision extracts structured dish data → cache in Supabase

**If menu input is a photo from camera:**
- `react-webcam` captures image → `tesseract.js` runs client-side OCR in browser → if confidence low, upload to Server Action → `gpt-4o` Vision → cache result

**Top 3 AI Assistant:**
- Client sends current dish array → Server Action calls `gpt-4o-mini` (or `gpt-4.1-mini`) with user dietary/allergen prefs → streams back ranked recommendations via `useChat`

---

## Version Compatibility

| Package | Compatible With | Critical Note |
|---------|----------------|---------------|
| `@yudiel/react-qr-scanner` ^2.5.1 | React 18+, React 19 | Must use `dynamic(() => import(...), { ssr: false })` — accesses `navigator.mediaDevices` |
| `react-webcam` ^7.2.0 | React 18+, React 19 | Must use `dynamic()` with `ssr: false`. HTTPS required on mobile devices. |
| `tesseract.js` ^7.0.0 | Node.js 16+, modern browsers | Requires webpack config in `next.config.ts` — see integration notes below |
| `next-intl` ^4.8.3 | Next.js 15+, **Next.js 16** | Middleware file must be named `proxy.ts` in Next.js 16 (was `middleware.ts` in older versions) |
| `ai` ^6.0.97 | Next.js App Router, React 18+ | Use `generateText` in Server Actions; `useChat` is client-only |
| `@ai-sdk/openai` ^3.0.31 | `ai` ^6.x | Must match `ai` SDK major version — do not mix `ai` v5 with `@ai-sdk/openai` v3 |
| `cheerio` ^1.2.0 | Node.js 18+ | Server-only. Never import in Client Components or `'use client'` files. |

---

## Integration Notes

### Next.js 16 + `next-intl`: Middleware Renamed
In Next.js 16, the `next-intl` integration middleware must be named `proxy.ts` (previously `middleware.ts`). Pre-16 tutorials will be wrong on this step.

### Camera Components: Always `ssr: false`
Both `@yudiel/react-qr-scanner` and `react-webcam` access browser-only APIs (`navigator.mediaDevices`). Use dynamic imports:

```typescript
// In any Next.js page or component
import dynamic from "next/dynamic";

const QrScanner = dynamic(() => import("@yudiel/react-qr-scanner"), { ssr: false });
const Webcam = dynamic(() => import("react-webcam"), { ssr: false });
```

### Tesseract.js: Next.js Webpack Config
Tesseract.js uses Web Workers and WASM. Add to `next.config.ts`:

```typescript
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    return config;
  },
};
```

### Vercel Function Size Budget
Estimated bundle additions from new packages:
- `tesseract.js` — ~2 MB JS (WASM loaded lazily from CDN, not bundled)
- `cheerio` — ~1 MB
- `ai` + `@ai-sdk/openai` — ~500 KB
- `@yudiel/react-qr-scanner` — ~300 KB
- `react-webcam` — ~100 KB
- `next-intl` — ~200 KB

Total addition: ~4.1 MB. Well within Vercel's 250 MB serverless function limit. No size risk.

---

## Sources

- [github.com/yudielcurbelo/react-qr-scanner](https://github.com/yudielcurbelo/react-qr-scanner) — `@yudiel/react-qr-scanner` v2.5.1 confirmed, last published ~1 month ago (MEDIUM confidence, search result)
- [github.com/naptha/tesseract.js/releases](https://github.com/naptha/tesseract.js/releases) — v7.0.0 released December 2024, confirmed latest (HIGH confidence, official source)
- [ai-sdk.dev/docs/introduction](https://ai-sdk.dev/docs/introduction) — Vercel AI SDK v6.0.97, official documentation (HIGH confidence)
- [npmjs.com/package/@ai-sdk/openai](https://www.npmjs.com/package/@ai-sdk/openai) — `@ai-sdk/openai` v3.0.31, last published 15 hours ago (MEDIUM confidence, search result)
- [next-intl.dev](https://next-intl.dev/) — v4.8.3, Next.js 16 compatibility and `proxy.ts` rename confirmed (HIGH confidence)
- [npmjs.com/package/cheerio](https://www.npmjs.com/package/cheerio) — v1.2.0 confirmed (MEDIUM confidence, search result)
- [vercel.com/docs/functions/limitations](https://vercel.com/docs/functions/limitations) — 250 MB unzipped function limit (HIGH confidence, official docs)
- [npm-compare.com](https://npm-compare.com/@zxing/library,html5-qrcode,jsqr,qr-scanner,qrcode-reader) — html5-qrcode and @zxing/library maintenance status confirmed unmaintained (MEDIUM confidence)
- Test menu direct analysis (https://menu.eazee-link.com/?id=E7FNRP0ET3&o=q) — confirmed JavaScript SPA, Cheerio cannot parse it (HIGH confidence, direct HTTP fetch)
- [roboflow.com/compare/tesseract-vs-gpt-4o](https://roboflow.com/compare/tesseract-vs-gpt-4o) — Tesseract vs GPT-4o accuracy comparison (MEDIUM confidence)
- [zenrows.com/blog/playwright-vercel](https://www.zenrows.com/blog/playwright-vercel) — Playwright/Playwright Chromium on Vercel size constraints (HIGH confidence, corroborated by Vercel docs)

---

*Stack research for: NOM — restaurant menu scanning / AI translation MVP features (Next.js web app)*
*Researched: 2026-02-25*
