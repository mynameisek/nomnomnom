# Feature Research

**Domain:** Pre-launch waitlist landing page + food-tech mobile app (menu scanning, translation, AI dish recommendation)
**Researched:** 2026-02-25
**Confidence:** MEDIUM — landing page patterns are HIGH confidence (well-documented); food-tech feature landscape is MEDIUM (competitors verified, gamification specifics LOW from single sources)

---

## Part 1: Landing Page Features

The landing page is the first deliverable. It must do two jobs simultaneously: convert visitors to waitlist signups AND demonstrate enough of the app to justify that signup.

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Hero section with clear value proposition | First thing visitors see; unclear headline = instant bounce | LOW | "What is this and why should I care" answered in 5 seconds |
| Single-field email signup form | Standard for waitlist pages; extra fields kill conversion | LOW | Ask for email only. Name field optional but reduces conversion. Position above the fold |
| Animated app demo / phone mockup | Users need to see the product before they believe it | MEDIUM | The nom-landing-v5.jsx already plans this: QR scan → parse → dish cards → AI Top 3. Critical for NOM since the concept (menu scanning) is unfamiliar |
| Mobile-responsive layout | 60%+ web traffic is mobile; target audience likely discovers via phone | LOW | Ironic requirement for a mobile app landing page — easy to skip, fatal to miss |
| Feature breakdown section | Users need specifics after the hero hook | LOW | 3–5 features with benefit-oriented descriptions, not just feature names |
| Pricing / tier preview | Sets expectations, filters qualified leads into waitlist | MEDIUM | Even pre-launch pricing anchors perceived value. Show Free / Pass / Pro tiers |
| FAQ section | Reduces support burden, handles common objections | LOW | Focus on "when will it launch", "what cities", "how does the scan work" |
| Privacy / minimal legal footer | GDPR requirement (France/EU), users expect it | LOW | Essential for email collection in France. Cookie consent banner required |

### Differentiators (Competitive Advantage on the Landing Page Itself)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Scroll-triggered animated phone demo | Makes the product feel alive before it exists; competitors use static screenshots | HIGH | The planned hero animation (QR → parse → dish cards → AI Top 3) is NOM's main hook. Must feel smooth and premium. Requires careful implementation to avoid jank on mobile |
| Dish carousel with real restaurant content | Strasbourg-specific content makes it feel real and local, not generic | MEDIUM | Use actual Strasbourg restaurant dishes. Authenticity beats polish for local trust |
| Waitlist position counter + referral loop | Creates urgency and social proof; position-based incentives outperform monetary rewards | MEDIUM | "You are #247 on the list. Refer 3 friends to jump 50 spots." Proven to 3-5x conversion rates (Robinhood, Superhuman case studies) |
| Social/gamification section preview | Shows the depth of the app; competitors show screenshots, NOM can show leaderboard and Taste Profile previews | HIGH | Demonstrates NOM is a platform, not just a utility tool |
| Reverse search interactive demo | Unique feature, no competitor does this — show it on the landing page | HIGH | Let users click a dish image and see what restaurants have it. Even a faked interactive demo drives signups |
| Dark theme with orange accent | Aesthetic differentiation from clinical white food apps | LOW | Consistent with NOM brand. Dark UIs feel premium and tech-forward |
| Strasbourg-specific copy and imagery | Local trust signal; "built for people like you in Strasbourg" | LOW | Use Strasbourg landmarks, local restaurant names in demos |

### Anti-Features (Landing Page)

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| Full user account creation at signup | "Capture more data upfront" | Friction kills conversion; violates minimum viable ask principle | Email only. Collect preferences after signup via follow-up email sequence |
| Video autoplay with sound | Demonstrates product dynamically | Instantly annoying on mobile; triggers browser autoplay blocks | Animated mockup with user-triggered audio, or muted autoplay with caption |
| Blog / content section | "SEO and thought leadership" | Pre-launch, zero indexed content helps; adds build complexity | Launch content post-launch. Landing page is conversion, not discovery |
| Social media feed embed | Shows activity / community | Live-loaded embeds slow page, break on API changes, often feel empty pre-launch | Static screenshot of social proof with follower count. Update manually |
| Real-time waitlist count that inflates | Creates FOMO | If it's obviously fake it destroys trust. Inflated counters are common and users notice | Show real count, even if small. "47 foodies in Strasbourg already joined" is more credible than "10,000 on the list" if you're a local app |
| Multi-page navigation / full website | Gives users places to wander | Waitlist pages convert better without nav menus — every link is an exit | One-page scroll layout. Remove all outbound links except legal |

---

