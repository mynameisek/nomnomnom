# Pitfalls Research

**Domain:** Food-tech mobile app (menu scanning + AI recommendations) + waitlist landing page
**Researched:** 2026-02-25
**Confidence:** MEDIUM (domain-specific findings from multiple web sources; some claims verified against official docs; legal/liability findings flagged LOW)

---

## Critical Pitfalls

### Pitfall 1: LLM Recommending Items Not On The Menu

**What goes wrong:**
The AI assistant fabricates dish suggestions — recommending items that sound plausible but do not exist on the parsed menu. Users order a dish and find out it doesn't exist. Trust collapses immediately.

**Why it happens:**
LLMs have strong priors about cuisine and invent credible-sounding dishes. Without strict grounding, the model "completes" a recommendation based on training data, not the actual scanned content. This is especially risky when menu parsing was partial (missed dishes) — the LLM fills gaps with invented items.

**How to avoid:**
- Pass only parsed menu items as the candidate pool to the LLM in the system prompt. Use structured output (JSON) with dish IDs constrained to the parsed set.
- Validate every recommended dish ID against the parsed menu before returning to the user. Any ID not in the menu → strip recommendation, do not show.
- Never let the LLM free-generate dish names. Use the format: "From the following dishes: [list], recommend Top 3 for [criteria]."
- Add a server-side post-processing step that rejects any recommendation referencing a dish name not in the menu.

**Warning signs:**
- Integration test: ask Top 3 on a 5-item menu and check that all 3 exist.
- Users reporting dishes don't exist or asking for items the app showed.
- High "item not found" rate at restaurant.

**Phase to address:** MVP App — Menu Parsing + AI Assistant phase (before any user testing)

---

### Pitfall 2: Allergen Information Presented as Guaranteed

**What goes wrong:**
App shows allergen badges (e.g., "contains gluten", "nut-free") derived from menu text. User with severe allergy relies on this, consumes the dish, has a reaction. Legal and reputational catastrophe.

**Why it happens:**
EU Regulation 1169/2011 imposes strict allergen labeling requirements on food businesses, but a third-party app inferring allergens from unstructured menu text has no ground truth. OCR errors, missing ingredients, and kitchen cross-contamination are all invisible to the app. Developers underestimate this gap.

**How to avoid:**
- Every allergen display must use the word "inféré" ("inferred") never "garanti" ("guaranteed") — this is already in product rule 10, but must be enforced at the UI component level so it's impossible to accidentally show a guarantee.
- Implement a mandatory "server phrase" — a hardcoded disclaimer shown before allergen information in every language: e.g., "Ces informations sont inférées du menu et peuvent être incomplètes. Signalez toujours vos allergies au serveur."
- Add a legal disclaimer in the app's Terms of Service explicitly limiting liability.
- Do not show allergen badges as checkmarks or colored pills that read as "safe." Use neutral warning-style UI (⚠ icon, muted color).

**Warning signs:**
- UI shows allergen as a clean green "safe" badge.
- Disclaimer text is smaller than 12px or hidden behind a tap.
- Any copy says "free from" without caveat.

**Phase to address:** MVP App — Dish Cards UI phase, before any public beta

---

### Pitfall 3: Menu Parsing Brittleness Causing Silent Failures

**What goes wrong:**
The parser handles the 3 test restaurants in development but fails silently on 40% of real restaurants during beta. Users see empty dish cards, partial menus, or dishes with garbled names — with no indication that parsing failed.

**Why it happens:**
Restaurant websites use wildly inconsistent HTML structures (PDFs embedded, JavaScript-rendered menus, image-only menus, Squarespace/Wix templates, third-party menu widgets like Zenchef, TheFork). Scrapers that work on manually tested sites break on the long tail. The 4-8 week scraper breakage cycle (industry average) is well-documented.

**How to avoid:**
- Build a parse confidence score system: every parsed menu gets a score (number of dishes found, name/price ratio, description coverage). Surface this in the app UI (✅ Menu vs ⚠ Inféré badges are partially this).
- Implement fallback chain: URL parse → PDF extract → OCR photo → manual user correction. Never return an empty result without trying all fallbacks.
- Log parsing failures with restaurant URL and failure mode. Build a monitoring dashboard from day 1, not after beta failures accumulate.
- For known menu platforms (TheFork, Zenchef, OpenTable), write dedicated structured parsers rather than generic HTML scrapers.
- Test against a corpus of 30+ diverse real restaurant menus (not just local favorites) before shipping.

