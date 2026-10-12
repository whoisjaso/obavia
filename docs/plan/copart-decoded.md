# Copart, decoded for Obavia

Why this exists: Copart is the largest online vehicle auction in the United States, with roughly one million registered members, and its processes are the ones every buyer and dealer already carries in their head. We decode it for three reasons: to understand what the buyer, the dealer and the platform each do; to borrow the moments that work (the high-bidder moment above all); and to see exactly where Obavia must differ because Copart sells salvage on consignment and we sell a dealer's running, clean-title car to a neighbour.

Method: Copart's support pages sit behind an Incapsula bot wall (every scripted fetch returned the challenge page), and the REA skill's decompilation route is for binaries, which the processes do not require. The decode therefore rests on Copart's fiscal 2025 Form 10-K (the authoritative description of its operations), its Canada and UK member guides, its Texas licensing summary as reported by brokers, the public consignment form, and the broker write-ups that live off its rules. Numbers from brokers are marked as such; counsel confirms anything we rely on.

---

## 1. The three seats

### 1.1 The seller (insurer, dealer, individual)

| Step | What Copart does | Source |
| --- | --- | --- |
| Assignment | The seller assigns the vehicle in Copart Access or the G2 platform: "assigning vehicles for sale, monitoring sales calendars", approving "charges or bids". | 10-K |
| Pickup | "we arrange for the transportation of a vehicle to our nearest facility"; most pickups within 24 hours; third-party carriers and Copart's own fleet. Advance charges (towing, impound release) are paid by Copart and recovered from proceeds. | 10-K |
| Title | "extensive expertise in DMV document and title processing", "a direct link to the DMV computer systems of multiple states". Total-loss cars need a salvage title before sale; the DMV paper comes "within 45 to 60 days of vehicle pick-up". Title Express transfers title from owner or lender; Loan Payoff gets payoff figures electronically. | 10-K |
| Storage | The car sits at the yard until title clears. Imaging, washing, cleaning, key-making are merchandising services. | 10-K |
| Sale programs | Percentage Incentive Program (a predetermined percentage of the sale price), Consignment (a fixed fee), Purchase (Copart buys and resells for its own account, mainly UK). | 10-K |
| Price controls | Pure Sale (no minimum), Minimum Bid, On Approval (seller may approve or reject the high bid), Buy It Now, Make an Offer, Night Cap (a second chance for cars that missed their minimum), interactive counter-bidding, IntelliSeller (machine-learned minimum bid suggestions and re-auction timing). | 10-K, copart.ca |
| Settlement | "Proceeds are collected from the member. Seller fees are subtracted, and the remainder is remitted to the seller." The UK form says proceeds minus seller fees "within 3 days from the date COPART receives cleared payment from the purchaser". | 10-K, UAE/UK consignment form |
| Dealer lane | Copart Dealer Services (CDS): "account management and vehicle remarketing services for franchise, independent and wholesale dealers who want top dollar for their older, higher mileage or damaged dealer trade-ins"; "a convenient and fast way to sell aged inventory, helping dealers reduce the need for extended floor planning costs". The Copart GO app lists "inventory, trade-ins and slow sellers". | copart.com dealer pages |
| Seller fees (one yard, broker-reported) | "$89.00 + 3% sale fee, with $75.00 minimum and $250.00 maximum"; re-runs free for two, "$35 per-run" from the fourth; "$10.00 vehicle history review fee" on clean-title sales; "$75.00" on Make an Offer sales. | Public consignment form 2023, directory listing |

The public consignment form states the legal shape plainly: "Seller appoints Copart as its Agent to sell the vehicle" and "Seller shall pay all fees when they come due, whether the vehicle sells or not."

### 1.2 The buyer (the member)

