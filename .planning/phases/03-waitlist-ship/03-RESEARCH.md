# Phase 3: Waitlist + Ship - Research

**Researched:** 2026-02-25
**Domain:** Supabase waitlist + referral system, Next.js Server Actions, OG image generation, Lighthouse performance, semantic HTML
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

_No hard-locked user decisions — all implementation areas are Claude's discretion._

### Claude's Discretion

User granted full discretion across all implementation areas.

**Referral mechanics:**
- Unique referral link generated after signup using a short hash/code (e.g., `?ref=abc123`)
- "Moving up the queue" = referral count displayed, position decreases as friends sign up via your link
- Position calculated as: signup order minus referral bonus (simple formula — each referral moves you up N spots)
- Referral dashboard shows: your position, number of friends referred, your unique share link with copy button
- Keep it simple — no complex tier system, just a linear queue with referral bumps

**Signup flow & feedback:**
- Email validation (format check + prevent obvious junk)
- Duplicate email handling: show friendly message "Tu es déjà inscrit(e) !" with their existing referral link
- Success state: "Parfait ! On te prévient dès que c'est prêt." (exact copy from requirements)
- After success: reveal referral dashboard inline (no separate page) — share link, position, referral count
- Error states: network error with retry suggestion, validation error inline on the input

**SEO & launch assets:**
- OG image: branded dark card with NŌM logo, tagline, and food imagery — generate as a static asset
- Meta title: "NŌM — Scanne le menu. Comprends chaque plat."
- Meta description: concise FR pitch mentioning scan, translation, 50+ languages
- Twitter card: summary_large_image format
- No analytics pixels for now

**Performance targets:**
- Lighthouse performance > 80 on simulated 3G (requirement PERF-02)
- All Unsplash images lazy-loaded with gradient+emoji fallbacks (already partially done in Phase 2)
- Semantic HTML with proper headings and landmarks

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WAIT-01 | Email input form with validation and "C'est parti" submit button | Server Action + `useActionState` pattern; Zod-lite email regex validation server-side; HTML `required` + `type="email"` client-side |
| WAIT-02 | Success feedback message "Parfait ! On te prévient dès que c'est prêt." | State returned from Server Action drives conditional UI render in Client Component |
| WAIT-03 | Emails stored in Supabase backend | Supabase `waitlist` table with UNIQUE constraint; anon INSERT RLS policy; `supabase.from('waitlist').insert()` |
| WAIT-04 | Referral system: unique referral link after signup | `ref_code` column generated server-side (nanoid/Math.random short hash); returned to client for display |
| WAIT-05 | Referring friends moves user up in queue | `referrer_code` column on each signup row; Supabase DB trigger or SQL function counts referrals and adjusts effective position |
| WAIT-06 | Referral dashboard: position + friend count visible | Derived from SQL: `SELECT COUNT(*) FROM waitlist WHERE referrer_code = $code` + position query; displayed inline after success |
| PERF-01 | Animations run at 60fps on mobile | Already using motion/react; GPU-composited properties only (transform, opacity); no layout-triggering animations |
| PERF-02 | Lighthouse performance > 80 on 3G (TTFB, LCP, CLS) | `loading="lazy"` on all images; `next/image` with `sizes` for any component-level images; minimize client JS (keep FinalCta as 'use client' scoped; use Server Components elsewhere) |
| PERF-03 | Images lazy-loaded with gradient+emoji fallbacks | Pattern already established in Phase 2 with `onError` fallback gradient; verify all sections use `loading="lazy"` |
| SEO-01 | Meta title, description, OG image, Twitter card | Static `metadata` export in `app/layout.tsx`; `opengraph-image.tsx` file convention in `/app/` for generated OG image |
| SEO-02 | Semantic HTML structure (proper headings, landmarks) | Audit existing sections: one `<h1>` in Hero, `<h2>` per section; `<nav>`, `<main>`, `<section>`, `<footer>` landmarks already partially in place |
</phase_requirements>

---

## Summary

