# Obavia spec

The single reference for what Obavia is, who it is for, what it does, and how it looks and feels. Read this before building anything for Obavia: the site, the app, the films, or copy.

Companion docs:
- `docs/obavia-positioning.md`: the build-vs-buy argument in full, with sources.
- `docs/icp-language.md`: what the top of the market says, from transcripts, in their words.
- `docs/sales-doctrine.md`: **the sales doctrine** we sell by and coach our clients' teams against (the string, the set, the close, the handoff, our own script).

---

## 1. Positioning

**Who.** Agency owners doing $100K to $1M a month with a sales team on the phones (setters and closers). They already run ads, a CRM and a calendar. They already have dashboards.

**One line.** Know why deals are lost. And fix it by Friday.

**Supporting line.** Obavia hears every sales call and hands each rep the fix. Nothing for your team to type.

**The angle.** The dashboard was never the product. Anyone can build *where* (stage counts, rates) in a few weeks. Nobody cheaply builds what comes after the number:
1. **Why**, from every call, in the lead's own words.
2. **True data**, read from the phone, calendar and payments. Never self-reported.
3. **The fix**, one per rep, checked Friday against their own calls, in dollars.
4. **The person**, read from how the lead talks (I vs we, my vs our, the one name they reach for).
5. **Adoption**, because the rep app works for the rep: one action, one tap, their commission per call on screen.
6. **It keeps working**, with no developer and nothing to maintain.

**Price anchor.** $3,000 a month. If it saves one deal a month, it has paid for itself.

**The two problems.** Every owner problem reduces to two (Jeremy Haynes): filling closers' calendars, and getting more good closers. Every Obavia feature must serve one of these, and the page should make that obvious without saying it.

## 2. Their problems, in their words

Use these words on the page and in the app. Do not invent jargon.

| Their problem | How they say it | Obavia's answer |
|---|---|---|
| They see the drop, not the reason | "The number says where. It doesn't say why." | Why, from every call |
| Nobody listens to the calls | "No time to sit through recordings." | Every call heard, tagged with the words that caused it |
| Reps don't update the CRM | "The data's garbage." | Nothing to type; read from the tools |
| Sales blames marketing | "The leads this month have been bad." | Same lead pool, rep-by-rep variance, the reason from the calls |
| Close rate lies | "All of those metrics are easy to manipulate." | Revenue per lead as the one number |
| Coaching is opinion | "Coach people with hard facts." | One fix per rep, checked in dollars |
| New reps burn leads | "100 leads, at least 2 closes." | Trial mode that calls pass or fail early |
| Show rate is low | "Show rate is won after the booking." | Pre-call asset and outreach measurement |
| They don't know what it takes | "Start with the math." | Closer math |
| Commission feels random | "Feels always up in the air." | Effective hourly rate and month-over-month progress |

## 3. Experience principles

These decide every screen, on the site and in the app.

1. **Show, don't preach.** Every section is a problem headline, a visual that proves the answer, and at most one short line. If a screen needs a caption to be understood, redesign the screen.
2. **Problem, then solution, seamlessly.** The visitor recognizes their pain, then watches it resolve in the same visual. No separate "features" list.
3. **One idea per screen.** Enormous space. If it feels empty, it is probably right.
4. **One next action.** In the app, one tap does the job. On the site, one primary button.
5. **Nothing to type.** Anything the system can read, it reads.
6. **Feedback you can feel.** A soft sine chime (after first tap) and a haptic tick on taps. Never on scroll.
7. **Motion explains or it doesn't ship.** Slow, eased, deliberate. Respect reduced motion.
8. **Honest.** Real screenshots, real math, no fake urgency, no fake scarcity, no invented testimonials. The only cap we state is a real one.

**Banned.** Decorative pills, chips and badges. Disclaimer captions ("illustrative", "demo", "sample"). Em and en dashes in copy. The wordmark as text (the mark alone). Emoji. Div mockups of the product where a real screenshot exists. Stock photography.

## 4. Feature spec

Status: **Site** = shown on the landing page. **App** = built in the `app/` prototype (front end, seeded data). **Planned** = not yet built. Nothing is wired to live data yet.

### Core loop

