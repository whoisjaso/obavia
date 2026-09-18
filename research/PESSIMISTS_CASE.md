# Obavia: The Pessimist's Case

*A maximally pessimistic risk assessment. Current as of September 17, 2026. Every conclusion below is directional against building Obavia as specified — that is the assignment, and the evidence supports it.*

## TL;DR
- **Do not build Obavia as specified.** The full-transaction "truth layer" model layers a two-sided cold-start marketplace on top of a regulated financial/title/AI stack — the same design that killed or forced the acquisition of nearly every predecessor (Roadster, Honcker, Fair, Shift, Vroom, Instamotor, Blinker, Beepi), while the low-end dealer-SaaS niche is already locked by DealerCenter, Frazer, and Carsforsale at $40–$99/month.
- **The regulatory surface alone is disqualifying for a solo founder.** To run the flow as described, Obavia would need or brush against a Texas motor-vehicle title-service license, the TxDMV brokering prohibition (Occ. Code §2301.006), OCCC Chapter 348 exposure, GLBA Safeguards obligations, TDPSA sensitive-data consent, TRAIGA AI disclosure, TCPA, and possibly Texas money-transmission licensing.
- **Keep Apohenia.** The narrow pre-submission deal-packet checker already has a paying pilot, a near-zero regulatory surface, no cold-start problem, and a defensible wedge (Texas paperwork correctness). Obavia is scope creep from a revenue-generating checker into a capital-hungry, legally-exposed OS — and it violates Jason's own August 2026 decision records.

## Executive Verdict
The proposed structure fails on five independent axes which compound: precedent; cold-start economics; regulatory surface; commoditization; founder structure.

### The 10 most likely ways Obavia dies (ranked)
1. Runs out of the founder's time before revenue.
2. Cold-start never ignites (10 dealers × 45 cars vs ~2,800 Harris County dealers).
3. Regulatory action or fear halts title/registration and financing features.
4. Consumer CAC exceeds LTV (~$39+/lead; buyers transact once every several years).
5. Incumbents bundle it away (DealerCenter/Cars Commerce/CDK ship "deal continuity").
6. AI commitment liability (Moffatt v. Air Canada).
7. Churn eats the base at $99 with a solo funnel.
8. Integration gatekeeping (RouteOne/Dealertrack vaults, CARFAX, Meta API shut-off).
9. Price ceiling — incumbents at $40–$99 for a full DMS.
10. Conflict of interest — dealer-owned platform rating rival dealers.

## 1. Competitor Graveyard
- **Vroom**: IPO June 2020 raised $468M; shut e-commerce Jan 2024, ~800 layoffs (~90% of non-UACC staff); "unable to raise the necessary capital"; Ally suspended credit line; Texas AG DTPA settlement ~$3M.
- **Shift**: SPAC 2020; acquired Fair's dealer marketplace 2022; merged with CarLotz; Chapter 11 Oct 2023.
- **Fair, Beepi, Honcker, Instamotor, Blinker, Carlypso**: shut down or acquired.
- **Roadster**: ~8 yrs, ~2,000 dealers, ~$24M raised; acquired by CDK June 2, 2021 for ~$364.4M total consideration; absorbed.
- **Modal, Prodigy, CarNow, Gubagoo**: rolled up 2020–2021. TrueCar swapped Roadster for AutoFi — continuity layers get swapped like commodities.
Failure causes: capital dependence in downturns, single credit lines, CAC that never cleared, and the fact that "owning the transaction" requires capital, integrations, and trust only incumbents possess.

## 2. Dealer Software Economics
- NIADA 2025: ~117,000 licensed independent locations; ~53,000 active (≥50 units/yr); 9.8M units sold in 2025; BHPH 32.6% of independent financing; subprime 34% of originations.
- Price ceiling: DealerCenter ~$60–99; Frazer ~$55–99; AutoManager ~$50; Carsforsale $99 full suite. Obavia's $99→$199 sits at or above the ceiling with less proven functionality.
- Distribution: in-person reps, NIADA/TIADA, 20-groups, Manheim/ADESA — not Meta ads.
- Switching costs: DMS holds inventory, deal history, accounting, BHPH portfolio.

