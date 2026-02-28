---
quick_task: true
description: "Improve DishCard CTA visibility + replace Unsplash/Pexels with Serper.dev Google Image search"
---

# Quick Task 1: DishCard CTA + Serper Image Search

## Context

Two issues:
1. **DishCard CTA invisible** — the enrichment preview row (origin pill + cultural note text) is the only way to open the detail sheet, but it's too subtle. Users don't realize they can tap it.
2. **Photo quality** — Unsplash/Pexels stock photos are fundamentally wrong for specific dishes (e.g. "Chashu Mazesoba" returns braised pork belly instead of dry noodles with chashu). Google Images returns much better results. Switch to Serper.dev (Google Image search API — 2,500 free queries, then $0.001/query).

## Task 1: Make DishCard enrichment row a visible CTA

**files:** `components/menu/DishCard.tsx`
**action:**
- Replace the subtle origin pill + truncated cultural note with a proper tappable row
- Add a clear visual indicator: "Voir la fiche ›" or similar with an arrow/chevron
- Make the entire card tappable for full-depth items (not just the text)
- Keep the origin pill but add a clear CTA button/link style at the end of the enrichment preview row

**verify:** Visual — the CTA is obvious on both mobile and desktop
**done:** DishCard has a clear, visible way to open the detail sheet

## Task 2: Replace Unsplash/Pexels with Serper.dev Google Image search

**files:** `lib/images.ts`, `lib/image-utils.ts`, `.env.local`, `next.config.ts`
**action:**
- Replace `fetchFromUnsplash` and `fetchFromPexels` with `fetchFromSerper` that calls Serper.dev Images API
- Serper endpoint: `POST https://google.serper.dev/images` with `{ q: "Chashu Mazesoba", num: 5 }`
- Header: `X-API-KEY: <key>`, `Content-Type: application/json`
- Response: `{ images: [{ title, imageUrl, thumbnailUrl, ... }] }`
- Use `thumbnailUrl` for display (optimized size), `imageUrl` as source
- Keep relevance check but simplify — Google Images is inherently more relevant than stock photo search
- Remove Unsplash download tracking, UTM params (no longer needed)
- Update `next.config.ts` remotePatterns: remove Pexels, add Google thumbnail domains (encrypted-tbn0.gstatic.com)
- Add `SERPER_API_KEY` to `.env.local`
- Credit: "Source: Google Images" with link to source page

**verify:** Re-scan menu and check that Chashu Mazesoba shows a bowl of noodles, not braised pork
**done:** All dish images come from Serper.dev Google Image search with much better relevance

## Task 3: Clean up unused Unsplash/Pexels code

**files:** `lib/images.ts`, `lib/image-utils.ts`, `lib/dish-fallback.ts`, `components/menu/DishImageFallback.tsx`, `components/menu/DishImage.tsx`
**action:**
- Remove `fetchFromUnsplash`, `fetchFromPexels` functions entirely
- Remove `hexToDataURL` if no longer used (Serper thumbnails don't need blur placeholder)
- Remove unused `DishImageFallback.tsx` component (no longer imported anywhere)
- Remove `dish-fallback.ts` (cuisine gradients + emoji, no longer used)
- Keep `DishImage.tsx` if still used, otherwise remove
- Remove `UNSPLASH_ACCESS_KEY` and `PEXELS_API_KEY` from `.env.local`

**verify:** `npx tsc --noEmit` passes, no dead code
**done:** Codebase has no Unsplash/Pexels references
