# Apohenia draft scripts — dealership website inquiry follow-through

**Version:** `dealership-inquiry-follow-through-v0.1` · **status:** draft · **immutable:** false · **price placement:** after_pillars · **offer:** `draft-research-offer-v0` (draft)

> Every line below is **ORIGINAL Apohenia draft wording** in Jason's domain (AI/software for dealerships). Lines are **not** source quotes. Each line cites the source record ids whose *purpose* it adapts; the source template and exact excerpt live only in the Source Library (`/sources/<id>`). All 51 nodes carry `approval.status: "draft"` — owner review is required before any live use. Nothing here is sales policy.
>
> Slots in braces (`{dealership_name}`, `{stated_problem}`, `{pillar_1_name}`, `{approved_price}` …) are filled only from confirmed prospect facts or approved offer attributes. An unfilled slot renders a visible missing-information cue; a null price renders "Price not approved yet — route to scope conversation" and never a number.
>
> Delivery cues are **instructor-described** (framework §11) — text descriptions from the transcripts, not audio-verified.

This file is generated from `data/apohenia_script_nodes.json` by the M-script authoring pass; the JSON is the source of truth.

## Apohenia additions vs source (read this before the script)

The source (Andrés / Yosh transcripts, 207 study records) supplies purposes and normalized templates. The nodes below are original wording that serves those purposes in a dealership context. Where a node has **no** source counterpart, or deliberately changes the source's routing, it is listed here and carries a `source_note` in the JSON.

| Node(s) | What the source does | What Apohenia does instead | Why |
|---|---|---|---|
| `cold-open`, `cold-gatekeeper`, `cold-short-meeting` | Only a warm-lead opener (I01–I03) is fully scripted; no permission-first cold dealership script, gatekeeper route, opt-out route or short-meeting alternative exists. | Permission first, a specific relevant reason for the call, a gatekeeper route to the real owner of web inquiries, an immediate respectful stop on any opt-out, and a scheduled fifteen-minute alternative. | Framework §2, §16 — explicitly original module. |
| `handoff-recap` | Recap setter notes and confirm (I08). | Same, plus an evidence check: missing or disputed notes route back to the specific missing question, never past discovery. | Framework §2. |
| `intent-tangible`, `intent-experience` | Two intent variants (I06 improvement / I07 new activity) and the experience question (I04); mirror when only a goal comes back (M02/M03). | One intent node with the improvement wording as primary and the new-activity wording available; experience node accepts "I do not have that problem" as a complete answer and routes to a respectful exit. | Framework §3 production rule. |
| `logical-preserve` | L06 (study_only) forces a "nothing" back into a positive so the seller appears unbiased. | Asks what should be preserved; accepts "nothing" as is. L06 is cited only in the source note, never as a live node. | Framework §4 explicit adaptation. |
| `logical-change` | L07 change question; L08/L09 "what do you mean" probe as separate steps. | Probe carried as the node's mirror variants; the same answer type (a specific problem) is sought. | Keeps the node count at 51 without losing the probe. |
| `logical-impact` | Industry-specific impact examples (L11 fitness, L12 marketing crew, L13 day-to-day). | Dealership impact: appointments kept, staff time; verified counts, estimates and feelings kept labelled separately. L11 (fitness) is not imported. | Framework §4 — same purpose, own wording. |
| `setter-spend-conditional` | S03 asked conditionally in A, broadly in B. | Only reachable via the low-priority branch of `setter-target-gap`; never a universal affordability test. | Framework §5, §16. |
| `emotional-rationale` | E01 contrasts advanced help with "the average person". | Rationale asked plainly; a stated preference for in-house is accepted and nurtured, not argued down. | Framework §6. |
| `emotional-history` | A05 tree: never looked / looked-not-proceeded / proceeded good / proceeded bad. | Source tree kept, plus explicit branches: mixed result, still-active provider, changed priorities, no actual problem, no authority or budget, unknown, declined. | Brief §6 — explicit Apohenia additions; no buyer is walked through every branch. |
| `emotional-prevented-shifted` | E03/E04; the reviewed call moves on when the reason is plausible (A13). | Plausible-reason branch to criteria; still-constrained branch to diagnosis; the optional identity frame is a labelled practice-only branch. | Framework §6–§7. |
| `identity-frame-study` | B10 optional identity frame (D06–D11) incl. contrast and shame questions (D03–D05, D08–D10 study_only). | Marked `practice_only`; cites only the private_training records D06/D07/D11; never an entry node; skipped in live calls. | Framework §7; brief §3 (study_only never auto-live). |
| `future-tangible`, `future-word-meaning` | Positive future with detail probes; the customer's own word ("gratification") clarified, not swapped (F04, V43). | B2B first, owner meaning only if offered; the word probe is a dedicated node. | Framework §8. |
| `consequence-trajectory` | C01 time-horizon consequence; C06 (study_only) aims for "regret"; the instructors seek a sharp positive/negative contrast. | Calm cost-of-inaction question; completion requires one or two stated consequences **or** an honest "not much" — no emotional word ever required. C06 excluded. | Brief §6; framework §8. |
| `commit-responsibility` | P03 "whose responsibility"; B03 says inappropriate for some owners. | Optional branch only; used to learn the decision role, never to shame a delegated decision. | Framework §9. |
| `pitch-pillar-1..3` | P05/P06 checks; example pillar names portal / coaching / consistency. | Pillar names and delivery come from the offer via slots (`{pillar_N_name}`, `{pillar_N_delivery}`); the source examples are never used. | Brief §5. |
| `decision-price` | P10 states price then asks how to proceed; A places price after pillars, B allows price first. | Price interpolated only from a published, non-fictional offer with a complete price; otherwise "Price not approved yet — route to scope conversation". Price-first is a separate `ScriptVersion` (`price_placement: price_first`), locked per cohort, never switched mid-call. | Brief §5; framework §9, §16. |
| `concern-*` | Money-first logistics (O01–O07), time two-people identity ritual (O09–O11), partner crown sequence (O14–O21), four fear reframes with analogies (O23/O24/O27–O29), apology exit. | Diagnose the actual constraint first; budget, time, authority and fit as independent blockers; staged milestones / narrow scope / agreed dates as remedies; only the diagnostic questions O01/O02/O04/O06/O08/O13/O22/O25/O26/O30 are cited; no analogy, no ritual, no minimum number of attempts. | Framework §10; scenario 37. |
| `exit-no-sale`, `exit-stop` | End after four reframes with an apology implying the prospect will suffer. | Respectful no-sale exit with a free resource offered once; immediate stop on any opt-out, persisted. | Framework §10; scenarios 5, 17, 40. |
| `followup-*` | B17 nurture-first; U06 (study_only) teases someone who did not watch; U08 (study_only) asks about collecting funds. | Nurture-first kept; rescheduling without guilt; the agreed follow-up node also carries scope, pilot and deferral dates; U06/U08 excluded. | Framework §5, §13. |
| `referral-*` | Success-point referral; R04 (study_only) insists after no answer. | Satisfaction and progress checked first (unfulfilled → service repair); ask once; referred contacts stay out of automatic campaigns. | Framework §13. |
| `upsell-feedback`, `upsell-next-goal` | B20 recommends a customer-support pretext and implied credit. | Honest feedback and delivered results first; no pretext, no invented credit. | Framework §13. |
| `upsell-service-repair` | None. | An unfulfilled original promise routes to repair inside the original scope before any new offer. | Scenario 39. |
| `upsell-closer-compare` | Y09–Y11 fit / why / key pillar. | Explicit previous-versus-new difference; "no genuine added value" routes to exit. | Framework §13; scenario 39. |

**Study_only records referenced only in notes (never as live nodes):** L06, C06, O05, O09–O11, O14–O21, O23, O24, O27–O29, U06, U08, R04, D03–D05, D08–D10. **Private_training records:** D06, D07, D11 — only on the practice-only identity frame.

---

## Entrypoints

| Entrypoint | Entry node |
|---|---|
| cold | `cold-open` |
| inbound | `inbound-callback-open` |
| handoff | `handoff-recap` |
| follow_up | `followup-reconnect` |
| referral | `referral-checkin` |
| upsell | `upsell-feedback` |

## Pillars used by the pitch (from the draft offer, via slots)

1. **Same-day inquiry response** — Every website inquiry is acknowledged and routed through the dealership's existing channel inside an agreed response window, with the arrival time recorded.
2. **One named handoff** — Each inquiry is assigned to one named staff member with a visible status that they update as they work it; unclaimed inquiries are surfaced, not lost.
3. **One honest reporting view** — One view — arrival, first response, owner, status — for one rooftop, exported as a weekly summary; numbers are counts of recorded events, not projections.

Price: setup Not set · recurring Not set (not set). A blank price is not $0.

## Entry (5 nodes)

### `cold-open` · cold permission

- **Roles:** cold, setter · **approval:** draft
- **Say this:** “Hi {prospect_name}, this is Jason with Apohenia. I'm calling because I work on what happens after someone submits an inquiry on a dealership website — is this a bad time, or can I take sixty seconds to say why I called {dealership_name} specifically?”
- **Cites:** — none (Apohenia addition)
- **Seeks:** Permission to continue (yes / not now / no), or a redirect to the right person.
- **Slots:** `{prospect_name}`, `{dealership_name}`
- **Mirrors:** “Is now workable for a quick one, or would a scheduled fifteen minutes be easier?” · “Do I have you at a reasonable moment, {prospect_name}, or should I try another time?”
- **Why now:** Permission first: a cold call has no lead action to lean on, so the only honest opening is to ask for a minute and state a specific, relevant reason.
- **Listen for:** A clear yes versus a polite non-answer; who actually owns web inquiries at this store; any sign they want to end the call.
- **Complete when:** The person has explicitly said go ahead, named a better time, redirected to a colleague, or declined. Silence is not permission.
- **Branches:** Go ahead → intent-tangible · Not the right person / gatekeeper → cold-gatekeeper · Bad time → cold-short-meeting · Not relevant to us → exit-no-sale · Asks not to be called → exit-stop
- **Stop/skip:** Opt-out or do-not-call request at any point → exit-stop immediately. Number is suppressed or jurisdiction unknown → do not place the call at all (dialing policy, not this node).
- **Delivery (instructor-described):** Casual (instructor-described: A — open posture, visible hands; B — conversational, your own natural vocabulary). Instructor-described cue, not audio-verified. Pacing: Instructor-described: relaxed conversational pace; say it once and stop.
- **Source note:** Apohenia addition — the source explains a warm-lead opener only (I01–I03) and does not supply a permission-first cold dealership script (framework §2, §16).

### `cold-gatekeeper` · cold gatekeeper

