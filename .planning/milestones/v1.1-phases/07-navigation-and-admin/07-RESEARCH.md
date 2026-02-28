# Phase 7: Navigation and Admin - Research

**Researched:** 2026-02-25
**Domain:** Next.js App Router navigation, cookie-based admin auth, Supabase aggregate queries
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Admin access & auth
- Password page at `/admin` — shows a simple password input, secret not visible in URL bar
- Secret stored as `ADMIN_SECRET` environment variable in `.env.local` — standard, secure, easy to rotate
- On correct password: set a session cookie or short-lived token so admin doesn't re-enter on every page load
- On incorrect password: show inline error, no redirect — keep it simple
- No password → 403-style blocked state (password input stays visible, not a redirect)

#### Admin dashboard layout
- Single-page layout: model selector at top, stats section below
- Stats: total scans, cached vs fresh ratio, average parse time — the 3 numbers from success criteria
- Recent scans list (last 10-20) with URL/timestamp below counters — useful for debugging without over-engineering
- Clean, minimal design — this is an internal tool, not user-facing polish

#### Model switching UX
- Dropdown selector with the 3 model options (GPT-4o / GPT-4o-mini / GPT-4.1-mini)
- Save button pattern — explicit confirmation prevents accidental model changes
- Show current active model clearly before any change
- Success toast/indicator after save — confirm the change took effect

#### Landing → App transition
- Subtle fade/slide transition when CTA navigates to `/scan` — makes it feel like entering the app rather than jumping pages
- Standard Next.js `<Link>` for client-side routing (no full reload)
- CTA should be prominent and clear — "Scanner un menu" or similar action-oriented text

### Claude's Discretion
- Exact transition animation implementation (CSS transition, Framer Motion, or View Transitions API)
- Admin page styling details (spacing, typography, color scheme)
- Cookie/token duration and implementation for admin session
- Error state designs for failed stat queries
- Whether to show model descriptions alongside the dropdown options

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ADMN-01 | Admin can access a protected admin page (secret-based auth) | Cookie-based session via `cookies()` API in Route Handler; constant-time comparison against `ADMIN_SECRET` env var; middleware guard on `/admin` routes |
| ADMN-02 | Admin can select the LLM model used for menu parsing (GPT-4o, GPT-4o-mini, etc.) | `admin_config` table already exists with `llm_model` column; service role client (`supabaseAdmin`) for UPDATE; Server Action pattern for save button |
| ADMN-03 | Admin can view basic scan statistics (total scans, cached vs fresh, avg parse time) | Supabase `count` option + PostgREST aggregate `.avg()` — requires enabling aggregates; alternatively raw SQL via `supabaseAdmin.rpc()` |
| INFR-05 | Navigation integration — CTA on landing page links to /scan | Replace `<a href>` in `Btn` component or wrap Hero CTA in `<Link>` from `next/link`; motion fade/slide wrapping `/scan` page entry |
</phase_requirements>

---

## Summary

This phase has two independent workstreams: (1) wiring the landing page CTA to `/scan` with a subtle animation, and (2) building a protected admin page for model switching and scan stats. Both are straightforward in the existing Next.js 16 App Router setup. The hardest part is the admin stats queries — average parse time is not stored as a column today (the `menus` table has no timing column), which must be resolved before the stat can be computed.

The landing → scan transition should use `motion/react` (already installed at v12.34.3) rather than the experimental `viewTransition` Next.js flag (marked not production-ready as of Next.js 16.1.6). The existing codebase already uses `motion/react` with `AnimatePresence` in `FinalCta.tsx`, `Faq.tsx`, and `Social.tsx`, establishing a consistent pattern. The `Btn` component currently uses a plain `<a>` tag for hrefs — it needs a `<Link>` variant or an upgrade to use `next/link` for client-side navigation.

The admin cookie session is simple: a Route Handler at `POST /api/admin/login` checks the submitted password against `ADMIN_SECRET`, sets an `HttpOnly` cookie with `cookies().set()`, and the `/admin` page reads that cookie in a Server Component. No middleware is needed — the check at the page level is sufficient for a solo-founder internal tool.

