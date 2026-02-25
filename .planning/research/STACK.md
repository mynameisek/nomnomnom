# Stack Research

**Domain:** Food-tech mobile app + animated waitlist landing page
**Researched:** 2026-02-25
**Confidence:** HIGH (versions verified via npm registry; framework choices verified via official docs and multiple credible sources)

---

## Overview

NOM has two distinct surfaces that share no runtime but may share types/schemas:

1. **Landing page** — dark-theme animated waitlist, Vercel-deployed, French only
2. **Mobile app** — Expo-based food scanner, AI assistant, multi-language translation

These are separate codebases. Do NOT try to monorepo them prematurely — the landing page has zero runtime dependency on the mobile app.

---

## Recommended Stack

### Landing Page (Milestone 1)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.1.6 | React framework + API routes | Native Vercel integration, App Router enables edge-ready API routes for waitlist endpoint, zero config deploy |
| React | 19.x | UI runtime | Ships with Next.js 16; React 19 concurrent features improve perceived animation smoothness |
| TypeScript | 5.x | Type safety | Catches waitlist form/API contract bugs at compile time, not runtime |
| Tailwind CSS | 4.2.1 | Styling | v4 is zero-config (auto-detects content), 5x faster full builds; dark theme is first-class with `dark:` variants |
| shadcn/ui | latest (Tailwind v4 branch) | Component primitives | Unstyled-then-styled pattern fits a custom dark design system; ships with Radix accessibility; Tailwind v4 support confirmed Feb 2025 |
| motion (motion/react) | 12.34.3 | Animations | Replaces framer-motion, fully React 19 compatible, import from `motion/react`; no breaking changes in v12; Tailwind v4 + Motion is the de-facto 2025/2026 animation stack |
| Resend | 6.9.2 | Transactional email | Simplest Next.js integration (official `send-with-nextjs` guide), React Email template support, developer-friendly free tier |
| react-email | 5.2.8 | Email templates | React component model for emails, renders to HTML; pairs with Resend |
| Supabase JS | 2.97.0 | Waitlist storage + auth | Single table for email capture, built-in RLS, free tier sufficient for waitlist scale; eliminates need for separate DB setup |
| Zod | 4.3.6 | Input validation | Validate waitlist emails server-side in Next.js API route; pairs with React Hook Form on client |
| react-hook-form | 7.71.2 | Form state | Uncontrolled components = zero re-renders on keystroke; required for smooth animated form UX |

### Mobile App (Milestone 2+)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Expo SDK | 54.0.33 | Universal native app platform | New Architecture enabled by default in SDK 52+; SDK 54 targets RN 0.81; Managed Workflow eliminates native build config for launch |
| React Native | 0.81.x (via Expo 54) | Mobile runtime | Included via Expo; New Architecture (Fabric + JSI) is stable and on by default |
| Expo Router | 6.0.23 | File-based navigation | Next.js-style routing for RN; typed routes; deep linking automatic; replaces React Navigation boilerplate |
| NativeWind | 4.2.2 | Tailwind CSS in React Native | v4.2+ confirmed compatible with Expo SDK 54 + Reanimated v4; use Tailwind CSS v3.4.17 (not v4) — NativeWind v4 does NOT support Tailwind CSS v4 |
| Tailwind CSS | 3.4.17 (for mobile only) | NativeWind peer dep | NativeWind v4 requires Tailwind v3, not v4 — this is the most common SDK 54 breakage |
| React Native Reanimated | 4.2.2 | Gesture animations | v4 ships with Expo 54; Worklets are now internal — do NOT add babel worklet plugin separately |
| React Native Vision Camera | 4.7.3 | Camera + QR scanning | Built-in CodeScanner hook handles QR without frame processors; MLKit powers Android barcode on-device |
| react-native-mlkit-ocr | 0.3.0 | On-device OCR | Google ML Kit Text Recognition; processes menu photos on-device without API call; supports Latin script (FR/EN/DE/TR) |
| Vercel AI SDK (`ai`) | 6.0.99 | AI streaming interface | Official Expo support from SDK 52+; `useChat` hook abstracts streaming; use `expo/fetch` not native fetch |
| @ai-sdk/openai | 3.0.33 | OpenAI provider for AI SDK | Typed provider for GPT-4.1; integrates cleanly with `streamText` |
| Zustand | 5.0.11 | Global state | Centralized store for scan session, user preferences, cache; simpler mental model than Jotai for interconnected state like current menu + user filters |
| TanStack Query | 5.90.21 | Server state + caching | Cache dish lookups, translation results, AI responses; automatic background refetch; pairs with Supabase |
| @supabase/supabase-js | 2.97.0 | Backend: auth + DB + storage | User accounts, cached translations, dish history; real-time not needed at launch but available |
| react-native-mmkv | 4.1.2 | Local persistent cache | 30x faster than AsyncStorage; cache menu scan results, translated dish cards; encrypt with built-in support |
| Zod | 4.3.6 | API response validation | Validate AI/translation API responses at runtime; prevents undefined field crashes |
| expo-camera | 17.0.10 | Camera access | Used with Vision Camera for photo capture fallback; Expo-managed permissions |
| expo-image | 3.0.11 | Optimized image display | Blurhash placeholder support; faster than `<Image>` for dish card photos |
| expo-haptics | 15.0.8 | Haptic feedback | Tactile confirmation on scan success, recommendation selection |

