---
phase: 03-waitlist-ship
verified: 2026-02-25T18:00:00Z
status: human_needed
score: 11/11 must-haves verified (automated); 2 items require human confirmation
re_verification: false
human_verification:
  - test: "Run Lighthouse mobile audit on the live or local dev server (simulated 3G throttling)"
    expected: "Performance score above 80"
    why_human: "Lighthouse scores cannot be determined by static code analysis — requires running browser audit"
  - test: "Run the SQL schema in the Supabase dashboard SQL editor, then submit an email via the waitlist form"
    expected: "Row appears in the waitlist table with email, ref_code, referrer_code; success message appears; referral dashboard shows position and count"
    why_human: "The Supabase waitlist table is a runtime dependency — code is correct but the table must be created manually before the form can actually store data"
---

# Phase 3: Waitlist + Ship Verification Report

**Phase Goal:** Users can join the waitlist, get a referral link, and the page is SEO-ready and performant — ready for public launch
**Verified:** 2026-02-25T18:00:00Z
**Status:** human_needed — all automated checks pass; 2 runtime/environment items require human confirmation
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can enter email and submit with 'C'est parti' button | VERIFIED | `FinalCta.tsx:53-68` — `<form action={formAction}>` with email input and button rendering "C\u2019est parti" when not pending |
| 2 | After signup, user sees "Parfait ! On te prévient dès que c'est prêt." | VERIFIED | `FinalCta.tsx:87-89` — `state.status === 'success'` branch renders exact message in green |
| 3 | Email is stored in Supabase waitlist table | VERIFIED (code) / ? (runtime) | `waitlist.ts:94-96` — `supabase.from('waitlist').insert({ email, ref_code, referrer_code })` wired to Supabase client; table creation is a manual human step |
| 4 | After signup, user sees a unique referral link they can copy | VERIFIED | `FinalCta.tsx:120-137` — referral URL input + copy button with clipboard API and "Copié !" feedback |
| 5 | User sees their waitlist position and number of friends referred | VERIFIED | `FinalCta.tsx:100-117` — position rendered as `#${state.position}`, referralCount rendered with emoji; both fed from `getDashboard()` return values |
| 6 | Duplicate email shows "Tu es déjà inscrit(e) !" with existing referral dashboard | VERIFIED | `FinalCta.tsx:91-94` — `state.status === 'duplicate'` branch renders exact French message in orange, then same dashboard block |
| 7 | Visiting with ?ref=CODE and signing up credits the referrer | VERIFIED | `FinalCta.tsx:13-14` reads `useSearchParams().get('ref')`; `FinalCta.tsx:54` passes as hidden input; `waitlist.ts:70-72` extracts and stores as `referrer_code` |
| 8 | Page has correct meta title, description, OG tags, and Twitter card in HTML head | VERIFIED | `app/layout.tsx:14-30` — `metadataBase`, `title`, `description`, full `openGraph` object (locale, type, siteName), `twitter.card = 'summary_large_image'` |
| 9 | OG image generates a branded 1200x630 dark card with NOM branding | VERIFIED | `app/opengraph-image.tsx` — exports `alt`, `size = {width:1200, height:630}`, `contentType = 'image/png'`; ImageResponse renders `#09090B` bg, "NŌM" at 96px/900 weight, orange tagline (#FF6B35), muted subtitle (#71717A), food emoji row |
| 10 | Page uses semantic HTML: one h1, h2 per section, nav/main/section/footer landmarks | VERIFIED | Exactly one `<h1>` in `Hero.tsx:23`; all section primary headings use `<h2>` (Features, ReverseSearch, Social, Pricing, Faq, FinalCta×2); `<h3>` used only for sub-items (feature card titles, dish names); `Nav.tsx:27` has `<nav aria-label>`; `layout.tsx:41` has `<main>`; `Footer.tsx:3` has `<footer>`; `page.tsx` uses React Fragment (no duplicate main) |
| 11 | All below-fold images have loading=lazy | VERIFIED | All 4 `<img>` tags found across codebase have `loading="lazy"`: `FoodImage.tsx:30`, `DishCarousel.tsx:53`, `FinalCta.tsx:178`, `PhoneDemo.tsx:179` |

**Score:** 11/11 truths verified by static analysis

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/actions/waitlist.ts` | Server Action for waitlist signup, validation, referral logic, dashboard data; exports `joinWaitlist`, `WaitlistState` | VERIFIED | 122 lines, `'use server'` directive on line 1, exports both `WaitlistState` type (line 7) and `joinWaitlist` function (line 64), full implementation with no stubs |
| `components/sections/FinalCta.tsx` | Email form with useActionState, inline referral dashboard after success; min 80 lines | VERIFIED | 249 lines, `'use client'`, `useActionState(joinWaitlist, {status:'idle'})` on line 16, full form + dashboard rendered, AnimatePresence transitions |
| `app/opengraph-image.tsx` | Generated OG image (1200x630) with NOM branding; exports default, alt, size, contentType | VERIFIED | 75 lines, exports all 4 required names, `size = {width:1200, height:630}`, inline styles only (Satori compliant), dark branded card |
| `app/twitter-image.tsx` | Generated Twitter card image (1200x628); exports default, alt, size, contentType | VERIFIED | 75 lines, exports all 4 required names, `size = {width:1200, height:628}` (Twitter aspect ratio), identical branded content |
| `app/layout.tsx` | Updated metadata with metadataBase, title, description, openGraph, twitter; contains `metadataBase` | VERIFIED | Lines 14-30, `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nomnomnom-delta.vercel.app')`, complete openGraph and twitter objects |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `components/sections/FinalCta.tsx` | `app/actions/waitlist.ts` | `useActionState(joinWaitlist, initialState)` | WIRED | `FinalCta.tsx:6` imports `joinWaitlist`; `FinalCta.tsx:16` — `useActionState<WaitlistState, FormData>(joinWaitlist, {status:'idle'})` |
| `app/actions/waitlist.ts` | `lib/supabase.ts` | `supabase.from('waitlist').insert/select` | WIRED | `waitlist.ts:3` imports `supabase`; used at lines 33, 44, 50, 80, 94, 101 — all `.from('waitlist')` queries |
| `app/layout.tsx` | `app/opengraph-image.tsx` | Next.js file convention auto-wiring via `metadataBase` | WIRED | `layout.tsx:15` sets `metadataBase`; Next.js 15+ auto-discovers `opengraph-image.tsx` in the same `app/` directory |
| `app/layout.tsx` | `app/twitter-image.tsx` | Next.js file convention auto-wiring; `twitter.card = 'summary_large_image'` | WIRED | `layout.tsx:26` sets `twitter.card: 'summary_large_image'`; Next.js auto-discovers `twitter-image.tsx` in `app/` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| WAIT-01 | 03-01-PLAN.md | Email input form with validation and "C'est parti" submit button | SATISFIED | `FinalCta.tsx:55-68` — email input with `required`, submit button rendering "C\u2019est parti"; `waitlist.ts:75-77` — `isValidEmail()` guard returns error state |
| WAIT-02 | 03-01-PLAN.md | Success feedback message "Parfait ! On te prévient dès que c'est prêt." | SATISFIED | `FinalCta.tsx:87-89` — exact Unicode message rendered in green when `state.status === 'success'` |
| WAIT-03 | 03-01-PLAN.md | Emails stored in backend database (Supabase) | SATISFIED (code) | `waitlist.ts:94-96` — insert to `'waitlist'` table; runtime depends on Supabase table being created (user setup required) |
| WAIT-04 | 03-01-PLAN.md | Referral system: after signup, user gets a unique referral link | SATISFIED | `waitlist.ts:19-21` — `generateRefCode()` creates unique 6-char code; `waitlist.ts:92-96` — stored as `ref_code`; `FinalCta.tsx:26-29` — URL constructed as `${origin}?ref=${refCode}` |
| WAIT-05 | 03-01-PLAN.md | Referral tracking: referring friends moves user up in waitlist queue | SATISFIED | `waitlist.ts:14-15` — `REFERRAL_BONUS_SPOTS = 5`; `waitlist.ts:57` — `position = Math.max(1, rawPos - refs * REFERRAL_BONUS_SPOTS)`; `FinalCta.tsx:13-14, 54` — `?ref=` captured and stored as `referrer_code` |
| WAIT-06 | 03-01-PLAN.md | Referral dashboard: user can see position and how many friends referred | SATISFIED | `FinalCta.tsx:97-143` — dashboard renders `#{position}` and `{referralCount}` from `getDashboard()` return |
| PERF-01 | 03-02-PLAN.md | Animations run at 60fps on mobile (transform/opacity only) | SATISFIED (code) | `globals.css:19-37` — all 4 keyframes use only `transform` and `opacity`; Framer Motion `AnimatePresence` uses `opacity` + `y` (transform); no `height/width/margin/top/left` animations found |
| PERF-02 | 03-02-PLAN.md | Page loads under 3s on 3G (Lighthouse performance > 80) | NEEDS HUMAN | Cannot determine Lighthouse score from static analysis — requires browser runtime audit |
| PERF-03 | 03-02-PLAN.md | Images lazy-loaded with gradient+emoji fallbacks | SATISFIED | All 4 `<img>` elements have `loading="lazy"`; `FoodImage.tsx` provides gradient+emoji fallback pattern |
| SEO-01 | 03-02-PLAN.md | Meta title, description, OG image, Twitter card configured | SATISFIED | `layout.tsx:14-30` — complete metadata object; `opengraph-image.tsx` and `twitter-image.tsx` exist as Next.js file convention images |
| SEO-02 | 03-02-PLAN.md | Semantic HTML structure (proper headings, landmarks) | SATISFIED | One `<h1>` (Hero), all sections use `<h2>`, sub-items use `<h3>`; `<nav>`, `<main>`, `<section>`, `<footer>`, `<header>` all present |

**Orphaned requirements check:** REQUIREMENTS.md maps WAIT-01 through WAIT-06, PERF-01 through PERF-03, SEO-01, SEO-02 to Phase 3 — all 11 are claimed across the two plans. No orphaned requirements.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | No TODO, FIXME, placeholder strings, empty returns, or console-only handlers found in any phase 3 modified file |

---

### Human Verification Required

#### 1. Lighthouse Performance Score

**Test:** Start the dev server (`npm run dev`), open Chrome DevTools, navigate to Lighthouse tab, run a Performance audit with "Mobile" device and "Simulated throttling" enabled.
**Expected:** Performance score of 80 or above.
**Why human:** Lighthouse scores are computed at runtime by Chrome's DevTools, accounting for actual asset sizes, network simulation, and JavaScript execution time. Static analysis cannot determine render timing or network waterfall behaviour.

#### 2. End-to-End Waitlist Form Submission

**Test:** Run the Supabase SQL from `03-01-SUMMARY.md` (CREATE TABLE waitlist...) in the Supabase SQL Editor. Then visit the dev server, enter a fresh email, submit. Verify (a) success message "Parfait ! On te prévient dès que c'est prêt." appears, (b) referral dashboard shows position 1 and 0 referrals, (c) referral URL is copyable. Then submit the same email again and verify "Tu es déjà inscrit(e) !" appears with the same dashboard. Then visit `/?ref=<that-code>`, sign up with a second email, and check the first user's position decreased by 5.
**Expected:** All three sub-flows work as described. Supabase table shows two rows with the second row's `referrer_code` equal to the first row's `ref_code`.
**Why human:** The Supabase `waitlist` table is a runtime external dependency. The code is verified correct, but the table must be created in the Supabase project before any data operations will succeed. This cannot be confirmed from code alone.

---

### Summary

All 11 automated must-haves pass at all three levels (exists, substantive, wired). The implementation is complete and non-trivial — no stubs, no TODO comments, no placeholder returns found in any phase 3 file.

**Plan 01 (Waitlist backend):** `app/actions/waitlist.ts` is a full 122-line Server Action with type-safe union state, email validation, duplicate detection, race-condition handling (code 23505), referral bonus position calculation, and `getDashboard()` helper. `FinalCta.tsx` is a 249-line client component using `useActionState`, `Suspense`-wrapped `useSearchParams`, `AnimatePresence` transitions, and the full referral dashboard with clipboard copy.

**Plan 02 (SEO + performance):** `layout.tsx` has a complete `Metadata` export with `metadataBase`, full OG and Twitter objects. Both `opengraph-image.tsx` and `twitter-image.tsx` are proper Next.js ImageResponse files with correct dimensions. Semantic HTML is correct: exactly one `<h1>` in Hero, all section primary headings are `<h2>`, sub-items appropriately `<h3>`. All four `<img>` elements carry `loading="lazy"`. All CSS keyframe animations operate on `transform` and `opacity` only.

The two remaining human items are runtime/environment concerns — not code gaps. The Supabase table needs to be created once; the Lighthouse score needs to be measured against the live asset bundle.

---

*Verified: 2026-02-25T18:00:00Z*
*Verifier: Claude (gsd-verifier)*