- **Roles:** cold, setter · **approval:** draft
- **Say this:** “Understood. Who looks after the website inquiries at {dealership_name} — the general manager or the internet manager? I'd rather ask them directly than leave a message that misses.”
- **Cites:** — none (Apohenia addition)
- **Seeks:** The name or role of the person who owns web inquiries, and how to reach them.
- **Slots:** `{dealership_name}`
- **Mirrors:** “If a web inquiry came in right now, whose desk would it land on?” · “Who would you point a customer to if they asked about an inquiry they'd sent through the site?”
- **Why now:** The gatekeeper controls the route; asking for the actual owner respects their role and avoids pitching the wrong person.
- **Listen for:** A real name and role; whether the gatekeeper is screening or genuinely unsure; an implicit no.
- **Complete when:** A named owner or role is obtained, a transfer happens, a message is accepted, or the gatekeeper declines.
- **Branches:** Transferred → cold-open · Name and time given → followup-agree · Will take a message → followup-agree · Declines to route → exit-stop
- **Stop/skip:** Any request not to call again → exit-stop. If transferred, re-open with permission (cold-open) — do not assume the new person has agreed to anything.
- **Delivery (instructor-described):** Casual (instructor-described: A — open posture, visible hands; B — conversational, your own natural vocabulary). Instructor-described cue, not audio-verified. Pacing: Instructor-described: relaxed conversational pace; say it once and stop.
- **Source note:** Apohenia addition — no gatekeeper route exists in the source (framework §2).

### `cold-short-meeting` · cold short meeting

- **Roles:** cold, setter · **approval:** draft
- **Say this:** “No problem. Would fifteen minutes at a time you pick be easier? I'd show you one thing about how {dealership_name}'s web inquiries are handled today, and you decide whether it's worth more than that.”
- **Cites:** — none (Apohenia addition)
- **Seeks:** Agreement to a short, scheduled meeting with a chosen time — or a decline.
- **Slots:** `{dealership_name}`
- **Mirrors:** “Would a short scheduled call be less disruptive than me catching you cold?” · “Is there a day this week or next when fifteen minutes would not be a nuisance?”
- **Why now:** A short-meeting alternative respects a bad moment without losing the thread; it gives the person control over when.
- **Listen for:** Whether the "bad time" is real or a polite no; a concrete day or hour.
- **Complete when:** A specific time is agreed, the person chooses to continue now, or they decline.
- **Branches:** Time agreed → followup-agree · Wants to talk now → intent-tangible · Declines → exit-no-sale · Asks not to be called → exit-stop
- **Stop/skip:** Opt-out → exit-stop. A second "not now" without a time → exit-no-sale; do not push a third time.
- **Delivery (instructor-described):** Casual (instructor-described: A — open posture, visible hands; B — conversational, your own natural vocabulary). Instructor-described cue, not audio-verified. Pacing: Instructor-described: relaxed conversational pace; say it once and stop.
- **Source note:** Apohenia addition — the short-meeting alternative is not in the source (framework §2).

### `inbound-callback-open` · inbound confirm

- **Roles:** inbound, setter · **approval:** draft
- **Say this:** “Hi, is this {prospect_name}? It's Jason with Apohenia — you {documented_action} about how {dealership_name} handles website inquiries. Did I get that right?”
- **Cites:** I01 (adapt), I02 (adapt)
- **Seeks:** Confirmation of the person and of the actual lead action that created this callback.
- **Slots:** `{prospect_name}`, `{documented_action}`, `{dealership_name}`
- **Mirrors:** “Am I speaking with {prospect_name}? I have a note that you {documented_action} — is that correct?” · “Before I go on — you're the person who {documented_action}, is that right, or did someone else at {dealership_name} send it in?”
- **Why now:** The source ties the call back to the action that created the lead so the conversation starts from something real the person did (I01–I02).
- **Listen for:** Whether they own the action or were delegated; the words they use for the inquiry problem — those become {their_word} later.
- **Complete when:** Both the identity and the lead action are confirmed, corrected, or explicitly unknown.
- **Branches:** Confirmed → intent-tangible · Doesn't recall the action → intent-tangible · Wrong person → exit-stop · Asks not to be called → exit-stop
- **Stop/skip:** Opt-out → exit-stop. Wrong person → apologise and stop; do not pitch whoever answered.
- **Delivery (instructor-described):** Casual (instructor-described: A — open posture, visible hands; B — conversational, your own natural vocabulary). Instructor-described cue, not audio-verified. Pacing: Instructor-described: relaxed conversational pace; say it once and stop.

### `handoff-recap` · handoff recap

- **Roles:** handoff, closer · **approval:** draft
- **Say this:** “Before we go on — my colleague's notes say: {setter_notes}. Is that about right, or did anything get lost between the two conversations?”
- **Cites:** I08 (adapt)
- **Seeks:** Confirmation, correction, or a gap in the setter notes (goal, problem, impact).
- **Slots:** `{setter_notes}`
- **Mirrors:** “Let me read back what I have, and you correct me where I'm wrong: {setter_notes}.” · “What did you want to make sure I already knew before we start?”
- **Why now:** The source avoids repeating the setting call by recapping and confirming; Apohenia adds the evidence check so disputed or missing notes are not skipped over.
- **Listen for:** Corrections in the prospect's own words; hesitation on a specific item; the setter's paraphrase being mistaken for the prospect's statement.
- **Complete when:** The prospect has confirmed or corrected each of goal, problem and impact; missing items are identified by name.
- **Branches:** Confirmed → emotional-rationale · Goal missing or disputed → intent-tangible · Process / problem disputed → logical-process · Declines to continue → exit-stop
- **Stop/skip:** Opt-out → exit-stop. If no notes exist, skip the recap entirely and start at intent.
- **Delivery (instructor-described):** Casual (instructor-described: A — open posture, visible hands; B — conversational, your own natural vocabulary). Instructor-described cue, not audio-verified. Pacing: Instructor-described: relaxed conversational pace; say it once and stop.
- **Source note:** Source lineage I08; the missing-or-disputed routing is an Apohenia addition (framework §2).

## Intent (2 nodes)

### `intent-tangible` · tangible

- **Roles:** cold, inbound, setter, closer · **approval:** draft
- **Say this:** “What had you looking at this — specifically, what would you want to be different about how {dealership_name} handles website inquiries?”
- **Cites:** I03 (adapt), I06 (adapt), I07 (adapt)
- **Seeks:** A tangible: the desired future result for web inquiries (a state, a number, or a change), not a biography.
- **Slots:** `{dealership_name}`
- **Mirrors:** “If this went well, what would you want it to change for the store?” · “What would you need to see on inquiries for you to say this was worth it?”
- **Why now:** The tangible is the anchor everything later refers back to; the source asks one intent question, not both variants (I06 for improvement, I07 for a new activity).
- **Listen for:** A result versus a wish; the exact noun they use for the problem (inquiries, leads, forms) — keep their word.
- **Complete when:** One desired future result about inquiries is stated in the prospect's words, or the prospect states they have no goal (accepted).
- **Branches:** Tangible stated → intent-experience · Already described the problem too → logical-process · Just exploring / no goal → followup-agree · Declines to say → exit-no-sale
- **Stop/skip:** Opt-out → exit-stop. Skip when the tangible is already on record (evidence-satisfied).
- **Delivery (instructor-described):** Curious (instructor-described: A — head tilt, squint, upward inflection; B — lower the guard, first-person demonstration). Instructor-described cue, not audio-verified. Pacing: Instructor-described: brisker early-discovery pace; ask, then leave a full beat of silence.

### `intent-experience` · experience

- **Roles:** cold, inbound, setter, closer · **approval:** draft
- **Say this:** “What have you seen that tells you the inquiries aren't turning into {stated_goal} the way you'd want?”
- **Cites:** I04 (adapt), M02 (adapt), M03 (adapt)
- **Seeks:** The past or present experience behind the goal — an observed gap, not a restatement of the goal.
- **Slots:** `{stated_goal}`
- **Mirrors:** “What would fixing that let the store do that it cannot do now?” · “How is the current situation showing up week to week — what do you actually notice?”
- **Why now:** The source distinguishes the tangible (want) from the experience (what they have seen); the mirror switches to what the goal would allow when only the goal comes back (framework §3).
- **Listen for:** An observed event with a rough number or date; whether they are guessing or reporting.
- **Complete when:** One concrete observation about the current inquiry handling is stated; "I do not have that problem" counts as a complete, accepted answer.
- **Branches:** Experience given → logical-process · Repeated a generic goal → intent-experience · No actual problem → exit-no-sale · Declines to say → logical-process
- **Stop/skip:** Opt-out → exit-stop. Skip when an experience is already on record.
- **Delivery (instructor-described):** Curious (instructor-described: A — head tilt, squint, upward inflection; B — lower the guard, first-person demonstration). Instructor-described cue, not audio-verified. Pacing: Instructor-described: brisker early-discovery pace; ask, then leave a full beat of silence.

## Logical certainty (5 nodes)

### `logical-process` · current process

- **Roles:** cold, inbound, setter, closer · **approval:** draft
- **Say this:** “Walk me through what happens today when someone sends an inquiry through the website — who sees it first, and what happens next?”
- **Cites:** L01 (adapt)
- **Seeks:** The current process: where inquiries land, who is notified, who responds, and how a response is tracked.
- **Slots:** none
- **Mirrors:** “If I sent a test inquiry through your site right now, what would happen to it in the first hour?” · “Who would be the first human to see a web inquiry, and how would they know it arrived?”
- **Why now:** Logical certainty starts with the current process because every later question (what they like, what they would change, the impact) refers back to it (L01).
- **Listen for:** Handoffs with no owner; steps that depend on one person; the tool they name — it becomes the "one existing channel".
- **Complete when:** The path of an inquiry from arrival to first human action is described, or the prospect says they do not know (accepted).
- **Branches:** Process described → logical-history · Already on record → logical-preserve · Doesn't know → followup-agree · Declines → exit-no-sale
- **Stop/skip:** Opt-out → exit-stop. Skip when {current_process} is already known.
- **Delivery (instructor-described):** Curious (instructor-described: A — head tilt, squint, upward inflection; B — lower the guard, first-person demonstration). Instructor-described cue, not audio-verified. Pacing: Instructor-described: brisker early-discovery pace; ask, then leave a full beat of silence.

### `logical-history` · duration origin