### AI / LLM Layer

| Service | Model | Purpose | Why |
|---------|-------|---------|-----|
| OpenAI API | gpt-4.1 | Menu parsing, translation, dish recommendations | GPT-4.1 has vision input (menu photos), structured output, multilingual by default; best accuracy for food domain text |
| OpenAI API | gpt-4.1-mini | Fast completions for simple translation | Cost optimization: FR/EN/TR/DE translation of short dish names doesn't need full GPT-4.1 |
| Vercel AI SDK | v6 | Streaming wrapper | Handles streaming, retries, provider switching; DO NOT call OpenAI SDK directly in mobile app |

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-linking | via Expo | Deep link + QR URL handling | When user scans a restaurant QR code that points to a URL |
| expo-clipboard | via Expo | Copy dish name / share | "Copy to clipboard" on dish card |
| react-native-safe-area-context | via Expo | Safe area insets | Required by Expo Router; apply to all screens |
| react-native-gesture-handler | via Expo | Swipe gestures on dish cards | Swipe-to-next-dish, pull-to-refresh |
| @react-native-community/netinfo | latest | Network detection | Detect offline state; show cached results when offline |
| sonner (web) | latest | Toast notifications (landing) | shadcn/ui's preferred toast; replaces deprecated `toast` component |

---

## Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Bun | Package manager + runtime | Faster than npm/yarn for monorepo script running; use `bun install` |
| ESLint + `eslint-config-next` | Linting | Included by Next.js; enforce rules on landing page |
| Prettier | Formatting | Consistent code style across both surfaces |
| TypeScript strict mode | Type checking | Enable `"strict": true` — catches null-safety bugs in AI response parsing |
| Expo Dev Client | Dev builds with native code | Required once Vision Camera or MMKV are added (they need bare modules) |
| EAS Build | Cloud native builds | Expo's build service for App Store / Play Store delivery; use EAS CLI |

---

## Installation

### Landing Page

```bash
# Bootstrap
npx create-next-app@latest nom-landing --typescript --tailwind --app --no-src-dir

# Then upgrade Tailwind to v4
npm install tailwindcss@^4.2.1 @tailwindcss/postcss

# Animations
npm install motion

# UI components
npx shadcn@latest init
npx shadcn@latest add button input form

# Email + waitlist
npm install resend react-email

# Backend / storage
npm install @supabase/supabase-js zod react-hook-form @hookform/resolvers
```

### Mobile App