This phase wires three distinct workstreams: (1) a Supabase-backed email waitlist with referral mechanics, (2) OG/Twitter metadata and a generated OG image, and (3) a Lighthouse performance + semantic HTML audit. All three are well-understood, low-risk domains with stable APIs. No new npm packages are required — the stack already has `@supabase/supabase-js`, `next` (with built-in `next/og`), and React 19 with `useActionState`.

The waitlist is the most complex piece. The pattern is: a `waitlist` table with `email UNIQUE`, `ref_code` (generated unique hash), `referrer_code` (nullable — the code passed via `?ref=`), and `created_at`. Position is computed on-the-fly as `(row number ordered by created_at) - (5 * count of successful referrals)`. Supabase anon INSERT works cleanly with an RLS policy of `FOR INSERT TO anon WITH CHECK (true)` — verified from official Supabase community discussion. The critical gotcha: use `{ count: 'exact', returning: 'representation' }` or a separate SELECT after insert, because anon INSERT without a SELECT RLS policy returns nothing. The simplest approach is to call insert, then immediately SELECT by email to get the full row back.

The OG image is a static asset generated at build time using `app/opengraph-image.tsx` with `next/og`'s `ImageResponse`. The metadata override in `app/layout.tsx` handles Twitter card and all OG fields. Lighthouse > 80 on 3G is achievable on this stack with lazy images and minimal client JS — the main risk is Unsplash images loading on 3G LCP; the mitigation is ensuring `loading="lazy"` on all below-fold images and verifying no render-blocking resources were introduced.

**Primary recommendation:** Use Next.js Server Actions (`'use server'` in `app/actions/waitlist.ts`) with `useActionState` in a `'use client'` FinalCta component. Supabase anon INSERT with separate SELECT for referral data. OG image via `app/opengraph-image.tsx` file convention. Metadata updated in `app/layout.tsx`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.97.0 (already installed) | Database INSERT/SELECT for waitlist | Already configured in Phase 1; `lib/supabase.ts` exports the client |
| `next/og` (built into Next.js) | Next.js 16.1.6 | OG image generation via `ImageResponse` | Zero additional deps; statically optimized at build time |
| `react` `useActionState` | React 19 (already installed) | Form state + pending + error handling | Replaces deprecated `useFormState`; built into React 19 |
| `react-dom` `useFormStatus` | React 19 (already installed) | Submit button pending indicator | Must be in a child component of the form |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Native `crypto.randomUUID()` or `Math.random().toString(36)` | Node built-in | Generate unique `ref_code` | Server-side only in Server Action; no library needed for 6-char alphanumeric codes |
| Native `Clipboard API` (`navigator.clipboard.writeText`) | Browser built-in | Copy referral link button | Client-side only; use with `try/catch` for old browsers |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native ref_code generation | `nanoid` library | nanoid is URL-safe and collision-resistant for large scale; at waitlist scale (< 100k), `Math.random().toString(36).slice(2, 8)` is sufficient and avoids an extra dep |
| `app/opengraph-image.tsx` (built-in) | Static PNG in `/public/opengraph.png` | Static PNG is simpler but requires design tool export; `opengraph-image.tsx` generates programmatically and can match brand tokens exactly |
| Server Action | API Route (`/api/waitlist`) | API routes add boilerplate; Server Actions are the current App Router pattern for form mutations |

**Installation:** No new packages needed. All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
app/
├── opengraph-image.tsx      # NEW: OG image generation (1200x630)
├── twitter-image.tsx        # NEW: Twitter card image (same or reuse OG)
├── layout.tsx               # MODIFY: update metadata export
├── actions/
│   └── waitlist.ts          # NEW: Server Action ('use server')
components/
└── sections/
    └── FinalCta.tsx         # MODIFY: replace static Btn with waitlist form + dashboard
```

### Pattern 1: Server Action for Waitlist Signup

**What:** A `'use server'` function in `app/actions/waitlist.ts` handles email validation, Supabase insert, duplicate detection, and returns structured state.

**When to use:** Mutating data from a form in App Router. Eliminates API route boilerplate.

```typescript
// Source: https://nextjs.org/docs/app/guides/forms (verified, Next.js 16.1.6 docs)
// app/actions/waitlist.ts
'use server'

import { supabase } from '@/lib/supabase'

