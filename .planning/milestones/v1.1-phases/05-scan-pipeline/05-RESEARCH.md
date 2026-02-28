# Phase 5: Scan Pipeline - Research

**Researched:** 2026-02-25
**Domain:** QR scanning, URL-to-text extraction (SPA screenshot API), photo OCR (GPT-4o vision), client-side image resize, Next.js Route Handlers, loading UX
**Confidence:** HIGH (core patterns verified via official docs and npm; screenshot vendor selection MEDIUM — recommendation based on multi-source comparison)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

All implementation choices are deferred to Claude (no locked decisions from user). The following decisions were made in prior phases and carry forward as constraints:

- **Framework:** Next.js App Router (web app, not native)
- **LLM provider:** OpenAI via AI SDK 6 — `generateText` + `Output.object()` pattern, `experimental_output` field
- **Photo OCR model:** GPT-4o-mini Vision — Tesseract.js ruled out (mobile WASM freeze on low RAM)
- **SPA menus:** Screenshot API required — Cheerio insufficient for eazee-link.com (confirmed JS SPA)
- **Screenshot API vendor:** TBD — select during research (Screenshotone vs APIFlash vs Browserless)
- **Caching:** `getOrParseMenu()` in `lib/cache.ts` already implements the cache layer (Phase 4 deliverable)
- **Cache client:** Anon client for reads (preserves Next.js fetch cache), service role for writes
- **Delete-then-insert:** Cache refresh pattern (cleaner than upsert with `url_hash` unique constraint)
- **Zod:** Pinned at 3.25.76 (no caret) — Zod v4 breaks AI SDK internal `zod-to-json-schema`
- **Image resize:** Client-side to 1024px max before upload (INFR-04 — hard requirement)
- **Admin config:** LLM model selection is admin-configurable via `admin_config` table

### Claude's Discretion

**Scan page layout:**
- How the three scan methods are presented on `/scan` (tabs, cards, unified input, etc.)
- Page structure, visual hierarchy, and mobile-first layout
- How to handle the QR → URL redirect flow vs in-app scanning

**Loading experience:**
- Loading indicator style (progress steps, skeleton, spinner, etc.)
- What feedback to show during parsing stages
- How to handle long parse times (>5s) — keep user informed, never blank screen

**Camera & photo flow:**
- Camera vs gallery picker behavior
- Whether to show preview before sending
- Image guidance (framing hints, quality feedback)

**Error handling UX:**
- How scan failures are presented (toast, inline, full-page)
- Recovery options (retry, try different method, manual entry)
- What happens with unrecognized QR codes or unparseable menus

**Screenshot API vendor:**
- Selection from: Screenshotone vs APIFlash vs Browserless
- Must handle JavaScript SPAs (eazee-link.com confirmed JS SPA)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCAN-01 | User can scan a QR code with phone camera to load a restaurant menu | `qr-scanner` library (nimiq) runs in-browser via `<video>` element; decoded URL fed to URL pipeline; dynamic import with `{ ssr: false }` required |
| SCAN-02 | User can paste a URL/link to load a restaurant menu | Route Handler `POST /api/scan/url` receives URL, calls `getOrParseMenu()` from Phase 4 via screenshot API text extraction; Screenshotone `format=markdown` approach documented |
| SCAN-03 | User can take a photo of a physical menu to extract dishes via OCR | `browser-image-compression` resizes client-side; FormData POST to `POST /api/scan/photo`; AI SDK `generateText` with `messages` image part + `output: Output.object()` for structured extraction |
| SCAN-04 | User sees a loading state with progress feedback during menu parsing | SSE via Route Handler (`ReadableStream`) recommended for multi-step progress; fallback: optimistic multi-step UI with `useTransition`/`isPending` for simpler polling |
| SCAN-05 | Scanned menus are cached in Supabase — repeat scans return instant results | `getOrParseMenu()` from Phase 4 already handles cache check (anon client) and write (service role); Phase 5 calls this function — no new cache logic needed |
| INFR-04 | Image resize client-side (1024px max) before sending photo to API | `browser-image-compression@2.0.2` with `{ maxWidthOrHeight: 1024, useWebWorker: true }` — verified pattern; returns compressed `File` object ready for `FormData` append |
</phase_requirements>

---

## Summary

Phase 5 wires three scan entry points through the existing LLM pipeline (built in Phase 4) to produce a valid `/menu/[id]` redirect. The core orchestration function `getOrParseMenu()` already exists in `lib/cache.ts` — Phase 5 is primarily about building the input surfaces (QR scanner, URL input, photo upload), the API Route Handlers that feed raw text into that function, and the loading UX that bridges the gap between scan initiation and `/menu/[id]` arrival.