## 3. Two-Sided Cold Start
- 10 dealers × ~45 cars ≈ 450 vehicles vs ~2,800 Harris County dealers.
- Meta automotive CPL ~$39 (range $25–50); Google $38–78; some datasets cite $326 CPL rising ~15% YoY.
- Buyers free, dealers free on the marketplace layer → essentially no revenue months 1–18.

## 4. Regulatory Landmines
- **Brokering (Occ. Code §2301.006)**: TrueCar forced to flat-fee subscriptions; VA/CA challenges (2018 settlement). Statutory broker definition targets new vehicles — ambiguity for used, but enforcement posture is a live risk.
- **Title service (Transp. Code Ch. 520 Subch. E)**: applies in counties ≥500,000 (HB 623, 2003). Harris County covered.
- **webDEALER**: no third-party vendor role; only dealer personnel with TxDMV credentials. Mandatory for all dealers since July 1, 2025 (HB 718).
- **OCCC Ch. 348**: MVSF license required to hold/take assignment of RICs (Bulletin B23-1).
- **FCRA/ECOA/Reg B**: prequal, soft pulls, "realistic fit" on credit.
- **GLBA Safeguards (2023)**: service providers must implement encryption, MFA, monitoring, WISP, pen testing.
- **FTC CARS Rule**: vacated 5th Cir. Jan 27, 2025; withdrawn Feb 12, 2026. State DTPA/UDAP still governs.
- **TCPA**: one-to-one consent vacated (11th Cir. Jan 24, 2025); revocation rules tightened April 11, 2025; $500–1,500/violation uncapped.
- **TDPSA (Ch. 541)**: §541.107 sensitive-data sale consent binds even small businesses; $7,500/violation; AG enforcing.
- **TRAIGA (HB 149, eff. Jan 1, 2026)**: $10k–$200k/violation; disclosure/deception provisions apply.
- **Money transmission (Fin. Code Ch. 152, eff. Sept 1, 2023)**: $10k application; bond $100k–$500k; net worth ≥ $100k or 3% of assets. Agent-of-payee exemption likely broken by refundable deposits. Never touch the money.
- **Reviews**: FTC fake-review rule (2024); dealer-to-consumer ratings → FCRA CRA risk.

## 5. Integration Gatekeeping
eContracting vaults (RouteOne 9,000+ dealers, 90+ finance sources, 13 DMSs) are certification-gated. Meta killed dealer vehicle listings Jan 30, 2023 → paid Automotive Inventory Ads only. DMS data access gated by certification/fees; CDK June 2024 ransomware hardened caution. CARFAX/AutoCheck licensing costly.

## 6. AI-Specific Risk
Moffatt v. Air Canada, 2024 BCCRT 149: "the chatbot is a separate legal entity" rejected; negligent misrepresentation. AI follow-up is a crowded commodity (Impel ~$99/feature, Numa $200–400, Podium $399–899, Fullpath, Matador, Conversica, DealerCenter AI). Cost per conversation stacks SMS + LLM + voice + IDV.

## 7. Founder / Structure Risk
Solo 20-year-old running a dealership, Apohenia, relocation, UT Austin, and a two-sided marketplace. Conflict of interest as dealer-owner. Multi-year, multi-$M capital need. AI-built regulated systems hard to audit. Checker→OS scope creep. Houston concentration. Violates own August 2026 decision records.

## 8. Unit Economics Stress Test
At $99–199 with realistic COGS, 100–200+ paying dealers net of 3–6%/mo churn to cover one salary + infra. A 5-location dealer with 10k conversations on $99 is margin-negative. The 24-month $99 lock fixes revenue below cost on the heaviest cohort.

## 9. What Incumbents Will Do
DealerCenter/Carsforsale add continuity at $60–99; Cars Commerce/CarGurus/Autotrader build digital retail; CDK/Cox bundle (CDK bought Roadster); Amazon Autos expanding; Meta controls the channel.

