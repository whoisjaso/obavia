# Peak Auto Auctions, decoded for Obavia

Researcher-architect, checked 2026-10-12 and 2026-10-13. Passive public-surface observation only (no account was created, no bid placed, no binary decompiled). Every line is either an OBSERVATION with its URL and check date, an INFERENCE anchored to an observation, or an UNKNOWN. Figures Peak publishes are quoted; nothing is guaranteed about Obavia's outcomes.

## Summary in ten lines

1. "Peak Auction" is Peak Auto Auctions, LLC, Denver (5126 Brighton Blvd, Denver CO 80216; founded 2018; 11 to 50 staff), an online auctioneer for towing companies' unclaimed vehicles, now also dealer overstock, in 40 states including Texas (peakautoauctionstx.com).
2. It is not a dealer and holds no GDN it discloses: every Texas invoice says "Peak Auto Auctions is not an automobile dealer ... You are purchasing this vehicle from the tow company ... Peak Auto Auctions collects a service fee only." The public buys because a Texas vehicle storage facility may sell an abandoned vehicle "at a public sale" (Occ. Code 2303.157) and a licensed auctioneer may run that sale.
3. The buyer pays a 13.5% buyer's premium in Texas (14% in Colorado), a $50 card hold to bid, no card above $5,000 per invoice, cash or wire for the rest, and a Yeeld credit card surcharge whose rate is not published.
4. Most cars come with tow lien paperwork, not a title; the buyer applies for title themselves within 30 days; out-of-state buyers get parts only; Peak "does not manage paperwork for buyers or sellers."
5. Pickup is a two-day window, often by appointment, at a tow yard; late pickup means storage fees (one dealer: $22.34 a day) or forfeiture of all money paid "with no recourse."
6. The seller pays nothing ("no seller fees ... Sellers keep 100% of the hammer price"); the whole fee sits on the buyer.
7. Stack: WordPress marketing site; a Laravel/Inertia/React buyer portal per state (Pusher, Stripe, S3); a React admin at admin.peakautoauctions.com over enterprise.peakautoauctions.com/api; iOS app id6714447533 (4.5 stars, 8 ratings, v1.1.17 Sep 22, 2026) and Android com.peak_auto (1K+ installs, Sep 21, 2026); the earlier platform was auctioneersoftware.com.
8. Marketing is seller-side: trade press for tow operators, a Facebook page per state, LinkedIn (243 followers), 123 Google reviews shown through Endorsal (all five star; the aggregator shows no lower ratings). The one fee complaint surfaced by search ("13% buyers premium is too much") could not be found on the page at check time: UNVERIFIED.
9. Two Texas dealers already dump backlot cars to the public through Peak (Power Auto Group, Fort Worth; D3 Holdings, McKinney): "TOW AWAY", no temp tags, 13.5% premium, paperwork "at the time of pick up." That is the lane Obavia enters, with the opposite fee and paperwork model.
10. The sourced deltas (section 8) are already decided in `docs/plan/obavia-auction-decisions.md` and built in `auction/` and `desk/`: zero premium, $250 captured deposit, title gate before listing, the three documents signed in the app, starts at pickup or no sale, a named after-hours line. "Better than Peak" is never said on the glass (growth plan amendment 2026-10-13); this file feeds the pairs.

## 0. Which "Peak", and how it was pinned down