## Part 2: Mobile App Features

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Menu photo scan (camera) | Core product promise. Missing = broken app | HIGH | OCR + AI pipeline. Camera permissions, image quality handling, dark/blurry photos must be handled gracefully |
| Multi-language menu translation | Direct competitor AnyMenu does this free for 50+ languages. Not having it = inferior product | MEDIUM | 50+ languages is table stakes. NOM's translation must be faster or more contextually accurate to differentiate |
| Dish description / explanation | Users scanning foreign menus need to understand what they're ordering | MEDIUM | "What is Flammekueche?" level explanations. Competitors: MenuGuide includes this in free tier |
| Allergen / dietary flag display | EU regulation awareness + user safety expectation. Increasingly mandatory | MEDIUM | Flag: gluten, nuts, dairy, shellfish, pork minimum. Vegan/vegetarian markers expected |
| Dish cards UI (image + name + description) | Visual format is how food is communicated in 2026. Text-only menus feel outdated | MEDIUM | NOM plans "dish cards" — this is the right format. Pinterest-style grid or swipe cards both work |
| Free tier with meaningful limits | Users expect to try before paying. Hard paywall = uninstall | LOW | MenuGuide: 3 scans/day, 8 items free. NOM's credit model is appropriate |
| Offline / cached results | Restaurant environments have poor signal. Scanned menus should persist | MEDIUM | Cache scan results locally. Users expect scanned menu to stay accessible during the meal |
| App Store / Play Store presence | Distribution table stake; TestFlight is only valid for beta | LOW | Required for paid launch |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI Top 3 recommendation ("AI Picks") | No competitor offers personalized AI-ranked dish recommendations from a scanned menu. MenuGuide and AnyMenu translate — they don't recommend | HIGH | This is NOM's primary differentiator. Must account for user preferences, dietary filters, and meal context (lunch vs dinner, solo vs group) |
| Taste Profile | Builds a persistent preference model that improves over time. Users become invested in the product | HIGH | Requires onboarding questions + iterative learning from dish ratings. The more meals tracked, the more accurate the recommendations |
| Match Score per dish | "88% match for you" on each dish card creates a personal, gamified experience | HIGH | Depends on Taste Profile. Drives engagement because users want to see scores change |
| Reverse search ("What restaurant has this?") | Unique: user finds a dish photo online and discovers Strasbourg restaurants serving it | HIGH | Technically complex (image embeddings + restaurant database) but highly viral/shareable. No competitor has this |
| "Stories" for dishes | Adds cultural context (history, origin, pairing suggestions) to dishes | MEDIUM | Differentiates from pure utility apps. Makes NOM educational and shareable |
| NOM Wrapped (annual review) | Yearly "Your food year in review" drives massive social sharing. Inspired by Spotify Wrapped | HIGH | Requires 12 months of data to be meaningful. Build data collection from day 1, ship Wrapped later |
| Leaderboard / social layer | Community element: see who explored the most dishes, top raters in Strasbourg | HIGH | Local leaderboard ("Top 10 foodies in Strasbourg this month") is more engaging than global. Requires critical mass to feel alive |
| QR code scan (restaurant-provided) | Restaurants can provide NOM-optimized QR codes for their menus | HIGH | Requires B2B restaurant onboarding. Powerful network effect but separate product line. Defer unless restaurants request it |
| Credits system with top-ups | Transparent, fair monetization that users can control | MEDIUM | Better than hard paywall. Users tolerate credit limits if the free tier is genuinely useful |
| Strasbourg-first local database | Hyperlocal data: every restaurant in Strasbourg indexed, with photos and dish-level data | HIGH | Extremely valuable for launch differentiation. Building this database is a major pre-launch task |

### Anti-Features (Mobile App)

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| Food delivery integration | "Users can order directly" | Entirely different product. Requires restaurant partnerships, payment rails, logistics. Scope explosion | Surface "Order via Uber Eats" deep link instead. No commission, no complexity |
| User-generated restaurant reviews | "More content, more engagement" | Competes with Google Maps and TripAdvisor where users already have history. Won't win | Dish-level ratings only (personal, not public by default). Different from restaurant reviews |
| Nutrition tracking / calorie counting | "Health-conscious users" | Requires nutritional database for every dish in every restaurant. Enormous data problem. Yazio and MyFitnessPal own this space | Allergen flags cover the safety use case. Full nutrition is a different product |
| Menu creation for restaurants | "Two-sided marketplace" | Restaurant-side product requires sales team, onboarding, and support. B2B is a different business | Stick to consumer side. Let restaurants discover NOM organically if it gains traction |
| Real-time table availability / reservations | "One-stop dining app" | Requires restaurant integrations, reservation systems. Resy/OpenTable own this | Deep link to existing reservation tools |
| Multi-city launch simultaneously | "Maximize TAM" | Dilutes the local database quality. No leaderboard feels alive. No social proof | Strasbourg-first. Dense local data beats thin global data. Expand city by city |
| Social feed / following system | "Community building" | Heavy moderation burden, cold start problem, competes with Instagram food content | Leaderboard + Wrapped are lightweight social proof without a full social graph |