- **Roles:** cold, inbound, setter, closer · **approval:** draft
- **Say this:** “How long has it worked that way — and what led you to set it up like that in the first place?”
- **Cites:** L02 (adapt), L03 (adapt)
- **Seeks:** The age of the current process and its original rationale (inherited, chosen, imposed by a vendor).
- **Slots:** none
- **Mirrors:** “Was this set up on purpose, or did it just settle into place?” · “Roughly when did the current way of handling inquiries start?”
- **Why now:** The source treats the origin question as a gentle doubt question: hearing themselves explain an inherited process is what opens them to a different one (L02–L03).
- **Listen for:** "Nobody decided" — the process was never chosen; a vendor default; a person who has since left.
- **Complete when:** A rough duration and an origin are stated, or the prospect declines (accepted).
- **Branches:** Answered → logical-preserve · Declines → logical-preserve
- **Stop/skip:** Opt-out → exit-stop. Skip when {process_duration} is already known.
- **Delivery (instructor-described):** Curious (instructor-described: A — head tilt, squint, upward inflection; B — lower the guard, first-person demonstration). Instructor-described cue, not audio-verified. Pacing: Instructor-described: brisker early-discovery pace; ask, then leave a full beat of silence.

### `logical-preserve` · valued elements

- **Roles:** cold, inbound, setter, closer · **approval:** draft
- **Say this:** “Setting the follow-through problem aside for a second — is there anything about the current setup you'd want to keep, whatever changes?”
- **Cites:** L04 (adapt), L05 (adapt)
- **Seeks:** What the prospect values in the present approach, or an explicit "nothing" — accepted as is.
- **Slots:** none
- **Mirrors:** “If the process changed tomorrow, what would the team be upset to lose?” · “Which part of the current handling is actually working for you?”
- **Why now:** Asking what should be preserved keeps the conversation fair and tells you what the offer must not break (the one existing channel, the one handoff).
- **Listen for:** Tools or people that must stay; a "nothing" said with relief versus with frustration.
- **Complete when:** A valued element is named, or the prospect states there is nothing they like. Do NOT push a "nothing" back into a positive.
- **Branches:** Something to keep → logical-change · Nothing liked → logical-change · Declines → logical-change
- **Stop/skip:** Opt-out → exit-stop. Skip when {preserved_element} is already known.
- **Delivery (instructor-described):** Curious (instructor-described: A — head tilt, squint, upward inflection; B — lower the guard, first-person demonstration). Instructor-described cue, not audio-verified. Pacing: Instructor-described: brisker early-discovery pace; ask, then leave a full beat of silence.
- **Source note:** Adaptation: the source (L06, study_only) forces a no-answer back into a positive to appear unbiased. Apohenia asks what should be preserved but accepts that nothing is liked (framework §4). L06 is cited here only as a note and is not a live node.

### `logical-change` · specific problem

- **Roles:** cold, inbound, setter, closer, follow_up · **approval:** draft
- **Say this:** “If you could change one thing about the process or the results, what would it be?”
- **Cites:** L07 (adapt), L08 (adapt), L09 (adapt)
- **Seeks:** One specific problem in the current process or its results, in concrete terms (not a label).
- **Slots:** none
- **Mirrors:** “What do you mean by that — can you give me an example from last week?” · “How do you mean — what does that look like on an actual inquiry?”
- **Why now:** After positives, the source asks for the specific problem and immediately clarifies labels (L07–L09); the clarified problem becomes {stated_problem} for every later node.
- **Listen for:** The prospect's own word for the problem — pin it; a number or time-of-day pattern; a person-dependency.
- **Complete when:** A specific, concrete problem is stated (or clarified via the probe), or the prospect says there is nothing to change (accepted).
- **Branches:** Specific problem → logical-impact · Label only → logical-change · Nothing to change → exit-no-sale · Declines → exit-no-sale
- **Stop/skip:** Opt-out → exit-stop. Skip when {stated_problem} is already known.
- **Delivery (instructor-described):** Curious (instructor-described: A — head tilt, squint, upward inflection; B — lower the guard, first-person demonstration). Instructor-described cue, not audio-verified. Pacing: Instructor-described: brisker early-discovery pace; ask, then leave a full beat of silence.

### `logical-impact` · duration impact

- **Roles:** cold, inbound, setter, closer · **approval:** draft
- **Say this:** “How long has {stated_problem} been going on — and has it affected anything downstream, like appointments kept or what your staff spend their time on?”
- **Cites:** L10 (adapt), L12 (adapt), L13 (adapt), L14 (adapt)
- **Seeks:** The problem duration (distinct from process duration) and a downstream impact — operational, economic or personal — in their words.
- **Slots:** `{stated_problem}`
- **Mirrors:** “How so, just so I understand — what has it changed for the store?” · “When did you first notice it, and what has it cost you that you can point to?”
- **Why now:** Impact ties the process to a cost the prospect states themselves; in the reviewed call (A13) this was quantified rather than emotionalised (framework §4).
- **Listen for:** Verified counts versus estimates versus feelings — keep them labelled separately; who pays the cost (staff time, the manager, the customer).
- **Complete when:** A duration and at least one concrete impact are stated, OR the prospect says the impact is small or unknown (accepted; not escalated).
- **Branches:** Impact described (setter path) → setter-target-gap · Impact described (closer path) → emotional-rationale · No meaningful impact → followup-agree · Declines → setter-target-gap
- **Stop/skip:** Opt-out → exit-stop. Skip when {stated_impact} is already known.
- **Delivery (instructor-described):** Skeptical / probing (instructor-described: A — lean back, brow cue; B — leaning out, used in the first half of emotional certainty). Instructor-described cue, not audio-verified. Pacing: Instructor-described: slow down slightly; let the question sit rather than filling the gap.

## Setter transition (3 nodes)

### `setter-target-gap` · target gap

- **Roles:** setter, cold, inbound · **approval:** draft
- **Say this:** “In six months, where would you want {dealership_name} to be on this — say, what share of inquiries answered the same day, or how many turning into appointments? And where is it now?”
- **Cites:** S01 (adapt), S02 (adapt)
- **Seeks:** A target metric for inquiries and the current baseline (or an honest "I do not know the baseline").
- **Slots:** `{dealership_name}`
- **Mirrors:** “If this were working, what number would you look at each Monday to know?” · “What would "fixed" look like in six months, in terms you could check?”
- **Why now:** The setter needs a target and a gap to judge whether a longer conversation is relevant (S01–S02); it is a relevance check, not an affordability test.
- **Listen for:** Whether the number is a wish or a plan; whether they can measure it today.
- **Complete when:** A target and a baseline (or an explicit unknown baseline) are stated. Neither establishes budget or affordability.
- **Branches:** Target and gap stated → setter-permission · Signals this may be too small a priority to fund → setter-spend-conditional · Unknown → setter-permission · Declines → setter-permission
- **Stop/skip:** Opt-out → exit-stop. Skip when {target_metric} is already known.
- **Delivery (instructor-described):** Curious (instructor-described: A — head tilt, squint, upward inflection; B — lower the guard, first-person demonstration). Instructor-described cue, not audio-verified. Pacing: Instructor-described: brisker early-discovery pace; ask, then leave a full beat of silence.

### `setter-spend-conditional` · spend conditional

- **Roles:** setter, cold, inbound · **approval:** draft
- **Say this:** “If there were a bounded way to close that gap, is this something {dealership_name} would put budget toward this year — or is it more of a look-around for now?”
- **Cites:** S03 (adapt)
- **Seeks:** Whether the store would fund a bounded fix at all — a priority signal, not a budget figure.
- **Slots:** `{dealership_name}`
- **Mirrors:** “Is fixing inquiry follow-through something with a budget owner at the store, or is it not there yet?” · “Would this be a this-quarter decision or a someday one?”
- **Why now:** A03 makes the spend question conditional on a low-qualification signal; Apohenia keeps it as a branch, not a gate, so nobody is means-tested by default.
- **Listen for:** A budget owner other than the speaker; a freeze with a date; "depends on price" (legitimate — price is not yet approved).
- **Complete when:** A yes / not now / not my call is stated. Theoretical willingness never establishes affordability (framework §5).
- **Branches:** Would fund a bounded fix → setter-permission · Not now / look-around → followup-agree · Not their call → followup-agree · Declines → setter-permission
- **Stop/skip:** Only reached via the conditional branch of setter-target-gap; never asked universally. Opt-out → exit-stop.
- **Delivery (instructor-described):** Casual (instructor-described: A — open posture, visible hands; B — conversational, your own natural vocabulary). Instructor-described cue, not audio-verified. Pacing: Instructor-described: relaxed conversational pace; say it once and stop.
- **Source note:** Source S03 is conditional in A and broader in B (framework §16); Apohenia keeps the conditional form only.

### `setter-permission` · permission to connect

- **Roles:** setter, cold, inbound, follow_up, upsell · **approval:** draft
- **Say this:** “Would it make sense to set up a longer conversation where we go through your inquiry flow properly and see whether help is actually warranted? How does that sound?”
- **Cites:** S04 (adapt), S05 (adapt), X09 (adapt), X10 (adapt)
- **Seeks:** Permission to schedule the deeper conversation (with a time), a preference to be nurtured first, or a decline.
- **Slots:** none
- **Mirrors:** “Would it be useful to book thirty minutes to look at this properly, or would you rather have the one-page checklist first?” · “Is a longer look at this something you would want, or is now not the time?”
- **Why now:** The setter call ends with permission to connect, not a pitch (S04); the nurture-first option (B17) is offered without guilt.
- **Listen for:** A concrete time; who else should be on the call; whether "send me something" is interest or a soft no.
- **Complete when:** A yes with a time, a nurture-first preference, or a decline. "Would that be awful?" (S05) is a source alternate, not required.
- **Branches:** Agreed → followup-agree · Prefers a resource first → followup-agree · Declines → exit-no-sale · Asks not to be contacted → exit-stop
- **Stop/skip:** Opt-out → exit-stop. In an upsell setting, this is the transition to advanced help (X09/X10); never imply a credit or "no extra money" that is not in an approved offer.
- **Delivery (instructor-described):** Casual (instructor-described: A — open posture, visible hands; B — conversational, your own natural vocabulary). Instructor-described cue, not audio-verified. Pacing: Instructor-described: relaxed conversational pace; say it once and stop.

## Emotional certainty (6 nodes)

### `emotional-rationale` · rationale

- **Roles:** closer, handoff · **approval:** draft
- **Say this:** “Besides {stated_problem}, what's the main reason you'd look at outside help on this rather than tightening it up in-house?”
- **Cites:** E01 (adapt), V24 (adapt)
- **Seeks:** The prospect's own argument for outside help versus continuing alone (or a stated preference for in-house).
- **Slots:** `{stated_problem}`
- **Mirrors:** “What has stopped this from getting fixed with the people and tools you already have?” · “If you did it in-house, what would get in the way?”
- **Why now:** The source prehandles the DIY objection by letting the prospect state why outside help; Apohenia drops the source's negative contrast with "the average person" (framework §6).
- **Listen for:** Prior in-house attempts and why they drifted; whether the real reason is time, skill or ownership.
- **Complete when:** A reason for seeking outside help is stated in their words, or a preference for in-house is stated (accepted — no rhetorical contrast with "the average person").
- **Branches:** Rationale given → emotional-history · Prefers in-house → followup-agree · Declines → emotional-history
- **Stop/skip:** Opt-out → exit-stop. Skip when {rationale} is already known.
- **Delivery (instructor-described):** Skeptical / probing (instructor-described: A — lean back, brow cue; B — leaning out, used in the first half of emotional certainty). Instructor-described cue, not audio-verified. Pacing: Instructor-described: slow down slightly; let the question sit rather than filling the gap.

