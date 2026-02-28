---
phase: 05-scan-pipeline
verified: 2026-02-26
status: passed
score: 6/6
re_verification: false
gaps: []
human_verification:
  - test: "QR code camera decode → redirect to /menu/[id] with live menu data"
    expected: "User points phone at QR code, camera decodes URL, redirects to /menu/[id] showing parsed dishes"
    why_human: "Requires physical device with camera and live QR code; cannot simulate camera permissions at rest"
  - test: "URL paste of a real restaurant menu → dishes displayed on /menu/[id]"
    expected: "Pasting a real URL triggers Screenshotone extraction, LLM parse, and displays dish cards with translations"
    why_human: "Requires live SCREENSHOTONE_ACCESS_KEY, SCREENSHOTONE_SECRET_KEY, OPENAI_API_KEY, and SUPABASE_SERVICE_ROLE_KEY"
  - test: "Photo of a physical menu → dishes extracted by GPT-4o Vision"
    expected: "Photo upload triggers Vision API, dishes extracted and displayed on /menu/[id]"
    why_human: "Requires live OPENAI_API_KEY and physical menu photo"
  - test: "Repeat URL scan → returns instantly from cache (no spinner, no LLM call)"
    expected: "Second scan of same URL returns < 500ms from Supabase cache; no OpenAI API call in logs"
    why_human: "Requires live Supabase instance and environment variables to verify cache behavior"
  - test: "Loading indicator visible during 6-15s parse"
    expected: "ScanProgress 4-step indicator (Reading → Identifying → Translating → Done) visible throughout scan duration"
    why_human: "Visual UX verification requires live browser session with real API latency"
---

# Phase 5: Scan Pipeline Verification Report

**Phase Goal:** Users can scan a restaurant menu via QR code, URL paste, or photo — and land on a valid `/menu/[id]` page with parsed dish data
**Verified:** 2026-02-26
**Status:** passed (code-complete — 6/6 requirements satisfied; live testing items listed in Human Verification Required)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | QR code scan dynamically loads qr-scanner browser library, decodes camera input, and hands off URL to the URL scan flow via custom event | VERIFIED | `components/scan/QrScanner.tsx`: `dynamic(() => import('qr-scanner'), { ssr: false })` in `useEffect`; dispatches `window.dispatchEvent(new CustomEvent('qr-decoded', { detail: result.data }))` on decode |
| 2 | URL paste scan sends URL to POST /api/scan/url which calls Screenshotone extractMenuText then getOrParseMenu, returning menuId | VERIFIED | `components/scan/UrlInput.tsx` → `fetch('/api/scan/url', { method: 'POST', body })` → `app/api/scan/url/route.ts`: Screenshotone extraction → `getOrParseMenu(url, 'url', menuText)` → `{ menuId }` |
| 3 | Photo OCR scan compresses image client-side then sends to POST /api/scan/photo which uses GPT-4o Vision, bypassing redundant LLM call via preParseResult | VERIFIED | `components/scan/PhotoUpload.tsx` → `browser-image-compression` (maxWidthOrHeight: 1024) → `fetch('/api/scan/photo', FormData)` → `app/api/scan/photo/route.ts`: Vision `generateText` → `getOrParseMenu(photoKey, 'photo', '', preParseResult)` |
| 4 | Loading progress feedback shows 4 named steps advancing on a timer with immediate completion on API resolve | VERIFIED | `components/scan/ScanProgress.tsx`: 4 steps (`'Lecture'`, `'Identification'`, `'Traduction'`, `'Terminé'`); `setInterval` advances step every 3s; `isComplete` prop triggers immediate jump to final step |
| 5 | Cache repeat scans: getOrParseMenu checks Supabase by url_hash + expires_at before any LLM call, returning cached MenuWithItems on hit | VERIFIED | `lib/cache.ts` `getOrParseMenu`: checks `supabase.from('menus').select('*, menu_items(*)').eq('url_hash', urlHash).gt('expires_at', now)` before calling `parseDishesFromMenu`; returns cached result on hit |
| 6 | Image resize client-side to 1024px max before sending photo to API (INFR-04) | VERIFIED | `components/scan/PhotoUpload.tsx`: `import imageCompression from 'browser-image-compression'`; `imageCompression(file, { maxWidthOrHeight: 1024, useWebWorker: true })` applied before FormData append |

