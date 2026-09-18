# Risk register
| ID | Risk | Likelihood | Impact | Mitigation | Owner | Trigger to escalate |
|---|---|---|---|---|---|---|
| RK-1 | Founder time: dealership + Apohenia + relocation + school | high | fatal | one slice WIP; Apohenia stays the funded wedge; fractional counsel; no marketplace until 50 paying dealers | Jason | slice slips >2 sprints |
| RK-2 | Cold start / no buyers | high | high | single-sided launch; Triple J tenant zero; SEO pages; AIA later | Jason | — |
| RK-3 | Brokering / title-service / OCCC exposure | med | fatal | never-list; flat fees; dealer submits; counsel opinion before any fee framing change | counsel | any feature touching NL-2/3/4 |
| RK-4 | AI misrepresentation | med | high | claims registry; human-in-loop commitments; disclosure; E&O + cyber insurance | eng | any AI output path without registry |
| RK-5 | Consumer data breach | med | high | RLS + DOA tests; SOC 2 Type 1; minimum collection; retention | eng | real NPI stored |
| RK-6 | TCPA violation ($500–1,500/msg) | med | high | consent capture, revocation ≤10 days, quiet hours, logs | eng | first automated outbound |
| RK-7 | Incumbent bundles continuity | high | med | overlay not replace; Texas paperwork depth; partner programs | Jason | — |
| RK-8 | Unit economics on heavy users | med | med | metered pass-through; fair-use caps; no lifetime lock | Jason | dealer >2k conversations/mo |
| RK-9 | Integration gatekeeping (eContracting, DMS) | high | med | cash-first; hand-off design; partner programs in RESEARCH | eng | financed slice starts |
| RK-10 | Conflict of interest (dealer-owner rates rivals) | med | med | ADR-0006; separate entity; metrics-based; disclosure | Jason | first non-Triple-J dealer |
| RK-11 | Cloud VM reclaim loses background work | med | low | file-based state; small commits; STATE.md at every handoff | eng | — |
| RK-12 | Repo is public and now holds strategy docs | high | med | make repo private before merging kit branch | Jason | immediately |
