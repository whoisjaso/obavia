# The "lane usually pays" band on the Floor screen (register S10)

Researcher-architect, checked 2026-10-12. This file answers `growth/content.md` §4 row S10 and the `wholesaleBand()` function in `desk/src/lib/auction.ts`: `mid = retail × (0.62 + 0.16 × g)`, band = mid ± 6%, where g is the condition grade from 0 to 1.

## Question

Can any public wholesale-to-retail spread source defend a band of retail × 0.62–0.78 (± 6%)? What may the Floor screen claim until the lane has its own history?

## Answer

**No public source defends the band, and no public source contradicts it either.** Cox Automotive publishes the wholesale side only as an index (Manheim, 205.9 in September 2026) and the retail side as an average listing price ($27,239 in August 2026). They describe different vehicle mixes in different months, and Cox publishes no ratio between them. NIADA's Used Car Industry Report lists "used retail versus wholesale" as a topic, but it is paid and was not read. Third-party "15–25% spread" claims have no source. The band also inherits two other open problems. Its input "retail" is the Retail bar, which has no data provider (S08 UNVERIFIED). And 43 TAC §215.85(b)(5) treats a program that "set[s] or suggest[s] to the dealer any price" as needing a GDN, which decisions §0 already applies to the band. **Until the lane has its own closes, the Floor screen shows no band.** It shows what you owe, the holding cost at the car's value (`holding-cost.md`), and you-get / you-bring. After ten started cars, it shows the lane's own observed hammer-to-retail range, with the count and the dates.

## Evidence

| Claim | Source URL | Date checked | Quote |
| --- | --- | --- | --- |
| Wholesale is published as an index, not a dollar price | https://www.coxautoinc.com/insights/manheim-used-vehicle-value-index-september-2026-trends/ | 2026-10-12 | "The Manheim Used Vehicle Value Index (MUVVI) in September was 205.9" |
| No dollar wholesale price or wholesale-to-retail comparison in Cox's March 2026 index page either | https://www.coxautoinc.com/insights/manheim-used-vehicle-value-index-march-2026-trends/ | 2026-10-12 | The page gives "215.3" and percentage moves only. No dollar or spread figure. |
| Retail average listing price | https://www.coxautoinc.com/insights/used-vehicle-inventory-august-2026/ | 2026-10-12 | "Used-vehicle average listing prices increased to $27,239, 7% above a year ago" |
| NIADA covers the spread but behind a paywall | https://niada.com/dashboard/niadas-ucir-shows-independent-used-sales-top-9-8-million-in-2025/ (Mar 4, 2026) | 2026-10-12 | The report is sold at "$225 for members, $450 for non-members". The spread figure is **UNVERIFIED (not purchased)**. |
| A March 2026 Manheim non-adjusted average of $20,102 (Axios) | https://www.axios.com/2026/04/07/wholesale-used-vehicle-prices | 2026-10-12 | Returned 403. Seen only in a search summary. **UNVERIFIED.** Not used. |
| "Suggest any price" needs a GDN | https://www.law.cornell.edu/regulations/texas/43-Tex-Admin-Code-SS-215-85 | 2026-10-12 | §215.85(b)(5): "The program does not set or suggest to the dealer any price of a motor vehicle or a trade-in." |
| The plan's own hammer assumption | `obavia-auction-decisions.md` §6 | 2026-10-12 | "the hammer distribution (assumed 1.20×MMR centre; the first ten pilot cars will measure it)". This is a house assumption, not a source. |

## The decision it forces

1. The Floor screen claims **no "what the lane would pay" band** until ten cars have started on the lane. In its place it shows one faint line: "No lane history yet." That is the claim matching verified capability.
2. After ten started cars, the band is the lane's own min–max of hammer ÷ Retail-bar value, condition-grouped only once each group has five or more cars. It is labelled "Lane, N cars, [first date]–[last date]". No public index is blended into it.
3. Under Obavia's own GDN (Phase 3), the band is a price suggestion to a dealer by the platform. It needs counsel question 1 answered before it ships to any dealer other than the GDN holder's own lot.
4. `wholesaleBand()` stays in code as a pilot-only internal estimate, never rendered. This is a frontend change for the desk owner. This file does not make it.
5. Register S10 stays **UNVERIFIED**, with the replacement source named: the lane's own pilot results (S20, from Mon Nov 9).