**Warning signs:**
- Parse success rate < 85% on test set.
- Dish cards showing "—" or empty description fields.
- User feedback mentioning "menu incomplet" or wrong dishes.
- Dish count from parse is 0 or 1 for a full restaurant menu.

**Phase to address:** MVP App — Menu Parsing Engine phase (core infrastructure)

---

### Pitfall 4: LLM Cost Explosion Without Caching

**What goes wrong:**
Each scan triggers a full LLM call for dish enrichment (translation + cultural explanation + allergen inference + Top 3). At 0.10€/scan and 50 testers × 5 scans/day, that's 25€/day in testing alone. At 5000 MAU with 10 scans/month, it's 5000€/month uncached.

**Why it happens:**
Developers treat LLM calls as cheap during development (low volume). Cache architecture is added "later" as an optimization, but retrofitting caching onto an uncached schema is a partial rebuild. The schema design must encode cache keys from the start.

**How to avoid:**
- Design the data model from day 1 with a `parsed_menu` table keyed by `(restaurant_url, menu_hash)`. Once a menu is parsed and enriched, all subsequent scans of the same menu hit the cache — zero LLM cost.
- Dish enrichment (translation, cultural explanation) must be stored at the dish level, not the session level. `dish_enrichment` table keyed by `(canonical_dish_name, language)`.
- Top 3 recommendations are session-specific (depend on user criteria) but use cached dish data as input. Only the final ranking call is per-user.
- Use OpenAI prefix caching: keep the system prompt (menu context) static at the start of the prompt; only the user criteria varies. This automatically gets 50% cost reduction on cached prefixes.
- Set hard rate limits per user per day before caching is proven to work (3 free Top 3/day is already in the product, enforce it on the backend from day 1).

**Warning signs:**
- LLM cost per scan > 0.05€ after first month of real usage.
- Same restaurant URL generating multiple LLM calls.
- No `menu_hash` or equivalent fingerprint in the database schema.

**Phase to address:** MVP App — Backend architecture phase (database schema design, before first LLM integration)

---

### Pitfall 5: Landing Page Animations Breaking on Low-End Android Mobile

**What goes wrong:**
The phone demo animation (scan → dish cards → Top 3) is designed and tested on a MacBook Pro + iPhone 14. It renders at 60fps in the browser. On low-end Android devices (the primary demographic for a Strasbourg student/tourist launch), it drops to 10-15fps, causing jank that makes the product look broken rather than impressive.

**Why it happens:**
CSS-heavy animations, large Lottie files, and Framer Motion spring animations with large `stiffness` values all cause layout recalculations on the main thread. React Server Components don't help here — the animation budget is the rendering thread.

**How to avoid:**
- Animate only `transform` and `opacity` — never `width`, `height`, `top`, `left`, or `margin`. These avoid layout recalculations.
- Keep simultaneous Lottie animations to 1 on screen at a time. Use `React.memo` on Lottie components. Constrain Lottie file sizes to < 200KB.
- Test the landing page on a mid-range Android device (Xiaomi Redmi Note class) before considering it "done." Use Chrome DevTools throttled CPU (6x slowdown) as a proxy.
- Use `will-change: transform` sparingly — only on elements that actually animate, never globally.
- Prefer CSS transitions with `ease-out` over JS-driven physics springs for the phone mockup scroll effect.

**Warning signs:**
- Lighthouse mobile score < 80 for performance.
- Chrome DevTools Performance panel showing > 16ms frames during animation.
- Animation jank visible on throttled CPU simulation.

**Phase to address:** Milestone 1 — Landing Page, during animation implementation

---

### Pitfall 6: Waitlist Signup Killed by Form Friction

**What goes wrong:**
The landing page collects emails for the waitlist. Conversion rate ends up at 2-3% instead of 8-15% typical for food-tech pre-launches. Waitlist of 50 instead of 500. Product validation data is thin.

**Why it happens:**
Common mistakes: form asks for name + email + phone number (every extra field cuts conversion 10-20%); form is not at the top of the page; CTA says "S'inscrire" instead of something specific; no social proof on the same screen as the CTA; no confirmation email sent.

**How to avoid:**
- Email only in the waitlist form. Name and preferences can be collected post-confirmation.
- Place a waitlist CTA in the hero section, above the fold, with a second CTA at the bottom of the page.
- CTA copy should state the benefit, not the action: "Être parmi les premiers à scanner" not "Rejoindre la liste."
- Show live counter: "XXX personnes sur liste d'attente" — even if you start at a seeded number, social proof drives conversions.
- Send an automated confirmation email immediately. Silent signups lose 30-40% of early adopters to doubt.
- Test the form submission flow on mobile before launch — validation errors and keyboard behavior break forms on iOS Safari frequently.

