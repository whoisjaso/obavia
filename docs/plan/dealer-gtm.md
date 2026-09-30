# Dealer go-to-market: what TryGTM and Grok Bot teach us, and what we build

Research date: September 30, 2026. Sources are the companies' own pages, read with Firecrawl on that date. Anything marked **estimate** is our arithmetic, not a published figure. Check it before it goes on a price sheet.

---

## 1. Who we looked at

### TryGTM (trygtm.com)
"TryDTM" does not exist as a GTM company: trydtm.com is a Japanese WordPress site in maintenance mode. The company described to us is **TryGTM**, legally J&T Solutions Inc. d/b/a GTM, Wilmington, DE.

- **What it sells:** "Tell GTM who you sell to. It finds those people, writes to them, and books the call. You just show up to the meeting."
- **The loop:** six steps, run forever.
  1. **Find:** a 700M-contact licensed database plus the client's own LinkedIn.
  2. **Qualify:** a 1 to 5 "heat" score, raised only by real signals (a reply, a matching post in the last 72 hours, a reaction). It writes only to heat 4 and above.
  3. **Write:** one message per person, from the profile and the signal that warmed them.
  4. **Send:** from the client's own domains and LinkedIn, paced and warmed.
  5. **Book:** a reply stops the sequence, an answer is drafted, and the call is booked on the calendar.
  6. **Report:** results for each step and each signal.
- **How the client drives it:** in plain words ("Find ops leaders at Series A fintechs and book me calls"). The agent answers like a teammate.
- **Two plans, both "plus usage":**
  - **Solo, $297/month:** 30,000 data credits and 40,000 action credits, 5 connected accounts, 1 seat.
  - **Agency, $497/month:** 60,000 data and 80,000 action credits, 5 white-labelled client spaces, 10 accounts, 5 seats. A sixth client space is $99/month.
- **The agency angle:** the platform is theirs, the brand is yours. Each client gets an isolated space, and emails go from the client's own domain. This is what lets an agency "sell GTM" as a service.

### Grok Bot (x.ai/bot)
- **What it is:** SpaceXAI's agent product, launched August 11, 2026 and distributed through Cursor. Each "Bot" has its own always-on cloud computer. It signs into your tools, including ones with no API, and finishes jobs end to end.
- **How you use it:** you message it like a coworker. You can show it a workflow once and it saves it as a routine. Several Bots can coordinate in a group chat, and a chief-of-staff Bot can manage the others.
- **Relevance to us:** Grok Bot is the general version of the agent loop. TryGTM is the vertical version, narrowed to one job (booked calls) with hard safety rules. **Obavia should be the vertical version for dealers.** The general tools will always be broader. We win by being narrower, safer and easier.

---

## 2. How TryGTM actually builds it

Their subprocessor list and product page spell out the stack. None of it is exotic:

| Layer | What they use |
|---|---|
| App, API, AI gateway | Vercel |
| Database, auth, storage | Supabase (AWS us-east-2) |
| Background workers | Fly.io |
| LLMs | OpenRouter, routed to models that don't train on request data |
| Website reading | Firecrawl |
| Public activity (intent) | Apify |
| Contact enrichment | Clay |
| Email verification | ZeroBounce |
| LinkedIn and mailbox connection | Unipile |
| SMS | Twilio |
| Sending domains and DNS | Namecheap, Cloudflare |
| Billing | Stripe |

**The agent is not one big AI.** It is **eleven small jobs on timers**, each with one task:

| Job | When it runs |
|---|---|
| New leads | Daily at 08:00 |
| LinkedIn search | Every minute |
| Heat scores | Every minute |
| Queue | Every minute |
| Sender | Every minute (the only job allowed to contact anyone) |
| Replies | Every minute |
| Grading | Hourly |
| Rewriting | Every 6 hours, only when a step underperforms |
| Account health | Every 6 hours |
| Checkup | Every 15 minutes |
| Cleanup | Daily at 03:30 |

The AI is called inside those jobs for narrow decisions:
- fit yes or no;
- writing one message;
- classifying one reply;
- rewriting a weak step.