The most significant technical decision in this phase is the **screenshot API vendor** for URL-based SPA menu rendering. Research confirms Screenshotone as the best fit: it offers `format=markdown` which extracts clean text from the page (eliminating a second LLM call to describe a screenshot), has explicit SPA support via `wait_until=networkidle2`, and the `screenshotone-api-sdk@1.1.21` npm package provides a typed TypeScript SDK. The free tier (100 screenshots/month) is sufficient for development; production needs are covered by the Basic plan ($17/month, 2,000 screenshots/month).

The **photo OCR path** uses the AI SDK's `messages` array with an `ImagePart` (base64 encoded, `type: 'image'`) combined with `output: Output.object()` in the same `generateText` call. This is verified via official AI SDK docs — images and structured output are composable in AI SDK 6. The **QR scan path** in a web app is a redirect problem: the browser natively decodes QR codes on iOS/Android (camera apps handle this), so in-browser QR scanning is secondary. The `qr-scanner@1.4.2` library handles the in-browser fallback for desktop or explicit scan intent.

**Primary recommendation:** Use Screenshotone for SPA text extraction (`format=markdown`), `qr-scanner` (nimiq) for in-browser QR decoding, `browser-image-compression` for client-side resize, and build two Route Handlers (`POST /api/scan/url` and `POST /api/scan/photo`) that both terminate by calling `getOrParseMenu()` and returning the menu ID for client-side redirect.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `screenshotone-api-sdk` | 1.1.21 | Screenshot + text extraction from SPA URLs | Official TS SDK; supports `format=markdown` for clean text output; SPA-ready with `wait_until=networkidle2` |
| `qr-scanner` | 1.4.2 | In-browser QR code decoding via camera | Actively maintained (nimiq); lightweight (5.6 kB gzipped with BarcodeDetector); runs in WebWorker; `{ ssr: false }` import pattern well-documented |
| `browser-image-compression` | 2.0.2 | Client-side image resize before upload (INFR-04) | Purpose-built for this use case; `maxWidthOrHeight: 1024` option exact match; `useWebWorker: true` keeps UI thread responsive |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ai` | 6.0.99 (already installed) | `generateText` + `Output.object()` for photo OCR | Already in project from Phase 4; `messages` with `ImagePart` added for vision path |
| `@ai-sdk/openai` | 3.0.33 (already installed) | OpenAI provider for AI SDK | Already in project |
| `zod` | 3.25.76 (pinned, already installed) | Schema for LLM output validation | Already in project; do not upgrade |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Screenshotone | APIFlash | APIFlash is faster (<1s) but `format=markdown` not confirmed; fewer advanced SPA options than Screenshotone |
| Screenshotone | Browserless | Browserless is $200/month minimum — overkill for a focused screenshot use case; designed for full browser automation |
| `qr-scanner` (nimiq) | `html5-qrcode` | `html5-qrcode` is unmaintained (last commit 2+ years ago) and depends on an unmaintained zxing-js port; nimiq's qr-scanner is actively maintained |
| `browser-image-compression` | Manual canvas resize | Canvas `toBlob()` is browser-inconsistent and has max size limits per browser; `browser-image-compression` handles edge cases including EXIF orientation, format support (JPEG/PNG/WebP/BMP), and uses WebWorker |

**Installation:**
```bash
npm install screenshotone-api-sdk qr-scanner browser-image-compression
```

---

## Architecture Patterns

### Recommended Project Structure

```
app/
├── scan/
│   └── page.tsx              # /scan — "use client" — tab UI (QR / URL / Photo)
├── menu/
│   └── [id]/
│       └── page.tsx          # /menu/[id] — Server Component — dish display (Phase 6)
└── api/
    ├── scan/
    │   ├── url/
    │   │   └── route.ts      # POST /api/scan/url — screenshot API → getOrParseMenu()
    │   └── photo/
    │       └── route.ts      # POST /api/scan/photo — image upload → vision OCR → getOrParseMenu()

components/
└── scan/
    ├── ScanTabs.tsx          # Tab switcher (QR | URL | Photo)
    ├── QrScanner.tsx         # "use client" — qr-scanner camera component
    ├── UrlInput.tsx          # "use client" — URL paste input + submit
    ├── PhotoUpload.tsx       # "use client" — camera/gallery + preview + compress
    └── ScanProgress.tsx      # "use client" — loading steps UI