export type WaitlistState =
  | { status: 'idle' }
  | { status: 'success'; refCode: string; position: number; referralCount: number }
  | { status: 'duplicate'; refCode: string; position: number; referralCount: number }
  | { status: 'error'; message: string }

function generateRefCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length < 255
}

export async function joinWaitlist(
  _prevState: WaitlistState,
  formData: FormData
): Promise<WaitlistState> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const referrerCode = (formData.get('ref') as string) ?? null

  if (!email || !isValidEmail(email)) {
    return { status: 'error', message: 'Adresse email invalide.' }
  }

  // Check for existing signup first (for duplicate handling)
  const { data: existing } = await supabase
    .from('waitlist')
    .select('ref_code, created_at')
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    // Return their existing ref_code with current dashboard data
    const dashboard = await getDashboard(existing.ref_code)
    return { status: 'duplicate', ...dashboard }
  }

  // New signup
  const refCode = generateRefCode()
  const { error } = await supabase.from('waitlist').insert({
    email,
    ref_code: refCode,
    referrer_code: referrerCode ?? null,
  })

  if (error) {
    // Race condition: duplicate between check and insert
    if (error.code === '23505') {
      const { data: raceExisting } = await supabase
        .from('waitlist')
        .select('ref_code')
        .eq('email', email)
        .single()
      if (raceExisting) {
        const dashboard = await getDashboard(raceExisting.ref_code)
        return { status: 'duplicate', ...dashboard }
      }
    }
    return { status: 'error', message: 'Erreur réseau. Réessaie dans quelques secondes.' }
  }

  const dashboard = await getDashboard(refCode)
  return { status: 'success', ...dashboard }
}

async function getDashboard(refCode: string) {
  // Position: count of signups with earlier created_at minus (5 * referral count) + 1
  const { count: totalBefore } = await supabase
    .from('waitlist')
    .select('*', { count: 'exact', head: true })
    .lte('created_at', new Date().toISOString()) // approximate; see pitfall note

  const { count: referralCount } = await supabase
    .from('waitlist')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_code', refCode)

  const rawPosition = (totalBefore ?? 1)
  const bonus = (referralCount ?? 0) * 5
  const position = Math.max(1, rawPosition - bonus)

  return { refCode, position, referralCount: referralCount ?? 0 }
}
```

### Pattern 2: Client Form with useActionState

**What:** FinalCta becomes a `'use client'` component using `useActionState` to manage form state transitions (idle → pending → success/error).

**When to use:** Any form that needs pending state, inline errors, and reactive UI after Server Action.

```typescript
// Source: https://nextjs.org/docs/app/guides/forms (verified, Next.js 16.1.6 docs)
// components/sections/FinalCta.tsx
'use client'

import { useActionState, useEffect, useRef } from 'react'
import { joinWaitlist, type WaitlistState } from '@/app/actions/waitlist'

const initialState: WaitlistState = { status: 'idle' }

