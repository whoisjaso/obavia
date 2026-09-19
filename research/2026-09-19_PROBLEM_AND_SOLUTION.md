# Obavia — Report 1: Problem and Solution
Deep research synthesis, 2026-09-19. Reference data for Claude and Codex planning sessions. Not legal advice.

## 0. How to read this
- Five parallel research passes (consumer pain, peer-to-peer marketplaces, independent-dealer operations, marketing and pricing, legal constraints) plus the prior Pessimist's Case and Solutions Report already in `research/`.
- Every fact is tagged **[V]** verified with a source or **[I]** inferred. Treat [I] as a hypothesis.
- Nothing here is a decision. Decisions live in `docs/decisions/DECISIONS.md`. Section 8 lists the decisions Jason must make now.
- The never-list binds this document: Obavia never holds buyer money, never submits to webDEALER for a fee, never pulls or decides credit, never ties a fee to a lead or a sale, never lets AI assert price, availability, or terms without a registered source.

## 1. Thesis
1. Buyers do not trust the process. Only 17% trust used-car dealers; 21% call the process transparent [V, TrueCar research].
2. Independent dealers are squeezed: used gross per unit down 9.2% to $1,306; average payment $756–$780; subprime 90-day delinquency above 5%, highest since 2020 [V].
3. Every incumbent owns one stage (listing, valuation, lending, DMS) and profits from the gap between stages. Nobody owns continuity: inquiry → conversation → paperwork → signature → delivery → registration → review.
4. Obavia owns continuity, in English and Spanish, with evidence behind every status, and never touches money or credit.
5. The buyer front door is a 4-tap probabilistic estimate ("What can I actually get?") that ends in a verified dealer conversation. The dealer side is a workspace that removes repeated work. Both sides rate the transaction once.

## 2. The market moment (2025–2026)
| Signal | Fact | Why it matters |
|---|---|---|
| Affordability | Avg used payment $756–$780; used loan rates at a 25-year high; sub-$20k segment "vanishing" [V] | Buyers walk in with a number they cannot hit. A probabilistic fit tool meets them before the lot does. |
| Dealer margin | Retail used gross −9.2% YoY to $1,306/unit; days-to-turn 34; auction conversion 57% [V] | Dealers cannot afford wasted leads or rejected paperwork. |
| Subprime | 90+ day delinquency >5% Q3 2025; Tricolor bankruptcy Sept 2025 tightened warehouse lines [V] | BHPH dealers need audit-ready servicing views, not another lender. |
| Texas compliance | HB 718: webDEALER mandatory for all dealer sales since July 1 2025; paper temp tags gone Sept 30 2025; metal plates issued at sale; 130-U filed within 30 days (45 seller-financed) [V] | The deal jacket is now the bottleneck. Apohenia's checker is the wedge. |
| Channels | Meta removed dealer vehicle listing catalogs Jan 30 2023; only paid Automotive Inventory Ads remain; Craigslist charges dealers $5/listing [V] | "Sync to Facebook Marketplace" cannot be an API feature. See 8(c). |
| Trust | FTC sent 97 warning letters to dealer groups March 2026; CARS Rule vacated Jan 2025, DTPA still applies; ~40,000 FTC vehicle fraud complaints in 2024 [V] | Transparency is a product feature and a legal posture, not a slogan. |

## 3. Buyer pains → Obavia answer
Ranked by prevalence and harm. "Status" refers to this repository today.