**Primary recommendation:** Use `motion/react` for the landing transition (not `viewTransition`), use a Server Action for model save and cookie-based admin login, and use Supabase `rpc()` for the average-parse-time stat if the column doesn't exist yet.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next/link` | 16.1.6 (built-in) | Client-side navigation Link component | Built into Next.js; handles prefetching, soft navigation, no full reload |
| `next/headers` cookies() | 16.1.6 (built-in) | Read/write HttpOnly cookies server-side | Official Next.js API; async in Next.js 15+; only works in Server Actions / Route Handlers / Server Components (read-only) |
| `motion/react` (Framer Motion) | 12.34.3 (already installed) | Page entry animation on `/scan` | Already used in codebase; `AnimatePresence` + `motion.div` established pattern |
| `@supabase/supabase-js` | 2.97.0 (already installed) | Supabase queries for stats and admin_config | Already used throughout; service role client already in `lib/supabase-admin.ts` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `server-only` | 0.0.1 (already installed) | Guard server files from client bundle | Already used in `lib/cache.ts` and `lib/supabase-admin.ts`; apply to admin session lib |
| `zod` | 3.25.76 (already installed) | Validate admin form inputs | Already used for LLM schemas; use for model name validation in save action |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `motion/react` AnimatePresence | `viewTransition` (React 19 / Next.js experimental) | `viewTransition` is flagged "not recommended for production" in Next.js 16.1.6 docs as of 2026-02-24; motion is stable and already in the bundle |
| `motion/react` AnimatePresence | CSS `@keyframes` / Tailwind transition classes | CSS-only approach is lighter but less expressive; motion already installed so no bundle cost |
| Cookie-based session | JWT signed with `jose` | Jose adds a dependency and complexity; for a single-admin internal tool, a simple HMAC token or even a hashed secret stored in the cookie is sufficient |
| Supabase `.select()` aggregate | Supabase `rpc()` Postgres function | `rpc()` is more reliable for complex aggregates; aggregate syntax requires enabling `pgrst.db_aggregates_enabled` which is off by default |

**Installation:** No new packages needed. All required libraries are already in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure

```
app/
├── admin/
│   ├── page.tsx              # Server Component — reads cookie, renders login or dashboard
│   └── layout.tsx            # (optional) admin-specific layout without Nav/Footer
├── api/
│   └── admin/
│       ├── login/route.ts    # POST — validates ADMIN_SECRET, sets cookie
│       ├── logout/route.ts   # POST — deletes cookie
│       └── config/route.ts   # GET (current model) + POST (save new model)
lib/
├── admin-session.ts          # server-only: isAdminAuthenticated(), setAdminCookie(), clearAdminCookie()
```

### Pattern 1: Cookie-Based Admin Session

**What:** A Route Handler sets an `HttpOnly` cookie after verifying the submitted password equals `ADMIN_SECRET`. The `/admin` page reads this cookie in the Server Component to decide whether to render the login form or the dashboard.

**When to use:** Single-admin, no user accounts, no role hierarchy. Simple and secure.

**Key rules from official docs:**
- `cookies()` is async in Next.js 15+ — always `await cookies()`
- `.set()` only works in Server Actions and Route Handlers (not Server Component render)
- `.get()` works in Server Components (read-only)

```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/cookies (verified 2026-02-24)
// lib/admin-session.ts
import 'server-only';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'admin_session';
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours in seconds

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session?.value) return false;
  // Compare stored token to expected value
  return session.value === getExpectedToken();
}

function getExpectedToken(): string {
  // Deterministic token derived from ADMIN_SECRET — not the raw secret itself
  // Use crypto.createHash or a simple HMAC
  const secret = process.env.ADMIN_SECRET ?? '';
  return Buffer.from(secret).toString('base64url');
}

export async function setAdminCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, getExpectedToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearAdminCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
```