### `emotional-history` · decision history

- **Roles:** closer, handoff · **approval:** draft
- **Say this:** “Before we spoke, had you looked at other ways to fix this — and if so, did you go ahead with anything, and how did it turn out?”
- **Cites:** E02 (adapt), E05 (adapt), E06 (adapt), V27 (adapt), V28 (adapt)
- **Seeks:** Decision history: never looked / looked but did not proceed / proceeded with a good, bad or mixed result / still using a provider — plus the Apohenia additions (changed priorities, no actual problem, no authority or budget, unknown, declined).
- **Slots:** none
- **Mirrors:** “Is this the first time you have looked at fixing inquiry follow-through, or have you been down this road before?” · “What have you already tried on this, paid or unpaid — and what happened?”
- **Why now:** The A05 decision tree surfaces the reason most likely to return as an objection; the extra branches are explicit Apohenia additions so real situations are not forced into the four source outcomes (framework §6).
- **Listen for:** Who made the previous decision; what "bad" actually meant (speed, quality, cost); whether a provider is still under contract.
- **Complete when:** One decision-history branch is identifiable from their answer; unknown and declined are complete answers.
- **Branches:** Never looked → emotional-prevented-shifted · Looked, did not proceed → emotional-prevented-shifted · Proceeded — bad result → emotional-criteria · Proceeded — good result → emotional-good-why · Proceeded — mixed result → emotional-criteria · Still using a provider → emotional-good-why · Priorities changed since → emotional-prevented-shifted · No actual problem → exit-no-sale · No authority or budget → concern-authority · Unknown → future-tangible · Declines to answer → future-tangible
- **Stop/skip:** Opt-out → exit-stop. Skip when {decision_history} is already known. Do not walk every buyer through every branch.
- **Delivery (instructor-described):** Skeptical / probing (instructor-described: A — lean back, brow cue; B — leaning out, used in the first half of emotional certainty). Instructor-described cue, not audio-verified. Pacing: Instructor-described: slow down slightly; let the question sit rather than filling the gap.
- **Source note:** Source tree E02/E05/E06; the mixed-result, still-active-provider, changed-priorities, no-actual-problem, no-authority/budget, unknown and declined branches are Apohenia additions (brief §6).

### `emotional-prevented-shifted` · prevented shifted

- **Roles:** closer, handoff · **approval:** draft
- **Say this:** “What got in the way then — and what's different now that has you looking at it?”
- **Cites:** E03 (adapt), E04 (adapt)
- **Seeks:** The prior barrier and what has changed (or an honest statement that the constraint still exists).
- **Slots:** none
- **Mirrors:** “Was there a specific reason it did not go ahead before, and is that reason gone or still here?” · “What would have to be true now for this to actually happen, that was not true then?”
- **Why now:** What prevented / what shifted is the source's way to hear the future objection before the pitch (E03–E04); when the reason is plausible, the reviewed call moves on instead of insisting (A13).
- **Listen for:** A constraint that is still present (budget, staffing, authority) — route to diagnosis, not to a pep talk.
- **Complete when:** A barrier and a shift are stated, OR the prospect states the constraint remains. A stated shift is not treated as permanent removal of a real constraint.
- **Branches:** Shift explained → future-tangible · Plausible reason for the timing — move to criteria → emotional-criteria · Still constrained → concern-diagnose · Optional identity frame (study/practice only) → identity-frame-study · Declines → future-tangible
- **Stop/skip:** Opt-out → exit-stop. Skip when {shift_reason} is already known.
- **Delivery (instructor-described):** Skeptical / probing (instructor-described: A — lean back, brow cue; B — leaning out, used in the first half of emotional certainty). Instructor-described cue, not audio-verified. Pacing: Instructor-described: slow down slightly; let the question sit rather than filling the gap.

### `emotional-criteria` · ideal criteria

- **Roles:** closer, handoff · **approval:** draft
- **Say this:** “Given how that went, what would you need to see this time to feel it could actually work here?”
- **Cites:** E07 (adapt), V29 (adapt), V30 (adapt), V31 (adapt)
- **Seeks:** Ideal criteria: what a solution must show or do this time, in checkable terms.
- **Slots:** none
- **Mirrors:** “What did the last attempt get wrong that a new one would have to get right?” · “If you were writing the acceptance test yourself, what would be on it?”
- **Why now:** After a bad or mixed result the source asks for ideal criteria (E07); these become the acceptance criteria in the scope, so only deliverable matches are promised.
- **Listen for:** Criteria the draft offer cannot meet (e.g. a lender integration) — say so plainly rather than nodding.
- **Complete when:** At least one checkable criterion is stated; only deliverable, approved matches may later be fed into the pitch.
- **Branches:** Criteria given → future-tangible · Unknown → future-tangible · Declines → future-tangible
- **Stop/skip:** Opt-out → exit-stop. Skip when {ideal_criteria} is already known.
- **Delivery (instructor-described):** Curious (instructor-described: A — head tilt, squint, upward inflection; B — lower the guard, first-person demonstration). Instructor-described cue, not audio-verified. Pacing: Instructor-described: brisker early-discovery pace; ask, then leave a full beat of silence.

### `emotional-good-why` · remaining bottleneck

- **Roles:** closer, handoff · **approval:** draft
- **Say this:** “If that worked for you, what has you looking at something further now?”
- **Cites:** E08 (adapt)
- **Seeks:** The remaining bottleneck or new reason to change a previously working approach — or confirmation that no gap exists.
- **Slots:** none
- **Mirrors:** “What does the current setup not do that you wish it did?” · “Where does it still fall short, if anywhere?”
- **Why now:** A good prior result needs a new bottleneck to justify change (E08); if there is none, the honest route is to say so and leave.
- **Listen for:** An unfulfilled promise from the existing provider versus a genuinely new need.
- **Complete when:** A remaining bottleneck is named, or the prospect confirms the current provider covers it (accepted → respectful exit).
- **Branches:** Bottleneck named → future-tangible · Current provider covers it — no gap → exit-no-sale · Declines → future-tangible
- **Stop/skip:** Opt-out → exit-stop. Skip when {remaining_bottleneck} is already known.
- **Delivery (instructor-described):** Curious (instructor-described: A — head tilt, squint, upward inflection; B — lower the guard, first-person demonstration). Instructor-described cue, not audio-verified. Pacing: Instructor-described: brisker early-discovery pace; ask, then leave a full beat of silence.

### `identity-frame-study` · identity frame optional · **STUDY/PRACTICE ONLY**

- **Roles:** closer · **approval:** draft
- **Say this:** “Study frame, not for live use: Where do you want the store to be on inquiries — and where is it today? Is the way it's run now worth keeping, given it got you here but isn't getting you there? Are you committed to doing what it takes to get there?”
- **Cites:** D06 (private_training), D07 (private_training), D11 (private_training)
- **Seeks:** Study only: a target, a baseline, and a bounded commitment — used to understand the source frame, never as a live recommendation.
- **Slots:** none
- **Mirrors:** “(practice) Is the current approach one you would choose again today, knowing what you know?” · “(practice) What would you be prepared to change to reach that target?”
- **Why now:** The source (B10) places an optional identity frame between "what shifted" and future pacing; Apohenia keeps it as a study/practice exercise so the pattern is understood, not deployed.
- **Listen for:** (practice) Whether the drill drifts into making the purchase a test of the person's worth — that is the failure mode.
- **Complete when:** Practice only: the trainee can name the three moves of the frame (target/baseline, contrast, bounded commitment) and explain why the shame variants (D03–D05) are excluded.
- **Branches:** Practice complete → future → future-tangible · Declines → future-tangible
- **Stop/skip:** ALWAYS skipped in a live call. Only reachable via the explicitly labelled optional branch in practice mode.
- **Delivery (instructor-described):** Concern / empathy (instructor-described: A — lean toward, raised eyebrows; B — slow pacing, and B dislikes the hand-on-heart gesture). Instructor-described cue, not audio-verified. Pacing: Instructor-described: the slowest pacing of the call; follow the prospect's emotional direction, never lead it.
- **Source note:** Study/practice only. Cites private_training records D06/D07/D11. Source contrast questions D08–D10 and the shame/identity questions D03–D05 are study_only and are deliberately NOT part of this node or any live node (framework §7).

## Positive future (2 nodes)

### `future-tangible` · positive future

- **Roles:** closer, handoff, upsell · **approval:** draft
- **Say this:** “If the inquiry follow-through were handled the way you want, what would tangibly be different for {dealership_name} — two or three specific things?”
- **Cites:** F03 (adapt), F05 (adapt), F10 (adapt), F11 (adapt), Y05 (adapt), Y06 (adapt), V34 (adapt)
- **Seeks:** Two or three specific future outcomes for the business (and, only if offered, for the owner personally).
- **Slots:** `{dealership_name}`
- **Mirrors:** “In which situations would the difference show up most — a Saturday, a Monday, a month-end?” · “How would that change what you do on a normal week, practically?”
- **Why now:** For B2B the source future-paces the business first (F10/F11) and only then the owner, and asks for details behind any vague word (framework §8).
- **Listen for:** A word that clearly matters to them (their 'gratification') — pin it and probe its meaning rather than swapping in a synonym.
- **Complete when:** Two or three specific outcomes are stated for the business; owner-level meaning is welcome but not required (personal probing is not mandatory — framework §8).
- **Branches:** Specific outcomes → consequence-trajectory · Vague word offered → future-word-meaning · Declines → pitch-permission
- **Stop/skip:** Opt-out → exit-stop. Skip when {future_outcomes} is already known. In an upsell, the future concerns the NEW goal (Y05/Y06), not a replay of the solved one.
- **Delivery (instructor-described):** Curious (instructor-described: A — head tilt, squint, upward inflection; B — lower the guard, first-person demonstration). Instructor-described cue, not audio-verified. Pacing: Instructor-described: brisker early-discovery pace; ask, then leave a full beat of silence.

### `future-word-meaning` · meaning probe