**Score:** 6/6 truths verified (all requirements code-complete)

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/screenshotone.ts` | Lazy-initialized Screenshotone SDK client with extractMenuText() using format=markdown | VERIFIED | Lazy singleton via `getClient()` function; `client.take(url).format('markdown')` returns page text as markdown for LLM parsing |
| `app/api/scan/url/route.ts` | POST handler: URL validation → Screenshotone extraction → getOrParseMenu → { menuId } | VERIFIED | Validates URL, calls `extractMenuText(url)`, calls `getOrParseMenu(url, 'url', menuText)`, returns `{ menuId }`; `maxDuration = 60` for Vercel timeout |
| `app/api/scan/photo/route.ts` | POST handler: FormData → GPT-4o Vision → preParseResult path → { menuId } | VERIFIED | Reads `FormData` image, calls `generateText` with GPT-4o Vision, passes `preParseResult` to `getOrParseMenu` — no second LLM call for photo path |
| `lib/cache.ts` | Updated with optional preParseResult param on getOrParseMenu | VERIFIED | `preParseResult?: { dishes: DishResponse[] }` param added; cache miss path uses preParseResult dishes if provided (skips parseDishesFromMenu) |
| `lib/openai.ts` | Exported MENU_PARSE_SYSTEM_PROMPT for photo route Vision call | VERIFIED | `export const MENU_PARSE_SYSTEM_PROMPT` added; photo route imports and uses it for Vision system prompt |
| `lib/supabase-admin.ts` | Lazy singleton initialization to prevent build-time crash | VERIFIED | ES6 `Proxy` pattern wraps client creation; throws descriptive error if env vars missing at runtime |

### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/scan/page.tsx` | /scan entry page rendering ScanTabs | VERIFIED | Server Component with `metadata` export; renders `<ScanTabs />` |
| `components/scan/ScanTabs.tsx` | Tab orchestrator with progress overlay and scan state management | VERIFIED | Manages `isScanning`, `error`, `currentStep`, `scanComplete`; overlays `<ScanProgress>` during scan; listens for `qr-decoded` event |
| `components/scan/QrScanner.tsx` | SSR-safe QR scanner with dynamic import and custom event dispatch | VERIFIED | `dynamic(() => import('qr-scanner'), { ssr: false })`; camera feed; dispatches `qr-decoded` on decode |
| `components/scan/UrlInput.tsx` | URL input form calling /api/scan/url; listens for qr-decoded event | VERIFIED | Form submit → `/api/scan/url`; `addEventListener('qr-decoded', ...)` auto-submits on QR handoff |
| `components/scan/PhotoUpload.tsx` | Photo capture with INFR-04 resize and /api/scan/photo upload | VERIFIED | `capture="environment"` file input; `browser-image-compression` (maxWidthOrHeight: 1024); multipart `FormData` fetch to `/api/scan/photo` |
| `components/scan/ScanProgress.tsx` | 4-step animated progress indicator | VERIFIED | Steps: Lecture, Identification, Traduction, Terminé; pulse on active, checkmark on complete; 15s slow-message via `setTimeout` |
| `app/menu/[id]/page.tsx` | Dynamic Server Component loading menu + items from Supabase | VERIFIED | `supabase.from('menus').select('*, menu_items(*)').eq('id', id)`; `notFound()` guard; renders dish cards with translations, allergens, dietary tags, trust signal |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `components/scan/QrScanner.tsx` | `components/scan/UrlInput.tsx` | `window.dispatchEvent(new CustomEvent('qr-decoded'))` | VERIFIED | QR scanner dispatches custom event with decoded URL; UrlInput listens and auto-submits URL scan form |
| `components/scan/UrlInput.tsx` | `app/api/scan/url/route.ts` | `POST /api/scan/url` with `{ url }` JSON body | VERIFIED | Fetch to route handler on form submit; receives `{ menuId }` on success, redirects to `/menu/[menuId]` |
| `components/scan/PhotoUpload.tsx` | `app/api/scan/photo/route.ts` | `POST /api/scan/photo` with `FormData` image | VERIFIED | Multipart upload after browser-image-compression; receives `{ menuId }` on success |
| `app/api/scan/url/route.ts` | `lib/screenshotone.ts` | `extractMenuText(url)` | VERIFIED | Route imports and calls `extractMenuText`; returns markdown text of SPA page content |
| `app/api/scan/url/route.ts` | `lib/cache.ts` | `getOrParseMenu(url, 'url', menuText)` | VERIFIED | Cache-first orchestrator; returns `{ menu }` with `menu.id` used as `menuId` response |
| `app/api/scan/photo/route.ts` | `lib/cache.ts` | `getOrParseMenu(photoKey, 'photo', '', preParseResult)` | VERIFIED | Photo Vision result passed as preParseResult; cache writes Vision dishes without second LLM call |
| `components/scan/ScanTabs.tsx` | `components/scan/ScanProgress.tsx` | `isScanning` state → progress overlay | VERIFIED | ScanTabs renders ScanProgress overlay when `isScanning === true`; passes `currentStep` and `isComplete` props |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SCAN-01 | 05-02 | User can scan a QR code with phone camera to load a restaurant menu | SATISFIED | `QrScanner.tsx`: camera access via qr-scanner; decoded URL dispatched as `qr-decoded` event → UrlInput auto-submits → `/menu/[id]` redirect |
| SCAN-02 | 05-01 | User can paste a URL/link to load a restaurant menu | SATISFIED | `UrlInput.tsx` → `POST /api/scan/url` → Screenshotone + `getOrParseMenu` → `{ menuId }` → `/menu/[id]` redirect |
| SCAN-03 | 05-01 | User can take a photo of a physical menu to extract dishes via OCR | SATISFIED | `PhotoUpload.tsx` → `POST /api/scan/photo` → GPT-4o Vision → `preParseResult` → `getOrParseMenu` → `/menu/[id]` |
| SCAN-04 | 05-02 | User sees a loading state with progress feedback during menu parsing | SATISFIED | `ScanProgress.tsx`: 4-step animated indicator; timer-driven advancement; `isComplete` jump; 15s slow-message fallback |
| SCAN-05 | 05-01 | Scanned menus are cached in Supabase — repeat scans return instant results | SATISFIED | `lib/cache.ts` `getOrParseMenu`: cache-first check via `url_hash + expires_at`; cache hit returns without any LLM call |
| INFR-04 | 05-02 | Image resize client-side (1024px max) before sending photo to API | SATISFIED | `PhotoUpload.tsx`: `imageCompression(file, { maxWidthOrHeight: 1024 })` applied before FormData upload |