**Safety lives in the database, not the prompt.** A compliance gate (verified address, suppression list, send window, sender limit) sits in front of the sender and cannot be switched off. "Stop" is permanent across every channel. Rules against invented claims sit above the user's prompt and can't be edited away.

**Lesson for us:** build the dealer loop the same way. Small jobs, each with one purpose. The AI makes narrow calls inside them. Hard gates live in the database.

---

## 3. Their unit economics, decoded

TryGTM publishes a price for every metered action. The ones that matter:

| Action | Credits |
|---|---|
| Contact revealed | 8 data |
| Email verified | 2 data |
| Company enriched | 10 data |
| Research run | 40 action (standard) or 75 action (premium) |
| Message written | 1 to 2 action |
| Reply drafted | 2 action |
| SMS segment | 20 action out, 15 action in |
| Email or LinkedIn send | 0 (free) |

Overage prices: data credits are **$9 per 1,000**. Action credits are **$2.50 per 1,000**.

Their own planning example: one new lead who gets three emails uses about **10 data and 15 action credits**. At overage prices that is **about $0.13 per lead**. Solo's included credits cover about **2,600 leads a month**.

The pricing mechanics that make it profitable:
1. **A base fee with credits included.** The fee covers expected use with room to spare.
2. **Metered overage at a markup.** Selling data credits at $0.009 each is a markup on enrichment and verification costs. **Estimate:** their blended cost is well under half the price.
3. **Credits expire monthly.** Unused included credits don't roll over, so light users subsidise heavy ones ("breakage").
4. **Prepaid only.** "We never charge more than you bought. When credits run out, work stops." There is no bad debt and no surprise bills.
5. **No refunds, and they say why.** "That costs us real money with our data and AI suppliers, usually $100 to $200 before you are back from checkout." Onboarding spends real money up front, so they protect it.
6. **Free actions where cost is near zero.** A send costs them almost nothing, so it is 0 credits. Customers feel it's fair.

### The pricing rule, corrected
The example we started from: 5,000 queries cost us $400, so we charge $600 and keep $200.

- **That is a 33% gross margin.** It is too thin for software. Support, failed payments, churn and the cost of winning each customer come out of that $200, and it disappears.
- **The rule that works:** the **most** a customer can use under the plan should cost us **no more than 25 to 35% of the fee**.
  - $400 of maximum cost means a fee of about **$1,150 to $1,600**.
  - Alternatively, include less and meter the rest.
- **Average use is usually a third to half of the maximum.** So the real margin on the average customer lands at 80% or more. That is the SaaS norm and what investors expect.

---

## 4. What transfers to dealers, and what doesn't

"Post once, it goes everywhere" is right, but each channel has its own real door. Promise only what each channel allows.

| Channel | How a dealer gets on it (2026) | Can we automate it? |
|---|---|---|
| **The dealer's own website** (SEO and AEO pages per car) | We host it | **Yes, fully.** It's the core of the website upsell. |
| **Google** (free vehicle listings, Business Profile posts) | A Merchant Center vehicle feed; the Business Profile API | **Yes**, through the official feed and API |
| **Facebook Page and Instagram posts** | Meta Graph API (Pages, Instagram content publishing) | **Yes**, official API, the dealer's own business accounts |
| **Facebook Automotive Inventory Ads** (paid; can take top slots in the Marketplace vehicle feed) | A vehicle catalog feed, and the dealer pays Meta for the ads | **Yes.** We build the feed; ad spend is the dealer's. |
| **Facebook Marketplace** (organic) | Only a real person posting from their own profile. Partner catalog feeds stopped reaching Marketplace on Sept 13, 2021. Business Pages lost vehicle listings on Jan 30, 2023. | **Yes, as assisted posting, opt-in.** We prepare the listing and fill it into Facebook **on the salesperson's own device, signed in as them**. They review it and tap Post. We never store a Facebook password or run an account from our servers. It turns on only after the dealer accepts the terms in `docs/legal/marketplace-posting-terms.md`: their account, Facebook may restrict it, and Obavia isn't liable. |
| **CarGurus, Cars.com, Autotrader** | A paid dealer subscription on each site plus an inventory feed (usually CSV over FTP, the HomeNet-style route) | **Yes, as the feed.** The dealer still pays each marketplace. We never promise free listings there. |
| **TikTok, YouTube Shorts** | Official content posting APIs | **Yes, later** (walk-around video) |