| Feature | What it does | Status |
|---|---|---|
| Capture | Connects phone system, calendar, CRM and payments. Every call transcribed. Reps type nothing. | App (onboarding "connect tools"), Site |
| Leak engine | The funnel (leads, booked, showed, closed, cash) with each step's loss in dollars. Picks the single biggest leak. | App (Overview, Leaks), Site (hero line) |
| Why from calls | Every drop-off tagged with the reason and the exact words that gave it away. | App (Leaks), Site (#why) |
| The fix loop | One fix, assigned to the rep who leaks most, checked Friday against their own calls, reported in dollars. | App (Moves, RepSheet), Site (#fix) |
| Daily AI sales manager report | Every call from yesterday read; sent at 7:00 AM. Owner page: the headline leak in dollars, rep by rep (one win or one fix each, with the quote), "was it the leads?" verdict, cash per lead by source, calls to watch today, who gets it. Rep page: what worked or one thing to fix, yesterday's numbers and earnings, today's one action, where they stand on cash per lead. | App (Report, Rep → Report) |

### The team

| Feature | What it does | Status |
|---|---|---|
| Revenue-per-lead board | Reps ranked by revenue per lead; anything below the team average glows. | Site (#game), App (Reps) partial |
| Lead tiers and routing | Best leads go to reps who earn them by revenue per lead and volume. Monthly reset, mid-month moves. | Site (line), Planned |
| Efficiency cost | Revenue per lead against the best rep in the same tier, times leads: "you lost $X". Makes promotion objective. | Planned |
| Effective hourly rate | Commission to date divided by shown calls, so each rep sees what a call is worth. | Site (#team point), Planned in app |
| Month-over-month progress | Each rep's trend, so commission never feels random. | Planned |
| Rep confidence read | Qualified show rate as a leading indicator of how a rep will perform on the same pool. | Planned |
| What the top rep does differently | Their pre-call messages and words, surfaced for the rest to copy. | Planned |
| Settle sales vs marketing | Separates lead quality (same pool across reps) from rep performance, with reasons. | Site (#why line), App (Report verdict) |
| New-rep trial mode | First 100 leads tracked live: show rate vs the no-outreach baseline, no-show follow-up speed, dropped calls, hot transfers, days to ramp, closes. Calls pass or fail early; promotes passers up the tiers. | Planned |
| Rep app | Today screen: one next action, one tap, logged the moment the call ends, soft sound and haptic. | App (Today), Site (#team phone) |

### The lead

| Feature | What it does | Status |
|---|---|---|
| Word-choice read | I vs we, my vs our, the one name they reach for. Probabilistic, never a label. Suggests what to say and what to avoid. | App (LeadSheet), Site (#person) |
| Lead enrichment | Public footprint (location, business, size) beside the read, before the call. | Planned |
| Rep pairing | Match the lead to the rep whose style fits the read. | Planned |
| Setter → closer handoff | Written from the setter's call, no typing. A profile of the lead: what they want and what it implies, their labeled approach, the catalyst, the pain (since when, impact), the gap in numbers, the setter's identity label, the archetype and what they deem significant, what is already pre-handled, whether they watched the pre-call asset. Then three points to close (open, the pillar to lead with, the consequence), their words to use back, and the string: which steps the set hit and where the closer picks up. | App (lead sheet) |
| String coverage | Which steps of the doctrine each setter and closer skip, from their calls; feeds the leak engine as a reason. | Planned |

**Guardrail.** The read is about language, never identity. No inference of race, gender, age or any protected trait. The famous-name example (Babe Ruth chosen over Jordan, LeBron, Serena, Brady, Michael Jackson) is about the choice of reference, which signals what the person values, not who they are.

### The owner

| Feature | What it does | Status |
|---|---|---|
| Closer math | Goal ÷ cash per sale ÷ close ÷ show × cost per call = spend; booked per day ÷ calls per closer = closers. Shows which single rate, lifted, saves the most. | Site (#math, live sliders) |
| Source attribution | Cold vs warm, by source, optimized on cash collected, never contracted revenue. | App (Report, by source), Planned live |
| Pre-call asset measurement | Which confirmation video, testimonial page or setter message moves show rate. | Planned |
| Capacity signals | When fulfillment is full: waitlist and descend into a lower offer, instead of cutting ad spend. | Planned |

## 5. Landing page

`obavia-co/index.html`. Each section is **problem headline → visual → one line**. Order follows how a buyer understands it.

| # | Section | Headline (the problem or promise) | Visual (the proof) | One line |
|---|---|---|---|---|
| 1 | Hero `#top` | Know why deals are lost. And fix it by Friday. | Canvas line: 1,200 leads → 744 → 372 → 272 → 78, the leak at booked→showed glows ($234K/mo) | Obavia hears every sales call and hands each rep the fix. Nothing for your team to type. |
| 2 | `#numbers` | You already have the numbers. | Four lines light on scroll, ending "Obavia does both." | |
| 3 | `#why` | Why they dropped | Calls card, each tagged with the words that caused it | Every drop-off, tagged with the words that caused it. No recordings to sit through, and no more sales blaming marketing. |
| 4 | `#fix` | The fix | Fix card, week dots Monday to Friday, result in dollars | One change for the rep who leaks most. Checked Friday against their own calls, in dollars. |
| 5 | `#game` | Revenue per lead | Board: Jordan climbs 32%→47% show, $300→$439 per lead, passes Reza | Close rate flatters. Revenue per lead doesn't. Reps see where they stand, and earn better leads by it. |
| 6 | `#person` | The person | Sticky scrolly, 5 steps: I vs we, the names, the read | How a lead talks tells you what they need to hear. |
| 7 | `#team` | The rep app | A phone with real app screenshots, tappable | One next action. One tap. On the record the moment the call ends. |
| 7b | `#tools` | Your tools. One workflow. | Two belts of 65 real logos gliding opposite ways; scroll nudges, hover rests | Obavia reads the tools you already run. Nothing to switch, nothing to type. |
| 8 | `#math` | What it takes | Live closer math sliders; the biggest lever named | Drag your rates. See what it takes, and which rate leaks the most. |
| 9 | `#build` | Build vs buy | Honest comparison grid, then the price | Everything after the number is where the money is. |
| 10 | `#final` | The ask | One button | Join the waitlist |

Inner pages (about, pricing, team, owners, product, ads) share the shell and have no top labels. Pricing starts with the price. Team speaks to setters and closers. Owners speaks to agency owners at $100K to $1M.

## 6. Design system

**Type.** Manrope everywhere (fallback Helvetica Neue, Arial). Headlines 800, tight tracking (about -0.035em). Body 400 to 500.

**Color** (`obavia-co/shell.css` tokens):
- ink `#1C2436`, body `#4B5468`, navy `#28344F` (primary button), tint `#4E6AA8`, line `rgba(28,36,54,.08)`
- sky gradient `#DCE6FD → #F2F6FF → #F7F9FF → #E6EDFD`
- warm amber only where money leaks

**Sky.** The watercolor sky from the original obavia.co: a pale gradient (`#DCE6FD → #F2F6FF → #F7F9FF → #E6EDFD`) with a paper texture (multiply, 50%), a soft vignette, 16 watercolor cumulus sprites (`obavia-co/sky/w0 to w7.webp`) in far, mid and near layers drifting at 3 to 16 px/s, a white glow behind the words, and film grain (multiply, 20%). Drift is synced to the clock, so clouds continue across pages.

**Shell** (`shell.css` + `shell.js`, loaded by every page):
- Loader: the orb forms, the ribbon signs itself, a ring tracks real loading (min 1.6s), a pulse, then the mark flies into the nav. Once per session. Events `o:reveal` and `o:land`.
- Page changes: cross-document View Transitions (soft fade and blur); JS fade fallback. Nav and sky stay put.
- Every page opens at the top.
- Nav: mark only, links, one navy "Join the waitlist" button; a full-screen sheet on mobile.

**Motion.** Ease `cubic-bezier(.2,.7,.2,1)`, out `cubic-bezier(.16,1,.3,1)`. Reveal on scroll once. Nothing bounces. Reduced motion turns it all off.

**Sound.** Sine chimes with a soft octave, only after the first pointer or key. `OSHELL.tone(freq, gain, dur)`.

**Haptics.** `OSHELL.haptic()`: `navigator.vibrate(8)`, or the iOS 18 `<input type=checkbox switch>` tick. Taps only.

**Icons.** Phosphor, inlined as SVG `<symbol>`s. No emoji.

**App.** iOS-clean: large titles, grouped lists, sheets, a tab bar, one next action on Today. Same sky, type and sound.

## 7. Go-to-market

- **A real, stated cap** on the founding cohort. When it fills, a waitlist with a real reason to wait.
- **Vet** on revenue ($100K+/month) and whether a team is on the phones.
- **Give first.** Closer math is free on the site, genuinely useful, before any ask.
- **Word of mouth** over views. One saved deal is the story.
- Waitlist lives at https://obavia.co/waitlist. Do not change it.

## 8. Repo map

| Path | What |
|---|---|
| `obavia-co/` | Static marketing site, deployed as-is on Cloudflare Pages (output dir `obavia-co`). Publicly served: no internal docs here. |
| `obavia-co/index.html` | Home, self-contained |
| `obavia-co/shell.css`, `shell.js` | Shared nav, sky, loader, page transitions, sound, haptics |
| `obavia-co/sky/`, `shots/`, `ads/` | Clouds, real app screenshots, rendered films |
| `app/` | Vite + React + TypeScript product prototype (`npm run build` → `app/dist`). Separate deploy, suggested app.obavia.co |
| `films/` | Remotion source for the ads (Kokoro TTS voice) |
| `docs/` | This spec, positioning, ICP language |

Note: the root `CLAUDE.md` and the `*.dc.html` files belong to a separate project (a Houston vehicle rental house) that shares this repo. Keep them apart.

## 9. Open decisions

- Live data: which phone systems, calendars, CRMs and payment tools to integrate first (likely GoHighLevel, HubSpot, Close, Aircall, Zoom, Calendly, Stripe).
- The founding cohort size and its price.
- Whether trial mode and lead routing ship in v1 or follow the fix loop.
- Validate the build-vs-buy estimates in owner interviews.
- App deploy: create the Cloudflare project (root `app`, build `npm run build`, output `dist`, domain app.obavia.co).