---

## Feature Dependencies

```
[Camera / OCR Scan]
    └──requires──> [Menu Parsing Pipeline (AI)]
                       └──requires──> [Dish Card Generation]
                                          └──requires──> [Translation Layer]
                                          └──requires──> [Allergen Detection]
                                          └──enables──> [AI Top 3 Recommendation]

[Taste Profile]
    └──requires──> [Dish Rating / Feedback]
    └──enables──> [Match Score per Dish]
    └──enables──> [AI Top 3 Recommendation] (personalized)
    └──enables──> [NOM Wrapped] (requires 3+ months of data)

[Strasbourg Restaurant Database]
    └──requires──> [Data Collection / Ingestion Pipeline]
    └──enables──> [Reverse Search]
    └──enables──> [Leaderboard] (meaningful local rankings)
    └──enables──> [Dish Stories] (curated local content)

[Waitlist Email Collection]
    └──enables──> [Referral / Viral Loop]
    └──enables──> [Pre-launch Beta Invites]
    └──enables──> [Launch Email Campaign]

[Credits System]
    └──requires──> [Payment Rails (Stripe)]
    └──enables──> [Free Tier Limits]
    └──enables──> [Pass / Pro Subscription]

[Leaderboard]
    └──requires──> [User Accounts]
    └──requires──> [Critical Mass of Strasbourg Users] (feels hollow < 50 active users)

[NOM Wrapped]
    └──requires──> [12+ months of scan/rating data]
    └──requires──> [User Accounts with history]
```

### Dependency Notes

- **AI Top 3 requires Taste Profile to be personalized:** Without Taste Profile, AI Top 3 can still work as a generic "popular choices" recommendation, but loses the "for you" value proposition. Build generic first, personalize in v1.x.
- **Reverse Search requires the Strasbourg database:** This is the hardest feature to build because it requires pre-indexing dish images and associating them with restaurants. Cannot ship without database.
- **Leaderboard has a cold-start problem:** Below ~50 active users it feels hollow and embarrassing. Do not show publicly until critical mass is reached. Consider showing "you are #4 in Strasbourg" privately instead.
- **NOM Wrapped conflicts with early launch timing:** If launched in Q1, the first Wrapped can't ship until Jan next year. Start collecting data immediately, defer the feature.

---

## MVP Definition

### Landing Page Launch With (v1)

- [x] Hero with animated phone demo (QR scan → dish cards → AI Top 3) — the hook
- [x] Email waitlist signup form (single field, prominent) — the conversion
- [x] Waitlist position + referral link post-signup — the viral loop
- [x] Feature cards (scan, translation, AI assistant, Taste Profile) — the proof
- [x] Pricing tier preview (Free / Pass 9.99€ / Pro 3.99€/mo) — the value anchor
- [x] Dish carousel with Strasbourg content — local credibility
- [x] FAQ section — objection handling
- [x] GDPR-compliant email collection + cookie consent — legal requirement (France/EU)

### Landing Page Add After Validation (v1.x)

- [ ] Reverse search interactive demo — add when the feature itself is built
- [ ] Social section (Leaderboard preview, Wrapped teaser) — add when user count justifies it
- [ ] Testimonials from beta users — add when beta runs
- [ ] Live waitlist counter — add when count is large enough to be credible (>200)

### App Launch With (v1)

- [x] Camera scan → OCR → menu parsing → dish cards
- [x] Translation (50+ languages minimum)
- [x] Dish description + allergen flags
- [x] AI Top 3 recommendation (generic, not yet personalized)
- [x] Free tier with credit limits (e.g., 5 full scans/day free)
- [x] Pass + Pro subscription via in-app purchase
- [x] Offline result caching
- [x] Basic Taste Profile onboarding (dietary preferences, cuisine likes/dislikes)

### App Add After Validation (v1.x)

- [ ] Personalized Match Score — requires Taste Profile data accumulation
- [ ] Dish Stories — content effort, add when core is stable
- [ ] Leaderboard — when Strasbourg user count reaches meaningful threshold
- [ ] Reverse search — technically complex, only after core loop is validated

### Future Consideration (v2+)

- [ ] NOM Wrapped — requires full year of data
- [ ] Restaurant-provided QR codes (B2B layer) — separate product motion
- [ ] Multi-city expansion — expand after Strasbourg density achieved

---

## Feature Prioritization Matrix

