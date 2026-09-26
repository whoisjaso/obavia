# Obavia build plan: BMAD, to launch on April 24, 2027

This is how Obavia gets built, one phase at a time, using the BMAD method. Each phase ends at a gate. Nothing in a later phase starts until the gate before it passes. Spikes are the one exception: small, throwaway tests of a risky integration.

**The experience comes first.** A 10 out of 10 engine behind a 6 out of 10 experience loses to the tools owners already have. So:
- the UX spec leads the PRD;
- every story is designed before it's built;
- a story isn't done until it passes the experience bar below;
- launch waits on the experience as much as on accuracy.

Read with `docs/obavia-spec.md` (what we build), `docs/sales-doctrine.md` (what it coaches against) and `docs/icp-language.md` (how the market talks).

**Why BMAD.** Obavia is one product with a long build, several integrations, an AI core that has to be right, and a price that has to be earned. BMAD writes the brief, the PRD, the UX spec and the architecture *before* any story is coded, then builds epic by epic, one story at a time. Those documents become the context every coding session reads, so the build doesn't drift across seven months.

---

## The calendar

| Phase | Dates | Weeks | Gate |
|---|---|---|---|
| 1. Analysis | Mon Sep 28 to Fri Oct 16, 2026 | 3 | The brief is signed off and 3 design partners are committed |
| 2. Planning | Mon Oct 19 to Fri Nov 6 | 3 | The PRD and the UX spec are approved |
| 3. Solutioning | Mon Nov 9 to Fri Nov 27 | 3 | Architecture approved and the readiness check passes |
| 4. Implementation | Mon Nov 30, 2026 to Fri Apr 16, 2027 | 20 (10 sprints) | Every v1 story done and the quality bar met |
| Launch week | Mon Apr 19 to Fri Apr 23 | 1 | The launch checklist is all green |
| **Launch** | **Sat Apr 24, 2027** | | Founding cohort goes live |

The buffer is inside the sprints: sprint 10 carries no new features. If a sprint slips, the cut list below decides what moves out, never the date.

---

## Phase 1. Analysis (Sep 28 to Oct 16)

BMAD agents: Analyst, PM.

1. **Owner interviews.** Twelve agency owners at $100K to $1M a month, taken from the waitlist and the network. The script is §7 of the doctrine. Capture:
   - what they use now: Gong, a sales manager, a coach, or a dashboard they built;
   - what they have tried and why it failed;
   - whether $3,000 a month holds, and what would make it an easy yes;
   - which guarantee they would believe.
2. **Competitive read.** Map the alternatives buyers actually weigh, using the five perspectives in `icp-language.md` §8: ours, customers', secret shopping, what AI tools say, and what the ad algorithm shows beside us.
3. **Integration census.** Which phone systems, meeting tools, calendars, CRMs and payment tools these owners actually run. Rank them by share. The top three to five in each category are v1.
4. **Recording consent.** Legal read on call recording in two-party-consent states, and on how the product captures consent.
5. **Output: `docs/plan/brief.md`**, the product brief:
   - the problem;
   - who it's for;
   - the one metric (revenue per lead);
   - the v1 promise;
   - the offer: terms, refundable start, guarantee.

**Gate:**
- The brief is signed off.
- Three design partners have agreed to connect their tools in February and give weekly feedback.
- The guarantee decision (spec §9) is made.

## Phase 2. Planning (Oct 19 to Nov 6)

BMAD agents: UX Designer first, then PM.

1. **`docs/plan/ux.md` leads.** The UX spec is written first. The PRD serves it, never the other way round.
   - Functional requirements for every v1 feature, each tied to a spec row.
   - Non-functional requirements: accuracy, latency, uptime, privacy, cost per call.
   - Success metrics, and what is out of scope.
2. **The UX spec covers:**
   - Onboarding, step by step: sign up, connect each tool, first calls ingested, first read, first report.
   - Every screen in the prototype, with its empty, loading and error states.
   - The owner, the rep and the marketer journeys.
   - Rules: one next action, nothing to type.
   - The sensory system:
     - one sound set and one haptic set, each with a meaning;
     - motion timings and easing;
     - how every tap, success, warning and arrival feels.
   - Clickable prototypes of every v1 screen, tested with five owners before any code. Five-second test: can they say where they're losing money?
3. **`docs/plan/prd.md`.**
4. **Pricing and terms.** Monthly terms, the refundable start, the founding cap and price, written as they will appear on the site.

**Gate:**
- The PRD and the UX spec are approved.
- Every v1 requirement has a measurable acceptance test.

## Phase 3. Solutioning (Nov 9 to Nov 27)

BMAD agents: Architect, Scrum Master, with a test architect.

1. **`docs/plan/architecture.md`.**
   - Tenancy: agency, team, roles.
   - Integration layer: OAuth, webhooks, backfill.
   - Call pipeline: recording, transcription, speaker labels.
   - The AI layer: reason tags, the word-choice read, the handoff, awareness stage, objections, compared-to. Includes prompts, the model choice and the evaluation harness.
   - The event-sourced ledger for leads, calls and cash.
   - The daily report scheduler and delivery.
   - Auth, billing, observability, data retention, and cost per call.