export default function FinalCta() {
  const [state, formAction, pending] = useActionState(joinWaitlist, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  // Reset form on success
  useEffect(() => {
    if (state.status === 'success') {
      formRef.current?.reset()
    }
  }, [state.status])

  const isSuccess = state.status === 'success' || state.status === 'duplicate'

  return (
    // ... existing layout ...
    <form ref={formRef} action={formAction}>
      {!isSuccess ? (
        <>
          <input type="email" name="email" required placeholder="ton@email.com" />
          {/* Pass ?ref= from URL as hidden field */}
          <input type="hidden" name="ref" value={/* read from searchParams or window.location */} />
          <button type="submit" disabled={pending}>
            {pending ? 'Inscription...' : "C'est parti"}
          </button>
          {state.status === 'error' && (
            <p role="alert">{state.message}</p>
          )}
        </>
      ) : (
        // Referral dashboard — revealed inline after success
        <ReferralDashboard state={state} />
      )}
    </form>
  )
}
```

### Pattern 3: OG Image Generation

**What:** `app/opengraph-image.tsx` uses `next/og`'s `ImageResponse` to generate a 1200x630 branded dark card at build time.

**When to use:** Static OG images for social sharing. Generated once at build, cached as static asset.

```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image
// (verified, version 16.1.6, lastUpdated 2026-02-20)
// app/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const alt = 'NŌM — Scanne le menu. Comprends chaque plat.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#09090B', // brand-bg
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 900, color: '#FAFAFA' }}>
          NŌM
        </div>
        <div style={{ fontSize: 28, color: '#FF6B35', marginTop: 12 }}>
          Scanne le menu. Comprends chaque plat.
        </div>
        <div style={{ fontSize: 18, color: '#71717A', marginTop: 16 }}>
          200 cuisines · 50 langues · Un seul geste
        </div>
      </div>
    ),
    { ...size }
  )
}
```

### Pattern 4: Metadata in app/layout.tsx

**What:** Static `metadata` export with full OG and Twitter card fields. The `opengraph-image.tsx` file convention automatically wires the `og:image` URL — the metadata object's `openGraph.images` does not need to reference it explicitly when using the file convention.

**When to use:** Static metadata that doesn't depend on runtime data.

```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
// (verified, version 16.1.6, lastUpdated 2026-02-20)
// app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://nomnomnom.app'), // required for absolute OG URLs
  title: 'NŌM — Scanne le menu. Comprends chaque plat.',
  description: 'Scanne n\'importe quel menu, comprends chaque plat en 50+ langues. Traductions, explications, recommandations — instantanément.',
  openGraph: {
    title: 'NŌM — Scanne le menu. Comprends chaque plat.',
    description: 'Scanne n\'importe quel menu, comprends chaque plat en 50+ langues.',
    locale: 'fr_FR',
    type: 'website',
    siteName: 'NŌM',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NŌM — Scanne le menu. Comprends chaque plat.',
    description: 'Scanne n\'importe quel menu, comprends chaque plat en 50+ langues.',
  },
}
```

### Pattern 5: Supabase Table Schema + RLS

**What:** Minimal public waitlist table with anon INSERT policy. No auth dependency — anyone can sign up without an account.

```sql
-- Run in Supabase SQL editor
CREATE TABLE public.waitlist (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  ref_code    TEXT UNIQUE NOT NULL,
  referrer_code TEXT,               -- nullable; the ?ref= code of the referrer
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon) to insert
CREATE POLICY "anon_can_insert" ON public.waitlist
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow reading own row by ref_code (needed for dashboard lookup after insert)
CREATE POLICY "anon_can_select_by_ref" ON public.waitlist
  FOR SELECT TO anon
  USING (true);   -- or USING (ref_code = current_setting('app.current_ref_code', true))