### Landing Page

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Hero + animated demo | HIGH | MEDIUM | P1 |
| Email waitlist form | HIGH | LOW | P1 |
| Referral / position counter | HIGH | MEDIUM | P1 |
| Feature cards | HIGH | LOW | P1 |
| Dish carousel | HIGH | LOW | P1 |
| Pricing preview | MEDIUM | LOW | P1 |
| FAQ | MEDIUM | LOW | P1 |
| GDPR / cookie consent | HIGH (legal) | LOW | P1 |
| Reverse search demo | HIGH | HIGH | P2 |
| Social / gamification preview | MEDIUM | HIGH | P2 |
| Live waitlist counter | MEDIUM | LOW | P2 |
| Testimonials | MEDIUM | LOW | P2 (post-beta) |

### Mobile App

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Camera scan + OCR pipeline | HIGH | HIGH | P1 |
| Translation (50+ languages) | HIGH | MEDIUM | P1 |
| Dish cards (image + description) | HIGH | MEDIUM | P1 |
| Allergen flags | HIGH | MEDIUM | P1 |
| AI Top 3 (generic) | HIGH | MEDIUM | P1 |
| Free tier + credit system | HIGH | MEDIUM | P1 |
| Pass / Pro subscription | HIGH | MEDIUM | P1 |
| Offline caching | MEDIUM | MEDIUM | P1 |
| Taste Profile onboarding | HIGH | MEDIUM | P1 |
| Personalized Match Score | HIGH | HIGH | P2 |
| Dish Stories | MEDIUM | MEDIUM | P2 |
| Reverse search | HIGH | HIGH | P2 |
| Leaderboard | MEDIUM | MEDIUM | P3 |
| NOM Wrapped | HIGH | HIGH | P3 |
| QR code B2B layer | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when core is validated
- P3: Future consideration / requires data/scale

---

## Competitor Feature Analysis

| Feature | MenuGuide | AnyMenu | NOM (planned) |
|---------|-----------|---------|---------------|
| Menu photo scan | Yes (3/day free) | Yes (free) | Yes (credit-limited free) |
| Translation | 100+ languages | 50+ languages | 50+ languages minimum |
| Dish description | Yes | Yes (basic) | Yes + Stories (richer) |
| Allergen detection | Yes | No | Yes |
| AI dish recommendation | No | No | Yes — core differentiator |
| Taste Profile / personalization | No | No | Yes |
| Match Score | No | No | Yes |
| Reverse search | No | No | Yes |
| Gamification / leaderboard | No | No | Yes |
| NOM Wrapped | No | No | Yes (v2) |
| Offline caching | Unknown | Unknown | Yes |
| Local city focus | Global | Global | Strasbourg-first (density advantage) |
| Pricing model | Free + $4.99/wk | Free | Free + credits + Pass/Pro |
| Revenue model | Subscription | Free (unclear) | Freemium + subscription |

**Takeaway:** MenuGuide and AnyMenu are pure translation utilities. NOM competes by turning a one-time translation tool into a recurring dining companion with memory, recommendations, and social features. The translation itself is not NOM's moat — the Taste Profile and AI recommendation layer on top of it is.

---

## Sources

- [MenuGuide official site](https://menuguide.app/) — feature and pricing verification (HIGH confidence)
- [AnyMenu official site](https://anymenu.app/) — feature and pricing verification (HIGH confidence)
- [Waitlister.me — Waitlist Landing Page Guide](https://waitlister.me/growth-hub/guides/waitlist-landing-page-optimization-guide) — landing page best practices (MEDIUM confidence)
- [Moosend — Waitlist Landing Page Best Practices](https://moosend.com/blog/waitlist-landing-page/) — landing page features (MEDIUM confidence)
- [Viral Loops — How to Build a Waitlist](https://viral-loops.com/blog/how-to-build-a-waitlist/) — referral/viral mechanics (MEDIUM confidence)
- [Flowjam — Waitlist Landing Page Examples](https://www.flowjam.com/blog/waitlist-landing-page-examples-10-high-converting-pre-launch-designs-how-to-build-yours) — conversion patterns (MEDIUM confidence)
- [Trophy.so — Food App Gamification Examples](https://trophy.so/blog/food-drink-gamification-examples) — gamification features (MEDIUM confidence)
- [AI in Food Industry 2026](https://theninehertz.com/blog/ai-in-food-industry) — food tech feature landscape (LOW confidence — single source)
- [RevenueCAT — App Monetization Trends 2025](https://www.revenuecat.com/blog/growth/2025-app-monetization-trends/) — credits/freemium strategy (MEDIUM confidence)
- [Paire.io](https://paire.io/eating-with-ai/) — taste profile / restaurant recommendation competitor (MEDIUM confidence)
- [AI-driven dining personalization 2025](https://dhhospitalitygroup.com/ai-driven-dining-personalization/) — personalization patterns (MEDIUM confidence)

---

*Feature research for: NOM — restaurant menu scanning + AI dish recommendation app*
*Researched: 2026-02-25*