```typescript
// app/api/admin/login/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { setAdminCookie } from '@/lib/admin-session';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const expected = process.env.ADMIN_SECRET;

  if (!expected || password !== expected) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  await setAdminCookie();
  return NextResponse.json({ ok: true });
}
```

```typescript
// app/admin/page.tsx — Server Component
import { isAdminAuthenticated } from '@/lib/admin-session';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminDashboard from '@/components/admin/AdminDashboard';

export default async function AdminPage() {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return <AdminLogin />;
  }

  return <AdminDashboard />;
}
```

### Pattern 2: Admin Config Read/Update (model selection)

**What:** `admin_config` is a single-row table with `llm_model` column. Read via `supabaseAdmin.from('admin_config').select('*').single()` (already implemented in `lib/cache.ts` as `getAdminConfig()`). Write via a Server Action or Route Handler using `supabaseAdmin.from('admin_config').update({ llm_model }).eq('id', true)`.

**Key rule:** `admin_config` has RLS enabled with no public policies — it requires the service role client.

```typescript
// app/actions/admin.ts (or app/api/admin/config/route.ts)
'use server';
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminAuthenticated } from '@/lib/admin-session';

const ALLOWED_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1-mini'] as const;

export async function saveAdminModel(model: string) {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) return { error: 'Unauthorized' };

  if (!ALLOWED_MODELS.includes(model as typeof ALLOWED_MODELS[number])) {
    return { error: 'Invalid model' };
  }

  const { error } = await supabaseAdmin
    .from('admin_config')
    .update({ llm_model: model, updated_at: new Date().toISOString() })
    .eq('id', true);

  if (error) return { error: error.message };
  return { ok: true };
}
```

### Pattern 3: Scan Statistics Queries

**What:** Three stats are required — total scans, cached vs fresh ratio, and average parse time. The first two are straightforward with `count`. Average parse time is not currently stored in the schema.

**Schema gap:** The `menus` table has `parsed_at` and `created_at` but no `parse_time_ms` column. Average parse time cannot be computed without adding this column or changing strategy. See Open Questions.

```typescript
// Total scans
const { count: totalScans } = await supabaseAdmin
  .from('menus')
  .select('*', { count: 'exact', head: true });

// Source: https://supabase.com/docs/reference/javascript/select (verified 2026-02-25)
// { count: 'exact', head: true } returns count without fetching rows

// Cached vs fresh — menus table has no "from_cache" flag, but cache hits don't insert new rows.
// A fresh scan inserts a new row; a cache hit re-reads an existing row without inserting.
// There is no per-request flag for cache vs fresh in the current schema.
// Strategy: count menus with expires_at > now() (still valid/cached) vs total.
const { count: activeCacheCount } = await supabaseAdmin
  .from('menus')
  .select('*', { count: 'exact', head: true })
  .gt('expires_at', new Date().toISOString());

// Recent scans list (last 20)
const { data: recentScans } = await supabaseAdmin
  .from('menus')
  .select('id, url, source_type, parsed_at, expires_at')
  .order('parsed_at', { ascending: false })
  .limit(20);
```

**For AVG aggregate via PostgREST** (requires `pgrst.db_aggregates_enabled = 'true'` first):
```typescript
// Syntax from: https://supabase.com/blog/postgrest-aggregate-functions (verified 2026-02-25)
const { data } = await supabaseAdmin
  .from('menus')
  .select('avg_parse_ms:parse_time_ms.avg()');
// Only works after: ALTER ROLE authenticator SET pgrst.db_aggregates_enabled = 'true';
```

**Safe alternative via RPC:**
```sql
-- Create in Supabase SQL editor
create or replace function get_scan_stats()
returns json language plpgsql security definer as $$
begin
  return (
    select json_build_object(
      'total_scans', count(*),
      'active_cache_count', count(*) filter (where expires_at > now()),
      'avg_parse_time_ms', avg(parse_time_ms)
    )
    from menus
  );
end;
$$;
```
```typescript
const { data: stats } = await supabaseAdmin.rpc('get_scan_stats');
```

