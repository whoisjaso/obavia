# Apohenia Outbound Script v0.2 — the Impact Formula, adapted for outbound dealership calls

**Status:** draft, unapproved · **synthesized:** 2026-09-11 · **source:** `sources/source_a.txt` (Andrés's Impact Formula brain-dump, 158,723 characters, read in full) · **record bank:** `data/source_question_records.json` (207 records) · **offer:** `data/offers.json` → `draft-research-offer-v0` (price `null`) · **supersedes for script purposes:** the entry/intent/logical/pitch/concern nodes of `docs/03-apohenia-draft-scripts.md` v0.1 once this document is reviewed and seeded; v0.1's follow-up, referral and upsell nodes are unaffected.

## Front matter

### What this is

This is the canonical word track Jason will internalize and the document the seed (`data/apohenia_script_nodes.json`) will be regenerated from. It carries Andrés's Impact Formula over **structure for structure and question for question** — the same sequence, the same purposes, the same constructions and hedges — and re-points every slot at what Apohenia actually sells. One step is added at the front (the outbound open) because the source presumes a warm inbound lead action that a cold dealership call does not have. Jason is his own setter and his own closer: **the cold call is the setting call; the booked deeper call is the closing call.** Nothing here is sales policy until an owner review marks a version published.

Every script line is a block: **Say** (the line) · **Seeks** (answer type) · **Why now** (mechanism) · **Listen for** · **If unclear → mirror** · **Tone** · **Then** (branches) · **Fidelity** (tag + citation). Slots in braces are filled only from confirmed prospect facts or approved offer attributes; an unfilled slot renders a visible missing-information cue. Bracketed instructor cues are text descriptions from the transcript, not audio-verified. "man", "buddy", "like" and "I guess" are part of Andrés's technique (he explains why: direct phrasing "triggers a lot of resistance … It's too aggressive"); Jason may keep "man" or drop it in his own word track, but the hedges stay.

### Fidelity policy (three tags, applied to every line in Part 5)

| Tag | Meaning |
|---|---|
| `verbatim_adapted` | Andrés's construction kept word for word where the words are generic, with only the offer-specific nouns swapped into the slots he himself marks as X / Y / "whatever it might be". The source quote is given beside it. |
| `apohenia_addition` | No counterpart in the source. Built on a principle Andrés states (hedged asks, confirm something true first, one fixed word track) but the words are original. Reason given. |
| `excluded_study_only` | Present in the source, readable in the Source Library, **not** in the live script. Reason given. Nothing is deleted from the bank; nothing excluded is silently softened into a live line. |

Where a line's record is classified `study_only` in `data/source_question_records.json` but Jason's instruction for this revision is to carry the construction over (the time, partner and certainty reframes; the Usain Bolt analogy), the line is written in full, tagged `verbatim_adapted`, and carries the explicit note **"bank: study_only — reclassification pending owner decision"**. The engine must not auto-present such a line until the record is reclassified `adapt` by an explicit owner action; until then it is reachable only by Jason's deliberate branch choice. The mismatch is displayed, never silently reconciled.

### Outbound versus inbound, in one paragraph

Andrés's setting call opens on a documented action — "it looks like you downloaded … attended the webinar … opted in about … booked a time … is that about right?" — and everything after that (tangible, experience, logical certainty, transition) hangs off the fact that the prospect already raised a hand. A cold dealership call has no such action: nobody at the store asked to be called, Jason has no resource to "send a more specific training" about, and any claimed observation about the store's process would be invented. So Part 0 adds an honest equivalent of the lead action: identify the person, say truthfully who Jason is and the specific reason for calling *this* rooftop, get low-friction permission, and ask one relevance question ("when an inquiry comes in from your website right now, who picks it up first?") whose answer is itself a fact about the current process. That answer becomes the "is that about right?" echo, pre-satisfies the first logical-certainty question, and lets Andrés's tangible and experience constructions run unchanged. From that point the outbound call **is** the setting call, verbatim. The inbound variant (a dealership submitted a form or replied to an email) uses Andrés's opener construction untouched because there *is* a documented action.

### Buyer avatars (offer `buyer_type` and `decision_roles`)

| Avatar | Role in the decision | What "their word" usually is |
|---|---|---|
| Dealer principal / owner | Economic decision | "leads", "the store", "my people", "what I'm paying for" |
| General manager (GM) | Economic decision or its gate | "web leads", "the floor", "the numbers", "accountability" |
| General sales manager (GSM) | Operational owner or influencer | "internet leads", "the desk", "who's got it", "follow-up" |
| Internet / BDC manager | Operational owner; accepts the handoff | "the queue", "the CRM", "response time", "the inbox" |

Kudos identity lines per avatar are in Part 4. Private identity-interview answers never enter any of these lines.

### The three pillars and their mapping to `data/offers.json`

| Pitch label (Part 2) | Offer pillar (`pillars[].name`) | Connects to the problem the prospect stated | Deliverable actually promised (`deliverables[]` / `pillars[].delivery`) |
|---|---|---|---|
| **Speed** | Same-day inquiry response | Inquiries sit unanswered in a shared inbox or queue with no owner and no clock | Every website inquiry is acknowledged and routed through the dealership's existing channel inside an agreed response window, with the arrival time recorded. No new inbox, no new app for customers. |
| **Ownership** | One named handoff | Nobody owns the lead, so it is worked twice or not at all and the handoff is informal | Each inquiry is assigned to one named staff member with a visible status (new → contacted → appointment/closed/no-response) that they update; unclaimed inquiries are surfaced, not lost. |
| **Visibility** | One honest reporting view | The manager cannot see what happened to an inquiry without asking around | One view — arrival, first response, owner, status — for one rooftop, exported as a weekly summary; numbers are counts of recorded events, not projections. |

The pitch may describe deliverables and acceptance criteria only (`approved_claims: []`, `supported_proof: []`). No pillar line implies customers, results, appointments or gross.

### Honesty constraints that bind every line

- **Price.** `price.setup_minor_units` and `price.recurring_minor_units` are `null` and `payment_schedule` is "not set". Any line that would state a number (`p2-price`, `p3-money-duffel`, `p3-money-split`, `p3-money-plan`) renders the cue **"Price not approved yet — do not state a number; route to the scope conversation"** and uses its null-price wording. The fictional Northgate Motors pilot (USD 750 + USD 150, **FICTIONAL TRAINING OFFER — NOT A REAL QUOTE**) exists only in practice and never fills a live slot.
- **No guarantees, no invented claims.** No "legally compliant", no "our dealers see…", no ROI, no appointment or sales numbers, no invented payment plans. Andrés's own certainty frame states "there are no guarantees in life except for death and taxes" — the live script agrees with him.
- **Opt-out and refusal are accepted.** "Take me off your list" stops the call at any node and persists suppression. "I don't have that problem", "it's dialed in", "not for us", a declined answer, and a "no" after one reframe are complete answers. The four-reframe ritual, the apology exit, status deflation, identity shame and forced "regret" are study-only (Part 5 lists each with its reason).
- **Never ask twice.** An answer already on record marks its node evidence-satisfied; the engine offers a bridge instead of the question.
- **Their words.** Every `{their_word}` slot is the prospect's exact noun or phrase; a seller-proposed label is recorded as *seller proposed, prospect confirmed* and never displayed as a quote.

---

## Part 0 — OUTBOUND OPEN (the additional step)

**Pre-dial (policy, not spoken) — `p0-predial`.** The record is eligible (not suppressed, business number, jurisdiction and time-of-day rules known), Jason is ready, the countdown is armed and cancellable. If any check fails, the call is not placed. Andrés never scripts outbound; his only mention is "in that extra hour, you could have gone on the dialer, started making outbound dials until you found a prospect who's a lot more open" — activity, not a script. `apohenia_addition`.

### 0.1 Cold open — Jason's exact words

#### `p0-identify` · Identify the person
- **Say:** "Hey, is this {first_name}?"
- **Seeks:** Confirmation that the intended person is on the line (yes / someone else / switchboard / voicemail).
- **Why now:** Andrés opens every call by confirming the person before anything else; it is the first "something true" the prospect confirms.
- **Listen for:** A plain yes; a receptionist's "who's calling?"; a recorded greeting.
- **If unclear → mirror:** "Sorry — {first_name} {last_name}? The one who'd know about the website inquiries?"
- **Tone:** Casual [instructor-described: shoulders back, hands visible]. The doubled "Hey, hey" is optional register.
- **Then:** Confirms → `p0-who-why` · Someone else / switchboard → `p0-gatekeeper` · Voicemail → `p0-voicemail`.
- **Fidelity:** `verbatim_adapted` · I01 · "Hey, hey, is this this John?"

#### `p0-who-why` · Who I am and the truthful reason for calling this store
- **Say:** "{first_name}, it's just Jason here with Apohenia. I work on what happens after somebody sends an inquiry through a dealership's website — the first reply, and who actually picks it up. I'm calling {dealership_name} specifically because I don't know how that's handled on your end yet, and I'd rather ask than guess."
- **Seeks:** Nothing yet — the prospect knows who is calling and why, in one breath, before being asked anything.
- **Why now:** The source leans on a documented action here ("it looks like you downloaded…"). There is none, so the honest substitute is a specific reason tied to inquiry follow-through at this rooftop, which admits what Jason does not know. Yosh's reviewed prospect describes exactly why a generic opener fails: "you say insurance and they say I'm not interested … there's been a wall that's been put up already super quick."
- **Listen for:** Whether they relax or brace; "what's this about?" (a permission signal, not a rejection).
- **If unclear → mirror:** "Short version: when somebody fills in the form on your website, I work on what happens in the first few minutes after that."
- **Tone:** Casual; say it once, plainly, and stop. Do not raise energy to compensate for being uninvited.
- **Then:** → `p0-permission` without pause.
- **Fidelity:** `apohenia_addition` · modelled on I01/I02's diminutive self-intro ("It's just Andy here from like XYZ fitness company") with a truthful identity — the source's "I'm just with the customer support team" is excluded (`p0x-support-team`). Variant permitted only when Jason genuinely holds a policy-permitted observation about this store: "…because {observed_fact}." Never a claimed observation he does not have.

#### `p0-permission` · Low-friction permission
- **Say:** "Did I catch you at a bad time, or have you got like a minute?"
- **Seeks:** Explicit permission (yes / go ahead / "what's this about?"), or a routed answer (bad time / not the right person / not interested / opt-out).
- **Why now:** Andrés's stated principle: "It's not like, 'Do you want to invest?' That triggers a lot of resistance … You just make it, would you be possibly willing to invest?" The either/or offers the easy "no" first. Silence or a non-answer is never permission.
- **Listen for:** A real yes versus a polite non-answer; any request to stop.
- **If unclear → mirror:** "Sorry — I'll be quick about it. Is now workable for a quick one, or should I try you another time?"
- **Tone:** Casual, unhurried.
- **Then:** Yes / "what's this about?" → `p0-relevance` · Bad time → `p0-bad-time` · Not the right person → `p0-gatekeeper` · Not interested → `p0-not-interested` · Opt-out wording → `p0-optout` · Silence → the mirror once, then `p0-bad-time` or end.
- **Fidelity:** `apohenia_addition` · no permission question exists in the source; built on S03's hedging principle ("notice I'm making it very theoretical").

#### `p0-relevance` · The honest lead-action equivalent
- **Say:** "Quick one, man — when an inquiry comes in from your website right now, who picks it up first?"
- **Seeks:** A current-process fact: a named role or person / "me" / "nobody specifically, whoever's free, shared inbox" / "we don't really get them" / a refusal.
- **Why now:** This is the honest equivalent of "it looks like you opted in". The answer is a fact, not manufactured interest; it can be echoed back for Andrés's confirmation, it pre-satisfies logical certainty's first question ("What are you doing to get leads now?" — L01), and it decides in one line whether the call is relevant at all.
- **Listen for:** A role or name (BDC, internet manager, "Dana"); "me"; hedges like "it depends" or "whoever's free" (already an experience-class observation); "we don't get any".
- **If unclear → mirror:** "Fair question — it's honestly the whole reason I called. When one comes in through the site, does it land with one person, or does it sort of go wherever?"
- **Tone:** Curious [instructor-described: head tilt, squint]; asked as a genuine question.
- **Then:** Role/person named → `p0-confirm` (mark L01 evidence-satisfied) · "Me" → optional `p0-kudos` then `p0-confirm` · "Nobody specifically / whoever's free / shared inbox / I'd have to check" → `p0-confirm` in their words; record as an experience-class observation · "We don't get website inquiries" → `p0-no-fit` · Refuses → answer the one-sentence why, then `p0-bad-time` offer or end.
- **Fidelity:** `apohenia_addition` · serves L01's purpose ("What are you doing to get leads now?") as a first-touch relevance question.

#### `p0-confirm` · Echo and confirm
- **Say:** "Okay, so it lands with {their_answer} first. Is that, is that about right?"
- **Seeks:** A yes, or a correction (which is recorded and re-echoed once).
- **Why now:** Andrés ends every opener on "Is that is that about right?" — the prospect confirms something true before being asked for anything.
- **Listen for:** "Yeah" versus "well, sort of…" (a correction is data — keep their wording).
- **If unclear → mirror:** "So if one came in this afternoon, {their_answer} would be the first to see it — yeah?"
- **Tone:** Casual; the doubled "is that, is that" is register, keep it.
- **Then:** Yes → `p1-intent-tangible` (or `p1-intent-tangible-new` if the store states it has no handling at all) · Correction → re-echo once, then `p1-intent-tangible`.
- **Fidelity:** `verbatim_adapted` · I02 · "Is that is that about right?"

#### `p0-kudos` · Positive identity line (optional, only when earned)
- **Say:** "Kudos to you, man, for actually picking those up yourself. It'd be easy to just let them sit in the inbox and hope somebody grabs them."
- **Seeks:** Nothing; delivered and immediately followed by the next question.
- **Why now:** Andrés's beta build-up template placed at the intent question: "Kudos to you for being XYZ. Most people are bad thing. So, kudos for being why." The contrast clause is rephrased as a hypothetical ("it'd be easy to…") so Jason asserts nothing about other stores he has not observed.
- **Listen for:** Nothing to extract; watch that it lands as recognition, not flattery.
- **If unclear → mirror:** n/a — never repeat a kudos line.
- **Tone:** Warm, brief; then straight into the next question, as in the source ("Oh, that's really courageous of you. And but by the way, when you said XYZ…").
- **Then:** → `p0-confirm` or `p1-intent-tangible`.
- **Fidelity:** `verbatim_adapted` · A12 kudos template · "And kudos to you, man, for actually having the courage to do something." Positive identity reinforcement is allowed; the "most people are [bad thing]" clause is converted to a hypothetical.

### 0.2 Routes

#### `p0-gatekeeper` · Gatekeeper / wrong person
- **Say:** "Totally fair. Who's the person who'd actually know what happens to a website inquiry at {dealership_name} — is that the GM, or the internet or BDC manager? I'd rather ask them directly than leave a message that misses."
- **Seeks:** The name or role of the owner of web inquiries, and a route (transfer / time / message).
- **Why now:** Gatekeepers are routed, never pitched; asking by role respects their job and avoids pitching the wrong person.
- **Listen for:** A real name and role; screening versus genuine uncertainty; an implicit no.
- **If unclear → mirror:** "Sure — it's about how website inquiries get picked up at {dealership_name}; who's the person who'd actually know that?"
- **Tone:** Casual.
- **Then:** Transferred → `p0-transfer-reopen` · Name + time → `p0-gatekeeper-time` · Will take a message → leave the `p0-voicemail` wording verbally, log follow-up · Declines to route → thank and end (`p3-exit-respectful` short form) · Opt-out → `p0-optout`.
- **Fidelity:** `apohenia_addition` · no gatekeeper route exists in the source.

#### `p0-gatekeeper-time` · Time and permission to reference the referral
- **Say:** "When's usually a decent time to catch {owner_name}? And is it alright if I mention you pointed me their way?"
- **Seeks:** A time window and a yes/no on naming the referrer.
- **Why now:** A truthful referral reference ("{gatekeeper_name} said you'd be the one") is the only "warm" element available on the next attempt; it must be permitted, not assumed.
- **Listen for:** A concrete day/time; hesitation about being named (respect it).
- **If unclear → mirror:** "Mornings or afternoons better for {owner_name}?"
- **Tone:** Casual.
- **Then:** → log follow-up with time; end warmly.
- **Fidelity:** `apohenia_addition`.

#### `p0-transfer-reopen` · Re-open after a transfer
- **Say:** "Hey, is this {owner_name}? It's just Jason here with Apohenia — {gatekeeper_name} just passed me across. Did they say why I called, or should I take thirty seconds?"
- **Seeks:** Fresh permission from the new person.
- **Why now:** The new person has agreed to nothing; permission restarts with them.
- **Listen for:** "Go ahead" versus "make it quick" (still a yes) versus "not now".
- **If unclear → mirror:** "Thirty seconds, then you tell me if it's worth more — fair?"
- **Tone:** Casual.
- **Then:** Yes → `p0-who-why` (short) → `p0-relevance` · Otherwise the usual routes.
- **Fidelity:** `apohenia_addition` · identity check uses I01's construction.

#### `p0-voicemail` · Voicemail (human-left, once)
- **Say:** "Hey {first_name}, it's Jason with Apohenia. I work on what happens after somebody sends an inquiry through a dealership's website — who picks it up first, and how fast. Nothing urgent. If that's worth two minutes, I'm at {callback_number}. If not, no worries at all — I won't keep chasing you."
- **Seeks:** Nothing; a callback is a bonus.
- **Why now:** Short, truthful identity and reason, no urgency theatre, an explicit easy out. Left by a human, once per contact-policy window; automated voicemail drops are prohibited by the brief.
- **Listen for:** n/a.
- **If unclear → mirror:** n/a.
- **Tone:** Casual, slow enough for the number to be written down; say the number twice.
- **Then:** Log; next attempt per contact policy; never a second voicemail in the same window.
- **Fidelity:** `apohenia_addition` · no voicemail script exists in the source. Whether a first-touch voicemail is permitted at all is a contact-policy decision (brief lists voicemail as a separate permission dimension) — see Open questions.

#### `p0-bad-time` · Not a good time → schedule
- **Say:** "No problem at all. Would like fifteen minutes at a time you pick be easier? You tell me when."
- **Seeks:** A specific day and time, or a decline.
- **Why now:** Respects a bad moment without losing the thread; the person controls when.
- **Listen for:** Whether "bad time" is real or a polite no; a concrete day or hour.
- **If unclear → mirror:** "Is there a day this week or next when fifteen minutes wouldn't be a nuisance?"
- **Tone:** Casual. Optional source register: "How does that sound? Would that be awful?" (`p1-st-awful`).
- **Then:** Time agreed → log follow-up, send invite, end · Wants to talk now → `p0-relevance` · Second "not now" with no time → `p0-bad-time-second`.
- **Fidelity:** `apohenia_addition` · mirrors the setter transition's soft scheduling ask (S04 "How does that sound?").

#### `p0-bad-time-second` · Second "not now" without a time
- **Say:** "All good — I'll leave it there. Thanks for picking up, {first_name}."
- **Seeks:** Nothing.
- **Why now:** Never a third push. A second "not now" with no time offered is a no.
- **Listen for:** A last-second "actually, try me Thursday" — take it.
- **If unclear → mirror:** n/a.
- **Tone:** Casual, warm, brief.
- **Then:** End; log "declined scheduling"; next attempt only per contact policy.
- **Fidelity:** `apohenia_addition`.

#### `p0-not-interested` · One relevance line, then accept
- **Say:** "Fair enough. The only reason I called is that when a website inquiry lands in a shared inbox, nobody owns it — if that's not how it works at {dealership_name}, then you're right, it's not for you. Appreciate you picking up."
- **Seeks:** Either a volunteered correction ("well, actually, it kind of is like that…") or a clean end.
- **Why now:** Exactly one honest relevance line — a mechanism, not a statistic or a claim about other stores — then acceptance.
- **Listen for:** "Well, actually…" is a relevance-check answer.
- **If unclear → mirror:** n/a — this line is not repeated.
- **Tone:** Casual; no edge.
- **Then:** Correction volunteered → `p0-confirm` → `p1-intent-tangible` · Otherwise end; log "not interested".
- **Fidelity:** `apohenia_addition`.

#### `p0-optout` · Opt-out / do-not-call
- **Say:** "Understood — I'm taking you off my list right now. Sorry for the interruption, and have a good one."
- **Seeks:** Nothing.
- **Why now:** Immediate respectful stop; suppression is persisted before the next dial. Reachable from every node in this document.
- **Listen for:** n/a.
- **If unclear → mirror:** n/a.
- **Tone:** Casual, sincere.
- **Then:** End. Persist suppression. No further attempt through any channel.
- **Fidelity:** `apohenia_addition` · the source has no opt-out; its exit is the study-only apology (`p3x-apology`).

#### `p0-no-fit` · No website inquiries / genuinely dialed in
- **Say:** "Got it — then this genuinely isn't for you, and I won't take more of your time. Thanks, {first_name}."
- **Seeks:** Nothing.
- **Why now:** "I don't have that problem" is a complete answer. No manufactured confession, no reframe.
- **Listen for:** n/a.
- **If unclear → mirror:** n/a.
- **Tone:** Casual.
- **Then:** End; log "no fit". Optional single line: "If that ever changes, I'm easy to find."
- **Fidelity:** `apohenia_addition`.

### 0.3 Inbound variant (a dealership submitted a form or replied to an email)

#### `p0i-open` · Inbound opener on the documented action
- **Say:** "Hey, hey, is this {first_name}? … What's up, man? It's just Jason here with Apohenia. Man, it looks like you {documented_action — filled in the form on the site / replied to my note} about possible help with like how the website inquiries get handled at {dealership_name}, all that jazz. Is that, is that about right?"
- **Seeks:** Confirmation of the action.
- **Why now:** There *is* a lead action, so Andrés's construction runs untouched: identify → who I am → the action, hedged ("I think it was", "possible help like", "all that jazz") → "Is that about right?"
- **Listen for:** "Yeah, I did that" versus "I don't remember" (mirror) versus "that was someone else here" (gatekeeper route).
- **If unclear → mirror:** "It came through on {date} from {email_or_form}, about the website inquiries — ring a bell?"
- **Tone:** Casual, doubled greeting, the hedges intact.
- **Then:** Yes → `p0i-intent` · Denies / someone else → `p0-gatekeeper`.
- **Fidelity:** `verbatim_adapted` · I01/I02 · "Man, it looks like you downloaded I think it was a training about possible help like losing some weight, getting in better shape, all that jazz. Is that is that about right?"

#### `p0i-intent` · Stated reason + intent question (inbound)
- **Say:** "Okay, easy, man. Well, just to see if it would even make sense for you — what was your intent behind, I guess, even like {documented_action} in the first place? Like what were you hoping to get out of it?"
- **Seeks:** A tangible (a goal in the future) in their words.
- **Why now:** Andrés states a low-stakes reason before the question. The book-a-call variant's reason ("just to see if it would even make sense for you, man") is used because Apohenia has no "more specific training" to send.
- **Listen for:** A future goal about inquiries; a problem instead (that is an experience — record it); a process or ego answer (mirror).
- **If unclear → mirror:** `p4-mirror-tangible` ("can you give me more specifics on that?").
- **Tone:** Curious and casual.
- **Then:** Tangible stated → `p1-intent-experience` · Problem stated → record experience, ask the goal once if needed, then `p1-lc-process` · Asks the price first → `p0i-price-early`.
- **Fidelity:** `verbatim_adapted` · I03 · "What was your intent behind I guess even like downloading that training in the first place. Like what were you hoping to get out of it?" The stated reason "Because I might be able to send you like a bit of a more specific training" is excluded (`p0x-specific-training`).

#### `p0i-price-early` · Inbound lead asks the price before discovery
- **Say:** "Fair question, and I'll answer it straight. {approved_price_statement}. What actually moves it is the scope — which channel, who takes the handoff, what the form collects — so can I ask you a couple of quick ones so the number I give you is the real one?"
- **Seeks:** Permission to run discovery after an honest price answer.
- **Why now:** Brief scenario 8: answer approved pricing honestly and explain what still affects scope. While the price is `null`, `{approved_price_statement}` renders the cue **"Price not approved yet — say: 'There isn't a published number yet; the investment gets put in writing against the scope.'"** No number is improvised.
- **Listen for:** Whether the price question was a fit test or a brush-off.
- **If unclear → mirror:** "Is it more that you need a ballpark to know whether to keep talking, or that you've got a budget line already?"
- **Tone:** Casual, confident.
- **Then:** Yes → `p0i-intent` · No → `p3-exit-respectful` with the scope one-pager offered.
- **Fidelity:** `apohenia_addition`.

### 0.4 Excluded from Part 0 (study only)

- `p0x-support-team` — "I'm just with the customer support team." False identity; Jason is the seller and implementer.
- `p0x-specific-training` — "Because I might be able to send you like a bit of a more specific training." Not coercive, but false for Apohenia until a real nurture resource exists; reinstatable as a true line only if a resource is authored and approved (B17 pattern).
- `p0x-benefit-coordinator` — the reviewed prospect's own outbound identity line ("introduce yourself as … their benefit coordinator or somebody that's been assigned to their particular file"). Prospect speech is data; the identity is misleading.
- `p0x-never-move-on` — "Never move on without getting the answer because all you're teaching the prospect subconsciously is this guy's low status." The two-part mirror is kept; the status rationale and the implied requirement to extract an answer are study-only; refusal is accepted after one mirror.

---

## Part 1 — SETTING CALL (the cold call itself, from the confirmed relevance answer onward)

Andrés: "At the very beginning, we're getting a tangible and an experience. What is their goal in the future? What problem is causing that to be a goal? Then after that, we're getting their current process. What are they doing now? And then we're getting pain right next to it. So that they associate the two … that's when we go to the transition."

### 1.1 Intent — tangible, then experience

#### `p1-intent-tangible` · Tangible, improvement form (default for dealerships)
- **Say:** "Well, just to see if it would even make sense for you, man — what do you feel like you'd want different, in specific, about how those inquiries get handled? Like, is it more the speed of the first reply, or somebody actually owning each one, or being able to see what happened to them — like what for you? Or is it pretty dialed in?"
- **Seeks:** A **tangible** — Andrés's definition: "Any goal that they have in the future." In their words: "every one answered the same day", "one person owning it", "seeing what happened without asking around", "fewer falling through".
- **Why now:** Closer rule applied to the offer: "if it's an offer where they're looking to improve something they already have, that's where you use this question." A dealership already has an inquiry channel, so the improvement form is the default; the new-activity form (`p1-intent-tangible-new`) only if the store says it has nothing in place. The option list is Andrés's own mirror device ("is it more kind of have more energy or like feeling better, more confidence, like what for you?"); the options are the three pillar areas asked as questions, never as claims. "Or is it pretty dialed in?" makes an honest no easy.
- **Listen for:** A future state (tangible) · a problem instead ("they sit for hours" — that is an experience, record it) · process or ego ("we're the best store in the county") · "it's dialed in".
- **If unclear → mirror:** "No, no, sorry — that wasn't what I meant to ask. Maybe I wasn't being very clear. Can you give me more specifics on that? Like what in specific about how they're handled would you want tightened up?" (`p4-mirror-tangible`). If "just curious / seeing what's out there": "Okay — and I don't want to assume anything, man. If this went the way you'd want it to six months from now, what would actually be different about how {dealership_name} handles website inquiries?"
- **Tone:** Curious and casual [instructor: "all of intent is going to be very curious and casual"].
- **Then:** Tangible → `p1-intent-experience` with their noun in X · Problem stated → mark experience satisfied; ask the goal once more only if needed ("and if that was fixed, what would you want it to look like?") → `p1-lc-process` · "Dialed in" / "nothing I'd change" → `p0-no-fit` · No handling at all → `p1-intent-tangible-new`.
- **Fidelity:** `verbatim_adapted` · I06 + the book-a-call preface · "what do you feel like you need help with in specific then? like in order to actually like make more commissions, make more sales, help more people, all that jazz." / "Well, just to see if it would even make sense for you, man."

#### `p1-intent-tangible-new` · Tangible, new-activity form (only if nothing is in place)
- **Say:** "Well, what's your intent of looking at, I guess, possibly even putting something in place for the website inquiries — like what are you, I guess, looking to get out of it, just to see if I can help?"
- **Seeks:** A tangible.
- **Why now:** "If it's something where a business is looking to put systems in place that they've never had, that is something new. That's where you're going to ask the intent question." Never asked together with the improvement form: "you're going to ask only one of these questions, not both of them."
- **Listen for:** A future goal in their words.
- **If unclear → mirror:** `p4-mirror-tangible`.
- **Tone:** Curious and casual.
- **Then:** → `p1-intent-experience`.
- **Fidelity:** `verbatim_adapted` · I07 · "what's your intent of looking at, I guess, possibly even starting an SMMA, like what are you, I guess, looking to get out of it just to see if I can"

#### `p1-intent-experience` · Experience
- **Say:** "What have you seen that I guess makes you feel like maybe the inquiries aren't getting {their_word} the way you'd like?"
- **Seeks:** An **experience** — "any problem in the past" (present counts: "the present is also the past"). Two-part test: is it a problem? is it in the past/present? Examples: "found three from last week nobody answered"; "a customer walked in and said nobody called back"; "they go to a shared inbox and whoever's free grabs it".
- **Why now:** "As soon as you get that answer, you move on to what we call the experience question … You just plug in whatever answer they give into the X." This is the problem that logical certainty will place beside the current process.
- **Listen for:** A concrete past instance or present condition · a repeated goal ("I just want them handled better" — not an experience, mirror) · a vague adjective ("messy", "hit or miss" — probe for an instance) · a volume without a problem ("we get about forty a month").
- **If unclear → mirror:** Goal repeated → "No, no, sorry. That wasn't what I meant to ask. Maybe I wasn't being very clear. What I meant to ask is — you having every inquiry {their_word}, what would that, I guess, really allow the store to do that maybe it can't do now?" · Vague adjective → "Okay — and when you say {their_adjective}, just so I understand, give me an example of like an instance where that happened — like one from the last couple weeks." · Volume only → "Gotcha — and that's the volume. What have you seen happen to those {n} that I guess makes you feel like they're not getting {their_word} the way you'd like?"
- **Tone:** Curious and casual; verbal cues slow and spaced so they keep talking.
- **Then:** Problem stated → "Great. Gotcha." → `p1-lc-process` (or `p1-lc-duration` if `p0-relevance` already supplied the process) · "I don't actually have that problem" → accepted → `p0-no-fit` or permission to check back in a few months · Declines → accepted → continue to `p1-lc-process` if permission still stands, else `p3-exit-respectful`.
- **Fidelity:** `verbatim_adapted` · I04 · "What have you seen that I guess makes you feel like maybe you haven't been losing as much weight as you'd like?" Mirrors: M02 "you making more money, man. Like, what would that, I guess, really allow you to do that that maybe you you you can't do now?" · V14 "give me an example of like an instance where you may have".

#### `p1-intent-bridge` · Check and move on
- **Say:** "Great. Gotcha."
- **Seeks:** Nothing; marks both intent objectives evidence-satisfied (one future goal + one past/present problem, both in their words).
- **Why now:** "Again, problem in the past. That's an experience. Great. Check. We move on. So, that's the intent stage."
- **Then:** → logical certainty.
- **Fidelity:** `verbatim_adapted` · I04 · "Great. Check. We move on."

### 1.2 Logical certainty — process → duration → origin → like → change → probe → duration → impact

Andrés: "The whole point of logical certainty … is to get what is their current process and associate their process to the problem that they have … If somebody understands, I have a problem and it's being caused by this thing that I'm doing … you want to stop doing what you're doing … more open to a different way of doing things. And what … do you think you're selling? A different way of doing things."

#### `p1-lc-process` · Current process (root cause, question 1)
- **Say:** "So what are you doing now, in terms of like, I guess, how the inquiries get handled, that you feel like isn't getting them {their_word}?"
- **Seeks:** The concrete current process: where an inquiry lands (shared inbox / CRM queue / phone), who is notified, who responds, how fast, after hours, who owns it, how status is known. "I don't know" is acceptable and is itself the visibility problem.
- **Why now:** "So, I start by just going, well, what are you doing now in terms of like I guess your [fitness regime] that you feel like isn't allowing you to [lose weight]" — the experience is plugged into the tail.
- **Listen for:** A named tool or person (becomes the offer's "one existing channel" and "one named handoff") · vagueness ("we handle it", "we've got a BDC") · scope confusion ("as far as the full process?").
- **If unclear → mirror:** Yosh's scope confirmation: "Just your structure — like when one comes in through the site, who sees it first, how fast, and what happens after hours?"
- **Tone:** Curious and casual ["the first part getting the root cause, what are they doing now? Also very curious and casual"].
- **Then:** → `p1-lc-duration` immediately. **Skip rule:** if `p0-relevance` already produced the process, this node is evidence-satisfied — acknowledge ("Gotcha — so it lands with {their_answer} first") and go straight to `p1-lc-duration`. Never ask twice.
- **Fidelity:** `verbatim_adapted` · L01 / V04 · "What are you doing to get leads now? That I guess has you feeling like you're not really getting enough." / "what's kind of your current process like when you are speaking to a potential prospect"

#### `p1-lc-duration` · Process duration (question 2)
- **Say:** "And how long have you been doing it like that for?"
- **Seeks:** A duration of the process ("since the beginning", "since the last internet manager", "about a year").
- **Why now:** Asked immediately, back-to-back with the origin question: "Then we immediately move into the second question. And how long have you been doing like that for, right? And what kind of caused you…"
- **Listen for:** A number; a career story instead (Yosh's prospect: "I'm just actually kind of transitioning over").
- **If unclear → mirror:** "Okay. So how long has it been like that — as far as {their_answer} picking them up first?"
- **Tone:** Curious and casual.
- **Then:** → `p1-lc-origin` without pause.
- **Fidelity:** `verbatim_adapted` · L02 / V05 · "And how long have you been doing like that for, right?" / "Okay. So, how long have you been that for as far as that style of selling?"

#### `p1-lc-origin` · Origin — the doubt question (question 3)
- **Say:** "And what kind of caused you to, like, like set it up that way in the first place?"
- **Seeks:** The reason the process exists: "it came with the CRM", "nobody decided", "the last guy set it up", "it's what everybody does".
- **Why now:** "This is what we call a doubt question. We're seeding doubt into what they're doing now. So, the tonality is extremely important." The doubt is created by the question and the pause, never by a rebuttal: "Oh, I guess it's all I really knew." Andrés's internalization test uses this exact question: "what is the third question in logical certainty? What caused you to do XYZ?"
- **Listen for:** "It's all I really knew" / "what everybody recommended" / "it's what the CRM does" · a strong defence (stay curious; the change question does the work later).
- **If unclear → mirror:** "Like why in that fashion? Was that a decision somebody made, or did it just kind of end up that way?"
- **Tone:** Curious, shading toward skeptical; leave the beat of silence after it.
- **Then:** "Okay, fair enough, man." → `p1-lc-like`.
- **Fidelity:** `verbatim_adapted` · L03 / V06 · "And what kind of caused you to like like use that approach in the first place." / "What caused you to like like do it that way?"

#### `p1-lc-like` · Satisfaction, bracketing the unmet result
- **Say:** "Okay, fair enough, man. And do you, do you like it? Like, I guess besides obviously {unmet_result}, do you, I guess, like, like the way you've got it set up now though?"
- **Seeks:** Yes / no / mixed ("it's pretty good, it's not bad").
- **Why now:** Asking positives first is deliberate: "if the only thing we're ever talking about is problems and pain … 'this guy's biased. He just wants me to buy' … But if we're also asking about what they do like … 'he's unbiased. He wants the best thing for me.'"
- **Listen for:** A yes or a mixed answer (treat as yes); a flat no.
- **If unclear → mirror:** "Do you like it though? Like the process of how they get worked, day to day?"
- **Tone:** Curious → skeptical begins here ["When you get into the do you like sequence … a little bit more of a skeptical tone"].
- **Then:** Yes / mixed → `p1-lc-like-what` · No → `p1-lc-like-no`.
- **Fidelity:** `verbatim_adapted` · L04 / V07 · "Okay, do do you do you like it? Like I I I I guess besides obviously not losing the weight necessarily, do you I guess like like that fitness regime you have in place like like now though"

#### `p1-lc-like-what` · Valued elements
- **Say:** "Oh, what do you like about it, like in specific?"
- **Seeks:** What must not be broken: "it's simple", "the guys know it", "the CRM already does X", "it's straightforward".
- **Why now:** The valued element tells the pitch what the offer must preserve (the offer's "one existing channel — no new inbox, no new app" is exactly this).
- **Listen for:** Concrete elements; "everybody's used to it" (ease); a sudden pivot to problems (let it come, then still ask for one positive once).
- **If unclear → mirror:** "What do you think is working? Like we can get to the improvements — what's actually good about it?"
- **Tone:** Curious.
- **Then:** → `p1-lc-change`.
- **Fidelity:** `verbatim_adapted` · L05 / V07 · "Oh, what do you like about it like in specific?" / "What do you think is working? Like we can get to that kind of improvements. What do you like about it?"

#### `p1-lc-like-no` · On a "no": ask once, accept "nothing"
- **Say:** "Fair enough, man. Is there anything about it that does work — like even one thing? Or honestly nothing?"
- **Seeks:** One valued element, or an accepted "nothing".
- **Why now:** The source forces a yes here ("it can't be all terrible, like if you've been using it … Tell me one thing"). The live script asks once so the seller still reads as unbiased, and accepts "nothing" as is; the forced re-ask (L06) is study-only.
- **Listen for:** One positive; a genuine "nothing".
- **If unclear → mirror:** n/a — asked once.
- **Tone:** Curious, light.
- **Then:** Something → `p1-lc-change` · "Nothing" → `p1-lc-change` with the skeptical preface dropped ("Okay — so what would you change first, if you could?").
- **Fidelity:** `verbatim_adapted` · L05 on the no-branch · the forced version L06 is excluded (`p1x-forced-positive`).

#### `p1-lc-change` · The change question (skeptical pivot to the problem)
- **Say:** "Okay, it doesn't sound like it's going terrible then. I guess is there, is there anything you would change about either like the way the inquiries get handled, or like, I don't know, what actually happens to them — like if you, if you could though?"
- **Seeks:** A **specific problem** — a change to the process or the result, concrete, not a label: "I might get thirty a month but I can't tell you who has which one without asking".
- **Why now:** "all I'm doing is I'm sounding a little bit skeptical to make them naturally come to our rescue and be like, 'No, no, it's because I have this problem.' And now they're a lot more open." Two objects are offered (process / result) and the hedge "if you could though" closes it.
- **Listen for:** A specific problem · a label only ("speed", "follow-up", "accountability") · "nothing".
- **If unclear → mirror:** Label only → `p1-lc-probe` · "Nothing" → reflect the intent experience once: "Fair enough — earlier you mentioned {experience}; is that not something you'd change?" · still nothing → there is no stated problem; `p0-no-fit`.
- **Tone:** Skeptical [instructor: lean back, scrunch eyebrows; "you've just told me all these things that are going good. Like why … are we here?"].
- **Then:** Problem → `p1-lc-probe` · Nothing (after the reflect) → `p0-no-fit`.
- **Fidelity:** `verbatim_adapted` · L07 / V08 · "Okay, it doesn't sound like it's terrible then. I guess is there is there anything you would change about either like the the the fitness regime you have in place now or like the I don't know. I guess like the weight you're losing like if you if you could though"

#### `p1-lc-probe` · Probe until concrete
- **Say:** "What do you mean by that?" · "How do you mean? Like describe that for me." · "Give me an example of like an instance where that happened."
- **Seeks:** The definition on a real instance: what the label means, one example, a count.
- **Why now:** "Immediately we probe to make the problem seem bigger. What do you mean by that? How do you mean meaning? And now they're going to give us more information." Yosh's pivot when the answer is soft: "something that he cannot be bullshitted out of" — an instance, an observed objection, a count.
- **Listen for:** An instance with a who/when; a count; a sameness admission.
- **If unclear → mirror:** "Like one from the last couple weeks — what actually happened?"
- **Tone:** Mix of skeptical and curious ["in the probing section, it's going to be a mix of that skeptical and curious to get them to go deeper"].
- **Then:** Concrete → `p1-lc-label` (optional) → `p1-lc-problem-duration`.
- **Fidelity:** `verbatim_adapted` · L08 / L09 / V14 · "What do you mean by that? How do you mean meaning?" / "And how do you mean by that? Like describe that for me." / "give me an example of like an instance where you may have"

#### `p1-lc-label` · Label the problem (optional, seller-proposed, prospect-confirmed)
- **Say:** "Okay. So {label}."
- **Seeks:** Confirmation or correction of a one- or two-word label ("ownership", "follow-through", "visibility").
- **Why now:** "Labels are extremely important because it makes it a lot easier to ask sharper questions in the future … the rule of thumb is labels have meaning." The label is then reused in the impact question.
- **Listen for:** "Yeah, {label}" (confirmed) versus their own better word (use theirs).
- **If unclear → mirror:** "Or how would you put it?"
- **Tone:** Casual, flat, a statement with a question mark.
- **Then:** → `p1-lc-problem-duration`. Provenance: *seller proposed, prospect confirmed* — never displayed as a prospect quote.
- **Fidelity:** `verbatim_adapted` · V25 · "Okay. So efficiency. >> Efficiency. Yeah."

#### `p1-lc-problem-duration` · Duration of the problem (distinct from process duration)
- **Say:** "And how long has that been going on for, man? To where like {stated_problem}?"
- **Seeks:** A duration of the problem ("since we changed CRMs", "always", "the last year").
- **Why now:** "Then we go, and how long has that been going on for … Three years, man." Extending the problem over time makes it bigger; echo the number back.
- **Listen for:** A number; "always" (that is an answer).
- **If unclear → mirror:** "Like has it been a couple of months, or is this kind of how it's always been?"
- **Tone:** Curious; echo the number ("A year, man.").
- **Then:** → `p1-lc-impact`.
- **Fidelity:** `verbatim_adapted` · L10 · "and how long has that been going on for to like you feel like you're not really losing any weight?"

#### `p1-lc-impact` · Impact (B2B form)
- **Say:** "And without assuming anything, man — because like I want to help you with that — you having {stated_problem} for the past {duration}, even though {their_effort}… how has that actually had an impact, I guess, on like {impact_object: the floor / the appointments you're setting off the site / the team / what you can see at month-end}?"
- **Seeks:** The downstream cost in their words: operational (appointments not set, salespeople chasing), economic (units they believe walked), personal (the owner chasing leads, not trusting the numbers). Keep three sub-types labelled separately: verified count · estimate/hypothesis · feeling.
- **Why now:** "The only question that becomes a little bit tricky … is the impact question." B2B form: "How is that actually had an impact I guess on your ability to like hire a crew and keep expanding?" The preface "without assuming anything … cuz I want the best for you" keeps it from sounding like an accusation. If a label was confirmed, use it: "You feeling like you don't have that {label} — does that have an impact…"
- **Listen for:** A bare "yeah" (follow with `p1-lc-impact-howso`) · a count · a feeling.
- **If unclear → mirror:** `p1-lc-impact-howso`; or the quantifying route `p1-lc-count`.
- **Tone:** Concern [instructor: lean in, raise eyebrows].
- **Then:** Impact stated → "Now we have the deep rooted pain." → `p1-st-zoom` · Bare yes → `p1-lc-impact-howso` · Good-to-great prospect (no acute pain) → `p1-lc-count`.
- **Fidelity:** `verbatim_adapted` · L12 (B2B) with L11's preface · "And without assuming anything again because like I I want to help you with that. You only getting these three leads a month to where we're limited. How is that actually had an impact I guess on your ability to like hire a crew and keep expanding?" The fitness object (motivation, L11) and bizop object (day-to-day life, L13) are not imported for B2B; L13's form is available if the owner's day-to-day is the honest object.

#### `p1-lc-impact-howso` · After a bare yes
- **Say:** "Well, how so? Just so I understand."
- **Seeks:** The specific impact.
- **Why now:** "they're like well yeah of course well how so just so I understand oh I mean I can't go on vacations man".
- **Tone:** Concern, curious.
- **Then:** → `p1-st-zoom`.
- **Fidelity:** `verbatim_adapted` · L14 · "well how so just so I understand"

#### `p1-lc-count` · Quantifying alternative (good-to-great prospects)
- **Say:** "In the past month, man, roughly how many come in through the site? … And how many of those, like, actually turned into somebody in the store? … What does 'a few' mean — like two, five, ten? … And how many of those do you think could've turned into an appointment, though, if every one of them got {their_word}?"
- **Seeks:** Verified counts (arrivals, appointments) and a prospect's own estimate of the missed ones — labelled as an estimate, never a seller's projection. A unit value is asked only if they volunteer thinking in those terms ("what's a sold unit worth to the store, roughly?"), and the app labels any product of the two as the prospect's assumption.
- **Why now:** "stop thinking in terms of just words. Start thinking in terms of principles … if you could quantify how much money they're losing out on … Is that an impact … Absolutely." "There's two kinds of pain. There's the pain of not having and there's the pain of having something that is [broken]."
- **Listen for:** Real numbers versus guesses; the exactness mirror ("two, five, ten?").
- **If unclear → mirror:** "Ballpark's fine — are we talking a handful or a few dozen?"
- **Tone:** Curious, brisk; skeptical echo of a number is allowed ("Three, man."), deflation ("only three? why so low?") is not.
- **Then:** → `p1-st-zoom`.
- **Fidelity:** `verbatim_adapted` · V09 / V10 / V11 / V17 / V18 · "In the past month, man, how many people have you spoken like actively … And how many sales did you get past month? … What was that mean? Like two, five, 10. How many? … How many sales do you think like could have been made though". Brief rule: no dollar-valued opportunity estimate unless the underlying amounts and assumptions are entered and labelled.

### 1.3 Setter transition — six-month target, gap, conditional willingness, permission, booking

Andrés: "A prospect has just told you, this is what I'm doing. It is causing all these problems … I need something new … that's the exact moment we go in for the transition." Jason is his own setter: the "closer" he connects them with is himself on a booked deeper call.

#### `p1-st-zoom` · Six-month target
- **Say:** "Okay, so let's zoom out for a second, man. In an ideal world, where do you want {dealership_name} to be in six months in terms of like what actually happens to a website inquiry?"
- **Seeks:** A target state with a horizon: "every one answered within the hour", "one person owning each one", "I can see it on one screen".
- **Why now:** "Okay, so let's zoom out for a second, man. In an ideal world, where do you want to be in six months in terms of like income, for example?" The metric is the offer's, not income; a time frame "goes from being a dream to being a goal".
- **Listen for:** A concrete state; "just better" (make it real: "better meaning what — like what would you actually see?").
- **If unclear → mirror:** "If we were talking again in March and it had gone the way you want, what would you tell me is different?"
- **Tone:** Casual, upward inflection.
- **Then:** → `p1-st-gap`.
- **Fidelity:** `verbatim_adapted` · S01 · "In an ideal world, where do you want to be in six months in terms of like income, for example?"

#### `p1-st-gap` · Baseline gap
- **Say:** "Okay, how far are you from that now?"
- **Seeks:** The gap in their terms ("miles", "we're maybe halfway", "we answer maybe half of them the same day").
- **Why now:** "Okay, how far are you from that now? Oh, well, I'm at 5K a month. Great. So, now we know their income."
- **Listen for:** A number or a fraction; a downturn in voice (Yosh: "How far are you? Pretty far.").
- **If unclear → mirror:** "Like out of ten, where are you today?"
- **Tone:** Casual, downward inflection allowed.
- **Then:** Normal → `p1-st-permission` · Signal that the store may not be able or willing to invest at all (very small store, "we don't spend on this stuff") → `p1-st-willing` first.
- **Fidelity:** `verbatim_adapted` · S02 · "Okay, how far are you from that now?"

#### `p1-st-willing` · Conditional theoretical willingness (only on a low-qualification signal)
- **Say:** "Okay, well, sweet, man. Let's say there was a way to kind of possibly help you get from like {baseline} to like {target_6mo}. Like, would you actually be willing to invest in that, if that's what it took?"
- **Seeks:** A theoretical yes/no — never a number, never a commitment.
- **Why now:** "The only nuance here, if they give a number that is too small … Then you need to get a willingness to spend money … notice I'm making it very theoretical. It's not like, 'Do you want to invest?' That triggers a lot of resistance." Conditional in the source; the framework keeps it conditional — never a universal affordability test.
- **Listen for:** "Yeah, if it worked" (yes) · "we wouldn't spend on that" (an honest no → respectful exit with the scope one-pager, no push).
- **If unclear → mirror:** "Not asking for a number, man — just whether it's the kind of thing {dealership_name} would put money behind if it did what you said."
- **Tone:** Casual, theoretical, "in the ether".
- **Then:** Yes → `p1-st-permission` · No → `p3-exit-respectful`.
- **Fidelity:** `verbatim_adapted` · S03 · "Let's say there was a way to kind of possibly help you in kind of acquiring the right skills so you could go from like that 5K a month to like the 30K a month goal. Like, would you actually be willing to invest in yourself if that's what it took?"

#### `p1-st-permission` · Permission to book the deeper call
- **Say:** "Okay, well, based on what I've heard, man — obviously you mentioning like {stated_problem}, and so {impact} — I feel like there might be a possibility of being able to help you with getting to {target_6mo}. What I could do from here, man, is set up like a proper half hour where I dive a lot deeper into where {dealership_name}'s at now versus kind of like where you really want to be, besides just {target_6mo}. And then if I genuinely feel we could help, I'd walk you through what that would actually look like for {dealership_name}. How does that sound?"
- **Seeks:** A yes to a scheduled deeper call.
- **Why now:** "based on what I've heard, man, obviously you mentioning like you're not really making enough money … I feel like there might be a possibility of being able to help you … What I could do from here, man, is I could connect you with John and he could kind of dive a lot deeper into like where you're at now versus kind of like where you really want to be … And then if he feels we could help, he could walk you through … How does that sound?" Jason is the "John"; the recap uses their words; "might be a possibility" is a hedge, not a claim.
- **Listen for:** "Yeah, let's do it" · "send me something first" (offer the one-pager and still ask for a time) · "not sure it's worth it" (accept; one honest line about what the half hour is and is not, then the exit).
- **If unclear → mirror:** "Would that be awful?" (`p1-st-awful`) or "Would a half hour on {day} be a nuisance, or workable?"
- **Tone:** Casual, confident, upward inflection.
- **Then:** Yes → `p1-st-book` · Wants material first → send the scope one-pager, then `p1-st-book` · No → `p3-exit-respectful`.
- **Fidelity:** `verbatim_adapted` · S04 · as quoted.

#### `p1-st-awful` · Negative-form check (optional register)
- **Say:** "Would that be awful?"
- **Seeks:** A "no, that'd be great".
- **Why now:** Andrés's own closing check on the transition; the negative form lowers resistance. Optional — Jason decides if it fits his voice.
- **Tone:** Casual, light.
- **Then:** → `p1-st-book`.
- **Fidelity:** `verbatim_adapted` · S05 (adapt) · "How does that sound? would that be awful?"

#### `p1-st-book` · Booking and decision roles
- **Say:** "Cool. What's easier for you — {day_a} or {day_b}? … Morning or afternoon? … I'll send a calendar invite — what's the best email? … And is that a conversation you'd want {dealer_principal / partner} on, or is that yours to run?"
- **Seeks:** A specific slot, an email, and who holds the economic decision.
- **Why now:** "And then from there, you just obviously go to the calendar … and then you schedule them in." The decision-role question is an Apohenia addition that pre-empts the partner objection honestly (the offer's decision roles: economic decision = dealer principal or GM).
- **Listen for:** A real slot; "I'd want {name} there" (book for both); "it's mine".
- **If unclear → mirror:** "Which one would you actually keep — the {day_a} slot or {day_b}?"
- **Tone:** Casual, brisk.
- **Then:** Booked → `p1-st-notes`; confirmation invite; the deeper call opens at `p2-entry-connect`.
- **Fidelity:** `apohenia_addition` · booking mechanics are named in the source ("go to the calendar"), not scripted.

#### `p1-st-notes` · Setter notes (written, not spoken)
- **Content:** tangible · experience · current process · process duration · origin · valued element · specific problem (+ label, provenance) · problem duration · impact (count / estimate / feeling, labelled) · six-month target · gap · decision roles · every `{their_word}` verbatim.
- **Why now:** The closing call opens by recapping these: "If the setter did not leave you notes … he's clearly a shitty setter." Since Jason is both, the notes are for himself.
- **Fidelity:** `apohenia_addition` (the source names the notes, never their fields).

### 1.4 Excluded from Part 1 (study only)

- `p1x-forced-positive` — "Well, it can't be all terrible, like if you've been using it, you know what I mean? What do you like about it, man? Tell me one thing." (L06). Live script asks once and accepts "nothing".
- `p1x-deflation` — "A million a week? Jesus, man, you guys are crushing it." / "Only five? Why? Why so low?" (D01, D02). Any number the prospect states is recorded, echoed, never challenged.

---

## Part 2 — CLOSING CALL (the booked deeper call)

Andrés: "If you have a setter underneath you … you're going to start the call from emotional certainty." Jason set the call himself, so the closing call opens on his own notes and Intent is **not** repeated. If the deeper call was booked from an inbound form with no setting conversation, run Part 0.3 → Part 1 first and continue here from `p2-rationale`.

### 2.1 Entry

#### `p2-entry-connect` · Connection check and casual open
- **Say:** "Hey, hey, {first_name}, can you, can you hear me alright? … What's up, man? How's it going?"
- **Seeks:** Audio confirmed, a casual first exchange.
- **Why now:** "you're not just gonna hop on second five on the Zoom and just so I see your point. No, no, don't do that … Just start it like this. Hey, hey, John, can you can you hear me? can you see me? … What's up, buddy? How's it going? Again, very, very casual." On a phone call "can you see me" is dropped.
- **Listen for:** Their energy; nothing to extract.
- **If unclear → mirror:** "Am I coming through okay on your end?"
- **Tone:** Casual, very casual.
- **Then:** → `p2-entry-recap`.
- **Fidelity:** `verbatim_adapted` · I05 · "Hey, hey, John, can you can you hear me? can you see me?"

#### `p2-entry-recap` · Recap of the setting notes, "is that about right?"
- **Say:** "Cool, man. Well, let's get right into it. I've got my notes here from when you and I spoke on {day}. You mentioned you were looking to get {tangible}, because I think you said {stated_problem}, and it was kind of {impact} — is that, is that about right?"
- **Seeks:** A yes, or a correction (recorded; dependent slots re-filled).
- **Why now:** "I have some notes here from John. I know my colleague obviously you spoke to earlier. He mentioned that you were looking to get better in terms of your diet because I think you mentioned you felt like you weren't losing as much weight as you'd like and it was kind of like draining you a little bit … Is that is that about right?" Jason's own notes stand in for the colleague's.
- **Listen for:** "Yeah" · "well, it's more that…" (a correction is data — update `{their_word}`).
- **If unclear → mirror:** "Did I get the main thing right, or is there something I've got backwards?"
- **Tone:** Casual; "a short summary of the notes", not a re-interview.
- **Then:** Yes → `p2-rationale` · Notes missing or disputed → `p2-entry-missing`.
- **Fidelity:** `verbatim_adapted` · I08 · as quoted.

#### `p2-entry-missing` · Notes missing or disputed (evidence check)
- **Say:** "Okay — then let me get it right from you, because I don't want anything lost in translation. {the specific missing question from Part 1, e.g. `p1-intent-experience` or `p1-lc-change`}"
- **Seeks:** The missing objective only — never the whole of Part 1 again.
- **Why now:** Route to the missing question, not past discovery. Yosh's own opener does this: "I told it fairly brief because I want to get it right from you. Like nothing got lost translation."
- **Tone:** Casual.
- **Then:** → `p2-rationale` once the notes are complete.
- **Fidelity:** `apohenia_addition` (evidence check) · wording from V01 "I want to get it right from you. Like nothing got lost translation."

### 2.2 Rationale and the pre-handling decision tree

#### `p2-rationale` · Rationale question (pre-handles "I'll just do it myself")
- **Say:** "Okay. And just so I see kind of your point of view, man — besides obviously like {stated_problem}, what's the main reasoning of even looking at, I guess, like a more structured way of handling those inquiries, rather than just, I don't know, like doubling down on what you've been doing — telling the team to be quicker on it and hoping it sticks, like the average store? Like why not just do that?"
- **Seeks:** Their own justification for changing rather than continuing ("we've told them a hundred times", "it's not a people problem, nobody owns it").
- **Why now:** "The point of the rationale question is to pre-handle the objection of, oh, I'm just going to do it myself … now they're selling me on why they need to change it up." Andrés makes the second option sound bad by tonality ("rather than just, I don't know, just continue doing the referral … like the average person"). Yosh's version: "why get more skills rather than [just making more dials]?"
- **Listen for:** A real reason · a stated preference for in-house ("honestly we might just fix it ourselves") — accepted, not argued down: one honest line about what the offer is and is not, then the exit with follow-up.
- **If unclear → mirror:** "Like why not just tell {internet_manager} to be faster on it and leave it there — what's wrong with that?"
- **Tone:** Curious; the "like the average store" clause carries the skeptical shade by inflection, not by insult.
- **Then:** Reason given → `p2-ph-looked` · Prefers in-house → `p3-exit-respectful`.
- **Fidelity:** `verbatim_adapted` · E01 / V24 · "besides obviously like not getting the amount of leads you'd like to, what's the main reasoning of even looking at I guess like a more advanced system for getting those leads rather than just, I don't know, like doubling on the referrals, just hoping it grows the business like the average person. Like why not just do that?"

#### `p2-ph-looked` · Binary 1 — looked before?
- **Say:** "Okay. And in regards to that — like before you and I were speaking, were you out there looking for other ways to, I guess, like get this handled, or like what were you actually doing about that?"
- **Seeks:** No, I wasn't / Yes, I was (or one of the Apohenia branches below).
- **Why now:** "the most common objection a prospect is going to give you is the same objection they gave in the past that prevented them from getting the help they needed … it's a lot easier to pre-handle that objection before I pitch them." Yosh's principle: the question is "did you invest into something?" — a training the company paid for does not count: "company aside though did you do any training".
- **Listen for:** "No" · "Yeah, we looked at {vendor}" · "We've got {vendor} in now" (still-active) · "We tried something, mixed" · "Not my call" · "Honestly don't know".
- **If unclear → mirror:** "Besides what the store already had in place — did you yourself go looking at anything for this?"
- **Tone:** Extremely curious ["you're going to be extremely curious for most of the pre-handling until you get to the what's shifted question"].
- **Then:** No → `p2-ph-prevented` · Yes → `p2-ph-moved` · Still-active provider → `p2-ph-still-active` · Mixed → `p2-ph-mixed` · No authority/budget → `p2-ph-no-authority` · No actual problem → `p2-ph-no-problem` · Unknown/declined → `p2-ph-declined`.
- **Fidelity:** `verbatim_adapted` · E02 / V28 · "before you and I were speaking were you out there looking for other ways to I guess like get more of like that advanced training so you could actually like lose that weight or like what were you actually doing about that"

#### `p2-ph-prevented` · What prevented you?
- **Say:** "What prevented you, man? Why not?"
- **Seeks:** The objection they would otherwise give at the end: money, time, partner/dealer principal, "vendors always overpromise", "we're changing CRM".
- **Why now:** "Here's where they give they're going to give you the objections that they would have given you at the end. So now it's a lot easier to overcome."
- **Listen for:** The category (money / time / partner / fear) and their exact words.
- **If unclear → mirror:** "Like what actually got in the way — was it money, time, somebody else's call, or just not sure it'd work?"
- **Tone:** Curious.
- **Then:** → `p2-ph-shifted`.
- **Fidelity:** `verbatim_adapted` · E03 · "I go what prevented you man? Why not?"

#### `p2-ph-shifted` · What shifted now?
- **Say:** "Well, out of curiosity — like what shifted for you now then? Like obviously if {barrier} was what was preventing you in the past, like what kind of changed now that actually has you open to looking at it?"
- **Seeks:** The reason the old barrier no longer holds ("we finally have the budget line", "the new GM cares about this", "I got tired of finding them a week later").
- **Why now:** "What did we just do? We just pre-handled that objection. Before it was an issue because of this and this and that. Now it's not an issue. And now they've told us that so they can't give us the objection again at the end."
- **Listen for:** A plausible change (accept it — Yosh's reviewed prospect "gave a valid reason … it's hard to really pressure him on that") · "nothing's really changed" (the barrier is still live → diagnose it honestly in Part 3 later, do not pretend it is handled).
- **If unclear → mirror:** "Like if {barrier} was the reason then, is it still the reason now, or did something actually move?"
- **Tone:** A little more challenging, a little skeptical ["Right there, we need to be a little bit more challenging, a little bit more skeptical to once again make them come to our rescue"].
- **Then:** Shifted → `p2-bolt-permission` · Still constrained → note the live constraint; continue to `p2-bolt-permission`; the constraint is handled truthfully in Part 3.
- **Fidelity:** `verbatim_adapted` · E04 · "well, out of curiosity, like what shifted for you now then? Like obviously if the money was what was preventing you in the past, like what kind of change now that actually has you open to like looking for more of like that advanced training"

#### `p2-ph-moved` · Binary 2 — moved forward with anything?
- **Say:** "Okay — did you actually, like, like move forward with anything, or like what actually ended up happening?"
- **Seeks:** No, didn't move forward / Yes, did.
- **Why now:** "If they said yes, I was looking. Now we ask another question. We have another binary."
- **Listen for:** "Looked, never signed" · "we ran a trial" · "we've got it in now".
- **If unclear → mirror:** "Did anything actually get switched on, or did it stop at the demo?"
- **Tone:** Curious.
- **Then:** No → `p2-ph-prevented` (then `p2-ph-shifted`) · Yes → `p2-ph-result`.
- **Fidelity:** `verbatim_adapted` · E05 · "okay, did you actually like like move forward with anything or like what actually ended up happening?"

#### `p2-ph-result` · Binary 3 — good result or bad?
- **Say:** "Okay, and did you get like a, like a good result or a bad result?"
- **Seeks:** Good / bad / mixed.
- **Why now:** "If somebody got a bad result last time … What's preventing me from getting a bad result this time, too? … That's a value objection." / "I got a good result last time. Why do I even need you guys?"
- **Listen for:** Good · bad · "sort of" (mixed → `p2-ph-mixed`).
- **If unclear → mirror:** "Like did it do what they said it would, or not really?"
- **Tone:** Curious.
- **Then:** Bad → `p2-ph-criteria` · Good → `p2-ph-bottleneck` · Mixed → `p2-ph-mixed`.
- **Fidelity:** `verbatim_adapted` · E06 · "okay, did you get like a like a good result or a bad result?"

#### `p2-ph-criteria` · Ideal criteria (after a bad result)
- **Say:** "Well, out of curiosity, man — what would you need to see in something this time to be able to be like, oh, I actually feel like they could get this handled, even though last time obviously it didn't?"
- **Seeks:** Criteria in their words: "somebody who actually sets it up with us", "I want to see it on my screen", "not another app for the guys", "a clear start and stop".
- **Why now:** "we need some kind of criteria of what would make them feel like we're different than those other people because … as soon as we get to the pitch … We're just going to plug in whatever answers they gave us here straight into the pitch." Yosh: "what are you actually looking for in like a training program? Like, what's kind of the ideal criteria".
- **Listen for:** Two or three concrete criteria; probe each once ("when you say support, what does that actually look like?").
- **If unclear → mirror:** "Like if two vendors called you tomorrow, what would make you pick one over the other?"
- **Tone:** Curious.
- **Then:** → `p2-bolt-permission`. Criteria are carried into the pillar lines only where the offer genuinely delivers them; a criterion the offer does not meet is said plainly ("that one I can't give you") — never absorbed.
- **Fidelity:** `verbatim_adapted` · E07 / V29 · "what would you need to see in something this time to be able to be like, oh, I actually feel like they could get me results even though last time obviously you didn't"

#### `p2-ph-bottleneck` · Remaining bottleneck (after a good result)
- **Say:** "Well, I mean, out of curiosity, man — like if you got a good result last time, what even has you looking at, I guess, possibly something more this time?"
- **Seeks:** The bottleneck: "it fixed speed but nobody owns them", "it's a black box", "they left".
- **Why now:** "Well, I got a good result last time. Why do I even need you guys? … Oh, well, I feel like we hit a bottleneck … Great. What did we just do? We pre-handled that objection."
- **Listen for:** A specific remaining gap; "honestly nothing" (→ `p2-ph-no-problem`).
- **If unclear → mirror:** "Like what's the one thing it still doesn't do that you wish it did?"
- **Tone:** Curious.
- **Then:** → `p2-bolt-permission`.
- **Fidelity:** `verbatim_adapted` · E08 · "if you got a good result last time, what even has you looking for, I guess, possible more advanced training this time?"

#### `p2-ph-still-active` · Apohenia branch — a provider is still in place
- **Say:** "Okay — so {vendor} is still in there. What's it doing for you, and what's it not doing, that has you and me talking?"
- **Seeks:** The overlap and the gap; whether this offer would duplicate or complement.
- **Why now:** Brief §6 adds explicit live routes the source tree lacks. Honest fit: if the incumbent covers all three pillars, say so and exit.
- **Tone:** Curious.
- **Then:** Gap stated → `p2-bolt-permission` · Fully covered → `p3-exit-respectful`.
- **Fidelity:** `apohenia_addition`.

#### `p2-ph-mixed` · Apohenia branch — mixed result
- **Say:** "Gotcha — so some of it worked. Which part actually did, and which part is the reason we're on the phone?"
- **Seeks:** The part to preserve and the part that failed (feeds criteria and pillars).
- **Tone:** Curious.
- **Then:** → `p2-ph-criteria` for the failed part.
- **Fidelity:** `apohenia_addition`.

#### `p2-ph-no-authority` · Apohenia branch — no authority or budget
- **Say:** "Totally fair. So whose call would it actually be at {dealership_name} — and is that a conversation you'd want to have with them in the room, or me?"
- **Seeks:** The real decision-maker and the route to them.
- **Why now:** A genuine lack of authority is accepted (offer decision roles), never reframed as the partner objection.
- **Tone:** Casual.
- **Then:** Route agreed → continue discovery for the operational owner's benefit; book the decision-maker → `p2-bolt-permission` or `p3-exit-respectful` with follow-up.
- **Fidelity:** `apohenia_addition`.

#### `p2-ph-no-problem` · Apohenia branch — no actual problem
- **Say:** "Fair enough — then it sounds like you've got it handled, and I'd rather say that than pretend otherwise."
- **Tone:** Casual.
- **Then:** → `p0-no-fit`.
- **Fidelity:** `apohenia_addition`.

#### `p2-ph-declined` · Apohenia branch — unknown or declined
- **Say:** "No problem — we can leave that one."
- **Then:** → `p2-bolt-permission`; the node is recorded as declined, never converted.
- **Fidelity:** `apohenia_addition`.

### 2.3 Optional analogy, positive future, consequence

#### `p2-bolt-permission` · Permission to offer a perspective
- **Say:** "Well, can I offer you a perspective, man?"
- **Seeks:** A yes.
- **Why now:** "before we go there, we need to say an analogy to them to make them more likely to give us a good response. This isn't required on every single call."
- **Tone:** Casual.
- **Then:** Yes → `p2-bolt` (optional) or straight to `p2-future` · No → `p2-future`.
- **Fidelity:** `verbatim_adapted` · F01 · "Well, can I offer you a perspective, man?"

#### `p2-bolt` · The Usain Bolt analogy (optional)
- **Say:** "Have you heard the Usain Bolt analogy? … It's like — if you take Usain Bolt, right, obviously fastest man in the world, and you put him on a starting line, you tell him to run a hundred-metre dash — he's going to run fast. Now you put a lion behind him, chasing him down, trying to eat him, just gnawing at him the whole time — he's going to run even faster. Because the most successful people in the world, they have a strong pull of what they want to achieve, but they also have a strong enough consequence to failure to push them to actually achieve it."
- **Seeks:** Nothing; it frames the next two questions as a good thing.
- **Why now:** "Now, I've gotten them to understand the value of having a strong pull and a strong consequence to failure because I'm about to ask them what is their pull and what is the consequence to failure."
- **Tone:** Casual, storytelling; brief.
- **Then:** → `p2-future`.
- **Fidelity:** `verbatim_adapted` (optional) · F02 · as quoted. **Bank: study_only — reclassification pending owner decision.** Not auto-presented until reclassified.

#### `p2-future` · Positive future pace (business first)
- **Say:** "So let's say there was a way of possibly helping you with actually like getting every inquiry {their_word} — that way {reversed_problem in their words}, and everything else. What would tangibly be like, like different for the business at that point?"
- **Seeks:** Two to three specific, vivid business outcomes in their words ("Saturday floor's got appointments on it", "the guys stop fighting over who had it", "I'd know by Monday").
- **Why now:** "We're looking for specific, tangible, vivid things that would be different about their life … Now, we need two to three of these. The key is they are never going to give it to you as soon as you ask this question. You're going to have to probe to build this visualization."
- **Listen for:** A first outcome; a vague word ("smoother" — probe its meaning); a repeat of the goal ("they'd be handled" — mirror).
- **If unclear → mirror:** "No, sorry, man — I don't think I was clear. What I meant to ask is: you actually having every inquiry {their_word}, how would that impact, like, other parts of the store, though? Just to see if I could even help." (M03 construction)
- **Tone:** Curious with upward inflection ["who who would you take on that vacation? … it's an upward inflection"].
- **Then:** Outcome 1 → probes (`p2-future-meaning` / `p2-future-where` / `p2-future-who`) → `p2-future-growth` → `p2-future-owner`.
- **Fidelity:** `verbatim_adapted` · F03 / F10 · "Let's say there was a way of possibly helping you with actually like getting to those 50 leads a month, those higher quality leads. What would tangibly be like different for the business at that point?" Mirror: M03 "you actually losing those 50 pounds how would that impact like like other aspects of your life though just to see if I could even help".

#### `p2-future-meaning` · Probe their word
- **Say:** "Well, how do you mean by {their_word}?"
- **Seeks:** The meaning of the word in their situation ("smoother" = "nobody asks me who had it").
- **Why now:** "'Oh man, I'll just finally feel free in my body.' And I could go, 'Well, how do you mean by free?'" Yosh: "You said a word that was kind of interesting like gratification … How do you [mean] gratification? Like in what way?"
- **Tone:** Curious, upward.
- **Then:** → next probe or `p2-future-growth`.
- **Fidelity:** `verbatim_adapted` · F04 / V43 · "Well, how do you mean by free?"

#### `p2-future-where` · Where would it show up
- **Say:** "Where would that show up first, man — like the Saturday floor, the month-end, the service drive?"
- **Seeks:** A place and a moment (the B2B equivalent of "where would you want to stay?").
- **Why now:** "Well, where would you want to travel, man? … where do you want to stay? … I'm making them visualize a specific scenario." Details make it real: "when there's details".
- **Tone:** Curious, upward.
- **Then:** → `p2-future-who` or `p2-future-growth`.
- **Fidelity:** `verbatim_adapted` · F05 / F06 / F07 · "In what situations do you think your confidence would, I guess, like improve the most?" / "where do you want to stay?"

#### `p2-future-who` · Who would notice
- **Say:** "And who'd notice it first — like who on the team?"
- **Seeks:** A person (the B2B equivalent of "who would you take with you?").
- **Why now:** "I'm assuming you wouldn't want to go alone. Like who would you want to take with you?"
- **Tone:** Curious, upward.
- **Then:** → `p2-future-growth`.
- **Fidelity:** `verbatim_adapted` · F08 · "Like who would you want to take with you?"

#### `p2-future-growth` · Effect on the store's growth
- **Say:** "Ah — and how do you feel like that would impact like the store's growth, even?"
- **Seeks:** The second-order business effect in their words.
- **Why now:** "Ah, and how do you feel like that would impact like the company's growth even?"
- **Tone:** Curious, upward.
- **Then:** → `p2-future-owner`.
- **Fidelity:** `verbatim_adapted` · F11 · as quoted.

#### `p2-future-owner` · Make it personal — the owner/GM
- **Say:** "And obviously, like, you being the {role} — what would even be different for you, like at that point, as the {role}?"
- **Seeks:** The personal outcome, only if offered ("I stop being the one who chases", "I trust the number I give the dealer").
- **Why now:** "in B2B after I get that specific for the business now I need to make it personal … 'and obviously like you being the owner what would even be different for you like at that point as the owner.'"
- **Listen for:** A personal outcome; a deflection ("it's not about me") — accept it.
- **If unclear → mirror:** "Like for your week, though — what changes?"
- **Tone:** Curious, upward.
- **Then:** → optional `p2-future-feel` → `p2-consequence`.
- **Fidelity:** `verbatim_adapted` · F12 · as quoted.

#### `p2-future-feel` · How would that feel (optional; often skipped in B2B)
- **Say:** "And how would that, like, feel, man? Like put yourself in those shoes for a second."
- **Seeks:** A feeling word, if they offer one; never required.
- **Why now:** "And how would that like feel, man? … put yourself in those shoes for a second." In B2B "this question you might want to skip it sometimes".
- **Tone:** Curious, upward, wispy.
- **Then:** → `p2-consequence` immediately ("you want to make this jump really fast").
- **Fidelity:** `verbatim_adapted` · F09 · as quoted.

#### `p2-consequence` · Consequence — two days, two weeks, two months, even two years
- **Say:** "And what if you don't, man? What happens if {dealership_name} stays in the exact same position, where {stated_problem in their words}, for the next two days, two weeks, two months, even two years, man? Like what would happen at that point?"
- **Seeks:** Two to three specific negative outcomes in their words — or an honest "not much" (accepted; no emotional word is ever required).
- **Why now:** "right after we get this peak positive emotion, then we go and what if you don't, man? … We're getting two to three tangible specifics about the negative now." Placed immediately after the future so the contrast is felt: "the amount of pain condensed into the shortest amount of time possible."
- **Listen for:** A specific consequence ("we'd keep paying for leads nobody works") · a generic shrug ("much the same") → `p2-consequence-mirror` · "honestly, not much" → accepted.
- **If unclear → mirror:** `p2-consequence-mirror`.
- **Tone:** Curious with downward inflection ["and what would happen then? It's very downwards"].
- **Then:** Specific → `p2-consequence-probe` → `p2-consequence-owner` → `p2-commit-settle` · "Not much" → `p2-commit-settle` framed on their stated gap, or `p3-exit-respectful` if there is genuinely no cost.
- **Fidelity:** `verbatim_adapted` · C01 · "And what if you don't, man? What happens if we stay on the exact same trajectory where we're getting those five leads a month … for the next two days, two weeks, two months, even two years, man. Like what would happen at that point?"

#### `p2-consequence-probe` · Make the consequence specific
- **Say:** "Oh — what, I guess, would that hit first, just so I understand, so I can kind of help you a little bit better? … Is that like a {Saturday / month-end / service} thing?"
- **Seeks:** The concrete place/person/number the consequence lands on.
- **Why now:** "Oh, what sports I guess wouldn't you be able to play just so I understand so I can kind of help you a little bit better. … Oh, do you have like a field nearby?"
- **Tone:** Curious, downward.
- **Then:** → `p2-consequence-owner`.
- **Fidelity:** `verbatim_adapted` · C02 / C03 · as quoted.

#### `p2-consequence-owner` · What it means for the owner/GM
- **Say:** "Oh, that makes sense. And what do you think that might even mean for you, like as the {role}?"
- **Seeks:** The personal cost, if offered.
- **Why now:** "And what do you think that might even mean for you like as the owner? And again, I ask that because I care, right?"
- **Tone:** Concern; downward.
- **Then:** → optional `p2-consequence-feel` → `p2-commit-settle`.
- **Fidelity:** `verbatim_adapted` · C04 · as quoted.

#### `p2-consequence-feel` · How would you feel (optional; skip in most B2B)
- **Say:** "And how would you, like, like feel at that point?"
- **Seeks:** A feeling if offered; never required, never a specific word.
- **Why now:** "Now, for B2B, this question you might want to skip it sometimes … For B to C, almost always you're going to ask this."
- **Tone:** Concern; downward.
- **Then:** → `p2-commit-settle`.
- **Fidelity:** `verbatim_adapted` · C05 · as quoted. The regret-seeking variant (C06) is excluded (`p2x-regret`).

#### `p2-consequence-mirror` · Call-out and re-ask on a shrug
- **Say:** "Well, man, I've met a lot of stores that say that, right — it stays the same, and they get by, but it's not where they wanted to be. What would be the day-to-day ramifications, though, of {dealership_name} sitting exactly where it is three, six, twelve months down the line?"
- **Seeks:** A specific day-to-day consequence, or an honest "not much".
- **Why now:** Yosh's consequence mirror: "Number one, he called it out. Yeah. Well, I know a lot of people stay the same, right? … Mirror question right after. What would be the day-to-day ramifications?" One call-out, one re-ask; then accept.
- **Tone:** Curious, downward.
- **Then:** → `p2-commit-settle` or `p3-exit-respectful`.
- **Fidelity:** `verbatim_adapted` · V45 · "well, man, I met a lot of people that say, right? They never use their full potential and they live a life something they want. What's like the day-to-day gratification of you seeing exactly where you're at 36 12 months down the line". Note: "I've met a lot of stores that say that" must be true for Jason — if it is not yet, use "people" as in the source or drop the clause.

### 2.4 Commitment triad and permission to pitch

#### `p2-commit-settle` · Are you willing to settle for that?
- **Say:** "So this will sound like an obvious question, man, but I mean — I mean it's really not. Are you willing to settle for that?"
- **Seeks:** "No" (commitment to change); "yeah, we could live with it" is an honest answer that routes to the exit.
- **Why now:** "We need to get them to commit to a change is step one … Are you willing to settle for that? Whatever consequence they told you a second ago."
- **Listen for:** A real no; a shrug.
- **If unclear → mirror:** "Like is that a version of {dealership_name} you'd be okay with a year from now?"
- **Tone:** Casual, serious.
- **Then:** No → `p2-commit-why-now` · Yes → `p3-exit-respectful`.
- **Fidelity:** `verbatim_adapted` · P01 / V47 · "So this will sound like an obvious question, man, but I mean I mean it's really not. Are you willing to settle for that?"

#### `p2-commit-why-now` · Why now?
- **Say:** "And why now? Because like there's always the new-year-new-me guy, like, I'll start on a Monday. Why actually draw that line in the sand and, like, make that change — cuz you haven't for the past {problem_duration}, if we're being real about it."
- **Seeks:** Their reason for now ("I've had enough", "new quarter", "the dealer asked me about it").
- **Why now:** "And why now? Because like there's always a new year, new me guy. I like start on a Monday. Why actually draw that line in the sand and like make that change? Cuz you haven't for the past couple of months if we're being real about it."
- **Listen for:** A reason; "no real reason" (accept; ask once "so is it a now thing or a later thing, honestly?").
- **If unclear → mirror:** "Every good guy starts on a Monday, man — why does this one stick?"
- **Tone:** Casual, a little challenging.
- **Then:** → `p2-commit-responsibility`.
- **Fidelity:** `verbatim_adapted` · P02 / V48 · as quoted.

#### `p2-commit-responsibility` · Whose responsibility?
- **Say:** "And whose responsibility do you feel like it is to actually say, I've had enough, and make that change?"
- **Seeks:** "Mine" — or an honest "the dealer's" / "it's a shared call", which is accepted and routes to the authority path (`p2-ph-no-authority`), never shamed.
- **Why now:** "Once you've gotten those three commitments, I'm not willing to settle. I need to do it now and it's my responsibility. Then we transition into the actual pillars."
- **Listen for:** "Mine" · a delegated decision (learn the decision role).
- **If unclear → mirror:** "Like who has to make the choice — if you settle or not?" (V47)
- **Tone:** Casual.
- **Then:** Mine → `p2-pitch-permission` · Delegated → `p2-ph-no-authority` then `p2-pitch-permission` with the decision-maker's route agreed.
- **Fidelity:** `verbatim_adapted` · P03 / V47 · "And whose responsibility do you feel like it is to actually say I've had enough and make that change?"

#### `p2-pitch-permission` · Permission transition
- **Say:** "Well, based on what I've heard, man — obviously you mentioning how {stated_problem}, and because of that {impact}, and you're not really able to {tangible}; and obviously you wanting to get to the point where {target_6mo}, everything else — I think what we're doing could genuinely help you here. If it would be appropriate from here, we could kind of put a game plan together of like how to actually get {dealership_name} to {target_6mo}. Would that be appropriate, or what do you want to do from here?"
- **Seeks:** "Yeah, 100%, let's go through it."
- **Why now:** "All we're doing is getting permission to pitch." The recap is in their words; "could genuinely help" is a fit opinion, not a result claim (the offer has no approved claims).
- **Listen for:** Yes · "depends what it costs" (→ answer honestly: `p2-price` comes after the pillars; say so: "I'll get to the number in two minutes — I want you to see what it is first") · "not today" (accept).
- **If unclear → mirror:** "Do you want me to walk you through what it'd actually look like for {dealership_name}, or would you rather stop here?"
- **Tone:** Extremely casual and extremely confident ["when we're going into the pitch, this is all just going to be extremely casual and extremely confident"].
- **Then:** Yes → optional `p2-pen` → `p2-pillar-1` · No → `p3-exit-respectful`.
- **Fidelity:** `verbatim_adapted` · P04 · "Well, based on what I've heard, man, obviously you mentioning how like you're not losing enough weight … I think what we're doing for sure could help you. If it would be appropriate from here, we could kind of put a game plan together … Would that be appropriate or what do you want to do from here?" ("for sure could help" softened to "could genuinely help" — fit opinion, no implied result.)

#### `p2-pen` · Pen and paper (optional)
- **Say:** "Do you have a pen and paper handy, man?"
- **Seeks:** A yes; gets them writing the three pillars.
- **Why now:** Named in the framework's pitch section (P11, Source B) — a practical note-taking cue.
- **Tone:** Casual.
- **Then:** → `p2-pillar-1`.
- **Fidelity:** `verbatim_adapted` · P11 · Source B (not in Source A's transcript; carried from the bank).

### 2.5 The three pillars — "pillar is X because you mentioned Y, so what we do is Z — does that make sense?"

Andrés: "the structure is pillar one is X because you know how you mentioned XYZ. So what we do is XYZ … We're adding the context of their problem, the issues that they're having into why we have the pillar. So it feels extremely personalized for them … write down what are the three main pillars of whatever you are selling and then build out this exact structure for every single one. That way every single call it's identical." Every Z below is copied from `data/offers.json` deliverables; the Y is the prospect's own words from the notes.

#### `p2-pillar-1` · Speed — same-day inquiry response
- **Say:** "So pillar one, man, is the speed — the same-day response. Because you know how you mentioned {their_words_speed — e.g. 'they sit in the inbox till somebody's free'}? So what we do is, every inquiry that comes through your form gets acknowledged and routed through the channel you already use — no new inbox, no new app for the customer — inside a response window we agree on, with the arrival time recorded. Does that make sense?"
- **Seeks:** "Yeah, that makes sense" (P06) — or "do you feel like that'd be helpful for you?" (P05) as the check.
- **Why now:** Pillar tied to their stated problem; delivery is the offer's deliverable verbatim; the check keeps "good communication with them throughout the entire process".
- **Listen for:** A yes; a question about how ("what does acknowledged mean?") — answer from the deliverable, no more.
- **If unclear → mirror:** "Do you see why that's there — because of the {their_words_speed} thing?" (P12)
- **Tone:** Casual, confident.
- **Then:** → `p2-pillar-2`.
- **Fidelity:** `verbatim_adapted` · P05 / P06 / P12 · "pillar one is X because you know how you mentioned XYZ. So what we do is XYZ … Do you feel like that'd be helpful for you? … Does that make sense?" · delivery from `pillars[0].delivery`.

#### `p2-pillar-2` · Ownership — one named handoff
- **Say:** "Pillar two is the ownership — one named handoff. Because you mentioned {their_words_ownership — e.g. 'whoever's free grabs it' / 'I can't tell you who has which one'}. So what we do is, every inquiry gets assigned to one named person on your team, with a visible status — new, contacted, appointment, closed, or no-response — that they update as they work it. And anything unclaimed gets surfaced, not lost. Does that make sense?"
- **Seeks:** A yes.
- **Why now:** Same structure; delivery verbatim from the offer.
- **Listen for:** "Who picks the person?" — the store does (one named staff member or rotation is a prerequisite).
- **If unclear → mirror:** "Do you see why that one's there — because nobody owns it today, in your words?"
- **Tone:** Casual, confident.
- **Then:** → `p2-pillar-3`.
- **Fidelity:** `verbatim_adapted` · P05 / P06 · delivery from `pillars[1].delivery`.

#### `p2-pillar-3` · Visibility — one honest reporting view
- **Say:** "And pillar three is the visibility — one honest reporting view. Because you mentioned {their_words_visibility — e.g. 'I have to ask around to find out what happened'}. So what we do is one view — arrival, first response, who owns it, current status — for {dealership_name}, that exports as a weekly summary. And the numbers are counts of what actually got recorded, not projections. Does that make sense?"
- **Seeks:** A yes.
- **Why now:** Same structure; "counts of recorded events, not projections" is the offer's own honesty clause.
- **Listen for:** "Can it show sales?" — no; it shows the statuses your people record (exclusions: not a sales guarantee, not a DMS).
- **If unclear → mirror:** "Do you see why that's there — so you're not asking around on a Monday?"
- **Tone:** Casual, confident.
- **Then:** → `p2-fit`.
- **Fidelity:** `verbatim_adapted` · P05 / P06 · delivery from `pillars[2].delivery`.

### 2.6 Fit, why, key to the castle, personal double-down, the price drop

#### `p2-fit` · Perceived fit
- **Say:** "Now, based on everything we've covered, man — like do you actually feel like this would get {dealership_name} to that point of like {tangible}, {reversed_impact}?"
- **Seeks:** A yes (or an honest "not sure" → ask what's missing; a criterion the offer does not meet is said plainly).
- **Why now:** "after this three-pillar pitch, then we got to get commitment to buying now … do you actually feel like this would get you to that goal … They're almost always going to say yes."
- **Listen for:** Yes · hesitation with a reason.
- **If unclear → mirror:** "Like is there a piece of {tangible} this wouldn't touch?"
- **Tone:** Casual, confident.
- **Then:** Yes → `p2-why` · Not sure → answer the gap honestly → `p2-why` or `p3-exit-respectful`.
- **Fidelity:** `verbatim_adapted` · P07 · "based on everything we've covered, man, like do you actually feel like this would get you to that goal of like losing the 50 lbs, having more energy, being able to play sports with your kids again?"

#### `p2-why` · Why — the key to the castle
- **Say:** "Okay — then why though? Like I, I guess what, what do you think is really like the key to the castle for you? What do you think is going to help you the most?"
- **Seeks:** The pillar they value most, in their words.
- **Why now:** "And then you go, 'Okay, then why though?' Like I I guess what what do you think is really like the the the the key to the castle for you? What do you think is going to help you the most?"
- **Listen for:** One pillar named; "all of it" (ask "if you could only have one?").
- **If unclear → mirror:** "Like which of the three would you miss most if it wasn't there?"
- **Tone:** Curious.
- **Then:** → `p2-personal`.
- **Fidelity:** `verbatim_adapted` · P08 · as quoted.

#### `p2-personal` · Personal double-down
- **Say:** "Yeah — because you having {key_pillar}, man, what do you feel like that would do for you? Like even more personally though."
- **Seeks:** The personal meaning of the key pillar ("I stop chasing", "I can give the dealer a straight answer").
- **Why now:** "most of the time you're going to double down and go, 'Yeah, because you having that accountability, man, what do you feel like that would do for you?' Like even more personally though".
- **Listen for:** A personal outcome; a deflection (accept).
- **If unclear → mirror:** "Like for you, day to day — what's different?"
- **Tone:** Curious, upward.
- **Then:** → `p2-price` (or `p2-price-null` while the price is `null`).
- **Fidelity:** `verbatim_adapted` · P09 · as quoted.

#### `p2-price` · The price drop (only when an approved price exists)
- **Say:** "Okay, cool, man. Well, based on everything I've heard, the total investment, man, to actually get {dealership_name} to the point of like {tangible}, so that {reversed_impact}, and it's not kind of getting worse over time, is going to be {approved_price}. How would you like to proceed?"
- **Seeks:** A decision, or an objection (→ Part 3).
- **Why now:** "it literally sounds like this … the total investment, man, to actually get you to the point of … is going to be XYZ … How would you like to proceed? That simple." Then silence.
- **Listen for:** A yes · a question about terms (answer only from the approved payment schedule) · an objection (convert per Part 3).
- **If unclear → mirror:** "So from here — how do you want to do this?"
- **Tone:** Extremely casual, extremely confident; then stop talking.
- **Then:** Yes → next steps (access prerequisites, acceptance walkthrough date) · Objection → `p3-rule` · No → `p3-exit-respectful`.
- **Fidelity:** `verbatim_adapted` · P10 · as quoted. `{approved_price}` reads only from a published, non-fictional offer version with a complete price.

#### `p2-price-null` · The null-price cue (current state of the draft offer)
- **Say:** "Okay, cool, man. Well, based on everything I've heard, the next step on my side is to put the exact scope and the investment in writing for {dealership_name} — I'm not going to throw a number at you on the phone that I haven't tied to the scope. How would you like to proceed from here — do you want me to send that over, or walk through it together on {day}?"
- **Seeks:** Agreement to receive the written scope and a time to review it.
- **Why now:** `price.setup_minor_units` and `price.recurring_minor_units` are `null`. The screen shows **"Price not approved yet — do not state a number; route to the scope conversation."** No default, no $0, no fictional pilot number.
- **Listen for:** "Just give me a ballpark" → "There isn't a published number yet, and I'd rather be straight than guess — it'll be in writing by {day}."
- **If unclear → mirror:** "Written scope first, then the number against it — does that work?"
- **Tone:** Casual, confident.
- **Then:** Yes → agreed follow-up (`p3-exit-followup`) with the scope date · No → `p3-exit-respectful`.
- **Fidelity:** `apohenia_addition` · required by the honesty-of-state rule; keeps Andrés's "how would you like to proceed" cadence.

### 2.7 Excluded from Part 2 (study only)

- `p2x-regret` — "What is the day-to-day feeling three, six, or twelve months from now, knowing you could have been [desired outcome] but were not?" (C06) — the live consequence never requires a specific emotional word; "not much" is accepted.
- `p2x-father` — "Who do you think that could even make you as a father? Like knowing there's something you could have done about it…" (D03) and "who do you think that would make you as a person?" (D04) — identity shame; never live.
- `p2x-future-identity` — "who do you feel like that would make you as a person? Like being the guy who actually took the opportunity…" (D05) — future identity attachment; study-only. Positive identity reinforcement in the live script is limited to the kudos template in Part 4.
- `p2x-fire-setter` — "If the setter did not leave you notes, number one, he's … fire him." Instructor rhetoric; Jason is his own setter.

---

## Part 3 — OBJECTION SYSTEM

### 3.1 The conversion rule — `p3-rule` (rule, not spoken)

Andrés: "most people try and handle the objections the prospect give them. That's a mistake because if you're constantly trying to handle the objections, they're just going to give you a new one. Now, you're in their world … instead what the best objection handlers and sales people do is they convert the objections they get into the ones that they want to handle." And: "no matter the objection you get, you're always gonna push it to money logistical … Any objection, whether it's partner, time, whatever, has something to do with the money … get money out of the way to begin with. That way we know everything they're telling us is actually real."

Order in the live script: **money logistics first** → if another logistical objection follows, **time** or **partner** → then **fear** via an agreeance statement and **one** certainty frame → then the respectful exit with an agreed follow-up. Every reframe follows Andrés's four-part structure — **frame → pushback → consequence → CTA** — quoted in `p3-reframe-structure`. Apohenia bounds that the source does not have: a genuine lack of authority or budget is diagnosed and accepted, not reframed; one reframe per objection family; a "no" after the certainty frame ends the pitch; opt-out stops everything. `verbatim_adapted` (rule) · A11.

#### `p3-reframe-structure` · The four-part reframe (rule, not spoken)
- **Frame:** "Number one is the frame. That's where I go. Like there's two types of people or if you see me like have that wears a crown."
- **Pushback:** "Step two is the push back. This is where I make them defend the frame … And why? Cuz like you don't have to be, man."
- **Consequence:** "Number three is the consequence … You need leverage to change anything … 'if I keep having the same mentality that I have now, it's going to cause me all this pain.'"
- **CTA:** "step four is the CTA. The commitment to change … It could be a commitment to changing a mentality … identity … buying … 'So, what decision do you feel like you need to make, man, to put yourself in the best possible position so when your head hits that pillow tonight, you know, you did everything in your power…'"
- **Fidelity:** `verbatim_adapted` (rule) · A11.

### 3.2 Money logistics first (full sequence)

#### `p3-money-duffel` · Money aside — the duffel bag
- **Say:** "Okay, not a problem, man. Money aside for a second — like if I handed you a duffel bag with the full {approved_price} for this, would you actually do it?" · **Null-price form:** "Money aside for a second — like if the investment was just handled, covered, whatever it was — would you actually do it?"
- **Seeks:** "Yeah, of course" (value confirmed) — or a "no", which means the objection is not money at all (→ `p3-fear-agree` or the exit, honestly).
- **Why now:** "Whenever they give the objection, you just go, 'Okay, not a problem, man. Money aside for a second, like if I gave you a duffel bag with the full 10,000 for the program, would you actually do it?'" Removes the value question from the money question.
- **Listen for:** A clean yes · a "probably" (probe why) · a no.
- **If unclear → mirror:** "Like if the money genuinely wasn't the thing — is this what {dealership_name} would do?"
- **Tone:** Casual, light.
- **Then:** Yes → `p3-money-why` · No → the objection is value/fear → `p3-fear-agree` or `p3-exit-respectful`.
- **Fidelity:** `verbatim_adapted` · O01 · as quoted. While the price is `null`, the null-price form is shown with the cue.

#### `p3-money-why` · Why though?
- **Say:** "Well, why though? Just so I understand."
- **Seeks:** Their reason the value is there ("because nobody owns them today and this fixes that").
- **Why now:** "Well, why though? Just so I understand. Oh, because I mean with everything you've covered … I feel like it would really help me." They defend the value in their own words.
- **Listen for:** A pillar named; a vague "it makes sense" (probe once).
- **If unclear → mirror:** "Like what specifically about it — the speed, the ownership, the view?"
- **Tone:** Curious.
- **Then:** → `p3-money-personal`.
- **Fidelity:** `verbatim_adapted` · O02 · as quoted.

#### `p3-money-personal` · Personally though
- **Say:** "Yeah, because like you having {valued_component}, I guess, and like {pillar} and everything else — what do you feel that would do for you, like, like more personally though?"
- **Seeks:** The personal meaning of the value.
- **Why now:** "Yeah, because like you having that coaching I guess and like the guidance and everything else. What do you feel that would do for you like like more personally though? … Now I have removed the value objection out of the equation."
- **Listen for:** A personal outcome; a deflection (accept, move on).
- **If unclear → mirror:** "For your own week — what changes?"
- **Tone:** Curious, upward.
- **Then:** → `p3-money-split`.
- **Fidelity:** `verbatim_adapted` · O03 · as quoted.

#### `p3-money-split` · Initial investment, or break it up?
- **Say:** "So is it just the initial investment of the {setup_price}, or if there was a way to possibly break it up, would that make it a bit more digestible, like financially, for {dealership_name}?" · **Null / no-approved-terms form:** "So is it more the setup piece up front, or the monthly, that's the tighter one for you — just so I know which way to shape the scope?"
- **Seeks:** Which part is tight, and whether structure (not discount) would change the answer.
- **Why now:** "So is it just an initial investment of the $10,000 or if there was a way to possibly break it up, would that make it a bit more digestible like financially for you? And now almost every time they're going to say, 'Yes, that would make it way better.'"
- **Listen for:** "The upfront" · "the monthly" · "all of it" (honest: may be a budget no → `p3-money-fit`).
- **If unclear → mirror:** "Is it the size of the number, or when it lands?"
- **Tone:** Casual.
- **Then:** → `p3-money-fit` → `p3-money-plan`. **Constraint:** "break it up" may only be said if the approved offer's `payment_schedule` allows staged payment; while it is "not set", the screen shows **"Payment options not approved — do not improvise terms"** and the null form is used.
- **Fidelity:** `verbatim_adapted` · O04 · as quoted.

#### `p3-money-fit` · Budget fit (B2B substitute for the savings question)
- **Say:** "Not a problem, man. Just so I can actually put something together that fits — ballpark, what would actually work for {dealership_name} on this, month to month? Just to see if I can help."
- **Seeks:** A budget range or a structure constraint, in their words.
- **Why now:** The source asks a consumer "Cash on hand then expenses aside, what do you have saved up? Just to see if I can help." (O05, study-only). The B2B equivalent asks what would fit the store — the honest input for shaping scope (narrow scope, staged milestones, agreed dates per the framework), not for inventing a discount.
- **Listen for:** A number or range · "there's no budget for this" (an honest no → `p3-exit-respectful` with the scope one-pager; nothing is pushed).
- **If unclear → mirror:** "Like is there a line this would sit under, or would it need one created?"
- **Tone:** Casual, "just to see if I can help".
- **Then:** Range given → `p3-money-plan` · No budget at all → `p3-exit-respectful`.
- **Fidelity:** `apohenia_addition` · replaces O05 (`p3x-savings`), keeps the "just to see if I can help" cadence.

#### `p3-money-plan` · Would that work within your budgetary constraints?
- **Say:** "Well — {approved_payment_option: e.g. the setup split across the two milestones, and the monthly from the acceptance walkthrough onward}. That way it's actually running before the bigger part lands. Would that work within your budgetary constraints?" · **Null form:** "Then what I'll do is shape the scope so it fits that — and put the exact structure in writing. Would that work within your budgetary constraints, in principle?"
- **Seeks:** "Yes, that works."
- **Why now:** "before we ask for the sale again, we need to get them to agree this works within my budgetary constraints … now logistics are out of the way. So they cannot fall back on logistics."
- **Listen for:** A yes · a further condition (write it down; it becomes part of the scope).
- **If unclear → mirror:** "Structured like that — is that a yes for the store, or still a stretch?"
- **Tone:** Casual, confident.
- **Then:** → `p3-money-proceed`. **Constraint:** only options actually present in the approved offer's `payment_schedule` may be spoken; "we don't usually do this" is never said about an option that does not exist.
- **Fidelity:** `verbatim_adapted` · O06 · "we could split it up into four payments, I guess, of 2.5 grand a month … Would that work within your budgetary constraints?" (the source's numbers are examples, never used).

#### `p3-money-proceed` · How would you like to proceed (after logistics)
- **Say:** "Okay, so with the understanding that you feel this would actually get {dealership_name} to {tangible} — {reversed_impact} — and obviously that it works within budgetary constraints, how would you like to proceed?"
- **Seeks:** A yes, or the next objection (time / partner / fear).
- **Why now:** "now we ticked off, they gave us whatever objection we ticked off. It's not money, it's not value, logistically it works. How do you want to proceed?"
- **Listen for:** Yes · "it's just the timing…" (→ time) · "I need to run it by…" (→ partner or authority) · "I'm just not sure it'll…" (→ fear).
- **If unclear → mirror:** "So from here — how do you want to do this?"
- **Tone:** Casual, confident; silence after.
- **Then:** Yes → next steps · Time → `p3-time-aside` · Partner → `p3-partner-aside` · Fear → `p3-fear-agree` · No → `p3-exit-respectful`.
- **Fidelity:** `verbatim_adapted` · O07 · as quoted.

### 3.3 Time — the two-kinds-of-people reframe (frame → pushback → consequence → CTA)

#### `p3-time-aside` · Time aside
- **Say:** "Well, time aside, man. Like if you did have the time, would you actually do it? Like do you actually feel like it'll get {dealership_name} to {tangible}?"
- **Seeks:** A yes (value re-confirmed).
- **Why now:** "we need to bring the fact the value is there to the front of their mind before reframing the time again … Even though they already gave us those answers in money, we're going to ask it again because the way that the brain works psychologically is through orders."
- **Listen for:** Yes · a no (then it was never time → `p3-fear-agree` or the exit).
- **If unclear → mirror:** "Like if the calendar wasn't the thing — is this what you'd do?"
- **Tone:** Casual.
- **Then:** Yes → `p3-time-why` · No → `p3-fear-agree`.
- **Fidelity:** `verbatim_adapted` · O08 · as quoted.

#### `p3-time-why` · Why — what would help the most
- **Say:** "Well, why though? Like what do you feel would really help you the most?"
- **Seeks:** The key pillar again.
- **Why now:** Same value pattern as money: "Well, why though? Like, what do you feel would really help you the most?"
- **Tone:** Curious.
- **Then:** → `p3-time-personal`.
- **Fidelity:** `verbatim_adapted` · O02 (time variant) · as quoted.

#### `p3-time-personal` · Even more personally
- **Say:** "Yeah, because you having that, like — what do you feel like that would do for you, like even more personally?"
- **Seeks:** The personal meaning.
- **Why now:** "Yeah, because you having that, like what do you feel like that would do for you like even more personally?"
- **Tone:** Curious, upward.
- **Then:** → `p3-time-frame`.
- **Fidelity:** `verbatim_adapted` · O03 (time variant) · as quoted.

#### `p3-time-frame` · Frame — two kinds of people
- **Say:** "Well — can I make a suggestion, man? Because really, in this world, there's two kinds of people. There's the guy who goes, you know what, I've got the floor, I've got service, I've got the manufacturer on my back, I can't find the time to fix how the web leads get handled. But then there's the second guy who goes, no, no — you know what? *Because* I've got the floor and service and the manufacturer and everything else, that's exactly why the web leads can't depend on whoever's free that day. That way I actually get time back instead of chasing them — because that's really what matters to you at the end of the day, right? … I mean, which of those two people do you want to be?"
- **Seeks:** "The second guy" — or "honestly, the first, right now" (accepted; → `p3-exit-respectful`).
- **Why now:** "we'll make a suggestion, man. Because really in this world, there's two kinds of people … 'Because I have my family and I have my kids and I have my job and everything else, that's why I need to learn how to make more money' … which of those two people do you want to be?"
- **Listen for:** Which one they choose; the reason they give unprompted.
- **If unclear → mirror:** "Like is the store the reason you can't fix this, or the reason you have to?"
- **Tone:** Casual, suggestion register ("can I make a suggestion").
- **Then:** Second → `p3-time-pushback` · First / refuses the frame → `p3-exit-respectful`.
- **Fidelity:** `verbatim_adapted` · O09 · as quoted. **Bank: study_only — reclassification pending owner decision.** Not auto-presented until reclassified. The choice is offered, never imposed; the "first guy" is a valid answer.

#### `p3-time-pushback` · Pushback
- **Say:** "And why? Cuz like you don't have to, man."
- **Seeks:** Their defence of the second choice, in their words.
- **Why now:** "And then you push back. And why? Cuz like you don't have to, man. Oh, because I mean, my family is more important than anything."
- **Tone:** Casual, light, genuinely curious.
- **Then:** → `p3-time-consequence`.
- **Fidelity:** `verbatim_adapted` · O10 · as quoted. **Bank: study_only — reclassification pending.**

#### `p3-time-consequence` · Consequence
- **Say:** "Yeah. Because what do you think would happen if you didn't, man? Like if you decided to be that first guy, who's just like, no — the store's the reason I can't fix this. What do you think would happen then?"
- **Seeks:** A stated consequence in their words ("nothing changes; we keep paying for leads nobody works").
- **Why now:** "Because what do you think would happen if you didn't, man? Like if you decided to be that first guy who's just like, 'No, they're the reason why I can't be successful.' … What do you think would happen then?"
- **Tone:** Curious, downward.
- **Then:** → `p3-time-settle`.
- **Fidelity:** `verbatim_adapted` · O11 · as quoted. **Bank: study_only — reclassification pending.**

#### `p3-time-settle` · Willing to settle?
- **Say:** "Are you actually willing to, like, like settle for that?"
- **Seeks:** "No."
- **Why now:** "Again, are you actually willing to like like like settle for that? Well, no. Definitely not, man."
- **Tone:** Casual, serious.
- **Then:** No → `p3-time-cta` · Yes → `p3-exit-respectful`.
- **Fidelity:** `verbatim_adapted` · P01 (in the time reframe) · as quoted.

#### `p3-time-cta` · CTA — what decision
- **Say:** "Okay. So in your eyes, like what decision do you feel like you have to make to put {dealership_name} in the best possible position to actually get every inquiry {their_word}? That way {reversed_impact} — because that's all you want at the end of the day."
- **Seeks:** Their own statement of the decision ("I've got to do it") — or a fear objection (→ `p3-fear-agree`) — or a no (→ exit).
- **Why now:** "So, in your eyes, like what decision do you feel like you have to make to put yourself in the best possible position to actually learn the skills … And right there, again, this is a tree. There's two things that can happen. Number one, close sale. Number two, they go, 'Ah, like that makes sense. It's just that XYZ fear objection.'"
- **Tone:** Casual, confident; silence after.
- **Then:** Decision → next steps · Fear → `p3-fear-agree` · No → `p3-exit-respectful`.
- **Fidelity:** `verbatim_adapted` · O12 · as quoted.

### 3.4 Partner — the crown reframe (frame → pushback → consequence → CTA)

**Apohenia guard before any of this:** if the person genuinely does not hold the economic decision (the offer names the dealer principal or GM), "I need to run it by {partner}" is a fact, not an objection — go to `p3-partner-authority`. The crown reframe is only for a decision-maker deferring to a peer or partner who is not the one who will live with the process.

#### `p3-partner-aside` · Partner aside
- **Say:** "Well, partner aside, man — like if {partner} was on board, and was like, look, we have to do this, this is exactly what the store needs — would you actually do it? Like do you actually feel like it'll get {dealership_name} to {tangible}?"
- **Seeks:** A yes (value re-confirmed).
- **Why now:** "you should notice the pattern. Get value out of the way and get them to agree, yeah, the value is there. So, we go partner [aside]. Like, if she was on board and she was like, 'Honey, you have to do this. This is amazing.' Like, would you actually do it?"
- **Listen for:** Yes · a no (not really partner → `p3-fear-agree` or exit).
- **If unclear → mirror:** "Like if {partner} said 'your call' — what would you do?"
- **Tone:** Casual.
- **Then:** Yes → `p3-partner-why` · No → `p3-fear-agree`.
- **Fidelity:** `verbatim_adapted` · O13 · as quoted.

#### `p3-partner-why` · Why — just so I understand
- **Say:** "Well, why though? Like, just so I understand."
- **Seeks:** The value in their words.
- **Why now:** "Well, why though? Like, just so I understand. Oh, because I mean like with the guidance and the mentoring…"
- **Tone:** Curious.
- **Then:** → `p3-partner-personal`.
- **Fidelity:** `verbatim_adapted` · O02 (partner variant) · as quoted.

#### `p3-partner-personal` · What would that do for you personally
- **Say:** "Yeah — because what would that do for you, personally?"
- **Seeks:** The personal meaning; "wait for them to answer, make them defend it."
- **Tone:** Curious, upward.
- **Then:** → `p3-partner-no`.
- **Fidelity:** `verbatim_adapted` · O03 (partner variant) · "because what would that do for you personally? Again, wait for them to answer, make them defend it."

#### `p3-partner-no` · What if they say no?
- **Say:** "Okay, so out of curiosity, man — what happens if you go to {partner} and you're like, look, we need to do this, this is going to change how the web leads get handled — and they say no? Like would you kind of, like, do it anyway, or would you just kind of give up on getting every inquiry {their_word}?"
- **Seeks:** "I'd do it anyway" / "I wouldn't".
- **Why now:** "Now, regardless of what they say, if they say I wouldn't do it, move on to the frame … They say, 'I would do it anyways.' You say, 'Well, why would you?'"
- **Tone:** Curious.
- **Then:** Anyway → `p3-partner-why-anyway` → `p3-partner-crown` · Wouldn't → `p3-partner-crown`.
- **Fidelity:** `verbatim_adapted` · O14 · as quoted. **Bank: study_only — reclassification pending.**

#### `p3-partner-why-anyway` · Why would you?
- **Say:** "Well, why would you?"
- **Seeks:** "Because it's important enough."
- **Tone:** Curious.
- **Then:** → `p3-partner-crown`.
- **Fidelity:** `verbatim_adapted` · O15 · as quoted. **Bank: study_only — reclassification pending.**

#### `p3-partner-crown` · Frame — heavy is the head that wears the crown
- **Say:** "Now, have you heard, man — if I can make a suggestion — the saying, like, heavy is the head that wears the crown? The idea of it, man, is like the weight of the crown isn't the crown itself. The weight of the crown is the decisions you make when you have that crown on. Because like back in the day, the king — he was the one sending an army this way, starting a war this way. He was responsible for hundreds of thousands of lives. Because as the king, it would not be fair to put the burden of that responsibility on anybody but himself."
- **Seeks:** Nothing yet; sets the frame.
- **Why now:** As quoted — "this the first step of a reframe. We're going to the frame."
- **Tone:** Casual, storytelling.
- **Then:** → `p3-partner-who-does`.
- **Fidelity:** `verbatim_adapted` · O16 · as quoted. **Bank: study_only — reclassification pending.**

#### `p3-partner-who-does` · Who does the work?
- **Say:** "Because for you, for example, man — who's going to be the one actually living with how the inquiries get handled day to day, the one whose phone rings when a customer says nobody called back? Is that going to be you, or is it going to be {partner}? Between you and I — cuz I want to help you."
- **Seeks:** "Me."
- **Why now:** "who's going to be the one actually going through the training, like learning the skill sets … Is that going to be you or is it going to be your wife between you and I, cuz I want to help you? Oh, it's going to be me."
- **Tone:** Curious.
- **Then:** Me → `p3-partner-responsibility` · "{partner}, actually" → `p3-partner-authority` (they are the operational owner, not the decision-maker).
- **Fidelity:** `verbatim_adapted` · O17 · as quoted. **Bank: study_only — reclassification pending.**

#### `p3-partner-responsibility` · Whose responsibility?
- **Say:** "So whose responsibility is it to really put {dealership_name} in the best possible position to have that handled? That way you're actually not the one chasing them."
- **Seeks:** "Mine."
- **Why now:** "So, whose responsibility is it to really put you in the best possible position to learn that skill? … Oh, it's it's it's my it's it's my responsibility."
- **Tone:** Curious.
- **Then:** → `p3-partner-fair`.
- **Fidelity:** `verbatim_adapted` · O18 · as quoted. **Bank: study_only — reclassification pending.**

#### `p3-partner-fair` · Would it be fair?
- **Say:** "Okay. So then, the same way as the king — do you think it'd actually be fair to, like, put the weight of that responsibility on anybody but yourself?"
- **Seeks:** "No, it wouldn't."
- **Why now:** "So then the same way as the king, do you think it'd actually be fair to like put the weight of that responsibility on anybody but yourself? … 'Oh, well, no, obviously it wouldn't be fair.'"
- **Tone:** Curious.
- **Then:** → `p3-partner-why-not`.
- **Fidelity:** `verbatim_adapted` · O19 · as quoted (the source's "your dog, your wife, your tree" list is dropped for a business partner). **Bank: study_only — reclassification pending.**

#### `p3-partner-why-not` · Pushback — why not?
- **Say:** "Well, why not, though?"
- **Seeks:** Their defence of the frame ("because I'm the one running the floor").
- **Why now:** "Well, why not, though? Again, what am I doing now? I'm getting them to defend. I'm pushing back to getting them to defend their new mentality, my frame."
- **Tone:** Curious, light.
- **Then:** → `p3-partner-consequence`.
- **Fidelity:** `verbatim_adapted` · O20 · as quoted. **Bank: study_only — reclassification pending.**

#### `p3-partner-consequence` · Consequence
- **Say:** "Because what do you think happens if you take that responsibility — that burden that you have — and you put it on anybody but yourself, somebody that doesn't have as much context about the situation? … And so what do you think would happen to {the store / your position} then?"
- **Seeks:** A stated consequence ("they'd decide on the number, not the problem; nothing changes").
- **Why now:** "because what do you think happens if you aren't … put it on anybody but yourself … that doesn't have as much context about the situation. Oh well I mean they wouldn't be able to make as good of a decision … And so what do you think would happen to your career then?"
- **Tone:** Curious, downward.
- **Then:** → `p3-partner-settle`.
- **Fidelity:** `verbatim_adapted` · O21 · as quoted. **Bank: study_only — reclassification pending.**

#### `p3-partner-settle` · Willing to settle?
- **Say:** "And are you actually willing to, like, like settle for that?"
- **Seeks:** "No."
- **Tone:** Casual, serious.
- **Then:** No → `p3-partner-cta` · Yes → `p3-exit-respectful`.
- **Fidelity:** `verbatim_adapted` · P01 (in the partner reframe) · "And are you actually willing to like like settle for that?"

#### `p3-partner-cta` · CTA
- **Say:** "So what decision do you feel like you need to make to put {dealership_name} in the best possible position to get every inquiry {their_word}, {reversed_impact}, and not be the one chasing them?"
- **Seeks:** Their own decision statement.
- **Why now:** "So, what decision do you feel like you need to make to put yourself in the best possible position to get to that 50K a month … Oh, I feel like I have to buy."
- **Tone:** Casual, confident; silence.
- **Then:** Decision → next steps · "I still need to speak to {partner}" → source rule: logistics are handled, what remains is fear → **one** certainty frame (`p3-fear-agree`), then the exit; Apohenia never loops.
- **Fidelity:** `verbatim_adapted` · O12 · as quoted.

#### `p3-partner-authority` · Apohenia route — the decision genuinely sits elsewhere
- **Say:** "Totally fair — then let's make that conversation easy. What would {partner} need to see: a one-page scope with the exact deliverables and the acceptance tests? And would it be easier if the three of us were on one call, or do you want to carry it yourself?"
- **Seeks:** The route to the decision-maker and what they need.
- **Why now:** A real lack of authority is accepted (offer decision roles: economic decision = dealer principal or GM). Never shamed, never reframed.
- **Tone:** Casual.
- **Then:** → `p3-exit-followup` with the scope one-pager and a date.
- **Fidelity:** `apohenia_addition`.

### 3.5 Fear — agreeance statement → one certainty frame

#### `p3-fear-agree` · Agreeance statement (converts every fear objection into certainty)
- **Say:** "Well, that makes sense, man. Because like ultimately what you're seeking is like, like certainty, right? Like that you'll actually get the result — that the inquiries actually get {their_word}, you'll be good, the team's good, all that jazz. Is that right?"
- **Seeks:** "Yeah, of course."
- **Why now:** "An agreeant statement is … a statement that cannot be disagreed with … 'it's just way too risky.' And I go, 'Well, that makes sense, man.' Because like ultimately what you're seeking is like like certainty, right? … What's their new objection? A lack of certainty." (The instructors' alternative agreeance, "we all make decisions based on our perspective", is study material only.)
- **Listen for:** Yes · a specific named risk (write it down; if it is a real scope risk, answer it from the offer — acceptance criteria, 30-day exit, no sensitive data — before any frame).
- **If unclear → mirror:** "Like the worry is: what if it doesn't do what I said — is that it?"
- **Tone:** Casual, warm; "on the same side of the table".
- **Then:** → `p3-fear-certainty`.
- **Fidelity:** `verbatim_adapted` · O22 · as quoted.

#### `p3-fear-certainty` · Frame — the certainty frame (B2B version)
- **Say:** "Well, the interesting thing about certainty, right, is that like everybody wants it, but nobody can have it — because there are no guarantees in life except for death and taxes. It's kind of like this. If I've got a store that says, we're not changing anything about the web leads until somebody guarantees us the result — every lead, every month, no misses — do you think that's a store that's after growth, or a store that's after safety and staying exactly where it is? … And on the other end, a store that goes, look, we'll run it bounded — one rooftop, one channel, acceptance tests we agree on up front, thirty days' notice either way — and we see what actually gets recorded. Do you think that's a store that's waiting on a guarantee, or one that's actually, like, willing to take a shot on tightening this up?"
- **Seeks:** "The second one, obviously."
- **Why now:** "the interesting thing about certainty, right, is that like everybody wants it, but nobody can have it because there are no guarantees in life except for death and taxes … McDonald's worker … entrepreneur … 'obviously they're the one who's after adventure and uncertainty.'" The B2B contrast replaces the worker/entrepreneur pair with two stores; the "bounded" description is the offer's own terms (one rooftop, acceptance criteria, 30 days' notice) — deliverables, not claims. The frame is congruent with Apohenia's no-guarantee rule.
- **Listen for:** Which store they pick; whether the named risk was actually a scope question.
- **If unclear → mirror:** "Like which of those two would you rather be running a year from now?"
- **Tone:** Casual, storytelling.
- **Then:** → `p3-fear-pushback`.
- **Fidelity:** `verbatim_adapted` · O23 / O24 (contrast) · as quoted. **Bank: O23/O24 study_only — reclassification pending owner decision**; O22/O25/O26/O12 are `adapt`.

#### `p3-fear-pushback` · Pushback — can you see how?
- **Say:** "Yeah. Because can you see how, man — you making the decision based off seeking certainty could have been what's kept {dealership_name} in this position, where {stated_problem} for the past {problem_duration}?"
- **Seeks:** "Yeah, I guess I can see that." (or an honest "no, it's been X" — take it seriously; it may be a real constraint).
- **Why now:** "Yeah. Because can you see how, man? You making your decisions based off seeking certainty could have been what put you in this position where you've been working this job for the past seven years". Alternative form: "Could that be why you haven't put something in for this before now?" (O30).
- **Tone:** Curious.
- **Then:** → `p3-fear-consequence`.
- **Fidelity:** `verbatim_adapted` · O25 / O30 · as quoted.

#### `p3-fear-consequence` · Consequence — two days, two weeks, two months, even two years
- **Say:** "So in your eyes, like what do you think happens if you keep using that same way of making decisions — of seeking certainty in things before doing them — for the next two days, two weeks, two months, even two years, man?"
- **Seeks:** A stated consequence in their words.
- **Why now:** "So, in your eyes, like what do you think happens if you keep using that same way of making decisions of seeking certainty in things before doing them for the next two days, two weeks, two months, even two years, man?"
- **Tone:** Curious, downward.
- **Then:** → `p3-fear-settle`.
- **Fidelity:** `verbatim_adapted` · O26 · as quoted.

#### `p3-fear-settle` · Willing to settle?
- **Say:** "Okay. And is that something you're willing to, like, like settle for?"
- **Seeks:** "No."
- **Why now:** "Okay. And is that something you're willing to like like like like settle for? Oh, well, no, obviously not."
- **Tone:** Casual, serious.
- **Then:** No → `p3-fear-cta` · Yes → `p3-exit-respectful`.
- **Fidelity:** `verbatim_adapted` · P01 (in the fear reframe) · as quoted.

#### `p3-fear-cta` · CTA — when your head hits that pillow tonight
- **Say:** "Okay. So what decision do you feel like you need to make, man — out of uncertainty — to put {dealership_name} in the best possible position, so when your head hits that pillow tonight, you know you did everything in your power to get every inquiry {their_word}, {reversed_impact}?"
- **Seeks:** Their decision — or a "no", which ends the pitch.
- **Why now:** "So, what decision do you feel like you need to make, man, out of uncertainty to put you in the best possible position so when your head hits that pillow tonight, you know, you did everything in your power to get to that 50k a month goal".
- **Tone:** Casual, confident; then silence.
- **Then:** Decision → next steps · More fear / no → `p3-fear-riskier` is **named, not run**; go to `p3-exit-respectful`. **Apohenia bound: one certainty frame, never a second reframe, never the four-frame ritual.**
- **Fidelity:** `verbatim_adapted` · O12 · as quoted.

#### `p3-fear-riskier` · Second frame — "what's riskier" (named, not worked in source)
- **Status:** Andrés names it as the second certainty frame ("If you're using certainty, you're still going to go into what's riskier") and names the perspective frames ("Island, what's riskier? fat person $4,000") but works none of them in Source A: "I don't have time to go through all of them". No B2B version is written here because none is supported by the transcript.
- **Fidelity:** `excluded_study_only` (named / missing) — recorded in `SOURCE_COVERAGE.md` as named, not supplied.

### 3.6 The exit

#### `p3-exit-respectful` · Apohenia respectful exit
- **Say:** "Totally fair, man. I'm not going to push you — I'd rather you go in on this only if you're actually sure it's right for {dealership_name}. What I'll do is send over {the one-page scope / my notes from today} so you've got it in writing, and it's yours to pick up or not."
- **Seeks:** Agreement to receive the written scope; nothing else.
- **Why now:** A "no" after one reframe is a complete answer. The last thing said is what they remember — Andrés's own reason for leaving on a good note ("the last thing that happens is the thing that they're going to remember the most") — without the apology's implied harm.
- **Listen for:** "Yeah, send it" · "don't bother" (accept; no send).
- **If unclear → mirror:** "Worth having in writing, or would you rather I leave it?"
- **Tone:** Casual, warm, unhurried.
- **Then:** → `p3-exit-followup` · "Don't bother" → end, log "declined, no follow-up".
- **Fidelity:** `apohenia_addition` · replaces the study-only apology (`p3x-apology`) and the four-reframe exit rule.

#### `p3-exit-followup` · Agreed follow-up
- **Say:** "And rather than me chasing you — when would actually make sense to touch base? Like a couple of weeks, or once {their_event: the CRM change / month-end / the dealer's back}? You tell me, and I'll stick to it."
- **Seeks:** A date or trigger the prospect chooses.
- **Why now:** Follow-up is nurture-first and on their terms (B17 pattern); a chosen date is kept, never exceeded.
- **Listen for:** A real date; "I'll reach out" (accept; log no scheduled follow-up).
- **If unclear → mirror:** "Two weeks from Friday — nuisance, or fine?"
- **Tone:** Casual.
- **Then:** Log follow-up with the date and what was sent; end warmly.
- **Fidelity:** `verbatim_adapted` (purpose) · U01 / U07 · "Would it help to review [relevant resource] and reconnect before scheduling the longer call?" / "What has changed since we spoke? What is the plan now?"

#### `p3-exit-stop` · Opt-out at any point
- **Say:** as `p0-optout`: "Understood — I'm taking you off my list right now. Sorry for the interruption, and have a good one."
- **Then:** End; persist suppression.
- **Fidelity:** `apohenia_addition`.

### 3.7 Excluded from Part 3 (study only)

- `p3x-savings` — "Cash on hand then expenses aside, what do you have saved up? Just to see if I can help." (O05). A consumer savings question; replaced by `p3-money-fit`.
- `p3x-four-frames` — "if you do the four frames and they still have not bought, you do an apology and you leave the call … after the four frames, pipeline the person, apologize." The live script runs one certainty frame; the ritual is study-only (brief scenario 40).
- `p3x-apology` — "You know what, man? I'm I'm really sorry today. I failed you because I know that it would have been the best thing for you for you to do this, but I wasn't able to get you to overcome that fear and I know you're going to suffer because of it. And so I genuinely I want to apologize for that and in the future I hope I can help you as well." Readable in the Source Library; never live — it asserts harm the seller cannot know.
- `p3x-perspective-frames` — "Island, what's riskier? fat person $4,000" — named, not worked in Source A (see `SOURCE_COVERAGE.md`).
- `p3x-still-fear-loop` — "Anything they tell you after that, I still need to speak to their partner is purely fear. And so, you can just go straight into fear objection handling if they tell it to you again." The classification is kept as a note; the loop is not — one frame, then the exit.

---

## Part 4 — OVERLAYS

### 4.1 Tonality map per stage, with body cues — `p4-tone-map`

Andrés: "there are four main tonalities. And the key to becoming great at tonalities is understand that body language is the remote control to your tone." The body cues below are instructor-described; on a phone call the prospect cannot see them — they are practice cues for Jason. Text-only practice marks tone "not assessed".

| Stage | Tonality | Body cue (instructor-described) | Inflection | Source |
|---|---|---|---|---|
| Part 0 cold open, `p0-*` | Casual | "shoulders back … have your hands visible at all times" | Flat, unhurried | "we want the other person … to feel like we are confident, we are casual, we do not need them, we are there to help them like a professional." |
| Intent, `p1-intent-*` | Curious + casual | "tilt your head and squint your eyes" | Neutral | "all of intent is going to be very curious and casual." |
| Logical certainty — process / duration / origin | Curious + casual | head tilt, squint | Neutral; pause after the doubt question | "the first part getting the root cause, what are they doing now? Also very curious and casual." |
| Logical certainty — do you like / change question | Skeptical | "lean back and scrunch your eyebrows" | Slight downward on "doesn't sound terrible then" | "this is where you have to use a little bit more of a skeptical tone … to make them naturally come to our rescue" |
| Logical certainty — probing | Skeptical + curious mix | alternate | — | "in the probing section, it's going to be a mix of that skeptical and curious to get them to go deeper." |
| Impact question | Concern | "lean in and raise your eyebrows"; optional hand near chest, "don't do it every time" | Downward, soft | "Oh, I'm sorry to hear that, man. You lean in, raise your eyebrows." |
| Setter transition | Casual, confident | open posture | Upward on the six-month target | (transition section; hedged "very theoretical") |
| Pre-handling (looked / prevented / moved / result / criteria) | Extremely curious | head tilt | Neutral | "you're going to be extremely curious for most of the pre-handling until you get to the what's shifted question." |
| "What shifted?" | Challenging, a little skeptical | lean back | Slight rise then hold | "we need to be a little bit more challenging, a little bit more skeptical to once again make them come to our rescue." |
| Usain Bolt + positive future | Curious, upward | head tilt, squint | **Upward** ("who would you take on that vacation?") | "If I want to sound very positive, I need to use upward inflections." |
| Consequence | Curious, downward | head tilt, squint | **Downward** ("and what would happen then?") | "if I'm curious but negative, which is what we're going to do in consequence … My inflection is going down." |
| Commitment + pitch + price | Extremely casual, extremely confident | open posture, still | Flat; silence after the price | "when we're going into the pitch, this is all just going to be extremely casual and extremely confident." |
| Objections — value questions | Curious | head tilt | Neutral/upward | (money/time/partner "why though?") |
| Objections — frames | Casual, storytelling | open | Rise on the contrast, fall on the consequence | (reframe structure) |
| Exit | Casual, warm | open | Flat | Apohenia; leave on a good note |

`verbatim_adapted` (overlay) · tonality chapter (chars ~57,000–63,000, no record ids; cited by section B12–B15 named-only).

### 4.2 Five default verbal cues — `p4-fillers`

- **Jason's five (proposed defaults, his to confirm):** "Yeah." · "Okay." · "Right." · "Gotcha." · "That makes sense."
- **Source:** "Step one, you have to choose five filler words that you're most likely to use. So, for example, for me, it's like, 'Yeah, oh, really?' 'Uh-huh.' Right."
- **Fidelity:** `apohenia_addition` (the specific five) on a `verbatim_adapted` rule.

### 4.3 Verbal cueing rules — `p4-cue-rules`

1. **Speed controls their speed.** "if I want a prospect that just keeps rambling to start speaking faster, then I'll just be like, 'Yeah, really? Uh-huh. Okay, that makes sense. Uh-huh.' … and do it faster." / "if I want them to slow down … 'Yeah, right. Uhhuh. Okay, that makes sense.' So, it's slower and it's more spaced out because that's going to make them tell me more because it feels like, 'Oh, I'm not done talking. I should keep talking.'" — **Slow and spaced during tangible, experience, process and probe answers; faster only when they ramble.**
2. **Inflection carries emotion.** Future pace: "really? Uh-huh. Jesus, man, that's amazing. I love that … it's always upward and it's a very wispy sound." Consequence: "'Oh, really? I'm sorry to hear that, man.' Uhhuh. That makes sense. So, it's the same verbal cues for the most part. It just goes downwards."
3. **Mirror the frequency.** "if you have two waves coming at the same frequency, when they hit each other, they double in size … They feel this emotion, you mirror them on that same emotion." — Jason matches the emotion they are already voicing; he does not manufacture one. (No emotion score is ever computed from this — it is a delivery cue, not a measurement.)
4. **Cues sit under their speech, never over it.** Ask, then a full beat of silence; cues fill their pauses.
5. **The interjection bridge** (A08, named in the framework; no records): when they run long on the wrong thing, one cue then a mirror question — "that's when you have to learn mirror … How do I cut them off? And how do I actually get the answers I need?"

`verbatim_adapted` (rules) · verbal-cueing chapter (chars ~63,500–68,500; section A08 / B13 named-only).

### 4.4 The mirror — call-out + re-ask for every core question — `p4-mirror-*`

Andrés: "there's two parts of the mirror question. Part one is the call out … Then, step two is you have to ask the same question in a different way. That way, they feel like you're not treating them like a toddler." Design rule: "figure out number one, what were the answers I needed for my original question … create other questions that could give me that same answer." Apohenia bound: **one call-out + one re-ask per question**; refusal, "I don't have that problem" and "it's dialed in" are complete answers.

**Standard call-out (verbatim, M01):** "No, no, sorry. That, that wasn't what I meant to ask. Maybe I wasn't being very clear." · **Soft call-out (M03 role-play):** "No, sorry, man — I don't think I was clear. What I meant to ask is…" · **Yosh's call-out on a shrug (V45):** "Well, man, I've met a lot of people that say that, right…"

| id | Core question | Failure it catches | Re-ask (same answer type, different words) | Source |
|---|---|---|---|---|
| `p4-mirror-identify` | `p0-identify` | "who's calling?" | "Jason with Apohenia — is {first_name} around, or is this them?" | Apohenia |
| `p4-mirror-permission` | `p0-permission` | silence / non-answer | "Sorry — I'll be quick about it. Is now workable for a quick one, or should I try you another time?" | Apohenia; S05 optional |
| `p4-mirror-relevance` | `p0-relevance` | "why do you want to know?" | "Fair question — it's honestly the whole reason I called. When one comes in through the site, does it land with one person, or does it sort of go wherever?" | Apohenia |
| `p4-mirror-gatekeeper` | `p0-gatekeeper` | "what's this regarding?" | "Sure — it's about how website inquiries get picked up at {dealership_name}; who's the person who'd actually know that — the GM, or the internet or BDC manager?" | Apohenia |
| `p4-mirror-tangible` | `p1-intent-tangible` | process / ego instead of a goal | "Can you give me more specifics on that? Like what in specific about how they're handled would you want tightened up — the speed of the first reply, somebody owning each one, seeing what happened — like what for you?" | V02 "Can you give me more specifics on this?"; "is it more kind of X or like Y, like what for you?" |
| `p4-mirror-tangible-curious` | `p1-intent-tangible` | "just looking / curious" | "Okay — and I don't want to assume anything, man. If this went the way you'd want it to six months from now, what would actually be different about how {dealership_name} handles website inquiries?" | V02 "do you know what type of help … specific" |
| `p4-mirror-experience-allow` | `p1-intent-experience` | goal repeated | "What I meant to ask is — you having every inquiry {their_word}, what would that, I guess, really allow the store to do that maybe it can't do now?" | M02 verbatim construction |
| `p4-mirror-experience-instance` | `p1-intent-experience` | vague adjective | "Okay — and when you say {adjective}, just so I understand, give me an example of like an instance where that happened — like one from the last couple weeks." | V14 |
| `p4-mirror-experience-volume` | `p1-intent-experience` | a number, no problem | "Gotcha — and that's the volume. What have you seen happen to those {n} that I guess makes you feel like they're not getting {their_word} the way you'd like?" | I04 re-plugged |
| `p4-mirror-process` | `p1-lc-process` | vague / scope confusion | "Just your structure — like when one comes in through the site, who sees it first, how fast, and what happens after hours?" | V04 "as far as the full process … just your structure" |
| `p4-mirror-duration` | `p1-lc-duration` | career story | "Okay. So how long has it been like that — as far as {their_answer} picking them up first?" | V05 |
| `p4-mirror-origin` | `p1-lc-origin` | "no idea" | "Like why in that fashion — was that a decision somebody made, or did it just kind of end up that way?" | V06 "Like why in that fashion?" |
| `p4-mirror-like` | `p1-lc-like` | pivots to problems | "Do you like it though? Like the process of how they get worked, day to day — what's actually working?" | V07 |
| `p4-mirror-change` | `p1-lc-change` | label only | "How do you mean? Like describe that for me — give me an example of like an instance." | L09 / V14 |
| `p4-mirror-change-nothing` | `p1-lc-change` | "nothing" | "Fair enough — earlier you mentioned {experience}; is that not something you'd change?" | Apohenia (evidence reflect) |
| `p4-mirror-problem-duration` | `p1-lc-problem-duration` | "a while" | "Like has it been a couple of months, or is this kind of how it's always been?" | L10 |
| `p4-mirror-impact` | `p1-lc-impact` | bare yes | "Well, how so? Just so I understand." | L14 |
| `p4-mirror-count` | `p1-lc-count` | "a few / a handful" | "What does that mean — like two, five, ten? How many?" | V11 |
| `p4-mirror-target` | `p1-st-zoom` | "just better" | "Better meaning what — like if we were talking in March and it had gone the way you want, what would you tell me is different?" | S01; "make it real" |
| `p4-mirror-gap` | `p1-st-gap` | "far" | "Like out of ten, where are you today?" | V44 "four out of 10 or five out of 10" |
| `p4-mirror-willing` | `p1-st-willing` | asks for the number | "Not asking for a number, man — just whether it's the kind of thing {dealership_name} would put money behind if it did what you said." | S03 hedging |
| `p4-mirror-permission-book` | `p1-st-permission` | "send me something" | "Happy to — and would a half hour on {day} be a nuisance, or workable, once you've seen it?" | S04 |
| `p4-mirror-recap` | `p2-entry-recap` | "sort of" | "Did I get the main thing right, or is there something I've got backwards?" | I08 |
| `p4-mirror-rationale` | `p2-rationale` | "we just need it fixed" | "Like why not just tell {internet_manager} to be faster on it and leave it there — what's wrong with that?" | E01 / V24 |
| `p4-mirror-looked` | `p2-ph-looked` | talks about company tools | "Besides what the store already had in place — did you yourself go looking at anything for this?" | V28 "company aside though did you do any training" |
| `p4-mirror-prevented` | `p2-ph-prevented` | "just didn't" | "Like what actually got in the way — money, time, somebody else's call, or just not sure it'd work?" | E03 |
| `p4-mirror-shifted` | `p2-ph-shifted` | "nothing really" | "Like if {barrier} was the reason then, is it still the reason now, or did something actually move?" | E04 |
| `p4-mirror-criteria` | `p2-ph-criteria` | "something that works" | "Like if two vendors called you tomorrow, what would make you pick one over the other?" | E07 / V29 |
| `p4-mirror-future` | `p2-future` | goal repeated | "No, sorry, man — I don't think I was clear. You actually having every inquiry {their_word}, how would that impact, like, other parts of the store, though? Just to see if I could even help." | M03 verbatim construction |
| `p4-mirror-future-owner` | `p2-future-owner` | "it's not about me" | "Like for your week, though — what changes?" | F12 |
| `p4-mirror-consequence` | `p2-consequence` | shrug / "much the same" | `p2-consequence-mirror` | V45 |
| `p4-mirror-settle` | `p2-commit-settle` | shrug | "Like is that a version of {dealership_name} you'd be okay with a year from now?" | P01 |
| `p4-mirror-why-now` | `p2-commit-why-now` | "no reason" | "Every good guy starts on a Monday, man — why does this one stick? Or honestly, is it a later thing?" | P02 / V48 |
| `p4-mirror-responsibility` | `p2-commit-responsibility` | "the team's" | "Like who has to make the choice — if you settle or not?" | V47 |
| `p4-mirror-pitch-permission` | `p2-pitch-permission` | "what's it cost?" | "I'll get to the number in two minutes — do you want me to walk you through what it'd actually look like first, or stop here?" | P04 |
| `p4-mirror-pillar` | `p2-pillar-*` | silence | "Do you see why that's there — because of the {their_words} thing?" | P12 |
| `p4-mirror-fit` | `p2-fit` | "maybe" | "Like is there a piece of {tangible} this wouldn't touch?" | P07 |
| `p4-mirror-key` | `p2-why` | "all of it" | "If you could only have one of the three — which?" | P08 |
| `p4-mirror-proceed` | `p2-price` / `p2-price-null` | silence | "So from here — how do you want to do this?" | P10 |
| `p4-mirror-duffel` | `p3-money-duffel` | "probably" | "Like if the money genuinely wasn't the thing — is this what {dealership_name} would do?" | O01 |
| `p4-mirror-time-aside` | `p3-time-aside` | hedging | "Like if the calendar wasn't the thing — is this what you'd do?" | O08 |
| `p4-mirror-partner-aside` | `p3-partner-aside` | hedging | "Like if {partner} said 'your call' — what would you do?" | O13 |
| `p4-mirror-agree` | `p3-fear-agree` | names a scope risk | "Like the worry is: what if it doesn't do what I said — is that it?" (then answer the scope risk from the offer) | O22 |

`verbatim_adapted` where a source construction is cited; `apohenia_addition` where marked. Design drill for new mirrors is private training (M06): "What type of answer am I looking for? What are examples of it? What other questions could obtain those examples?"

### 4.5 Kudos identity lines per avatar — `p4-kudos-*`

Template (verbatim): "Kudos to you for being XYZ. Most people are bad thing. So, kudos for being why." Casual seeding (verbatim): "Oh, that's really smart of you." / "Oh, that's really courageous of you. And but by the way, when you said XYZ…" Rules: only when earned by something they actually said; the "most people" clause becomes a hypothetical ("it'd be easy to…") unless Jason has an observed basis; brief; straight into the next question; never repeated; no negative identity, no shame, no invented generalizations about other stores.

| id | Avatar | Line (Jason's word track) | Trigger |
|---|---|---|---|
| `p4-kudos-owner` | Dealer principal / owner | "Kudos to you, man, for actually looking at how the leads get worked instead of just buying more of them. It'd be easy to just turn the ad spend up and hope." | They said they are questioning the process, not the volume |
| `p4-kudos-gm` | General manager | "Kudos to you for actually wanting to see it on one screen — it'd be easy to just take the Monday meeting's word for it." | They said they can't see status / want visibility |
| `p4-kudos-gsm` | General sales manager | "Kudos to you, man, for wanting somebody to own each one. It'd be easy to just let the desk sort it out." | They named ownership as the gap |
| `p4-kudos-bdc` | Internet / BDC manager | "Kudos to you for picking those up yourself and caring how fast — it'd be easy to just let them queue." | They pick up inquiries personally (`p0-kudos`) |
| `p4-kudos-casual` | Any | "That's really smart of you, man." / "That's honestly courageous — most stores don't want to look at that number." → then straight into the next question | A smart or brave statement was just made |

`verbatim_adapted` · A12 kudos template ("And kudos to you, man, for actually having the courage to do something"), identity chapter casual seeding. Intelligent / bold / courageous are Andrés's three universal identities; only positive reinforcement is live.

### 4.6 Alpha/beta calibration without deception — `p4-alpha-beta`

Source teaching (study): "there is a buying pocket … An alpha is too confident that they feel like they don't need your help. A beta … don't even trust themselves to know what … a right decision is … if they're a beta, you have to build them up … if they are an alpha, you have to tear them down into that pocket." Alpha deflation in the source is deception ("A million a week? Jesus, man" / "Only five? Why so low?") and is excluded (D01, D02).

Live calibration:
- **Beta signals** (self-doubt, "I don't know if we'd get it right", deferring): build up with earned kudos (`p4-kudos-*`), "that's smart of you" on real decisions, and make the decision feel intelligent by evidence — the counts they gave, the criteria they stated. Never a readiness score, never a label.
- **Alpha signals** (bragging numbers, "we're the best store in the county", talking over questions): do not compete, do not deflate. Stay casual ("we do not need them"), record the number and echo it flat ("Forty a month. Gotcha."), let `p1-lc-like` collect their positives and let the skeptical `p1-lc-change` do the work ("it doesn't sound like it's going terrible then… is there anything you would change… if you could though?"). Mirror once when they give ego instead of an answer (`p4-mirror-tangible`); accept a refusal.
- **No diagnosis.** Alpha/beta is a delivery-calibration heuristic, not a personality tag; nothing is stored as a trait; the six human needs and identity labels stay in the source study module.

`verbatim_adapted` (beta build-up) · `excluded_study_only` (alpha deflation, `p1x-deflation`).

### 4.7 "Labels have meaning" — `p4-labels`

"Labels are extremely important because it makes it a lot easier to ask sharper questions in the future … 'You feeling like you don't have that efficiency because you just labeled it as efficiency. Does that have an impact?' … the rule of thumb is labels have meaning."

Rules: (1) propose a one- or two-word label only after a concrete instance exists (`p1-lc-label`); (2) get it confirmed or corrected — use theirs if they offer one; (3) record provenance as *seller proposed, prospect confirmed* (never shown as a prospect quote; THEIR WORDS strip class is distinct); (4) reuse the label in the impact question, the pillars ("because you mentioned the {label} thing"), the fit question and the CTA; (5) a correction or retraction of the label visibly invalidates every line that reused it.

`verbatim_adapted` (rule) · V25.

### 4.8 "Make it real" probing rules — `p4-make-it-real`

"as soon as you get a goal of this is what I want, you have to make it real. The way you make it real is by breaking down what it actually means. Somebody says, 'I want a car.' What car do you want? What model? How much you going to cost you? … Cuz that makes it real for them when there's details." / "when you put a time frame on something, it goes from being a dream to being a goal." / "whenever you want to go deeper on a specific feeling or a specific thing that they say the easiest way is pick out one adjective whether it's positive or negative … and then just probe on it."

Rules:
1. **Goal → details.** Every tangible and every future-pace outcome gets what / where / who / how many / by when (`p2-future-meaning`, `p2-future-where`, `p2-future-who`, `p1-st-zoom`).
2. **Count → exactness.** "A handful" → "two, five, ten?" (`p4-mirror-count`); an estimate is labelled an estimate.
3. **Adjective → probe.** Pick one word they used ("messy", "gratifying", "tiring") and ask what it means for them (`p2-future-meaning`, `p4-mirror-experience-instance`) — their word stays their word (first-mention rule of the listener addendum).
4. **Time frame → goal.** "In what time frame?" — six months is the default horizon (`p1-st-zoom`); "as soon as possible" is mirrored to a real frame ("realistically — six months, twelve?").
5. **Say it out loud.** The prospect states the problem and the consequence themselves; Jason never states it for them ("Yosh wants him to say it out loud … it brings it to the surface").
6. **Bound.** Two or three specifics per section; then move. "You don't want this gap right here to take you 15 minutes."

`verbatim_adapted` (rules) · V32 / V35–V41 / V43 / V44 / F04–F08.

### 4.9 Excluded from Part 4 (study only)

- `p4x-deflation` — alpha deflation lines (D01, D02): see `p1x-deflation`.
- `p4x-manipulation-framing` — Andrés's own framing of the method ("manipulation, darker psychology", "the foundation and deepest level of manipulation") is preserved verbatim in the Source Library; the live overlays are delivery cues with accepted refusal.
- `p4x-family-leverage` — "if they are a father, then you use their family as leverage" — excluded; family is never leverage; a prospect's own family reference may be reused only in their words ("using your example…") and never as an inference.

---

## Part 5 — FIDELITY TABLE

One row per line, rule or overlay in Parts 0–4, plus every exclusion. Source quotes are verbatim from `sources/source_a.txt` (ASR artefacts kept); record ids refer to `data/source_question_records.json`. "bank: study_only" marks a record whose current classification conflicts with this revision's instruction to carry the construction over — those lines are not auto-presented until an owner reclassifies the record.

| id | stage | Apohenia line (short) | fidelity | source quote (verbatim, short) / record ids | note |
|---|---|---|---|---|---|
| `p0-predial` | 0 pre-dial | (policy, not spoken) record eligible, ready, countdown armed | apohenia_addition | "started making outbound dials until you found a prospect who's a lot more open" | outbound is named, never scripted, in the source |
| `p0-identify` | 0 open | "Hey, is this {first_name}?" | verbatim_adapted | I01 "Hey, hey, is this this John?" | — |
| `p0-who-why` | 0 open | "It's just Jason here with Apohenia. I work on what happens after somebody sends an inquiry…" | apohenia_addition | modelled on I01 "It's just Andy here from like XYZ fitness company" | truthful identity; no lead action exists |
| `p0-permission` | 0 open | "Did I catch you at a bad time, or have you got like a minute?" | apohenia_addition | S03 principle "notice I'm making it very theoretical … It's too aggressive" | silence is not permission |
| `p0-relevance` | 0 open | "when an inquiry comes in from your website right now, who picks it up first?" | apohenia_addition | L01 purpose "What are you doing to get leads now?" | pre-satisfies L01 |
| `p0-confirm` | 0 open | "Okay, so it lands with {their_answer} first. Is that, is that about right?" | verbatim_adapted | I02 "Is that is that about right?" | — |
| `p0-kudos` | 0 open | "Kudos to you, man, for actually picking those up yourself…" | verbatim_adapted | A12 "Kudos to you for being XYZ. Most people are bad thing. So, kudos for being why." | contrast clause made hypothetical |
| `p0-gatekeeper` | 0 route | "Who's the person who'd actually know what happens to a website inquiry…" | apohenia_addition | — | no gatekeeper route in source |
| `p0-gatekeeper-time` | 0 route | "When's usually a decent time to catch {owner_name}? …mention you pointed me…" | apohenia_addition | — | — |
| `p0-transfer-reopen` | 0 route | "{gatekeeper_name} just passed me across. Did they say why I called…" | apohenia_addition | I01 construction for the identity check | permission restarts |
| `p0-voicemail` | 0 route | "Hey {first_name}, it's Jason with Apohenia… Nothing urgent…" | apohenia_addition | — | human-left, once; permission dimension open |
| `p0-bad-time` | 0 route | "Would like fifteen minutes at a time you pick be easier? You tell me when." | apohenia_addition | S04 "How does that sound?" | — |
| `p0-bad-time-second` | 0 route | "All good — I'll leave it there. Thanks for picking up." | apohenia_addition | — | never a third push |
| `p0-not-interested` | 0 route | "Fair enough. The only reason I called is that when a website inquiry lands in a shared inbox, nobody owns it…" | apohenia_addition | — | one relevance line, then accept |
| `p0-optout` | 0 route | "Understood — I'm taking you off my list right now." | apohenia_addition | — | suppression persisted |
| `p0-no-fit` | 0 route | "Got it — then this genuinely isn't for you…" | apohenia_addition | — | "I don't have that problem" is complete |
| `p0i-open` | 0 inbound | "it looks like you {documented_action} about possible help with like… all that jazz. Is that, is that about right?" | verbatim_adapted | I01/I02 "Man, it looks like you downloaded I think it was a training about possible help like losing some weight… all that jazz. Is that is that about right?" | — |
| `p0i-intent` | 0 inbound | "just to see if it would even make sense for you — what was your intent behind, I guess, even like {action}…" | verbatim_adapted | I03 "What was your intent behind I guess even like downloading that training in the first place. Like what were you hoping to get out of it?" | stated reason from the book-a-call variant |
| `p0i-price-early` | 0 inbound | "Fair question, and I'll answer it straight. {approved_price_statement}…" | apohenia_addition | — | brief scenario 8; null → cue |
| `p1-intent-tangible` | 1 intent | "what do you feel like you'd want different, in specific, about how those inquiries get handled?…" | verbatim_adapted | I06 "what do you feel like you need help with in specific then?" + "Well, just to see if it would even make sense for you, man." | option list from the mirror example |
| `p1-intent-tangible-new` | 1 intent | "what's your intent of looking at, I guess, possibly even putting something in place…" | verbatim_adapted | I07 "what's your intent of looking at, I guess, possibly even starting an SMMA…" | only if nothing in place |
| `p1-intent-experience` | 1 intent | "What have you seen that I guess makes you feel like maybe the inquiries aren't getting {their_word} the way you'd like?" | verbatim_adapted | I04 "What have you seen that I guess makes you feel like maybe you haven't been losing as much weight as you'd like?" | — |
| `p1-intent-bridge` | 1 intent | "Great. Gotcha." | verbatim_adapted | I04 "Great. Check. We move on." | — |
| `p1-lc-process` | 1 logical | "So what are you doing now, in terms of like, I guess, how the inquiries get handled…" | verbatim_adapted | L01 "What are you doing to get leads now? That I guess has you feeling like you're not really getting enough." | skipped if `p0-relevance` answered it |
| `p1-lc-duration` | 1 logical | "And how long have you been doing it like that for?" | verbatim_adapted | L02 "And how long have you been doing like that for, right?" | — |
| `p1-lc-origin` | 1 logical | "And what kind of caused you to, like, like set it up that way in the first place?" | verbatim_adapted | L03 "And what kind of caused you to like like use that approach in the first place." | the doubt question |
| `p1-lc-like` | 1 logical | "besides obviously {unmet_result}, do you, I guess, like, like the way you've got it set up now though?" | verbatim_adapted | L04 "besides obviously not losing the weight necessarily, do you I guess like like that fitness regime you have in place like like now though" | — |
| `p1-lc-like-what` | 1 logical | "Oh, what do you like about it, like in specific?" | verbatim_adapted | L05 "Oh, what do you like about it like in specific?" | — |
| `p1-lc-like-no` | 1 logical | "Is there anything about it that does work — like even one thing? Or honestly nothing?" | verbatim_adapted | L05 on the no-branch | L06 forced version excluded |
| `p1-lc-change` | 1 logical | "Okay, it doesn't sound like it's going terrible then. I guess is there anything you would change… if you, if you could though?" | verbatim_adapted | L07 "it doesn't sound like it's terrible then. I guess is there is there anything you would change about either like… if you if you could though" | — |
| `p1-lc-probe` | 1 logical | "What do you mean by that?" / "How do you mean? Like describe that for me." / "Give me an example of like an instance…" | verbatim_adapted | L08/L09/V14 "What do you mean by that? How do you mean meaning?" / "give me an example of like an instance where you may have" | — |
| `p1-lc-label` | 1 logical | "Okay. So {label}." | verbatim_adapted | V25 "Okay. So efficiency. >> Efficiency. Yeah." | provenance: seller proposed, prospect confirmed |
| `p1-lc-problem-duration` | 1 logical | "And how long has that been going on for, man? To where like {stated_problem}?" | verbatim_adapted | L10 "and how long has that been going on for to like you feel like you're not really losing any weight?" | — |
| `p1-lc-impact` | 1 logical | "And without assuming anything, man… how has that actually had an impact, I guess, on like {impact_object}?" | verbatim_adapted | L12 "And without assuming anything again… How is that actually had an impact I guess on your ability to like hire a crew and keep expanding?" | B2B object; L11/L13 not imported |
| `p1-lc-impact-howso` | 1 logical | "Well, how so? Just so I understand." | verbatim_adapted | L14 "well how so just so I understand" | — |
| `p1-lc-count` | 1 logical | "roughly how many come in through the site? … how many turned into somebody in the store? … two, five, ten?…" | verbatim_adapted | V09/V10/V11/V17/V18 "how many people have you spoken… how many sales… What was that mean? Like two, five, 10." | estimates labelled; no seller dollar projection |
| `p1-st-zoom` | 1 transition | "let's zoom out for a second, man. In an ideal world, where do you want {dealership_name} to be in six months…" | verbatim_adapted | S01 "let's zoom out for a second, man. In an ideal world, where do you want to be in six months in terms of like income" | metric = inquiry handling |
| `p1-st-gap` | 1 transition | "Okay, how far are you from that now?" | verbatim_adapted | S02 "Okay, how far are you from that now?" | — |
| `p1-st-willing` | 1 transition | "Let's say there was a way to kind of possibly help you get from like {baseline} to like {target}… would you actually be willing to invest…" | verbatim_adapted | S03 "Let's say there was a way to kind of possibly help you… would you actually be willing to invest in yourself if that's what it took?" | conditional only |
| `p1-st-permission` | 1 transition | "based on what I've heard, man… I feel like there might be a possibility… set up like a proper half hour… How does that sound?" | verbatim_adapted | S04 "based on what I've heard, man… I feel like there might be a possibility of being able to help you… dive a lot deeper… How does that sound?" | Jason is the "John" |
| `p1-st-awful` | 1 transition | "Would that be awful?" | verbatim_adapted | S05 "would that be awful?" | optional register |
| `p1-st-book` | 1 transition | "What's easier for you — {day_a} or {day_b}? … is that a conversation you'd want {partner} on…" | apohenia_addition | "you just obviously go to the calendar… schedule them in" | decision role asked honestly |
| `p1-st-notes` | 1 transition | (written) tangible · experience · process · … · their words | apohenia_addition | "just a short summary of the notes that the setter left you" | fields not in source |
| `p2-entry-connect` | 2 entry | "Hey, hey, {first_name}, can you, can you hear me alright? … What's up, man? How's it going?" | verbatim_adapted | I05 "Hey, hey, John, can you can you hear me? can you see me?… What's up, buddy? How's it going?" | "see me" dropped on phone |
| `p2-entry-recap` | 2 entry | "I've got my notes here from when you and I spoke on {day}. You mentioned… is that, is that about right?" | verbatim_adapted | I08 "I have some notes here from John… Is that is that about right?" | own notes |
| `p2-entry-missing` | 2 entry | "let me get it right from you, because I don't want anything lost in translation…" | apohenia_addition | V01 "I want to get it right from you. Like nothing got lost translation." | evidence check |
| `p2-rationale` | 2 rationale | "besides obviously like {problem}, what's the main reasoning of even looking at… rather than just, I don't know… like the average store? Like why not just do that?" | verbatim_adapted | E01 "what's the main reasoning of even looking at I guess like a more advanced system… rather than just, I don't know, like doubling on the referrals… like the average person. Like why not just do that?" | in-house preference accepted |
| `p2-ph-looked` | 2 pre-handle | "before you and I were speaking, were you out there looking for other ways… or what were you actually doing about that?" | verbatim_adapted | E02 "before you and I were speaking were you out there looking for other ways… or like what were you actually doing about that" | — |
| `p2-ph-prevented` | 2 pre-handle | "What prevented you, man? Why not?" | verbatim_adapted | E03 "what prevented you man? Why not?" | — |
| `p2-ph-shifted` | 2 pre-handle | "what shifted for you now then? Like obviously if {barrier} was what was preventing you in the past…" | verbatim_adapted | E04 "what shifted for you now then? Like obviously if the money was what was preventing you in the past…" | still-constrained handled truthfully |
| `p2-ph-moved` | 2 pre-handle | "did you actually, like, like move forward with anything, or like what actually ended up happening?" | verbatim_adapted | E05 "did you actually like like move forward with anything or like what actually ended up happening?" | — |
| `p2-ph-result` | 2 pre-handle | "did you get like a, like a good result or a bad result?" | verbatim_adapted | E06 "did you get like a like a good result or a bad result?" | — |
| `p2-ph-criteria` | 2 pre-handle | "what would you need to see in something this time to be able to be like, oh, I actually feel like they could get this handled…" | verbatim_adapted | E07 "what would you need to see in something this time to be able to be like, oh, I actually feel like they could get me results even though last time obviously you didn't" | unmet criteria said plainly |
| `p2-ph-bottleneck` | 2 pre-handle | "if you got a good result last time, what even has you looking at, I guess, possibly something more this time?" | verbatim_adapted | E08 "if you got a good result last time, what even has you looking for, I guess, possible more advanced training this time?" | — |
| `p2-ph-still-active` | 2 pre-handle | "so {vendor} is still in there. What's it doing for you, and what's it not doing…" | apohenia_addition | — | brief §6 added route |
| `p2-ph-mixed` | 2 pre-handle | "so some of it worked. Which part actually did…" | apohenia_addition | — | brief §6 added route |
| `p2-ph-no-authority` | 2 pre-handle | "whose call would it actually be at {dealership_name}…" | apohenia_addition | — | genuine lack of authority accepted |
| `p2-ph-no-problem` | 2 pre-handle | "then it sounds like you've got it handled…" | apohenia_addition | — | — |
| `p2-ph-declined` | 2 pre-handle | "No problem — we can leave that one." | apohenia_addition | — | recorded as declined |
| `p2-bolt-permission` | 2 future | "Well, can I offer you a perspective, man?" | verbatim_adapted | F01 "Well, can I offer you a perspective, man?" | — |
| `p2-bolt` | 2 future | "Have you heard the Usain Bolt analogy? … put a lion behind him…" | verbatim_adapted (optional) | F02 "if you take Usain Bull… you put a lion behind him… strong pull… strong enough consequence to failure" | bank: study_only — reclassification pending |
| `p2-future` | 2 future | "let's say there was a way of possibly helping you with actually like getting every inquiry {their_word}… What would tangibly be like, like different for the business…" | verbatim_adapted | F03/F10 "Let's say there was a way of possibly helping you with actually like getting to those 50 leads a month… What would tangibly be like different for the business at that point?" | 2–3 specifics |
| `p2-future-meaning` | 2 future | "Well, how do you mean by {their_word}?" | verbatim_adapted | F04 "Well, how do you mean by free?" / V43 | — |
| `p2-future-where` | 2 future | "Where would that show up first, man — like the Saturday floor, the month-end…" | verbatim_adapted | F05/F06/F07 "In what situations…" / "where do you want to stay?" | B2B place |
| `p2-future-who` | 2 future | "And who'd notice it first — like who on the team?" | verbatim_adapted | F08 "Like who would you want to take with you?" | B2B person |
| `p2-future-growth` | 2 future | "how do you feel like that would impact like the store's growth, even?" | verbatim_adapted | F11 "how do you feel like that would impact like the company's growth even?" | — |
| `p2-future-owner` | 2 future | "you being the {role} — what would even be different for you, like at that point, as the {role}?" | verbatim_adapted | F12 "obviously like you being the owner what would even be different for you like at that point as the owner" | — |
| `p2-future-feel` | 2 future | "And how would that, like, feel, man? Like put yourself in those shoes for a second." | verbatim_adapted | F09 "And how would that like feel, man?… put yourself in those shoes for a second." | optional, B2B often skipped |
| `p2-consequence` | 2 consequence | "And what if you don't, man? What happens if {dealership_name} stays in the exact same position… for the next two days, two weeks, two months, even two years, man?" | verbatim_adapted | C01 "And what if you don't, man? What happens if we stay on the exact same trajectory… for the next two days, two weeks, two months, even two years, man. Like what would happen at that point?" | "not much" accepted |
| `p2-consequence-probe` | 2 consequence | "what, I guess, would that hit first, just so I understand… Is that like a {place} thing?" | verbatim_adapted | C02/C03 "what sports I guess wouldn't you be able to play just so I understand… do you have like a field nearby?" | — |
| `p2-consequence-owner` | 2 consequence | "And what do you think that might even mean for you, like as the {role}?" | verbatim_adapted | C04 "And what do you think that might even mean for you like as the owner?" | — |
| `p2-consequence-feel` | 2 consequence | "And how would you, like, like feel at that point?" | verbatim_adapted | C05 "And how would you like like feel at that point?" | optional; C06 excluded |
| `p2-consequence-mirror` | 2 consequence | "I've met a lot of stores that say that… What would be the day-to-day ramifications, though…" | verbatim_adapted | V45 "I met a lot of people that say, right?… What's like the day-to-day… 36 12 months down the line" | must be true for Jason |
| `p2-commit-settle` | 2 commit | "this will sound like an obvious question, man, but… Are you willing to settle for that?" | verbatim_adapted | P01 "So this will sound like an obvious question, man, but I mean I mean it's really not. Are you willing to settle for that?" | yes → exit |
| `p2-commit-why-now` | 2 commit | "And why now? Because like there's always the new-year-new-me guy… Why actually draw that line in the sand…" | verbatim_adapted | P02 "And why now? Because like there's always a new year, new me guy… Why actually draw that line in the sand and like make that change?" | — |
| `p2-commit-responsibility` | 2 commit | "And whose responsibility do you feel like it is to actually say, I've had enough, and make that change?" | verbatim_adapted | P03 "And whose responsibility do you feel like it is to actually say I've had enough and make that change?" | delegated → authority route |
| `p2-pitch-permission` | 2 pitch | "based on what I've heard, man… If it would be appropriate from here, we could kind of put a game plan together… Would that be appropriate, or what do you want to do from here?" | verbatim_adapted | P04 "I think what we're doing for sure could help you. If it would be appropriate from here, we could kind of put a game plan together… Would that be appropriate or what do you want to do from here?" | "for sure" → "could genuinely" |
| `p2-pen` | 2 pitch | "Do you have a pen and paper handy, man?" | verbatim_adapted | P11 (Source B) | optional |
| `p2-pillar-1` | 2 pitch | "pillar one, man, is the speed… Because you know how you mentioned {Y}? So what we do is {offer delivery}. Does that make sense?" | verbatim_adapted | P05/P06/P12 "pillar one is X because you know how you mentioned XYZ. So what we do is XYZ… Does that make sense?" | Z = `pillars[0].delivery` |
| `p2-pillar-2` | 2 pitch | "Pillar two is the ownership… one named handoff…" | verbatim_adapted | P05/P06 same structure | Z = `pillars[1].delivery` |
| `p2-pillar-3` | 2 pitch | "pillar three is the visibility… one honest reporting view…" | verbatim_adapted | P05/P06 same structure | Z = `pillars[2].delivery` |
| `p2-fit` | 2 pitch | "based on everything we've covered, man — like do you actually feel like this would get {dealership_name} to…" | verbatim_adapted | P07 "based on everything we've covered, man, like do you actually feel like this would get you to that goal" | — |
| `p2-why` | 2 pitch | "then why though?… what do you think is really like the key to the castle for you?" | verbatim_adapted | P08 "Okay, then why though?… what do you think is really like the the the the key to the castle for you? What do you think is going to help you the most?" | — |
| `p2-personal` | 2 pitch | "because you having {key_pillar}, man, what do you feel like that would do for you? Like even more personally though." | verbatim_adapted | P09 "because you having that accountability, man, what do you feel like that would do for you? Like even more personally though" | — |
| `p2-price` | 2 price | "the total investment, man, to actually get {dealership_name} to the point of… is going to be {approved_price}. How would you like to proceed?" | verbatim_adapted | P10 "the total investment, man, to actually get you to the point of… is going to be XYZ… How would you like to proceed?" | only with an approved price |
| `p2-price-null` | 2 price | "the next step on my side is to put the exact scope and the investment in writing… How would you like to proceed from here…" | apohenia_addition | — | price `null` → cue; no number |
| `p3-rule` | 3 rule | (rule) convert every objection; money logistics first | verbatim_adapted (rule) | A11 "convert the objections they get into the ones that they want to handle… you're always gonna push it to money logistical" | one reframe per family; authority accepted |
| `p3-reframe-structure` | 3 rule | (rule) frame → pushback → consequence → CTA | verbatim_adapted (rule) | "Number one is the frame… Step two is the push back… Number three is the consequence… step four is the CTA" | — |
| `p3-money-duffel` | 3 money | "Money aside for a second — like if I handed you a duffel bag with the full {approved_price}… would you actually do it?" | verbatim_adapted | O01 "Money aside for a second, like if I gave you a duffel bag with the full 10,000 for the program, would you actually do it?" | null form while price null |
| `p3-money-why` | 3 money | "Well, why though? Just so I understand." | verbatim_adapted | O02 "Well, why though? Just so I understand." | — |
| `p3-money-personal` | 3 money | "because like you having {valued_component}… what do you feel that would do for you, like, like more personally though?" | verbatim_adapted | O03 "What do you feel that would do for you like like more personally though?" | — |
| `p3-money-split` | 3 money | "is it just the initial investment… or if there was a way to possibly break it up, would that make it a bit more digestible…" | verbatim_adapted | O04 "or if there was a way to possibly break it up, would that make it a bit more digestible like financially for you?" | only if approved terms allow |
| `p3-money-fit` | 3 money | "ballpark, what would actually work for {dealership_name} on this, month to month? Just to see if I can help." | apohenia_addition | replaces O05 (study_only) | B2B budget fit |
| `p3-money-plan` | 3 money | "{approved_payment_option}… Would that work within your budgetary constraints?" | verbatim_adapted | O06 "Would that work within your budgetary constraints?" | only approved options spoken |
| `p3-money-proceed` | 3 money | "with the understanding that you feel this would actually get {dealership_name} to… and obviously that it works within budgetary constraints, how would you like to proceed?" | verbatim_adapted | O07 "with the understand that you feel would actually get you to that goal… and obviously that it worked within budgetary constraints, how would you like to proceed?" | — |
| `p3-time-aside` | 3 time | "Well, time aside, man. Like if you did have the time, would you actually do it?…" | verbatim_adapted | O08 "Well, time aside, man. Like, if you did have the time, would you actually do like do you actually feel like it'll get you to that goal" | — |
| `p3-time-why` | 3 time | "Well, why though? Like what do you feel would really help you the most?" | verbatim_adapted | O02 (time) "Well, why though? Like, what do you feel would really help you the most?" | — |
| `p3-time-personal` | 3 time | "because you having that, like — what do you feel like that would do for you, like even more personally?" | verbatim_adapted | O03 (time) "what do you feel like that would do for you like even more personally?" | — |
| `p3-time-frame` | 3 time | "can I make a suggestion, man? Because really, in this world, there's two kinds of people… which of those two people do you want to be?" | verbatim_adapted | O09 "there's two kinds of people… Because I have my family… that's why I need to… which of those two people do you want to be?" | bank: study_only — reclassification pending; "first guy" accepted |
| `p3-time-pushback` | 3 time | "And why? Cuz like you don't have to, man." | verbatim_adapted | O10 "And why? Cuz like you don't have to, man." | bank: study_only — pending |
| `p3-time-consequence` | 3 time | "Because what do you think would happen if you didn't, man? Like if you decided to be that first guy…" | verbatim_adapted | O11 "what do you think would happen if you didn't, man? Like if you decided to be that first guy…" | bank: study_only — pending |
| `p3-time-settle` | 3 time | "Are you actually willing to, like, like settle for that?" | verbatim_adapted | P01 "are you actually willing to like like like settle for that?" | — |
| `p3-time-cta` | 3 time | "what decision do you feel like you have to make to put {dealership_name} in the best possible position…" | verbatim_adapted | O12 "what decision do you feel like you have to make to put yourself in the best possible position…" | — |
| `p3-partner-aside` | 3 partner | "partner aside, man — like if {partner} was on board… would you actually do it?…" | verbatim_adapted | O13 "if she was on board and she was like, 'Honey, you have to do this…' Like, would you actually do it?" | authority guard first |
| `p3-partner-why` | 3 partner | "Well, why though? Like, just so I understand." | verbatim_adapted | O02 (partner) "Well, why though? Like, just so I understand." | — |
| `p3-partner-personal` | 3 partner | "because what would that do for you, personally?" | verbatim_adapted | O03 (partner) "because what would that do for you personally?" | — |
| `p3-partner-no` | 3 partner | "what happens if you go to {partner}… and they say no? Like would you kind of, like, do it anyway, or…" | verbatim_adapted | O14 "what happens if you go to her… And she says, 'No,' like would you kind of like do it anyways or you just kind of like give up" | bank: study_only — pending |
| `p3-partner-why-anyway` | 3 partner | "Well, why would you?" | verbatim_adapted | O15 "Well, why would you?" | bank: study_only — pending |
| `p3-partner-crown` | 3 partner | "heavy is the head that wears the crown… the weight of the crown is the decisions you make when you have that crown on…" | verbatim_adapted | O16 "heavy is the head that wears the crown. The idea of it, man, is like the weight of the crown isn't the crown itself…" | bank: study_only — pending |
| `p3-partner-who-does` | 3 partner | "who's going to be the one actually living with how the inquiries get handled day to day… you, or {partner}? Between you and I…" | verbatim_adapted | O17 "who's going to be the one actually going through the training… Is that going to be you or is it going to be your wife between you and I, cuz I want to help you?" | bank: study_only — pending |
| `p3-partner-responsibility` | 3 partner | "So whose responsibility is it to really put {dealership_name} in the best possible position…" | verbatim_adapted | O18 "So, whose responsibility is it to really put you in the best possible position to learn that skill?" | bank: study_only — pending |
| `p3-partner-fair` | 3 partner | "do you think it'd actually be fair to, like, put the weight of that responsibility on anybody but yourself?" | verbatim_adapted | O19 "do you think it'd actually be fair to like put the weight of that responsibility on anybody but yourself?" | bank: study_only — pending |
| `p3-partner-why-not` | 3 partner | "Well, why not, though?" | verbatim_adapted | O20 "Well, why not, though?" | bank: study_only — pending |
| `p3-partner-consequence` | 3 partner | "what do you think happens if you take that responsibility… and you put it on anybody but yourself…" | verbatim_adapted | O21 "what do you think happens if you take that responsibility that burden that you have and you put it on anybody but yourself" | bank: study_only — pending |
| `p3-partner-settle` | 3 partner | "And are you actually willing to, like, like settle for that?" | verbatim_adapted | P01 "And are you actually willing to like like settle for that?" | — |
| `p3-partner-cta` | 3 partner | "So what decision do you feel like you need to make to put {dealership_name} in the best possible position…" | verbatim_adapted | O12 "So, what decision do you feel like you need to make to put yourself in the best possible position…" | one fear frame after, never a loop |
| `p3-partner-authority` | 3 partner | "let's make that conversation easy. What would {partner} need to see: a one-page scope…" | apohenia_addition | — | real lack of authority accepted |
| `p3-fear-agree` | 3 fear | "that makes sense, man. Because like ultimately what you're seeking is like, like certainty, right?… Is that right?" | verbatim_adapted | O22 "Well, that makes sense, man. Because like ultimately what you're seeking is like like certainty, right?" | scope risk answered from offer first |
| `p3-fear-certainty` | 3 fear | "everybody wants it, but nobody can have it — because there are no guarantees in life except for death and taxes… two stores…" | verbatim_adapted | O23/O24 "everybody wants it, but nobody can have it because there are no guarantees in life except for death and taxes… McDonald's worker… entrepreneur" | bank: O23/O24 study_only — pending; B2B contrast uses offer terms |
| `p3-fear-pushback` | 3 fear | "can you see how, man — you making the decision based off seeking certainty could have been what's kept {dealership_name} in this position…" | verbatim_adapted | O25/O30 "can you see how, man? You making your decisions based off seeking certainty could have been what put you in this position" | — |
| `p3-fear-consequence` | 3 fear | "what do you think happens if you keep using that same way of making decisions… for the next two days, two weeks, two months, even two years, man?" | verbatim_adapted | O26 as quoted | — |
| `p3-fear-settle` | 3 fear | "And is that something you're willing to, like, like settle for?" | verbatim_adapted | P01 "is that something you're willing to like like like like settle for?" | — |
| `p3-fear-cta` | 3 fear | "what decision do you feel like you need to make, man — out of uncertainty… so when your head hits that pillow tonight…" | verbatim_adapted | O12 "what decision do you feel like you need to make, man, out of uncertainty… so when your head hits that pillow tonight, you know, you did everything in your power" | one frame only |
| `p3-fear-riskier` | 3 fear | (not run) second certainty frame | excluded_study_only | "If you're using certainty, you're still going to go into what's riskier" | named, not worked in source |
| `p3-exit-respectful` | 3 exit | "Totally fair, man. I'm not going to push you… I'll send over {scope}… yours to pick up or not." | apohenia_addition | contrast: "the last thing that happens is the thing that they're going to remember the most" | replaces apology |
| `p3-exit-followup` | 3 exit | "when would actually make sense to touch base?… You tell me, and I'll stick to it." | verbatim_adapted (purpose) | U01 / U07 | nurture-first |
| `p3-exit-stop` | 3 exit | as `p0-optout` | apohenia_addition | — | — |
| `p4-tone-map` | 4 overlay | per-stage tonality + body cues | verbatim_adapted (overlay) | "body language is the remote control to your tone"; "all of intent is going to be very curious and casual"… | instructor-described, not audio-verified |
| `p4-fillers` | 4 overlay | "Yeah. · Okay. · Right. · Gotcha. · That makes sense." | apohenia_addition (the five) | "choose five filler words that you're most likely to use… 'Yeah, oh, really?' 'Uh-huh.' Right." | Jason to confirm |
| `p4-cue-rules` | 4 overlay | speed / inflection / mirror the frequency / under their speech / bridge | verbatim_adapted (rules) | "it's slower and it's more spaced out because that's going to make them tell me more" | no emotion score |
| `p4-mirror-identify` | 4 mirror | "Jason with Apohenia — is {first_name} around, or is this them?" | apohenia_addition | M01 two-part rule | — |
| `p4-mirror-permission` | 4 mirror | "Is now workable for a quick one, or should I try you another time?" | apohenia_addition | S05 optional | — |
| `p4-mirror-relevance` | 4 mirror | "does it land with one person, or does it sort of go wherever?" | apohenia_addition | — | — |
| `p4-mirror-gatekeeper` | 4 mirror | "who's the person who'd actually know that — the GM, or the internet or BDC manager?" | apohenia_addition | — | — |
| `p4-mirror-tangible` | 4 mirror | "Can you give me more specifics on that?…" | verbatim_adapted | V02 "Can you give me more specifics on this?" | — |
| `p4-mirror-tangible-curious` | 4 mirror | "If this went the way you'd want it to six months from now, what would actually be different…" | verbatim_adapted | V02 "do you know what type of help, you know, your specific" | — |
| `p4-mirror-experience-allow` | 4 mirror | "you having every inquiry {their_word}, what would that, I guess, really allow the store to do that maybe it can't do now?" | verbatim_adapted | M02 "you making more money, man. Like, what would that, I guess, really allow you to do that that maybe you you you can't do now?" | — |
| `p4-mirror-experience-instance` | 4 mirror | "give me an example of like an instance where that happened — like one from the last couple weeks." | verbatim_adapted | V14 "give me an example of like an instance where you may have" | — |
| `p4-mirror-experience-volume` | 4 mirror | "What have you seen happen to those {n}…" | verbatim_adapted | I04 "You just plug in whatever answer they give into the X" | — |
| `p4-mirror-process` | 4 mirror | "Just your structure — like when one comes in through the site, who sees it first…" | verbatim_adapted | V04 "as far as the full process like you speak within just your structure" | — |
| `p4-mirror-duration` | 4 mirror | "how long has it been like that — as far as {their_answer} picking them up first?" | verbatim_adapted | V05 "how long have you been that for as far as that style of selling?" | — |
| `p4-mirror-origin` | 4 mirror | "Like why in that fashion…" | verbatim_adapted | V06 "Like why in that fashion?" | — |
| `p4-mirror-like` | 4 mirror | "Do you like it though?… what's actually working?" | verbatim_adapted | V07 "Do you like it though?… What do you think is working?" | — |
| `p4-mirror-change` | 4 mirror | "How do you mean? Like describe that for me — give me an example…" | verbatim_adapted | L09 / V14 | — |
| `p4-mirror-change-nothing` | 4 mirror | "earlier you mentioned {experience}; is that not something you'd change?" | apohenia_addition | — | evidence reflect |
| `p4-mirror-problem-duration` | 4 mirror | "a couple of months, or is this kind of how it's always been?" | verbatim_adapted | L10 | — |
| `p4-mirror-impact` | 4 mirror | "Well, how so? Just so I understand." | verbatim_adapted | L14 | — |
| `p4-mirror-count` | 4 mirror | "What does that mean — like two, five, ten? How many?" | verbatim_adapted | V11 "What was that mean? Like two, five, 10. How many?" | — |
| `p4-mirror-target` | 4 mirror | "Better meaning what — like if we were talking in March…" | verbatim_adapted | S01 + "make it real" | — |
| `p4-mirror-gap` | 4 mirror | "Like out of ten, where are you today?" | verbatim_adapted | V44 "four out of 10 or five out of 10" | — |
| `p4-mirror-willing` | 4 mirror | "Not asking for a number, man — just whether…" | verbatim_adapted | S03 hedging | — |
| `p4-mirror-permission-book` | 4 mirror | "would a half hour on {day} be a nuisance, or workable…" | verbatim_adapted | S04 | — |
| `p4-mirror-recap` | 4 mirror | "Did I get the main thing right, or is there something I've got backwards?" | verbatim_adapted | I08 | — |
| `p4-mirror-rationale` | 4 mirror | "why not just tell {internet_manager} to be faster on it and leave it there…" | verbatim_adapted | E01 / V24 | — |
| `p4-mirror-looked` | 4 mirror | "Besides what the store already had in place — did you yourself go looking…" | verbatim_adapted | V28 "company aside though did you do any training" | — |
| `p4-mirror-prevented` | 4 mirror | "money, time, somebody else's call, or just not sure it'd work?" | verbatim_adapted | E03 | — |
| `p4-mirror-shifted` | 4 mirror | "is it still the reason now, or did something actually move?" | verbatim_adapted | E04 | — |
| `p4-mirror-criteria` | 4 mirror | "if two vendors called you tomorrow, what would make you pick one…" | verbatim_adapted | E07 / V29 | — |
| `p4-mirror-future` | 4 mirror | "how would that impact, like, other parts of the store, though? Just to see if I could even help." | verbatim_adapted | M03 "how would that impact like like other aspects of your life though just to see if I could even help" | — |
| `p4-mirror-future-owner` | 4 mirror | "Like for your week, though — what changes?" | verbatim_adapted | F12 | — |
| `p4-mirror-consequence` | 4 mirror | → `p2-consequence-mirror` | verbatim_adapted | V45 | — |
| `p4-mirror-settle` | 4 mirror | "a version of {dealership_name} you'd be okay with a year from now?" | verbatim_adapted | P01 | — |
| `p4-mirror-why-now` | 4 mirror | "Every good guy starts on a Monday, man — why does this one stick?" | verbatim_adapted | V48 "every good guy starts on a Monday" | — |
| `p4-mirror-responsibility` | 4 mirror | "who has to make the choice — if you settle or not?" | verbatim_adapted | V47 "who has to make the choice if you settle or not?" | — |
| `p4-mirror-pitch-permission` | 4 mirror | "I'll get to the number in two minutes — do you want me to walk you through…" | verbatim_adapted | P04 | — |
| `p4-mirror-pillar` | 4 mirror | "Do you see why that's there…" | verbatim_adapted | P12 | — |
| `p4-mirror-fit` | 4 mirror | "is there a piece of {tangible} this wouldn't touch?" | verbatim_adapted | P07 | — |
| `p4-mirror-key` | 4 mirror | "If you could only have one of the three — which?" | verbatim_adapted | P08 | — |
| `p4-mirror-proceed` | 4 mirror | "So from here — how do you want to do this?" | verbatim_adapted | P10 | — |
| `p4-mirror-duffel` | 4 mirror | "if the money genuinely wasn't the thing — is this what {dealership_name} would do?" | verbatim_adapted | O01 | — |
| `p4-mirror-time-aside` | 4 mirror | "if the calendar wasn't the thing — is this what you'd do?" | verbatim_adapted | O08 | — |
| `p4-mirror-partner-aside` | 4 mirror | "if {partner} said 'your call' — what would you do?" | verbatim_adapted | O13 | — |
| `p4-mirror-agree` | 4 mirror | "the worry is: what if it doesn't do what I said — is that it?" | verbatim_adapted | O22 | scope risk answered from offer |
| `p4-kudos-owner` | 4 kudos | "Kudos to you, man, for actually looking at how the leads get worked instead of just buying more of them…" | verbatim_adapted | A12 template | hypothetical contrast |
| `p4-kudos-gm` | 4 kudos | "Kudos to you for actually wanting to see it on one screen…" | verbatim_adapted | A12 template | — |
| `p4-kudos-gsm` | 4 kudos | "Kudos to you, man, for wanting somebody to own each one…" | verbatim_adapted | A12 template | — |
| `p4-kudos-bdc` | 4 kudos | "Kudos to you for picking those up yourself and caring how fast…" | verbatim_adapted | A12 template | — |
| `p4-kudos-casual` | 4 kudos | "That's really smart of you, man." / "That's honestly courageous…" | verbatim_adapted | "Oh, that's really smart of you." / "Oh, that's really courageous of you." | only when earned |
| `p4-alpha-beta` | 4 overlay | beta: build up with earned kudos; alpha: do not compete, do not deflate | verbatim_adapted (build-up) | "if they're a beta, you have to build them up" | deflation excluded |
| `p4-labels` | 4 overlay | propose → confirm → provenance → reuse → invalidate on correction | verbatim_adapted (rule) | V25 "the rule of thumb is labels have meaning" | — |
| `p4-make-it-real` | 4 overlay | goal → details; count → exactness; adjective → probe; time frame; say it out loud; bound | verbatim_adapted (rules) | "you have to make it real… when there's details"; "when you put a time frame on something, it goes from being a dream to being a goal" | — |
| `p0x-support-team` | 0 excluded | "I'm just with the customer support team." | excluded_study_only | I01–I03 webinar opener | false identity |
| `p0x-specific-training` | 0 excluded | "Because I might be able to send you like a bit of a more specific training." | excluded_study_only | I03 | no resource exists; reinstatable when true |
| `p0x-benefit-coordinator` | 0 excluded | "introduce yourself as you know their benefit coordinator or somebody that's that's been assigned to their particular file" | excluded_study_only | V04 (prospect speech) | misleading identity; data not instruction |
| `p0x-never-move-on` | 0 excluded | "Never move on without getting the answer because all you're teaching the prospect subconsciously is this guy's low status." | excluded_study_only | V02 commentary | mirror kept; status rationale and extraction requirement not |
| `p1x-forced-positive` | 1 excluded | "Well, it can't be all terrible, like if you've been using it… What do you like about it, man? Tell me one thing." | excluded_study_only | L06 | "nothing" accepted |
| `p1x-deflation` | 1 excluded | "A million a week? Jesus, man…" / "Only five? Why? Why so low?" | excluded_study_only | D01 / D02 | deception; numbers recorded, never challenged |
| `p2x-regret` | 2 excluded | day-to-day feeling knowing you could have been… | excluded_study_only | C06 | no required emotional word |
| `p2x-father` | 2 excluded | "Who do you think that could even make you as a father?…" / "who do you think that would make you as a person?" | excluded_study_only | D03 / D04 | identity shame |
| `p2x-future-identity` | 2 excluded | "who do you feel like that would make you as a person? Like being the guy who actually took the opportunity…" | excluded_study_only | D05 | future identity attachment; kudos only |
| `p2x-fire-setter` | 2 excluded | "If the setter did not leave you notes… fire him." | excluded_study_only | I08 commentary | instructor rhetoric |
| `p3x-savings` | 3 excluded | "Cash on hand then expenses aside, what do you have saved up?" | excluded_study_only | O05 | consumer savings question; replaced by `p3-money-fit` |
| `p3x-four-frames` | 3 excluded | "after the four frames, pipeline the person, apologize" | excluded_study_only | A11 | one frame; brief scenario 40 |
| `p3x-apology` | 3 excluded | "I failed you… I know you're going to suffer because of it…" | excluded_study_only | A11 | asserts harm the seller cannot know |
| `p3x-perspective-frames` | 3 excluded | "Island, what's riskier? fat person $4,000" | excluded_study_only | A11 / B05 | named, not worked in Source A |
| `p3x-still-fear-loop` | 3 excluded | "I still need to speak to their partner is purely fear… go straight into fear objection handling if they tell it to you again." | excluded_study_only | A11 | classification kept as a note; loop not |
| `p4x-deflation` | 4 excluded | alpha deflation | excluded_study_only | D01 / D02 | see `p1x-deflation` |
| `p4x-manipulation-framing` | 4 excluded | "manipulation, darker psychology"; "the foundation and deepest level of manipulation" | excluded_study_only | intro / identity chapter | Source Library only |
| `p4x-family-leverage` | 4 excluded | "if they are a father, then you use their family as leverage" | excluded_study_only | identity chapter | family is never leverage |

---

## Reviewer notes

### Decisions taken in this synthesis

1. The outbound open replaces the documented lead action with a relevance question whose answer is a current-process fact; that answer pre-satisfies L01 so the call enters logical certainty at L02.
2. Jason is setter and closer: the cold call runs Part 0 → Part 1 and books the deeper call; the deeper call runs Part 2 → Part 3 from his own notes; Intent is never repeated.
3. The improvement-form intent question is the default for dealerships (they already have a channel); the new-activity form is reserved for a store with no handling at all; never both.
4. The three pillars are labelled Speed / Ownership / Visibility in the pitch and read their Z clause verbatim from the offer's deliverables; no approved claims exist, so nothing beyond deliverables and acceptance criteria is said.
5. Price `null` renders a cue and `p2-price-null`; the duffel-bag, break-it-up and budgetary-constraint lines have null forms; no payment option that is not in the approved schedule is ever spoken.
6. The time, partner and certainty reframes are carried in full in Andrés's four-part structure per Jason's instruction, with the bank's `study_only` classification on O09–O11, O14–O21, O23/O24 and F02 surfaced on every affected line rather than silently overridden; the engine keeps them behind an explicit choice until reclassified.
7. One reframe per objection family, one certainty frame, then the respectful exit with an agreed follow-up; "what's riskier" and the perspective frames are named, not worked; the apology is study-only.
8. A genuine lack of authority or budget is diagnosed and accepted (`p2-ph-no-authority`, `p3-partner-authority`, `p3-money-fit` no-budget branch), never reframed as the partner or money objection.
9. The forced positive (L06) is replaced by a single ask that accepts "nothing"; alpha deflation (D01/D02) is excluded; kudos lines are limited to earned positive reinforcement with the "most people" clause made hypothetical.
10. Every `{their_word}` slot is the prospect's exact wording; seller-proposed labels carry the *seller proposed, prospect confirmed* provenance class.

### Open questions for the owner (Jason)

1. **Reclassification.** O09–O11 (time frame/pushback/consequence), O14–O21 (partner crown sequence), O23/O24 (certainty contrast) and F02 (Usain Bolt) are `study_only` in the bank but carried here per this revision's instruction. Reclassify to `adapt` by explicit decision, or keep them behind a deliberate branch choice — the document supports either; the engine must not auto-present them until decided.
2. **Voicemail.** Is a human-left first-touch voicemail to a business line permitted under the contact policy (brief: voicemail is a separate permission dimension; no automated drops)? The line is drafted; whether it may be used is policy.
3. **Self-description.** "I work on what happens after somebody sends an inquiry…" avoids implying customers (the offer has no supported proof). Confirm this is the exact wording Jason is comfortable with; "I help dealerships…" would imply results.
4. **Pre-call observation.** May Jason submit a test inquiry through a store's own site to make `p0-who-why` more specific? Not designed or assumed here; it has policy and honesty implications.
5. **Register.** "man", "buddy", the doubled "Hey, hey" and "Would that be awful?" are in the source's voice. Which does Jason keep in his own word track with a dealership GM? The document keeps them and marks the optional ones.
6. **`p2-consequence-mirror` opener** ("I've met a lot of stores that say that") must be literally true before it is used; until then use the source's "people" or drop the clause.
7. **Payment schedule.** `p3-money-split` and `p3-money-plan` can only speak options that exist in the approved offer's `payment_schedule` ("not set" today). What structure, if any, will the reviewed offer allow (staged milestones, setup split, monthly from acceptance)?
8. **Evidence model.** Confirm the engine marks L01 evidence-satisfied from `p0-relevance` and enters logical certainty at `p1-lc-duration`.
9. **Record gaps.** The tonality chapter, the verbal-cueing section (A08/B13 named-only) and the kudos template (A12 has only D03–D05) have no records; the overlays are cited by section. Should records be added to the bank for the kudos template and the per-stage tonality assignment?
10. **Fillers.** The five verbal cues in `p4-fillers` are proposed defaults, not Jason's confirmed preference.
11. **Analyst coverage note.** This synthesis received the intent/outbound analysis (A) in full and the logical-certainty analysis (B) truncated; the setter-transition, closing, objection and overlay analyses were not delivered to the synthesizer. Parts 1.3–4 were therefore synthesized directly from the full transcript and cross-checked against the record bank; the round-2 reviewer should read those parts against `sources/source_a.txt` with that in mind.