| Step | What Copart does | Source |
| --- | --- | --- |
| Registration | Online or mobile application; "copies of current government issued photo identification" before buying; business members upload dealer, dismantler, resale, repair or export licences and tax exemption certificates. | 10-K |
| Tiers | Guest (free: watchlists, alerts), Basic (bid on one vehicle at a time without a deposit, up to five with one), Premier (many at once, priority support, the Virtual Queue). Broker-reported: Basic $99/yr and bidding to $2,000; above that a deposit of 10% of the desired max bid; Premier $249/yr with a $400 refundable deposit. | 10-K; directory listing (unverified) |
| Licensing by state | Texas: private buyers "cannot bid directly on most vehicles with clean titles"; they "must use a licensed Copart broker"; salvage is open to individuals. Business buyers upload an operational licence and a sales tax permit for the same address. Copart also sells to the public through its Registered Broker program. | copart Texas page via brokers; 10-K |
| Preliminary bidding | "open preliminary bidding, similar to an eBay-style format"; the member enters a maximum and "BID4U bids incrementally on their behalf". Pre-bids are allowed up to the car being "two minutes or two units away" from the block. | 10-K; copart.ca |
| The virtual sale | "an internet-only virtual auction in which bidders compete in real time"; BID4U keeps bidding for the high preliminary bidder up to the maximum; "If no bids come in during the countdown or extensions, the vehicle sells to the highest bidder." VB3 adds "a circular countdown timer and in-auction audio elements for a more intuitive and game-like experience" and shows "regional flags representing current and high bidders". Monster Bid "immediately advance[s] the Current Bid to that amount" and "cannot be undone". Ties: "the live bid will stand as the higher bid". | 10-K; copart support pages via search |
| Outbid | "Members who are outbid receive an email notification and are provided the opportunity to re-bid." IAA's equivalent: "If you're outbid, you'll receive an immediate on-screen notification." | copart.ca; iaai.com.au |
| Binding | "all bids are a legally binding offer to purchase the vehicle at that specific price". | copart.ca |
| On Approval | The seller "has until 5 p.m. PT one business day after the sale" (copart.ca) or "7:45 p.m. (Pacific Time) on the next business day" (CarProxy) to approve, reject or counter. While waiting the buyer "cannot schedule transportation, make payment, pick up the vehicle, or modify the original bid". A seller may still accept the original bid after a failed counter; a buyer who then walks pays the relist fee. | copart.ca; CarProxy; SalvageReseller |
| Payment | Due within three business days including the sale day (some sources say two, with a 5 pm cutoff); "$50 late fee"; ePay, cards, third-party financing. | 10-K; broker pages (figures unverified) |
| Fees | "based on a percentage of the final price"; licensed dealers pay less than unlicensed consumers; a Virtual Bidding Fee "never more than $149"; a Secured Funds discount for secured payment; volume discounts at 25 cars or $75,000 a year; "Brokers buying for unlicensed Members set their own fees". Broker-reported extras: gate fee $59–$79, environmental fee $10, broker fee $100. | Copart member fees help article via search; broker pages |
| Pickup | By appointment with a gate pass; "Most vehicles cannot be driven off Copart property"; three days free storage then a daily fee "starting at $5 and capping at $30"; Copart Delivery booked within three days avoids storage. | broker pages |
| Title | Delivered after payment; a Limited Power of Attorney is "required for several of the options"; salvage buyers must repair, pass a "salvage vehicle inspection by the TxDMV or an authorized inspection station", and retitle as rebuilt before registering. | copart help via search; CarProxy Texas |
| Where buyers are | 69.8% of US cars sold went out of state: 31.0% to other states, 38.8% international. | 10-K |

### 1.3 The platform

- Revenue is fees, not cars: "Copart recognizes these fees as net revenue, not the gross vehicle selling price, except for purchased vehicles." Seller fees, buyer fees, listing, transport, title processing, storage, bidding and loading fees.
- The car is sold "typically within seven days after arriving".
- Admission procedures exist "to prevent frivolous bids that would not result in a completed sale".
- Regulation: "business and occupational licensure requirements", vehicle titling and registration rules, "delays or changes in state title processing" as a stated risk.
- Customers: "licensed vehicle dismantlers, rebuilders, repair licensees, used vehicle dealers, exporters, and to the general public".

---

## 2. The high-bidder moment, as Copart and IAA play it

What the two platforms actually do: a status line that flips between "You are the high bidder" in green and "Outbid" in red, a circular countdown that restarts on every bid, regional flags for the current and high bidder, "enhanced visual and audio signaling" when your lots come up, an email or on-screen notice when you are outbid, and a sale "to the highest bidder" when the countdown runs out. Neither publishes its sound design; what members report is a tick on the countdown, a chime on a bid, and a sold cue.

What we take and what we change:

| Copart / IAA | Obavia | Why |
| --- | --- | --- |
| "You are the high bidder" in green text | A leading mark beside the price and a two-note rising chime with a success haptic on the server's ack. No sentence. | The doctrine: a price, a time, a name, one verb. The sound says it. |
| "Outbid" in red + email | Push only, with the time left in the copy; in the app the leading mark fades and the ring state streams. A warning haptic if the sheet is open. | Silence is the punishment. The push carries the words. |
| Countdown restarts on every bid, duration varies | Fixed 2:00 refill in the last two minutes, blue ring, one-time teach | Variable extension reads as manipulation (decisions §2). |
| Regional flags | None | Flags are reading, and the buyer is a neighbour. |
| Monster Bid (jump to a number, irreversible) | Drag the wheel to any number; over 2× asks a 600 ms hold | Same reach, a deliberate hand. |
| BID4U proxy from a max | The second wheel labelled by its value ("up to $5,600") | Same mechanism, no word "max". |
| On Approval / counter-bid after the sale | None at launch. The dealer sets the floor before the lane opens; the hammer is the sale. | A win that may not be a win breaks the Won moment and the deposit promise. The dealer's second-chance offer (decisions §2) covers the no-pay case only. |
| Email when outbid, email when won | Push, and the app opens on Won | The body remembers the win; email does not. |

---

## 3. SOPs for the three seats at Obavia, drawn from the decode