So the promise is **"Enter the car once. We put it everywhere you're allowed to be, and we hand you the rest ready to post."** It is honest, and it still saves a dealer an hour a car.

---

## 5. Obavia Reach: the dealer loop

The same pattern as TryGTM, aimed at selling cars, not booking B2B calls. The dealer drives it in plain words ("Move the aged trucks", "Follow up everyone who asked about the Tahoe").

### The loop (small jobs, each with one task)
| Job | Cadence | What it does |
|---|---|---|
| Intake | When a car is added | VIN decode, photo clean-up, and AI copy for each channel from the real specs (no invented features) |
| Publish | On intake, then daily | Pushes to the website, Google, Facebook/Instagram and the feeds; queues assisted Marketplace posts |
| Leads in | Every minute | Pulls leads from every channel into one inbox, tagged by source |
| Speed to lead | On lead arrival | Answers within minutes, qualifies (budget, down payment, trade, timing) and offers a test-drive time |
| Follow-up | Hourly | Keeps the conversation going until a reply, a sale or a stop |
| Aged inventory | Daily | Flags cars past their days-on-lot target, suggests a price move against the market, and re-posts |
| Re-engage | Weekly | Past buyers near payoff or with their car at the right age get a trade-up offer (a buy-here-pay-here goldmine) |
| Grading | Daily | Which channel and which message produce appointments; rewrites what underperforms |
| Report | Daily | The owner's morning report: cars posted, leads, appointments, sales, cost per sale by channel |

### The gates (in the database, never in the prompt)
- **Consent:** no SMS without TCPA consent on record. "STOP" ends every channel, permanently.
- **Email:** CAN-SPAM identity and unsubscribe on every email.
- **Advertising:** the advertised price must match the price on the lot. We apply the FTC and Texas rules for vehicle advertising, and the Buyers Guide carries through. The AI can't invent equipment, history or financing terms.
- **Accounts:** our servers never sign into anyone's personal social account or store a social password. Marketplace posting runs only on the salesperson's own device, only after the dealer has accepted the Marketplace terms (recorded with the terms version).

### The meter (the same idea as TryGTM's credits, in dealer words)
The dealer never sees "credits". They see **cars posted, conversations handled and texts sent**. Internally each action has a cost and a price.

**Estimated** cost to us per unit. Check these against real invoices in the spike.

| Unit | What it includes | Our cost (estimate) |
|---|---|---|
| Car posted everywhere | VIN decode (NHTSA, free), copy written for 6 channels, photo processing, feed and API calls | about $0.05 to $0.15 |
| Lead conversation | About 8 AI turns plus about 6 SMS segments (Twilio plus carrier fees) | about $0.10 to $0.20 |
| AI phone minute (later) | Voice agent | about $0.10 to $0.15 |
| Market price check | Paid comps data, if we add it | depends on the vendor |

### Price it with the corrected rule
A busy independent lot: 60 cars a month and 300 lead conversations.

- **Heavy-use cost estimate:** 60 cars × $0.15 plus 300 leads × $0.20 = **about $69 a month**.
- **Add infrastructure and support:** call it **$100 a month maximum**.
- **So Reach at $249 to $349 a month:**
  - keeps maximum cost at or under 30 to 40% of the fee;
  - lands the average dealer's margin at around 80%;
  - includes a generous allowance (for example 100 cars and 500 conversations);
  - prices overage in dealer words (for example $1 per extra car posted and $0.50 per extra conversation).
- **Keep TryGTM's four protections:**
  - prepaid;
  - work pauses at the cap rather than billing a surprise;
  - allowances refresh monthly;
  - onboarding is non-refundable (migration and first posting cost real money).