| Candidate | What it is | Why in or out |
| --- | --- | --- |
| Peak Auto Auctions, LLC (peakautoauctions.com, Denver) | Online auctioneer; "The Nation's Premier Marketplace for Unclaimed Vehicles"; FAQ: "Do I have to be a dealer or have a special license to buy ... No, Peak is open to the public." (https://peakautoauctions.com/, checked 2026-10-12) | IN. Sells vehicles to the public without a dealer licence, nationwide, Texas site live. The decisions file already cites "Peak" for the premium and the $50 deposit (`docs/plan/obavia-auction-decisions.md` §1). |
| Peak Auto Sales, LLC (Colorado Springs / Limon, CO) | A used car dealer on KBB and CarEdge (https://www.kbb.com/dealers/colorado-springs-co/74248191/peak-auto-sales-llc, checked 2026-10-12) | OUT. A retail lot, not an auction. |
| Peak Automotive, Inc. (Bay Shore, NY) | BBB profile of a used car dealer (https://www.bbb.org/us/ny/bay-shore/profile/used-car-dealers/peak-automotive-inc-0121-73778/customer-reviews, checked 2026-10-12) | OUT. Different company; its complaints must not be attributed to Peak Auto Auctions. |
| Peak Auto Storage, LLC (11211 Goodnight Ln, Dallas) | A Texas towing and storage company with BBB rating F, 25 complaints in three years, founded 2005, officers George Green and Michael Powell (https://www.bbb.org/us/tx/dallas/profile/towing-company/peak-auto-storage-llc-0875-90016863, checked 2026-10-13) | RELATED SELLER, not the company. It sells on Peak's Texas portal ("Vehicle Sales By Peak Auto Storage Goodnight - Hosted By Peak Auto Auctions", auction id 2902). Whether it is affiliated with Peak Auto Auctions is UNKNOWN; the names match, the officers and founding dates do not. |

Method notes. The REA CLI ran (`npx -y rea-agents@latest --help` returned rea 6.4.0) but its browser and binary routes need a user-owned browser or a local artifact, neither of which this task supplies, so the decode used curl and the fetch tools on public pages. The state portals are Inertia apps; their page data is embedded as JSON in the HTML, which is where the auction terms and configuration below were read. HiBid, BBB complaint detail, Facebook pages and the Meta Ad Library returned bot walls (403 or "temporarily blocked"), so those are marked not reachable.

## 1. Company and licence model

### Observations

| # | Observation | Source | Checked |
| --- | --- | --- | --- |
| 1.1 | "Peak Auto Auctions provides a transparent, streamlined online platform for connecting sellers and buyers directly." "The Nation's Premier Marketplace for Unclaimed Vehicles ... specializing in unclaimed and abandoned vehicles, motorcycles, trailers, powersports, and heavy equipment. We proudly partner with towing companies, salvage and recycling facilities, dealerships, auto body shops, municipalities, financial institutions". | https://peakautoauctions.com/ | 2026-10-12 |
| 1.2 | Seller: "Peak Auto Auctions, LLC", address "5126 Brighton Blvd, Denver, CO 80216-2240", support +1 720-232-2304, developer phone +1 850-313-0469. | https://play.google.com/store/apps/details?id=com.peak_auto | 2026-10-13 |
| 1.3 | LinkedIn: "Retail Motor Vehicles", Denver CO, 243 followers, "11-50 employees", "Privately Held", "Founded 2018", 15 employees listed; "helps towing companies nationwide turn unclaimed vehicles into revenue with no seller fees." | https://www.linkedin.com/company/peak-auto-auctions | 2026-10-13 |
| 1.4 | President Matt Davison, "retired U.S. Air Force ... 8 years in the auto industry, the last 6 in the auto auction business"; Director of Strategic Partnerships Michele Lee; sales team Christine Weaver, Tony Fish, Cathy Wright, Jake Ford; Operations Manager Alexis Bowen (ex Insurance Auto Auction). | https://peakautoauctions.com/about-us/ | 2026-10-12 |
| 1.5 | Footer licences: "Matthew B. Davison, Auctioneer, Denver License: 2022-BFN-0007086, GA Auctioneer #AU004567, FL Auctioneer #AU5296, TN Principal Auctioneer #7462, LA Auction Business LA AB-537, IN License #AU12500022. Tony Porras, Auctioneer, TX license #18376". | https://peakautoauctions.com/ (footer) | 2026-10-12 |
| 1.6 | TDLR licence search by number 18376 returned "No Records Found"; by name "PORRAS, ANTONIO" returned "No Records Found"; a wildcard "PORRAS" returned A/C technicians and others, no auctioneer. | https://www.tdlr.texas.gov/LicenseSearch/ (POST SearchResultsListBrowse.asp) | 2026-10-13 |
| 1.7 | Every Texas invoice footer: "Peak Auto Auctions is not an automobile dealer. Peak auto auctions did not negotiate this sale. You are purchasing this vehicle from the tow company listed above. Peak Auto Auctions collects a service fee only." | https://www.peakautoauctionstx.com/auctions (embedded auction config, `invoice_footer`, auctions 3144, 3161, 2902, 3156) | 2026-10-13 |
| 1.8 | Texas terms: "Vehicles are sold with tow lien paperwork per State Code, unless otherwise stated. The lien paperwork can be used to apply for a title exclusively in the state the vehicle was purchased in." | same, `terms` | 2026-10-13 |
| 1.9 | Texas law: a vehicle storage facility operator "may sell the vehicle at a public sale without obtaining a release or discharge of any lien on the vehicle" once the second notice has run 30 days (Occ. Code 2303.157(b)); the notice must state that failure to claim is "a consent to the sale of the vehicle at a public sale" (2303.154(b)(3)(B)). | https://texas.public.law/statutes/tex._occ._code_section_2303.157 and ..._2303.154 | 2026-10-13 |
| 1.10 | Texas law: "A person may not act as an auctioneer ... unless the person holds a license issued by the department" (Occ. Code 1802.051(a)); a licensed auctioneer "may conduct an auction to sell motor vehicles ... for a person who holds (1) a dealer general distinguishing number or a wholesale motor vehicle auction general distinguishing number" (1802.051(d)). | https://texas.public.law/statutes/tex._occ._code_section_1802.051 | 2026-10-13 |
| 1.11 | TxDMV form VTR-265-VSF "Licensed Vehicle Storage Facility Lien Foreclosure": "The highest bidder at public sale must apply for title unless the vehicle is purchased by a licensed motor vehicle dealer with a current General Distinguishing Number (GDN)." The public sale "may occur on or after the 31st day after the Second Notice or Notification to Law Enforcement, whichever is later." | https://www.txdmv.gov/sites/default/files/form_files/VTR-265-VSF.pdf (Rev 01/25) | 2026-10-13 |
| 1.12 | States with "Current Live Auctions" on the Buy page: 40 (AL AZ AR CA CO FL GA ID IL IN IA KS KY LA MD MA MI MN MS MO MT NE NV NH NJ NM NY NC OH OK OR PA SC TN TX UT VT VA WV WI); "No Active Auction": AK CT DE DC HI ND ME RI SD WA WY. Each state has its own domain (peakautoauctionstx.com, peakautoauctionsco.com, ...; Illinois runs on peakautoauctionsil.hibid.com). | https://peakautoauctions.com/buy/ | 2026-10-12 |
| 1.13 | Colorado terms (older platform): "PEAK AUTO AUCTIONS IS NOT AN AUTOMOBILE DEALER. PEAK AUTO AUCTIONS IS NOT NEGOTIATING THIS SALE. YOU ARE PURCHASING THIS VEHICLE FROM THE TOW COMPANY. PEAK AUTO AUCTIONS COLLECTS A SERVICE FEE ONLY." Vehicles "sold with a bill of sale and towing affidavit per C.R.S. 42-4-2104." | https://peakauto.auctioneersoftware.com/auctions/6385/lot/2851-cancellation-fee (terms dated 03.19.2023) | 2026-10-13 |
| 1.14 | Homepage counter: "Vehicles 150000 + Sold Nationwide"; Sell page: "more than 250,000 vehicles sold through our platform". | https://peakautoauctions.com/ and /sell/ | 2026-10-12 |

### Inferences

- (from 1.7, 1.8, 1.9, 1.11) Peak's licence model in Texas is auctioneer-for-the-lienholder, not dealer and not consignment under a GDN. The seller of record is the vehicle storage facility foreclosing its storage lien at a public sale; the public can buy because 2303.157 lets a VSF sell to anyone and VTR-265-VSF makes the "highest bidder" the title applicant. Peak takes a "service fee" (the buyer's premium) and never touches title.
- (from 1.10 and auctions 3144, 3161 in section 5) When a Texas dealer sells through Peak, the legal hook is 1802.051(d): a licensed auctioneer may auction motor vehicles for a GDN holder. Peak does not need a GDN for that either; the dealer is the seller of record and does the paperwork "at the time of pick up."
- (from 1.5, 1.6) The Texas auctioneer licence number on the footer does not resolve in TDLR's public search by number or by name. This is UNVERIFIED either way: the search tool may index the licence under a different format or holder name. Do not repeat "Peak has no Texas licence" anywhere; record it as a check that failed.
- (from 1.12, 1.14) The two "vehicles sold" figures disagree (150,000 and 250,000); both are Peak's own counters, not audited.

### Unknowns

- Whether Peak or any affiliate holds a Texas GDN or a wholesale auction GDN: not found (TxDMV licence search is a form that was not queried; a name search on the web returned nothing).
- Any affiliation between Peak Auto Auctions, LLC (Denver, 2018) and Peak Auto Storage, LLC (Dallas, 2005): not found.
- Revenue, funding, ownership: not found (Crunchbase not checked; ZoomInfo shows only a listing).

## 2. Buyer flow, step by step

### Observations

| # | Step | Observation | Source | Checked |
| --- | --- | --- | --- | --- |
| 2.1 | Find | "01. Choose Your State ... 02. Take a Peek ... 03. Create an Account ... Found something you're interested in? Create a free account ... 04. Click to Buy! Review the terms and conditions for your selected auction, then place your bid with confidence." | https://peakautoauctions.com/buy/ | 2026-10-12 |
| 2.2 | Register | The portal's register page offers all 50 states; the admin bundle carries fields `drivers_license`, `license_number`, "Driver license on file:", and a per-auction switch `require_license_number`. Phone extension "3 - Assistance with Buyer Registration". | https://www.peakautoauctionstx.com/register (embedded `states`); https://admin.peakautoauctions.com/assets/index-D_Nhd45p.js; https://peakautoauctions.com/contact-us/ | 2026-10-13 |
| 2.3 | Consent | "By registering for this auction, you authorize Peak Auto Auctions to send you marketing text messages related to auctions in Texas, with the option to opt out at any time." Each auction has `require_terms_approval: true`. | Texas auction `terms` and `config` | 2026-10-13 |
| 2.4 | Deposit | "A $50 deposit will be required to bid. If you are the winning bidder, the deposit will be applied to your invoice. If you do not win, the deposit will be refunded." Terms: "The deposit will appear as a pending charge on your credit card until the auction concludes ... If you do not win, the deposit hold will be released within a few business days. If you win but fail to complete payment or pickup, the deposit will be forfeited." Config: `auth_amount: 50`, `save_as_deposit: false`. | Texas auctions 3144, 3161, 2902, 3156 | 2026-10-13 |
| 2.5 | Preview | "Vehicle Preview: Tuesday, Oct 13th between 10:00 AM and 12:00 PM BY APPOINTMENT! CALL 817-307-2974" (3144); "KEY PREVIEWS THURSDAY 10/15 ONLY 9AM - 1:30PM" (2902); "Vehicle preview will not be available after these times if you win a vehicle payment will be required prior to any further preview" (3161). FAQ: "Yes, there is a stated preview day on the auction." | same; https://peakautoauctions.com/buy/ | 2026-10-13 |
| 2.6 | Bidding | "Internet-only auction." Timed, roughly a week: auction 3144 opened 2026-10-05 16:12 UTC and closes 2026-10-13 12:30 UTC; starting bid `400` (config `starting_bid`); "Lots will begin to close Tuesday, Oct 13th at 12:30PM"; `stagger_enabled: true`. "All auctions have a soft close. If a bid is placed within the final 1-2 minutes of a lot closing, the lot end time will be extended by 1-2 minutes." Admin bundle shows a `max_bid` field and an `AUTOBID` flag on bid rows; the Colorado platform showed "Bid Increment: $25.00" on a $400 start. | Texas auction config; admin bundle; https://peakauto.auctioneersoftware.com/... | 2026-10-13 |
| 2.7 | Seller bidding | "The auctioneer reserves the right to place bids on behalf of sellers up to the amount of any confidential reserve." Sellers "set a reserve if desired" (Sell page). | Texas `terms`; https://peakautoauctions.com/sell/ | 2026-10-13 |
| 2.8 | Winning | "You will receive a winning bid e-mail notification immediately after the auction closes. You will have the option to pay for the won item via credit card on the Peak website or by paying in cash to the towing company. Please process payment within the specified pickup dates." Winner identity is hidden from other bidders (`hide_winning_user: true`). | https://peakautoauctions.com/ FAQ; auction config | 2026-10-12/13 |
| 2.9 | Notifications | Buy page: "receive real-time email and/or text notifications when you're outbid". App: "Added support for push notifications with deep linking (directly to related auction/lot)" (v1.0.8, 11/12/2025). | https://peakautoauctions.com/buy/; https://apps.apple.com/us/app/peak-auto-auctions/id6714447533 | 2026-10-12/13 |
| 2.10 | Payment | "Accepted payment methods: CASH, WIRE TRANSFER, or CREDIT CARD ONLY (with valid matching ID). No checks." "Credit cards will not be accepted for invoices, or any portions of invoices exceeding a total of $5000 ... Invoices will not be split to circumvent this rule." (`max_charge_value: 5000`). One dealer: "The Buyers Premium will be charged to the credit card on file immediately following the auction. The invoice balance must be paid cash to D3 Holdings." Peak's own storage lot: "Exact change only." | Texas auction `terms`, 3161 `alert`, 2902 `intro` | 2026-10-13 |
| 2.11 | Payment window | "Payment and Removal: Monday 10/19 - Wednesday 10/21 BETWEEN 9AM-2PM for the week following the auction only. Last day for payment and pickup is Wednesday @ 2PM, no exceptions. Any account that fails to pay for their full invoice will be disallowed from bidding at any of our future auctions." (2902, closes Sunday 10/18). | auction 2902 `removal_times` | 2026-10-13 |
| 2.12 | Pickup | "Vehicle Pickup: Wednesday, Oct 14th and Thursday, Oct 15th between 9:00 AM and 5:00 PM BY APPOINTMENT!" (3144, closes Oct 13). "Due to space constraints, the number of tow trucks or trailers allowed in the lot may be limited. Buyers are strongly encouraged to schedule a pickup reservation." Colorado: "Vehicles purchased at this auction shall be pushed, pulled or towed from the tow yard over the gate unless the buyer has a dealer's plate attached." Power Auto Group: "All vehicles sold as 'TOW AWAY' with NO emissions guaranteed AND NO temp tags issued." | auction configs; Colorado terms | 2026-10-13 |
| 2.13 | Keys | "We cannot guarantee that the vehicle you bid on will have keys available, even if you see keys in any written or picture description." FAQ heading "How do I get a key for the vehicle?" (answer not rendered server-side). | https://peakautoauctions.com/terms/; /faqs/ | 2026-10-12 |
| 2.14 | Runs / drives | "If the vehicle is listed as: 'RUNS: YES', it indicates the engine turned on. If the vehicle is listed as 'DRIVES: YES', it indicates the vehicle moved forward and backwards 1 to 2 feet at the time of testing." | Texas `terms` | 2026-10-13 |
| 2.15 | Returns | "A bid is a binding contract ... Once you place a bid, you may not cancel or retract it." "All vehicle claims must be submitted to the selling company listed at the top of this invoice. All claims submitted after a vehicle has left the auction yard will be denied. All sales are as-is and final ... No refunds or returns." Colorado: liquidated damages "of up to $200 for the resale or disposal of each vehicle" on no-pay, and a chargeback waiver clause. | Texas `invoice_footer`; https://peakautoauctions.com/terms/; Colorado terms | 2026-10-13 |
| 2.16 | Support hours | "Available by Phone M-F, 8am - 6pm MT"; the header also says "Available 24/7". App v1.1.17: "New chatbot feature". | https://peakautoauctions.com/contact-us/; App Store | 2026-10-12/13 |

### Inferences

- (from 2.4) The $50 is a card authorization, not a captured charge (`auth_amount`, "pending charge", "hold will be released within a few business days"). The decisions file's line "$50 is a ticket, not a bond (fraud run, Peak)" rests on this.
- (from 2.6) The config keys `end_time_ext_threshold: "117"`, `end_time_ext_amount: "113"`, `bid_increment: "2"`, `stagger_qty: "2"`, `stagger_duration: "1"` are option identifiers, not seconds or dollars; the terms text ("final 1-2 minutes ... extended by 1-2 minutes") is the only published soft-close number. The increment table is not published.
- (from 2.8, 2.10, 2.11, 2.12) The buyer's money moves in up to three pieces to two parties: a Peak hold on a card, a premium charged by Peak to the card, and the hammer paid in cash or wire to the tow yard at the gate. There is no single "paid" state the buyer can see.
- (from 2.11, 2.12) The pickup window typically opens the day after close and lasts two business days. A buyer with no trailer and no plates has about 48 hours to arrange a tow.

### Unknowns

- Whether ID is verified at registration or only "with valid matching ID" at card payment: not found. The admin switch `require_license_number` suggests per-auction.
- Proxy bidding rules and the increment table: not found on any public page.
- Whether the outbid text uses a short code or 10DLC: not found.

## 3. Fees

### Observations

| # | Fee | Observation | Source | Checked |
| --- | --- | --- | --- | --- |
| 3.1 | Buyer's premium, Texas | "A 13.5% Buyer's Premium will be added to each winning invoice." "A 13.5% buyer's premium will be applied to the final bid price of each lot unless otherwise stated in the lot description." Peak Auto Storage: "There is a 13.5% buyer's premium for cash or credit payments." | Texas auctions 3144, 3161, 2902, 3156 | 2026-10-13 |
| 3.2 | Buyer's premium, Colorado | "There will be a 14% Buyer's Premium ADDED to the purchase price of each vehicle." | https://peakauto.auctioneersoftware.com/auctions/6385/lot/2851-cancellation-fee | 2026-10-13 |
| 3.3 | Premium is taxed | Colorado: "Sales tax will be calculated including the buyer's premium." Texas: "Vehicles with a title may be subject to sales tax and title fees, payable at the time of auction or pickup." | same; Texas `terms` | 2026-10-13 |
| 3.4 | Premium charged separately | "The Buyers Premium will be charged to the credit card on file immediately following the auction. The invoice balance must be paid cash to D3 Holdings." | auction 3161 | 2026-10-13 |
| 3.5 | Deposit | $50 card authorization per auction (section 2.4); forfeited on no-pay or no-pickup. Charity auctions: `auth_amount: 0`. | auction configs | 2026-10-13 |
| 3.6 | Card surcharge | Admin bundle: "Prevents Yeeld credit card surcharges on every buyer invoice in this auction", "Manage Yeeld surcharge overrides", "Credit card surcharge report", "Includes proportional credit card surcharge refund." Yeeld is a surcharging vendor ("Yeeld Surcharging for Stripe", April 2026 release). | https://admin.peakautoauctions.com/assets/index-D_Nhd45p.js; https://www.easternprogress.com/yeeld-surcharging-for-stripe-... | 2026-10-13 |
| 3.7 | Card ceiling | No card on invoices over $5,000; cash, cashier's check or wire above that. | Texas `terms`; Colorado terms | 2026-10-13 |
| 3.8 | Storage after pickup window | Colorado: "The seller may charge a storage fee of up to $30 per day." Texas D3 Holdings: "the winning buyer will be charged per day storage fee of $22.34." Texas general: "Vehicles not removed promptly may be subject to resale by the tow company, or a storage fee as permitted by local law." Peak Auto Storage: "All vehicles left on property after the Wednesday following the auction will be deemed abandoned, and the buyer forfeits all monies paid and the property will revert to the seller with no recourse." | Colorado terms; auctions 3161, 2902; Texas `terms` | 2026-10-13 |
| 3.9 | Tax on tow fees | Peak Auto Storage: "All vehicles sold by the seller (Peak Auto Storage) are subject to sales tax on the towing and impound fees from the original tow, unless you have provided the seller with a valid tax-exempt certificate. This must be paid at the time of pickup." | auction 2902 | 2026-10-13 |
| 3.10 | Key fees | Not on Peak's invoice; the search index surfaced a Texas listing stating key fees "must be paid directly to the tow company" (page not retrievable at check time). | search snippet only | 2026-10-13 |
| 3.11 | No-pay damages | Colorado: "liquidated damages of up to $200 for the resale or disposal of each vehicle." Texas: deposit forfeited and "disallowed from bidding at any of our future auctions." | Colorado terms; auction 2902 | 2026-10-13 |
| 3.12 | Seller fees | "FREE! There are no fees associated with using Peak Auto Auctions to sell your abandoned vehicles or lot inventory." "no seller fees, no hidden fees, and clearly disclosed buyer premiums. Sellers keep 100% of the hammer price." | https://peakautoauctions.com/sell/; LinkedIn | 2026-10-12/13 |
| 3.13 | Marketing line vs fee | "Free to Browse! No Hidden Fees!" (Buy page); mission: "eliminating hidden fees, maintaining a low buyer's premium". | https://peakautoauctions.com/buy/; /about-us/ | 2026-10-12 |

### Inferences

- (from 3.1, 3.3, 3.6, 3.9) On a $3,000 Texas hammer with title the buyer's cost is at least $3,000 + $405 premium + 6.25% tax on $3,405 ($212.81) + title and registration, plus any Yeeld surcharge on the card portion and any tow-fee tax at the yard. The premium alone is 13.5% of hammer; the decisions file's "a 13% premium depresses the hammer 8 to 10%" is a modelling assumption, not a Peak figure.
- (from 3.4, 3.6) Peak's revenue is the premium, collected by card through Stripe with a surcharge passed to the buyer; the hammer goes to the tow yard in cash. Peak carries no custody of the hammer and no title risk.
- (from 3.12, 3.13) "No hidden fees" is true in the narrow sense that the premium is printed; the buyer still meets four other charges (surcharge, storage, key, tow-fee tax) that are not on the Buy page.

### Unknowns

- The Yeeld surcharge rate on Peak invoices: not found (not in the Texas bundle or terms).
- Whether the premium is lower for dealers or volume buyers: not found (the admin has an "Update buyers premium" table per setting, which suggests tiers exist).
- Internet fee, doc fee, gate fee: none found on any Peak page.

## 4. Paperwork model

### Observations

| # | Observation | Source | Checked |
| --- | --- | --- | --- |
| 4.1 | "Most vehicles will be sold on a bill of sale, but some will be sold with title." "Vehicles are sold with tow lien paperwork per State Code ... The lien paperwork can be used to apply for a title exclusively in the state the vehicle was purchased in." | Texas `terms` | 2026-10-13 |
| 4.2 | "All paperwork-related issues must be addressed directly with the tow company or dealer from whom the vehicle was purchased. Peak Auto Auctions does not manage paperwork for buyers or sellers." | Texas `terms` | 2026-10-13 |
| 4.3 | "Buyers are responsible for applying for title within 30 days of purchase." | Texas `invoice_footer` | 2026-10-13 |
| 4.4 | "Buyers outside the state of Texas may not qualify to receive a title and may only purchase vehicles for parts only." Colorado: out-of-state buyers "will NOT receive a title, and may only purchase these vehicles FOR PARTS ONLY." | Texas `terms`; Colorado terms | 2026-10-13 |
| 4.5 | "In the event of a title issue, money spent to recondition a vehicle will not be reimbursed under any circumstances. Apply for, and receive, a title before you spend additional money. No exceptions." | auction 2902 | 2026-10-13 |
| 4.6 | Dealer sales: "Tax, title, and licensing are charged when picking up for Individuals. Paperwork will be done at the time of pick up." (Power Auto Group). "If you are a retail buyer, you will be responsible for title and transfer fees" (D3 Holdings). | auctions 3144, 3161 | 2026-10-13 |
| 4.7 | "All vehicles are offered 'AS IS, WHERE IS'. There is no warranty, express or implied ... We cannot guarantee the accuracy of the descriptions, written or by pictures ... Vehicles sold may contain deployed airbags that have not been replaced. Vehicles sold may have been subject to government or company recalls". | https://peakautoauctions.com/terms/ | 2026-10-12 |
| 4.8 | Colorado: "Some vehicles are marked 'Rebuilt From Salvage' or other banded titles on the Bills of Sales ... You will sign a document at the time of pick up acknowledging that you are aware of this. Some vehicles are sold as 'Parts Only', and no title will ever be issued." | Colorado terms | 2026-10-13 |
| 4.9 | Colorado: "ownership of the vehicle will not transfer until payment has been received in full into our bank account." | Colorado terms | 2026-10-13 |
| 4.10 | The FTC Used Car Rule's Buyers Guide appears nowhere on Peak's site, terms or auction configs (search of all fetched pages for "Buyers Guide": zero hits). | all fetched pages | 2026-10-13 |
| 4.11 | VTR-265-VSF carries the odometer disclosure, the VSF's statutory lienholder certification, the purchaser's name and address, and the sale price; it is the buyer's title application packet. | https://www.txdmv.gov/sites/default/files/form_files/VTR-265-VSF.pdf | 2026-10-13 |

### Inferences

- (from 4.1 to 4.5, 4.11) The Texas buyer leaves the yard with a bill of sale and a VSF lien foreclosure packet and does the county visit alone, with a 30-day clock and no help from Peak. The risk that the county rejects the packet sits entirely on the buyer; Peak's own storage lot says so in capitals.
- (from 4.6, 4.10) When a dealer sells through Peak, the FTC Buyers Guide obligation still belongs to the dealer (16 CFR 455, cited in `docs/plan/research/texas-rules.md` S29). Peak's configs do not mention it; whether the dealer hangs one at pickup is UNKNOWN.
- (from 4.4) Peak's lane is Texas-licence buyers in practice; Obavia's "launch Texas-licence buyers only" decision (`docs/plan/obavia-auction-decisions.md` §2 row 5) matches the market, with the difference that Obavia says it on the first bid.

### Unknowns

- How often a Texas lot is sold "with title" versus on a lien packet: not found.
- Whether Texas dealers selling through Peak file the 130-U or leave the buyer to it: not found.

## 5. Supply side

### Observations

| # | Observation | Source | Checked |
| --- | --- | --- | --- |
| 5.1 | Of 25 auctions on the Texas portal's first page on 2026-10-13, 22 are Texas towing or storage companies ("responsible for storing and disposing of unauthorized and illegally parked vehicles"), 2 are dealers (Power Auto Group, Fort Worth: "selling dealer overstock, and backlot vehicles"; D3 Holdings, McKinney: "selling surplus dealer vehicles online"), and 3 are charity lots for the International Towing Museum. Lots per auction: 1 to 76 (median about 13). | https://www.peakautoauctionstx.com/auctions (embedded `auctions`) | 2026-10-13 |
| 5.2 | Activity counters on the same page: Pigg Towing (Wichita Falls) 30 lots, 119 bids, 10 bidders, 3,655 views; D3 Holdings 14 lots, 204 bids, 8 bidders, 2,408 views; A-1 Sanddollar (Galveston) 76 lots, 51 bids, 4 bidders; Power Auto Group 25 lots, 1 bid, 1 bidder, 2,028 views, closing in under a day. | same (`counts`) | 2026-10-13 |
| 5.3 | Sell page: "Sell with Peak with or without a title!" "01. Email or Call Us ... 02. Upload Inventory: Upload the VIN or vehicle details along with clear photos ... set a reserve if desired ... 03. Start Your Auction: Peak creates your auction using your preferred start and end dates ... 04. Get Top Dollar: After the auction closes, reports are generated and collections begin ... most auctions finalized and paid out within one week." | https://peakautoauctions.com/sell/ | 2026-10-12 |
| 5.4 | Buyer pool pitched to sellers: "a nationwide network of salvage and recycling yards, green vehicle buyers, independent dealers, industry partners, and retail consumers." | same | 2026-10-12 |
| 5.5 | Seller FAQ headings: "How much time should I allow the winning bidder to pay?", "What happens if the person who won the bid does not pay?", "Can I set a reserve price for my vehicles?", "Can I set a minimum starting bid?", "What is the maximum number of vehicles I can place in an auction?" (answers not rendered server-side). | https://peakautoauctions.com/faqs/ | 2026-10-12 |
| 5.6 | Seller tooling: "Seller Portal: List vehicles with ease, manage inventory, set reserves, and track auction performance"; "VIN Scanner and Decoder"; "Increase photo upload limit on seller section from 5 to 25" (v1.1.0). | App Store listings id6714447533 and id1582857417 | 2026-10-13 |
| 5.7 | Admin API routes include `/api/settings/premiums/`, `/api/settings/bid-increments/`, `/api/settings/taxes/`, `/api/settings/payment-types/`, `/api/statement/`, `/api/invoice/`, `/api/auctions/registrations/{id}/deposits/create`, `/api/lots/stagger/`, `/api/expenses-groups/`. | https://admin.peakautoauctions.com/assets/index-D_Nhd45p.js | 2026-10-13 |
| 5.8 | Blog, Aug 2022 "Trust and Credibility": "As a seller of abandoned and impounded property, retail buyers will always look at each vehicle purchase with a healthy dose of" (truncated on the index). Oct 2022: "Your Locksmith is Your New Best Friend. For those who sell abandoned vehicles to the public". | https://peakautoauctions.com/news-media/ | 2026-10-12 |
| 5.9 | Reviews pitched at sellers: "Are you tired of a crowd descending on your office for in-person auctions and disrupting operations? Are you tired of the paperwork involved with in-person auctions? How about the liability of a ton of strangers walking around your storage..." | https://api.endorsal.io/render/666b65faddbe131113b56db5 | 2026-10-12 |

### Inferences

- (from 5.1, 5.2) Supply is tow yards first; dealers are a new and thin second source (2 of 25 auctions). The dealer auction with 25 lots drew one bidder in eight days; the dealer auction with 14 lots drew eight bidders and 204 bids. Dealer cars sell on Peak when the yard is near a city and the preview is by appointment, not when the cars are "TOW AWAY".
- (from 5.3, 5.7) The dealer pays nothing and gets a consignor statement about a week after close; the buyer premium funds the platform. For a dealer this is a free dump channel with a 13.5% drag on the hammer and no paperwork help.
- (from 5.5, 5.8, 5.9) Peak's seller pitch is relief from the in-person public sale (crowds, liability, paperwork), which is the pain a tow yard has, not the holding-cost pain a dealer has (`docs/plan/research/holding-cost.md`).

### Unknowns

- Reserve mechanics (hidden, disclosed, "No Reserve" badge added in v1.0.4): the badge exists; the rule for unmet reserves is not found.
- What share of lots sell, and the sell-through on dealer lots: not found.

## 6. Marketing

### Observations

| # | Observation | Source | Checked |
| --- | --- | --- | --- |
| 6.1 | Positioning lines: "The Smarter Way to Buy & Sell Vehicles Online"; "The Nation's Premier Marketplace for Unclaimed Vehicles"; "Simple. Secure. Reliable."; "Buy with Confidence. Save with Peak."; "Clear Your Lot. Maximize Your Profits."; "Bid Anywhere, Win Anywhere" (App Store subtitle); "The Largest Unclaimed Vehicle Marketplace" (admin meta description). | https://peakautoauctions.com/, /buy/, /sell/; App Store; admin.peakautoauctions.com | 2026-10-12/13 |
| 6.2 | Buyer hooks: "Free to Browse! No Hidden Fees!"; "Create a free account"; "receive real-time email and/or text notifications when you're outbid". | https://peakautoauctions.com/buy/ | 2026-10-12 |
| 6.3 | Seller hooks: "no seller fees"; "Sellers keep 100% of the hammer price"; "Every customer we've signed on to our program has reported an increase in revenue" (Davison); "We actively market your auction and promote it to our nationwide network of qualified buyers." | LinkedIn; /about-us/; /sell/ | 2026-10-12/13 |
| 6.4 | Channels: one Facebook page per state (51 links in the footer, e.g. facebook.com/peakautoauctionsTX); LinkedIn company page (243 followers; recent posts are the Towing Museum charity auction, "Online bidding is open!"); a per-state domain; ClickCease on the site (click-fraud protection for paid search); Google Site Kit; trade press (Tow Times, Colorado Auctioneers Association posts). | homepage footer; LinkedIn; https://peakautoauctions.com/ source | 2026-10-12/13 |
| 6.5 | Meta Ad Library: HTTP 403 at check time; Facebook state page: "You're Temporarily Blocked". Ad creative not observed. | https://www.facebook.com/ads/library/...; https://www.facebook.com/peakautoauctionsTX | 2026-10-13 |
| 6.6 | Reviews: Endorsal widget shows "123" Google reviews, 5 stars, "100% of customers would recommend Peak Auto"; rating histogram 5: 100%, 4 to 1: 0%. Recent buyer lines: "I have gotten some awesome deals. Customer service is top notch." (17 days ago); "Great auction. Best deals anywhere. Never really had any problems with them but when I do they always help me out." (25 days ago); "Just come for your inspection and bid accordingly." (5 months ago); "have your money ready and you'll be out the door" (8 months ago). Staff named repeatedly: Matt, Alexis, David. | https://endorsal.io/reviews/peak-auto (pages 1 to 5) | 2026-10-13 |
| 6.7 | Complaint lines surfaced by the search index from Endorsal: "the 13% buyers premium is too much, even when paying cash" and "prices seem to go extremely high since covid and online bidding only". Neither string is present on any Endorsal page fetched (grep of pages 1 to 5 and the API render). | WebSearch snippet, 2026-10-12 | UNVERIFIED |
| 6.8 | App review (older Peak Auto Portal, seller app): "Too many issues ... This app serves its purpose. It's not great." Photos cannot be added when first creating a vehicle; uploads fail; moving VINs between auctions loops (ECT Auction, 04/18/2024). | https://apps.apple.com/app/id1071811761 listing via https://apps.apple.com/us/app/peak-auto-auctions/id1582857417 | 2026-10-12 |
| 6.9 | BBB: no profile found for Peak Auto Auctions, LLC. Reddit, Trustpilot, Yelp: no threads found for the company (three searches). | WebSearch | 2026-10-12/13 |
| 6.10 | Related seller Peak Auto Storage, LLC (Dallas): BBB rating F, 25 complaints in three years, 18 customer reviews; complaint detail behind a bot wall. The search index summarised the complaints as storage charges for short or delayed pickups and a missing fee schedule. | https://www.bbb.org/us/tx/dallas/profile/towing-company/peak-auto-storage-llc-0875-90016863 | 2026-10-13 (detail UNVERIFIED) |

### Inferences

- (from 6.1 to 6.4) Peak markets to sellers; buyers are acquired by the tow yard's own notice, by the per-state Facebook page and by search. There is no buyer-side brand promise beyond "free account" and "no hidden fees".
- (from 6.6, 6.7) The review surface is curated: an aggregator that imports five-star Google reviews only. What buyers love, in their words: staff by name, speed at the window, "deals". What they hate is not visible there; the two complaints the index attributes to the same widget could not be re-found and stay UNVERIFIED.
- (from 6.10) The buyer's lasting memory of a Peak purchase is formed at the tow yard, not on the app; the F-rated yard with 25 complaints is one of Peak's Texas sellers. Obavia's equivalent is the dealer's lot, which is why pickup is designed as the sale's completion, not an afterthought.

### Unknowns

- Paid media spend, creative themes, audiences: not observable (6.5).
- Google Maps rating and count for the Denver office with lower stars included: not reachable without a browser.

## 7. Product surfaces

### Observations

| # | Surface | Observation | Source | Checked |
| --- | --- | --- | --- | --- |
| 7.1 | Marketing site | WordPress with Elementor 4.2.0, LeafWP theme, Site Kit by Google 1.187.0, BetterDocs FAQ plugin, EWWW image optimiser, ClickCease; "Website Design by Kris Chislett Design". | https://peakautoauctions.com/ source | 2026-10-12 |
| 7.2 | Buyer portal (per state) | Laravel with Inertia (page JSON in `<script data-page="app">`), Sanctum CSRF, Livewire upload routes, Vite bundle `app-DzT2Iz9a.js` (140 KB), React 19 jsx runtime, Pusher 8.6.0 over `/pusher/auth`, Stripe publishable key `pk_live_51OEmNO...` in page props, images on S3 `peak-enterprise.s3.us-west-2.amazonaws.com`, lot channel `lots.{auctionId}` event `.RefreshLot`. Inter font from rsms.me. | https://www.peakautoauctionstx.com/ and /auctions | 2026-10-13 |
| 7.3 | Admin | React SPA on Horizon UI Tailwind React PRO v1.0.0 (Simmmple), PrimeReact components, ApexCharts, Quill editor, Stripe React, Pusher and socket.io echo connectors, Sentry; API base `https://enterprise.peakautoauctions.com/api/`. Permission strings include `view_auction_approvals`, `view_clients`, `export_auctions`, `configure_live_auctions`, `manage_yeeld_surcharging`. | https://admin.peakautoauctions.com/auth/login and bundle | 2026-10-13 |
| 7.4 | Auction engine | In-house (the admin manages premiums, increments, stagger, deposits, invoices, consignor statements). The previous platform was Auctioneer Software ("powered by auctioneersoftware.com", lots dated July 2023). Illinois still points at HiBid. No Auction Mobility, BidPath, AWG or Edge Pipeline strings found. | https://peakauto.auctioneersoftware.com/...; homepage footer; bundles | 2026-10-13 |
| 7.5 | iOS buyer/seller app | "Peak Auto Auctions", id6714447533, Business, Free, 26.2 MB, iOS 16+, 4.5 stars from 8 ratings, "Data Not Collected"; version 1.1.17 (Sep 22, 2026) "New chatbot feature, photo improvements"; 25 releases since 1.0.1 (01/22/2025); 1.0.3 "Adjustments to lot closing, bid sound, registration flow"; 1.0.4 "Added 'No Reserve'"; 1.0.8 push with deep links; 1.1.0 "New UI". Screenshots: four, uncaptioned. | https://apps.apple.com/us/app/peak-auto-auctions/id6714447533 | 2026-10-13 |
| 7.6 | Android | `com.peak_auto`, "1K+ Downloads", "Updated on Sep 21, 2026", data safety: "Personal info, Photos and videos and 2 others" collected, "No data shared with third parties", deletion on request. | https://play.google.com/store/apps/details?id=com.peak_auto | 2026-10-13 |
| 7.7 | Seller catalogue app | "Peak Auto Portal", iOS id1582857417, 20.1 MB, v1.0.10 (01/19/2025), 4.7 stars from 9 ratings; Android `com.peak.auctions` updated Sep 12, 2026. | https://apps.apple.com/us/app/peak-auto-auctions/id1582857417; Play | 2026-10-12/13 |
| 7.8 | Notifications | Email on win; email and/or text on outbid; push with deep link since 1.0.8; marketing SMS consent in the auction terms; "bid sound" in the app. | section 2.9; App Store | 2026-10-13 |
| 7.9 | Real time | Pusher channel per auction, `RefreshLot` event, presence channels; bid rows carry `max_bid` and `auto` (AUTOBID) flags. | bundles | 2026-10-13 |

### Inferences

- (from 7.2, 7.3, 7.4) Peak rebuilt from a vendor platform (2023) to its own Laravel/React stack (Texas state record created 2025-01-20) with a mobile app from January 2025. It is a 2025 product on a 2018 business.
- (from 7.5) Twenty-five releases in nine months, most labelled "Stability update", and 8 ratings: the app is young and lightly used; the web portal is where buyers are.
- (from 7.2) A live Stripe publishable key in page props is normal; it confirms Stripe as the card processor and Yeeld as the surcharge layer.

### Unknowns

- Whether the mobile app is Expo or Flutter: not determinable from listings (the "expo" hits in the admin bundle are the word "exports").
- Uptime, bid latency, outage history: not found.

## 8. "Better than Peak": the sourced delta

Each row names a Peak weakness that is sourced above, then the Obavia counter that exists in the repo (file) or the one to build (one line). Obavia is pre-launch; no row claims an outcome. Per the growth plan amendment of 2026-10-13, none of this is said on the glass; it feeds pairs the viewer joins.

| # | Peak weakness (source row) | Obavia counter, built | Obavia counter, to build |
| --- | --- | --- | --- |
| 8.1 | 13.5% buyer's premium on every Texas lot, taxed, charged to the card before the hammer is paid (3.1, 3.3, 3.4) | Zero buyer's premium: `auction/src/engine/money.ts` ("There is no buyer's premium, ever"), `docs/plan/obavia-auction-decisions.md` §1 Fee | Seller-side fee table once Obavia's GDN issues (43 TAC 215.85); nothing per car before that |
| 8.2 | $50 card hold per auction; released "within a few business days"; forfeited on no-pay or no-pickup (2.4, 3.5) | $250 captured standing deposit, one per buyer, refunded on a loss from the close event: `auction/worker/src/index.ts` (refund), `auction/worker/src/whop.ts`, decisions §1 Deposit | Resolve the 48 h (`auction/worker/src/auction.ts` PAY_WINDOW_MS) versus 72 h (decisions §1) conflict; owner decision, `docs/plan/research/README.md` S03 |
| 8.3 | Hammer paid in cash or wire at the tow yard; no card above $5,000; card surcharge via Yeeld at an unpublished rate (2.10, 3.6, 3.7) | Balance by ACH, wire or cash at the dealer's counter with the settle date shown; pickup QR turns green on settlement: decisions §2 row 6; `auction/src/screens/won/Pay.tsx` | Form 8300 trigger in the Desk over $10,000 cash (`docs/plan/research/texas-rules.md` S12) |
| 8.4 | Most cars sold on a lien packet, not a title; buyer applies within 30 days alone; "Peak Auto Auctions does not manage paperwork" (4.1 to 4.5) | Title gate before a car can list (in hand / at lender with lead time / repo lock): `desk/src/Auction.tsx` Let It Go; the 130-U, Buyers Guide, bill of sale and title assignment render in the Desk: `desk/src/lib/documents/buyersGuide.ts`, `desk/src/lib/paperwork.ts`; the buyer signs the same bytes in the app: `auction/src/screens/won/SignDocs.tsx` | 130-U filed from the Desk at pickup and the plates ring driven by webDEALER events (`docs/plan/obavia-auction-phases.md` Phase 3) |
| 8.5 | No Buyers Guide anywhere on Peak's surfaces, including dealer sales (4.6, 4.10) | As-is on the FTC Buyers Guide, photographed on the glass before Go and signed in the app: `desk/src/lib/documents/buyersGuide.ts`, decisions §1 Guarantee | Counsel question on the non-waivable title, odometer and VIN lines (`docs/plan/research/README.md` S29) |
| 8.6 | "RUNS: YES" means the engine turned on; "DRIVES: YES" means it moved 1 to 2 feet; no remedy after the car leaves the yard (2.14, 2.15) | "Starts at pickup, or no sale": the buyer scans the VIN and starts the car before the balance is paid; the pass turns green on both: `auction/src/screens/won/Scan.tsx`, `auction/src/screens/won/Pickup.tsx`, decisions §1 Guarantee | Counsel wording for "a condition of completion, not a warranty" (`docs/plan/research/README.md` S05, UNVERIFIED) |
| 8.7 | Two-day pickup window by appointment at a tow yard; late means $22.34 a day or forfeiture "with no recourse" (2.12, 3.8) | Pickup windows from the dealer's hours, one slot picked, the pass as a QR, the dealer's Desk scans it: `auction/src/screens/won/Pickup.tsx`, phases Phase 1 Logistics | After-hours line staffed (phases Phase 4 Ops); roadside partner (decisions §2 row 11) |
| 8.8 | No named after-hours contact; office M-F 8 to 6 MT; a chatbot (2.16) | A named after-hours number on the pickup screen: `auction/src/screens/won/Pickup.tsx` lines 47 to 49 (`car.dealer.afterHours`) | Dealer onboarding collects the after-hours line (phases Phase 2 Onboarding) |
| 8.9 | Seller may be bid up to a confidential reserve by the auctioneer (2.7) | Floor is the only reserve and the lane never bids: `auction/worker/src/auction.ts` (one Durable Object per lot, bids only from signed buyer tokens); decisions §1 "the hammer is the sale" | None |
| 8.10 | Soft close "1-2 minutes ... extended by 1-2 minutes", unspecified (2.6) | Fixed two minutes, one colour, one refill motion, push says "2:00 left": decisions §2 row 8; `auction/src/engine/auction.ts` closeAfterBid | None |
| 8.11 | Out-of-state buyers get parts only, learned in the terms (4.4) | Texas-licence buyers only, said on the first bid; a non-Texas licence turns Plates into Title: decisions §2 row 5; `auction/src/screens/won/Plates.tsx` | Out-of-state packet (Form 14-312, buyer's tag) in Phase 3 |
| 8.12 | Seller tooling is a "clunky" catalogue app; five to 25 photos, no condition grammar (5.6, 6.8) | Show It: twelve silhouettes with three mandatory angles, six condition rows, a defect line, Buyers Guide on the glass: `desk/src/Auction.tsx`, `desk/src/lib/condition.ts` | Dusk-light pulse for a morning reshoot (phases Phase 1 Dealers) |
| 8.13 | Dealer name on the invoice header only after the win; "Hosted By Peak" (1.7, 2.8) | The dealer's legal name and GDN on every lot screen and every Reach post: decisions §2 row 12 | Ad-rule wording for 43 TAC Subchapter F is UNVERIFIED (README S14, counsel) |

What Peak does that Obavia should not pretend away: a seller who pays nothing (the dealer pays Obavia a flat fee after the GDN); forty states (Obavia is Texas); eight years of tow-yard relationships and 150,000 or more cars sold (Obavia has none). Those are not weaknesses to counter; they are the reasons the first ten cars must be real.

## Decisions this forces

1. No change to `docs/plan/obavia-auction-decisions.md`: the Peak facts it cites (13% to 14% premium, $50 deposit, premium taxed) are confirmed here with URLs; the file can now cite this decode instead of memory.
2. The 48 h versus 72 h pay window is still open (8.2); the owner decides and the code or the decisions file is corrected, by the date in `docs/plan/research/README.md` S03.
3. The Texas auctioneer licence check (1.6) is recorded as failed, not as a finding. If any agent wants to say anything about Peak's licensing in public, counsel checks it first.

## Sources

- https://peakautoauctions.com/ (home, FAQ excerpts, footer licences), checked 2026-10-12
- https://peakautoauctions.com/buy/, /sell/, /about-us/, /faqs/, /terms/, /privacy-policy/, /news-media/, /contact-us/, checked 2026-10-12
- https://www.peakautoauctionstx.com/auctions and /register, /login, /terms (Inertia page JSON: auctions 3144, 3161, 2902, 3156, 1623 and 20 others), checked 2026-10-13
- https://peakautoauctionstx.com/auction/3144/power-auto-group-fort-worth-online-auction (config: starting bid, auth amount, removal times), checked 2026-10-13
- https://www.peakautoauctionstx.com/build/assets/app-DzT2Iz9a.js (Pusher, Sanctum, Livewire routes), checked 2026-10-13
- https://admin.peakautoauctions.com/auth/login and /assets/index-D_Nhd45p.js (Horizon UI, API routes, Yeeld, premiums, deposits), checked 2026-10-13
- https://www.peakautoauctionsor.com/terms (identical to the Texas site terms page), checked 2026-10-13
- https://peakauto.auctioneersoftware.com/auctions/6385/lot/2851-cancellation-fee (Colorado terms dated 03.19.2023, 14% premium, $30 storage, $200 liquidated damages, chargeback waiver), checked 2026-10-13
- https://apps.apple.com/us/app/peak-auto-auctions/id6714447533 (buyer app), checked 2026-10-13
- https://apps.apple.com/us/app/peak-auto-auctions/id1582857417 (Peak Auto Portal), checked 2026-10-12
- https://play.google.com/store/apps/details?id=com.peak_auto and ?id=com.peak.auctions, checked 2026-10-13
- https://www.linkedin.com/company/peak-auto-auctions, checked 2026-10-13
- https://endorsal.io/reviews/peak-auto (pages 1 to 5) and https://api.endorsal.io/render/666b65faddbe131113b56db5, checked 2026-10-12/13
- https://www.bbb.org/us/tx/dallas/profile/towing-company/peak-auto-storage-llc-0875-90016863 (summary only; detail bot-walled), checked 2026-10-13
- https://tractorzoom.com/auctioneer/peak-auto-auctions (HTTP 429 at check time; summary via search), 2026-10-12
- https://www.tdlr.texas.gov/LicenseSearch/ (licence 18376 and name Porras: no records), checked 2026-10-13
- https://texas.public.law/statutes/tex._occ._code_section_2303.154, _2303.155, _2303.157, _1802.051; https://texas.public.law/statutes/tex._transp._code_section_683.014, checked 2026-10-13
- https://www.txdmv.gov/sites/default/files/form_files/VTR-265-VSF.pdf (Rev 01/25), checked 2026-10-13
- https://www.easternprogress.com/yeeld-surcharging-for-stripe-brings-cost-recovery-natively-into-stripe-checkout-and-payment-links/article_f659b5af-f5d7-50eb-a05e-019b13b74ff3.html (Yeeld identification), checked 2026-10-13
- Not reachable at check time: https://www.facebook.com/peakautoauctionsTX (temporarily blocked), Meta Ad Library (403), https://hibid.com/texas/auction/459171/... (Cloudflare block), https://www.peakautoauctionsfl.com/terms (500), https://www.appbrain.com/dev/PeakAutoAuctions/ (403)
- Repo files cited: `docs/plan/obavia-auction-decisions.md`, `docs/plan/obavia-auction-phases.md`, `docs/plan/research/README.md`, `docs/plan/research/texas-rules.md`, `docs/plan/research/holding-cost.md`, `docs/plan/growth/obavia-growth-plan.md` (amendment 2026-10-13), `auction/src/engine/money.ts`, `auction/src/engine/auction.ts`, `auction/worker/src/auction.ts`, `auction/worker/src/index.ts`, `auction/worker/src/whop.ts`, `auction/src/screens/won/Pay.tsx`, `Pickup.tsx`, `Scan.tsx`, `SignDocs.tsx`, `Plates.tsx`, `desk/src/Auction.tsx`, `desk/src/lib/documents/buyersGuide.ts`, `desk/src/lib/paperwork.ts`, `desk/src/lib/condition.ts`