- **Roles:** closer, handoff, upsell · **approval:** draft
- **Say this:** “When you say {their_word} — what does {their_word} mean to you here?”
- **Cites:** F04 (adapt), F09 (adapt), V43 (adapt)
- **Seeks:** The prospect's own definition of their distinctive word, preserved as they say it (never replaced by a synonym).
- **Slots:** `{their_word}`
- **Mirrors:** “What would a week with {their_word} look like, compared with a week without it?” · “If I asked your sales manager what {their_word} means to you, what would they say?”
- **Why now:** The word must mean something to this person (A13 'gratification'); asking what it means keeps their vocabulary intact for the pitch (framework §8).
- **Listen for:** The concrete scene behind the word; whether they accept or correct any paraphrase you offer.
- **Complete when:** A definition in the prospect's words is captured with provenance 'prospect said'; a seller-proposed label counts only if the prospect explicitly confirms it (V25 pattern).
- **Branches:** Meaning given → consequence-trajectory · Still vague → future-tangible · Declines → consequence-trajectory
- **Stop/skip:** Opt-out → exit-stop. Skip when the word is already defined.
- **Delivery (instructor-described):** Curious (instructor-described: A — head tilt, squint, upward inflection; B — lower the guard, first-person demonstration). Instructor-described cue, not audio-verified. Pacing: Instructor-described: brisker early-discovery pace; ask, then leave a full beat of silence.

## Consequence (1 node)

### `consequence-trajectory` · cost of inaction

- **Roles:** closer, handoff, upsell · **approval:** draft
- **Say this:** “And if nothing changes — same process for the next two months, six months, a year — what does that look like for the store, and for you?”
- **Cites:** C01 (adapt), C02 (adapt), C04 (adapt), Y07 (adapt), V45 (adapt)
- **Seeks:** One or two specific stated consequences of the current trajectory (operational, economic or personal), in their words — or "not much" (accepted).
- **Slots:** none
- **Mirrors:** “What would be the day-to-day ramifications of staying where you are on this?” · “What might that mean for you as the manager, a year from now, if it stays the same?”
- **Why now:** The source contrasts the positive future with the cost of inaction (C01); Apohenia records an accurate comparison of options and never scores distress (framework §8).
- **Listen for:** Consequences they state versus ones you are tempted to supply; a calm "not much" is data, not resistance.
- **Complete when:** One or two concrete consequences are stated OR the prospect says the consequence is minor. No specific emotional word is required — 'regret' or any feeling word is never a completion condition.
- **Branches:** Consequences stated → commit-settle · No real consequence → followup-agree · Declines → pitch-permission
- **Stop/skip:** Opt-out → exit-stop. Skip when {stated_consequence} is already known. B2B: the extra feeling question (C05) is optional and skipped by default.
- **Delivery (instructor-described):** Concern / empathy (instructor-described: A — lean toward, raised eyebrows; B — slow pacing, and B dislikes the hand-on-heart gesture). Instructor-described cue, not audio-verified. Pacing: Instructor-described: the slowest pacing of the call; follow the prospect's emotional direction, never lead it.
- **Source note:** Calm consequence only. The source's regret-directed second question (C06) is study_only and is not part of this node or any live node.

## Commitment (3 nodes)

### `commit-settle` · unwilling to settle

- **Roles:** closer, handoff, upsell · **approval:** draft
- **Say this:** “Is that something you're willing to leave as it is — or not?”
- **Cites:** P01 (adapt), V47 (adapt)
- **Seeks:** A plain statement of whether they accept the current trajectory.
- **Slots:** none
- **Mirrors:** “Is the current way of handling inquiries acceptable to you for another year?” · “Who has to make the call about whether this stays as it is?”
- **Why now:** The first source commitment is not accepting the trajectory (P01); asked plainly, without theatre.
- **Listen for:** A "no" that is actually "not my decision" — route to authority, not commitment.
- **Complete when:** A yes or no about settling is stated; "yes, I will leave it" is accepted and routes to a respectful exit.
- **Branches:** Not willing to settle → commit-why-now · Would leave it for now → exit-no-sale · Declines → pitch-permission
- **Stop/skip:** Opt-out → exit-stop. Skip when {not_settling} is already on record.
- **Delivery (instructor-described):** Concern / empathy (instructor-described: A — lean toward, raised eyebrows; B — slow pacing, and B dislikes the hand-on-heart gesture). Instructor-described cue, not audio-verified. Pacing: Instructor-described: the slowest pacing of the call; follow the prospect's emotional direction, never lead it.

### `commit-why-now` · why now

- **Roles:** closer, handoff, upsell · **approval:** draft
- **Say this:** “Why deal with it now rather than, say, next quarter?”
- **Cites:** P02 (adapt), V48 (adapt)
- **Seeks:** The prospect's own reason for acting now (or an honest statement that later is fine).
- **Slots:** none
- **Mirrors:** “What happens between now and next quarter if this waits?” · “Is there a date this needs to be working by?”
- **Why now:** The second source commitment is timing (P02); a genuine "later" is a scheduling answer, not an objection to be broken.
- **Listen for:** A real date or trigger versus politeness; who set the deadline.
- **Complete when:** A reason for now is stated, or the prospect says later is fine (accepted → agreed follow-up date).
- **Branches:** Reason given → pitch-permission · Optional: whose responsibility → commit-responsibility · No reason for now → followup-agree · Declines → pitch-permission
- **Stop/skip:** Opt-out → exit-stop. Skip when {why_now} is already known.
- **Delivery (instructor-described):** Concern / empathy (instructor-described: A — lean toward, raised eyebrows; B — slow pacing, and B dislikes the hand-on-heart gesture). Instructor-described cue, not audio-verified. Pacing: Instructor-described: the slowest pacing of the call; follow the prospect's emotional direction, never lead it.

### `commit-responsibility` · responsibility optional

- **Roles:** closer, handoff · **approval:** draft
- **Say this:** “Whose call is it to change how the store handles this?”
- **Cites:** P03 (adapt)
- **Seeks:** Who holds the decision — the speaker, or another named role.
- **Slots:** none
- **Mirrors:** “If you wanted this changed next week, who would need to say yes?” · “Is this a decision you can make, or one you would take to someone?”
- **Why now:** The source asks whose responsibility the change is (P03); B03 warns it is inappropriate for some owners, so Apohenia keeps it optional and uses it only to learn the decision role.
- **Listen for:** A named second decision-maker — that is a fact for the deal-control sheet, not fear.
- **Complete when:** The decision role is identified. This node is optional and never used to shame a delegated decision.
- **Branches:** Their decision → pitch-permission · Someone else decides → concern-authority · Declines → pitch-permission
- **Stop/skip:** Only reached via the optional branch from commit-why-now. Skip for owners where it would be inappropriate (B03 caveat). Opt-out → exit-stop.
- **Delivery (instructor-described):** Casual (instructor-described: A — open posture, visible hands; B — conversational, your own natural vocabulary). Instructor-described cue, not audio-verified. Pacing: Instructor-described: relaxed conversational pace; say it once and stop.
- **Source note:** P03 kept as an optional branch only; B03 caveat applies (framework §9).

## Pitch (5 nodes)

### `pitch-permission` · permission

- **Roles:** closer, handoff, upsell · **approval:** draft
- **Say this:** “Would it be useful if I laid out how I'd approach this for {dealership_name} — or what would you like to do from here?”
- **Cites:** P04 (adapt), Y08 (adapt)
- **Seeks:** Permission to present the approach, or a stated preference for something else (more time, a resource, ending).
- **Slots:** `{dealership_name}`
- **Mirrors:** “Do you want me to walk through what I would do, or would you rather see it written down first?” · “Is it worth me explaining the three pieces, or have you heard enough?”
- **Why now:** The pitch is presented with permission (P04); the prospect can choose the written route instead and nothing is lost.
- **Listen for:** Who else they want to see it; whether they want price first (a version-level variant, not a mid-call switch).
- **Complete when:** Explicit permission or an explicit alternative is stated.
- **Branches:** Yes — present pillars → pitch-pillar-1 · Yes (upsell) — compare previous and new offer → upsell-closer-compare · Not yet / in writing → followup-agree · Declines → exit-no-sale · Asks to stop → exit-stop
- **Stop/skip:** Opt-out → exit-stop. Skip when permission is already on record.
- **Delivery (instructor-described):** Casual (instructor-described: A — open posture, visible hands; B — conversational, your own natural vocabulary). Instructor-described cue, not audio-verified. Pacing: Instructor-described: relaxed conversational pace; say it once and stop.

### `pitch-pillar-1` · pillar 1

- **Roles:** closer, handoff · **approval:** draft
- **Say this:** “The first piece is {pillar_1_name}. You said {stated_problem} — this is the part that deals with that directly: {pillar_1_delivery}. Does that make sense so far?”
- **Cites:** P05 (adapt), P06 (adapt), P11 (adapt)
- **Seeks:** Confirmation that the first pillar is understood and relevant to their stated problem — or a question or a "not relevant" (recorded, not argued).
- **Slots:** `{pillar_1_name}`, `{pillar_1_delivery}`, `{stated_problem}`
- **Mirrors:** “Is that the part that would matter for you, or is it something else?” · “Does that match what you said the problem was, or have I missed it?”
- **Why now:** Name the pillar → connect it to their stated problem → explain the delivery → check (P05/P06). The first of three, in the order the offer defines.
- **Listen for:** Whether they connect the pillar to their own words; "we already have that" — may be true.
- **Complete when:** A comprehension or relevance check is answered for pillar 1. Pillar names come from the approved offer's pillars via slots — never from the source's portal/coaching/consistency examples.
- **Branches:** Makes sense → pitch-pillar-2 · Has a question → pitch-pillar-1 · Not relevant to them → pitch-pillar-2 · Asks to stop → exit-stop
- **Stop/skip:** Opt-out → exit-stop. If the offer has no approved pillar in this slot, show the missing cue and do not improvise one.
- **Delivery (instructor-described):** Casual-confident for the pitch (instructor-described: A — confident delivery through pillars and price). Instructor-described cue, not audio-verified. Pacing: Instructor-described: steady and even; pause after each check; do not race toward the price.

### `pitch-pillar-2` · pillar 2

- **Roles:** closer, handoff · **approval:** draft
- **Say this:** “The second piece is {pillar_2_name}. That connects to what you said about {stated_problem}: {pillar_2_delivery}. Do you see why that's there?”
- **Cites:** P06 (adapt), P12 (adapt)
- **Seeks:** Confirmation that the second pillar is understood and relevant to their stated problem — or a question or a "not relevant" (recorded, not argued).
- **Slots:** `{pillar_2_name}`, `{pillar_2_delivery}`, `{stated_problem}`
- **Mirrors:** “Is that the part that would matter for you, or is it something else?” · “Does that match what you said the problem was, or have I missed it?”
- **Why now:** Name the pillar → connect it to their stated problem → explain the delivery → check (P05/P06). The second of three, in the order the offer defines.
- **Listen for:** Whether they connect the pillar to their own words; "we already have that" — may be true.
- **Complete when:** A comprehension or relevance check is answered for pillar 2. Pillar names come from the approved offer's pillars via slots — never from the source's portal/coaching/consistency examples.
- **Branches:** Makes sense → pitch-pillar-3 · Has a question → pitch-pillar-2 · Not relevant to them → pitch-pillar-3 · Asks to stop → exit-stop
- **Stop/skip:** Opt-out → exit-stop. If the offer has no approved pillar in this slot, show the missing cue and do not improvise one.
- **Delivery (instructor-described):** Casual-confident for the pitch (instructor-described: A — confident delivery through pillars and price). Instructor-described cue, not audio-verified. Pacing: Instructor-described: steady and even; pause after each check; do not race toward the price.

