# Research register status

Researcher-architect, 2026-10-12. This file maps every row of the source register in `docs/plan/growth/content.md` §4 to the research file that answers it. It also gives each row's status after today's checks. It stands in for the register's "Status" column, so `content.md` itself is unchanged. Each research file has the question, a one-paragraph answer, an evidence table (claim, URL, date checked, quote) and the decisions it forces.

Files: `buyer-urgency.md`, `holding-cost.md`, `texas-rules.md`, `wholesale-band.md`, `whop.md`, `push-and-sms.md`. Registered 2026-10-13 (mirror): `public-auction-model.md` (this folder, read 2026-10-12 and 2026-10-13) and `../peak-decoded.md` (`docs/plan/peak-decoded.md`, checked 2026-10-12 and 2026-10-13).

| Row | Claim (short) | Register status before | Research file | Status 2026-10-12 |
| --- | --- | --- | --- | --- |
| S01 | §215.85: GDN for any fee on arranging a used sale | House doc; re-check before Nov 13 | `texas-rules.md` (S01 rows) | **Re-checked.** Text matches decisions §0. Last amended eff. 6/1/2024. Full (a) adds "including by consignment". Re-check again the week of Nov 9. |
| S02 | $250 held 1:1 in Whop balance | House doc | `whop.md` | **Qualified.** A $250 capture nets $242.95. 1:1 holds only if Obavia tops up $7.05 per deposit and reports Whop reserve holds. |
| S03 | Pay deadline 48 h | Conflict 48 vs 72 | none (owner decision) | Not a research question. The owner resolves it. |
| S04 | Forfeit to the dealer on no-pay | House doc | `whop.md` (transfers) | Mechanism sourced: Whop transfer, instant, Obavia merchant of record. The split is the owner's call. |
| S05 | Starts at pickup, or no sale | Legal wording UNVERIFIED | none | **UNVERIFIED.** Counsel question 4. Not researchable from public sources. |
| S06 | Deposit refunded if you lose | Conflict on timing | `whop.md` | Refund mechanics sourced (no refund fee, fee not returned, 3–7 business days to the card). **The refund age limit is UNVERIFIED**, so prove it in the sandbox. The timing conflict stays with the owner. |
| S07 | 6.25% Texas motor vehicle sales tax | Citation UNVERIFIED | `texas-rules.md` (S07) | **Sourced.** Tax Code §152.021(b): "6-1/4 percent of the total consideration." |
| S08 | Retail bar, sourced | UNVERIFIED (no provider) | `wholesale-band.md` (noted) | **UNVERIFIED.** No provider chosen. Not researched as a vendor choice today. |
| S09 | Holding cost per day | UNVERIFIED | `holding-cost.md` | **Sourced as a formula.** $35 is not defensible. Use 0.1% of value per day (AFC 18.1% all-in plus Manheim −1.3%/month). Insurance and space UNVERIFIED. |
| S10 | Condition-adjusted wholesale band | UNVERIFIED | `wholesale-band.md` | **UNVERIFIED.** No public spread source. Show no band until ten lane closes. |
| S11 | Payout on cleared funds, lender first | House doc, planned | `whop.md` (payout fees and timing) | Rails sourced: next-day ACH $2.50, wire $23. Still planned for week 8. |
| S12 | Balance by ACH, wire, cash; Form 8300 over $10,000 | Threshold citation UNVERIFIED | `texas-rules.md` (S12) | **Sourced.** IRS: more than $10,000, 15 days. Cashier's checks of $10,000 or less count as cash in a car sale. |
| S13 | Soft close two minutes | House doc | none | House doc. |
| S14 | Dealer name and GDN on every screen and post | Ad-rule wording UNVERIFIED | none | **UNVERIFIED.** Counsel question 7 (43 TAC Subchapter F). |
| S15 | Title gate | House doc | none | House doc. |
| S16 | Texas-licence buyers; ID and DOB scan | Minimum age UNVERIFIED | none | **UNVERIFIED.** Counsel. |
| S17 | Registration requires proof of insurance | Citation UNVERIFIED | `texas-rules.md` (S17) | **Sourced.** Transp. Code §502.046(a). |
| S18 | Dealer title filing deadline; county time | UNVERIFIED | `texas-rules.md` (S18) | **Deadline sourced:** 43 TAC §215.144(f)(3): 30 days, 45 days dealer-financed, 60 days military. Statute §501.0234 has no day count. **County processing time UNVERIFIED.** |
| S19 | After-hours line | House doc | none | House doc. |
| S20 | Ten pilot results | Does not exist yet | none | Exists after Mon Nov 9. |
| S21 | Deposit dispute count | Does not exist yet | `whop.md` (dispute fee $15) | Fee sourced. The count exists once deposits are live. |
| S22 | Desk to Lane under four minutes | Target | none | Target. |
| S23 | Live shows a bid within a second | Target | `push-and-sms.md` (push has no SLA; in-app stream carries it) | Target. Push is not part of this claim. |
| S24 | Desk calls the winner within an hour | House rule | none | House rule. |
| S25 | Search for "Obavia" | Recorded Nov 13 | none | Film day. |
| S26 | TxDMV dealer list | Sourced | none | Sourced (house data). |
| S27 | Buyer urgency fact | UNVERIFIED | `buyer-urgency.md` | **Sourced (US, not Texas).** Cox Automotive, Sep 11, 2026: average US used listing price $27,239 in August 2026, +7% YoY. Texas figure UNVERIFIED. |
| S28 | Pull fee to the winner | Amount not set | none | Owner decision. |
| S29 | As-is on the Buyers Guide; title, odometer, VIN non-waivable | FTC citation UNVERIFIED | `texas-rules.md` (S29) | **Buyers Guide sourced:** 16 CFR §§455.1–455.5. **The "non-waivable" part is UNVERIFIED** (not in the FTC rule), so it goes to counsel. |
| S30 | Obavia's GDN status | Not filed | none | Filing. |
| model.md | Whop invoice fee on F (2.7% + $0.30) | UNVERIFIED | `whop.md` | **Sourced** on docs.whop.com/fees. $5.67 at F = $199. $6.67 if Billing (0.5%) applies, which is UNVERIFIED. |
| new | §215.144(i)(3): a GDN holder may not sell another GDN holder's car at a public auction | — | `texas-rules.md` | **Sourced.** Blocks "other dealers join under Obavia's GDN" until counsel rules. Written into decisions §8. |
| new | Desk seeded fees: title $33, registration $75 | — | `texas-rules.md` | Title $33 is right for Harris and other nonattainment counties only ($28 elsewhere). **$75 registration is not a TxDMV figure.** The range is $64.00–$98.25 by county. |
| new | Expo push limits; TCPA and CTIA text rules | — | `push-and-sms.md` | Sourced. Texas SB 140 UNVERIFIED at the primary source. |
| new 2026-10-13 | Public auction licence structure: no "public auction" GDN category; title must pass to the selling dealer first; no GDN holder sells another's car at a public auction; a consignment location needs its own GDN | none | `public-auction-model.md` §1 | **Sourced.** Transp. Code §503.029, §503.039(a) (2026-10-13); 43 TAC §215.144(i)(3) (2026-10-12); 43 TAC §215.133(a) (2026-10-13). Consignment is off (decisions §9 D1). |
| new 2026-10-13 | Title to the buyer before the 21st day at a public auction | S18 said 30 days | `public-auction-model.md` §1, §3 | **Sourced.** Transp. Code §503.039(b), read 2026-10-13. Amends S18 for lane sales (decisions §8.7, §9 D2). Whether it is enforced against an online GDN holder: counsel question 11. |
| new 2026-10-13 | Licensed auctioneer as bid caller is not a dealer | none | `public-auction-model.md` §1 | **Sourced** as statute text: Transp. Code §503.024(d), Occ. Code §1802.002(a)(14) (2026-10-13). Its reach to an online lane is counsel question 12. Ch. 1802 education, exam and recovery fund: **UNVERIFIED** (not researched). |
| new 2026-10-13 | Plate fee $10, not $5 | none | `public-auction-model.md` §2 | **Sourced.** TxDMV HB 718 Dealer FAQ (March 2025), read 2026-10-13. $20 database fee cap: Transp. Code §503.0631(f). |
| new 2026-10-13 | Tax remittance date | none | `public-auction-model.md` §2 | Two sources disagree: 20 working days (Tax Code §152.041(c)) and 30 calendar days (Comptroller 96-254). Which the county enforces: **UNVERIFIED**. The Desk uses the earlier (decisions §9 D7). |
| new 2026-10-13 | Texas buyer's 130-U and odometer signature through the webDEALER Buyer Acknowledgment; out-of-state buyers sign paper | §6 typed-name question | `public-auction-model.md` §3 | **Sourced.** webDEALER Dealer User Guide, July 2026, pp. 8-9, App. 2, read 2026-10-13. County acceptance of a drawn e-signature on an uploaded 130-U: **UNVERIFIED** (a DocHub summary, not primary). Form 130-U current revision: **UNVERIFIED** (TxDMV URL 404, 2026-10-13). |
| new 2026-10-13 | Auction terms: with reserve by default; bid retraction before completion; seller bidding voidable | none | `public-auction-model.md` §5 | **Sourced.** Bus. & Com. Code §2.328, read 2026-10-13. "No retraction" as a term: counsel (sub-question to 4). |
| new 2026-10-13 | 43 TAC §215.132 definitions (version eff. 7/1/2025); §215.155, .156, .158; 49 TexReg 8968 preamble | none | `public-auction-model.md` §1, sources | **UNVERIFIED.** Cornell serves only prior versions; SOS viewer redirected; archive 403 (2026-10-13). |
| new 2026-10-13 | Floorplan lender holding the title and Transp. Code §501.152(b) | none | `public-auction-model.md` §3 | **UNVERIFIED.** Depends on the floorplan agreement. |
| new 2026-10-13 | Copart Texas: public buyers take clean title only through a broker; Occ. Code ch. 2302 | none | `public-auction-model.md` §5, §6 | **UNVERIFIED.** Copart quote from a search snippet; page body empty to the fetcher; ch. 2302 text not retrieved (2026-10-13). Counsel question 15. |
| new 2026-10-13 | Comparable fees: Cars & Bids 5% ($250 min, $7,500 cap); Copart tiers; Metro Auto Auction premiums; BaT and C&B Texas licensing | none | `public-auction-model.md` §6 | BaT fees **sourced** (bringatrailer.com, 2026-10-13). Cars & Bids (403), Copart (empty), Metro (404), CarMax (empty), IAA state list, ADESA dealer-only status: **UNVERIFIED** (2026-10-13). |
| new 2026-10-13 | Facebook removed dealer vehicle listings from business Pages on 2023-01-30 | none | `public-auction-model.md` §6 | **UNVERIFIED** on Meta's page (404, 2026-10-13); third-party reporting only. Decisions §9 D14 runs on it. |
| new 2026-10-13 | Texas as-is form beyond the FTC Guide; Lemon Law reach to used cars; OCCC or SOS registration for a listing platform | none | `public-auction-model.md` §4 | **UNVERIFIED** (no Texas rule found; Lemon Law not researched; the SOS negative is a negative finding, 2026-10-13). |
| new 2026-10-13 | Peak Auto Auctions: 13.5% Texas buyer's premium, $50 card hold, no title management, seller pays nothing | none | `../peak-decoded.md` §1 to §3 | **Sourced** on Peak's own pages and portal JSON (2026-10-12 and 2026-10-13). Card surcharge rate (Yeeld): not published. Revenue model: **UNVERIFIED**. |
| new 2026-10-13 | Peak's Texas auctioneer licence #18376 | none | `../peak-decoded.md` §1 | **UNVERIFIED either way.** TDLR search by number and name returned nothing (2026-10-13). Recorded as a failed check; never repeated as "Peak has no licence". |
| new 2026-10-13 | Peak complaints and related seller | none | `../peak-decoded.md` §0, §6 | Endorsal "13% buyers premium is too much" line: **UNVERIFIED** (search snippet, not on the page). Peak Auto Storage affiliation: **UNKNOWN**. BBB complaint detail: **UNVERIFIED** (bot wall). Whether dealers selling on Peak hang a Buyers Guide: **UNKNOWN**. Facebook, Meta Ad Library, HiBid: not reachable (2026-10-13). |

Rows due Fri Oct 30, 2026 (content.md §6): S01 done, S07 done, S09 done (formula), S27 done (US). S06 timing is the owner's call, with the refund age limit to be proven in the sandbox. S08 is still open because no Retail provider has been chosen.

Next action: the payments owner runs a sandbox refund on a payment older than 30 days (`whop.md`, decision 4) and records the result here by Fri Oct 30, 2026.