| # | Pain (who it hits) | Evidence | Obavia answer | Status / guardrail |
|---|---|---|---|---|
| 1 | Fees appear at signing: doc, prep, "market adjustment", forced add-ons (first-time, cash, Spanish-speaking) | ~$640 surprise add-ons avg; one Texas dealer added fees to 75% of contracts [V] | One screen that lists every line before signature, versioned; buyer declines add-ons per line; the estimate already includes Texas 6.25% tax, title/reg, doc fee | Engine built. Deal terms screen: S003. Never promise "no hidden fees" as a platform (claims registry). |
| 2 | Title/registration never arrives; temp-tag chaos | Carvana CT settlement $1.5M, delays "stretching for months" [V]; TX metal-plate transition [V] | Registration tracker with sourced milestones (submitted, returned, plates issued), owner named, next action. Dealer files under own webDEALER. | S005. Obavia never submits. Status only from evidence. |
| 3 | Yo-yo financing / spot delivery reversal (subprime, trade-ins) | NPR cases; CFPB 28,500 vehicle-loan complaints 2025, +56% [V] | Deal states are separate: documentation, funding, delivery, commercial, registration, servicing. "Delivered" never implies "funded". Funding state visible to buyer. | State machine built (`lib/domain/states.ts`). Financed deals via certified partner: LATER. |
| 4 | Listing is not the car: photos, features, "price excludes" | CarGurus 76 BBB complaints/3 yrs; bait-and-switch cases [V] | Evidence-labeled listings: dealer-confirmed price version, updated_at shown, feature checklist confirmed by dealer, mismatch flag from buyer | Claims registry entries planned. Marketplace layer: LATER gate. |
| 5 | Pushy calls after one inquiry; re-explaining to five people | FTC 100k+ ad/pricing complaints [V] | One relationship per buyer per dealer; inquiry carries the buyer's profile forward; buyer controls channel and quiet hours; AI texting only under consent | Inquiry built (in-memory). Consent architecture: LATER gate. |
| 6 | Rate markup undisclosed | CR/DOJ: minority buyers pay $2,662 more over loan life [V] | Obavia shows the estimate basis (APR band by self-reported credit) and never a lender quote; funding terms shown as versioned facts when a partner exists | NL-3: never pull or decide credit. |
| 7 | Discrimination and targeting of immigrants | Houston ring: 27 buyers out ~$229k via Spanish social ads [V] | Spanish is a first-class path; verified dealer identity (GDN lookup); same estimate math for everyone, no protected-class inputs | Constitution #7, #9. Fit score uses only price, down, term, band. |
| 8 | No Spanish materials | 74% of Hispanic adults bilingual; 20%+ of market [V] | EN/ES parity in UI, documents, AI replies | Built in UI. Native review pending. |
| 9 | Temp tag / plate confusion | TX ePLATE transition [V] | Plate status as a tracked milestone with evidence | S005. |
| 10 | Cash buyers charged more | FTC enforcement [V] | Price version is the price; payment method is a separate state | S003. |
| 11 | Trade-in sold before funding | Yo-yo side effect [V] | Trade-in as its own record with state; not released until funding evidence | LATER. |
| 12 | Dealers ignore small budgets | Research pattern [V/I] | The fit tool routes the buyer to what is likely, so the dealer receives a realistic inquiry, not a rejection | Built. |

## 4. Peer-to-peer and classifieds pains → verification ladder
| # | Pain | Evidence |
|---|---|---|
| 1 | Phishing via fake VIN-report and escrow sites | FTC alerts [V] |
| 2 | Fake profiles and cloned listings | BBC 2024; FB scam surge 2025 [V] |
| 3 | No-shows: ~70% on Marketplace pickups | ShowdUp 2026 [V] |
| 4 | Curbstoning: dealers posing as private sellers | CarPro, Mass.gov [V] |
| 5 | Flood cars and title washing: 29,200 Houston flood cars in one season | ABC13 2024; TX AG [V] |
| 6 | Lowballing and ghosting | forums [V] |
| 7 | Odometer rollback (felony in TX) | [V] |
| 8 | TX private sale friction: 130-U in person within 30 days; no temp tags for private sellers; VTN for seller liability | TxDMV [V] |
| 9 | Zero verification on FB/Craigslist/OfferUp/5miles | [V/I] |

Verification ladder (what to verify, when):
- **Signup**: phone (SMS), email. Buyers stay anonymous to dealers until they choose to share.
- **Dealer onboarding**: GDN number validated against the TxDMV lookup (public, daily updated); re-verified quarterly; suspended on expiry; profile shows license type. No self-attested license photos [V].
- **Private seller listing (LATER lane)**: government ID + selfie (Stripe Identity ~$1.50), title photo with VIN match, lien check, history report attached; one active listing per unverified person.
- **At sale**: signature evidence per document; delivery evidence; registration evidence. Never Obavia-held payment.
Benchmarks: PrivateAuto, KeySavvy, Caramel, Autotrader Private Seller Exchange all verify ID at signup and manage payment; Obavia verifies but never manages payment (NL-1).