lib/
├── screenshotone.ts          # "server-only" — Screenshotone client wrapper
├── cache.ts                  # Already exists — getOrParseMenu() (Phase 4)
└── openai.ts                 # Already exists — parseDishesFromMenu() (Phase 4)
```

### Pattern 1: URL Scan Flow (SPA-safe)

**What:** Client POSTs a URL string to `/api/scan/url`. Route Handler calls Screenshotone with `format=markdown` to get clean text from the SPA, then passes that text to `getOrParseMenu()`. Returns `{ menuId }` to client; client redirects to `/menu/[id]`.

**When to use:** For any URL input, including JavaScript SPAs like eazee-link.com.

```typescript
// app/api/scan/url/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getOrParseMenu } from '@/lib/cache';
import { screenshotoneClient } from '@/lib/screenshotone';

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  // Extract text from SPA via Screenshotone
  const menuText = await screenshotoneClient.extractText(url);

  // getOrParseMenu handles cache check + LLM call + Supabase write
  const menu = await getOrParseMenu(url, 'url', menuText);

  return NextResponse.json({ menuId: menu.id });
}
```

### Pattern 2: Photo OCR Flow (AI SDK Vision)

**What:** Client resizes image client-side to 1024px max (INFR-04), then POSTs a `multipart/form-data` request with the compressed image. Route Handler reads the image as `ArrayBuffer`, passes it to a modified `parseDishesFromMenu` call that uses `messages` with `ImagePart` + `output: Output.object()`.

**When to use:** Photo uploads of physical menus.

```typescript
// app/api/scan/photo/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { generateText, Output, NoObjectGeneratedError } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { dishResponseSchema } from '@/lib/types/llm';
import { getOrParseMenu } from '@/lib/cache';
import { getAdminConfig } from '@/lib/cache';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('image') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'Missing image' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const config = await getAdminConfig();

  const { experimental_output: output } = await generateText({
    model: openai(config.llm_model),
    output: Output.object({
      schema: z.object({ dishes: z.array(dishResponseSchema) }),
    }),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            image: arrayBuffer,
            mediaType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
          },
          {
            type: 'text',
            text: 'This is a photo of a restaurant menu. Extract all dishes with their names, descriptions, prices, and allergens.',
          },
        ],
      },
    ],
    system: MENU_PARSE_SYSTEM_PROMPT, // same prompt from lib/openai.ts
    maxRetries: 2,
  });

  // Use a synthetic URL for photo-based menus (no real URL to cache by)
  // Hash is based on image content digest or timestamp — prevents false cache hits
  const photoUrl = `photo:${Date.now()}`;
  const menu = await getOrParseMenu(photoUrl, 'photo', '[photo upload — no raw text]', output);

  return NextResponse.json({ menuId: menu.id });
}
```

> **Note on photo cache key:** Photo menus have no stable URL. Use a `photo:` prefix + timestamp as the synthetic URL so `hashUrl()` produces a unique hash. Each photo upload creates a new cache entry. SCAN-05 (instant repeat scan) applies to URL-based menus only; photo menus are one-shot by nature.

> **Note on `getOrParseMenu` signature:** For the photo path, `getOrParseMenu()` needs to accept a pre-parsed result to skip the LLM call. The Phase 4 implementation calls `parseDishesFromMenu(rawText)` internally. For Phase 5, either (a) add an optional `preParseResult` param to `getOrParseMenu`, or (b) implement the Supabase write directly in the photo route handler and skip `getOrParseMenu`. Option (a) is cleaner — the planner should choose this path.

### Pattern 3: QR Code Flow (In-Browser)

**What:** On mobile, the browser camera natively decodes QR codes and follows URLs — this is the zero-friction path. The in-app QR scanner (`qr-scanner`) is the secondary path for desktop or explicit scan intent. When a QR code is decoded, extract the URL from the result and route it through the URL scan flow.

**When to use:** When user clicks "Scan QR code" tab.

```typescript
// components/scan/QrScanner.tsx
'use client';
import { useEffect, useRef } from 'react';

// MUST use dynamic import — qr-scanner requires browser APIs
// The component itself uses 'use client' but qr-scanner still needs dynamic import
// because its WebWorker script requires browser context

export function QrScanner({ onResult }: { onResult: (url: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let scanner: import('qr-scanner').default | null = null;

    import('qr-scanner').then(({ default: QrScanner }) => {
      scanner = new QrScanner(
        videoRef.current!,
        (result) => {
          // result.data is the decoded string (URL for menu QR codes)
          onResult(result.data);
          scanner?.stop();
        },
        {
          preferredCamera: 'environment', // use rear camera on mobile
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );
      scanner.start();
    });

    return () => {
      scanner?.destroy();
    };
  }, [onResult]);

  return <video ref={videoRef} style={{ width: '100%' }} />;
}
```

```typescript
// Usage in scan page: decoded URL goes through the same URL scan handler
async function handleQrResult(decodedUrl: string) {
  const res = await fetch('/api/scan/url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: decodedUrl }),
  });
  const { menuId } = await res.json();
  router.push(`/menu/${menuId}`);
}
```

### Pattern 4: Client-Side Image Resize (INFR-04)

**What:** Before POSTing a photo, compress and resize the image to 1024px max dimension client-side. This is a hard requirement (INFR-04) — reduces upload size, speeds up processing, and avoids sending oversized images to GPT-4o Vision.

```typescript
// components/scan/PhotoUpload.tsx
'use client';
import imageCompression from 'browser-image-compression';

async function handleFileChange(file: File) {
  const options = {
    maxWidthOrHeight: 1024,  // INFR-04: 1024px max
    useWebWorker: true,      // keeps UI thread responsive
    maxSizeMB: 2,            // secondary size cap
    fileType: 'image/jpeg',  // normalize to JPEG for consistent output
  };

  const compressed = await imageCompression(file, options);
  // compressed is a File object — append directly to FormData
  return compressed;
}