-- Index for referral count queries
CREATE INDEX waitlist_referrer_code_idx ON public.waitlist (referrer_code);
CREATE INDEX waitlist_created_at_idx ON public.waitlist (created_at);
```

**Note on SELECT policy:** The simplest approach is `USING (true)` to allow anon to SELECT any row. This is acceptable for a public waitlist (emails are not displayed, only position/count). If privacy is a concern, scope SELECT to rows matching a ref_code passed as a claim — but this requires server-side Supabase client with RLS bypass, which adds complexity. For this phase, `USING (true)` is recommended.

### Anti-Patterns to Avoid

- **Calling Supabase directly from a Client Component with the public anon key for INSERT:** This works but bypasses the Server Action pattern, exposing the logic and losing server-side validation. All mutations must go through `app/actions/waitlist.ts`.
- **Using `supabase.insert().select()` without a SELECT RLS policy:** Without a SELECT policy, Supabase returns an empty array even on successful insert. Either add a SELECT policy or do a separate `.from().select().eq('email', email)` after insert.
- **Computing position client-side:** Position is derived from database state; always compute server-side in the Server Action to avoid stale data.
- **Animating with layout-triggering CSS properties on mobile:** Use only `transform` and `opacity` for motion; avoid animating `height`, `width`, `margin`, `top` on mobile (causes jank, breaks PERF-01).
- **Blocking OG image generation on external data:** The `opengraph-image.tsx` for this project is fully static — no fetches needed. Do not add `fetch()` calls that could slow build or fail.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OG image | Custom canvas rendering, Puppeteer screenshots | `next/og` ImageResponse | Built into Next.js; zero deps; generates at build time; Satori-based JSX-to-PNG |
| Form pending state | Custom `useState(loading)` | `useActionState` from React 19 | Returns `[state, formAction, pending]` — pending is automatic, no race conditions |
| Email uniqueness check | Manual SELECT before INSERT | Postgres `UNIQUE` constraint + error code `23505` | Database-level guarantee; SELECT-before-INSERT has a race condition window |
| Position calculation | Separate tracking table with triggers | SQL COUNT query at request time | At waitlist scale, a COUNT + arithmetic is fast enough; no denormalization needed |
| Clipboard copy | `document.execCommand('copy')` | `navigator.clipboard.writeText()` | Modern async API; `execCommand` is deprecated |

**Key insight:** Next.js 16 + React 19 already solve 90% of the form complexity through `useActionState`. The main custom logic is the Supabase schema and the position formula.

---

## Common Pitfalls

### Pitfall 1: Anon INSERT returns empty data without SELECT RLS policy

**What goes wrong:** `supabase.from('waitlist').insert({...})` succeeds (no error) but returns `data: []`. Code that tries to read `data[0].ref_code` gets `undefined`, causing broken referral flow.

**Why it happens:** Supabase INSERT returns inserted rows via a SELECT under the hood. If there is no SELECT RLS policy for the `anon` role, the row is inserted but the SELECT is blocked, returning empty.

**How to avoid:** Either (a) add a `FOR SELECT TO anon USING (true)` policy, or (b) do a separate `.from('waitlist').select().eq('email', email).single()` after insert. Option (a) is simpler. Verified in Supabase community discussion: https://github.com/orgs/supabase/discussions/6757

**Warning signs:** `data` is `[]` or `null` after a successful insert with no error.

### Pitfall 2: metadataBase missing — OG image URL is relative

**What goes wrong:** Twitter/OG scrapers receive a relative URL like `/opengraph-image` instead of an absolute URL. Card fails to load.

**Why it happens:** Next.js uses `metadataBase` to resolve relative image URLs in metadata. Without it, OG image URLs are relative.

**How to avoid:** Set `metadataBase: new URL('https://your-domain.com')` in the root `app/layout.tsx` metadata export. Source: https://nextjs.org/docs/app/api-reference/functions/generate-metadata#metadatabase

**Warning signs:** OG debugger (Facebook/Twitter) shows image URL as a path, not an absolute URL.

### Pitfall 3: useActionState signature mismatch — prevState not passed

**What goes wrong:** Server Action throws because `useActionState` injects `prevState` as the first argument, but the action only declares `(formData: FormData)`.

**Why it happens:** When a Server Action is used with `useActionState`, React changes the call signature to `(prevState, formData)`. If the action doesn't accept `prevState`, `formData` is actually the prevState object and the real FormData is never received.

**How to avoid:** Always declare Server Actions used with `useActionState` as `async function action(prevState: State, formData: FormData)`. Source: https://nextjs.org/docs/app/guides/forms

**Warning signs:** `formData.get('email')` returns `null` even though the form field exists.

### Pitfall 4: Position query is inaccurate for concurrent signups

**What goes wrong:** Two users sign up at the same millisecond; both get the same "position 42" because the COUNT was read before either committed.

**Why it happens:** The COUNT + created_at ordering is eventually consistent at the edge of concurrent inserts.

**How to avoid:** This is acceptable for a waitlist at launch scale (not a financial system). Show position as approximate: "Tu es parmi les 100 premiers" rather than "Tu es #47". Alternatively, add a Postgres `SEQUENCE` column for monotonic ordering. For this phase, the simple COUNT approach is recommended — state it's approximate in the UI if needed.

**Warning signs:** Multiple users report the same position number.

### Pitfall 5: FinalCta component bundle size

**What goes wrong:** Making FinalCta a `'use client'` component pulls in all its imports into the client bundle. If `lib/data.ts` imports something heavy, it ships to the client.

**Why it happens:** `'use client'` marks the component and all its static imports as client code.

**How to avoid:** `lib/data.ts` is already a plain data module (no side effects, no heavy deps). The only client-side dependency added is the Server Action reference (which is just a function pointer). Keep the Server Action in a separate `app/actions/waitlist.ts` file marked `'use server'` — it will NOT be bundled for the client.

**Warning signs:** Next.js build output shows large client-side bundle for the page.

### Pitfall 6: Lighthouse regression from loading Unsplash images on 3G

**What goes wrong:** Multiple Unsplash images load eagerly, blocking LCP and pushing performance below 80.

**Why it happens:** `loading="lazy"` is correct for below-fold images, but the hero or first-visible image may need `loading="eager"` (the default) or `fetchpriority="high"`.

**How to avoid:** Verify: (1) all `<img>` tags in FinalCta's background collage already have `loading="lazy"` (confirmed in current `FinalCta.tsx`); (2) audit `Hero.tsx` and `DishCarousel.tsx` — first visible images should NOT have `loading="lazy"`. Use browser DevTools Network throttling to test 3G before submission.

**Warning signs:** Lighthouse LCP metric > 4s; LCP element is an off-screen Unsplash image.

---

## Code Examples

Verified patterns from official sources:

### Supabase anon INSERT with SELECT RLS

```typescript
// Source: Supabase official RLS docs + community discussion #6757
// Both INSERT and SELECT policies needed for data to be returned