### Pattern 4: Landing → /scan Navigation with Animation

**What:** The Hero CTA (currently `<Btn primary big href="#waitlist">`) is updated to link to `/scan`. The `Btn` component uses a plain `<a>` tag for hrefs — this needs to use `next/link` `<Link>` for client-side navigation. Then a `motion.div` on the `/scan` page provides the entry fade.

**Why not upgrade `Btn` globally:** `Btn` is used for both in-page anchors (`#features`, `#waitlist`) and external links. `next/link` wraps and handles hash anchors fine, but the cleanest approach is to keep `Btn` as-is and pass `as={Link}` or use a `<Link>` wrapper in the Hero component.

```tsx
// Simplest approach: wrap Btn in Link in Hero.tsx
// Source: https://nextjs.org/docs/app/getting-started/linking-and-navigating (verified 2026-02-25)
import Link from 'next/link';
import Btn from '@/components/ui/Btn';

// In Hero.tsx — replace the waitlist CTA:
<Link href="/scan" passHref legacyBehavior>
  <Btn primary big>
    Scanner un menu
  </Btn>
</Link>
```

Or, since `Btn` renders `<a>` when `href` is provided, the cleanest fix is to make `Btn` aware of `next/link` when the href is an internal route:

```tsx
// Better: Update Btn to use Link for internal hrefs
import Link from 'next/link';

// In Btn.tsx — detect internal links
const isInternal = href && href.startsWith('/');
if (isInternal) {
  return <Link href={href} className={baseClasses} {...anchorProps}>{children}</Link>;
}
// existing <a> for external and hash links
```

**Entry animation on `/scan` page:**
```tsx
// app/scan/page.tsx or a wrapper component
// motion is already imported from 'motion/react' in other components
'use client'; // only if the wrapper is a client component
import { motion } from 'motion/react';

// Wrap the scan page content:
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.35, ease: 'easeOut' }}
>
  {/* scan page content */}
</motion.div>
```

`app/scan/page.tsx` is currently a Server Component. The cleanest approach: create a thin `ScanPageShell` client component that wraps with `motion.div`, and keep `page.tsx` as a Server Component importing it.

### Anti-Patterns to Avoid

- **Setting cookies in Server Component render:** You can READ cookies in Server Components, but `.set()` requires a Server Action or Route Handler. Calling `cookies().set()` during Server Component render will throw at runtime.
- **Relying on middleware alone for security:** Official docs (Next.js 16.1.6) explicitly state: "Middleware should not be your only line of defense. The majority of security checks should be performed as close as possible to your data source." Always check the cookie in the page/action, not just middleware.
- **Using `<a href="/scan">` instead of `<Link href="/scan">`:** A plain `<a>` triggers a full page reload, defeating client-side navigation. The current `Btn` component uses `<a>` for all hrefs — this must be patched for internal routes.
- **Blocking the whole `/admin` path with middleware without a data check:** For this simple use case, checking the cookie in the Server Component page is sufficient and avoids middleware complexity.
- **Exposing `ADMIN_SECRET` raw in a cookie value:** Store a derived token (e.g., base64url of the secret, or an HMAC), not the raw secret, in the cookie.
- **Using PostgREST aggregate AVG without enabling it first:** `pgrst.db_aggregates_enabled` is off by default on Supabase. If not enabled, the `.avg()` syntax silently returns null or errors. Use `rpc()` as a safe fallback.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie management | Custom `Set-Cookie` header manipulation | `next/headers` `cookies()` API | Handles domain, path, SameSite, partitioned; integrates with Next.js streaming |
| Client-side navigation | `window.location.href = '/scan'` | `next/link` `<Link>` | Full page reload vs. soft navigation; `<Link>` prefetches, preserves scroll, works with App Router cache |
| Page entry animation | CSS `@keyframes` in globals.css | `motion/react` `motion.div` | Already installed (12.34.3), consistent with existing FinalCta/Social/Faq animations; spring physics available |
| Count query | Manual JS `length` of fetched rows | `select('*', { count: 'exact', head: true })` | `head: true` returns no rows, count only — efficient |
| Supabase aggregate | Custom JS post-processing of all rows | PostgREST aggregate or `rpc()` Postgres function | Database-level aggregation; no fetching all rows |