async function handleSubmit(compressed: File) {
  const formData = new FormData();
  formData.append('image', compressed, 'menu.jpg');

  const res = await fetch('/api/scan/photo', {
    method: 'POST',
    body: formData,
    // Do NOT set Content-Type — browser sets multipart boundary automatically
  });
  const { menuId } = await res.json();
  router.push(`/menu/${menuId}`);
}
```

### Pattern 5: Screenshotone Text Extraction Wrapper

**What:** Server-only wrapper that calls Screenshotone with the right SPA parameters to get markdown text from a URL. Returned markdown is the `rawText` passed to `getOrParseMenu()`.

```typescript
// lib/screenshotone.ts
import 'server-only';
import * as screenshotone from 'screenshotone-api-sdk';

const client = new screenshotone.Client(
  process.env.SCREENSHOTONE_ACCESS_KEY!,
  process.env.SCREENSHOTONE_SECRET_KEY!
);

/**
 * Extract text content from a URL as markdown.
 * Uses networkidle2 wait for SPA rendering (eazee-link.com is a confirmed JS SPA).
 * Returns markdown string for LLM parsing.
 */
export async function extractMenuText(url: string): Promise<string> {
  // Use format=markdown to get clean text — avoids second LLM call to describe screenshot
  const options = screenshotone.TakeOptions.url(url)
    .format('markdown')
    .waitUntil(['networkidle2'])   // SPA-safe — waits for JS execution
    .fullPage(true)                // capture entire page for lazy-loaded content
    .delay(2);                     // extra buffer for slow SPAs

  // generate a signed URL and fetch the markdown response
  const apiUrl = client.generateSignedTakeUrl(options);
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`Screenshotone error: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  if (!text || text.trim().length < 50) {
    throw new Error('Screenshotone returned empty or near-empty content — URL may be invalid');
  }

  return text;
}
```

> **Note:** Screenshotone's `format=markdown` returns the page's text content as markdown directly. This is preferable to `format=png` + vision OCR because it (a) produces cleaner text than image-based OCR for web pages, and (b) costs fewer tokens when fed to the LLM. Confirmed via ScreenshotOne docs: `format` accepts `markdown` as a valid value.

### Pattern 6: Loading UX (Progress Steps)

**What:** During the 5-15 second pipeline execution (Screenshotone + LLM call), show a step-based progress indicator. Never leave the user looking at a blank screen.

**Recommended approach:** Optimistic multi-step UI with client-side `useTransition` or manual step state. SSE is overkill unless the server can produce genuine granular progress events.

```typescript
// components/scan/ScanProgress.tsx
'use client';
import { useState } from 'react';

const STEPS = [
  { id: 'reading', label: 'Reading menu...' },
  { id: 'parsing', label: 'Identifying dishes...' },
  { id: 'translating', label: 'Translating...' },
  { id: 'done', label: 'Done!' },
];

// Pattern: advance steps on a timer while actual request runs
// If request completes before timer, jump to done
export function ScanProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="scan-progress">
      {STEPS.map((step, i) => (
        <div
          key={step.id}
          className={`step ${i < currentStep ? 'completed' : i === currentStep ? 'active' : 'pending'}`}
        >
          {step.label}
        </div>
      ))}
    </div>
  );
}
```

**Timing rationale:** Screenshotone extraction typically takes 3-7s for SPAs. LLM parsing takes 3-8s. Total expected: 6-15s. Three progress steps with 4s intervals covers the 95th percentile without the user feeling stuck.

### Pattern 7: Scan Page Tab Layout

**What:** Three methods presented as tabs on `/scan`. Tabs are the best pattern here because they allow the user to clearly understand the three distinct modalities, and only one method is relevant at a time. Cards would give equal visual weight to three options requiring different actions.

```
/scan page layout:

┌─────────────────────────────────┐
│  nomnomnom                 [≡]  │
├─────────────────────────────────┤
│                                 │
│     Scan a restaurant menu      │
│                                 │
│  ┌────────┬────────┬─────────┐  │
│  │ 📷 QR  │ 🔗 URL │ 🖼 Photo│  │
│  └────────┴────────┴─────────┘  │
│                                 │
│  [Active tab content]           │
│                                 │
│  QR: Camera viewfinder          │
│  URL: Paste input + Go button   │
│  Photo: Camera/gallery picker   │
│       + preview + Upload button │
│                                 │
└─────────────────────────────────┘
```

### Anti-Patterns to Avoid

- **Redirecting before menu exists:** Never push `/menu/[id]` until the Route Handler confirms the menu row is in Supabase and returns a valid ID. The route handler must complete the full pipeline first.
- **Setting Content-Type manually for FormData:** When using `fetch` with `FormData`, do NOT set `Content-Type: multipart/form-data` manually — the browser must set the boundary. Explicitly setting this header breaks multipart parsing.
- **SSR-rendering QR scanner:** `qr-scanner` requires browser APIs (`navigator.mediaDevices`, `HTMLVideoElement`). It will throw on the server. Always use dynamic import or `useEffect` guard.
- **Passing raw image URL to screenshot API for physical photos:** Physical menu photos are files, not URLs. Route them to `/api/scan/photo`, not `/api/scan/url`.
- **Caching photo results by timestamp:** Photo menus intentionally use a unique timestamp-based synthetic URL. Do not attempt to cache photo results by content hash unless a stable identifier exists.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR code decoding from camera | Custom camera + image scanning loop | `qr-scanner@1.4.2` | Handles WebWorker, BarcodeDetector API, camera permissions, iOS Safari quirks, scan region overlay — weeks of work |
| Client-side image resize | `<canvas>` + `toBlob()` | `browser-image-compression@2.0.2` | Canvas size limits vary by browser; EXIF orientation bugs; JPEG quality inconsistencies across browsers |
| SPA web scraping | Puppeteer, Playwright, or custom headless browser | Screenshotone API | Serverless environments (Vercel) cannot run Chromium; external API handles cold starts, scaling, stealth mode |
| LLM image parsing protocol | Custom OpenAI API calls | AI SDK `generateText` with `messages ImagePart` + `Output.object()` | AI SDK handles retries, error classification (`NoObjectGeneratedError`), and Zod validation of structured output |

**Key insight:** In a serverless Next.js environment, you cannot run a headless browser. Every scraping or screenshot task that requires JavaScript execution MUST go through an external API. There is no alternative to the screenshot API for SPA menus.

---

## Common Pitfalls

### Pitfall 1: QR Code Mobile Path — Native vs In-App
**What goes wrong:** Developer builds a full in-app QR scanner, but on mobile, users already have native QR scanning in their camera app — pointing at a QR code opens the URL in the browser directly. The in-app scanner sees zero usage on iOS/Android.
**Why it happens:** Web-based QR scanning is built for desktop or for contexts where native camera handling isn't available.
**How to avoid:** Frame the QR tab for desktop/intent users. On mobile, the native camera handle this entirely. In the scan UI, include a note: "On mobile, point your camera app at the QR code" as the primary instruction, with the in-app scanner as a fallback. The URL ultimately enters the same pipeline regardless.
**Warning signs:** Overbuilding the QR scanner UI; investing in framing overlays, torch controls, multi-camera switching for a path that mobile users won't take.

### Pitfall 2: Screenshotone Returns Empty for Some SPAs
**What goes wrong:** Some React SPAs use client-only rendering with no SSR, and the markdown extraction returns a nearly-empty document.
**Why it happens:** `wait_until=networkidle2` waits for network activity to settle but can't guarantee that the JavaScript framework has finished rendering content. The `delay` parameter is the backup.
**How to avoid:** Set `delay(2)` (2 seconds) in addition to `wait_until=networkidle2`. Validate the returned text length before calling the LLM — if `text.length < 50`, throw a recognizable error that the Route Handler can surface as "URL could not be read."
**Warning signs:** LLM receives empty or near-empty text; dishes array is empty; no error is thrown at the API level.

### Pitfall 3: Photo Upload Content-Type Header
**What goes wrong:** Client sets `Content-Type: multipart/form-data` manually, causing the request to fail because the boundary string is missing.
**Why it happens:** Developers copy JSON fetch patterns and modify the Content-Type without understanding that FormData sets this automatically.
**How to avoid:** Never set `Content-Type` when using `FormData` as the request body. Let the browser set it.
**Warning signs:** Route Handler receives malformed body; `req.formData()` throws or returns empty fields.

### Pitfall 4: qr-scanner WebWorker Script Not Found in Production
**What goes wrong:** QR scanner works in development but fails in production builds — `qr-scanner-worker.min.js` is not served.
**Why it happens:** `qr-scanner` loads its worker script via a dynamic import relative path. Next.js/webpack bundlers may not automatically copy the worker script to the correct output location.
**How to avoid:** Test in production build (`next build && next start`) before declaring SCAN-01 complete. If the worker fails, the library falls back to main-thread scanning (slower but functional). For the fallback to trigger correctly, verify the library version and check the `qr-scanner` npm docs for any Next.js-specific bundle configuration.
**Warning signs:** Console error about missing worker script; camera activates but no QR codes are decoded.

### Pitfall 5: `generateText` with `messages` + `output` — System Prompt Conflict
**What goes wrong:** When using `messages` (multi-turn format) instead of a single `prompt`, the `system` parameter still applies but some models handle the interplay differently. If both `system` and a `messages`-level system message are set, behavior may be unpredictable.
**Why it happens:** AI SDK 6 supports both `prompt` (single string) and `messages` (conversation array). For the photo OCR path, `messages` is required to include the image part. Adding `system` at the top level is the correct way to include the system prompt with `messages`.
**How to avoid:** For photo OCR: use `messages` for the image + text user turn, and `system` as a top-level parameter for the instruction prompt. Do NOT embed a system role message inside the `messages` array. This is the pattern verified from AI SDK official docs.
**Warning signs:** LLM ignores system prompt instructions; structured output schema violations increase.

### Pitfall 6: `getOrParseMenu` Photo Path Coupling
**What goes wrong:** The current `getOrParseMenu()` in `lib/cache.ts` calls `parseDishesFromMenu(rawText)` internally — it expects text input and calls the LLM itself. For the photo path, the LLM has already been called (with the image) in the Route Handler before `getOrParseMenu` is invoked.
**Why it happens:** Phase 4 designed `getOrParseMenu` for text-based pipelines. Photo is a vision-based pipeline.
**How to avoid:** Two options:
  1. **Add `preParseResult` parameter** to `getOrParseMenu` — if provided, skip the LLM call and use the provided parsed result for the Supabase write. This is the cleanest approach.
  2. **Inline the Supabase write** in the photo route handler, bypassing `getOrParseMenu` entirely.
  Option 1 is recommended — keeps the cache write logic centralized.
**Warning signs:** Duplicate LLM calls for photo uploads; or photo results never cached (because cache write was skipped).

### Pitfall 7: Blank Screen During Parse (>5s)
**What goes wrong:** User submits URL or photo, sees a loading spinner, wait 8+ seconds with no feedback, and assumes the app is broken.
**Why it happens:** Screenshotone + LLM is genuinely slow (6-15s combined). A simple spinner without progress steps creates anxiety.
**How to avoid:** Use multi-step progress UI. Advance steps on a timer while the request runs (e.g., every 4 seconds). If the request finishes early, immediately jump to the done state. If it takes longer than expected (>15s), show a "Still working..." message to prevent abandonment.
**Warning signs:** User-facing feedback shows "Loading..." with no granularity; LLM parse timeout rates are high (user navigated away).

---

## Code Examples

Verified patterns from official sources:

### AI SDK 6: generateText with Image Part + Output.object (Vision OCR)

```typescript
// Source: https://ai-sdk.dev/cookbook/node/generate-text-with-image-prompt
// Source: https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text
import { generateText, Output, NoObjectGeneratedError } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { dishResponseSchema } from '@/lib/types/llm';

const { experimental_output: output } = await generateText({
  model: openai('gpt-4o-mini'),
  output: Output.object({
    schema: z.object({ dishes: z.array(dishResponseSchema) }),
  }),
  system: MENU_PARSE_SYSTEM_PROMPT,
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'image',
          image: arrayBuffer,          // ArrayBuffer from file.arrayBuffer()
          mediaType: 'image/jpeg',     // IANA media type
        },
        {
          type: 'text',
          text: 'Extract all dishes from this menu photo.',
        },
      ],
    },
  ],
  maxRetries: 2,
});
// output is typed as { dishes: DishResponse[] }
```

### browser-image-compression: Resize to 1024px Max (INFR-04)

```typescript
// Source: https://github.com/Donaldcwl/browser-image-compression
import imageCompression from 'browser-image-compression';

async function compressForUpload(file: File): Promise<File> {
  return imageCompression(file, {
    maxWidthOrHeight: 1024,   // INFR-04 requirement
    useWebWorker: true,       // non-blocking — critical for mobile performance
    maxSizeMB: 2,             // secondary cap
    fileType: 'image/jpeg',   // normalize output format
    // onProgress: (p) => setProgress(p),  // optional: 0-100 progress callback
  });
}
```

### qr-scanner: Minimal Camera Scanner Setup

```typescript
// Source: https://github.com/nimiq/qr-scanner/blob/master/README.md
// Dynamic import required — browser APIs only
const { default: QrScanner } = await import('qr-scanner');

const scanner = new QrScanner(
  videoElement,
  (result) => {
    console.log('Decoded:', result.data);   // result.data is the URL string
    scanner.stop();
    onResult(result.data);
  },
  {
    preferredCamera: 'environment',  // rear camera on mobile
    highlightScanRegion: true,       // visual scan region overlay
    highlightCodeOutline: true,      // highlights found QR code
  }
);

await scanner.start();

// Cleanup on unmount
scanner.destroy();
```

### Screenshotone SDK: Text Extraction

```typescript
// Source: https://screenshotone.com/docs/options/
// Source: npm screenshotone-api-sdk@1.1.21
import 'server-only';
import * as screenshotone from 'screenshotone-api-sdk';

const client = new screenshotone.Client(
  process.env.SCREENSHOTONE_ACCESS_KEY!,
  process.env.SCREENSHOTONE_SECRET_KEY!
);

const options = screenshotone.TakeOptions.url(url)
  .format('markdown')           // returns markdown text, not image binary
  .waitUntil(['networkidle2'])  // SPA-safe navigation wait
  .fullPage(true)               // capture lazy-loaded content
  .delay(2);                    // extra 2s for slow SPAs

const signedUrl = client.generateSignedTakeUrl(options);
const response = await fetch(signedUrl);
const menuMarkdown = await response.text();
```

### Next.js Route Handler: FormData File Upload

```typescript
// Source: https://nextjs.org/docs/app/getting-started/route-handlers
// Source: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('image') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 });
  }

  // File → ArrayBuffer for AI SDK ImagePart
  const arrayBuffer = await file.arrayBuffer();
  // ... pass to generateText with image content
}
```

### Client Redirect After Route Handler

```typescript
// Source: https://nextjs.org/docs/app/guides/redirecting
'use client';
import { useRouter } from 'next/navigation';

const router = useRouter();

async function handleScanComplete(endpoint: string, body: RequestInit['body'], contentType?: string) {
  setStep('reading');
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: contentType ? { 'Content-Type': contentType } : undefined,
    body,
  });

  if (!res.ok) {
    const { error } = await res.json();
    setError(error ?? 'Scan failed');
    return;
  }

  const { menuId } = await res.json();
  setStep('done');
  router.push(`/menu/${menuId}`);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `html5-qrcode` for in-browser QR | `qr-scanner` (nimiq) | 2023 (html5-qrcode went unmaintained) | nimiq library is actively maintained, lighter, uses WebWorker |
| Puppeteer/Playwright for SPA scraping | External screenshot API (Screenshotone) | 2022+ (serverless constraints) | Serverless cannot run headless Chromium; external API is the only viable path on Vercel |
| Tesseract.js for OCR | GPT-4o Vision via AI SDK | 2024 (project decision) | Tesseract freezes mobile browsers via WASM; GPT-4o Vision is more accurate on restaurant menus |
| `generateObject` for structured LLM output | `generateText` + `Output.object()` | AI SDK 6 (late 2025) | `generateObject` deprecated; unified API |
| Separate OCR + parse calls | Single `generateText` with image + `Output.object()` | AI SDK 6 vision support | Images composable with structured output in one call |

**Deprecated/outdated:**
- `html5-qrcode`: Unmaintained since ~2022; depends on an unmaintained zxing-js port. Do not use.
- `Tesseract.js`: Ruled out by project decision — WASM kills low-RAM mobile browsers.
- `generateObject` from `ai`: Deprecated in AI SDK 6; still works but do not use for new code.

---

## Screenshot API Vendor Recommendation

**Recommendation: Screenshotone**

| Criterion | Screenshotone | APIFlash | Browserless |
|-----------|--------------|----------|-------------|
| `format=markdown` (text extraction) | Yes (confirmed) | Not confirmed | Not applicable (full automation tool) |
| SPA/JS rendering | Yes (`networkidle2`, `delay`) | Yes (auto-detect) | Yes (full Chromium) |
| Free tier | 100/month | 100/month | None |
| Basic plan | $17/month (2,000 screenshots) | $7/month (1,000) | $200/month |
| TypeScript SDK | Yes (`screenshotone-api-sdk`) | No SDK (manual API) | Yes (full SDK) |
| Overkill for this use? | No — right-sized | Cheaper but feature-limited | Yes — overkill, expensive |

**Why Screenshotone wins:** The `format=markdown` capability is the deciding factor. Instead of getting a screenshot image and paying for another vision LLM call to extract text from the image, Screenshotone returns the page's text content directly as markdown. This halves the processing cost per URL scan. The TypeScript SDK simplifies integration. The $17/month plan covers 2,000 scans/month — adequate for v1.1 usage volumes.

**Environment variables to add:**
```
SCREENSHOTONE_ACCESS_KEY=<from screenshotone.com dashboard>
SCREENSHOTONE_SECRET_KEY=<from screenshotone.com dashboard>
```

---

## Open Questions

1. **`getOrParseMenu()` signature for photo path**
   - What we know: Current implementation in `lib/cache.ts` calls the LLM internally with `rawText`. Photo path has already called the LLM before `getOrParseMenu`.
   - What's unclear: Should we add `preParseResult?: { dishes: DishResponse[] }` to `getOrParseMenu`, or write a separate `storeParseResult()` function for the photo path?
   - Recommendation: Add optional `preParseResult` to `getOrParseMenu`. If provided, skip the LLM call and proceed directly to Supabase write. This keeps cache write logic in one place.

2. **Screenshotone `format=markdown` output quality for eazee-link.com specifically**
   - What we know: Screenshotone confirms `format=markdown` support; `networkidle2` + `delay` covers most SPAs.
   - What's unclear: eazee-link.com hasn't been tested directly. Markdown output quality depends on how the SPA structures its DOM.
   - Recommendation: Test during implementation. If markdown output is poor, fallback to `format=png` + GPT-4o vision (same path as photo upload). Add a content-length check (`< 100 chars` → fallback path).

3. **Screenshotone SDK `format('markdown')` method availability**
   - What we know: Screenshotone API docs confirm `format=markdown`. SDK version is 1.1.21.
   - What's unclear: Whether `TakeOptions.format('markdown')` is exposed in the TypeScript SDK's type definitions. May need to use raw fetch with query params if the SDK method rejects unknown format values.
   - Recommendation: Check SDK types at implementation time. If `.format('markdown')` isn't typed, use `generateSignedTakeUrl` with manual URL params or raw fetch.

4. **Vercel function timeout for URL scan path**
   - What we know: Screenshotone takes 3-7s for SPAs; LLM takes 3-8s; total is 6-15s. Vercel Hobby plan has a 10s function timeout; Pro plan is 60s.
   - What's unclear: Which Vercel plan this project targets.
   - Recommendation: If on Hobby plan, this pipeline may timeout. Add `export const maxDuration = 60` to Route Handlers (Pro feature). If Hobby, consider streaming response or reducing LLM max tokens to compress parse time.

---

## Sources

### Primary (HIGH confidence)
- [AI SDK `generateText` reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text) — `messages` with `ImagePart`, `output: Output.object()` pattern, `experimental_output` field
- [AI SDK cookbook: generate-text-with-image-prompt](https://ai-sdk.dev/cookbook/node/generate-text-with-image-prompt) — verified image message format with ArrayBuffer and URL inputs
- [nimiq/qr-scanner README](https://github.com/nimiq/qr-scanner/blob/master/README.md) — full API, constructor options, `preferredCamera`, `start()`/`destroy()`, dynamic import requirement
- [browser-image-compression GitHub](https://github.com/Donaldcwl/browser-image-compression) — `maxWidthOrHeight`, `useWebWorker`, `onProgress` options
- [Screenshotone docs: options](https://screenshotone.com/docs/options/) — `format`, `wait_until`, `full_page`, `delay` parameters
- [Screenshotone docs: getting started](https://screenshotone.com/docs/getting-started/) — SDK usage, `TakeOptions` pattern
- [Screenshotone pricing page](https://screenshotone.com/pricing/) — free tier (100/month), Basic ($17/month, 2,000/month)
- [Next.js Route Handlers docs](https://nextjs.org/docs/app/getting-started/route-handlers) — `req.formData()`, `NextRequest`, `NextResponse`
- [Next.js redirecting docs](https://nextjs.org/docs/app/guides/redirecting) — `redirect()` server-side, `router.push()` client-side
- [screenshotone-api-sdk npm](https://www.npmjs.com/package/screenshotone-api-sdk) — version 1.1.21

### Secondary (MEDIUM confidence)
- [Screenshotone Next.js blog](https://screenshotone.com/blog/nextjs-screenshots/) — Route Handler integration pattern, fetch-based SDK usage
- [Screenshotone changelog: website to markdown](https://screenshotone.com/changelog/website-to-markdown-format/) — confirms `format=markdown` was added (changelog entry)
- [Screenshotone llms-full.txt](https://screenshotone.com/docs/llms-full.txt) — `metadata_content`, `metadata_content_format=markdown`, `response_type=json` parameters
- [SSE in Next.js 15 — HackerNoon](https://hackernoon.com/streaming-in-nextjs-15-websockets-vs-server-sent-events) — `ReadableStream` Route Handler pattern, `X-Accel-Buffering: no` header requirement
- [Upstash blog: SSE for LLM responses](https://upstash.com/blog/sse-streaming-llm-responses) — `force-dynamic`, `ReadableStream` + `TextEncoder` pattern

### Tertiary (LOW confidence — flag for validation)
- [derrick-app.com screenshot API comparison 2026](https://derrick-app.com/en/screenshot-api-2/) — Screenshotone vs APIFlash pricing/speed comparison (third-party, not official)
- [scrapfly.io screenshot API comparison](https://scrapfly.io/blog/posts/what-is-the-best-screenshot-api) — multi-vendor comparison (independently written)
- `qr-scanner@1.4.2` version confirmed via `npm info qr-scanner version` (run 2026-02-25)
- `browser-image-compression@2.0.2` version confirmed via `npm info browser-image-compression version` (run 2026-02-25)
- `screenshotone-api-sdk@1.1.21` version confirmed via `npm info screenshotone-api-sdk version` (run 2026-02-25)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm versions verified live; AI SDK patterns from official docs; Screenshotone patterns from official docs/SDK
- Architecture: HIGH — Next.js Route Handler patterns well-established; FormData handling verified; client-side redirect pattern standard
- Screenshot API vendor: MEDIUM — Screenshotone recommendation supported by multi-source comparison and official docs; `format=markdown` method availability in SDK not verified at type level
- Pitfalls: MEDIUM-HIGH — QR native path pitfall from practical knowledge; WASM pitfall from project prior decision; FormData boundary pitfall well-documented
- Loading UX: MEDIUM — step-based timer approach is a design recommendation, not a verified pattern from a specific source

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (30 days — screenshotone pricing and SDK version may change; qr-scanner and browser-image-compression are stable)