// Client call (inside Server Action)
const { error } = await supabase
  .from('waitlist')
  .insert({ email, ref_code, referrer_code })

// Then fetch to get inserted row data
const { data } = await supabase
  .from('waitlist')
  .select('ref_code, created_at')
  .eq('email', email)
  .single()
```

### useActionState with Server Action (React 19 + Next.js 16)

```typescript
// Source: https://nextjs.org/docs/app/guides/forms (version 16.1.6, 2026-02-20)
'use client'
import { useActionState } from 'react'
import { joinWaitlist } from '@/app/actions/waitlist'

const [state, formAction, pending] = useActionState(joinWaitlist, { status: 'idle' })

// In JSX:
// <form action={formAction}>
//   <button disabled={pending}>Submit</button>
//   {state.status === 'error' && <p>{state.message}</p>}
// </form>
```

### OG Image file convention (Next.js 16)

```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image
// (version 16.1.6, lastUpdated 2026-02-20)
// Place at: app/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const alt = 'Description'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(<div style={{ /* JSX styles only, no Tailwind */ }}>...</div>, { ...size })
}
```

**Critical note:** `ImageResponse` JSX does NOT support Tailwind classes — only inline `style={{}}` objects. This is a Satori constraint.

### Twitter card metadata

```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
// (version 16.1.6, lastUpdated 2026-02-20)
twitter: {
  card: 'summary_large_image',  // required for large image preview
  title: 'NŌM — Scanne le menu. Comprends chaque plat.',
  description: '...',
  // images: automatically wired from twitter-image.tsx file convention
}
```

### Referral position query

```sql
-- Approximate position: row number minus referral bonus
-- Run server-side in Server Action
SELECT
  (SELECT COUNT(*) FROM waitlist WHERE created_at <= w.created_at) as raw_position,
  (SELECT COUNT(*) FROM waitlist WHERE referrer_code = $1) as referral_count
FROM waitlist w
WHERE w.ref_code = $1;