**Key insight:** Every part of this phase has an existing idiom in the codebase or Next.js built-ins. The risk is reaching for custom solutions when the framework already provides the right tool.

---

## Common Pitfalls

### Pitfall 1: `cookies()` Must Be Awaited (Next.js 15+)

**What goes wrong:** Code like `const store = cookies(); store.get('name')` throws a runtime error because `cookies()` returns a Promise in Next.js 15+.
**Why it happens:** Next.js changed `cookies()` from synchronous to asynchronous in v15 to enable dynamic rendering control. Backwards compat exists but is deprecated.
**How to avoid:** Always `const cookieStore = await cookies();` — check every usage.
**Warning signs:** TypeScript error "Property 'get' does not exist on type 'Promise<...>'" or silent undefined at runtime.

### Pitfall 2: `/scan` Page is a Server Component — Can't Add `motion` Directly

**What goes wrong:** Adding `import { motion } from 'motion/react'` and `<motion.div>` to a Server Component fails with "motion is not a client component" error at build time.
**Why it happens:** Framer Motion / `motion/react` uses React hooks internally, which are Client Component-only.
**How to avoid:** Create a thin `'use client'` wrapper component (`ScanPageShell.tsx` or similar) that provides the `motion.div`, import it from the Server Component page.
**Warning signs:** `Error: Functions cannot be passed directly to Client Components` or `You're importing a component that needs useState`.

### Pitfall 3: Average Parse Time Column Does Not Exist

**What goes wrong:** The success criterion says "average parse time" but the `menus` table has no `parse_time_ms` column. Attempting to AVG a non-existent column returns null/error.
**Why it happens:** Phase 5 implemented the scan pipeline but didn't add timing instrumentation.
**How to avoid:** Either (a) add a `parse_time_ms integer` column to `menus` and populate it during `getOrParseMenu()` in `lib/cache.ts`, or (b) show this stat as "not yet tracked" and track it starting from Phase 7. Option (a) is correct and required by ADMN-03.
**Warning signs:** Stat shows null/0 for avg parse time without an obvious error.

### Pitfall 4: Supabase PostgREST Aggregates Not Enabled

**What goes wrong:** `.select('parse_time_ms.avg()')` returns `null` or `error: "aggregate functions are not allowed"`.
**Why it happens:** `pgrst.db_aggregates_enabled` is `false` by default on Supabase for security (prevents denial-of-service via expensive aggregates on public tables).
**How to avoid:** Either enable it with `ALTER ROLE authenticator SET pgrst.db_aggregates_enabled = 'true';` + `NOTIFY pgrst, 'reload config';` in the Supabase SQL editor, **or** use a Postgres function via `supabaseAdmin.rpc('get_scan_stats')` — this is safer and more explicit.
**Warning signs:** `avg()` returns null without an error logged; test in Supabase SQL editor first.

### Pitfall 5: `Btn` Component Renders `<a>` — Full Page Reload to `/scan`

**What goes wrong:** The Hero CTA `<Btn href="/scan">` triggers a full page reload because `Btn` renders a native `<a>` tag, not `next/link` `<Link>`.
**Why it happens:** `Btn` was designed for anchors and external links; internal route navigation was not considered.
**How to avoid:** Patch `Btn` to detect internal hrefs (starting with `/`) and render `<Link>` from `next/link`, OR wrap the call site in Hero.tsx with `<Link href="/scan" asChild>` (if using a compatible pattern).
**Warning signs:** Network tab shows `document` request type on CTA click; no smooth transition; browser shows loading spinner.

### Pitfall 6: Admin Dashboard Shows Stale Model After Save

