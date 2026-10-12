# Obavia, the public auction: the research and the blueprint

October 12, 2026. Owner direction: build a phone-first public auction where **dealers get out of losing cars** and **people without a dealer licence buy them**, under the Obavia name, with the paperwork engine we already built doing the work in the background. The front end has to feel native, almost wordless, and put the pieces next to each other so the user "snaps them together" themselves.

This document is the deep research and the plan. Every fact has a source at the end; the legal section quotes the statute. Nothing here is legal advice; the counsel items are listed.

---

## 1. The one-line thesis

**Buying and selling cars is day trading. A dealer's losers are the trades you cut.** Today a dealer's only exits for a loser are the wholesale lane (other dealers, who bid wholesale and ask "why is he selling?") or Marketplace (weeks of tyre-kickers, no paperwork). Obavia gives the dealer a **seven-day retail-priced exit to the public**, with the title, tax and plates handled, and gives the public the one thing they can't get: **auction prices without a dealer licence**, and a car they can register from their phone the same day.

---

## 2. The reference, decoded: Peak Auto Auctions

**What Peak is** (from its own site, terms and App Store listing):
- A nationwide online auction platform, live in 40 states, **open to the public, no licence needed**. Sellers are mostly tow companies, impound and storage lots, municipalities and lenders ("abandoned vehicles or lot inventory"), plus dealerships. One auction we read was a Florida dealer, "Florida Inclusive Auto", selling its own inventory to the public through Peak.
- Licences on the terms page are **auctioneer** licences (Colorado, Georgia, Florida, Tennessee, Louisiana, Indiana, and **Texas, Tony Porras #18376**). Texas auctions run under a Texas-branded site (peakautoauctionstx.com; a React app, with some lots on AuctioneerSoftware).
- **Money:** registration free; a deposit to bid ($50 seen on a Texas auction); **buyer's premium 13% to 14%** on top of the hammer price; sales tax calculated on price plus premium; pay by card on the site or cash to the towing company; seller pays **nothing**; "most auctions finalized and paid out within one week"; "Sell with Peak with or without a title!"
- **The app** (iOS 16+, 26 MB, **8 ratings**, "does not collect any data", a chatbot added in September): a Buyer/Seller portal with real-time bid notifications.

**What the screens look like** (we pulled the App Store screenshots): a scrolling list of lot cards. Each card is text: auction name, LOT 1, VIN in full, "Current Bid $400.00", "Your Max Bid: None", "Reserve not met" in red, a **DD:HH:MM:SS** countdown, a "View Lot Details" button and a "Bid $500" button. Before any of that, a separate "Register For Auction" button per auction. The lot page is a photo strip with thumbnails, a one-line description ("Very clean inside and outside great running conditions no issues, clean title, 80k miles"), a number field and a Bid button. The seller's auction blurb warns "titles will not be available immediately at pickup."

**What that tells us:**
1. The market exists and the legal shape works: dealers already consign retail inventory to a public online auction in Texas.
2. The product is a generic auction-software skin. Reading is the interface. Nothing is native: no gestures, no haptics, no video, no condition grade, no paperwork, no transport. The buyer's premium is high and the title is the buyer's problem.
3. That is the whole opening: **the same legal shape, a tenth of the reading, the paperwork done, and a premium low enough that the dealer's hammer price can be higher.**

---

## 3. The dealer's pain, with numbers

- **Holding cost is the loss.** Dealers report $30 to $40 per unit per day in 2026 guidance; a dealer-association piece puts it at $50 to $85 a day, and notes that on a unit targeting $2,500 to $3,500 gross "you're essentially working to break even". A Midwest dealer's line, quoted for years: **"a $500 loss today becomes a $1,000 loss tomorrow."**
- **The wholesale lane punishes losers.** The NAAA light system (green = guaranteed, yellow = limited, red = as-is) means a loser runs red or gets arbitrated; vehicles under $3,000 are as-is by default. Buyers in the lane are dealers who bid wholesale, pay a buy fee, and assume the worst about why a dealer is sending a car back. Manheim's own unfulfilled-sale penalty runs $100 to $500 per unit (July 2026).
- **Marketplace is slow and unpaperworked.** Weeks of messages, no deposit, no way to make a buyer show up, and the dealer still does the 130-U by hand.
- **Retail minus wholesale is the spread we sell into.** One dealer's aged units sat about **$3,300 above MMR wholesale** on asking price. A public buyer who pays anywhere inside that spread gives the dealer more than the lane would, and still gets a car below retail. That is the trade: *the dealer gives up gross they weren't going to get; the buyer gets wholesale-plus pricing; both skip the lane's fees.*

The dealer's job becomes one decision: **"What's the least you'll take?"** Everything after that is Obavia's.

---

## 4. The legal rails (Texas, from the statute)

| Question | What the law says | Source |
| --- | --- | --- |
| Who may sell? | "A person may not engage in business as a dealer, directly or indirectly, **including by consignment**, without a dealer general distinguishing number." Selling five or more vehicles in a year is dealing. | Transp. Code §503.021, §503.024 |
| Can a non-dealer platform consign cars to the public? | No. That is the "fly-by-night public auction" the law was written to stop (2005 bill history). The seller of record must be a GDN holder, and consignment at a location needs a GDN for that location unless it is a wholesale auction. | §503.021, §503.027 history, HB 2495 (79R) analysis |
| Does an online auction need an auctioneer licence? | No: Chapter 1802 exempts "(12) a sale of motor vehicles at auction by a person licensed under Chapter 2301 or 2302; (13) a sale of motor vehicles at auction by a person who holds a wholesale motor vehicle auction GDN or an independent motor vehicle GDN; or **(14) an auction of property through the Internet.**" TDLR's rule adds that it does not apply to "a person providing an online platform to facilitate an auction." | Occ. Code §1802.002(a)(12)–(14); 16 TAC §67.30 |
| Is a bid caller a dealer? | Not if "legal or equitable title does not pass to the auctioneer" and, for a GDN holder's cars, the auction is at the GDN holder's licensed location. | §503.024(d) |
| Is Obavia a "broker"? | "A person may not act as, offer to act as, or claim to be a broker." But the statutory broker is one who arranges the sale of a **new** motor vehicle. The TxDMV dealer manual: "The brokering of used motor vehicles is allowed by those licensees possessing a valid GDN." Advertising for others in your own name is not brokering. | Occ. Code §2301.006, §2301.002(3); Dealer Manual §4.34; 43 TAC §215.84–.85 |
| Buyer's Guide at a public auction? | Yes. "At public auctions, dealers and the auction company must comply. The Rule does not apply at auctions that are closed to consumers." A Buyers Guide must be displayed on every used vehicle offered to a consumer. | 16 CFR Part 455; FTC Dealer's Guide |
| Title and tax after the sale | The dealer files the title application (130-U) within 30 days, collects the 6.25% motor vehicle sales tax, and the buyer never goes to the county. This is exactly what the Desk already does (sale → 130-U → webDEALER → plates). | Our Desk; TxDMV |

**Two structures fall out of this.**

**A. Obavia is the software and the advertising; the dealer is the seller of record.** The dealer's GDN sells the car, in its own name, from its own lot. Obavia charges the dealer for software and listings (the eBay Motors shape), and the buyer pays the dealer. Lowest regulatory exposure; we can launch on it with Triple J tomorrow. The question for counsel is whether a success fee charged to the dealer, or a buyer's premium collected by Obavia, reads as "brokering" of used vehicles by a non-GDN holder. The manual's wording suggests the safe answers are a flat listing/subscription fee to the dealer, or Obavia holding its own GDN.

**B. Obavia (an Obavia entity) holds an Independent GDN, later a Wholesale Motor Vehicle Auction GDN.** Then Obavia can consign, run the buyer's premium, hold deposits, and be the auction of record, like Peak's Texas operation. Costs: the GDN application, a surety bond, a licensed premises, and dealer-level compliance. This is the 6-to-12-month target because it also lets us run the dealer-to-dealer lane later.

**Counsel items (before launch):** the fee structure under §2301.006 and Dealer Manual §4.34; whether consignment to an online auction counts as the dealer's "location"; sales tax on a buyer's premium; out-of-state buyers and title delivery; deposit handling and the Texas "deceptive trade practices" exposure on "as is" sales; arbitration terms; the Buyers Guide displayed in-app (the Rule says "on the vehicle"; at pickup it must be physical too).

---

## 5. The product: one app, two faces, one engine

### 5.1 The buyer's face ("Get the dealer price")

The buyer never registers for an auction. They open the app and they are **in the lane**.

1. **The feed.** One car per screen, full-bleed photo, vertical paging with TikTok physics (snap, overscroll, velocity). The only type on screen: the price (hammer, big) and a thin ring eating round the photo as the clock runs. Swipe up for the next car. Tap the photo to cycle angles. Hold to hear the engine (we record 10 seconds at listing). Two-finger drag down to peek the undercarriage video.
2. **The gap, not the pitch.** Under the price, two short bars side by side: "Dealer floor" and "Retail". No sentence tells the buyer they are getting a deal; the bars sit next to each other and the buyer does the maths. That is the first Lego piece.
3. **Bidding is a gesture.** Drag the price up; it snaps to increments with a tick you can feel; let go to bid. One tap on "Max" sets a proxy bid (eBay's model) so they never have to babysit. A bid is a heavy, single thump. Being outbid is a notification with *nothing* in the app: silence is the signal.
4. **Soft close.** A bid inside the last two minutes adds two minutes (Bring a Trailer's rule). The ring turns from ice to blue and pulses once per bid.
5. **Money, once.** First bid: Apple Pay or card hold for the deposit, Face ID, done. No "Register For Auction" screens. The deposit sits as a quiet chip on the car.
6. **Winning is the chest.** The ring closes, a 200 ms silence, then one event: flash, chime, strong pulse, confetti in ice and blue. Then the card flips to the next three pieces laid side by side: **ID. Sign. Plates.**
   - **ID:** scan the licence (the Desk already reads the ID kind and number, with the field limits webDEALER needs).
   - **Sign:** the Buyers Guide, the bill of sale, the 130-U, signed by finger, previewed as the real filled PDF (the Desk's rule).
   - **Plates:** the dealer files in webDEALER; the buyer watches the title step go green and gets a pickup QR.
7. **Pickup or delivery.** A map pin at the dealer's lot with a window; or a transport quote (a later integration).
8. **After.** The buyer can list a car they own back into the lane only through a dealer (the law); the app offers "Sell it back here" which routes to a partner dealer's intake. That keeps us clean.

### 5.2 The dealer's face ("Let it go")

Inside the Desk, next to each car's days-on-lot ring (which already turns amber), a single button: **Let It Go.** Tap it and the Desk asks the only question that matters, one per page:

1. **What's the least you'll take?** A number pad, with the car's cost basis and the wholesale band drawn beside the field (the Lego piece: the dealer sees what the lane would pay without being told).
2. **Show it.** Twelve photos guided by silhouettes (front three-quarter, rear three-quarter, dash, odometer, tyres, VIN plate), a 20-second walkaround and 10 seconds of engine audio. No text description: the grade comes from the photos and a six-tap condition pass (paint, glass, tyres, warning lights, A/C, starts/drives). Every tap is a haptic tick; the grade badge assembles itself as they tap.
3. **How long?** Three chips: 3 days, 7 days, 10 days. Default 7.
4. **Go.** The Buyers Guide is generated (as-is by default), the auction opens, Reach posts it (the car goes to Marketplace, Instagram, TikTok as "Auction ends Friday").
5. **It sold.** The Desk opens the sale with the buyer already in it: funding = paid in full, price = hammer, documents filled from the car's record, the 130-U seller line carries the agent's name. Payout at title filing.

### 5.3 The engine (what we already have, and what's new)

| Piece | Status |
| --- | --- |
| Dealer facts, licence lookup, TxDMV list | Built (Desk onboarding) |
| 130-U, Buyers Guide (measured), bill of sale, POA, Spanish | Built (Desk paper, production engine) |
| ID capture, field limits, seller line rule | Built |
| Reach posting (Facebook Page, Instagram; Marketplace hand-off) | Built, pending Meta app review |
| Payments, title watch, tax | Built |
| **Live auction state** (bids, proxy, soft close, deposits, anti-snipe, audit log) | New: a Cloudflare Worker with a Durable Object per auction; D1 for history; push via APNs |
| **Deposits and hammer payment** | New: Stripe (Apple Pay, card holds, payouts to dealers); counsel decides who collects |
| **Condition capture** (guided photos, walkaround, engine audio) | New; the posting photo picker is the seed |
| **The native app** | New (see §6) |

---

## 6. The front end: doctrine and stack

### 6.1 The doctrine ("97% visual")

1. **If a sentence explains the screen, the screen failed.** The only words allowed on a buyer screen are a price, a time, a name, and one verb on one button.
2. **Native means native.** The feed pages like TikTok, the sheet drags like Maps, the bid snaps like a picker, the win pops like Apple Pay. iOS conventions, not ours.
3. **Pieces side by side, never connected for them.** Floor next to Retail. Days-on-lot ring next to Let It Go. Deposit chip next to the bid. ID, Sign, Plates as three tiles. The user "discovers" the move and feels smart; we placed the tiles.
4. **Every reward moment fires three channels inside 100 ms**: motion, sound, haptic. Neutral and negative moments get nothing (outbid = silence). Asymmetry is the training.
5. **One sensory signature.** One chime family (the notification note from our films), one haptic family, ice and blue. The app should be recognisable with your eyes closed.
6. **Variable reward only where no money is at stake.** The feed can surprise ("a car under $3,000 just listed near you"); bidding never does. No slot-machine mechanics on bids, deposits or fees: that is both an FTC dark-pattern risk and a trust killer in a money app.
7. **Celebrate the return.** Open the app after a day away: the ring of the car you watched spins into place with a soft heartbeat haptic before anything else loads.

### 6.2 The sensory vocabulary (applied RESONANCE)

| Event | Motion | Sound | Haptic |
| --- | --- | --- | --- |
| Page to next car | Snap with 0.2 s settle | Soft air | Selection tick at the snap |
| Drag the price | Number rolls, ring brightens | Tick per increment | Light impact per increment |
| Place a bid | Price punches 1.06× and settles | Deep thud | Heavy impact, once |
| Outbid | Nothing in-app; a push notification | Nothing | Nothing |
| Last two minutes | Ring turns blue, one pulse per bid | Rising tick | Medium impact per pulse |
| Win | Ring closes, 200 ms hold, flash + confetti | Chime (major third up) | Success notification, then one heavy |
| ID scanned / document signed / plates filed | Tile fills with a check that draws on | Short ding | Light impact |
| Dealer: Let It Go | Button sinks, days ring unwinds | Whoosh | Medium impact |
| Dealer: sold | Price lands, payout chip appears | Coin | Success |
| Return after 24 h | Watched car's ring spins in | None | Heartbeat ×2 |

### 6.3 The stack decision

**Build the app in Expo (React Native), not as a PWA.** The reasons are physical:
- iOS Safari has no haptics API; `navigator.vibrate` is ignored on iPhone. The only web trick is toggling a hidden Safari `switch` checkbox (iOS 17.4/18), one tick, no intensity. Native gives the full set: selection, impact light/medium/heavy/rigid/soft, success/warning/error, and Core Haptics for the win pattern.
- 120 Hz gestures, snap paging, shared-element transitions and the Apple Pay sheet are native-grade in Reanimated, Gesture Handler and Skia; in a browser they are approximations.
- An App Store listing is trust for a money app; Peak has one.

**What carries over:** the Desk's pure TypeScript (`desk/src/lib/*`: paperwork, 130-U fill, Buyers Guide, field rules, money, loans, tax, posting) moves into a workspace package `@obavia/engine` used by both the Desk (web) and the app. The Worker (`desk/server`) grows the auction Durable Object. The cloud theme and the mark are the only visual assets we keep; type is Geist with Instrument Serif accents (the ad's system).

**Screens, buyer:** Lane (feed) · Car (full) · Bid sheet · Deposit (Apple Pay) · Won (ID, Sign, Plates) · Pickup · Watching · Me.
**Screens, dealer (in the Desk):** Let It Go · Floor · Show It · How Long · Live · Sold.

---

## 7. Marketing: the same Lego principle

- **To buyers:** never say "cheap". Show the two bars. The TikTok format is the product: one car, the floor, the retail, the clock. Caption: "No dealer licence. Ends Friday." The reveal is the bars; the viewer does the subtraction.
- **To dealers:** never say "losing". Show the days-on-lot ring going amber next to the Let It Go button. Line: "The least you'll take. By Friday." The ad we have (One car. Every channel.) already lives in this grammar; the auction film is its sequel: *You buy the car. You set the floor. Everything else?*
- **The hook nobody else has:** "Plates mailed to you." Peak's buyer leaves with a car and no title; ours leaves with the title filed. That single sentence is the review we want.
- **Channels:** TikTok and Reels for buyers (each lot is content); Marketplace listings as the funnel ("Auction ends Friday" with the app link); Texas independent-dealer groups and TIADA for sellers; Triple J as the first lot.

---

## 8. Research methods and what's next to decode

- **REA (Reverse Engineer Anything)** is installed as a global skill (`~/.claude/skills/reverse-engineer-anything`, MIT; `npx rea-agents setup` registers its MCP server when we want the tools). It can inspect a website's bundle and network captures, an Android APK through JADX, Electron apps and native binaries. Lawful use: public pages and our own captures.
- **Decode next:** Peak's Android APK (bid increments, proxy logic, soft-close rule, push payloads), a HAR of one live Peak auction end (how the clock extends), and the AuctioneerSoftware lot pages (data model). None of this copies code; it tells us the rules buyers are used to.
- **Fee table to finish (fetch blocked today):** Bring a Trailer and Cars & Bids buyer fees (both about 5% with a cap; confirm), Copart public buyer tiers, ACV buyer/seller fees. Our target: a buyer's premium low enough to beat Peak visibly (single digits) with the paperwork inside it.
- **From the owner:** the Codex/OpenAI transcript on the mechanic's operations and the day-to-day of losers; which five Triple J cars would go first; the floor on each.

---

## 9. Roadmap (fits the April 24, 2027 plan)

1. **Counsel and structure (2 weeks):** pick A or B above; fee shape; terms; deposit flow; Buyers Guide in-app and at pickup.
2. **Engine package (1 week):** `@obavia/engine` from the Desk's libs; auction Durable Object with tests (bids, proxy, soft close, deposits, audit).
3. **Expo app, buyer (4 weeks):** Lane, Car, Bid, Deposit, Won, Pickup, with the sensory vocabulary wired from day one. Motion and ads stay with Opus 5.5.
4. **Dealer side in the Desk (2 weeks):** Let It Go through Sold, feeding Handle A Sale.
5. **Pilot (2 weeks):** five Triple J cars, real buyers, real titles filed; measure hammer vs MMR, days to sale, support load.
6. **Then:** transport quotes, dealer-to-dealer lane under a wholesale auction GDN, other states.

---

## 10. Open questions for the owner

1. Structure A (software, dealer sells) to launch, with B (our own GDN) as the target? Or straight to B?
2. The buyer's premium: single digits, or zero premium and a dealer-side fee?
3. "As is" only at launch (red-light rules, odometer and title arbitration only), or a 48-hour "it starts and drives" guarantee for cars over a price?
4. Deposit amount and whether it is refundable on a lost auction (Peak: $50; BaT: a hold).
5. The repository name: the repo is still `whoisjaso/obavia` with the old agency description. Say the new name and I'll rename it through the GitHub API and fix the remotes.

---

## Sources

- Peak Auto Auctions: [home](https://peakautoauctions.com/), [buy](https://peakautoauctions.com/buy/), [sell](https://peakautoauctions.com/sell/), [terms](https://peakautoauctions.com/terms-2/), [App Store listing](https://apps.apple.com/us/app/peak-auto-auctions/id6714447533), [Texas site](https://www.peakautoauctionstx.com/), [a Texas lot on AuctioneerSoftware](https://peakauto.auctioneersoftware.com/auctions/6385/lot/2851-cancellation-fee), [reviews](https://endorsal.io/reviews/peak-auto/2?rating=5)
- Texas statutes: [Transp. Code ch. 503 (§503.021, .022, .024, .027)](https://statutes.capitol.texas.gov/Docs/TN/htm/TN.503.htm), [Occ. Code ch. 2301 (§2301.002, .006)](https://statutes.capitol.texas.gov/Docs/OC/htm/OC.2301.htm), [Occ. Code ch. 1802 (§1802.002)](https://statutes.capitol.texas.gov/Docs/OC/htm/OC.1802.htm), [16 TAC §67.30](https://trellis.law/state-rules/tx/administrative-code/title-16/part-4-texas-department-of-licensing-and-regulation/chapter-67-auctioneers/6730-exemptions), [TxDMV Dealer Manual §4.34 Brokering](https://ftp.dot.state.tx.us/pub/txdot-info/library/pubs/bus/dealer/section04.pdf), [43 TAC §215.84](https://law.cornell.edu/regulations/texas/43-Tex-Admin-Code-SS-215-84), [HB 2481 (84R) auctioneer exemptions](https://capitol.texas.gov/tlodocs/84R/billtext/html/HB02481F.HTM), [HB 2495 (79R) analysis on public auctions](https://capitol.texas.gov/tlodocs/79R/analysis/pdf/HB02495H.pdf), [TxDMV proposed 43 TAC §215.163 (auction and consignment plates)](https://prod-origin.txdmv.gov/sites/default/files/body-files/OGC%20Web%20215.163%20-%20Prop.pdf)
- Federal: [16 CFR Part 455](https://ecfr.gov/current/title-16/chapter-I/subchapter-D/part-455), [FTC Dealer's Guide to the Used Car Rule](https://ftc.gov/business-guidance/resources/dealers-guide-used-car-rule)
- Dealer economics: [AutoAlert, aged inventory 2026](https://www.autoalert.com/dealership-aged-inventory-strategies/), [NJ CAR on holding cost](https://new-jersey-auto-retailer.thenewslinkgroup.org/how-aged-inventory-quietly-drains-your-front-end-gross/), [Digital Dealer, "$500 loss today"](https://digitaldealer.com/news/dissecting-two-different-types-of-used-vehicle-retailers/55281/), [Auto Dealer Today, 60-day turn](https://www.autodealertodaymagazine.com/articles/why-have-a-60-day-used-vehicle-turn-policy), [Strong Automotive, asking price vs MMR](https://strongautomotive.com/gap-retail-wholesale-prices/), [KBB, retail lags wholesale](https://www.kbb.com/car-news/wholesale-used-car-prices-inch-up), [NAAA Arbitration Guidelines 2026](https://naaa.com/wp-content/uploads/2026/06/NAAA-Arb-Guidelines-2026.pdf), [Manheim NAAA arbitration](https://site.manheim.com/en/marketplace-policies/naaa-arbitration.html), [Manheim OVE availability policy (unfulfilled-sale fee)](https://site.manheim.com/en/marketplace-policies/us-policies/ove-addendum-naaaarbitration-policy/ove-vehicle-availability-policy.html)
- Competitors: [ACV Auctions app](https://apps.apple.com/app/id969808943), [ACV condition reports](https://www.acvauctions.com/support-article/how-to-read-a-vehicle-condition-report), [Bring a Trailer soft close (uShip guide)](https://www.uship.com/guides/how-does-bring-a-trailer-work/), [Copart vs IAAI public access](https://vinfax.net/learn/copart-vs-iaai), [Copart fee calculator](https://cdcalculators.com/copart-fee-calculator/), [IAAI fee calculator](https://cdcalculators.com/iaai-fees-calculator/)
- Haptics and web: [Ionic issue on the iOS switch haptic](https://github.com/ionic-team/ionic-framework/issues/29942), [ios-haptics (npm)](https://npmjs.com/package/ios-haptics), [iOS Safari web haptics](https://azukiazusa.dev/en/blog/ios-safari-web-haptics), [Apple HIG, Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics), [a haptics skill summarising WWDC guidance](https://playbooks.com/skills/charleswiltgen/axiom/axiom-haptics)
- REA: [morluto/rea](https://github.com/morluto/rea), [skills.sh listing](https://skills.sh/morluto/rea/reverse-engineer-anything)
