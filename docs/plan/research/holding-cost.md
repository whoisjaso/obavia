# Holding cost per day on the lot (register S09)

Researcher-architect, checked 2026-10-12. This file answers `growth/content.md` §4 row S09. It covers the `$35` default in `desk/src/lib/auction.ts` (`holdingCost = (days, perDay = 35)`) and the Lupe script in `obavia-auction-decisions.md` §3.4 ("74 days at $35 = $2,590").

## Question

What does one more day on the lot cost a dealer for one car (floorplan interest, insurance, the space)? Is $35 a day defensible?

## Answer

**$35 a day is not defensible for the cars on this lane.** The only public sources for a flat per-day figure are 2017–2018 dealer studies: NCM ($40), Dale Pollak ($85), and a Cox Automotive worked example ($44.63). All three take a dealership's **total non-selling overhead** (rent, salaries, utilities, floorplan) and divide it across every unit in stock. That is a fully absorbed average. It is not what one more day costs on one car, and it does not shrink with a $3,500 car. The marginal cost that one more week actually adds is floorplan cost plus loss of value, and both scale with the car's value. AFC, an independent-dealer floorplan lender, earned an all-in **18.1% a year** on average receivables in 2025 (9.6% interest plus 8.5% fees; OPENLANE 10-K). Wholesale values fell **1.3% in September 2026** (non-adjusted Manheim), which Cox calls steeper than usual. Together that is about **$0.93 per $1,000 of car value per day** at the worst defensible end. On Lupe's $3,350 car it is **about $3 a day ($230 over 74 days, not $2,590)**. On a $10,000 car it is about $9 a day. Insurance and lot space per car have no public source and stay UNVERIFIED. The default should be **0.1% of the car's value per day**, labelled as floorplan cost and value loss, with the dealer's own figure replacing it.

## The math

```
floorplan_per_day   = value × 0.181 ÷ 365        = value × 0.000496   (AFC all-in yield, FY2025)
depreciation_per_day = value × 0.013 ÷ 30        = value × 0.000433   (Manheim non-adjusted, Aug→Sep 2026, a steep month)
marginal_per_day    ≈ value × 0.00093            → round up to 0.1% of value per day
```

| Car value | Floorplan / day | Value loss / day (Sep 2026 pace) | Marginal / day | 74 days | $35 × 74 |
| --- | --- | --- | --- | --- | --- |
| $3,350 (Lupe, mid of band) | $1.66 | $1.45 | **$3.11** | $230 | $2,590 |
| $5,000 | $2.48 | $2.17 | **$4.65** | $344 | $2,590 |
| $10,000 | $4.96 | $4.33 | **$9.29** | $688 | $2,590 |
| $27,239 (US avg listing, Aug 2026) | $13.51 | $11.80 | **$25.31** | $1,873 | $2,590 |

A car has to be worth about **$37,600** before floorplan cost and value loss reach $35 a day. The low end of the range is floorplan interest only (9.6%) plus the year-over-year value change (−1.2% a year): about **$0.30 per $1,000 per day**. The defensible range is therefore **$0.30–$0.93 per $1,000 of value per day**, plus the dealer's own rent and insurance. A car the dealer owns outright (common on a BHPH lot) has no floorplan bill. The same yield is then used as the opportunity cost of the cash, which is the conservative-high reading.

## Evidence

| Claim | Source URL | Date checked | Quote |
| --- | --- | --- | --- |
| AFC all-in floorplan yield, FY2025 | https://www.sec.gov/Archives/edgar/data/1395942/000139594226000006/opln-20251231.htm (OPENLANE 10-K FY2025, Finance segment) | 2026-10-12 | "Finance revenue yield Interest revenue 9.6% 10.3% Fee and other revenue 8.5% 9.0% Total Finance revenue yield 18.1% 19.3%" (2025, 2024; % of average receivables managed) |
| AFC interest is prime-based | same | 2026-10-12 | "AFC's interest revenue is generally determined based on the applicable prime rate plus a margin." |
| Bank prime rate now | https://www.federalreserve.gov/releases/h15/ (H.15, released Oct 9, 2026) | 2026-10-12 | "Bank prime loan" 7.00 on Oct 2, 5, 6, 7 and 8, 2026 |
| Wholesale depreciation, September 2026 | https://www.coxautoinc.com/press-releases/q3-2026-muvvi-press-release/ | 2026-10-12 | "Non-adjusted wholesale used-vehicle prices fell 1.2% year over year and 1.3% from August as depreciation accelerated in the third quarter." |
| September 2026 was steeper than normal | https://www.coxautoinc.com/insights/manheim-used-vehicle-value-index-september-2026-trends/ | 2026-10-12 | "The long-term average monthly move in non-adjusted values for September is a decrease of 0.3%." |
| $40/day (NCM) and $85/day (Pollak) | https://www.cbtnews.com/dealers-experts-discuss-inventory-holding-cost-erosion/ (Jul 6, 2018) | 2026-10-12 | "According to NCM Associates, holding costs for most domestic vehicles is approximately $40 per day per car." … "holding costs for used cars are closer to $85 per day." |
| Cox method is fully absorbed overhead | https://www.coxautoinc.com/insights/three-floor-plan-finance-formulas-every-dealer-know/ (Jul 25, 2017) | 2026-10-12 | "subtract your monthly selling expenses from your total expenses for the month" … example "$1,071.15 ÷ 24 = $44.63" per unit per day |
| NextGear publishes no rate | https://www.nextgearcapital.com/resources/how-does-floor-plan-financing-work/ | 2026-10-12 | Only general terms: the dealer repays "the initial value of the loan plus interest and fees". No rate is published. Rate sheet **UNVERIFIED**. |
| A "prime + 2–4%" independent floorplan range | Third-party summaries only. smbcompass.com (Sep 21, 2026) does not contain it and says "few lenders publish rate cards". | 2026-10-12 | **UNVERIFIED.** Not used. The AFC 10-K yield is used instead. |
| Dealer lot insurance per car per day; lot space per car per day | No public source found (NIADA, Cox, lender pages searched) | 2026-10-12 | **UNVERIFIED.** Left to the dealer's own figure. |

## The decision it forces

1. `holdingCost` must stop defaulting to $35. The default becomes **0.1% of the car's value per day** (`perDay = value × 0.001`), shown as "about $X a day: floorplan and value loss. Your rent and insurance aren't in it." The dealer's own figure replaces it, as the code comment already says. This is a code change for the desk owner. This file does not make it.
2. The Lupe script and decisions §3.3 ("Every week I wait costs more than the floor earns") are overstated by about 11 times on a $3,350 car. The holding line must be recomputed before it appears in any film (`messaging-hooks.md` DV frame 5.0–10.0 keeps it blurred until then).
3. Any on-screen dollar figure for holding cost carries "Source: OPENLANE 10-K 2025 (AFC floorplan yield 18.1%); Cox Automotive Manheim index, Sep 2026". No "industry round number" is quoted.
4. Register S09 moves from UNVERIFIED to **sourced as a formula**, with insurance and space UNVERIFIED.