## 5. Dealer pains → Obavia answer
| # | Pain | Evidence | Obavia answer | Status |
|---|---|---|---|---|
| 1 | Lead spam and low intent; same lead sold to 5 dealers; $450–$5,000/mo Autotrader; ~$2,500/mo CarGurus | DealerRefresh, vendor pages [V] | Inquiries arrive with a realistic profile (band, down, monthly, fit) and one relationship per buyer per vehicle; no per-lead fee ever | Built (inquiry). NL-4. |
| 2 | One person is sales, docs, mechanic, buyer, collector | NIADA/TIADA, forums [V] | "Today" mode: only what needs a human today; everything else moves on its own | Built (in-memory). |
| 3 | webDEALER / 130-U rejections and re-submit loops; 30-day clock | HB 718, dealer education [V] | Apohenia pre-submission checker: NO KNOWN BLOCKER / REVIEW REQUIRED / BLOCKING ISSUE; dealer submits under own credentials | Stage 0; core forked as package (ADR-0005). |
| 4 | Manual texting, after-hours, robotic AI tools ($99–$899/mo Podium etc.) | [V] | Drafts in the dealer's own voice (tone profile from their past messages), sends only under consent and quiet hours, refuses to state price/availability/terms without a source, stops when told | LATER gate: consent + evals. |
| 5 | Software contracts, per-user fees, clunky UI, no Spanish | Capterra/G2 [V/I] | Flat per-location, cancel any time after founding term, mobile-first, EN/ES | ADR-0003 (proposed). |
| 6 | Fake Google reviews; slow removal; no way to note a bad buyer | Google removed 292M reviews 2025 [V] | Verified transactional reviews (one per author per transaction, append-only corrections); private operational feedback on buyers (see 8a) | S006. |
| 7 | Subprime tightening; BHPH collections and OCCC exposure | [V] | Servicing views: cadence, disclosures, audit log; Obavia is never the holder | LATER; OCCC review gate. |
| 8 | Marketplace/TikTok posting labor with no attribution | [V] | Post-assist: formatted listing text, photos, and a deep link per platform; inquiry attribution by link | See 8(c). |
| 9 | Title turnaround creates cash-flow lag | [V] | Registration case with dates and owner; buyer sees the same status | S005. |
| 10 | Margin compression | [V] | Fewer wasted hours per deal is the only margin Obavia can give; never pricing advice (anti-brokering) | Positioning. |
| 11 | Inventory sourcing | [V] | Out of scope v1 | Parked. |
| 12 | Days-to-turn | [V] | Out of scope v1 (no pricing tools; anti-brokering) | Parked. |

## 6. Competitor teardown
| Platform | Owns | Fails at | Obavia wedge |
|---|---|---|---|
| CarGurus | Deal rating (IMV), traffic; ~$2,600/mo avg per dealer | Listing accuracy, lead spam, dealer cost, no post-inquiry continuity | Free marketplace tier; inquiry carries fit profile; continuity after contact |
| Autotrader / KBB | Reach, valuation | $450–$5k/mo; same lead resold; no paperwork | Same |
| Cars.com | Reach, payment badges | Same as above | Same |
| Carfax | History reports, listings | Report phishing clones; no transaction layer | Attach reports as evidence in the deal, never resell |
| CarMax / Carvana | No-haggle retail, delivery | Title delays (Carvana CT $1.5M), registration failures, can't serve independents | Registration accountability with evidence; independents' retail layer |
| Capital One Auto Navigator | Pre-qualification, calculators | Requires SSN/income; lender-owned; franchise-heavy | Estimate without identity; dealer-neutral; NL-3 keeps Obavia out of lending |
| Facebook Marketplace / Craigslist / OfferUp / 5miles | Free reach | 70% no-shows, scams, no verification, dealer catalog removed 2023 | Verified identity ladder; showing-up as a tracked commitment; post-assist not scraping |
| DealerCenter / Frazer ($55–$300/mo) | DMS of record, BHPH | Desktop era, contracts, no buyer side, no Spanish | Overlay, not replacement; buyer-facing continuity they cannot build |
| Podium / Kenect / Impel / Numa | Texting and AI | Robotic tone, $249–$899/mo, no deal context | Voice-matched drafts grounded in the deal record; claims registry |

## 7. The Obavia system
### 7.1 Buyer journey (free, always)
1. **Fit** (built): 4 taps → probability ring, payment range, what likely fits. No identity. Haptics, color, minimal words.
2. **Talk to a dealer** (built, in-memory): name + contact → one inquiry to one verified dealer per vehicle. Dealer sees profile and fit.
3. **Conversation** (S002 NEXT): threaded, EN/ES, buyer controls channel; AI drafts for the dealer only under consent.
4. **Appointment**: a commitment both sides can see; no-show tracked as a fact, never published as a score.
5. **Deal** (S002/S003): six independent states; versioned terms; every fee on one screen before signature.
6. **Signatures** (S003): electronic where UETA allows, printed where a form requires; evidence per document.
7. **Delivery** (S004): evidence-based; buyer document vault; "My Garage" record of what was bought from whom.
8. **Registration** (S005): milestones with sources; buyer sees the same status the dealer sees.
9. **Review** (S006): one per transaction, after delivery, append-only corrections with history.