### How it packs with the Desk
| Offer | Price idea | What it is |
|---|---|---|
| **Obavia Desk** | Priced to undercut Frazer, which one comparison lists at about $99/month (confirm) | The DMS: Handle A Sale, documents, the TxDMV hand-off |
| **Reach** | $249 to $349/month add-on | Post once everywhere, the lead inbox, speed to lead, follow-up, aged inventory, re-engage |
| **Website** | Included with Reach, or $99/month alone | The per-car SEO/AEO site that Reach publishes to |
| **Migration** | One-time fee | Move them off Frazer, DealerCenter and the others |
| **Agency / group** | Per rooftop | TryGTM's agency idea: a dealer group, or a marketing agency serving dealers, runs Reach for many lots under its own brand |

The upsell path is: **Desk → Reach → website → more rooftops**.

---

## 6. Build order (fits the April 24, 2027 plan)

1. **Spike** (1 week): the Meta Graph API post to a Page and Instagram; a Google Merchant Center vehicle feed; a CarGurus/Cars.com feed file. Record the real cost per call.
2. **Intake and Publish** first. They are visible from day one and prove "post once" at the pilot lot (Triple J).
3. **One inbox and Speed to lead** next. This is where Reach earns its fee.
4. **Follow-up, Aged inventory, Re-engage, Report.**
5. **The meter and Stripe prepaid billing** before the second dealer.
6. **Agency and group workspaces** after five paying lots.

Every screen follows the Desk rule: one question per screen, big and centered, the answer is the next tap. The whole Reach setup should be three taps: pick the car, check the photos, **Post Everywhere**.

---

## 7. Decisions (answered September 30, 2026)
1. **Name:** Reach stays.
2. **Website:** we build it ourselves, as an upsell to the Desk: the Obavia website engine (section 8).
3. **Texting and calling:** Telnyx first (you already use it), behind our own interface with Twilio as the backup. Email goes through Resend. The reasoning and prices are in `docs/plan/messaging.md`.
4. **Facebook Marketplace:** we do the posting, opt-in, on the salesperson's own device, after they accept the no-liability terms (section 4).
5. **Still open:** is market price comparison v1 or v2?

---

## 8. The Obavia website engine

**What it is:** an autonomous engine that builds and keeps every dealer's website up to date. **The Desk is the source of truth.** The site is a live view of the lot, so no one ever edits the website by hand.

### How it works
1. **Brand, set once at onboarding:** the logo, colour, dealership name, address, hours and licence number we already collect. The engine generates a theme from them in Obavia's clean, page-by-page style, not a template farm.
2. **Every car becomes a page, automatically.** When a car is added in the Desk or Reach intake, the engine writes its page from the **real VIN decode, photos, price and Buyers Guide** (the rule is **no invented equipment, history or claims**), publishes it and pings the search engines. When a car sells, its page becomes "Sold, see similar" instead of a dead link.
3. **Found by Google and by AI assistants (SEO and AEO):**
   - schema.org `AutoDealer` and `Car`/`Vehicle` structured data on every page;
   - a sitemap updated on every inventory change;
   - fast static pages;
   - plain-language answers to the questions buyers ask ("Do you finance with no credit?", "What's the out-the-door price?"), built from the dealer's real terms.

   That's how AI search answers name this dealer.
4. **Everything on the site feeds the Desk and Reach:**
   - "Text me about this car" and lead forms go to the Reach inbox, answered in minutes;
   - the credit application, or the buy-here-pay-here pre-qualification, becomes a sale started in the Desk;
   - the payment page for buy-here-pay-here customers posts to their account.
5. **The same feeds as Reach:** the Google vehicle listings feed, the Meta catalog and the marketplace feeds all come from the same inventory record.
6. **Hosting:** static pages on Cloudflare Pages, on the dealer's own domain (we set up DNS), rebuilt within seconds of an inventory change. **Estimate:** hosting costs close to nothing per dealer. The real costs are the AI copy per car (cents) and the domain.
7. **The rules are the same as the Desk and Reach:** advertised price equals lot price, the Buyers Guide carries through, the Texas dealer licence number is displayed, and every text message has recorded consent.

### How it's sold
- **Included** with Reach, which publishes to it.
- **$99/month on its own** for a Desk customer who doesn't want Reach yet.
- **Migration** of an existing dealer website (a one-time fee) keeps their old page addresses redirecting, so they don't lose Google ranking.

### Build order inside the plan
After Reach Intake and Publish, because both need the same inventory record, and before Speed to lead, because the site is where most leads start.
