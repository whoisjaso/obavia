# 03. The adversary, and the person who has to stop them

Angle: every way a dealer, a buyer, a stranger or our own infrastructure cheats the auction, and what the trust-and-safety lead does about it. Fictional people throughout. Texas rules as in the blueprint §4. Figures I am not sure of are flagged and repeated at the end.

Standing note: the blueprint has fourteen screens and none for anything going wrong. Fraud is the median Tuesday at a public car auction. Each story ends with: detect, what the app shows, the rule, what counsel writes.

---

## 1. Shill bidding: Ramón's cousin's phone

Ramón Delgado (fictional, independent dealer, Pasadena TX) lists a 2015 Altima, floor $3,200. Day 5, high bid $3,650 from Keisha, a real buyer. Ramón hands his cousin Tony a phone; Tony makes an account with his own Apple ID and bids $3,900 with his own $50 hold. Keisha goes to $4,000. Tony stops: $350 made from a cousin and a hold. If Keisha had stopped, Tony "wins", the Desk sale is cancelled as "buyer did not complete", the car relists.

Detect: device, IP and card all differ, so account matching fails. What does not fail: Tony's whole bid history is Ramón's cars; his bids land within 90 seconds of Keisha's; he never finishes ID/Sign/Plates; Ramón's "winner did not complete" rate is 3x the platform. The graph signal is bidders who bid one dealer, never win, or win and never sign.

App shows: nothing to buyers live (never accuse mid-auction). To Ramón's Desk after two flagged lots: "Bidding on your cars from accounts that never complete. Next time the lot is pulled."