**Warning signs:**
- Waitlist signup rate < 5% of unique visitors after 2 weeks.
- Form requires more than 1 field.
- No confirmation email being sent.
- Form is below the fold on mobile.

**Phase to address:** Milestone 1 — Landing Page, core conversion optimization

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode restaurant parsers for 5 test restaurants | Ship faster, skip generic parser complexity | Fails on any restaurant outside test set; full rewrite needed | Never — even MVP needs the fallback chain |
| Skip `menu_hash` caching, call LLM on every scan | Simpler implementation, faster to build | LLM costs blow up; retrofitting cache requires schema migration | Never — cache must be in schema from day 1 |
| Use `<img>` for dish illustrations, no lazy loading | Simple implementation | 50+ images load on scroll, crushes mobile data users and LCP score | Never on the landing page; lazy load everything |
| Skip allergen disclaimer component, add text inline | Faster to ship | Risk of missing disclaimer in edge cases; legal exposure | Never — allergen disclaimer must be a mandatory shared component |
| Embed Lottie JSON inline in component | Avoids separate file request | Inflates JS bundle; re-parses on every mount | Never — keep Lottie files external and lazy-loaded |
| Store parsed menu as raw text, not structured JSON | Simpler initial schema | Cannot reliably index, cache, or diff menus; full reparse always required | MVP only if replaced in Phase 2 — flag as tech debt explicitly |
| Call LLM synchronously in API handler | Simpler code | Timeouts on slow LLMs block requests; bad mobile experience | Never — queue LLM calls or use streaming from day 1 |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| OpenAI API | Not setting `max_tokens` — runaway responses cost 10x expected | Always set `max_tokens` per call type (enrichment: ~500, Top 3: ~200) |
| OpenAI API | Using GPT-4o for all calls including simple translations | Use GPT-4o-mini for translations and enrichment; reserve GPT-4o for Top 3 complex reasoning |
| Vision Camera (React Native) | `onBarCodeScanned` fires multiple times for one scan — triggers multiple API calls | Debounce scan results; disable scanner immediately after first valid QR decode |
| iOS Camera Permission | App crashes if camera permission not in `info.plist` before submission | Add `NSCameraUsageDescription` string before first TestFlight build |
| Vercel free tier | 100GB bandwidth/month exceeded by large Lottie/video assets | Host video and large assets on Cloudflare R2 or similar; use Vercel only for HTML/JS/CSS |
| Supabase / Postgres | Storing translated dish cards per language per restaurant without an index on `(restaurant_id, language)` causes full table scans | Add composite index on `(restaurant_id, language)` at schema creation time |
| Email waitlist (Resend/Mailchimp) | Double opt-in flow not set up → spam complaints → email domain blacklisted | Configure double opt-in from day 1; use a subdomain for transactional email |
| PDF menu parsing | Using `pdf.js` on the client — exposes large bundle, slow on mobile | Parse PDFs server-side only; return structured JSON to client |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| No server-side menu cache | LLM cost 10x projection; API timeout on repeated scans | `parsed_menu` table with `menu_hash` key; TTL invalidation | From day 1 with > 10 concurrent users |
| Synchronous LLM calls in API handler | Request timeouts > 30s on mobile; UI spinner forever | Use background job queue (BullMQ/Inngest) + websocket or polling for result | At any user-facing latency > 5 seconds |
| Full menu reparse on every scan | Unnecessary OCR cost (0.10€ per photo); slow response | Hash the menu input; check cache before OCR pipeline | Immediately, if OCR is used at all |
| Landing page: all images loaded eagerly | LCP > 5s on mobile; Lighthouse score collapse | `loading="lazy"` on all below-fold images; use `next/image` with size hints | On any mobile connection slower than WiFi |
| React Native: too many animated components in FlatList | FlatList scroll jank; dropped frames on Android | Virtualize list; animate max 1 item at a time; use `getItemLayout` | With > 20 dish cards in a list |
| Translation stored at scan level not dish level | Same dish translated 100x; LLM cost scales with users not with restaurants | Store translations at `(dish_canonical_id, language)` in DB | At 50+ users scanning the same restaurant |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing OpenAI API key in React Native app bundle | Key stolen; unlimited LLM cost billed to account | ALL LLM calls must go through a backend proxy. Never put API keys in the app. |
| No rate limiting on scan endpoint | Abuse bots scan 10,000 menus/hour; LLM bill in thousands of euros | Implement rate limiting from day 1: IP-based (10 scans/hour) + user-based (3 Top 3/day) |
| User-uploaded OCR photos stored with original filenames | Path traversal; filename collisions | Use UUID filenames for all uploads; store in private bucket, serve via signed URLs |
| Allergen data presented without disclaimer | Implicit guarantee of safety; potential liability under EU consumer protection law | Mandatory "inféré" label on all allergen data; disclaimer in ToS and in-app |
| No input sanitization on URL scan field | SSRF attack — attacker passes internal URLs (e.g., `http://localhost/admin`) | Validate and whitelist URL schemes (only `https://`); block private IP ranges before fetch |
| Waitlist emails stored in plaintext in DB | GDPR violation; data breach risk | Encrypt email at rest; implement GDPR deletion endpoint from day 1 |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Forcing account creation before first scan | 60-80% drop-off before seeing product value | Scan = home, no account required (product rule 8). Progressive disclosure: scan first, account for history/social |
| Showing a loading spinner for LLM enrichment with no timeout | User waits 45 seconds with no feedback; closes app | Show skeleton cards immediately; stream dish data as it arrives; show timeout + retry at 10s |
| Allergen shown as green checkmark "safe" | Allergy sufferer trusts it; potential harm | Use ⚠ icon + muted color + "inféré" label — never a "safe" positive indicator |
| Dish card shows no image placeholder on load | Cards shift layout when images load; jarring scroll | Reserve image space with fixed aspect ratio placeholder from the start |
| Translation defaults to French even for Turkish/German restaurant menus | Non-French speakers leave immediately | Detect device locale on first launch; set interface language accordingly; let user override |
| Top 3 assistant result is generic ("Choose the chicken, it's popular") | Feels like a placeholder; not trustworthy | Tie each recommendation to specific dish attributes: "Le Kofte — proche de ton critère épicé, seul plat grillé" |
| Landing page hero is too abstract ("Chaque plat a une histoire") without showing the product | Visitors don't understand what the app does; bounce immediately | Lead with the phone mockup animation playing automatically above the fold |