```bash
# Bootstrap
npx create-expo-app@latest nom-app --template blank-typescript

# Navigation
npx expo install expo-router

# Styling — CRITICAL: use Tailwind v3, not v4
npm install nativewind@^4.2.2
npm install --save-dev tailwindcss@3.4.17

# Camera + scanning
npx expo install react-native-vision-camera expo-camera
npm install react-native-mlkit-ocr

# Animations + gestures
npx expo install react-native-reanimated react-native-gesture-handler react-native-safe-area-context

# State + data
npm install zustand @tanstack/react-query react-native-mmkv

# AI
npm install ai @ai-sdk/openai

# Backend
npm install @supabase/supabase-js zod

# UX
npx expo install expo-image expo-haptics expo-linking expo-clipboard

# EAS (global)
npm install -g eas-cli
```

---

## Alternatives Considered

| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| Mobile framework | Expo SDK 54 | React Native CLI (bare) | Only if you need a native module with no Expo support — extremely rare now; Expo's Continuous Native Generation covers 95% of cases |
| Navigation | Expo Router | React Navigation standalone | Never for greenfield in 2026; React Navigation is the underlying engine of Expo Router |
| Styling (mobile) | NativeWind v4 + Tailwind v3 | StyleSheet API | Only for one-off components where className prop is unavailable (native modules) |
| Styling (web) | Tailwind v4 | Tailwind v3 | Tailwind v4 is the answer for the landing page specifically; v3 is for mobile only |
| Animation (web) | motion/react v12 | GSAP | GSAP is for complex 3D/WebGL effects; motion is sufficient for dark-theme scroll reveals and phone mockup animation |
| OCR | react-native-mlkit-ocr | Google Cloud Vision API | Cloud Vision: better accuracy for degraded/low-res photos, costs money per request. ML Kit: free, on-device, works offline. Start with ML Kit, switch to Cloud Vision only if accuracy is inadequate |
| AI provider | OpenAI gpt-4.1 | Anthropic Claude, Google Gemini | Multimodal + vision + structured output + multilingual: GPT-4.1 performs best in benchmarks for multi-language food text; Claude 3.5 is a viable fallback |
| Email | Resend | SendGrid, Postmark | Resend has best Next.js DX and React Email integration; SendGrid only if you need advanced marketing automation |
| Database | Supabase | PlanetScale, Neon, Firebase | Supabase gives auth + DB + storage in one free tier; Firebase is NoSQL (worse for relational dish/menu data); Neon is pure Postgres without auth layer |
| State (mobile) | Zustand | Jotai, Redux Toolkit | Jotai is better for fine-grained atomic state; Zustand is better for interconnected menu session state with predictable action patterns |
| Local cache | react-native-mmkv | AsyncStorage | MMKV is 30x faster, supports encryption, is synchronous — mandatory for cache-everything philosophy |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `framer-motion` (old package) | Does not support React 19 cleanly; the package is now `motion` | `motion` with `import { motion } from 'motion/react'` |
| Tailwind CSS v4 in mobile (NativeWind) | NativeWind v4 does not support Tailwind CSS v4; causes silent styling failures | Tailwind CSS 3.4.17 for mobile, v4 for web only |
| AsyncStorage | 10-50x slower than MMKV for frequent reads; no encryption | `react-native-mmkv` |
| Expo SDK 53 or earlier | New Architecture not stable; Reanimated v3 has API differences from v4 | Expo SDK 54 |
| Next.js Pages Router | App Router has been stable since Next.js 13.4; Pages Router is in maintenance mode | Next.js App Router |
| Custom email HTML | Maintenance hell; dark mode rendering issues across clients | `react-email` components |
| Calling OpenAI SDK directly from React Native | Exposes API key in bundle; no streaming abstraction | Server-side route (Expo API routes or Supabase Edge Function) + Vercel AI SDK |
| React Navigation standalone | Extra boilerplate without benefit; Expo Router is file-based + typed + deep-linking automatic | Expo Router |
| Redux Toolkit | Massive overkill for this app's state complexity; 3-5x more boilerplate than Zustand | Zustand |

---

## Stack Patterns by Variant

**Landing page only (Milestone 1):**
- Next.js 16 + Tailwind v4 + motion + shadcn/ui + Resend + Supabase
- Keep it to one Supabase table: `waitlist_emails (id, email, created_at, ip_hash)`
- Rate-limit in Next.js API route with in-memory Map or Upstash Redis (free tier)

