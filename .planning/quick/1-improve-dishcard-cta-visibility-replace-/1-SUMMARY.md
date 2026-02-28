# Quick Task 1: DishCard CTA + Serper Image Search

## What was done

### Task 1: DishCard CTA visibility
- Replaced subtle origin pill + truncated text with a proper bordered button row
- Added chevron arrow icon (›) as visual affordance
- Added hover state with bg/border transition
- Added `card_see_detail` translation key in 4 locales (FR/EN/TR/DE)
- Commit: eefedcb

### Task 2: Serper.dev Google Image search
- Replaced Unsplash REST API + Pexels REST API with Serper.dev Google Image search
- Serper returns actual Google Image results — much better relevance for specific dishes
- Simplified pipeline: no more relevance heuristics, orientation filters, or rate limit guards
- Updated next.config.ts remotePatterns for Google thumbnail CDN (encrypted-tbn0.gstatic.com)
- Added SERPER_API_KEY to .env.local and Vercel (production + preview)
- Removed old Unsplash/Pexels API keys from .env.local
- Commit: 213e5fc

### Cleanup
- Simplified image-utils.ts (removed buildImageQuery, isImageRelevant, DISH_TYPE_MAP)
- lib/dish-fallback.ts and DishImageFallback.tsx are now dead code (no imports)

## Files changed
- `components/menu/DishCard.tsx` — CTA row redesign
- `lib/i18n/translations.ts` — card_see_detail key
- `lib/images.ts` — full rewrite: Serper.dev replaces Unsplash/Pexels
- `lib/image-utils.ts` — simplified to just hexToDataURL
- `next.config.ts` — Google thumbnail remotePatterns
- `.env.local` — SERPER_API_KEY replaces UNSPLASH/PEXELS keys