### `pitch-pillar-3` · pillar 3

- **Roles:** closer, handoff · **approval:** draft
- **Say this:** “The third piece is {pillar_3_name}. Given {stated_problem}, this is what lets you check it without asking anyone: {pillar_3_delivery}. Do you feel that would be helpful for you?”
- **Cites:** P05 (adapt), P06 (adapt)
- **Seeks:** Confirmation that the third pillar is understood and relevant to their stated problem — or a question or a "not relevant" (recorded, not argued).
- **Slots:** `{pillar_3_name}`, `{pillar_3_delivery}`, `{stated_problem}`
- **Mirrors:** “Is that the part that would matter for you, or is it something else?” · “Does that match what you said the problem was, or have I missed it?”
- **Why now:** Name the pillar → connect it to their stated problem → explain the delivery → check (P05/P06). The third of three, in the order the offer defines.
- **Listen for:** Whether they connect the pillar to their own words; "we already have that" — may be true.
- **Complete when:** A comprehension or relevance check is answered for pillar 3. Pillar names come from the approved offer's pillars via slots — never from the source's portal/coaching/consistency examples.
- **Branches:** Makes sense → pitch-fit · Has a question → pitch-pillar-3 · Not relevant to them → pitch-fit · Asks to stop → exit-stop
- **Stop/skip:** Opt-out → exit-stop. If the offer has no approved pillar in this slot, show the missing cue and do not improvise one.
- **Delivery (instructor-described):** Casual-confident for the pitch (instructor-described: A — confident delivery through pillars and price). Instructor-described cue, not audio-verified. Pacing: Instructor-described: steady and even; pause after each check; do not race toward the price.

### `pitch-fit` · fit why most helpful

- **Roles:** closer, handoff · **approval:** draft
- **Say this:** “Based on what we've covered, do you feel this would get {dealership_name} to {stated_goal}? Why — and which part would help most?”
- **Cites:** P07 (adapt), P08 (adapt), P09 (adapt)
- **Seeks:** The prospect's own fit assessment, their reason, and the pillar they value most (their words).
- **Slots:** `{dealership_name}`, `{stated_goal}`
- **Mirrors:** “Which of the three pieces would you actually use on a Monday morning?” · “What would having {key_pillar} do for you personally, day to day?”
- **Why now:** After the pillars the source asks fit, why, and the most helpful part (P07–P09); their answer tells you what to write into the scope.
- **Listen for:** The pillar they name — it is the value driver; a gap they name — it is the next scope conversation.
- **Complete when:** A fit judgement with a reason is stated; an "unsure" or "no" is routed to diagnosis, not argued.
- **Branches:** Fits → decision-price · Doesn't fit → concern-diagnose · Unsure → concern-diagnose · Declines → exit-no-sale
- **Stop/skip:** Opt-out → exit-stop. Skip when {fit_assessment} is already on record.
- **Delivery (instructor-described):** Casual-confident for the pitch (instructor-described: A — confident delivery through pillars and price). Instructor-described cue, not audio-verified. Pacing: Instructor-described: steady and even; pause after each check; do not race toward the price.

## Decision (2 nodes)

### `decision-price` · price after pillars

- **Roles:** closer, handoff, upsell · **approval:** draft
- **Say this:** “The investment for this is {approved_price}. How would you like to proceed?”
- **Cites:** P10 (adapt)
- **Seeks:** A decision or a named concern in response to the approved price — or, when no price is approved, agreement to a scope conversation.
- **Slots:** `{approved_price}`
- **Mirrors:** “Given how you see the value, how would you like to move forward?” · “What would you need from me to make that decision?”
- **Why now:** This version places price after the pillars (A07). A price-first variant exists as a separate version choice (B04) and is never switched mid-call.
- **Listen for:** Whether the reaction is to the amount, the timing, the authority, or the fit — diagnose before responding.
- **Complete when:** The APPROVED price is stated exactly as the offer defines it (setup, recurring, schedule) and a decision or concern is heard. When the offer price is null, this node renders "Price not approved yet — route to scope conversation" and no number is spoken.
- **Branches:** Proceed → decision-next-step · Has a concern → concern-diagnose · Price not approved — scope conversation → followup-agree · Declines → exit-no-sale · Asks to stop → exit-stop
- **Stop/skip:** Opt-out → exit-stop. If the offer version is not published/approved or its price is null → do not quote; route to scope.
- **Delivery (instructor-described):** Casual-confident for the pitch (instructor-described: A — confident delivery through pillars and price). Instructor-described cue, not audio-verified. Pacing: Instructor-described: steady and even; pause after each check; do not race toward the price.
- **Source note:** Price placement is a version-level variant: this version = after_pillars (A07); a price_first version (B04) would be a separate ScriptVersion, locked for a cohort (framework §9, §16).

### `decision-next-step` · next step

- **Roles:** closer, handoff, upsell · **approval:** draft
- **Say this:** “Given how you see the value and that the plan fits, how would you like to proceed — should I send the written scope and acceptance criteria today so you can check them?”
- **Cites:** O07 (adapt), P10 (adapt)
- **Seeks:** A concrete next step with a date: scope sent, access prerequisites, or a deferral with a date.
- **Slots:** none
- **Mirrors:** “What is the next step from your side, and when?” · “What would you need in writing before you could say yes or no?”
- **Why now:** The source re-asks for the decision after concerns are handled (O07); Apohenia makes the next step concrete — a written scope with acceptance tests, not pressure.
- **Listen for:** Access prerequisites and dates; anyone else who must approve; a deferral that needs a real date.
- **Complete when:** A next step and a date are agreed, or a concern is named, or the prospect declines.
- **Branches:** Yes — send scope → followup-agree · Needs time → followup-agree · Has a concern → concern-diagnose · Declines → exit-no-sale
- **Stop/skip:** Opt-out → exit-stop. No proposal or invoice is generated by this node; the deal-control sheet and access prerequisites gate the schedule (brief §18).
- **Delivery (instructor-described):** Casual-confident for the pitch (instructor-described: A — confident delivery through pillars and price). Instructor-described cue, not audio-verified. Pacing: Instructor-described: steady and even; pause after each check; do not race toward the price.

## Concern handling (4 nodes)

### `concern-diagnose` · diagnose constraint

- **Roles:** closer, handoff, upsell · **approval:** draft
- **Say this:** “Fair enough. Set the money and the timing aside for a second — is this the right thing for the store, and is it the right time? And what's actually holding you back: the budget, the timing, who decides, or whether it fits?”
- **Cites:** O01 (adapt), O02 (adapt), O08 (adapt), O22 (adapt)
- **Seeks:** The actual constraint, named by the prospect: budget, time, authority, fit — or none.
- **Slots:** none
- **Mirrors:** “If money and timing were not part of it, would you do this — and if so, what is the part that's in the way?” · “What would have to be true for this to be a yes — and which of those is not true today?”
- **Why now:** The source isolates value before money logistics (O01/O02/O08); Apohenia diagnoses the actual constraint first and keeps budget, time, authority and fit as independent blockers (framework §10).
- **Listen for:** The word they use for the blocker; a constraint that is real and should be respected rather than reframed.
- **Complete when:** One constraint is named (or none). Budget, time, authority and fit are independent blockers; none is relabelled as fear (scenario 37).
- **Branches:** Budget → concern-budget · Timing — deliberate deferral → followup-agree · Authority → concern-authority · Fit / certainty → concern-certainty · No blocker after all → decision-next-step · Declines → exit-no-sale · Asks to stop → exit-stop
- **Stop/skip:** Opt-out → exit-stop. A clear no after diagnosis → exit-no-sale; there is no minimum number of reframes.
- **Delivery (instructor-described):** Mixed (instructor-described: B — mixed pacing across reframe / pushback / consequence / CTA; Apohenia uses only the diagnostic parts). Instructor-described cue, not audio-verified. Pacing: Instructor-described: slower on the concern itself, plain and even when listing options.
- **Source note:** Commercial reframe of the O01/O02/O08/O22 lineage. The source treats every objection as having a money component and routes "fear" through four reframes; Apohenia does not.

### `concern-budget` · budget

- **Roles:** closer, handoff, upsell · **approval:** draft
- **Say this:** “Is it the setup amount itself, or would staging it — a smaller first milestone, then the rest on acceptance — make it workable within what you've got budgeted?”
- **Cites:** O04 (adapt), O06 (adapt)
- **Seeks:** Whether the blocker is the total, the timing of payment, or the absence of any budget — and whether staging would work.
- **Slots:** none
- **Mirrors:** “Would a bounded first milestone make this decidable at your level?” · “Is this a "not this amount" or a "not this year"?”
- **Why now:** The source tests upfront versus instalment logistics (O04/O06); Apohenia offers staging and narrow scope as the practical alternatives (brief §18).
- **Listen for:** Whether the amount or the budget cycle is the problem; the sign-off threshold they can approve alone.
- **Complete when:** The budget constraint is understood; the response is a staged milestone, a smaller scope, or an agreed later date. No savings question is asked.
- **Branches:** Staging works → decision-next-step · Smaller scope conversation → followup-agree · No budget at all now → followup-agree · Declines → exit-no-sale
- **Stop/skip:** Opt-out → exit-stop. Never ask about personal savings (O05 study_only) — use the business's stated budget position only.
- **Delivery (instructor-described):** Mixed (instructor-described: B — mixed pacing across reframe / pushback / consequence / CTA; Apohenia uses only the diagnostic parts). Instructor-described cue, not audio-verified. Pacing: Instructor-described: slower on the concern itself, plain and even when listing options.
- **Source note:** O05 (cash-on-hand/savings) is study_only and excluded; business budget position replaces it.

### `concern-authority` · authority