-- Effective position = raw_position - (referral_count * 5), minimum 1
```

### Clipboard copy with fallback

```typescript
// Client-side only (in 'use client' component)
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    // show "Copié !" feedback
  } catch {
    // Fallback for Safari < 13.1 or non-HTTPS
    const el = document.createElement('input')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useFormState` (react-dom) | `useActionState` (react) | React 19 / Next.js 15+ | Import from `react` not `react-dom`; API is identical but `pending` is now the 3rd return value |
| `metadata.viewport` object | `generateViewport` export | Next.js 14+ | `viewport` in metadata object is deprecated; use separate `export const viewport` |
| Static PNG in `/public` for OG | `app/opengraph-image.tsx` file convention | Next.js 13.3+ | Programmatic, zero deps, auto-wired to `<head>` |
| API Routes for form mutations | Server Actions (`'use server'`) | Next.js 14+ | Less boilerplate, progressive enhancement, works without JS |

**Deprecated/outdated:**
- `themeColor` in `metadata` object: Deprecated Next.js 14+, use `generateViewport` instead
- `useFormState` from `react-dom`: Replaced by `useActionState` from `react` in React 19
- `document.execCommand('copy')`: Deprecated in favor of `navigator.clipboard.writeText()` — keep as fallback only

---

## Open Questions

1. **Production Supabase URL for `metadataBase`**
   - What we know: `metadataBase` must be the production URL for OG images to resolve correctly
   - What's unclear: The production domain is not confirmed (project uses placeholder `nomnomnom.app`)
   - Recommendation: Set `metadataBase` to `process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'` so it works in both environments. Add `NEXT_PUBLIC_SITE_URL=https://...` to Vercel env vars.

2. **Referral bonus value (N spots per referral)**
   - What we know: Context says "each referral moves you up N spots" — N is unspecified
   - What's unclear: Exact value of N
   - Recommendation: Use N=5 as the default. Make it a constant `REFERRAL_BONUS_SPOTS = 5` in `app/actions/waitlist.ts` so it's easy to tune.

3. **Reading ?ref= param in FinalCta (Client Component)**
   - What we know: The referral code is passed as `?ref=abc123` in the URL; FinalCta is a Client Component
   - What's unclear: How to access `searchParams` in a Client Component (Next.js App Router doesn't expose `useSearchParams` in SSR without a Suspense boundary)
   - Recommendation: Use `window.location.search` on mount with a `useEffect` to read the `ref` param, OR wrap the form in `<Suspense>` and use `useSearchParams()` from `next/navigation`. The `<Suspense>` approach is cleaner and avoids hydration mismatch.

4. **`twitter-image.tsx` — separate file or reuse OG image?**
   - What we know: Twitter card size should be 1200x628 or 800x418 for `summary_large_image`; OG image is 1200x630
   - What's unclear: Whether the 2px height difference matters
   - Recommendation: Reuse the same `opengraph-image.tsx` design in a `twitter-image.tsx` file with `size = { width: 1200, height: 628 }`. Two files, same JSX content. Alternatively, just place a single static PNG at both paths.

---

## Sources

### Primary (HIGH confidence)

- Next.js official docs (version 16.1.6, lastUpdated 2026-02-20) — `generateMetadata`, `opengraph-image` file convention, Server Actions/Forms guide
  - https://nextjs.org/docs/app/api-reference/functions/generate-metadata
  - https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image
  - https://nextjs.org/docs/app/guides/forms
- Supabase RLS official docs — INSERT/SELECT policy patterns
  - https://supabase.com/docs/guides/database/postgres/row-level-security

### Secondary (MEDIUM confidence)

- Supabase community discussion #6757 — anon INSERT with SELECT RLS policy requirement; `returning: 'minimal'` gotcha
  - https://github.com/orgs/supabase/discussions/6757
- tinloof waitlist tutorial — Supabase waitlist schema pattern (auth-based variant, adapted to anon variant for this project)
  - https://tinloof.com/blog/how-to-build-a-waitlist-with-supabase-and-next-js
- WebSearch: Next.js Lighthouse optimization patterns — lazy loading, priority images, font optimization
  - https://www.wisp.blog/blog/mastering-mobile-performance-a-complete-guide-to-improving-nextjs-lighthouse-scores

### Tertiary (LOW confidence)

- Referral position calculation formula (N=5 spots per referral) — derived from context description; exact value not validated against product requirements. Flag for confirmation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already installed; APIs verified against current official docs (lastUpdated 2026-02-20)
- Architecture: HIGH — Server Action + useActionState pattern verified against Next.js 16.1.6 docs; Supabase INSERT/SELECT RLS verified from official docs + community discussion
- Supabase anon INSERT pitfall: HIGH — directly verified from community discussion with confirmed solution
- OG image generation: HIGH — verified from official Next.js docs file convention spec
- Referral position formula: MEDIUM — algorithmic design is sound; N=5 bonus is a discretionary choice not validated with product owner
- Lighthouse targets: MEDIUM — general best practices verified; actual score depends on runtime conditions (Unsplash CDN speed, bundle size) that require testing

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable APIs; 30-day window before re-verification needed)