### 3.1 The dealer (in the Desk)

1. Assign: Let It Go on a car with a clear title record, or a lender lead time set once. Copart will not sell before title clears; neither do we.
2. Show It: twelve photos with the three mandatory angles, the Buyers Guide hung and photographed, six condition rows, a defect line, the dealer's name on the statement. Copart images every car for the same reason; a car without photos does not sell.
3. Floor: the net the dealer will walk away with, beside the holding cost and the wholesale band. Copart's IntelliSeller suggests a minimum; our band plays that role without a model the dealer cannot see.
4. Reach: the posting fans out; Marketplace listings are retracted on sale. Copart lists to 170 countries; we list to the buyer who can drive it home.
5. Sold: the buyer's deadline in big type; the payout chip with its settle date; relist, forfeit or second-chance offer on expiry. Copart's Night Cap and re-run fees become our relist with no fee during the pilot.
6. Payout on cleared funds, lender first, remittance PDF. Copart remits "minus applicable Seller fees"; the pilot has none.

### 3.2 The buyer (in the app)

1. Identity before the first bid: a licence scan and a captured $250 deposit. Copart requires "government issued photo identification" and a deposit above $2,000 of bidding; we ask once and smaller.
2. Bid: the drag arms, the button bids, the ack lands the thump and the leading mark. Every bid binding, as Copart's are.
3. Outbid: push with "2:00 left"; the app shows the state, never a modal.
4. Won: the hammer is the sale. No approval window. The four tiles follow: ID, Insure, Sign, Plates.
5. Pay: ACH, wire or cash at the lot, 48 hours. Copart gives three business days with a late fee; we give two days and forfeiture of the deposit, said up front.
6. Pickup: scan the VIN, start the car, the pass turns green. Copart's "cannot be driven off" rule is the opposite of ours and the heart of the difference: our cars drive home.
7. Plates: the dealer files the 130-U; the ring ticks Filed, Approved, Mailed. Copart hands over a title and a Limited Power of Attorney and leaves the county to the buyer.

### 3.3 Obavia (the platform)

1. The seller of record is the dealer; the pilot runs on Triple J's GDN; Obavia files for its own (decisions §0). Copart holds the licences it needs in every state and sells the public through brokers where it does not; the broker is exactly the role 43 TAC §215.85 forbids us to charge for without a GDN.
2. Admission: ID and deposit, one bid at a time until the first car is paid for (Copart's Basic tier does the same without the deposit).
3. Fees: none to the buyer, ever; a flat seller-side fee once licensed. Copart's buyer fee, virtual bid fee, gate fee and broker fee are the numbers a buyer must read beside the hammer; we have one number under it.
4. Audit: every bid idempotent and stamped; a rejection after close carries the server's time. Copart's "frivolous bid" admission procedures and binding-bid rule are our fraud gates (sim 03).
5. Title before sale: the lane does not open on a car whose title is not in hand or scheduled. Copart stores the car "until title is cleared".
6. Out of state: Texas licences only until the out-of-state packet exists. Copart's 69.8% out-of-state share is salvage and export; our buyer drives home on Texas plates.

---

## 4. Facts to confirm with counsel or Copart before we quote them

- The seller approval deadline (5 pm PT next business day vs 7:45 pm PT) and the two- vs three-day payment window: broker pages disagree.
- Membership prices and deposits ($99, $249, 10%, $400): a directory listing, not Copart's current schedule.
- Gate, environmental and broker fee amounts: broker pages.
- Whether Copart's Texas clean-title broker rule derives from Occ. Code ch. 2301 or 43 TAC §215: CarProxy says "Texas's auto auction licensing regulations" without a cite. Our own reading is in `obavia-auction-decisions.md` §0.

## Sources

- Copart, Inc. Form 10-K for fiscal 2025 (SEC EDGAR, filed 2025): sellers, pickup, title processing, VB3, membership tiers, settlement, fees, customers, regulation.
- Copart Canada member guide "Place Bids" and sale-status definitions (copart.ca): pre-bids, Pure Sale, On Approval, Minimum Bid, ties, binding bids, outbid email.
- Copart UK "Bidding blog" (copart.co.uk): BID4U, counter bids, two-business-day acceptance.
- Copart support "How VB2 works" and VB3 description as quoted in search results: countdown, audio elements, flags, Monster Bid.
- Copart Texas licensing page as summarised by CarProxy and stat.vin; Copart "No License Required" page as quoted.
- Copart public consignment form 2023 (PDF): agency, fees due whether sold or not, history review fee, Make an Offer fee.
- Copart member fees help article as quoted in search results: percentage fees, Virtual Bidding Fee cap, discounts, broker fees.
- SalvageReseller "What happens when a vehicle is On Approval" (Feb 2026) and Copart fee guide; CarProxy "Post-auction counter offers" and Texas regulations page.
- IAA Australia "How to bid" and AuctionNow launch coverage (Auto Remarketing, Business Wire): on-screen outbid notice, audio signalling, jump bid.