### 7.2 Dealer workspace (paid after founding term)
- **Today**: what needs a human. New inquiries first, then checks needing review, invites pending, registration not started.
- **Inventory**: listings with evidence labels; post-assist to external channels; one inquiry thread per buyer per vehicle (no duplicate applications for the same car; the profile links to the vehicle once).
- **Inquiries and relationships**: verified contact, invite tokens, explicit permission before a dealer sees buyer documents.
- **Deal workspace**: packet, Apohenia check, terms versions, signatures, delivery, registration, audit log.
- **AI follow-up**: dealer-voice drafts; sends only under 10DLC-registered consent, SB 140 hours (Mon–Sat 9–21, Sun 12–21 CT), AI disclosure in the message, STOP handling, claims registry validation, refuse-and-defer on anything about price, availability, terms, credit.
- **Mini CRM**: customer profiles linked to purchased vehicles; BHPH servicing views (cadence, disclosures) with Obavia never as holder; ratings after the transaction.
- **Reputation**: metrics with sources (median response time, status accuracy, registration completion days) plus verified reviews. No editorial ranking.

### 7.3 Private seller lane (LATER, separate)
Verified ID, title match, lien check, structured listing, buyer messaging, sold tracking, one review each way. Texas private sale still needs the 130-U at the county; Obavia guides, never files.

### 7.4 Object model (already in `docs/architecture/DOMAIN.md`; summary)
Org (dealer, GDN) · Person (buyer) · Listing (price versions, evidence) · Inquiry (profile snapshot, fit) · Relationship (permissions, invite, contact verification) · Deal (documentation / funding / delivery / commercial / registration / servicing states) · DocumentVersion + SignatureEvidence · DeliveryEvent · RegistrationCase · Review (one per author per transaction) · AuditEvent. Rule: inquiry ≠ reservation; sale completed never hides unfinished obligations.