---

## "Looks Done But Isn't" Checklist

- [ ] **Menu parsing:** Parser tested on 5 local restaurants. Verify it works on a TheFork-hosted menu, a PDF menu, a Wix restaurant site, and a QR code pointing to a Google Doc.
- [ ] **Allergen disclaimer:** Allergen badges look complete. Verify the "inféré" label and server phrase are visible in all 4 languages without any tap required.
- [ ] **LLM cache:** AI recommendations work in dev. Verify that scanning the same restaurant twice in production does NOT trigger a second LLM call for enrichment (check DB logs).
- [ ] **Waitlist form:** Form submits successfully. Verify a confirmation email arrives within 60 seconds on mobile (not just localhost).
- [ ] **Animation on Android:** Phone demo animation looks good on MacBook + Chrome. Verify it on a mid-range Android device (Xiaomi Redmi or equivalent) — check for jank.
- [ ] **Rate limiting:** 3 Top 3 per day works on first user. Verify the limit persists after app restart and cannot be bypassed by clearing app cache.
- [ ] **Translation accuracy:** FR/EN translations look correct on test menus. Verify a Turkish dish name (e.g., "İskender Kebap") is translated with cultural context, not just transliterated.
- [ ] **Camera permission flow:** QR scan works on developer's iPhone. Verify the permission request flow on a fresh Android install — check for crash if permission denied mid-scan.
- [ ] **GDPR deletion:** Waitlist email stored in DB. Verify there is a functional delete endpoint (even if not user-facing yet) before collecting any real emails.
- [ ] **LLM API key exposure:** App connects to LLM and works. Verify the API key is NOT in the app bundle (check with `strings` on the IPA/APK).

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| LLM hallucination in production | MEDIUM | Add server-side dish ID validation; clear affected cached recommendations; issue user-facing notice |
| Allergen disclaimer missing in production | HIGH | Emergency hotfix deployment; legal review; proactive user notification if severe |
| Menu parser breaks for major restaurant chain | LOW | Add dedicated parser for that chain; use OCR fallback in the interim; monitor parse success rate dashboard |
| LLM cost overrun (no cache) | HIGH | Emergency rate limit tightening; schema migration to add caching layer; estimated 1-2 weeks of engineering |
| Landing page zero conversions | LOW | A/B test CTA copy; move form above fold; add social proof counter; no architectural change needed |
| Waitlist email domain blacklisted | MEDIUM | Switch to new subdomain; re-verify with email providers; 48-72 hour recovery window |
| Camera permission crash on Android | LOW | Hotfix with `try/catch` around permission request; add graceful fallback to URL input |
| Translation producing offensive or wrong cultural output | MEDIUM | Add human review step for new language-cuisine pairs; implement user "flag translation" feature |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| LLM recommending non-menu items | MVP — AI Assistant integration | Integration test: Top 3 on 5-item menu returns only those 5 items |
| Allergen presented as guaranteed | MVP — Dish Cards UI | UI audit: no "safe" badges without "inféré" label; legal review of disclaimer copy |
| Menu parsing brittleness | MVP — Menu Parsing Engine | Corpus test: 30+ diverse restaurant URLs, measure parse success rate |
| LLM cost explosion | MVP — Backend schema design | Verify DB has `menu_hash` cache table before first LLM call lands in production |
| Animation performance on mobile | Milestone 1 — Landing Page | Lighthouse mobile score > 80; manual test on mid-range Android |
| Waitlist form friction | Milestone 1 — Landing Page | Conversion rate > 5% after 2 weeks live; confirmation email flow verified |
| SSRF via URL scan field | MVP — API security hardening | Penetration test: send `http://localhost` and `http://169.254.169.254` — both must return 400 |
| API key in app bundle | MVP — First TestFlight build | Run `strings` on IPA — confirm no OpenAI key present |
| Translation cultural inaccuracy | MVP — Multi-language phase | Human review of 20 TR/DE dish translations before public beta |
| Forced account creation before scan | MVP — Progressive disclosure UX | User test: confirm a new user can complete a full scan without creating an account |