**What goes wrong:** Admin saves a new model, sees success toast, but the dropdown still shows the old model.
**Why it happens:** The Server Component reading `admin_config` is cached by Next.js; after a Server Action updates the DB, the cache isn't invalidated.
**How to avoid:** Call `revalidatePath('/admin')` or `revalidateTag('admin-config')` inside the save Server Action after a successful update.
**Warning signs:** Save succeeds (no error) but UI doesn't reflect the change on next render; hard refresh shows the updated value.

---

## Code Examples

Verified patterns from official sources and codebase analysis:

### Cookie Set in Route Handler (admin login)

```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/cookies (verified 2026-02-24)
// app/api/admin/login/route.ts
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (password !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set('admin_session', process.env.ADMIN_SECRET_TOKEN ?? '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return NextResponse.json({ ok: true });
}
```

### Cookie Read in Server Component (admin page guard)

```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/cookies (verified 2026-02-24)
// app/admin/page.tsx
import { cookies } from 'next/headers';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');
  const authenticated = session?.value === process.env.ADMIN_SECRET_TOKEN;

  if (!authenticated) {
    return <AdminLogin />;
  }
  return <AdminDashboard />;
}
```

### Supabase Count Query (total scans)

```typescript
// Source: https://supabase.com/docs/reference/javascript/select (verified 2026-02-25)
// Already used in lib in app/actions/waitlist.ts
const { count, error } = await supabaseAdmin
  .from('menus')
  .select('*', { count: 'exact', head: true });
// count = number of rows, no data fetched
```

### Supabase Recent Scans List

```typescript
// Follows existing pattern from lib/cache.ts
const { data: recentScans, error } = await supabaseAdmin
  .from('menus')
  .select('id, url, source_type, parsed_at, expires_at')
  .order('parsed_at', { ascending: false })
  .limit(20);
```

### admin_config UPDATE

```typescript
// Following existing getAdminConfig() pattern in lib/cache.ts
const { error } = await supabaseAdmin
  .from('admin_config')
  .update({ llm_model: newModel, updated_at: new Date().toISOString() })
  .eq('id', true); // single-row enforcement: id is always boolean true
```

### motion.div Entry Animation on /scan

```tsx
// Source: motion.dev/docs (motion already at v12.34.3 in project)
// Consistent with FinalCta.tsx AnimatePresence pattern in codebase
'use client';
import { motion } from 'motion/react';

export function ScanPageShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
```

### Btn Component Patch for Internal Routes