## 8. Decisions Jason must make now
### 8(a) Dealers rating buyers, including payment default
- Constitution #10 and the 2026-09-17 INBOX entry reject public buyer financial reputation. Jason's 2026-09-19 direction re-opens it.
- Law [V]: sharing payment-default information across dealers makes Obavia a consumer reporting agency under FCRA (accuracy, disputes, permissible purpose, adverse-action duties), adds ECOA exposure, and defamation exposure for any false entry. Uber/Airbnb ratings survive because they are operational and not credit-related [I].
- **Recommended design**: two-sided, one-time, operational feedback tied to a verified transaction: showed up, responsive, documents on time, respectful. Visible to the dealer who transacted and, in aggregate, to dealers a buyer later chooses to contact (buyer consent at inquiry). Never a payment or default field. Never a public score. BHPH delinquency stays inside the dealer's own servicing view.
- Decision needed: adopt this design (amend constitution #10 wording) or keep the ban.

### 8(b) Lifetime founder price
- ADR-0003 (proposed) rejects a lifetime lock; allows a founding term of at most 24 months.
- Data [V]: customers acquired at 30%+ discount churn 4.2x faster; lifetime deals fail on support and API cost escalation.
- **Recommended**: founding cohort capped (first 25–50 Texas dealers), $99/location/month for 24 months, then standard; the founding badge is permanent, the price is not. Decision needed: record ADR-0003.

### 8(c) Facebook Marketplace sync
- Meta removed dealer vehicle catalogs from Marketplace on Jan 30 2023 [V]. There is no supported API for dealer listings; third-party "auto posters" ($99–$799/mo) automate a personal account and violate Meta terms.
- **Recommended**: post-assist (copy-ready listing, photo set, tracked deep link) plus paid Automotive Inventory Ads feed when the dealer wants spend. Never scrape or automate a personal account. Decision needed: accept post-assist scope.

### 8(d) Private seller lane timing
Roadmap says LATER behind verification and title workflow. Research confirms the fraud surface. Recommended: keep LATER; ship dealer lane first.

### 8(e) App vs web
Constitution #8: mobile-first web, no install to finish a transaction. Research: PWA first, Capacitor wrapper when there is an active-deal install reason. Recommended: keep. Add "Add to Home Screen" prompt after the first inquiry.

### 8(f) Pricing
See Report 2 §7. Recommended: buyer $0 · dealer marketplace $0 · workspace $199/location/month (founding $99 × 24 months) · metered pass-through (SMS, identity, e-sign, reports) · Apohenia per packet. Never per lead, never per sale.

## 9. Legal map (compact)
| Feature | Rule | Safe pattern |
|---|---|---|
| Fit estimate | ECOA/Reg B, UDAP, DTPA, OCCC ad rules | "Estimate", never "approved/prequalified"; inputs only price, down, term, self-reported band; reasons shown; no protected-class inputs; no lock on the estimate |
| AI texting | TCPA, A2P 10DLC, TX SB 140 (Sept 2025), TRAIGA (Jan 2026), FTC §5 | Written opt-in per campaign; transactional vs promotional campaigns; AI disclosure; quiet hours by recipient; STOP; human commits terms |
| Reviews | Consumer Review Fairness Act; FTC fake-review rule Oct 2024 ($51,744/violation); DTPA | Verified transaction only; one record; corrections appended with history; no incentives; dealer response window |
| Buyer feedback by dealers | FCRA, ECOA, defamation | Operational only; consented visibility; no financial fields |
| E-sign | TX UETA §322.007; 130-U; OCCC RIC rules | E-sign with audit trail for dealer documents; 130-U per county acceptance; wet-signature fallback tracked as "printed" |
| Data | GLBA Safeguards, TDPSA, TX breach law (30 days to AG at 250+) | Encryption, RBAC, audit log, minimal sharing, deletion rights, breach plan |
| Registration tracker | Transp. Code §501.0234 (30/45 days), defamation | Publish facts with source and context; dealer response window; no intent inferred |
| Dealer identity | Transp. Code ch. 503; TxDMV GDN lookup | Validate GDN at onboarding, re-verify quarterly, suspend on lapse |
| Money | Fin. Code ch. 152 | Never custody; if payments ever appear, dealer is merchant of record via a licensed processor |
| Brokering | Occ. Code §2301.006 | Flat subscription; never per sale; never price advice |

## 10. What exists today and the build order
**In this repo (branch kit/build-os, PR #2)**: Next.js 16 app; buyer 4-tap flow with fit score, alternatives, dealer hand-off; `/api/fit` structured engine; `/api/chat` Claude narration path (unused by UI); in-memory store with server-enforced authorization; dealer Today, workspaces, deal workspace (packet, check, invite, delivery, registration, audit), customer accept, buyer status; EN/ES; Vitest 28, Playwright 3; claims lint. No persistence, no real auth, no storage, no Apohenia core yet, no SMS.

**Day-one build order (each a slice with tests; one active at a time)**
1. Supabase project + schema for the object model; RLS; auth (phone/email OTP); migrate the in-memory store. Gate: inquiries persist.
2. Dealer onboarding with GDN validation; dealer profile; listings with price versions and evidence labels.
3. Inquiry → relationship → conversation (EN/ES), buyer-controlled channel, appointment commitment.
4. Deal workspace on persistence; Apohenia core as package; terms screen with every line; e-sign (BoldSign/Documenso) with printed fallback.
5. Delivery evidence, buyer vault, My Garage.
6. Registration case with milestones and buyer-visible status.
7. Reviews (one per transaction) + operational two-sided feedback (per 8a decision).
8. AI follow-up drafts under consent (10DLC, SB 140, disclosure, claims registry, evals).
9. Marketplace layer public pages + SEO fit pages; post-assist for external channels; AIA feed.
10. BHPH servicing views; private seller lane; app wrapper.

**Handoff protocol between Claude and Codex**: Claude owns spec, decisions, guardrails, reviews. Codex owns implementation inside an approved slice against frozen interfaces. Every slice ships with: SPEC (acceptance criteria, non-goals, permissions, UX states, failure modes), PLAN, tests, evidence, review packet. Nothing outside the slice without an INBOX entry.

## 11. Adversarial review prompt (paste into Claude or ChatGPT)
"You are reviewing a two-sided Texas used-car transaction platform. Attack the following in order: (1) any place the product could be read as brokering, a title service, a lender, a consumer reporting agency, or a money transmitter; (2) any user-facing sentence that implies approval, prequalification, verification, or 'no hidden fees'; (3) any AI message that could commit the dealer to price, availability, or terms; (4) cold-start: how do the first 25 Houston dealers and first 500 buyers find each other without paid CAC; (5) the fit score: where could it mislead or discriminate; (6) unit economics at $199/location with SMS, identity, and e-sign pass-through; (7) what an incumbent (CarGurus, DealerCenter, Cox) would ship in 90 days to neutralize this. For each, name the failure, the evidence, and the smallest change that removes it."