Rule: a winner who does not complete in 72 hours is a cancelled sale; the car cannot relist for 14 days; the underbidder gets a second-chance offer at her last bid (Bring a Trailer's practice). That deletes the shill's payoff: Keisha gets the car at $3,650 anyway. Three non-completing winners on one dealer in 60 days suspends the dealer.

Counsel: terms forbid bidding on your own consigned car directly or through anyone, named as a deceptive act (DTPA §17.46(b); subsection to confirm) and a ground for forfeiting payout; Obavia's right to cancel and run the second-chance offer; under Structure A the dealer is the party Keisha sues.

## 2. The serial winner: Dante wins five, pays for none

Dante bids on five lots in a week with a $50 hold each ($250 exposure), wins all five at $19,400 combined, and ghosts. Five dealers hold five cars 72 hours past close, five underbidders have moved on. That is the Peak hole: $50 is a ticket, not a bond.

Detect: concurrency, before the fact. A new account that is high bidder on more than two lots without one completed purchase.

App shows: on the third simultaneous high bid the sheet asks for a bigger hold ("$500 to bid on a third car at once") before the drag registers. A number, not a lecture.

Rule: the hold scales (see Q4), per lot; a first-time account may lead at most two lots; an unpaid win forfeits the whole hold, split dealer/Obavia; account closed; Stripe fingerprint, device and ID number banned (ID is scanned before bidding, change 1).

Counsel: the forfeited hold as liquidated damages (a reasonable pre-estimate, not a penalty); under A the dealer's remedy against a non-payer is the dealer's; whether we may hold money for the dealer at all (Q1).

## 3. Stolen cards and chargebacks

(a) Deposit on a stolen card typed into a form. Apple Pay mostly kills this: tokenised, device-bound, liability shift. The plain card form is the hole: Stripe Radar plus 3DS, and a plain-card account leads one lot at a time. (b) The one that hurts: "Marcus" wins a 2017 F-150 at $9,800, pays by card in the app, collects Saturday, disputes Monday as "not received". The 130-U is filed, the truck is in Oklahoma, the bank sides with the cardholder for 60 days.

Detect: don't detect; don't allow a card past the deposit.

App shows: after the win, Apple Pay covers the deposit; the balance is ACH push, wire, or cash/cashier's check at the dealer's counter. The pickup QR turns green when Stripe marks the ACH settled or the dealer marks funds received, not when the buyer taps Pay.

Rule: no 130-U and no pickup until settlement (ACH 3 to 5 business days; the app shows the date). The Desk's "funding = paid in full" state is set by settlement only.

Counsel: title transfer and release conditional on cleared funds; bill-of-sale date versus pickup date; who eats a deposit chargeback under A (Obavia must not be merchant of record for the hammer).

## 4. The Harvey car with a washed title

A 2016 Camry, flooded 2017, salvage-titled in Texas, retitled through a lax state, back on Ramón's lot with a clean-looking title (he may not know). Listed as-is, no brand. Priya wins at $7,900 and finds silt under the carpet in June.

Detect: at "Go", run the VIN through NMVTIS (approved provider, a few dollars) and the TxDMV title check; any salvage, flood, junk or rebuilt record anywhere in the chain blocks listing until answered. The Desk already has `titleStatus`, the rebuilt disclosure (ENF-MV-RBLT DSCLMR) and `requiredDocumentTypes` for salvage; the auction calls the same gate.

App shows: dealer: "This VIN has a 2017 flood record in [state]. The listing will show it." Buyer: a "Flood history" chip beside the price, and the floor/retail bars use branded-title retail, or the gap is a lie.

Rule: brands print on the listing, Buyers Guide and bill of sale; no listing with unknown title status; title and odometer arbitration are non-waivable even as-is (NAAA keeps them under red light).

Counsel: the dealer's brand-disclosure duties under Transp. Code ch. 501; whether a platform that ran and displayed a clean check has exposure when history surfaces later; the terms must say as-is never covers title fraud.

## 5. The odometer rollback

A 2014 Tahoe, cluster swapped, reads 118,000; NMVTIS and the last Texas inspection say 196,000. The lot boy photographs the odometer per the silhouette guide; the listing shows what the cluster shows.

Detect: compare the odometer reading (OCR, confirmed by the dealer typing it) with every prior recorded reading; a lower number is a hard block. The Desk records mileage once and reads it into every document; the auction must compare, not just record.

App shows: "The odometer reads 118,000. The 2025 inspection recorded 196,000. Mark 'Not actual mileage' or fix the number." The 130-U odometer brand follows that answer, not a dropdown.

Rule: discrepancy blocks listing and is an arbitration ground without time limit against the dealer. Federal odometer law (49 U.S.C. §32705 disclosure; §32710 treble damages or $10,000, to verify) makes this the dealer's most expensive mistake, and under A it is his.

Counsel: whether the in-app 130-U signature satisfies federal secure odometer disclosure now that Texas transfers run through webDEALER.

## 6. The wrong car in the photos

Ramón has two silver 2016 Fusions; the nice one sold yesterday; the listing goes up with its photos and the rough one's VIN. Or the photos came off Marketplace.

Detect: the VIN-plate photo is mandatory, OCR'd, and must match the typed VIN and title record; vPIC decode (`lib/vin.ts`) checks body and engine; walkaround video is shot in-app only, timestamped, geotagged to the licensed lot; the odometer shot includes the dash VIN sticker.

App shows: at pickup the buyer scans the VIN plate; the QR turns green only on a match. That one screen ends every "different car" story, including honest mix-ups.

Rule: in-app capture only; VIN mismatch at pickup is an automatic cancel, full refund, and the dealer pays the buyer the deposit amount as compensation.

Counsel: misdescription remedy; extend the Desk's "Your Listings Must Be True" consent (`lib/consent.ts`) to auctions with an indemnity.

## 7. The part-swapper who arbitrates

Only exists if we offer "starts and drives". Tyler wins a 2012 Silverado at $6,200 with a 48-hour guarantee, swaps in his own dead alternator, claims it won't start. Or drives 600 miles and blames the transmission.

Detect: pickup takes a second condition snapshot from the buyer's phone: engine bay, odometer, VIN, 10 seconds of engine audio, with the Buyers Guide signature at the same moment. `condition.ts` already computes "N days and N miles after the sale" and "known at sale"; the claim screen uses it.

App shows: the claim form asks for an odometer photo first; past 100 miles the guarantee has expired by its own terms, and the screen says so before Tyler types a story.

Rule (if it exists): 48 hours or 100 miles; return to the dealer's lot; remedy is unwind, never cash; it is the dealer's guarantee, priced into his floor; Obavia administers.

Counsel: a written guarantee fills the Buyers Guide "Dealer Warranty" box and takes the sale out of as-is under the FTC rule; it must be the dealer's warranty or Obavia is a warrantor.

## 8. The unlicensed "dealer"

Curtis has sold nine cars from his driveway in Spring this year. He signs up as "Curtis Motors" and types a plausible GDN. Under §503.021 every sale is a non-GDN sale with Obavia's name on it: the "fly-by-night public auction" the 2005 bill history names.

Detect: the Desk already onboards from the TxDMV active dealer list (`lib/dealers.ts`) and verifies by the licence's contact on file (`api.ts startVerify`). The auction refuses any seller not matched and verified; re-check monthly (licences lapse, bonds cancel); the walkaround geotag must be the licensed premises.

App shows: no GDN field. Pick your dealership from the state list; we text the number the state has.

Rule: GDN verified or no listing; a licence that drops off the list pauses every live lot and releases holds.

Counsel: whether an online consignment by a GDN dealer counts as his "location" (§503.021/.027, already listed); whether checking creates a duty.

## 9. The cloned listing on Marketplace

Reach posts the lot as "Auction ends Friday". A scammer lifts the twelve photos, lists the Altima at $2,100 "need gone today", collects $500 by Zelle from three people. Maricela texts Ramón at 9:14 pm: "I sent Marcus the $500 like you said, when can I pick up?"

Detect: we cannot see Marketplace. Watermark photos with the mark and lot code; keep the price in the app, not the post; every post says "The only place to bid is the Obavia app. Nobody will ever ask you for a deposit outside Apple Pay." Weekly reverse-image sweep; a "Report a copy" item on the car page.

Rule: not our fraud, but our reputation; reply inside an hour, file with Meta, tell Maricela plainly she was scammed and we never took her money.

Counsel: a one-paragraph public safety notice.

## 10. The buyer under 18

Jaden, 17, has a family Apple Pay card, bids, wins a $2,900 Civic. The blueprint scans ID after the win. A minor's contract is voidable at his election; the dealer has held the car four days and the underbidder is gone.

Detect: scan the licence before the first bid, read the DOB, refuse under 18. Apple Pay proves a card, not an age.

App shows: first bid: "Scan your licence" (the Desk's scanner, same field limits), then Apple Pay. Two screens, once.

Rule: 18+, verified from an ID, before any bid. It also makes Tony (§1) use his own licence.

Counsel: age, capacity and one-ID-one-account in the terms.

## 11. The Louisiana bidder on a Texas car

Priya in Lake Charles wins. "Plates mailed to you" assumes a Texas 130-U. A Texas dealer selling to a non-resident who will title elsewhere does not collect Texas motor vehicle sales tax if the buyer signs the out-of-state exemption (Comptroller Form 14-312, to verify); he cannot file a Louisiana title in webDEALER; Priya gets a signed title and a temporary tag and visits the OMV herself. Nobody tells her, so at 9 pm: "where are my plates".

Detect: `idIssuer` and the address state, already fields.

App shows: if the ID state is not TX, the tiles become ID, Sign, "Title to you": "Plates come from Louisiana. You get the signed title and a temporary tag." Tax line off, exemption form in the packet.

Rule: launch Texas-resident buyers only, or build the out-of-state packet first. It is a different packet, not a toggle.

Counsel: the 14-312 flow, the temporary tag, any filing duty on the dealer; Louisiana use tax is Priya's and the app must say so.

## 12. The dealer sells it on the lot mid-auction

Thursday walk-in offers $4,100 cash for the Altima; the lot sits at $3,650 with a day to go. Ramón takes the cash. Keisha wins Friday and drives to an empty space.

Detect: the Desk is the same system. Opening Handle A Sale on a VIN with a live lot blocks the screen ("This car is in an auction that ends Friday. Pull the lot first: $X"); a 130-U filed on that VIN anywhere ends the lot instantly. Off-Desk sales are caught at pickup, late.

App shows: dealer: "Pull it", fee shown before the tap. Buyer: "The dealer withdrew this car. Your hold is released and you have $100 credit on your next win."

Rule: once a bid is at or above floor the car is committed; withdrawal costs the dealer a fee on Manheim's scale ($100 to $500) paid to the winner; two in 90 days suspends him. Below floor withdrawal is free, since he never committed.

Counsel: the no-sale-elsewhere consignment term and liquidated damages for withdrawal.

## 13. Push outage at soft close

APNs degrades for forty minutes on a Friday. Doctrine says outbid is silence. Keisha is outbid at 7:58, hears nothing, the lot closes at 8:02, she texts at 9: "I was never told." She is right.

Detect: APNs delivery receipts plus a canary on our own devices; over 5% failure in five minutes is an incident.

App shows: with the app open, the lot streams from the Durable Object over a WebSocket; the ring and price are truth whether or not APNs works. In the last ten minutes of a watched lot the state shows inline ("not yours"), so silence is a push doctrine, never an in-app one. Afterwards, honestly: "Our notifications were late Friday 7:50 to 8:30. The result stands."

Rule: a result is never reopened for notification failure; the in-app clock is the record.

Counsel: notifications are best-effort, in the terms; an incident disclosure line.

## 14. Durable Object "split-brain" on the last bid

Two bids land at 8:01:59.8 from Dallas and Houston edges. A DO is single-instance and single-threaded, so true split-brain is what it prevents; the real failures are a client retry after a timeout counted twice, eviction between accepting and persisting a bid, a close alarm firing off a stale clock, and D1 history lagging the DO so the "audit" disagrees with the truth.

Detect: every bid carries a client idempotency key; the DO writes bid and new close time in one storage transaction before replying; close is an alarm plus a read-time check so a late alarm cannot reopen; the audit log is DO storage, D1 a copy, compared nightly, paged on any difference.

App shows: a bid is placed on the DO's ack; the thump fires on the ack, not the tap (tens of milliseconds; the doctrine survives). An ack of "closed" rolls the price back in silence.

Rule: the DO sequence number is the record; disputes are answered from it with timestamps to either party.

Counsel: the server record is conclusive absent manifest error.

---

## The four questions, from the risk seat

**1. A then B, or straight to B?** A to launch. Under A the dealer is seller of record, so odometer, title, misdescription and as-is exposure sit where the facts and the GDN are. Under B we own them with no inspector and no lot. A only protects us if we really verify the GDN (§8), charge a software fee, and are careful with money: holding buyer deposits and routing hammer funds as a non-GDN, non-escrow entity is where A leaks (Texas Money Services Act, see facts). Stripe Connect with the dealer as connected account and merchant of record for the hammer; the deposit hold on the dealer's account too unless counsel is comfortable otherwise. Go to B when dispute volume justifies an inspector and a bond.

**2. Single-digit premium or dealer fee?** Under A, a flat dealer fee (per listing or subscription), zero premium. A premium collected by Obavia is the brokering question at its sharpest and tempts hammer under-reporting. The fraud cost of a dealer fee is the "sold it locally" dodge (§12), which the withdrawal fee covers. Under B a single-digit premium funds the dispute desk.

**3. As-is only, or 48-hour starts-and-drives?** As-is at launch, with title and odometer arbitration non-waivable (the NAAA red-light shape public buyers already know from Peak and Copart). The guarantee invites §7 with no inspector and makes the dealer a warrantor on the Buyers Guide. A dealer who wants one ticks the warranty box on his own Guide and prices it into his floor; Obavia administers the 48 h/100 mi return, nothing more.

**4. Deposit; refundable on a loss?** This is the one lever against §1, §2 and §3 together. Peak's $50 is a ticket. Copart's public rule (10% of the maximum bid or $400, whichever is greater, for non-Premier members; to verify) is the right shape; Bring a Trailer authorises the buyer's fee on a card and charges it at win. Proposal: a hold, not a charge, of 10% of the current bid, $250 minimum, $1,000 cap, authorised on Apple Pay at first bid and re-authorised as the bid climbs; released automatically on a loss, and said so ("Your $250 hold is released"); captured at win and credited against the hammer; forfeited whole on non-payment at 72 hours, 70% to the dealer, 30% to Obavia for the relist. Nobody publishes a non-payment rate for online public auctions that I would cite; eBay Motors and Copart both built relist fees because the number was material. Measure ours in the pilot; it decides whether the minimum goes to $500.

## Three changes I would fight for

1. **ID and DOB scan before the first bid, not after the win.** Closes the minor (§10), raises the price of shill accounts (§1), makes bans stick (§2). Two screens, once; the "no register screens" doctrine survives.
2. **"Outbid is silence" cannot be the in-app rule.** Keep it for push. In the app the lot streams from the Durable Object, the last ten minutes show inline, and the bid thump fires on the server ack. Otherwise §13 and §14 are weekly refund fights.
3. **VIN-locked listing and pickup, and no cards past the deposit.** In-app capture only; VIN-plate OCR must match; NMVTIS and odometer history gate "Go"; the buyer scans the VIN before the QR turns green; the hammer is ACH/wire/counter and the 130-U is filed on settlement. That bundle covers §3 to §6 and §12.

## Three facts I am not sure of

1. **Money handling under A.** Whether Obavia holding deposits or routing hammer funds as a non-GDN entity triggers the Texas Money Services Act or reads as brokering under Occ. Code §2301.006 and Dealer Manual §4.34. Stripe Connect with the dealer as merchant of record is an assumption.
2. **Competitor figures.** Copart's deposit (10%/$400 minimum), Bring a Trailer's and Cars & Bids' 5% fee caps, Manheim's $100 to $500 unfulfilled-sale fee, and the federal odometer penalty are from memory and the blueprint; confirm before a term sheet or an ad quotes them. No reliable non-payment rate exists that I would cite.
3. **Out-of-state buyers.** Form 14-312, the temporary tag, and whether the in-app odometer signature satisfies federal secure-disclosure rules under webDEALER. If any is wrong, launch Texas-resident-only and say so on the ID screen.
