# Planning protocol — the phased interview
Prefill everything already known from docs/ and research/. Ask ONE consequential unresolved question at a time, with: why it matters, your recommendation, two alternatives, the tradeoff, the decision it updates. Produce decisions, not requests to keep talking. Never re-ask the name, the free-buyer rule, or the whole vision.

| Stage | Output | Exit condition |
|---|---|---|
| A. Current reality | Repo audit: exists / verified / demo-stub / missing / unknown; stack; costs | No accidental rewrite |
| B. Pilot outcome | Exact segment, pain, success metric, exclusions | One outcome + recruiting path chosen |
| C. Journeys / UX | One buyer and one dealer journey incl. failure states | Screens have testable states |
| D. Domain states & authority | Records, invariants, who may transition what | State machine written before screens |
| E. Minimum architecture | Keep credible existing stack; boundaries; provider adapters | No universal integration engine |
| F. Delivery contract | SPEC.md with acceptance tests, rollback, limits | Founder approves the slice |
| G. Release & learning | Pilot process, support, instrumentation, review | Evidence decides release |

Roadmap horizons: **Now** (implementation-ready) / **Next** (dependencies known) / **Later** (capability intent + research gate) / **Research** / **Parked**. Detail is rolling; no fixed phase count.

Classify research items before use: founder-approved constraint · verified external requirement (cite authority, jurisdiction, review date) · current code behavior · product/architecture proposal (needs decision) · market hypothesis (needs experiment + falsification) · anecdotal complaint (scenario inspiration only) · external integration assumption (blocks dependent capability until validated) · parked idea.