- **Roles:** closer, handoff, upsell · **approval:** draft
- **Say this:** “Who else needs to be part of this decision — and would it help if I walked them through the same thing with you, so you are not carrying it second-hand?”
- **Cites:** O13 (adapt)
- **Seeks:** The other decision-maker(s) and the practical way to include them.
- **Slots:** none
- **Mirrors:** “If it were a yes from you, who else would still need to say yes?” · “What would the other person want to see before agreeing?”
- **Why now:** Authority is a real constraint in a dealership (owner, dealer principal); the honest move is to include them, not to argue the prospect out of consulting them.
- **Listen for:** Whether the other person is a real approver or a polite deferral; what they will want to see.
- **Complete when:** The additional decision role is named and a way to include them is agreed, or the prospect confirms sole authority. Delegated decisions are never treated as fear.
- **Branches:** Joint walkthrough agreed → followup-agree · Will discuss internally → followup-agree · Actually sole authority → decision-next-step · Declines → exit-no-sale
- **Stop/skip:** Opt-out → exit-stop. Never use the crown / responsibility / "would you do it anyway" sequence (O14–O21 study_only).
- **Delivery (instructor-described):** Mixed (instructor-described: B — mixed pacing across reframe / pushback / consequence / CTA; Apohenia uses only the diagnostic parts). Instructor-described cue, not audio-verified. Pacing: Instructor-described: slower on the concern itself, plain and even when listing options.
- **Source note:** Apohenia addition. Only O13 (value isolation) is cited; the source partner sequence O14–O21 is study_only and excluded (framework §10).

### `concern-certainty` · fit certainty

- **Roles:** closer, handoff, upsell · **approval:** draft
- **Say this:** “It sounds like what you'd want is more certainty that this would work here. Is that fair — and what would give you that: a smaller pilot, or the acceptance tests in writing?”
- **Cites:** O22 (adapt), O25 (adapt), O26 (adapt), O30 (adapt)
- **Seeks:** Confirmation (or correction) that certainty is the concern, and the evidence or structure that would resolve it.
- **Slots:** none
- **Mirrors:** “What would you need to see in writing to feel this was a safe first step?” · “Could that be why this has not been fixed before now — waiting for certainty that never comes?”
- **Why now:** The source reframes a fit concern as seeking certainty (O22) and links it to prior inaction (O25/O26/O30); Apohenia keeps only the diagnostic questions and answers with approved proof and bounded structure (framework §10).
- **Listen for:** Whether it is certainty or simply no need; the exact evidence they would accept.
- **Complete when:** The concern is confirmed or corrected in their words, and a concrete evidence/structure request is captured. No analogy is performed; no guarantee of results is offered.
- **Branches:** Evidence/structure named → decision-next-step · Wants a bounded pilot → followup-agree · Not certainty — doesn't need it → exit-no-sale · Declines → exit-no-sale
- **Stop/skip:** Opt-out → exit-stop. The worker/entrepreneur and beach analogies (O23/O24/O27–O29) are study_only and not used. With supported_proof empty, never imply references or results.
- **Delivery (instructor-described):** Mixed (instructor-described: B — mixed pacing across reframe / pushback / consequence / CTA; Apohenia uses only the diagnostic parts). Instructor-described cue, not audio-verified. Pacing: Instructor-described: slower on the concern itself, plain and even when listing options.
- **Source note:** Commercial reframe of the certainty lineage; analogies and the four-frame ritual are excluded.

## Exit (2 nodes)

### `exit-no-sale` · respectful no sale

- **Roles:** cold, inbound, handoff, setter, closer, follow_up, upsell · **approval:** draft
- **Say this:** “Understood — this doesn't sound like the right fit right now, and I'd rather say that than push. If it's useful, I'll leave you with the one-page inquiry checklist and that's it. Thank you for the time.”
- **Cites:** — none (Apohenia addition)
- **Seeks:** Acknowledgement; optionally acceptance of the free resource or an agreed later date.
- **Slots:** none
- **Mirrors:** “That's fine — I'd rather we both know it's not the right thing than pretend. Thanks for talking it through.” · “No problem at all. If anything changes on your side, you know where I am.”
- **Why now:** A no-fit outcome handled respectfully is a good outcome (scenario 5); the source's apology-and-suffering exit is not used.
- **Listen for:** A genuine "later" with a date versus politeness; take the polite one at face value.
- **Complete when:** The call ends courteously with no further attempt; a resource or a later date is offered once at most.
- **Branches:** Accepts resource / later date → followup-agree · End → end
- **Stop/skip:** Terminal for the sale. No reframes follow a clear no.
- **Delivery (instructor-described):** Calm and plain (Apohenia — no source delivery cue applies to exits, stops and repairs). Pacing: Unhurried; one sentence at a time; no attempt to re-open the conversation.
- **Source note:** Apohenia addition — replaces the source's four-reframe-then-apology exit (framework §10).

### `exit-stop` · immediate stop

- **Roles:** cold, inbound, handoff, setter, closer, follow_up, referral, upsell · **approval:** draft
- **Say this:** “Understood — I'll stop here and take you off my list. Thanks for telling me.”
- **Cites:** — none (Apohenia addition)
- **Seeks:** None required. The call ends.
- **Slots:** none
- **Mirrors:** “Got it — I'll stop now. Sorry to have interrupted your day.” · “Will do — you won't hear from me again.”
- **Why now:** A request to stop is honoured immediately (scenario 40); the source's four-reframe ritual never applies.
- **Listen for:** Nothing — end the call.
- **Complete when:** The call ends immediately; the opt-out is recorded so it persists through any reimport or future scheduling (scenario 17).
- **Branches:** End → end
- **Stop/skip:** Terminal. Reached from any node on an opt-out.
- **Delivery (instructor-described):** Calm and plain (Apohenia — no source delivery cue applies to exits, stops and repairs). Pacing: Unhurried; one sentence at a time; no attempt to re-open the conversation.
- **Source note:** Apohenia addition — immediate respectful stop; no source counterpart.

## Follow-up (3 nodes)

### `followup-agree` · agreed follow up

- **Roles:** cold, inbound, handoff, setter, closer, follow_up, referral, upsell · **approval:** draft
- **Say this:** “Would it help if I sent {resource} and we reconnected {reconnect_window} — you pick the day? If it turns out not to be useful, just say so and that's fine.”
- **Cites:** U01 (adapt), X11 (adapt)
- **Seeks:** Agreement on what will be sent and when to reconnect, with a specific day chosen by the prospect — or a decline.
- **Slots:** `{resource}`, `{reconnect_window}`
- **Mirrors:** “What would be the most useful thing for me to send before we talk again — and when?” · “Is a reconnect in a few days worthwhile, or would you rather I wait for you?”
- **Why now:** Nurture-first (B17): send something specifically relevant and agree the reconnect; this node also carries the scope conversation, the pilot conversation and the deferred-decision date.
- **Listen for:** A real day; the channel they prefer; whether "send me something" is interest or a soft no (both are fine).
- **Complete when:** A resource, a day and a channel are agreed and recorded as the next expected step; the resource is labelled accurately (never testimonial content disguised as training).
- **Branches:** Agreed → end · Declines follow-up → end · Asks not to be contacted → exit-stop
- **Stop/skip:** Opt-out → exit-stop. Check the link opens (X11) only as a courtesy — never fabricate technical trouble to prompt a click.
- **Delivery (instructor-described):** Casual (instructor-described: A — open posture, visible hands; B — conversational, your own natural vocabulary). Instructor-described cue, not audio-verified. Pacing: Instructor-described: relaxed conversational pace; say it once and stop.
- **Source note:** Source lineage U01 (nurture-first) and X11 (delivery check); use as scope/deferral agreement is an Apohenia extension.

### `followup-reconnect` · reconnect

- **Roles:** follow_up, setter, closer · **approval:** draft
- **Say this:** “Hi {prospect_name}, Jason with Apohenia — we said we'd reconnect today. Are you still looking at the inquiry follow-through, or has something changed since we spoke?”
- **Cites:** U02 (adapt), U07 (adapt)
- **Seeks:** Current interest status and any change in situation since the last conversation.
- **Slots:** `{prospect_name}`
- **Mirrors:** “What's the plan on this now, from your side?” · “Since we spoke, has anything moved — priorities, budget, people?”
- **Why now:** The follow-up updates the situation (U07) rather than replaying all discovery; interest is reconfirmed, not assumed (U02).
- **Listen for:** A competitor decision (accept it); a new trigger (the owner asked); a polite fade.
- **Complete when:** Interest is reconfirmed or withdrawn, and any change is recorded; discovery is not replayed.
- **Branches:** Still interested → followup-resource · Found something else → exit-no-sale · Situation changed → logical-change · Not now → followup-agree · Asks not to be contacted → exit-stop
- **Stop/skip:** Opt-out → exit-stop. Never call before the agreed date.
- **Delivery (instructor-described):** Casual (instructor-described: A — open posture, visible hands; B — conversational, your own natural vocabulary). Instructor-described cue, not audio-verified. Pacing: Instructor-described: relaxed conversational pace; say it once and stop.

### `followup-resource` · resource takeaway

- **Roles:** follow_up, setter, closer · **approval:** draft
- **Say this:** “Did you get a chance to look at what I sent — and if so, what did you take from it, if anything?”
- **Cites:** U03 (adapt), U04 (adapt), U05 (adapt), U09 (adapt)
- **Seeks:** Whether the resource was reviewed, the prospect's own takeaway, and how they think it applies to their store.
- **Slots:** none
- **Mirrors:** “How was it for you — anything in there that matched what you see at the store?” · “Was there one thing in it that applied, or nothing much?”
- **Why now:** The setter follow-up asks whether the resource was reviewed, the takeaway, and the application (U03–U05, U09) before the standard appointment transition.
- **Listen for:** Their own takeaway versus a polite echo; an application to their store in their words.
- **Complete when:** Reviewed / not reviewed is known; if reviewed, a takeaway in their words. 'Not reviewed' gets a reschedule with no guilt and no tease.
- **Branches:** Reviewed — takeaway given → setter-permission · Not reviewed → followup-agree · Not useful → exit-no-sale · Declines → setter-permission
- **Stop/skip:** Opt-out → exit-stop.
- **Delivery (instructor-described):** Curious (instructor-described: A — head tilt, squint, upward inflection; B — lower the guard, first-person demonstration). Instructor-described cue, not audio-verified. Pacing: Instructor-described: brisker early-discovery pace; ask, then leave a full beat of silence.
- **Source note:** Source tease for not watching (U06) is study_only and excluded; rescheduling is offered without guilt (framework §5).

## Referral (2 nodes)

### `referral-checkin` · success point checkin