## 10. Texas Market
~2,800 Harris County dealers (~395 franchise); Texas ~10% of active US independents; BHPH/subprime dominated; price-sensitive; software budget a few hundred/month already committed.

## Regulatory / Licensing Table (full flow as described)
| # | Regime | Agency | Statute | Cost | Timeline | Trigger |
|---|---|---|---|---|---|---|
| 1 | Title service license | Harris County tax assessor | Transp. Code Ch. 520 Subch. E | fee + bond | weeks–months | submitting title/reg for fee |
| 2 | webDEALER access | TxDMV | §520.005; 43 TAC 217 | n/a | n/a | no vendor role |
| 3 | Anti-brokering | TxDMV | Occ. Code §2301.006 | legal opinion | ongoing | connect buyers/dealers; lead fees |
| 4 | MVSF license | OCCC | Fin. Code Ch. 348 | license + exam | weeks–months | holding/assigning RICs |
| 5 | GLBA Safeguards | FTC | 16 CFR 314 | six figures possible | before NPI | receiving NPI |
| 6 | FCRA/ECOA | FTC/CFPB | 15 USC 1681; 12 CFR 1002 | legal + onboarding | weeks–months | credit-based prequal |
| 7 | Bureau access | bureaus | contracts | inspection + fees | weeks | any credit data |
| 8 | TDPSA | Texas AG | Ch. 541 | program | before processing | consumer data |
| 9 | TRAIGA | Texas AG | HB 149 | program | before AI | AI with consumers |
| 10 | TCPA | FCC | 47 USC 227 | program | before outreach | AI texts/calls |
| 11 | Money transmission | Texas DOB | Ch. 152 | $10k + $100–500k bond | months | holding deposits |
| 12 | eContracting cert | RouteOne/Dealertrack | vendor | fees | months, gated | financeable e-contracts |
| 13 | E-SIGN/UETA/130-U | TxDMV | UETA; 130-U | legal | ongoing | e-signatures on title docs |

## Hidden Nuances the Original Report Missed
1. Title-service threshold is 500,000 (Houston covered). 2. webDEALER has no vendor role. 3. Money-transmission law rewritten (Ch. 151→152) Sept 2023. 4. TDPSA §541.107 binds small businesses. 5. CARS Rule dead → no transparency moat; DTPA remains. 6. TCPA one-to-one dead; revocation tightened. 7. Meta shut off listings Jan 2023. 8. Air Canada precedent. 9. eContracting vault-gated. 10. ~53k active dealers, not 117k. 11. CDK attack hardened integration attitudes. 12. Incumbent price floor below Obavia.

## Apohenia vs Obavia
| Dimension | Apohenia | Obavia |
|---|---|---|
| Time to revenue | live ($500 pilot) | 12–18+ months |
| Capital to PMF | bootstrappable | multi-year, multi-$M |
| Regulatory surface | minimal | 7+ regimes, 4+ agencies |
| Cold start | none | severe |
| Defensibility | Texas paperwork correctness | low |
| Conflict of interest | none | dealer-owner rating rivals |
| Fits decision records | yes | no |

## Recommendations
Now (to Nov 5, 2026): honor decision records; convert pilot to 5–10 paying dealers. Next: only after 20+ dealers at <5%/mo churn, add a single-sided AI drafting assistant under the dealer's own accounts. Never as a solo bootstrapper: hold money, submit to webDEALER for a fee, pull credit, tie fees to leads/sales, let AI commit facts unvalidated.

## Smallest Legally-Clean Wedge
A single-sided, dealer-paid compliance-and-paperwork SaaS that never touches money, never submits to webDEALER on the dealer's behalf, never brokers, never pulls credit — Apohenia plus a clearly-disclosed AI drafting assistant that prepares (not submits) Texas deal paperwork and follow-up drafts the dealer sends under its own accounts, flat per-store SaaS with all variable costs passed through.

## Caveats
Deliberately one-sided. Benchmarks directional. Money-transmission and brokering outcomes are fact-dependent and warrant Texas counsel. TRAIGA, CARS, TCPA in flux — re-verify before relying.