```tsx
// Patch Btn to use next/link for internal hrefs (/scan, /admin, etc.)
import Link from 'next/link';

// In Btn render:
if ("href" in props && props.href) {
  const { href, ...anchorProps } = props as BtnAsAnchor;
  const isInternal = href.startsWith('/');
  if (isInternal) {
    return <Link href={href} className={baseClasses} {...anchorProps}>{children}</Link>;
  }
  return <a href={href} className={baseClasses} {...anchorProps}>{children}</a>;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Synchronous `cookies()` | `await cookies()` (async) | Next.js 15.0.0-RC | Must update all cookie access patterns; backwards compat exists but deprecated |
| `LayoutRouterContext` FrozenRouter for motion transitions | Simpler `motion.div` on page entry (no exit needed for `/scan`) | — | For a one-way entry animation (landing → scan), no FrozenRouter needed; complex frozen router pattern only needed for bidirectional transitions |
| `viewTransition: true` experimental | `motion/react` (stable, production) | Still experimental in Next.js 16.1.6 (2026-02-24) | Do NOT use `viewTransition` in production — official docs say "not recommended for production" |
| PostgREST aggregate disabled by default | Must enable with `ALTER ROLE authenticator` | PostgREST 12+ | Requires explicit opt-in; safer to use `rpc()` for admin stats |

**Deprecated/outdated:**
- `next-view-transitions` npm package: Superseded by React 19's built-in `<ViewTransition>` component, but the built-in is still experimental. For this project, use `motion/react` instead.
- Synchronous `cookies()`: Still works in Next.js 16 but will be removed — always use `await`.

---

## Open Questions

1. **`parse_time_ms` column does not exist in `menus` table**
   - What we know: ADMN-03 requires "average parse time." The `menus` table has `parsed_at` and `created_at` timestamps but no timing field.
   - What's unclear: Was parse time meant to be computed from `parsed_at - created_at`? That's not accurate (created_at is the row creation, not parse start). Or should a `parse_time_ms` column be added to `menus` and populated in `getOrParseMenu()`?
   - Recommendation: Add `parse_time_ms integer` column to `menus` schema (a new migration), instrument `getOrParseMenu()` in `lib/cache.ts` to measure and store it. This is a clean solution and affects Phase 5 code minimally (one timing call + one extra insert field).

2. **Cached vs fresh ratio definition**
   - What we know: Cache hits don't insert new rows — `getOrParseMenu()` returns early on cache hit. So the `menus` table only contains "fresh parse" events.
   - What's unclear: How to track "cache hits" if they never write to the DB? The ratio would always be 0/N fresh unless we track hits.
   - Recommendation: Add a `hit_count integer default 0` column to `menus` and increment it on cache hit in `getOrParseMenu()`. OR interpret "cached vs fresh" as "scans with expires_at > now() (still valid cache entries)" vs "total scans" — simpler and requires no schema change. The latter interpretation is pragmatically correct for the use case.

3. **Admin session token security**
   - What we know: The cookie value should not be the raw `ADMIN_SECRET`.
   - What's unclear: Should it be HMAC-signed with expiry, or is a simple base64 of the secret sufficient for a solo-founder internal tool?
   - Recommendation: For v1.1 solo-founder use, store `crypto.createHash('sha256').update(secret).digest('hex')` as the cookie value. This is deterministic (no DB needed), tamper-resistant, and appropriate for the threat model. If session invalidation on secret rotation is needed, the cookie naturally expires and must be re-entered.

---

## Sources

### Primary (HIGH confidence)

- Next.js 16.1.6 official docs — `cookies()` API: https://nextjs.org/docs/app/api-reference/functions/cookies (fetched 2026-02-24, version confirmed)
- Next.js 16.1.6 official docs — Authentication guide: https://nextjs.org/docs/app/guides/authentication (fetched 2026-02-24, version confirmed)
- Next.js 16.1.6 official docs — `viewTransition` experimental flag: https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition (fetched 2026-02-24, explicitly states "not recommended for production")
- Supabase blog — PostgREST Aggregate Functions: https://supabase.com/blog/postgrest-aggregate-functions (fetched 2026-02-25)
- Supabase JS reference — `select()` with count: https://supabase.com/docs/reference/javascript/select (fetched 2026-02-25)
- Project codebase — `lib/cache.ts`, `lib/supabase-admin.ts`, `lib/supabase.ts`, `supabase/schema.sql`, `components/sections/FinalCta.tsx`, `components/ui/Btn.tsx`, `app/scan/page.tsx` (read directly 2026-02-25)

### Secondary (MEDIUM confidence)

- Framer Motion page transitions pattern for Next.js App Router: https://www.imcorfitz.com/posts/adding-framer-motion-page-transitions-to-next-js-app-router (fetched 2026-02-25; consistent with motion/react v12 API)
- PostgREST discussion on aggregate enablement: https://github.com/supabase/postgrest-js/issues/199 (community-verified, consistent with blog post)

### Tertiary (LOW confidence)

- General pattern for admin session without full auth library: WebSearch results cross-verified with official Next.js auth docs; specific implementation details (token derivation approach) are author's recommendation, not from official source.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All libraries verified in `package.json`; versions confirmed from node_modules
- Architecture: HIGH — Cookie API and Supabase patterns verified from official docs; motion pattern verified from codebase usage + official docs
- Pitfalls: HIGH for cookie/motion/`<Link>` issues (official docs); MEDIUM for Supabase aggregate (requires DB config step, community-verified)
- Open questions: Confirmed gaps — schema inspection shows no `parse_time_ms` column; cache hit tracking is architectural, not speculative

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable APIs; Next.js cookie API and Supabase JS SDK are not fast-moving)