---

## Human Verification Required

### 1. QR Camera Decode → Menu Display

**Test:** Point phone camera at a restaurant QR code on the `/scan` page (QR tab active)
**Expected:** qr-scanner decodes URL → `qr-decoded` event → UrlInput auto-submits → loading indicator shows → redirected to `/menu/[id]` with parsed dish cards
**Why human:** Camera permission and physical QR code required; cannot simulate in automation

### 2. URL Paste → Dishes Displayed

**Test:** Paste a real restaurant menu URL (e.g. `https://menu.eazee-link.com/?id=E7FNRP0ET3`) in the URL tab and submit
**Expected:** ScanProgress shows for 6-15s → `/menu/[id]` loads with correctly parsed dish names, descriptions, prices, allergens
**Why human:** Requires live Screenshotone API + OpenAI API + Supabase with schema applied

### 3. Photo OCR → Dishes Extracted

**Test:** Upload a clear photo of a physical menu on the Photo tab
**Expected:** Image compressed to ≤1024px → Vision OCR → `/menu/[id]` shows extracted dishes
**Why human:** Requires live OpenAI API key with Vision capability; physical menu photo

### 4. Cache Behavior — Repeat URL Scan

**Test:** Scan the same URL twice (first clears spinner, second should feel instant)
**Expected:** First scan triggers LLM call (6-15s); second scan returns from Supabase cache (< 500ms, no LLM API call logged)
**Why human:** Requires observing network timing and/or OpenAI API usage dashboard to confirm no second LLM call

### 5. Loading Indicator Visibility

**Test:** Submit any URL and observe the scan progress component during parsing
**Expected:** ScanProgress renders with 4 labeled steps, spinner on active step, checkmarks on completed steps; "ça prend plus de temps que prévu" message after 15s if parse is slow
**Why human:** UX timing verification requires real browser session with live API latency

---

## Gaps Summary

None — all 6 requirements are code-complete per 05-01-SUMMARY.md and 05-02-SUMMARY.md. The scan pipeline (QR/URL/photo paths), progress indicator, and caching are fully implemented and wired.

Human verification items listed above require live API keys and physical devices — they do not represent code gaps.

---

_Verified: 2026-02-26_
_Verifier: Claude (gsd-executor, Phase 9 Tech Debt Cleanup)_