---

## Sources

- [AI Hallucination Liability: Legal Exposure For Startups In 2025](https://techandmedialaw.com/ai-hallucination-liability/) — MEDIUM confidence
- [EU Regulation 1169/2011 on Allergen Labelling](https://sites.manchester.ac.uk/foodallergens/information-for-food-businesses/eu-legal-requirements-on-food-allergen-labelling/) — HIGH confidence (official EU regulation)
- [Top Web Scraping Challenges in 2025 — ScrapingBee](https://www.scrapingbee.com/blog/web-scraping-challenges/) — MEDIUM confidence
- [LLM Cost Optimization: Complete Guide 2025](https://ai.koombea.com/blog/llm-cost-optimization) — MEDIUM confidence
- [Prompt Caching Infrastructure — Introl 2025](https://introl.com/blog/prompt-caching-infrastructure-llm-cost-latency-reduction-guide-2025) — MEDIUM confidence
- [React Native Reanimated Performance Guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/) — HIGH confidence (official docs)
- [Optimizing Lottie Animations in React Native](https://mukkadeepak.medium.com/optimizing-lottie-animations-in-react-native-with-the-lottie-format-8f7a31ff53ed) — LOW confidence (single source)
- [How to Create a Waitlist Landing Page That Converts (2026 Guide)](https://waitlister.me/growth-hub/guides/waitlist-landing-page-optimization-guide) — MEDIUM confidence
- [Cultural Adaptation of Menus: A Fine-Grained Approach — arXiv](https://arxiv.org/html/2408.13534v1) — HIGH confidence (academic paper)
- [AI Translation Accuracy Gap — GetBlend](https://www.getblend.com/blog/ai-translation-accuracy-gap/) — LOW confidence (vendor blog)
- [QR Code Scanning with VisionCamera](https://react-native-vision-camera.com/docs/guides/code-scanning) — HIGH confidence (official docs)
- [From Fuzzy Photos to Perfect Data: Building an AI-Powered OCR System for Restaurant Menus — Medium](https://medium.com/@zafarobad/from-fuzzy-photos-to-perfect-data-building-an-ai-powered-ocr-system-for-restaurant-menus-bb575b16db59) — LOW confidence (single practitioner account)
- [Dark Patterns in UX (2025 examples) — Caboodle](https://caboodle.studio/blog/dark-patterns-in-ux-with-examples) — MEDIUM confidence
- [LLM Security in 2025 — Oligo Security](https://www.oligo.security/academy/llm-security-in-2025-risks-examples-and-best-practices) — MEDIUM confidence

---
*Pitfalls research for: NŌM — food-tech menu scanning app + landing page*
*Researched: 2026-02-25*