- **Roles:** referral · **approval:** draft
- **Say this:** “How are you feeling about how the inquiry follow-through has gone so far — and what are you looking forward to next?”
- **Cites:** R01 (adapt), R02 (adapt)
- **Seeks:** The client's honest satisfaction and actual progress at a success point, plus their next positive expectation.
- **Slots:** none
- **Mirrors:** “What has actually changed for you since we started — anything you can point to?” · “Is it doing what we agreed it would, in your view?”
- **Why now:** Referrals are asked at success points after checking satisfaction and actual progress (B19; R01/R02).
- **Listen for:** Whether progress is real and visible to them; anything unfulfilled — that comes first.
- **Complete when:** Satisfaction and progress are stated in their words. If the original promise is unfulfilled, route to service repair before any ask.
- **Branches:** Satisfied and progressing → referral-ask · Original promise unfulfilled → upsell-service-repair · Mixed → upsell-service-repair · Declines → end
- **Stop/skip:** Only at actual success points; the source day-1/10/35/60/75 dates are examples, not a rule. Opt-out → exit-stop.
- **Delivery (instructor-described):** Casual (instructor-described: A — open posture, visible hands; B — conversational, your own natural vocabulary). Instructor-described cue, not audio-verified. Pacing: Instructor-described: relaxed conversational pace; say it once and stop.

### `referral-ask` · ask and intro

- **Roles:** referral · **approval:** draft
- **Say this:** “Who else do you know running a store with the same inquiry problem — and if you think it would genuinely help them, would you be open to introducing us so we can have a conversation?”
- **Cites:** R03 (adapt), R05 (adapt), R06 (adapt), R07 (adapt)
- **Seeks:** Zero or more named people with a reason they might benefit, and whether the client will make an introduction.
- **Slots:** none
- **Mirrors:** “Is there anyone you talk to who complains about the same thing?” · “Why do you feel we could help them — what is similar about their setup?”
- **Why now:** Understand who might benefit and why, then seek an introduction (R03/R05–R07); fit matters more than collecting any contact.
- **Listen for:** A reason the referral fits; whether the client wants to make the introduction themselves.
- **Complete when:** A name with a reason and an agreed introduction, or a clear no (accepted the first time). Referred contacts stay out of automatic campaigns until reviewed.
- **Branches:** Name(s) and intro agreed → followup-agree · No one comes to mind → end · Declines → end
- **Stop/skip:** Ask once; the source insistence (R04) is study_only and excluded. Opt-out → exit-stop.
- **Delivery (instructor-described):** Casual (instructor-described: A — open posture, visible hands; B — conversational, your own natural vocabulary). Instructor-described cue, not audio-verified. Pacing: Instructor-described: relaxed conversational pace; say it once and stop.
- **Source note:** R04 (insistence after no answer) is study_only and excluded.

## Upsell (6 nodes)

### `upsell-feedback` · setter feedback results

- **Roles:** upsell, setter · **approval:** draft
- **Say this:** “What's your feedback so far — and what has actually changed on inquiries since we started?”
- **Cites:** X01 (adapt), X02 (adapt)
- **Seeks:** Delivered results and honest feedback on the current product, in their words, before any expansion is discussed.
- **Slots:** none
- **Mirrors:** “What results have you seen from it — counts, time saved, anything?” · “What is it doing well, and what is it not doing?”
- **Why now:** Upsell setting begins with feedback and delivered results (X01/X02) — never a replay of the original problem as if nothing was delivered (framework §13).
- **Listen for:** Whether the original promise was met; the exact thing they say is still not working.
- **Complete when:** Delivered results are stated (or their absence is stated). An unfulfilled original promise routes to service repair, never to a new offer.
- **Branches:** Results delivered → upsell-next-goal · Original promise unfulfilled → upsell-service-repair · Unsure — get the numbers → upsell-next-goal · Declines → end
- **Stop/skip:** Opt-out → exit-stop. Never pretend to be customer support to open an upsell; the call is what it is.
- **Delivery (instructor-described):** Casual (instructor-described: A — open posture, visible hands; B — conversational, your own natural vocabulary). Instructor-described cue, not audio-verified. Pacing: Instructor-described: relaxed conversational pace; say it once and stop.
- **Source note:** Source's customer-support pretext and implied credit (B20) are not transferred.

### `upsell-next-goal` · setter next goal gap

- **Roles:** upsell, setter · **approval:** draft
- **Say this:** “What's the next thing you'd want on this — and what's getting in the way of it right now, even with the current setup? Walk me through what happens today.”
- **Cites:** X03 (adapt), X04 (adapt), X05 (adapt), X06 (adapt)
- **Seeks:** A new goal, the remaining gap in concrete terms, and a walk-through of the current situation (diagnostic expansion).
- **Slots:** none
- **Mirrors:** “If the current setup stayed exactly as it is, what would still frustrate you in six months?” · “What do you mean by that — can you show me on a real example from this week?”
- **Why now:** The upsell setter opens the next goal, the remaining problem and a diagnostic expansion (X03–X06) before any transition to advanced help.
- **Listen for:** A genuinely new capability versus a repair of the original scope; the concrete operational gap.
- **Complete when:** A new goal and a concrete remaining gap are stated; the diagnostic is a review of real operations (X06), not a performance.
- **Branches:** Gap named — hand to closer → setter-permission · Gap named — closer continues → upsell-closer-positives · Turns out the original promise is unfulfilled → upsell-service-repair · No new goal → end · Declines → end
- **Stop/skip:** Opt-out → exit-stop. Skip when {new_goal} is already recorded.
- **Delivery (instructor-described):** Curious (instructor-described: A — head tilt, squint, upward inflection; B — lower the guard, first-person demonstration). Instructor-described cue, not audio-verified. Pacing: Instructor-described: brisker early-discovery pace; ask, then leave a full beat of silence.

### `upsell-service-repair` · service repair

- **Roles:** upsell, referral, closer, setter · **approval:** draft
- **Say this:** “Before anything new — it sounds like {original_promise} hasn't landed the way we agreed. Let's fix that first, inside the original scope and at no additional charge. What specifically isn't working?”
- **Cites:** — none (Apohenia addition)
- **Seeks:** The specific unfulfilled element of the original scope and an agreed repair plan with a date.
- **Slots:** `{original_promise}`
- **Mirrors:** “Which of the acceptance tests we agreed is not passing right now?” · “What did you expect to see that you are not seeing?”
- **Why now:** A new offer must add genuine value; charging to repair an unfulfilled original promise is excluded (scenario 39; framework §13).
- **Listen for:** Whether it is a defect (repair) or a new request (change order) — say which, plainly.
- **Complete when:** The failing element is identified against the original acceptance criteria and a repair date is agreed. No new offer is discussed until it is fixed.
- **Branches:** Issue named — repair plan → followup-agree · Resolved on the call → upsell-next-goal · Declines → end
- **Stop/skip:** Opt-out → exit-stop. This node blocks the upsell path until the original promise is met.
- **Delivery (instructor-described):** Calm and plain (Apohenia — no source delivery cue applies to exits, stops and repairs). Pacing: Unhurried; one sentence at a time; no attempt to re-open the conversation.
- **Source note:** Apohenia addition — no source counterpart; implements scenario 39.

### `upsell-closer-positives` · closer positives

- **Roles:** upsell, closer · **approval:** draft
- **Say this:** “What do you feel is going well — and which part has been most helpful?”
- **Cites:** Y01 (adapt), Y02 (adapt)
- **Seeks:** Genuine positives and the component they value most, in their language.
- **Slots:** none
- **Mirrors:** “If you had to keep only one piece of it, which would you keep?” · “What has changed on a normal week because of it?”
- **Why now:** The upsell closer reviews actual positives first (Y01/Y02) so the new offer builds on delivered value rather than erasing it.
- **Listen for:** The component in their words — it becomes the comparison baseline for the new offer.
- **Complete when:** At least one genuine positive and the most helpful component are stated; "nothing" routes to repair.
- **Branches:** Positives named → upsell-closer-new-goal · Nothing positive → upsell-service-repair · Declines → upsell-closer-new-goal
- **Stop/skip:** Opt-out → exit-stop.
- **Delivery (instructor-described):** Casual (instructor-described: A — open posture, visible hands; B — conversational, your own natural vocabulary). Instructor-described cue, not audio-verified. Pacing: Instructor-described: relaxed conversational pace; say it once and stop.

### `upsell-closer-new-goal` · closer new tangible

- **Roles:** upsell, closer · **approval:** draft
- **Say this:** “What do you want more help with to get to the next level — and why is that important now?”
- **Cites:** Y03 (adapt), Y04 (adapt)
- **Seeks:** A new tangible (the next goal) and why it matters now.
- **Slots:** none
- **Mirrors:** “What is the next thing you would want fixed, now that the first one is working?” · “Is there a date this next level needs to be in place by?”
- **Why now:** The upsell closer elicits a new tangible and why it matters now (Y03/Y04) before future-pacing it.
- **Listen for:** A goal the current product genuinely does not cover; a real deadline.
- **Complete when:** A new goal and a reason for now are stated; the goal is genuinely new (not the original scope restated).
- **Branches:** New goal stated → future-tangible · Unclear → upsell-closer-new-goal · No new goal → end · Declines → end
- **Stop/skip:** Opt-out → exit-stop. Skip when {new_goal} is already recorded.
- **Delivery (instructor-described):** Curious (instructor-described: A — head tilt, squint, upward inflection; B — lower the guard, first-person demonstration). Instructor-described cue, not audio-verified. Pacing: Instructor-described: brisker early-discovery pace; ask, then leave a full beat of silence.

### `upsell-closer-compare` · closer compare fit

- **Roles:** upsell, closer · **approval:** draft
- **Say this:** “Compared with what you have now, the difference is {new_offer_difference}. Do you feel that would get you to {new_goal}? Why — and which of the new pieces matters most?”
- **Cites:** Y09 (adapt), Y10 (adapt), Y11 (adapt)
- **Seeks:** The client's assessment of the new-versus-current difference, their reasoning, and the new value driver.
- **Slots:** `{new_offer_difference}`, `{new_goal}`
- **Mirrors:** “What does the new version do that the current one cannot, in your words?” · “Of the new pieces, which one would you actually use?”
- **Why now:** The upsell closer shows previous-versus-new and asks fit, why and the key pillar (Y09–Y11); the new offer must add genuine value (framework §13; scenario 39).
- **Listen for:** Whether they see a real difference; the one new piece they name.
- **Complete when:** The old/new difference is shown explicitly and the client states fit, reason and key new pillar. If the difference is not genuine added value, route to a respectful exit.
- **Branches:** Fits → decision-price · Doesn't fit → concern-diagnose · No genuine added value → exit-no-sale · Declines → exit-no-sale
- **Stop/skip:** Opt-out → exit-stop. A "more likely to achieve" claim needs an adequate basis (UVP rule); with supported_proof empty, do not make it.
- **Delivery (instructor-described):** Casual-confident for the pitch (instructor-described: A — confident delivery through pillars and price). Instructor-described cue, not audio-verified. Pacing: Instructor-described: steady and even; pause after each check; do not race toward the price.
- **Source note:** The explicit old/new comparison is an Apohenia addition to the Y09–Y11 lineage.