2. **Evaluation set.** 200 labeled calls, from design partners or produced with them, with a human-agreed reason tag, awareness stage and handoff fields. Every AI feature is measured against this set in every sprint.
3. **Spikes.** The two riskiest integrations (a phone system and a CRM) are proven end to end with throwaway code.
4. **Epics and stories.** Written into `docs/plan/epics/`, sized to fit a sprint, with acceptance criteria.
5. **Readiness check.** BMAD's implementation-readiness review: the PRD, UX spec, architecture and stories all agree.

**Gate:**
- The readiness check passes.
- The first two sprints are fully written.

## Phase 4. Implementation (Nov 30 to Apr 16)

BMAD cycle for every story:
1. The Scrum Master writes it.
2. UX attaches the screen and its states.
3. Dev builds it.
4. A code review, QA and an experience review check it.
5. Done. Each sprint ends with a demo to the design partners and a retrospective.

| Sprint | Dates | Epic | Done means |
|---|---|---|---|
| 1 | Nov 30 to Dec 11 | **E1 Foundation** | Accounts, agencies and roles, auth, app.obavia.co deployed, CI, error tracking |
| 2 | Dec 14 to Dec 25 | **E1** + **E2 Onboarding** starts | Stripe billing with monthly terms and the refundable start; onboarding shell, step by step |
| 3 | Dec 28 to Jan 8 | **E2 Connect tools** | Calendar and CRM connected with backfill; leads, bookings and deals flow in |
| 4 | Jan 11 to Jan 22 | **E3 Call capture** | Phone and meeting recordings flow in, transcribed with speakers, consent handled |
| 5 | Jan 25 to Feb 5 | **E4 Why from calls** | Reason tags with the exact words, measured on the evaluation set. **Design partners connect.** |
| 6 | Feb 8 to Feb 19 | **E5 Leak engine** | The funnel with each step's loss in dollars, the biggest leak picked; Overview and Leaks on real data |
| 7 | Feb 22 to Mar 5 | **E6 Daily report** | The owner, rep and marketer pages, sent at 7:00 AM local: objections with the offer fix, days booked out, compared-to, by source |
| 8 | Mar 8 to Mar 19 | **E7 Fix loop** + **E8 The lead** | One fix per rep, checked Friday in dollars; the word-choice read on every lead |
| 9 | Mar 22 to Apr 2 | **E8 Handoff** + **E9 Team** | Setter-to-closer handoff with the string; Today screen; revenue-per-lead board |
| 10 | Apr 5 to Apr 16 | **Hardening and polish** (no new features) | The experience bar on every screen, the quality bar below, a security review, load tests, and onboarding run cold by someone new |

## Launch week (Apr 19 to Apr 23)

- **Founding cohort.** Onboarding for the first cohort from the waitlist, up to the real, stated cap.
- **Site.** Pricing live, and the waitlist confirmation turned into the first step of onboarding.
- **Proof.** The design partners' results published, with their consent, in dollars (the Nick model in `icp-language.md` §8).
- **Operations.** Support, a status page and a written incident response.

---

## The experience bar (every story, every sprint)

A story ships only when all of these hold:

| Check | Bar |
|---|---|
| The answer first | The number that matters is readable in under 5 seconds, on a phone, before any sentence |
| Words | At most one short line per section. If it needs a caption, it's redesigned |
| One next action | One primary action per screen, reachable with the thumb |
| Every state | Empty, loading, error and success are designed, never default |
| Feel | Every tap has its sound (after the first tap) and haptic. Motion is eased, never janky, 60fps on a mid-range phone |
| Speed | Any screen interactive in under 1 second on 4G. No spinners over 300 ms without a skeleton |
| Consistency | Same sky, type, colors, sounds and haptics as every other screen. No new pattern without a reason |
| Nothing to type | The core loop never needs the owner or a rep to type |
| Accessible | Readable contrast, reduced motion respected, works with VoiceOver |

The design partners score the experience every sprint (1 to 10). Launch needs 9 or higher from all three.

## The quality bar (what justifies $3,000 a month)

Launch waits on these, not on feature count:

| Measure | Bar |
|---|---|
| Time to first value | First report within 48 hours of connecting tools |
| Reason-tag accuracy | At least 85% agreement with human labels on the evaluation set |
| Handoff usefulness | Closers at the design partners rate it useful on at least 80% of calls |
| Report delivery | At 7:00 AM local on at least 99% of days |
| Nothing to type | No rep has to enter anything for the core loop to work |
| Experience | 9 out of 10 or higher from every design partner; a new owner completes onboarding without help |
| Found money | Every design partner shown at least one leak worth at least $10K a month, from their own calls |
| Privacy | Consent captured, data scoped per agency, deletion on request |

## What moves out if a sprint slips

Cut from the bottom of this list first:
1. Trial mode for new reps.
2. Lead tiers and routing.
3. Lead enrichment.
4. Rep pairing.
5. The touch path, and the speed of the pre-call asset.
6. Back-end signals.

The experience bar never moves either. Cut a feature before shipping one that feels unfinished. The core loop never moves: capture, why from calls, leak engine, daily report and the fix loop.

## How we run it

- **Tooling.** Install BMAD in this repo with `npx bmad-method install`, targeting Claude Code. Every phase is run with its agent, and every document it writes lands in `docs/plan/`.
- **Rhythm.** A two-week sprint with a Monday plan and a Friday demo. The owner signs each gate.
- **One source of truth.** A story changes behavior only through the PRD. The spec's Status column is updated when a feature ships.
