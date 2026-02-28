# Milestones

## v1.0 Landing Page (Shipped: 2026-02-25)

**Phases completed:** 3 phases, 5 plans, 13 tasks
**Timeline:** 2026-02-25 (single session, ~3 hours)
**Codebase:** ~1,984 LOC (TypeScript/TSX/CSS), 63 files
**Stack:** Next.js 16 + React 19 + Tailwind v4 + motion/react + Supabase

**Key accomplishments:**
- Next.js 16 + Tailwind v4 brand design system (dark theme, Outfit font, 6 brand colors) deployed to Vercel
- Animated phone demo cycling through QR scan → menu detection → dish cards → AI Top 3 on 9s loop
- 9 landing page sections: hero, phone demo, dish carousel, features, reverse search, social/gamification, pricing, FAQ, final CTA
- Working Supabase waitlist with email signup, referral codes, position tracking, and inline dashboard
- Branded OG/Twitter cards via next/og, full SEO metadata, semantic HTML (landmarks + heading hierarchy)
- All animations GPU-composited (transform + opacity only), all images lazy-loaded with gradient+emoji fallbacks

---


## v1.1 MVP App (Shipped: 2026-02-28)

**Phases completed:** 6 phases, 10 plans
**Timeline:** 2026-02-25 → 2026-02-28 (4 days)
**Stack:** Next.js 16 + React 19 + Supabase + OpenAI (AI SDK 6) + Screenshotone

**Key accomplishments:**
- 3 scan methods (QR camera, URL paste, photo OCR) through LLM pipeline to parsed menu pages
- PDF menu support via native GPT-4o file input (no screenshot needed)
- Eazee-link provider: structured API integration with Instagram/Facebook-based Places hints
- Dish cards with 4-language translation (FR/EN/TR/DE), EU 14 allergen detection, dietary tags
- Free-tier translation cascade (DeepL → Google → Azure → MyMemory → LLM fallback)
- Client-side instant filters: dietary preference, allergen exclusion, spice level, text search
- Google Places enrichment: address, phone, rating, photo for restaurant context
- Protected admin dashboard with LLM model selector and scan statistics
- URL hash caching with TTL — repeat scans return instantly without LLM cost

---