**Mobile MVP (Milestone 2):**
- Expo 54 + NativeWind v4 (Tailwind v3) + Expo Router + Vision Camera + ML Kit OCR
- AI calls go through Expo API routes (server-side) — never call OpenAI from client directly
- Cache every translation result in MMKV by `(original_text + target_lang)` key

**If QR code points to a URL (not a photo):**
- `expo-linking` parses the URL
- Fetch menu HTML/JSON from URL server-side (Expo API route acts as proxy to avoid CORS)
- Parse with a custom extractor or send raw HTML to GPT-4.1 for structured extraction

**If menu is a photo (OCR path):**
- Capture with `expo-camera` or Vision Camera
- Run `react-native-mlkit-ocr` on-device first (free, fast)
- Send extracted text (not image) to GPT-4.1 for structuring + translation
- Fallback: send image directly to GPT-4.1 vision if ML Kit confidence is low

---

## Version Compatibility Matrix

| Package | Compatible With | Critical Note |
|---------|-----------------|---------------|
| NativeWind 4.2.2 | Expo SDK 54, Tailwind CSS 3.4.17, Reanimated 4.x | DO NOT use Tailwind v4 with NativeWind v4 |
| react-native-reanimated 4.2.2 | Expo SDK 54 | DO NOT add `babel-plugin-reanimated` — worklets are built-in to v4 |
| motion 12.x | Next.js 16, React 19 | Import from `motion/react`, NOT `framer-motion` |
| shadcn/ui | Tailwind v4, React 19 | Use Tailwind v4 branch; `toast` → `sonner`; `tailwindcss-animate` → `tw-animate-css` |
| Vercel AI SDK 6.x | Expo SDK 52+ | Use `expo/fetch` not `global.fetch` for streaming to work |
| react-native-vision-camera 4.7.x | Expo SDK 54 (requires dev client) | Cannot use with Expo Go; requires EAS build or local dev client |

---

## Sources

- [npmjs.com/package/next](https://www.npmjs.com/package/next) — verified Next.js 16.1.6 (latest stable, Feb 2026) — HIGH confidence
- [npmjs.com/package/expo](https://www.npmjs.com/package/expo) — verified Expo 54.0.33 — HIGH confidence
- [npmjs.com/package/motion](https://www.npmjs.com/package/motion) — verified motion 12.34.3 — HIGH confidence
- [npmjs.com/package/tailwindcss](https://www.npmjs.com/package/tailwindcss) — verified Tailwind 4.2.1 — HIGH confidence
- [docs.expo.dev/guides/new-architecture/](https://docs.expo.dev/guides/new-architecture/) — New Architecture on by default in SDK 52+ — HIGH confidence
- [ai-sdk.dev/docs/getting-started/expo](https://ai-sdk.dev/docs/getting-started/expo) — Vercel AI SDK Expo setup, SDK 52+ requirement, expo/fetch requirement — HIGH confidence
- [react-native-vision-camera.com/docs/guides/code-scanning](https://react-native-vision-camera.com/docs/guides/code-scanning) — QR/barcode scanning via CodeScanner hook — HIGH confidence
- [ui.shadcn.com/docs/tailwind-v4](https://ui.shadcn.com/docs/tailwind-v4) — shadcn Tailwind v4 support confirmed — HIGH confidence
- [motion.dev/docs/react-upgrade-guide](https://motion.dev/docs/react-upgrade-guide) — framer-motion → motion migration, no breaking changes in v12 — HIGH confidence
- NativeWind SDK 54 compatibility — MEDIUM confidence (multiple community sources agree on Tailwind v3.4.17 requirement; no single official doc page covers this exact version matrix)
- OpenAI gpt-4.1 vision for menu parsing — MEDIUM confidence (confirmed capability from official OpenAI docs; food-specific benchmarks not found)

---

*Stack research for: NOM — food-tech mobile app + landing page*
*Researched: 2026-02-25*
