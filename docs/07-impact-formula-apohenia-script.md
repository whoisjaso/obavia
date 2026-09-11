# Apohenia Outbound Script v0.2: the Impact Formula, adapted for outbound dealership calls

**Status:** draft, unapproved. **Synthesized:** 2026-09-11 (round 1 synthesis). **Source:** `sources/source_a.txt` (Andrés's Impact Formula brain-dump, 158,723 characters, read in full for this synthesis). **Record bank:** `data/source_question_records.json` (207 records). **Offer:** `data/offers.json`, version `draft-research-offer-v0` (price `null`). **Supersedes for script purposes:** the entry, intent, logical, setter, emotional, future, consequence, commitment, pitch, decision, concern and exit nodes of `docs/03-apohenia-draft-scripts.md` v0.1 once this document is reviewed and seeded; v0.1's follow-up, referral and upsell nodes are unaffected.

## Front matter

### What this is

This is the canonical word track Jason will internalize and the document the seed (`data/apohenia_script_nodes.json`) will be regenerated from. It carries Andrés's Impact Formula over **structure for structure and question for question**: the same sequence, the same purposes, the same constructions and hedges, and re-points every slot at what Apohenia actually sells. One step is added at the front (the outbound open) because the source presumes a warm inbound lead action that a cold dealership call does not have. Jason is his own setter and his own closer: **the cold call is the setting call; the booked deeper call is the closing call.** Nothing here is sales policy until an owner review marks a version published.

Andrés's own standard for a script is the standard for this one: "The way you know you've mastered sales is when you can review 20 calls, 10 calls, and they all sound identical. The only thing that changes is the prospect's answers." And: "if I tell you right now, what is the third question in logical certainty? What caused you to do XYZ? I know that immediately ... If you had to think for even half a second, it's not internalized at all."

"man", "buddy", "like", "I guess", "possibly", "let's say" and "all that jazz" are part of Andrés's technique, not noise. He says why at the setter transition: direct phrasing "triggers a lot of resistance ... It's too aggressive. You just make it, would you be possibly willing to invest? It's like in the ether up there." Jason may keep "man" or drop it in his own word track; the hedges stay.

### Fidelity policy (three tags, applied to every line in Part 5)

| Tag | Meaning |
|---|---|
| `verbatim_adapted` | Andrés's construction kept word for word where the words are generic, with only the offer-specific nouns swapped into the slots he himself marks as X, Y, "whatever it might be". The short source quote sits beside it in Part 5. |
| `apohenia_addition` | No counterpart in the source. Built on a principle Andrés states (confirm something true first, hedged asks, one fixed word track) but the words are original. The reason is given. |
| `excluded_study_only` | Present in the source, readable in the Source Library, **not** in the live script. The reason is given. Nothing is deleted from the bank; nothing excluded is silently softened into a live line. |

Where a bank record is classified `study_only` but the line belongs to the method Jason asked to carry over in full (the two-kinds-of-people frame O09 to O11, the crown frame O14 to O21, the Usain Bolt setup F02), the line is included, tagged `verbatim_adapted`, and flagged **classification conflict** in Part 5. The seed must not cite a `study_only` id as a primary citation (an existing test enforces this): primary citations use the adjacent `adapt` records and the `study_only` ids go in the node's source note until the owner reclassifies them. See Open questions.

### Outbound versus inbound, in one paragraph

Every opener in the source hangs on a documented lead action: "it looks like you downloaded I think it was a training", "I think you attended the webinar", "it looks like you opted in ... It looks like you're about to book a call, but you didn't end up", "it looks like you booked a time". The prospect confirms something true ("Is that is that about right?") before a single question is asked, and the stated reason for asking ("just to see if I could help you get like a little bit more out of it", "just to see if it would even make sense for you, man") reads as service. A cold dealership call has no such action. So the outbound open (Part 0) identifies the person, says truthfully who Jason is and why this store, asks low-friction permission, and then manufactures the honest equivalent of the lead action: a relevance question whose answer is a fact about the current process ("when an inquiry comes in from your website right now, who picks it up first?"). That answer is echoed back for the same "is that about right?" confirmation, becomes the first piece of logical-certainty evidence, and lets Andrés's tangible and experience constructions run unchanged. From the confirmed relevance answer onward the cold call **is** the setting call, and a form submission or email reply from a dealership uses Andrés's inbound opener construction directly (0.3). The only instructor mention of outbound in the source is an activity, never a script: "started making outbound dials until you found a prospect who's a lot more open".

### Buyer avatars (from the offer's `buyer_type` and `decision_roles`)

| Avatar | Role in the decision | What they usually answer at the relevance check | Notes for the script |
|---|---|---|---|
| Dealer principal / owner | Economic decision | "the GM handles that", "I'd have to check" | Rarely the first-touch contact; the owner future and owner consequence lines are written for this person. |
| General manager | Economic decision, day-to-day authority | "the BDC", "the internet manager", "me, honestly" | Default avatar for the cold call. |
| GSM / sales manager | Operational owner candidate | "whoever's free on the floor", "the desk" | Can own the handoff; may not hold the budget. Route budget to the GM or principal without the crown frame (3.4). |
| Internet / BDC manager | Operational owner; often no economic authority | "me and my two BDC agents" | Best-informed on the process; the setter transition books the GM or principal into the deeper call. |
| Practice only | Fictional GM of "Northgate Motors" | synthetic | Uses the FICTIONAL TRAINING OFFER, NOT A REAL QUOTE. Never in live mode. |

Not buyers: the receptionist or switchboard (routed, never pitched), the dealership's CRM vendor, consumers.

### The three pillars and their mapping to `data/offers.json`

The pitch names the pillars in Jason's short words; each maps to one offer pillar and speaks only that pillar's `delivery` text and the deliverables. No claim, proof or number is attached to any pillar (the offer's `approved_claims` and `supported_proof` are empty).

| Script name | Offer pillar | Connects to problem (offer text) | What Jason may say it does (offer `delivery`) |
|---|---|---|---|
| **Speed** | Same-day inquiry response | Inquiries sit unanswered in a shared inbox or queue with no owner and no clock. | Every website inquiry is acknowledged and routed through the dealership's existing channel inside an agreed response window, with the arrival time recorded. |
| **Ownership** | One named handoff | Nobody owns the lead, so it is worked twice or not at all and the handoff to sales is informal. | Each inquiry is assigned to one named staff member with a visible status that they update as they work it; unclaimed inquiries are surfaced, not lost. |
| **Visibility** | One honest reporting view | The manager cannot see what happened to an inquiry without asking around. | One view (arrival, first response, owner, status) for one rooftop, exported as a weekly summary; numbers are counts of recorded events, not projections. |

### Honesty constraints that bind every line

1. **Price.** The draft offer's price is `null`. The price line (2.6) speaks a number only when an approved, non-fictional offer version carries one; until then the screen shows a missing-information cue and Jason routes to a scope conversation. No range, no "around", no "usually". The fictional practice offer (USD 750 setup plus USD 150 for the 30-day period) appears only in practice under the banner FICTIONAL TRAINING OFFER, NOT A REAL QUOTE.
2. **No guarantees, no invented claims.** `approved_claims` and `supported_proof` are empty: the script describes deliverables and acceptance criteria only. Never "our dealers", "stores like yours typically", "you'll see more appointments". The offer's exclusions stand: not a sales guarantee, not a CRM replacement, no consumer texting or calling, no sensitive consumer data.
3. **Opt-out and refusal.** An opt-out wording stops the call from any node and persists suppression. A refusal or "I don't have that problem" is a complete answer. At most one call-out plus one re-ask per question, then accept.
4. **No required emotional word.** Sufficient answers never require a feeling word, including the source's "regret". Feeling questions are optional and skippable in B2B.
5. **Excluded as study only** (readable in the Source Library, never live): status deflation ("a million a week", "Only five? Why so low?"); the identity-shame consequence ("who would that make you as a father"); the four-frame ritual before exit; the "I failed you ... you're going to suffer" apology; the false "I'm just with the customer support team" identity; the forced positive after a "no" (L06); the savings question (O05); forced "regret" (C06); family leverage and "I'm not saying this is you".
6. **Allowed.** Positive identity reinforcement ("kudos to you for ...") when earned, brief, and followed by the next question.
7. **State honesty.** Demo mode plays synthetic transcripts and cannot dial. Text-only practice marks tone "not assessed". Nothing in this document is a claim that a test ran.

### Slots, block format and screen copy rules

**Slots.** A token in braces (`{prospect_name}`, `{dealership_name}`, `{stated_goal}`, `{stated_problem}`, `{stated_impact}`, `{their_word}`, `{their_answer}`, `{current_process}`, `{process_duration}`, `{problem_duration}`, `{target_metric}`, `{baseline}`, `{barrier}`, `{shift_reason}`, `{ideal_criteria}`, `{remaining_bottleneck}`, `{stated_consequence}`, `{key_pillar}`, `{approved_price}`, `{owner_role}`, `{gatekeeper_name}`, `{owner_name}`, `{callback_number}`, `{documented_action}`, `{their_label}`) is a slot rendered as a chip with an accessible name, never as literal text. Slots fill only from confirmed prospect facts or approved offer attributes; an unfilled slot renders a visible missing-information cue. `{their_word}` is always the prospect's exact noun or phrase, never a synonym.

**Block format.** Every script line is one block:

- **Say:** the line, rendered verbatim on the in-call screen.
- **Seeks:** the kind of answer that satisfies the line.
- **Why now:** the mechanism, in Andrés's words where he gave them.
- **Listen for:** what marks the answer sufficient, insufficient, or already given.
- **If unclear → mirror:** the call-out plus the re-ask, one time only.
- **Tone:** the tonality and the instructor-described body cue (text descriptions from the transcript, not audio-verified; on a phone call they are self-cues).
- **Then:** the branches, in plain words.
- **Routes:** the same branches as node ids for the seed (not screen copy).
- **Fidelity:** tag, record ids, and the short source quote.

**Screen copy rules** (Say, Seeks, Listen for, mirror and Then lines are rendered verbatim on the in-call screen): no em dashes or en dashes anywhere in the document; periods, commas and colons instead. No developer vocabulary in those lines (no ids, offsets, code names). No middle-dot chains. The only special tokens are brace slots and quotation marks.

---

## Part 0: OUTBOUND OPEN (the additional step)

Pre-dial is policy, not script: the record is eligible (not suppressed, jurisdiction known, business number), Jason is ready, the countdown is armed and cancellable. If any check fails, the call is not placed. Everything below starts when a human answers.

### 0.1 The cold open, in Jason's exact words

#### p0-identify: Identify the person

- **Say:** "Hey, is this {prospect_name}?"
- **Seeks:** A yes, a different person, a switchboard, or a recording.
- **Why now:** Andrés opens every call by confirming the person before anything else. It is the first true thing the prospect confirms.
- **Listen for:** A plain yes. "Who's calling?" from a receptionist. A recorded greeting.
- **If unclear → mirror:** "Sorry, {prospect_name}? The person who'd know about the website inquiries at {dealership_name}?"
- **Tone:** Casual (shoulders back, hands visible). The doubled "Hey, hey" is optional register.
- **Then:** Yes: say who I am and why. Someone else or a switchboard: the gatekeeper route. Voicemail: leave the message once.
- **Routes:** yes: p0-who-why; other person or switchboard: p0-gatekeeper; voicemail: p0-voicemail.
- **Fidelity:** `verbatim_adapted`. I01. Source: "Hey, hey, is this this John?"

#### p0-who-why: Who I am and the truthful reason for calling this store

- **Say:** "{prospect_name}, it's just Jason here with Apohenia. I work on what happens after somebody sends an inquiry through a dealership's website: the first reply, and who actually picks it up. I'm calling {dealership_name} specifically because I don't know how that's handled on your end yet, and I'd rather ask than guess."
- **Seeks:** Nothing yet. The person knows who is calling and why this store, in one breath.
- **Why now:** The source has a diminutive, casual self-introduction ("It's just Andy here from like XYZ fitness company") and then leans on a documented action. There is none here, so the action is replaced by a specific, truthful reason tied to inquiry follow-through at this store, and the line admits that Jason does not know their process. No claimed observation unless Jason actually has one (then: "I'm calling {dealership_name} specifically because {observed fact}", only if true and policy-permitted).
- **Listen for:** Any reaction at all is fine; the next line asks permission. "What is this about?" means go straight to the relevance question.
- **If unclear → mirror:** "Short version: I work on the follow-up side of website inquiries. That's the whole reason for the call."
- **Tone:** Casual, plain, said once, then stop. Do not raise energy to compensate for being uninvited.
- **Then:** Ask permission.
- **Routes:** p0-permission.
- **Fidelity:** `apohenia_addition` for the reason clause; `verbatim_adapted` for the self-introduction (I01/I02 register: "It's just Andy here from like XYZ fitness company"). Excludes the false identity line, see 0.4.

#### p0-permission: Low-friction permission

- **Say:** "Did I catch you at a bad time, or have you got like a minute?"
- **Seeks:** An explicit go-ahead, a better time, a redirect, a decline, or an opt-out. Silence is not permission.
- **Why now:** No permission question exists in the source. It is built on Andrés's stated principle that direct asks trigger resistance, so the easy "no" is offered first as an either-or.
- **Listen for:** "Go ahead", "what's this about?", "quick", "I've got a minute" are permission. "In the middle of something" is a bad time. "Talk to our internet manager" is a redirect. "Take me off your list" is an opt-out.
- **If unclear → mirror:** "Sorry, I'll be quick about it. Is now workable for a quick one, or should I try you another time?"
- **Tone:** Casual, unhurried.
- **Then:** Go ahead: the relevance question. Bad time: offer a scheduled fifteen minutes. Not interested: one relevance line, then accept. Wrong person: the gatekeeper route. Opt-out: stop and suppress. Silence: re-ask once, then schedule or end.
- **Routes:** go ahead: p0-relevance; bad time: p0-bad-time; not interested: p0-not-interested; wrong person: p0-gatekeeper; opt-out: p0-optout; silence: mirror once, then p0-bad-time or p3-exit-respectful.
- **Fidelity:** `apohenia_addition`. Principle: "notice I'm making it very theoretical ... That triggers a lot of resistance" (S03).

#### p0-relevance: The honest lead-action equivalent

- **Say:** "Quick one, man. When an inquiry comes in from your website right now, who picks it up first?"
- **Seeks:** A fact about the current process: a named person or role, "me", "nobody specifically", "we don't get website inquiries", or a refusal.
- **Why now:** This is the honest equivalent of "it looks like you downloaded the training". Its answer confirms relevance without inventing interest, becomes the "is that about right?" echo, and pre-satisfies the first logical-certainty question ("What are you doing now to get leads?"). Andrés's rule for the first question of logical certainty is the same purpose: get "their current process".
- **Listen for:** A role or person ("the BDC", "Dana", "our internet manager"). "Me." "Whoever's free", "shared inbox", "I'd have to check" (already an experience-class observation). "We don't really get website inquiries" (no fit). "Why do you want to know?" (answer honestly, once).
- **If unclear → mirror:** "Fair question, it's honestly the whole reason I called. When one comes in through the site, does it land with one person, or does it sort of go wherever?"
- **Tone:** Curious (tilt the head, squint), asked as a genuine question.
- **Then:** Names a role or person: echo and confirm. "Me": optional kudos, then echo and confirm. "Nobody specifically" or "shared inbox": echo it in their words and confirm. No website inquiries: no-fit exit. Refuses: answer honestly, offer fifteen minutes or end.
- **Routes:** role or person: p0-confirm; me: p0-kudos then p0-confirm; nobody or shared inbox: p0-confirm (record as experience-class); no inquiries: p0-no-fit; refusal: p0-bad-time or p3-exit-respectful.
- **Fidelity:** `apohenia_addition`, purpose of L01 ("What are you doing to get leads now?") asked as a first-touch relevance check.

#### p0-confirm: Echo and confirm

- **Say:** "Okay, so it lands with {their_answer} first. Is that, is that about right?"
- **Seeks:** A yes, or a correction in their words.
- **Why now:** Andrés ends every opener on "Is that is that about right?" so the prospect confirms something true before the first real question. Here the confirmed thing is their own relevance answer.
- **Listen for:** "Yeah." A correction ("well, it goes to the inbox and then whoever's free"): take the correction as the answer and confirm again.
- **If unclear → mirror:** "Just so I've got it right: the first person who sees a website inquiry is {their_answer}?"
- **Tone:** Casual-curious. The doubled "is that, is that" is the source's register and optional.
- **Then:** Confirmed: the tangible question. Corrected: confirm the correction, then the tangible question.
- **Routes:** p1-intent-tangible (mark the current-process question evidence-satisfied).
- **Fidelity:** `verbatim_adapted`. I02. Source: "Is that is that about right?"

#### p0-kudos: Positive identity line (optional, only when earned)

- **Say:** "Kudos to you, man, for actually picking those up yourself. It'd be easy to just let them sit in the inbox and hope somebody grabs them."
- **Seeks:** Nothing. Move straight to the next question.
- **Why now:** Andrés places identity reinforcement at the intent question: "kudos to you, man, for actually having the courage to do something". Template: "Kudos to you for being XYZ. Most people are bad thing. So, kudos for being why." The "most people" clause is rephrased as a hypothetical ("it'd be easy to") so Jason asserts nothing about other stores he has not observed.
- **Listen for:** Nothing required. If they wave it off, move on.
- **If unclear → mirror:** None. Never repeat a kudos line.
- **Tone:** Warm, brief, casual; immediately followed by the next question, as in the source ("Oh, that's really courageous of you. And but by the way, when when you said XYZ").
- **Then:** Echo and confirm.
- **Routes:** p0-confirm.
- **Fidelity:** `verbatim_adapted` (identity section, kudos template; no record id exists for the template, see Open questions). Source: "And kudos to you, man, for actually having the courage to do something."

### 0.2 Routes

#### p0-gatekeeper: Gatekeeper or wrong person

- **Say:** "Totally fair. Who's the person who'd actually know what happens to a website inquiry at {dealership_name}: is that the GM, or the internet or BDC manager? I'd rather ask them directly than leave a message that misses."
- **Seeks:** A name and role, a transfer, or a decline.
- **Why now:** No gatekeeper route exists in the source. Gatekeepers are routed by role, respected, and never pitched.
- **Listen for:** A name ("that's Dana, our internet manager"). "What's this regarding?" (answer in one line). "We don't take sales calls" (accept).
- **If unclear → mirror:** "Sure. It's about how website inquiries get picked up at {dealership_name}. Who'd actually know that, the GM or the internet or BDC manager?"
- **Tone:** Casual, courteous, brief.
- **Then:** Name given: ask for a time and permission to mention the referral. Transferred: re-open with the new person. Declined: thank and end, log for the contact policy.
- **Routes:** name: p0-gatekeeper-time; transfer: p0-transfer-reopen; declined: p3-exit-respectful.
- **Fidelity:** `apohenia_addition`.

#### p0-gatekeeper-time: Time, and permission to reference the referral

- **Say:** "When's usually a decent time to catch {owner_name}? And is it alright if I mention you pointed me their way?"
- **Seeks:** A time window and a yes or no on naming the referral.
- **Why now:** Obtains a truthful, permitted way to re-open with the owner of web inquiries. The outcome is a follow-up, not a lead action.
- **Listen for:** "Mornings before ten." "Sure, tell her I sent you." "I'd rather you didn't."
- **If unclear → mirror:** "Even a rough window helps. Mornings or afternoons?"
- **Tone:** Casual.
- **Then:** Log the follow-up with the time and the referral permission. End the call politely.
- **Routes:** p3-exit-followup.
- **Fidelity:** `apohenia_addition`.

#### p0-transfer-reopen: Re-open after a transfer

- **Say:** "Hey, is this {owner_name}? It's just Jason here with Apohenia. {gatekeeper_name} just passed me across. Did they say why I called, or should I take thirty seconds?"
- **Seeks:** Permission from the new person. They have agreed to nothing yet.
- **Why now:** A transfer restarts at permission. The identity check keeps the source construction; the permission ask is an Apohenia addition.
- **Listen for:** "Go ahead." "Make it quick." "Not now."
- **If unclear → mirror:** "Thirty seconds on why I called, then you tell me if it's worth more?"
- **Tone:** Casual.
- **Then:** Go ahead: who I am and why, then permission and relevance as normal. Not now: offer fifteen minutes.
- **Routes:** go ahead: p0-who-why; not now: p0-bad-time.
- **Fidelity:** `apohenia_addition` (identity check per I01).

#### p0-voicemail: Voicemail (human-left, once)

- **Say:** "Hey {prospect_name}, it's Jason with Apohenia. I work on what happens after somebody sends an inquiry through a dealership's website: who picks it up first, and how fast. Nothing urgent. If that's worth two minutes, I'm at {callback_number}. If not, no worries at all, I won't keep chasing you."
- **Seeks:** Nothing. Logged as a voicemail attempt.
- **Why now:** No voicemail script exists in the source. Short, truthful identity and reason, no urgency theatre, an explicit easy out. Left by a human, once; automated drops are prohibited by the brief.
- **Listen for:** Not applicable.
- **If unclear → mirror:** None.
- **Tone:** Casual, slow enough to catch the number.
- **Then:** End. Next attempt only per the contact policy. Whether a first-touch voicemail is permitted at all is a policy decision (Open questions).
- **Routes:** p3-exit-followup (logged as attempt).
- **Fidelity:** `apohenia_addition`.

#### p0-bad-time: Not a good time, so schedule

- **Say:** "No problem at all. Would like fifteen minutes at a time you pick be easier? You tell me when."
- **Seeks:** A specific time, or a second "not now".
- **Why now:** Mirrors the setter transition's soft scheduling ask ("How does that sound?") with the choice handed to the prospect.
- **Listen for:** A day and time. "Send me something" (offer the fifteen minutes once more, then accept). "No."
- **If unclear → mirror:** "How does that sound? Would that be awful?" (optional source register; see p1-st-awful)
- **Tone:** Casual.
- **Then:** Time agreed: log the follow-up, end. Second "not now" with no time: leave it there.
- **Routes:** time: p3-exit-followup; second not now: p0-bad-time-second.
- **Fidelity:** `apohenia_addition`, register from S04/S05 ("How does that sound? would that be awful?").

#### p0-bad-time-second: Second "not now" without a time

- **Say:** "All good. I'll leave it there. Thanks for picking up."
- **Seeks:** Nothing.
- **Why now:** Two "not now" answers without a time is a no. There is never a third push.
- **Listen for:** Not applicable.
- **If unclear → mirror:** None.
- **Tone:** Casual, warm.
- **Then:** End. Log the outcome; the contact policy decides whether any later attempt exists.
- **Routes:** p3-exit-respectful.
- **Fidelity:** `apohenia_addition`.

#### p0-not-interested: One relevance line, then accept

- **Say:** "Fair enough. The only reason I called is that when a website inquiry lands in a shared inbox, nobody owns it. If that's not how it works at {dealership_name}, then you're right, it's not for you. Appreciate you picking up."
- **Seeks:** Either an end, or a volunteered correction ("well, actually it does sit there").
- **Why now:** Exactly one honest relevance line: a mechanism, not a statistic or a claim about other stores. Then acceptance. The reviewed call's prospect describes the wall a generic opener hits ("you say insurance and they say I'm not interested"); the specific mechanism is the reply to that.
- **Listen for:** "Yeah, not for us." Or "well, actually" (that is a relevance answer).
- **If unclear → mirror:** None. One line only.
- **Tone:** Casual, no pressure.
- **Then:** End politely. If they volunteer a correction: echo and confirm, then continue.
- **Routes:** end: p3-exit-respectful; correction: p0-confirm.
- **Fidelity:** `apohenia_addition`. Context: V14/V15 prospect speech (data, not instruction).

#### p0-optout: Opt-out or do-not-call

- **Say:** "Understood. I'm taking you off my list right now. Sorry for the interruption, and have a good one."
- **Seeks:** Nothing.
- **Why now:** Immediate respectful stop; suppression persisted. Nothing in the source covers opt-out (its exit is the study-only apology).
- **Listen for:** Not applicable.
- **If unclear → mirror:** None.
- **Tone:** Calm, brief.
- **Then:** End. Persist suppression. No further attempt by any channel.
- **Routes:** p3-exit-stop.
- **Fidelity:** `apohenia_addition`.

#### p0-no-fit: No website inquiries, or genuinely dialed in

- **Say:** "Got it. Then this genuinely isn't for you, and I won't take more of your time. Thanks, {prospect_name}."
- **Seeks:** Nothing.
- **Why now:** "I don't have that problem" is a complete answer. No manufactured confession, no reframe.
- **Listen for:** Not applicable.
- **If unclear → mirror:** None.
- **Tone:** Casual, warm.
- **Then:** End. Log "no fit". Optional single line if welcome: "If that ever changes, I'm easy to find."
- **Routes:** p3-exit-respectful.
- **Fidelity:** `apohenia_addition`.

### 0.3 Inbound variant (a dealership submitted a form or replied to an email)

#### p0i-open: Inbound opener on the documented action

- **Say:** "Hey, hey, is this {prospect_name}? What's up, man, it's just Jason here with Apohenia. It looks like you {documented_action}, I think it was about possible help with how the website inquiries get followed up, who picks them up, all that. Is that, is that about right?"
- **Seeks:** Confirmation of the real action they took, or a correction.
- **Why now:** Andrés's opener construction, unchanged: identify, diminutive self-intro, the documented action hedged ("I think it was", "possible help like", "all that jazz"), confirmation check. The action is filled only from a real record (form, email reply, booked time); never invented.
- **Listen for:** "Yeah, I filled that out." "Oh, that was my internet manager" (redirect). "No idea what you mean" (do not proceed on a claimed action; fall back to the cold open).
- **If unclear → mirror:** "The form on our site, {documented_action}? Just checking I've got the right person."
- **Tone:** Casual, curious.
- **Then:** Confirmed: the stated reason and intent question. Redirect: gatekeeper route. Denied: cold open from who I am and why.
- **Routes:** confirmed: p0i-intent; redirect: p0-gatekeeper; denied: p0-who-why.
- **Fidelity:** `verbatim_adapted`. I01, I02. Source: "Man, it looks like you downloaded I think it was a training about possible help like losing some weight, getting in better shape, all that jazz. Is that is that about right?"

#### p0i-intent: Stated reason plus the intent question (inbound)

- **Say:** "Okay, easy, man. Well, just to see if it would even make sense for you, what was your intent behind, I guess, even like {documented_action} in the first place? Like what were you hoping to get out of it?"
- **Seeks:** A tangible: any goal in the future, in their words.
- **Why now:** The intent question with the source's low-stakes stated reason before it. The book-a-call preface ("just to see if it would even make sense for you, man") is used because Apohenia has no "more specific training" to send (see 0.4).
- **Listen for:** A future goal about the inquiries ("I want every one of them answered the same day"). A problem instead of a goal (that is an experience; record it). "Just looking" (mirror).
- **If unclear → mirror:** "Okay, and I don't want to assume anything, man. If this went the way you'd want it to six months from now, what would actually be different about how {dealership_name} handles website inquiries?"
- **Tone:** Curious and casual.
- **Then:** Goal stated: the experience question. Problem stated: record it as the experience and ask the goal once if needed.
- **Routes:** p1-intent-experience; problem stated: mark experience satisfied, p1-intent-tangible once, then p1-lc-process.
- **Fidelity:** `verbatim_adapted`. I03, I06. Source: "Well, just to see if it would even make sense for you, man. Like, what was your intent behind even like looking to possibly book that call?"

#### p0i-price-early: Inbound lead asks the price before discovery

- **Say:** "Fair question, and I'll get to exactly that. I'd rather not throw a number at you before I know whether it even fits your store, so give me a few minutes to understand how the inquiries are handled today and I'll walk you through what it would actually be. Is that alright?"
- **Seeks:** Permission to run discovery first, or an insistence.
- **Why now:** No source line covers an early price ask. The price is spoken only from an approved offer at the price node; while the price is null the screen shows the cue and the honest answer is that no price is set yet for their scope.
- **Listen for:** "Sure." "Just give me a ballpark" (do not; say plainly that no number exists yet and why).
- **If unclear → mirror:** "Straight answer: there's no number I can honestly give you before I know the scope. Can I ask you three or four questions first?"
- **Tone:** Casual, confident.
- **Then:** Alright: continue with intent. Insists: state that no approved price exists yet, offer the scope conversation, accept a no.
- **Routes:** p0i-intent; insists: p2-price-null then p3-exit-followup.
- **Fidelity:** `apohenia_addition`.

### 0.4 Excluded from Part 0 (study only)

- **x-support-team:** "I'm just with the customer support team." A false identity line in the webinar opener. Jason is the seller and implementer; the line would misrepresent his role.
- **x-training-to-send:** "Because I might be able to send you like a bit of a more specific training." The stated reason presumes a resource to send; Apohenia has none authored. Reinstatable as a true line only if a nurture resource is authored and approved.
- **x-benefit-coordinator:** "introduce yourself as you know their benefit coordinator or somebody that's that's been assigned to their particular file." Prospect speech in the reviewed call (data, not instruction); a misleading identity.
- **x-never-move-on:** "Never move on without getting the answer because all you're teaching the prospect subconsciously is this guy's low status." The two-part mirror is kept; the status rationale and the implied requirement to extract an answer are study only. Refusal is accepted after one mirror.

---

## Part 1: SETTING CALL (the cold call itself, from the confirmed relevance answer onward)

Andrés's recap of the setting call: "At the very beginning, we're getting a tangible and an experience. What is their goal in the future? What problem is causing that to be a goal? Then after that, we're getting their current process. What are they doing now? And then we're getting pain right next to it. So that they associate the two. And then from there, when they associate their process with their pain, it makes them more open to something new. And when they're more open to something new, that's when we go to the transition."

### 1.1 Intent: tangible, then experience

Definitions from the source. Tangible: "Any goal that they have in the future." Experience: "An experience is any problem in the past ... Is it in the past or present? Yes, because the present is also the past." The closer-only rule for which intent question to ask: "If it is an offer where somebody is doing something new ... that's something new. That's where you're going to ask the intent question ... if it's an offer where they're looking to improve something they already have, that's where you use this question". A dealership almost always already has an inquiry channel and some response practice, so the **default is the improvement form**; the new-activity form is reserved for a store that says it has nothing in place. Ask one, never both.

#### p1-intent-tangible: Tangible, improvement form (default for dealerships)

- **Say:** "Well, just to see if it would even make sense for you, man: what do you feel like you'd want different, in specific, about how those inquiries get handled? Like, is it more the speed of the first reply, or somebody actually owning each one, or being able to see what happened to them, like what for you? Or is it pretty dialed in?"
- **Seeks:** A future goal about the inquiries, in their words.
- **Why now:** The improvement-form intent question ("what do you feel like you need help with in specific then?") with the book-a-call preface and the option-list device from Andrés's mirror example ("is it more kind of have more energy or like feeling better, more confidence, like what for you?"). The options are the three pillar areas asked as questions, never as claims. "Or is it pretty dialed in?" makes an honest no easy.
- **Listen for:** A goal ("I want every one answered the same day", "one person owning it", "I want to see what happened without asking"). A problem instead of a goal ("they sit for hours"): that is the experience, record it. Ego or process description ("we're the best store in the county"): mirror. "It's dialed in": accept.
- **If unclear → mirror:** "No, no, sorry, that wasn't what I meant to ask. Maybe I wasn't being very clear. Can you give me more specifics on that? Like what in specific about how they're handled would you want tightened up, the speed of the first reply, somebody owning each one, seeing what happened to them, like what for you?"
- **Tone:** Curious and casual. Slow, spaced verbal cues while they answer.
- **Then:** Goal stated: the experience question with their noun plugged in. Problem stated: mark the experience satisfied, ask the goal once more only if needed ("and if that was fixed, what would you want it to look like?"), then logical certainty. Dialed in: accept and exit with the no-fit line. Nothing in place at all: the new-activity form.
- **Routes:** goal: p1-intent-experience; problem: p1-intent-check; dialed in: p0-no-fit; nothing in place: p1-intent-tangible-new.
- **Fidelity:** `verbatim_adapted`. I06, I03. Source: "what do you feel like you need help with in specific then? like in order to actually like make more commissions, make more sales, help more people, all that jazz."

#### p1-intent-tangible-new: Tangible, new-activity form (only if nothing is in place)

- **Say:** "Well, what's your intent of looking at, I guess, possibly even putting something in place for the website inquiries? Like what are you, I guess, looking to get out of it, just to see if I can help?"
- **Seeks:** A future goal, in their words.
- **Why now:** The new-activity intent question, used only when the store states it has no handling at all ("a business is looking to put systems in place that they've never had"). Never asked together with the improvement form.
- **Listen for:** "I want somebody to actually answer them." "I want to stop losing them."
- **If unclear → mirror:** "Okay, and I don't want to assume anything. If there was something in place six months from now, what would you want it to actually do for you?"
- **Tone:** Curious and casual.
- **Then:** Goal stated: the experience question.
- **Routes:** p1-intent-experience.
- **Fidelity:** `verbatim_adapted`. I07. Source: "what's your intent of looking at, I guess, possibly even starting an SMMA, like what are you, I guess, looking to get out of it just to see if I can".

#### p1-intent-experience: Experience

- **Say:** "What have you seen that I guess makes you feel like maybe the inquiries aren't getting {their_word} the way you'd like?"
- **Seeks:** A problem in the past or present, in their words.
- **Why now:** The experience question, verbatim construction, with their tangible noun plugged into X: "You just plug in whatever answer they give into the X." A stated goal is not an experience; a repeated goal triggers the mirror.
- **Listen for:** A concrete past or present problem ("found three from last week nobody answered", "a customer walked in and said nobody called back", "I can't tell you who has which lead without asking"). A repeated goal ("I just want them handled better"): mirror. A vague adjective ("it's messy"): the instance probe. A number without a problem ("we get about forty a month"): re-plug. "I don't actually have that problem": accepted, complete.
- **If unclear → mirror:** "No, no, sorry. That wasn't what I meant to ask. Maybe I wasn't being very clear. What I meant to ask is: you having every inquiry {their_word}, what would that, I guess, really allow the store to do that maybe it can't do now?"
- **Tone:** Curious and casual.
- **Then:** Problem stated: check and move on. Vague adjective: ask for one instance from the last couple of weeks, keep their adjective. No problem: accept and exit. Declines: accepted; continue to the process question if permission still stands.
- **Routes:** problem: p1-intent-check; adjective: p4-mirror-adjective then p1-intent-check; no problem: p0-no-fit; declined: p1-lc-process.
- **Fidelity:** `verbatim_adapted`. I04, mirror M02. Source: "What have you seen that I guess makes you feel like maybe you haven't been losing as much weight as you'd like?"

#### p1-intent-check: Check and move on

- **Say:** "Great. Gotcha."
- **Seeks:** Nothing. Internal check: one future goal in their words, one past or present problem in their words.
- **Why now:** "Again, problem in the past. That's an experience. Great. Check. We move on. So, that's the intent stage." Both nodes are marked evidence-satisfied. If the relevance answer already gave the current process, logical certainty starts at the duration question, never re-asking what is on record.
- **Listen for:** Not applicable.
- **If unclear → mirror:** None.
- **Tone:** Casual.
- **Then:** If the current process is already on record from the relevance answer: the duration question. Otherwise: the process question.
- **Routes:** process known: p1-lc-duration; otherwise: p1-lc-process.
- **Fidelity:** `verbatim_adapted`. I04. Source: "Great. Check. We move on."

### 1.2 Logical certainty: process, duration, origin, like, change, probe, duration, impact

The mechanism, in the source: "The whole point of logical certainty, what I'm trying to do is to get what is their current process and associate their process to the problem that they have ... If somebody understands, I have a problem and it's being caused by this thing that I'm doing ... you want to stop doing what you're doing. And if you stop doing what you're doing, what does it make you more open to? To a different way of doing things. And what ... do you think you're selling? A different way of doing things." Everything is industry-invariant except the impact question: "There's maybe one or two tweaks but everything else stays basically the exact same. The only question that becomes a little bit tricky ... is the impact question."

#### p1-lc-process: Current process (root cause, question one)

- **Say:** "So what are you doing now, in terms of like, I guess, how the website inquiries get handled, that you feel like isn't getting them {their_word}?"
- **Seeks:** The concrete current process: where an inquiry lands, who is notified, who responds, how fast, after hours, who owns it, how status is known.
- **Why now:** "So, I start by just going, well, what are you doing now in terms of like I guess your finished regime that you feel like isn't allowing you to lo, oh, I feel like I'm not losing weight, then that's what I'm going to plug into right here" (the transcript renders "fitness" as "finished"); the experience is plugged into the tail. If the relevance answer already gave this, do not ask it: mark it satisfied.
- **Listen for:** A real process ("it hits the shared inbox, the BDC checks it a few times a day, then it gets assigned by whoever's on"). Vague ("we handle it", "we've got a BDC"): drill down once. "I don't know how it's handled": accept, it is itself the visibility problem; note who would know.
- **If unclear → mirror:** "Just so I understand, just the structure of it: when one lands, who sees it first, how fast, and what happens after hours?"
- **Tone:** Curious and casual (the reviewed call: "just your structure").
- **Then:** Process stated: duration, then origin, back to back.
- **Routes:** p1-lc-duration.
- **Fidelity:** `verbatim_adapted`. L01, V04. Source: "What are you doing to get leads now? That I guess has you feeling like you're not really getting enough."

#### p1-lc-duration: Process duration (question two)

- **Say:** "And how long have you been doing it like that for?"
- **Seeks:** A duration of the process.
- **Why now:** "Then we immediately move into the second question. And how long have you been doing like that for, right?" Asked back to back with the origin question.
- **Listen for:** "Since we put the CRM in, four years." A career story instead of a duration (the reviewed call: "I'm just actually kind of transitioning over"): narrow the scope and re-ask.
- **If unclear → mirror:** "Okay. So how long has it been that way, as far as just the way inquiries get picked up?"
- **Tone:** Curious and casual.
- **Then:** Origin question, immediately.
- **Routes:** p1-lc-origin.
- **Fidelity:** `verbatim_adapted`. L02, V05. Source: "And how long have you been doing like that for, right?"

#### p1-lc-origin: Origin, the doubt question (question three)

- **Say:** "And what kind of caused you to, like, use that approach in the first place?"
- **Seeks:** Their reason for the current process ("it came with the CRM", "nobody decided", "the last internet manager set it up", "it's all I really knew").
- **Why now:** "This is what we call a doubt question. We're seeding doubt into what they're doing now. So, the tonality is extremely important." The prospect hears themselves say "Oh, I guess it's all I really knew." The doubt comes from the question and the pause, never from a rebuttal.
- **Listen for:** Any origin. A strong defence of the process: stay curious and move on; the change question later does the work.
- **If unclear → mirror:** "Like, why in that fashion? Was that a decision at some point, or just how it landed?"
- **Tone:** Curious shading toward skeptical; leave a full beat of silence after it. Then "Okay, fair enough, man."
- **Then:** Fair enough, then the satisfaction question.
- **Routes:** p1-lc-like.
- **Fidelity:** `verbatim_adapted`. L03, V06. Source: "And what kind of caused you to like like use that approach in the first place."

#### p1-lc-like: Satisfaction, bracketing the unmet result

- **Say:** "Okay, fair enough, man. And do you, do you like it? Like, I guess, besides obviously the inquiries not getting {their_word}, do you, I guess, like the way you've got it set up now though?"
- **Seeks:** A yes, a no, or a mixed answer about the current approach.
- **Why now:** "if the only thing we're ever talking about is problems and pain that they have, they're going to think, 'Oh, well, this guy's biased. He just wants me to buy.' ... But if we're also asking about what they do like and what's going good, they're like, 'Okay, he's unbiased.'" The "besides obviously" clause carves out the unmet result they already named.
- **Listen for:** "Yeah, it's fine." "Not really." "It's pretty good, it's not bad" (treat as yes). "I'm getting more comfortable with it" (treat as yes).
- **If unclear → mirror:** "Do you like it though? Like the process itself, separate from the results?"
- **Tone:** Casual-curious.
- **Then:** Yes or mixed: what do you like about it. No: ask once for one thing, accept "nothing".
- **Routes:** yes or mixed: p1-lc-like-what; no: p1-lc-like-no.
- **Fidelity:** `verbatim_adapted`. L04, V07. Source: "Okay, do do you do you like it? Like I I I I guess besides obviously not losing the weight necessarily, do you I guess like like that fitness regime you have in place like like now though".

#### p1-lc-like-what: Valued elements

- **Say:** "Oh, what do you like about it, like in specific?"
- **Seeks:** The elements they value ("it's simple", "the BDC knows the customers", "nobody's stepping on each other").
- **Why now:** What they like is what the offer must not break; it also earns the unbiased read. The reviewed call defers improvements explicitly: "What do you think is working? Like we can get to that kind of improvements."
- **Listen for:** One or two concrete positives.
- **If unclear → mirror:** "What do you think is working about it? We can get to the improvements in a second."
- **Tone:** Curious.
- **Then:** The change question.
- **Routes:** p1-lc-change.
- **Fidelity:** `verbatim_adapted`. L05, V07. Source: "Oh, what do you like about it like in specific?"

#### p1-lc-like-no: On a "no", ask once, accept "nothing"

- **Say:** "Fair enough. Is there anything about it that does work, even one thing? And if it's honestly nothing, that's an answer."
- **Seeks:** One valued element, or an accepted "nothing".
- **Why now:** The source forces a yes here ("Well, it can't be all terrible, like if you've been using it, you know what I mean? What do you like about it, man? Tell me one thing."). The purpose (ask about both sides so the seller is not biased) is kept; the forcing is not. Ask once at most.
- **Listen for:** "I guess it's simple." "Honestly, nothing."
- **If unclear → mirror:** None. One ask.
- **Tone:** Casual.
- **Then:** One thing named: the change question. Nothing: the change question with the skeptical clause dropped ("Okay. So what would you change first, if you could?").
- **Routes:** p1-lc-change.
- **Fidelity:** `apohenia_addition` (purpose of L05/L06; L06 excluded as forcing, see 1.4).

#### p1-lc-change: The change question (the skeptical pivot to the problem)

- **Say:** "Okay, it doesn't sound like it's going terrible then. I guess, is there anything you would change about either like the way the inquiries get picked up now, or like, I don't know, what actually happens to them after? Like, if you could though?"
- **Seeks:** A specific problem: a change to the process or to the result, in their words.
- **Why now:** "it's like, well, you've just told me all these things that are going good. Like why ... are we here? That's the tonality ... all I'm doing is I'm sounding a little bit skeptical to make them naturally come to our rescue and be like, 'No, no, it's because I have this problem.'" Two objects are offered (the process or the result) and the line ends on "if you could though".
- **Listen for:** A concrete change ("I'd want them answered the same day", "one person should own it", "I'd want to see who has what"). A label only ("speed", "accountability", "follow-up"): probe. "Nothing": reflect the earlier experience once, then accept.
- **If unclear → mirror:** "What is it in particular about, like, maybe the current setup, or the results you're getting from it, that you'd want to change though?"
- **Tone:** A little skeptical (lean back, scrunch the brows).
- **Then:** Problem stated: probe until concrete. Label only: probe. Nothing: "Fair enough, earlier you mentioned {stated_problem}; is that not something you'd change?" then accept whatever comes.
- **Routes:** p1-lc-probe; nothing: reflect once, then p1-lc-problem-duration if a problem exists, else p0-no-fit.
- **Fidelity:** `verbatim_adapted`. L07, V08. Source: "Okay, it doesn't sound like it's terrible then. I guess is there is there anything you would change about either like the the the fitness regime you have in place now or like ... if you if you could though".

#### p1-lc-probe: Probe until concrete

- **Say:** "What do you mean by that? Like, describe that for me."
- **Seeks:** The problem made concrete: an instance, a count, a definition of their label.
- **Why now:** "Immediately we probe to make the problem seem bigger. What do you mean by that? How do you mean meaning? And now they're going to give us more information." The reviewed call reaches for an instance: "give me an example of like an instance where you may have".
- **Listen for:** An instance ("last Tuesday one sat till Thursday"). A count ("probably a third of them never get a call"). Still a label: one more probe for an instance, then accept.
- **If unclear → mirror:** "Give me an example of like an instance where that happened, like one from the last couple weeks."
- **Tone:** A mix of skeptical and curious.
- **Then:** Concrete: optionally label it, then the problem duration. If they volunteered a number, keep it for the impact.
- **Routes:** p1-lc-label (optional) then p1-lc-problem-duration.
- **Fidelity:** `verbatim_adapted`. L08, L09, V14. Source: "What do you mean by that? How do you mean meaning?" and "And how do you mean by that? Like describe that for me."

#### p1-lc-label: Label the problem (optional; seller-proposed, prospect-confirmed)

- **Say:** "Okay. So, ownership."
- **Seeks:** Their confirmation or correction of a one- or two-word name for the problem.
- **Why now:** "Labels are extremely important because it makes it a lot easier to ask sharper questions in the future ... 'You feeling like you don't have that efficiency because you just labeled it as efficiency. Does that have an impact?' ... the rule of thumb is labels have meaning." The label is recorded with its provenance: prospect said, or seller proposed and prospect confirmed.
- **Listen for:** "Yeah, ownership." Or a correction ("more like speed"): take theirs.
- **If unclear → mirror:** "Is that the word for it, or would you call it something else?"
- **Tone:** Casual.
- **Then:** Reuse their label in the impact question. Then the problem duration.
- **Routes:** p1-lc-problem-duration.
- **Fidelity:** `verbatim_adapted`. V25. Source: "Okay. So efficiency. >> Efficiency. Yeah."

#### p1-lc-problem-duration: Duration of the problem (distinct from process duration)

- **Say:** "And how long has that been going on for, to where like {stated_problem}?"
- **Seeks:** How long the problem has existed.
- **Why now:** "Then we go, and how long has that been going on for ... Oh well, man ... probably the last three years. Three years, man." Extending a problem over time makes it bigger in the prospect's mind. Echo the number back.
- **Listen for:** A duration. "Since we opened." "Since the last internet manager left."
- **If unclear → mirror:** "Roughly. Months? Years?"
- **Tone:** Curious. Echo the number: "{problem_duration}, man."
- **Then:** The impact question.
- **Routes:** p1-lc-impact.
- **Fidelity:** `verbatim_adapted`. L10. Source: "and how long has that been going on for to like you feel like you're not really losing any weight?"

#### p1-lc-impact: Impact (the B2B form)

- **Say:** "And without assuming anything, like, because I want to help you with that: you having {stated_problem} for the past {problem_duration}, even though you've got {current_process} in place and everything else, how has that actually had an impact, I guess, on like the floor, or on {dealership_name}'s ability to keep growing?"
- **Seeks:** The downstream cost, stated by the prospect: operational, economic, or personal.
- **Why now:** "The only question that becomes a little bit tricky ... is the impact question." The B2B form: "And without assuming anything again because like I I want to help you with that. You only getting these three leads a month to where we're limited. How is that actually had an impact I guess on your ability to like hire a crew and keep expanding?" Preface, restated problem, duration, their effort, then the impact object.
- **Listen for:** Operational ("the floor's slow midweek and we're sitting on leads"), economic ("we're paying for the leads and a chunk never get touched"), personal ("I end up chasing them myself"). A bare "yeah": ask how so. Keep three kinds separate in the record: a verified count, an estimate, a feeling.
- **If unclear → mirror:** "Has that had like an impact, I guess, on your day to day in any way?"
- **Tone:** Concern (lean in, raise the eyebrows).
- **Then:** Impact stated: the setter transition. Bare yes: how so. Good-to-great prospect who resists the soft question: the counting alternative.
- **Routes:** p1-st-zoom; bare yes: p1-lc-impact-howso; resistance: p1-lc-count.
- **Fidelity:** `verbatim_adapted`. L12, L11, L13. Source: "How is that actually had an impact I guess on your ability to like hire a crew and keep expanding?"

#### p1-lc-impact-howso: After a bare yes

- **Say:** "Well, how so, just so I understand?"
- **Seeks:** The specific impact behind the yes.
- **Why now:** "they're like well yeah of course well how so just so I understand oh I mean I can't go on vacations man". A yes is not an impact.
- **Listen for:** A concrete effect.
- **If unclear → mirror:** "Like where does it actually show up for you?"
- **Tone:** Curious-concern.
- **Then:** The setter transition.
- **Routes:** p1-st-zoom.
- **Fidelity:** `verbatim_adapted`. L14. Source: "well how so just so I understand".

#### p1-lc-count: The quantifying alternative (good-to-great prospects)

- **Say:** "In the past month, man, roughly how many inquiries came through the site? And how many of those turned into an appointment, do you think? And when you say a handful, like two, five, ten, how many?"
- **Seeks:** A count of inquiries, a count of outcomes, and their own estimate of what could have converted with the problem fixed.
- **Why now:** "stop thinking in terms of just words. Start thinking in terms of principles ... if you could quantify how much money they're losing out on because their question isn't good ... Is that an impact ... Absolutely." And: "There's two types of pain. There's the pain of I have this problem ... And then there's a pain that is missing opportunity." Used when the prospect is doing well and resists the soft impact question. Every number is theirs; the estimate is recorded as an estimate, never as a fact or a projection.
- **Listen for:** Counts ("about forty came in, maybe eight set"). "A handful": the exactness mirror. Their estimate ("probably double if somebody actually called them back the same day"). No numbers: accept and use the soft impact answer.
- **If unclear → mirror:** "Ballpark's fine. More like ten, or more like fifty?"
- **Tone:** Curious, then skeptical on the count, never deflating.
- **Then:** Optionally "and roughly what's an appointment worth to the store?" only if they volunteer it; then the setter transition.
- **Routes:** p1-st-zoom.
- **Fidelity:** `verbatim_adapted`. V09, V10, V11, V17. Source: "In the past month, man, how many people have you spoken ... And how many sales did you get past month? ... What was that mean? Like two, five, 10. How many?"

### 1.3 Setter transition: six-month target, gap, conditional willingness, permission, booking

The moment, in the source: "A prospect has just told you, this is what I'm doing. It is causing all these problems. So, now what's going through their mind is, well ... I can't do this anymore. I need something new ... that's the exact moment we go in for the transition." The source works only the money-offer version ("in terms of like income, for example") and names a non-money version without working it ("I'm going to show you guys how to do it for non-money offers like fitness"; it does not). Apohenia's metric is operational, so the same construction is used with the metric swapped.

#### p1-st-zoom: Six-month target

- **Say:** "Okay, so let's zoom out for a second, man. In an ideal world, where do you want to be in six months in terms of like how the website inquiries get handled, for example?"
- **Seeks:** A target state with a horizon, in their words ("every one answered within the hour with a name on it").
- **Why now:** "We're going to start off by just going, okay, so let's zoom out for a second, man. In an ideal world, where do you want to be in six months in terms of like income, for example?" The reviewed call adds: "when you put a time frame on something, it goes from being a dream to being a goal."
- **Listen for:** A target with detail. Vague ("better"): make it real with one probe ("what would that actually look like on a Tuesday?").
- **If unclear → mirror:** "If it was working the way you'd want by, say, March, what would be true that isn't true now?"
- **Tone:** Curious, upward.
- **Then:** The gap.
- **Routes:** p1-st-gap.
- **Fidelity:** `verbatim_adapted`. S01, V32. Source: "In an ideal world, where do you want to be in six months in terms of like income, for example?"

#### p1-st-gap: Baseline gap

- **Say:** "Okay. How far are you from that now?"
- **Seeks:** The baseline against the target, in their words.
- **Why now:** "Okay, how far are you from that now? Oh, well, I'm at 5K a month. Great. So, now we know their income. Now, we know if they're qualified to buy." For Apohenia the gap is operational (how far the current handling is from the target), and any qualification signal is about scope and authority, not wealth.
- **Listen for:** "Pretty far." "Honestly, nobody's timing it." A number if they have one.
- **If unclear → mirror:** "Pretty far meaning what? Like halfway, or not started?"
- **Tone:** Curious, downward.
- **Then:** Normally: permission to book. On a low signal (no authority, no budget, unclear whether they would change anything): the conditional willingness question first.
- **Routes:** p1-st-permission; low signal: p1-st-willing.
- **Fidelity:** `verbatim_adapted`. S02, V20. Source: "Okay, how far are you from that now?"

#### p1-st-willing: Conditional theoretical willingness (only on a low signal)

- **Say:** "Okay, well, sweet. Let's say there was a way to kind of possibly help you get from like where it is now to like that six-month picture. Would you actually be willing to invest in that, if that's what it took?"
- **Seeks:** A theoretical yes, a no, or a condition.
- **Why now:** "if they give a number that is too small to where in your mind you're like, they're probably not qualified ... you need to get a willingness to spend money ... notice I'm making it very theoretical. It's not like, 'Do you want to invest?' That triggers a lot of resistance." No price is implied; no number is spoken.
- **Listen for:** "If it worked, yeah." "That'd be the owner's call" (route decision roles into the booking). "No."
- **If unclear → mirror:** "Not asking for a number, man. Just: is that something the store would put money behind, if it did what you described?"
- **Tone:** Casual, hypothetical, "in the ether".
- **Then:** Yes or conditional: permission to book (name the decision maker in the booking). No: accept, the respectful exit with an agreed follow-up if welcome.
- **Routes:** p1-st-permission; no: p3-exit-respectful.
- **Fidelity:** `verbatim_adapted`. S03. Source: "Let's say there was a way to kind of possibly help you in kind of acquiring the right skills ... Like, would you actually be willing to invest in yourself if that's what it took?"

#### p1-st-permission: Permission to book the deeper call

- **Say:** "Okay, well, based on what I've heard, man, obviously you mentioning like {stated_problem}, and because of that {stated_impact}, I feel like there might be a possibility of being able to help you with getting to {target_metric}. What I could do from here is set up a proper call where I could dive a lot deeper into where you're at now versus where you really want to be, besides just {target_metric}. And then if it looks like we could actually help, I'd walk you through what that would look like for {dealership_name}. How does that sound?"
- **Seeks:** A yes to a booked deeper call, or a no.
- **Why now:** "based on what I've heard, man, obviously you mentioning like you're not really making enough money ... I feel like there might be a possibility of being able to help you ... What I could do from here, man, is I could connect you with John and he could kind of dive a lot deeper into like where you're at now versus kind of like where you really want to be ... How does that sound?" Jason is his own closer, so "connect you with John" becomes "set up a proper call". "Might be a possibility" is kept because it is true and claims nothing.
- **Listen for:** "Sure." "Send me something first" (offer the call once more, then accept). "No."
- **If unclear → mirror:** "Would that be awful?" (optional source register) or: "Thirty minutes, you pick the slot, and if it's not a fit I'll say so on the call. Fair?"
- **Tone:** Casual, confident.
- **Then:** Yes: book it and name the roles. No: accept, agree a follow-up if welcome.
- **Routes:** yes: p1-st-book; no: p3-exit-respectful.
- **Fidelity:** `verbatim_adapted`. S04. Source: "What I could do from here, man, is I could connect you with John and he could kind of dive a lot deeper ... How does that sound?"

#### p1-st-awful: Negative-form check (optional register)

- **Say:** "How does that sound? Would that be awful?"
- **Seeks:** A yes to the booking.
- **Why now:** The source's negative-form check; classified adapt in the bank. Optional register Jason may prefer; not required.
- **Listen for:** "No, that'd be great."
- **If unclear → mirror:** None.
- **Tone:** Casual, light.
- **Then:** Book.
- **Routes:** p1-st-book.
- **Fidelity:** `verbatim_adapted`. S05, S04. Source: "How does that sound? would that be awful?"

#### p1-st-book: Booking and decision roles

- **Say:** "Perfect. What works better for you, later this week or early next? And who else should be on it, so we're not doing it twice: is that the GM, the dealer principal, or whoever runs the internet side?"
- **Seeks:** A date and time, and the names or roles of the economic decision maker and the operational owner.
- **Why now:** "And they always go, 'Yes ... Book me in.' And then from there, you just obviously go to the calendar." The offer's decision roles (economic decision, operational owner, access grantor) are named now so the closing call has the right people.
- **Listen for:** A slot. Names. "Just me" (fine; note who else would be involved later).
- **If unclear → mirror:** "Even a rough window's fine, and I'll send a confirmation. Who should I put on it besides you?"
- **Tone:** Casual.
- **Then:** Write the setter notes. End warmly.
- **Routes:** p1-st-notes.
- **Fidelity:** `apohenia_addition` (booking mechanics; decision roles from the offer).

#### p1-st-notes: Setter notes (written, not spoken)

- **Say:** (not spoken) Record: goal in their words, problem in their words, impact in their words, current process, both durations, valued elements, label with provenance, target and gap, who is booked, and anything declined.
- **Seeks:** A complete note for the closing-call recap.
- **Why now:** "If the setter did not leave you notes ... fire him." Jason is his own setter, so the note is written before the call ends; the closing call opens by recapping it.
- **Listen for:** Not applicable.
- **If unclear → mirror:** None.
- **Tone:** Not applicable.
- **Then:** End of the setting call.
- **Routes:** p2-entry-connect (at the booked time).
- **Fidelity:** `apohenia_addition` (purpose from the closer entry I08).

### 1.4 Excluded from Part 1 (study only)

- **x-forced-positive:** "Well, it can't be all terrible, like if you've been using it, you know what I mean? What do you like about it, man? Tell me one thing. We're going to force them down the yes." L06 is study only. Production asks once and accepts "nothing".
- **x-only-five:** "Only five? Why? Why so low? Remember, skeptical tonality ... you'll watch them deflate because you're changing their expectations of what's good or bad." D02 study only. A stated inquiry volume is recorded, never challenged.
- **x-million-week:** "I'll just go a million a week. Jesus, man, you guys are crushing it. And now what is he going to do? Correct me." D01 study only. Deliberate false restatement; never used.
- **x-average-person:** "rather than just, I don't know, like doubling on the referrals, just hoping it grows the business like the average person." The contrast clause asserts something about other people; Jason has no observation basis for "like most stores". Dropped from the rationale line (2.2), the question is kept.

---

## Part 2: CLOSING CALL (the booked deeper call)

The source's closer has two situations: a lead booked straight from a funnel (run the whole script from intent) or a setter already ran intent and logical certainty (start at emotional certainty from the notes). Jason's booked call is the second case: the cold call produced the notes. If the notes are missing or disputed, route to the missing question rather than re-running everything.

### 2.1 Entry

#### p2-entry-connect: Connection check and casual open

- **Say:** "Hey, hey, {prospect_name}, can you hear me? Can you see me? What's up, man, how's it going?"
- **Seeks:** A working line and a casual exchange.
- **Why now:** "you're not just gonna ... hop on second five on the Zoom and just so I see your point. No, no, don't do that ... Hey, hey, John, can you can you hear me? can you see me? ... What's up, buddy? How's it going? Again, very, very casual." On an audio-only call drop "can you see me".
- **Listen for:** "Yeah, all good."
- **If unclear → mirror:** "You're cutting out a bit on my end. Say that again?"
- **Tone:** Very casual.
- **Then:** "Cool, man. Well, let's get right into it." Then the recap.
- **Routes:** p2-entry-recap.
- **Fidelity:** `verbatim_adapted`. I05. Source: "Hey, hey, John, can you can you hear me? can you see me? ... What's up, buddy? How's it going?"

#### p2-entry-recap: Recap of the setting notes, "is that about right?"

- **Say:** "Cool, man. Well, let's get right into it. I've got my notes here from when we spoke. You mentioned you were looking to get to {stated_goal}, because I think you mentioned {stated_problem}, and it was kind of {stated_impact}. Is that, is that about right?"
- **Seeks:** A yes, or a correction.
- **Why now:** "I have some notes here from John. I know my colleague obviously you spoke to earlier. He mentioned that you were looking to get better in terms of your diet because I think you mentioned you felt like you weren't losing as much weight as you'd like and it was kind of like draining you a little bit ... Is that is that about right? ... just a short summary of the notes that the setter left you." Intent is not repeated when the notes hold a goal, a problem and an impact.
- **Listen for:** "Yeah, that's it." A correction: take it as the new fact and confirm. "Actually, since we spoke it's changed": that is a changed circumstance; note it.
- **If unclear → mirror:** "Let me put it in your words then. What's the thing you'd most want different about the inquiries, as of today?"
- **Tone:** Casual-curious.
- **Then:** Confirmed: the rationale question. Notes missing or disputed: the evidence check.
- **Routes:** p2-rationale; missing: p2-entry-missing.
- **Fidelity:** `verbatim_adapted`. I08. Source: "I have some notes here from John ... Is that is that about right?"

#### p2-entry-missing: Notes missing or disputed (evidence check)

- **Say:** "Okay, then let me get it right from you, so nothing's lost in translation. What would you want different about how the website inquiries get handled?"
- **Seeks:** Whichever of goal, problem or impact is missing.
- **Why now:** The reviewed call opens exactly this way: "I told it fairly brief because I want to get it right from you. Like nothing got lost translation." Only the missing pieces are asked; nothing on record is asked twice.
- **Listen for:** A goal, then a problem; then the impact if not on record.
- **If unclear → mirror:** "Do you know what type of help, in specific, you'd be after for that?"
- **Tone:** Curious.
- **Then:** Fill the missing node, then the rationale question.
- **Routes:** p1-intent-tangible or p1-intent-experience or p1-lc-impact as needed, then p2-rationale.
- **Fidelity:** `verbatim_adapted`. V01, V02. Source: "I want to get it right from you. Like nothing got lost translation ... How can I help you?"

### 2.2 Rationale and the pre-handling decision tree

"The point of the rationale question is to pre-handle the objection of, oh, I'm just going to do it myself." Then: "in any sales call, the most common objection a prospect is going to give you is the same objection they gave in the past that prevented them from getting the help they needed ... it's a lot easier to pre-anle that objection before I pitch them to pay me 10 grand than it is me pitching them ... and then trying to overcome their concerns."

#### p2-rationale: Rationale question

- **Say:** "Okay, and just so I see kind of your point of view, man: besides obviously the inquiries not getting {their_word}, what's the main reasoning of even looking at, I guess, like something more structured for them, rather than just, I don't know, like doubling down on what you've been doing, like {current_process}? Like, why not just do that?"
- **Seeks:** Their own reason for wanting a different way, rather than more of the current one.
- **Why now:** "now they have to justify to me, oh well, I can't do that because I've been doing it for a long time and it's not working. So clearly I got to change something. So now they're selling me on why they need to change it up." The reviewed call's version ends with the label: "Why get more skills rather than sprint people you speak with? ... Okay. So efficiency."
- **Listen for:** "Because we've tried telling them to answer faster and it lasts a week." "Because I can't watch it myself." "Honestly, doubling down might be fine" (accept; that is a real answer and the fit question later decides).
- **If unclear → mirror:** "Like, what's the main reason you're looking at something different rather than just having the BDC push harder?"
- **Tone:** Curious-skeptical; the second option is said flatly, not mocked.
- **Then:** Reason given (optionally label it): the first binary.
- **Routes:** p2-ph-looked.
- **Fidelity:** `verbatim_adapted`. E01, V24, V25. Source: "besides obviously like not getting the amount of leads you'd like to, what's the main reasoning of even looking at I guess like a more advanced system for getting those leads rather than just, I don't know, like doubling on the referrals ... Like why not just do that?" The "like the average person" clause is dropped (1.4).

#### p2-ph-looked: Binary one, looked before?

- **Say:** "Okay, and in regards to that, like before you and I were speaking, were you out there looking for other ways to, I guess, get the inquiries handled, like a service, a tool, somebody in-house, or like what were you actually doing about that?"
- **Seeks:** No, I was not looking. Or: yes, I was.
- **Why now:** "we just go okay and in regards to that like before you and I were speaking were you out there looking for other ways to I guess like get more of like that advanced training ... or like what were you actually doing about that and this is going to give us a decision-making tree."
- **Listen for:** "Not really." "Yeah, we looked at a couple of things." "The CRM has an auto-reply" (a provider is in place: the Apohenia branch). "That's above me" (no authority: the Apohenia branch).
- **If unclear → mirror:** "Company stuff aside, did you yourself go looking at anything for it, or not really?"
- **Tone:** Curious.
- **Then:** No: what prevented you. Yes: did you move forward. Provider in place: what is it not doing. No authority: the authority branch. No problem: the no-problem branch. Declined: accept.
- **Routes:** no: p2-ph-prevented; yes: p2-ph-moved; provider: p2-ph-still-active; authority: p2-ph-no-authority; no problem: p2-ph-no-problem; declined: p2-ph-declined.
- **Fidelity:** `verbatim_adapted`. E02, V28. Source: "before you and I were speaking were you out there looking for other ways to I guess like get more of like that advanced training ... or like what were you actually doing about that".

#### p2-ph-prevented: What prevented you?

- **Say:** "What prevented you, man? Why not?"
- **Seeks:** The objection they would otherwise give at the end: money, time, partner, a bad prior result, or a valid reason.
- **Why now:** "I go what prevented you man? Why not? And they're like oh well it was too expensive. Oh well I didn't have the time. Oh well my partner said no. Here's where they ... give you the objections that they would have given you at the end." A valid reason (the reviewed call: "just got back into sales about six months ago") is accepted as valid; then ask the ideal criteria instead of pushing.
- **Listen for:** "Cost." "Never got round to it." "The owner didn't want another vendor." "We only just got the website" (valid).
- **If unclear → mirror:** "Like what in the past got in the way of actually doing something about it?"
- **Tone:** Curious-skeptical.
- **Then:** Barrier named: what shifted. Valid reason: the ideal criteria.
- **Routes:** barrier: p2-ph-shifted; valid: p2-ph-criteria.
- **Fidelity:** `verbatim_adapted`. E03. Source: "what prevented you man? Why not?"

#### p2-ph-shifted: What shifted now?

- **Say:** "Well, out of curiosity, like what shifted for you now then? Like obviously if {barrier} was what was preventing you in the past, like what kind of changed now that actually has you open to looking at it?"
- **Seeks:** The changed circumstance that dissolves the old barrier, in their words.
- **Why now:** "What did we just do? We just pre- that objection. Before it was an issue because of this and this and that. Now it's not an issue. And now they've told us that so they can't give us the objection again at the end." Tonality shifts here: "we need to be a little bit more challenging, a little bit more skeptical to once again make them come to our rescue."
- **Listen for:** "We've got budget this quarter." "The owner asked me to fix it." "Nothing's changed, honestly" (accept; note that the barrier may still stand).
- **If unclear → mirror:** "Like, if cost stopped it before, what's different about cost now?"
- **Tone:** A little skeptical, challenging.
- **Then:** Shift stated: permission to offer a perspective (or straight to the positive future). Nothing changed: note it and continue; the barrier is handled honestly at the price.
- **Routes:** p2-bolt-permission or p2-future.
- **Fidelity:** `verbatim_adapted`. E04. Source: "what shifted for you now then? Like obviously if the money was what was preventing you in the past, like what kind of change now that actually has you open to like looking for more of like that advanced training".

#### p2-ph-moved: Binary two, moved forward with anything?

- **Say:** "Okay, did you actually, like, move forward with anything? Or like, what actually ended up happening?"
- **Seeks:** No, I did not move forward. Or: yes, I did.
- **Why now:** "If they said yes, I was looking. Now we ask another question. We have another binary ... did you actually like like move forward with anything or like what actually ended up happening?"
- **Listen for:** "We got a quote and left it." "We tried a texting tool for a few months."
- **If unclear → mirror:** "Did anything actually get put in place, or did it stop at looking?"
- **Tone:** Curious.
- **Then:** No: what prevented you. Yes: good result or bad.
- **Routes:** no: p2-ph-prevented; yes: p2-ph-result.
- **Fidelity:** `verbatim_adapted`. E05. Source: "did you actually like like move forward with anything or like what actually ended up happening?"

#### p2-ph-result: Binary three, good result or bad?

- **Say:** "Okay, did you get like a good result or a bad result?"
- **Seeks:** Good, bad, or mixed.
- **Why now:** "If somebody got a bad result last time ... what is going to be their fear ... this time? ... What's preventing me from getting a bad result this time, too? ... That's a value objection." And for good: "I got a good result last time. Why do I even need you guys?"
- **Listen for:** "It was a mess." "It worked, but." "Mixed."
- **If unclear → mirror:** "How did that work out? What type of results did you get with it?"
- **Tone:** Curious.
- **Then:** Bad: the ideal criteria. Good: the remaining bottleneck. Mixed: the criteria for the bad part, the bottleneck for the good part, in that order.
- **Routes:** bad: p2-ph-criteria; good: p2-ph-bottleneck; mixed: p2-ph-criteria then p2-ph-bottleneck.
- **Fidelity:** `verbatim_adapted`. E06, V27. Source: "did you get like a like a good result or a bad result?"

#### p2-ph-criteria: Ideal criteria (after a bad result or a valid reason)

- **Say:** "Well, out of curiosity, man, what would you need to see in something this time to be able to be like, okay, I actually feel like this could work for us, even though last time obviously it didn't?"
- **Seeks:** Two or three criteria in their words ("someone who actually answers", "a status I can see", "no new app for the team").
- **Why now:** "we need some kind of criteria of what would make them feel like we're different than those other people because then ... as soon as we get to the pitch later on ... We're just going to plug in whatever answers they gave us here straight into the pitch." Their criteria are plugged into the pillar lines only where a deliverable genuinely meets them; a criterion the offer cannot meet is said plainly at the fit question.
- **Listen for:** Concrete criteria. "I don't know": one probe ("what went wrong last time that you'd want not to happen again?").
- **If unclear → mirror:** "Like what went wrong last time that you'd want to see handled differently this time?"
- **Tone:** Curious.
- **Then:** Optionally "why is that important to you now?" to make them defend it (the reviewed call). Then the perspective or the positive future.
- **Routes:** p2-bolt-permission or p2-future.
- **Fidelity:** `verbatim_adapted`. E07, V29, V31. Source: "what would you need to see in something this time to be able to be like, oh, I actually feel like they could get me results even though last time obviously you didn't."

#### p2-ph-bottleneck: Remaining bottleneck (after a good result)

- **Say:** "Well, I mean, out of curiosity, man, like if you got a good result last time, what even has you looking at, I guess, something more this time?"
- **Seeks:** The remaining gap, in their words.
- **Why now:** "Oh, well, I feel like we hit a bottleneck. I feel like I don't know if we're going to hit my goals if I just stick with them and I don't move on to anything new. Great. What did we just do? We pre-handled that objection."
- **Listen for:** "It handled the reply but nobody owned it after." "We can't see anything."
- **If unclear → mirror:** "What's it not doing, that you'd want done?"
- **Tone:** Curious.
- **Then:** The perspective or the positive future.
- **Routes:** p2-bolt-permission or p2-future.
- **Fidelity:** `verbatim_adapted`. E08. Source: "if you got a good result last time, what even has you looking for, I guess, possible more advanced training this time?"

#### p2-ph-still-active: Apohenia branch, a provider is still in place

- **Say:** "Okay, so the auto-reply's doing the first part. What's it not doing, that you'd want done?"
- **Seeks:** What the existing tool or vendor leaves undone, in their words.
- **Why now:** No source branch covers a still-active provider. The offer routes through the channel the dealership already uses, so an existing auto-responder is a fact to build on, not to disparage.
- **Listen for:** "It sends a canned email and that's it." "Nobody picks it up after."
- **If unclear → mirror:** "After the auto-reply goes out, what happens to the inquiry?"
- **Tone:** Curious.
- **Then:** The bottleneck question, then onward.
- **Routes:** p2-ph-bottleneck.
- **Fidelity:** `apohenia_addition`.

#### p2-ph-no-authority: Apohenia branch, no authority or budget

- **Say:** "Fair enough. Who would actually make that call at {dealership_name}, and would it make sense for them to be on the next conversation with us?"
- **Seeks:** The economic decision maker and a yes or no on including them.
- **Why now:** The offer's decision roles separate the economic decision from the operational owner. No frame is applied to a person who genuinely does not hold the decision.
- **Listen for:** "That'd be the GM." "I'd rather bring it to him myself."
- **If unclear → mirror:** "If you liked it, whose yes would it need?"
- **Tone:** Casual.
- **Then:** Continue discovery with this person as the operational owner; book the decision maker into the next call, or agree to a follow-up.
- **Routes:** continue: p2-future; book: p1-st-book.
- **Fidelity:** `apohenia_addition`.

#### p2-ph-no-problem: Apohenia branch, no actual problem

- **Say:** "Okay. Then it sounds like this isn't something you need, and I'd rather say that than talk you into it."
- **Seeks:** Nothing.
- **Why now:** "I don't have that problem" is a complete answer. No reframe.
- **Listen for:** Not applicable.
- **If unclear → mirror:** None.
- **Tone:** Casual, warm.
- **Then:** The respectful exit.
- **Routes:** p3-exit-respectful.
- **Fidelity:** `apohenia_addition`.

#### p2-ph-declined: Apohenia branch, unknown or declined

- **Say:** "No problem. We'll leave that one."
- **Seeks:** Nothing.
- **Why now:** Refusal is accepted; the tree continues without the answer and nothing is pre-handled that the prospect did not supply.
- **Listen for:** Not applicable.
- **If unclear → mirror:** None.
- **Tone:** Casual.
- **Then:** The positive future.
- **Routes:** p2-future.
- **Fidelity:** `apohenia_addition`.

### 2.3 Optional analogy, positive future, consequence

The emotion graph, in the source: "in intent logical certainty we're getting them a little bit negative ... Then we go into emotional certainty. Now we're getting them on this high ... Then immediately after that, if I want to create the most urgency ... I got to drop all the way to the most negative ... you want this high to be as close to the lowest of lows as possible. You don't want this gap right here to take you 15 minutes." Two or three specifics on each side, probed until vivid: "The key is they are never going to give it to you as soon as you ask this question. You're going to have to probe to build this visualization."

#### p2-bolt-permission: Permission to offer a perspective

- **Say:** "Well, can I offer you a perspective, man?"
- **Seeks:** A yes.
- **Why now:** "This isn't required on every single call, but especially if you're starting out ... you're going to want to use this ... Well, can I offer you a perspective, man?"
- **Listen for:** "Sure."
- **If unclear → mirror:** None.
- **Tone:** Casual.
- **Then:** The analogy, or skip straight to the positive future.
- **Routes:** p2-bolt; skip: p2-future.
- **Fidelity:** `verbatim_adapted`. F01. Source: "Well, can I offer you a perspective, man?"

#### p2-bolt: The Usain Bolt analogy (optional; never auto-recommended)

- **Say:** "Have you heard the Usain Bolt analogy? If you take Usain Bolt, right, obviously the fastest man in the world, and you put him on a starting line and tell him to run a hundred meters, he's going to run fast. Now you put a lion behind him, chasing him down the whole time, he runs even faster. Because the most successful people have a strong pull toward what they want to achieve, but they also have a strong enough consequence to failure to push them to actually achieve it."
- **Seeks:** Nothing; a nod.
- **Why now:** "Now, I've gotten them to understand the value of having a strong pull and a strong consequence to failure because I'm about to ask them what is their pull and what is the consequence to failure." The analogy introduces no claim about the offer. F02 is classified study only in the bank, so this node is opt-in for Jason and never auto-recommended (classification conflict, Part 5).
- **Listen for:** "Makes sense."
- **If unclear → mirror:** None.
- **Tone:** Casual, upward.
- **Then:** The positive future.
- **Routes:** p2-future.
- **Fidelity:** `verbatim_adapted`. F02 (classification conflict). Source: "Have you heard the Usain Bull analogy? ... he's run even faster because the most successful people in the world, they have a strong pull ... but they also have a strong enough consequence to failure".

#### p2-future: Positive future pace (the business first)

- **Say:** "Let's say there was a way of possibly helping you with actually getting every inquiry {their_word}, that way {stated_problem} isn't a thing anymore. What would tangibly be like, like different for {dealership_name} at that point?"
- **Seeks:** Two or three specific, vivid things that would be different for the business, in their words.
- **Why now:** "we want them to be drawn in and to feel this pull ... Now, we need two to three of these." The B2B form: "Let's say there was a way of possibly helping you with actually like getting to those 50 leads a month ... What would tangibly be like different for the business at that point?"
- **Listen for:** Specifics ("the floor would have appointments on a Tuesday", "I'd stop hearing 'nobody called me back'"). A repeated goal ("the inquiries would be handled"): mirror.
- **If unclear → mirror:** "No, sorry man, I don't think I was clear. What I meant to ask is: {dealership_name} actually having every inquiry {their_word}, how would that impact, I guess, like other parts of the store, just to see if I could even help?"
- **Tone:** Curious with upward inflection.
- **Then:** Probe their word, where it shows up, who notices, the effect on growth, then make it personal for the owner or GM.
- **Routes:** p2-future-meaning, p2-future-where, p2-future-who, p2-future-growth, p2-future-owner (any order, two or three probes).
- **Fidelity:** `verbatim_adapted`. F03, F10, mirror M03. Source: "Let's say there was a way of possibly helping you with actually like getting to those 50 leads a month, those higher quality leads. What would tangibly be like different for the business at that point?"

#### p2-future-meaning: Probe their word

- **Say:** "Well, how do you mean by {their_word}?"
- **Seeks:** The meaning of the word they used, from them.
- **Why now:** "'Oh man, I'll just finally feel free in my body.' And I could go, 'Well, how do you mean by free?'" Pick one word they said and probe it; never substitute a synonym.
- **Listen for:** Their definition.
- **If unclear → mirror:** "{their_word}, meaning what for you?"
- **Tone:** Curious, upward.
- **Then:** Next probe or make it personal.
- **Routes:** p2-future-where or p2-future-owner.
- **Fidelity:** `verbatim_adapted`. F04, V43. Source: "Well, how do you mean by free?"

#### p2-future-where: Where would it show up

- **Say:** "Where would that show up first, like on the floor, in the desk log, in the month-end numbers?"
- **Seeks:** A concrete location or moment in the store.
- **Why now:** The travel probes ("Well, where would you want to travel, man? ... where do you want to stay?") make the picture specific; the dealership version asks where in the store the difference is visible.
- **Listen for:** "Saturday mornings." "The Monday sales meeting."
- **If unclear → mirror:** "Like, on what day would you notice it?"
- **Tone:** Curious, upward.
- **Then:** Next probe.
- **Routes:** p2-future-who or p2-future-growth.
- **Fidelity:** `verbatim_adapted`. F06, F07. Source: "Well, where would you want to travel, man? ... where do you want to stay?"

#### p2-future-who: Who would notice

- **Say:** "And who'd notice first, man, like the desk, the salespeople, the owner?"
- **Seeks:** A person or group.
- **Why now:** "I'm assuming you wouldn't want to go alone. Like who would you want to take with you?" People make the scene real.
- **Listen for:** "The owner, because he's the one asking me about it."
- **If unclear → mirror:** "Who's the person who'd say something about it?"
- **Tone:** Curious, upward.
- **Then:** Growth or the owner question.
- **Routes:** p2-future-growth or p2-future-owner.
- **Fidelity:** `verbatim_adapted`. F08. Source: "Like who would you want to take with you?"

#### p2-future-growth: Effect on the store's growth

- **Say:** "Ah, and how do you feel like that would impact, like, the store's growth even?"
- **Seeks:** Their own picture of what the change enables next.
- **Why now:** "Ah, and how do you feel like that would impact like the company's growth even? Oh well, I mean if we have another crew, we're making way more revenue." Whatever they say is theirs; Jason adds nothing.
- **Listen for:** "We'd know whether to buy more leads." "We could move a BDC agent to service."
- **If unclear → mirror:** "Like what would that let you do next that you can't do now?"
- **Tone:** Curious, upward.
- **Then:** Make it personal.
- **Routes:** p2-future-owner.
- **Fidelity:** `verbatim_adapted`. F11. Source: "and how do you feel like that would impact like the company's growth even?"

#### p2-future-owner: Make it personal (the owner or GM)

- **Say:** "And obviously, like, you being the {owner_role}, what would even be different for you, like, at that point?"
- **Seeks:** One or two personal specifics.
- **Why now:** "the difference is in B2B after I get that specific for the business now I need to make it personal ... and obviously like you being the owner what would even be different for you like at that point as the owner. Oh well man I mean I would have a lot more free time."
- **Listen for:** "I'd stop checking the inbox at nine at night." "I'd have an answer when the owner asks."
- **If unclear → mirror:** "For you personally, not the store. What changes on your day?"
- **Tone:** Curious, upward.
- **Then:** Optional feeling question, or straight to the consequence, fast.
- **Routes:** p2-future-feel (optional) or p2-consequence.
- **Fidelity:** `verbatim_adapted`. F12, V34, V42. Source: "and obviously like you being the owner what would even be different for you like at that point as the owner."

#### p2-future-feel: How would that feel (optional; often skipped in B2B)

- **Say:** "And how would that, like, feel, man? Like put yourself in those shoes for a second."
- **Seeks:** A feeling word, optional.
- **Why now:** "And how would that like feel, man? ... put yourself in those shoes for a second." Optional; no specific word is required and the answer is never a completion condition.
- **Listen for:** Any answer, or a shrug.
- **If unclear → mirror:** None.
- **Tone:** Curious, upward.
- **Then:** The consequence, immediately.
- **Routes:** p2-consequence.
- **Fidelity:** `verbatim_adapted`. F09. Source: "And how would that like feel, man? ... put yourself in those shoes for a second."

#### p2-consequence: Consequence, two days, two weeks, two months, even two years

- **Say:** "And what if you don't, man? What happens if {dealership_name} stays on the exact same trajectory, where {stated_problem}, for the next two days, two weeks, two months, even two years, man? Like, what would happen at that point?"
- **Seeks:** Two or three specific negatives, in their words.
- **Why now:** "If I don't brush my teeth for a day ... If you expand that over time, though ... when you expand a problem over time into the future, it makes it much bigger in the prospect's mind." Delivered immediately after the peak positive, so the jump is fast.
- **Listen for:** "We'd keep paying for leads nobody works." "The owner would eventually pull the web budget." "Much the same" (mirror).
- **If unclear → mirror:** "Okay. And 'much the same' is fair. What I meant to ask is: what does much the same actually look like day to day, like six or twelve months down the line?"
- **Tone:** Curious with downward inflection.
- **Then:** Probe each specific, then the owner or GM, then the optional feeling.
- **Routes:** p2-consequence-probe, p2-consequence-owner, p2-consequence-feel (optional); shrug: p2-consequence-mirror.
- **Fidelity:** `verbatim_adapted`. C01, V45. Source: "And what if you don't, man? What happens if we stay on the exact same trajectory where we're getting those five leads a month ... for the next two days, two weeks, two months, even two years, man. Like what would happen at that point?"

#### p2-consequence-probe: Make the consequence specific

- **Say:** "What do you mean by that, just so I understand, so I can kind of help you a little bit better?"
- **Seeks:** A concrete picture of one negative.
- **Why now:** "I need a probe to make them visualize it. Oh, what sports I guess wouldn't you be able to play just so I understand so I can kind of help you a little bit better ... Oh, do you have like a field nearby?"
- **Listen for:** Detail ("we'd be the store whose web leads go to the competitor down the street").
- **If unclear → mirror:** "Like where would that show up first?"
- **Tone:** Concern (lean in, raise the eyebrows), downward.
- **Then:** The owner or GM question.
- **Routes:** p2-consequence-owner.
- **Fidelity:** `verbatim_adapted`. C02, C03. Source: "Oh, what sports I guess wouldn't you be able to play just so I understand so I can kind of help you a little bit better."

#### p2-consequence-owner: What it means for the owner or GM

- **Say:** "Oh, that makes sense. And what do you think that might even mean for you, like as the {owner_role}?"
- **Seeks:** A personal consequence, in their words.
- **Why now:** "And what do you think that might even mean for you like as the owner? And again, I ask that because I care ... Oh, well, I feel like I'd have to keep working."
- **Listen for:** "I'd keep being the one chasing." "I'd have no answer when the owner asks."
- **If unclear → mirror:** "For you, not the store. What's that like a year from now?"
- **Tone:** Concern, downward.
- **Then:** Optional feeling, or the commitment triad.
- **Routes:** p2-consequence-feel (optional) or p2-commit-settle.
- **Fidelity:** `verbatim_adapted`. C04. Source: "And what do you think that might even mean for you like as the owner?"

#### p2-consequence-feel: How would you feel (optional; skip in most B2B)

- **Say:** "And how would you, like, feel at that point?"
- **Seeks:** A feeling, optional.
- **Why now:** "for B2B, this question you might want to skip it sometimes for B2B. It won't always make sense." No specific word is required; "regret" is never required.
- **Listen for:** Anything.
- **If unclear → mirror:** None.
- **Tone:** Concern, downward.
- **Then:** The commitment triad.
- **Routes:** p2-commit-settle.
- **Fidelity:** `verbatim_adapted`. C05. Source: "And how would you like like feel at that point?"

#### p2-consequence-mirror: Call-out and re-ask on a shrug

- **Say:** "Okay. And 'much the same' is fair. What I meant to ask is: what's the day-to-day of that, like six or twelve months down the line, considering the cost of the leads keeps going up?"
- **Seeks:** A concrete day-to-day consequence.
- **Why now:** The reviewed call: "the guy kind of gives a ... answer. Oh, well, it stayed the same ... Yosh mirrors what did he do? Number one, he called it out ... Mirror question right after. What would be the day-to-day ramifications?" Yosh's call-out asserts "I met a lot of people that say"; Jason's version asserts nothing about other people.
- **Listen for:** "Honestly, we'd probably be going backwards, the leads cost more every year."
- **If unclear → mirror:** None. One mirror.
- **Tone:** Curious-concern, downward.
- **Then:** The owner or GM question, then the triad.
- **Routes:** p2-consequence-owner.
- **Fidelity:** `verbatim_adapted`. V45, V46. Source: "What's like the day-to-day gratification of you seeing exactly where you're at 36 12 months down the line where you aren't getting starting?"

### 2.4 Commitment triad and permission to pitch

"We need to get them to commit to a change is step one ... Once you've gotten those three commitments, I'm not willing to settle. I need to do it now and it's my responsibility. Then we transition into the actual pillars."

#### p2-commit-settle: Are you willing to settle for that?

- **Say:** "So this will sound like an obvious question, man, but I mean, it's really not. Are you willing to settle for that?"
- **Seeks:** A no.
- **Why now:** "So this will sound like an obvious question, man, but I mean I mean it's really not. Are you willing to settle for that? Whatever consequence they told you a second ago."
- **Listen for:** "No." A yes ("honestly it's fine as is"): accept, that is the fit answer, and go to the respectful exit.
- **If unclear → mirror:** "Like {stated_consequence}: is that something you're actually willing to settle for?"
- **Tone:** Confident, slow.
- **Then:** No: why now. Yes: accept and exit respectfully.
- **Routes:** no: p2-commit-why-now; yes: p3-exit-respectful.
- **Fidelity:** `verbatim_adapted`. P01, V47. Source: "So this will sound like an obvious question, man, but I mean I mean it's really not. Are you willing to settle for that?"

#### p2-commit-why-now: Why now?

- **Say:** "And why now? Because like there's always the new-year-new-me guy, the start-on-Monday guy. Why actually draw that line in the sand and, like, make that change now? Because you haven't for the past {problem_duration}, if we're being real about it."
- **Seeks:** Their reason for now.
- **Why now:** "And why now? Because like there's always a new year, new me guy. I like start on a Monday. Why actually draw that line in the sand and like make that change? Cuz you haven't for the past couple of months if we're being real about it." The duration is theirs, from the record.
- **Listen for:** "Because I'm sick of hearing about it." "Because the owner's asking."
- **If unclear → mirror:** "Like what's different about now versus three months ago?"
- **Tone:** Skeptical, light.
- **Then:** Whose responsibility.
- **Routes:** p2-commit-responsibility.
- **Fidelity:** `verbatim_adapted`. P02, V48. Source: "And why now? Because like there's always a new year, new me guy ... Cuz you haven't for the past couple of months if we're being real about it."

#### p2-commit-responsibility: Whose responsibility?

- **Say:** "And whose responsibility do you feel like it is to actually say, I've had enough, and make that change?"
- **Seeks:** "Mine."
- **Why now:** "And whose responsibility do you feel like it is to actually say I've had enough and make that change? Oh well, it's my responsibility." If the answer is honestly "the owner's", that is a decision-roles fact: book the owner, no frame.
- **Listen for:** "Mine." "The owner's" (route).
- **If unclear → mirror:** "Who has to make the choice, if it gets made?"
- **Tone:** Confident.
- **Then:** Mine: permission to pitch. Someone else's: the authority branch.
- **Routes:** p2-pitch-permission; someone else: p2-ph-no-authority.
- **Fidelity:** `verbatim_adapted`. P03, V47. Source: "And whose responsibility do you feel like it is to actually say I've had enough and make that change?"

#### p2-pitch-permission: Permission transition

- **Say:** "Well, based on what I've heard, man, obviously you mentioning how {stated_problem}, and because of that {stated_impact}, and obviously you wanting to get to the point where {stated_goal}: I think what we do could genuinely help with that. If it would be appropriate from here, we could kind of put a game plan together of how to actually get {dealership_name} to {stated_goal}. Would that be appropriate, or what do you want to do from here?"
- **Seeks:** Permission to pitch.
- **Why now:** "All we're doing is getting permission to pitch that they're telling us, 'Yeah, 100%. Let's go through it.'" The source's "I think what we're doing for sure could help you" becomes "could genuinely help with that": an opinion of fit, not a promise.
- **Listen for:** "Yeah, go through it." "Depends what it costs" (the price comes after the pillars; say so plainly).
- **If unclear → mirror:** "Want me to walk you through what it'd actually look like, or would you rather do something else from here?"
- **Tone:** Casual, confident.
- **Then:** Optional pen, then pillar one.
- **Routes:** p2-pen (optional), p2-pillar-1.
- **Fidelity:** `verbatim_adapted`. P04. Source: "If it would be appropriate from here, we could kind of put a game plan together ... Would that be appropriate or what do you want to do from here?"

#### p2-pen: Pen and paper (optional)

- **Say:** "Do you have a pen?"
- **Seeks:** A yes.
- **Why now:** From the reviewed call, immediately before the pitch: "Do you have a pend?"
- **Listen for:** "Yeah."
- **If unclear → mirror:** None.
- **Tone:** Casual.
- **Then:** Pillar one.
- **Routes:** p2-pillar-1.
- **Fidelity:** `verbatim_adapted`. P11. Source: "Do you have a pend?"

### 2.5 The three pillars: "pillar is X because you mentioned Y, so what we do is Z. Does that make sense?"

"the structure is pillar one is X because you know how you mentioned XYZ. So what we do is XYZ ... We're adding the context of their problem, the issues that they're having into why we have the pillar. So it feels extremely personalized ... And then you end it with the agreeance of yes, it would be helpful. Yes, it makes sense." Each Z below is the offer pillar's `delivery` text and nothing more.

#### p2-pillar-1: Speed, the same-day inquiry response

- **Say:** "So the first pillar, man, is the speed, the same-day response. Because you know how you mentioned {stated_problem}. So what we do is every inquiry that comes through your site gets acknowledged and routed through the channel you already use, inside a response window we agree on, with the arrival time recorded. Does that make sense?"
- **Seeks:** A yes, or a question.
- **Why now:** "So the first pillar we have, man, is the targeting. Because, you know, you mentioned earlier like ... So, that's why we have the targeting because we're able to give you leads that are ... Does that make sense?" The Y slot is their words about inquiries sitting unanswered; the Z is the offer's delivery for "Same-day inquiry response".
- **Listen for:** "Yeah." "What's the window?" (answer from the offer: agreed per store; never a number that is not in the approved version).
- **If unclear → mirror:** "Do you see why that's there, given what you said about {stated_problem}?"
- **Tone:** Extremely casual, extremely confident.
- **Then:** Pillar two.
- **Routes:** p2-pillar-2.
- **Fidelity:** `verbatim_adapted`. P05, P06, P12. Source: "So the first pillar we have, man, is the targeting. Because, you know, you mentioned earlier ... Does that make sense?"

#### p2-pillar-2: Ownership, one named handoff

- **Say:** "Second pillar is the ownership, man. Because you know how you mentioned {stated_problem}, like nobody's actually on the hook for a given inquiry. So what we do is every inquiry gets assigned to one named person on your team with a status they update as they work it, and anything unclaimed gets surfaced instead of lost. Do you feel like that'd be helpful for you?"
- **Seeks:** A yes, or a question.
- **Why now:** The same structure with the check in its other form: "Do you feel like that'd be helpful for you?" The Z is the offer's delivery for "One named handoff".
- **Listen for:** "Yeah, that's the whole thing." "Who picks the person?" (they do; the offer needs one named staff member or rotation).
- **If unclear → mirror:** "Does that make sense, given what you said about {stated_problem}?"
- **Tone:** Casual, confident.
- **Then:** Pillar three.
- **Routes:** p2-pillar-3.
- **Fidelity:** `verbatim_adapted`. P05, P06. Source: "Do you feel like that'd be helpful for you?"

#### p2-pillar-3: Visibility, one honest reporting view

- **Say:** "And the third pillar is the visibility. Because you know how you mentioned {stated_problem}, like you can't tell what happened to one without asking around. So what we do is one view for your rooftop: when it arrived, when the first response went out, who owns it, and where it stands, exported as a weekly summary. And those numbers are counts of what actually happened, not projections. Does that make sense?"
- **Seeks:** A yes, or a question.
- **Why now:** The same structure. The Z is the offer's delivery for "One honest reporting view", including its own honesty clause.
- **Listen for:** "Yeah." "Can it show close rate?" (only what is recorded: arrival, first response, owner, status; say so).
- **If unclear → mirror:** "Do you see why that's there, given what you said about not being able to see it?"
- **Tone:** Casual, confident.
- **Then:** The fit question.
- **Routes:** p2-fit.
- **Fidelity:** `verbatim_adapted`. P05, P06, P12. Source: "So, again, it's the exact same structure. I'm saying the pillar is X because you now you mentioned problem problem. So what we do is".

### 2.6 Fit, why, key to the castle, personal double-down, the price drop

#### p2-fit: Perceived fit

- **Say:** "Now, based on everything we've covered, man, like, do you actually feel like this would get {dealership_name} to that goal of {stated_goal}?"
- **Seeks:** A yes, a qualified yes, or a no.
- **Why now:** "now based on everything we've covered, man, like do you actually feel like this would get you to that goal of like losing the 50 lbs ... They're almost always going to say yes." A no or a criterion the offer cannot meet is taken at face value: say so, and route to the exit or a scope conversation.
- **Listen for:** "Yeah." "If the team actually updates the status" (a real dependency; agree it is theirs). "Not sure."
- **If unclear → mirror:** "Like, does this actually address what you told me, or is something missing?"
- **Tone:** Confident.
- **Then:** Yes: why. No or missing: name it honestly; exit or scope.
- **Routes:** yes: p2-why; no: p3-exit-respectful or p3-exit-followup.
- **Fidelity:** `verbatim_adapted`. P07. Source: "do you actually feel like this would get you to that goal".

#### p2-why: Why, the key to the castle

- **Say:** "Okay, then why though? Like, I guess, what do you think is really like the key to the castle for you? What do you think is going to help you the most?"
- **Seeks:** The pillar they value most, in their words.
- **Why now:** "'Okay, then why though?' Like I I guess what what do you think is really like the the the the key to the castle for you? What do you think is going to help you the most?" The answer is recorded as their key pillar and reused in the objection system.
- **Listen for:** "Somebody owning it." "Just seeing it."
- **If unclear → mirror:** "Of the three, which one actually matters to you?"
- **Tone:** Curious.
- **Then:** The personal double-down.
- **Routes:** p2-personal.
- **Fidelity:** `verbatim_adapted`. P08. Source: "what what do you think is really like the the the the key to the castle for you? What do you think is going to help you the most?"

#### p2-personal: Personal double-down

- **Say:** "Yeah, because you having that {key_pillar}, man, what do you feel like that would do for you? Like, even more personally though?"
- **Seeks:** A personal meaning of the key pillar.
- **Why now:** "Then most of the time you're going to double down and go, 'Yeah, because you having that accountability, man, what do you feel like that would do for you?' Like even more personally though".
- **Listen for:** "I'd stop babysitting the inbox." "I'd have an answer for the owner."
- **If unclear → mirror:** "For you, day to day. What changes?"
- **Tone:** Curious.
- **Then:** The price drop (or the null-price cue).
- **Routes:** price approved: p2-price; price null: p2-price-null.
- **Fidelity:** `verbatim_adapted`. P09. Source: "because you having that accountability, man, what do you feel like that would do for you? Like even more personally though".

#### p2-price: The price drop (only when an approved price exists)

- **Say:** "Okay, cool, man. Well, based on everything I've heard, the total investment to actually get {dealership_name} to the point where {stated_goal}, so that {stated_impact} isn't the story anymore and it's not getting worse over time, is going to be {approved_price}. How would you like to proceed?"
- **Seeks:** A yes, or an objection.
- **Why now:** "the total investment, man, to actually get you to the point of like being able to lose that weight so that you can have more energy ... and it's not kind of getting worse over time, is going to be XYZ ... How would you like to proceed? That simple." The number interpolates only from a published, non-fictional offer version.
- **Listen for:** "Let's do it." "How does payment work?" (only the approved payment schedule is spoken). Any objection: convert it to money logistics first (Part 3).
- **If unclear → mirror:** "So that's the total. What would you like to do from here?"
- **Tone:** Extremely casual, extremely confident; then silence.
- **Then:** Yes: next steps. Objection: money logistics first.
- **Routes:** yes: p2-proceed-yes; objection: p3-money-duffel.
- **Fidelity:** `verbatim_adapted`. P10. Source: "the total investment, man, to actually get you to the point of ... is going to be XYZ, $5,000, $10,000, whatever it is. How would you like to proceed?"

#### p2-price-null: The null-price cue (current state of the draft offer)

- **Say:** (screen shows: Price not approved yet. No number is spoken.) "Okay, cool, man. Here's where I'd normally give you the total. I don't have an approved number for your scope yet, and I'm not going to make one up on a call. What I can do is put the scope in writing with the price and the acceptance tests, and we go through it together. How would you like to proceed from here?"
- **Seeks:** Agreement to a scope conversation, or a no.
- **Why now:** The offer's price is `null`. A blank price is never $0, never a range, never "around". The honest line names the missing piece and routes to scope. In practice mode the fictional offer's price (USD 750 setup plus USD 150 for the 30-day period) may render under the FICTIONAL TRAINING OFFER, NOT A REAL QUOTE banner.
- **Listen for:** "Sure, send it." "I need a number today" (say plainly that there isn't one yet).
- **If unclear → mirror:** "Straight answer: no number exists yet for your scope. Do you want it in writing, or not?"
- **Tone:** Casual, plain.
- **Then:** Agreed: the scope follow-up. No: the respectful exit.
- **Routes:** p3-exit-followup; no: p3-exit-respectful.
- **Fidelity:** `apohenia_addition` (P10 purpose with the missing-information cue).

#### p2-proceed-yes: Next steps after a yes

- **Say:** "Perfect. Then here's what happens next: I'll send the scope with the acceptance tests in writing today, you tell me who's giving me delegated access to the inbox or CRM and who the named handoff person is, and nothing starts on the clock until that access is in. Sound right?"
- **Seeks:** Confirmation and the two names.
- **Why now:** No source line; the offer's implementation dependencies (access before the schedule starts, a named handoff person, a walkthrough) are stated so nothing is promised that the prerequisites do not allow.
- **Listen for:** Names. Questions about timing (estimated, not committed, per the offer).
- **If unclear → mirror:** "Two names: who owns the access, and who owns the inquiries?"
- **Tone:** Casual, confident.
- **Then:** End the call; log the outcome and the follow-up.
- **Routes:** p3-exit-followup.
- **Fidelity:** `apohenia_addition`.

### 2.7 Excluded from Part 2 (study only)

- **x-father:** "Who do you think that could even make you as a father? Like knowing there's something you could have done about it ... our relationship suffered." D03 study only; identity-shame consequence. Never live.
- **x-person-label:** "Who do you think that would make you as a person? ... Oh well, man, like a really lazy person, like not really worth anything." D04 study only; negative self-label. Never live.
- **x-not-saying-this-is-you:** "And I want to be clear, man, I'm not saying this is you, right? ... whenever you say I don't want to say this is you, what is it implying? Well, this kind of is you." A disclaimer used as an implication. Never live.
- **x-regret:** The forced "regret" future-feeling construction (C06). No emotional word is ever required to progress.
- **x-future-identity:** "and who do you feel like that would make you as a person? Like being the guy who actually took the opportunity ..." D05 study only. Positive identity is allowed only as a brief kudos on something they actually did, not as a label attached to a purchase.
- **x-family-leverage:** "if they are a father, then you use their family as leverage." Never live. "Using your example of the Saturday floor" is allowed; inferences about family, biography or personality are not.

---

## Part 3: OBJECTION SYSTEM

### 3.1 The conversion rule (p3-rule; a rule, not a spoken line)

"most people try and handle the objections the prospect give them. That's a mistake because if you're constantly trying to handle the objections, they're just going to give you a new one. Now, you're in their world ... instead what the best objection handlers and sales people do is they convert the objections they get into the ones that they want to handle." Order: "no matter the objection you get, you're always gonna push it to money logistical. Here's why ... Any objection, whether it's partner, time, whatever, has something to do with the money ... what we want to do is get money out of the way to begin with. That way we know everything they're telling us is actually real." After money: time or partner (logistics), then fear via an agreeance statement. Apohenia bound: one certainty frame, the named second frame is not worked in the source, then the respectful exit. Every objection line accepts a plain no.

### The four-part reframe (p3-reframe-structure; a rule, not a spoken line)

"Number one is the frame. That's where I go. Like there's two types of people or if you see me like have that wears a crown. That's the frame. Step two is the push back. This is where I make them defend the frame ... And why? Cuz like you don't have to be, man ... Number three is the consequence ... You need leverage to change anything ... because what do you think happens if you don't man? ... And then step four is the CTA. The commitment to change ... So, which of those two kind of people do you want to be? ... So, what decision do you feel like you need to make, man, to put yourself in the best possible position so when your head hits that pillow tonight, you know, you did everything in your power". Each reframe below is written frame, pushback, consequence, CTA in that order.

### 3.2 Money logistics first (the full sequence)

#### p3-money-duffel: Money aside, the duffel bag

- **Say:** "Okay, not a problem, man. Money aside for a second: like, if I handed you a duffel bag with the full {approved_price} for this, would you actually do it?"
- **Seeks:** A yes (value is present) or a no (value objection: back to fit).
- **Why now:** "Whenever they give the objection, you just go, 'Okay, not a problem, man. Money aside for a second, like if I gave you a duffel bag with the full 10,000 for the program, would you actually do it?'" While the price is null, the line reads "with the full amount for it, whatever it ends up being" and no number is spoken.
- **Listen for:** "Yeah, of course." "Honestly, no" (then the objection is value: return to the fit question and take the answer).
- **If unclear → mirror:** "Forget the money for one second. If it cost nothing, would you put it in?"
- **Tone:** Casual.
- **Then:** Yes: why though. No: the fit question, honestly.
- **Routes:** yes: p3-money-why; no: p2-fit.
- **Fidelity:** `verbatim_adapted`. O01. Source: "Money aside for a second, like if I gave you a duffel bag with the full 10,000 for the program, would you actually do it?"

#### p3-money-why: Why though?

- **Say:** "Well, why though? Just so I understand."
- **Seeks:** Their reason the value is there.
- **Why now:** "Well, why though? Just so I understand. Oh, because I mean with everything you've covered and the coaching etc. like I feel like it would really help me."
- **Listen for:** A pillar or their criterion, in their words.
- **If unclear → mirror:** "Like what about it would you actually be doing it for?"
- **Tone:** Curious.
- **Then:** The personal double-down.
- **Routes:** p3-money-personal.
- **Fidelity:** `verbatim_adapted`. O02. Source: "Well, why though? Just so I understand."

#### p3-money-personal: Personally though

- **Say:** "Yeah, because like you having that {key_pillar}, I guess, and everything else, what do you feel that would do for you, like, like more personally though?"
- **Seeks:** The personal meaning.
- **Why now:** "Yeah, because like you having that coaching I guess and like the guidance and everything else. What do you feel that would do for you like like more personally though? ... Now I have removed the value objection out of the equation."
- **Listen for:** A personal answer.
- **If unclear → mirror:** "For you, not the store. What changes?"
- **Tone:** Curious.
- **Then:** Initial investment or break it up.
- **Routes:** p3-money-split.
- **Fidelity:** `verbatim_adapted`. O03. Source: "What do you feel that would do for you like like more personally though?"

#### p3-money-split: Initial investment, or break it up?

- **Say:** "So is it just the initial investment, or if there was a way to possibly break it up, would that make it a bit more digestible, like, financially for you?"
- **Seeks:** Whether the block is the lump or the total.
- **Why now:** "So is it just an initial investment of the $10,000 or if there was a way to possibly break it up, would that make it a bit more digestible like financially for you? And now almost every time they're going to say, 'Yes, that would make it way better.'" Only structures that exist in the approved offer's payment schedule may be offered; the draft offer's schedule is "not set", so until then the honest answer is that the schedule is set in the written scope.
- **Listen for:** "Breaking it up would help." "It's the total."
- **If unclear → mirror:** "Is it the size of the first payment, or the whole number?"
- **Tone:** Casual.
- **Then:** The budget-fit question.
- **Routes:** p3-money-fit.
- **Fidelity:** `verbatim_adapted`. O04. Source: "if there was a way to possibly break it up, would that make it a bit more digestible like financially for you?"

#### p3-money-fit: Budget fit (the B2B substitute for the savings question)

- **Say:** "Not a problem, man. Just so I can put something together that actually fits: is there a number the store's comfortable with for something like this, monthly or up front? Just to see if I can help."
- **Seeks:** A budget constraint, if they are willing to give one.
- **Why now:** The source asks "Cash on hand then expenses aside, what do you have saved up? Just to see if I can help." That savings question (O05) is study only and a dealership's cash position is not the seller's business; the budget-fit question keeps the purpose (a plan that fits their constraint) without it.
- **Listen for:** A number or a range. "I'd rather you propose." (Fine: propose from the approved schedule only.)
- **If unclear → mirror:** "Even a ceiling helps. What would make it a no on cost alone?"
- **Tone:** Casual.
- **Then:** Propose the plan.
- **Routes:** p3-money-plan.
- **Fidelity:** `apohenia_addition` (purpose of O05, which is excluded; see 3.7).

#### p3-money-plan: Would that work within your budgetary constraints?

- **Say:** "Okay. What I could do for you then is {approved payment structure}. That way {dealership_name} is actually getting the inquiries {their_word} while it's, like, paying for itself over time. Would that work within your budgetary constraints?"
- **Seeks:** A yes to the plan fitting their budget.
- **Why now:** "before we ask for the sale again, we need to get them to agree this works within my budgetary constraints ... Would that work within your budgetary constraints? And now after they agree yes, now logistics are out of the way." The structure comes only from the approved offer's payment schedule; nothing is invented on the call. "Paying for itself" is spoken only if the prospect themselves connected the deliverable to a money outcome; otherwise the clause is dropped.
- **Listen for:** "Yeah, that works." "Still too much" (accept; a no on price is a no).
- **If unclear → mirror:** "Does that structure fit, or is it still the total that's the problem?"
- **Tone:** Casual.
- **Then:** Yes: proceed. No: accept, the respectful exit with a follow-up if welcome.
- **Routes:** yes: p3-money-proceed; no: p3-exit-respectful.
- **Fidelity:** `verbatim_adapted`. O06. Source: "we could split it up into four payments, I guess, of 2.5 grand a month ... Would that work within your budgetary constraints?"

#### p3-money-proceed: How would you like to proceed (after logistics)

- **Say:** "Okay, so with the understanding that you feel this would actually get {dealership_name} to {stated_goal}, and obviously that it works within budgetary constraints, how would you like to proceed?"
- **Seeks:** A yes, or the next objection (time, partner, or fear).
- **Why now:** "okay, so with the understand that you feel would actually get you to that goal of like the 50k a month ... and obviously that it worked within budgetary constraints, how would you like to proceed? ... It's not money, it's not value, logistically it works."
- **Listen for:** "Let's do it." "It's just the timing." "I need to run it by my partner." "It feels risky."
- **If unclear → mirror:** "So what would you like to do from here?"
- **Tone:** Casual, confident; then silence.
- **Then:** Yes: next steps. Time: time aside. Partner: partner aside. Fear: the agreeance statement.
- **Routes:** yes: p2-proceed-yes; time: p3-time-aside; partner: p3-partner-aside; fear: p3-fear-agree.
- **Fidelity:** `verbatim_adapted`. O07. Source: "with the understand that you feel would actually get you to that goal ... and obviously that it worked within budgetary constraints, how would you like to proceed?"

### 3.3 Time: the two-kinds-of-people reframe (frame, pushback, consequence, CTA)

#### p3-time-aside: Time aside

- **Say:** "Well, time aside, man. Like, if you did have the time, would you actually do it? Like, do you actually feel like it'd get {dealership_name} to {stated_goal}?"
- **Seeks:** A yes (value is present).
- **Why now:** "Well, time aside, man. Like, if you did have the time, would you actually do like do you actually feel like it'll get you to that goal of like the 50K a month?" Value is asked again on purpose: "the way that the brain works psychologically is through orders. It has lenses in which it makes decisions. And so, we need to bring the fact the value is there to the front of their mind before reframing the time again."
- **Listen for:** "Yeah, I feel like it would."
- **If unclear → mirror:** "Forget the calendar. Does it do the thing you said you wanted?"
- **Tone:** Casual.
- **Then:** Why though.
- **Routes:** p3-time-why.
- **Fidelity:** `verbatim_adapted`. O08. Source: "Well, time aside, man. Like, if you did have the time, would you actually do like do you actually feel like it'll get you to that goal".

#### p3-time-why: Why, what would help the most

- **Say:** "Well, why though? Like, what do you feel would really help you the most?"
- **Seeks:** The pillar they value.
- **Why now:** "Well, why though? Like, what do you feel would really help you the most? Oh, well, I mean, I feel like specifically having like the coaching, the guidance would really really help me."
- **Listen for:** A pillar in their words.
- **If unclear → mirror:** "Of the three, which one?"
- **Tone:** Curious.
- **Then:** Even more personally.
- **Routes:** p3-time-personal.
- **Fidelity:** `verbatim_adapted`. O02 (time context). Source: "Well, why though? Like, what do you feel would really help you the most?"

#### p3-time-personal: Even more personally

- **Say:** "Yeah, because you having that, like, what do you feel like that would do for you, like, even more personally?"
- **Seeks:** The personal meaning.
- **Why now:** "Yeah, because you having that, like what do you feel like that would do for you like even more personally? ... all we're doing is getting value out of the way again."
- **Listen for:** A personal answer.
- **If unclear → mirror:** "For you, day to day."
- **Tone:** Curious.
- **Then:** The frame.
- **Routes:** p3-time-frame.
- **Fidelity:** `verbatim_adapted`. O03 (time context). Source: "what do you feel like that would do for you like even more personally?"

#### p3-time-frame: Frame, two kinds of people

- **Say:** "Well, can I make a suggestion, man? Because really, in this world, there's two kinds of people. There's the {owner_role} who goes, you know what, I've got the floor, I've got service, I've got the month to close, I can't take on one more thing. And then there's the {owner_role} who goes, no, no, you know what, because I've got the floor and service and the month to close, that's exactly why the web leads can't depend on me remembering to chase them; that's why somebody has to own them, so I actually get my time back. Which of those two do you want to be?"
- **Seeks:** "The second one."
- **Why now:** "there's two kinds of people. There's the guy who goes, you know what, I have a family, I have kids, I have my job, I can't find a way to make more money. But then there's a second guy who goes, 'No, no, you know what? Because I have my family and I have my kids and I have my job and everything else, that's why I need to learn ... That way, I can even have more time' ... which of those two people do you want to be?" Their reasons for being busy are exactly the ones they gave; nothing is added. O09 is classified study only (classification conflict, Part 5).
- **Listen for:** "The second, obviously." A refusal to play ("I don't do the two-kinds-of-people thing"): accept, move to the plain CTA or the exit.
- **If unclear → mirror:** None. One frame.
- **Tone:** Casual, confident.
- **Then:** Pushback.
- **Routes:** p3-time-pushback; refusal: p3-time-cta or p3-exit-respectful.
- **Fidelity:** `verbatim_adapted`. O09 (classification conflict), O12 adjacent. Source: "there's two kinds of people ... which of those two people do you want to be?"

#### p3-time-pushback: Pushback

- **Say:** "And why? Because, like, you don't have to be, man."
- **Seeks:** Them defending the second person.
- **Why now:** "And then you push back. And why? Cuz like you don't have to, man ... I'm making them defend, oh this is true. I want to be the second guy."
- **Listen for:** "Because I'm the one who ends up doing it at nine at night." "Because the owner's asking me why we're not closing web leads."
- **If unclear → mirror:** None.
- **Tone:** Skeptical, light.
- **Then:** Consequence.
- **Routes:** p3-time-consequence.
- **Fidelity:** `verbatim_adapted`. O10 (classification conflict). Source: "And why? Cuz like you don't have to, man."

#### p3-time-consequence: Consequence

- **Say:** "Yeah. Because what do you think would happen if you didn't, man? Like, if you decided to be that first {owner_role}, where the floor and service and the month are the reason the web leads keep sitting there? What do you think would happen then?"
- **Seeks:** A consequence in their words.
- **Why now:** "Because what do you think would happen if you didn't, man? Like if you decided to be that first guy who's just like, 'No, they're the reason why I can't be successful.' ... What do you think would happen then?" The stated reasons are theirs; no identity label is attached.
- **Listen for:** "Nothing changes. We keep paying for leads nobody works."
- **If unclear → mirror:** "Like six months from now, what's different? Nothing?"
- **Tone:** Concern, downward.
- **Then:** Willing to settle.
- **Routes:** p3-time-settle.
- **Fidelity:** `verbatim_adapted`. O11 (classification conflict), C01 adjacent. Source: "Because what do you think would happen if you didn't, man? ... What do you think would happen then?"

#### p3-time-settle: Willing to settle?

- **Say:** "Are you actually willing to, like, settle for that?"
- **Seeks:** A no.
- **Why now:** "Are you actually willing to like like like settle for that? Well, no. Definitely not, man."
- **Listen for:** "No." A yes: accept, exit respectfully.
- **If unclear → mirror:** None.
- **Tone:** Confident, slow.
- **Then:** CTA. A yes: the respectful exit.
- **Routes:** p3-time-cta; yes: p3-exit-respectful.
- **Fidelity:** `verbatim_adapted`. P01 (objection context). Source: "Are you actually willing to like like like settle for that?"

#### p3-time-cta: CTA, what decision

- **Say:** "Okay. So in your eyes, like, what decision do you feel like you need to make to put {dealership_name} in the best possible position to actually get the inquiries {their_word}? That way you're actually getting your time back, because that's what you said you want at the end of the day."
- **Seeks:** A decision, in their words.
- **Why now:** "So, in your eyes, like what decision do you feel like you have to make to put yourself in the best possible position to actually learn the skills to make more money? That way, you're able to provide better for your family because that's all you want at the end of the day. And right there, again, this is a tree. There's two things that can happen. Number one, close sale. Number two, they go, 'Ah, like that makes sense. It's just that XYZ fear objection.'"
- **Listen for:** "I need to do it." "I still need to think" (fear).
- **If unclear → mirror:** "So what do you want to do from here?"
- **Tone:** Confident.
- **Then:** Yes: next steps. Fear: the agreeance statement. No: the respectful exit.
- **Routes:** yes: p2-proceed-yes; fear: p3-fear-agree; no: p3-exit-respectful.
- **Fidelity:** `verbatim_adapted`. O12. Source: "what decision do you feel like you have to make to put yourself in the best possible position ... because that's all you want at the end of the day."

### 3.4 Partner: the crown reframe (frame, pushback, consequence, CTA)

Apohenia rule before the frame: the crown is for a person who **holds** the decision and defers to a partner (co-owner, spouse, a peer who does not live with the inquiries). If the decision genuinely sits with someone else (a GM without budget authority, a dealer principal who was not on the call), that is a decision-roles fact, not an objection: use the authority route at the end of this section and never the crown.

#### p3-partner-aside: Partner aside

- **Say:** "Partner aside, man. Like, if {partner_name} was on board, and was like, look, we have to do this: would you actually do it? Like, do you actually feel like it'd get {dealership_name} to {stated_goal}?"
- **Seeks:** A yes (value is present).
- **Why now:** "Number one, you should notice the pattern. Get value out of the way and get them to agree, yeah, the value is there. So, we go partner assignment. Like, if she was on board and she was like, 'Honey, you have to do this. This is amazing.' Like, would you actually do it?"
- **Listen for:** "Yeah."
- **If unclear → mirror:** "If it was purely your call, is it a yes?"
- **Tone:** Casual.
- **Then:** Why though.
- **Routes:** p3-partner-why.
- **Fidelity:** `verbatim_adapted`. O13. Source: "if she was on board and she was like, 'Honey, you have to do this. This is amazing.' Like, would you actually do it? Like, do you actually feel like it will get you to that goal".

#### p3-partner-why: Why, just so I understand

- **Say:** "Well, why though? Like, just so I understand."
- **Seeks:** Their reason.
- **Why now:** "Well, why though? Like, just so I understand. Oh, because I mean like with the guidance and the mentoring and everything else".
- **Listen for:** A pillar in their words.
- **If unclear → mirror:** "What about it, specifically?"
- **Tone:** Curious.
- **Then:** What would that do for you personally.
- **Routes:** p3-partner-personal.
- **Fidelity:** `verbatim_adapted`. O02 (partner context). Source: "Well, why though? Like, just so I understand."

#### p3-partner-personal: What would that do for you personally

- **Say:** "Because, like, what would that do for you personally?"
- **Seeks:** The personal meaning; wait for it.
- **Why now:** "because what would that do for you personally? Again, wait for them to answer, make them defend it."
- **Listen for:** A personal answer.
- **If unclear → mirror:** "For you, not the store."
- **Tone:** Curious.
- **Then:** What if they say no.
- **Routes:** p3-partner-no.
- **Fidelity:** `verbatim_adapted`. O03 (partner context). Source: "because what would that do for you personally?"

#### p3-partner-no: What if they say no?

- **Say:** "Okay, so out of curiosity, man, what happens if you go to {partner_name} and you're like, look, we need to do this, this is going to change how the inquiries get handled, and they say no? Like, would you kind of do it anyways, or would you just kind of give up on getting to {stated_goal}?"
- **Seeks:** "I'd do it anyway" or "I wouldn't".
- **Why now:** "what happens if you go to her and you're like, 'Honey, you know, we need to do this ...' And she says, 'No,' like would you kind of like do it anyways or you just kind of like give up on getting to that 50k a month goal ... Now, regardless of what they say, if they say I wouldn't do it, move on to the frame ... They say, 'I would do it anyways.' You say, 'Well, why would you?'" O14 is classified study only (classification conflict).
- **Listen for:** "I'd do it." "No, I wouldn't go against him."
- **If unclear → mirror:** None.
- **Tone:** Curious.
- **Then:** Would do it anyway: why would you. Would not: the crown frame.
- **Routes:** anyway: p3-partner-why-anyway; would not: p3-partner-crown.
- **Fidelity:** `verbatim_adapted`. O14 (classification conflict). Source: "would you kind of like do it anyways or you just kind of like give up on getting to that 50k a month goal".

#### p3-partner-why-anyway: Why would you?

- **Say:** "Well, why would you?"
- **Seeks:** Them defending it.
- **Why now:** "You say, 'Well, why would you?' Right? And wait for them to be like, 'Oh, because it's important enough to me, etc.' Make them defend it. And then regardless, again, you're going to go into the frame." O15 is classified study only (classification conflict).
- **Listen for:** "Because it's my floor."
- **If unclear → mirror:** None.
- **Tone:** Curious.
- **Then:** The crown frame.
- **Routes:** p3-partner-crown.
- **Fidelity:** `verbatim_adapted`. O15 (classification conflict). Source: "Well, why would you?"

#### p3-partner-crown: Frame, heavy is the head that wears the crown

- **Say:** "Now, have you heard, man, if I can make a suggestion, the saying, like, heavy is the head that wears the crown? The idea of it is, the weight of the crown isn't the crown itself. The weight of the crown is the decisions you make when you have that crown on. Because back in the day, the king was the one sending an army this way, starting a war that way. He was responsible for thousands of lives. Because as the king, it would not be fair to put the burden of that responsibility on anybody but himself."
- **Seeks:** A nod.
- **Why now:** "the first step of a reframe. We're going to the frame. Now, have you heard, man, if I can make a suggestion, the saying like heavy is the head that wears the crown. The idea of it, man, is like the weight of the crown isn't the crown itself. The weight of the crown is the decisions you make when you have that crown on." O16 is classified study only (classification conflict).
- **Listen for:** "Sure."
- **If unclear → mirror:** None.
- **Tone:** Casual, storytelling.
- **Then:** Who does the work.
- **Routes:** p3-partner-who-does.
- **Fidelity:** `verbatim_adapted`. O16 (classification conflict). Source: "heavy is the head that wears the crown. The idea of it, man, is like the weight of the crown isn't the crown itself."

#### p3-partner-who-does: Who does the work?

- **Say:** "Because for you, for example, man, who's going to be the one actually living with how the inquiries get handled day to day, the one whose floor it is, whose team's picking them up? Is that going to be you, or is it going to be {partner_name}, between you and I, because I want to help you?"
- **Seeks:** "Me."
- **Why now:** "Because for you, for example, man, who's going to be the one actually going through the training, like learning the skill sets ... Is that going to be you or is it going to be your wife between you and I, cuz I want to help you? Oh, it's going to be me." O17 is classified study only (classification conflict).
- **Listen for:** "Me." If the honest answer is "the partner runs the floor": stop the frame; that person is the operational owner and should be on the call (authority route).
- **If unclear → mirror:** None.
- **Tone:** Curious.
- **Then:** Me: whose responsibility. Partner: the authority route.
- **Routes:** me: p3-partner-responsibility; partner: p3-partner-authority.
- **Fidelity:** `verbatim_adapted`. O17 (classification conflict). Source: "who's going to be the one actually going through the training ... Is that going to be you or is it going to be your wife".

#### p3-partner-responsibility: Whose responsibility?

- **Say:** "So whose responsibility is it to really put {dealership_name} in the best possible position on that? That way the inquiries are actually getting {their_word}."
- **Seeks:** "Mine."
- **Why now:** "So, whose responsibility is it to really put you in the best possible position to learn that skill? ... Oh, it's it's it's my it's it's my responsibility." O18 is classified study only (classification conflict).
- **Listen for:** "Mine."
- **If unclear → mirror:** None.
- **Tone:** Confident.
- **Then:** Would it be fair.
- **Routes:** p3-partner-fair.
- **Fidelity:** `verbatim_adapted`. O18 (classification conflict), P03 adjacent. Source: "So, whose responsibility is it to really put you in the best possible position to learn that skill?"

#### p3-partner-fair: Would it be fair?

- **Say:** "Okay. So then, the same way as the king, do you think it'd actually be fair to, like, put the weight of that responsibility on anybody but yourself?"
- **Seeks:** "No."
- **Why now:** "So then the same way as the king, do you think it'd actually be fair to like put the weight of that responsibility on anybody but yourself? ... 'Oh, well, no, obviously it wouldn't be fair.'" The source's list ("whether it's your dog, your wife, your tree") is dropped as demeaning. O19 is classified study only (classification conflict).
- **Listen for:** "No."
- **If unclear → mirror:** None.
- **Tone:** Skeptical, light.
- **Then:** Why not.
- **Routes:** p3-partner-why-not.
- **Fidelity:** `verbatim_adapted`. O19 (classification conflict). Source: "do you think it'd actually be fair to like put the weight of that responsibility on anybody but yourself?"

#### p3-partner-why-not: Pushback, why not?

- **Say:** "Well, why not, though?"
- **Seeks:** Them defending the new frame.
- **Why now:** "Well, why not, though? Again, what am I doing now? I'm getting them to defend. I'm pushing back to getting them to defend their new mentality, my frame." The source's expected answer ("I'm the man of the household") is theirs to give or not; nothing is suggested. O20 is classified study only (classification conflict).
- **Listen for:** "Because it's my store to run." "Because he's not the one hearing from the customers."
- **If unclear → mirror:** None.
- **Tone:** Skeptical, light.
- **Then:** Consequence.
- **Routes:** p3-partner-consequence.
- **Fidelity:** `verbatim_adapted`. O20 (classification conflict). Source: "Well, why not, though?"

#### p3-partner-consequence: Consequence

- **Say:** "Because what do you think happens if you take that responsibility, that burden that you have, and you put it on somebody who doesn't have as much context about the situation, who isn't the one on the floor with it? And so what do you think would happen to {dealership_name} then?"
- **Seeks:** A consequence in their words.
- **Why now:** "because what do you think happens if you aren't like what do you think happens if you take that responsibility that burden that you have and you put it on anybody but yourself ... that doesn't have as much context about the situation ... And so what do you think would happen to your career then?" O21 is classified study only (classification conflict).
- **Listen for:** "They'd say no because they don't see it, and we'd stay where we are."
- **If unclear → mirror:** "Like what happens to the web leads then?"
- **Tone:** Concern, downward.
- **Then:** Willing to settle.
- **Routes:** p3-partner-settle.
- **Fidelity:** `verbatim_adapted`. O21 (classification conflict), C04 adjacent. Source: "what do you think happens if you take that responsibility ... And so what do you think would happen to your career then?"

#### p3-partner-settle: Willing to settle?

- **Say:** "And are you actually willing to, like, settle for that?"
- **Seeks:** A no.
- **Why now:** "And are you actually willing to like like settle for that? Well, no. No, I'm not willing to settle for that, man."
- **Listen for:** "No." A yes: accept.
- **If unclear → mirror:** None.
- **Tone:** Confident, slow.
- **Then:** CTA. A yes: the respectful exit.
- **Routes:** p3-partner-cta; yes: p3-exit-respectful.
- **Fidelity:** `verbatim_adapted`. P01 (objection context). Source: "And are you actually willing to like like settle for that?"

#### p3-partner-cta: CTA

- **Say:** "So what decision do you feel like you need to make to put {dealership_name} in the best possible position to get the inquiries {their_word}, to get to {stated_goal}, and to stop being the one chasing them?"
- **Seeks:** A decision, in their words.
- **Why now:** "So, what decision do you feel like you need to make to put yourself in the best possible position to get to that 50K a month ... Oh, I feel like I have to buy." Then the rule: "You now handle the logistics of the objection. The logistics is them agreeing. Oh, well, it's my responsibility. Once they agree, it's my responsibility. Anything they tell you after that, I still need to speak to their partner is purely fear."
- **Listen for:** "I need to do it." "I still want to run it by him" (after agreeing it is their responsibility: fear).
- **If unclear → mirror:** "So what do you want to do from here?"
- **Tone:** Confident.
- **Then:** Yes: next steps. Still the partner, after agreeing it is theirs: the agreeance statement. No: the respectful exit.
- **Routes:** yes: p2-proceed-yes; fear: p3-fear-agree; no: p3-exit-respectful.
- **Fidelity:** `verbatim_adapted`. O12 (partner context). Source: "So, what decision do you feel like you need to make to put yourself in the best possible position to get to that 50K a month".

#### p3-partner-authority: Apohenia route, the decision genuinely sits elsewhere

- **Say:** "That makes sense, and I'd rather do this properly. Would it make sense to get {partner_name} on a short call with both of us, so they hear it first-hand rather than second-hand from you?"
- **Seeks:** A joint call, or a follow-up with a date.
- **Why now:** No frame is applied to a person who does not hold the decision or does not live with the inquiries. The offer's decision roles name the economic decision maker; the honest move is to include them.
- **Listen for:** "Sure, Thursday." "I'll bring it to him myself" (agree a date to reconnect).
- **If unclear → mirror:** "Joint call, or you take it to them and we talk again on a date we pick now?"
- **Tone:** Casual.
- **Then:** Book the joint call or log the follow-up.
- **Routes:** p1-st-book or p3-exit-followup.
- **Fidelity:** `apohenia_addition`.

### 3.5 Fear: agreeance statement, then one certainty frame

"as soon as you get a fear objection you go into what's called an agreeant statement ... a statement that cannot be disagreed with. So, it is an absolute truth that also converts them ... What's their new objection? A lack of certainty ... if somebody had absolute certainty in something, they would buy it." The source names two agreeance families (certainty, which Andrés uses; perspective, which Matt Ryder and Yosh use) and works only the certainty frame. The perspective frames are named only: "Island, what's riskier? fat person $4,000."

#### p3-fear-agree: Agreeance statement (converts every fear objection into certainty)

- **Say:** "Well, that makes sense, man. Because, like, ultimately what you're seeking is like, like certainty, right? Like that you'll actually get the result, that the inquiries actually get {their_word}, that you're not paying for something that just sits there, all that. Is that right?"
- **Seeks:** A yes.
- **Why now:** "'Well, that makes sense, man.' Because like ultimately what you're seeking is like like certainty, right? Like you'll actually get the result. You'll be good. You'll be able to take care of your people, all that jazz. And they go, 'Yes,' what was their original objection? It's too risky. What's their new objection? A lack of certainty."
- **Listen for:** "Yeah, exactly."
- **If unclear → mirror:** "Like, the worry is whether it'll actually work here. Is that fair?"
- **Tone:** Casual, warm.
- **Then:** The honest certainty statement, then the frame.
- **Routes:** p3-fear-honest, then p3-fear-certainty.
- **Fidelity:** `verbatim_adapted`. O22. Source: "that makes sense, man, because like ultimately what you're seeking is like like certainty, right?"

#### p3-fear-honest: What I can give you certainty on (Apohenia addition)

- **Say:** "And I want to be straight with you on that, because I can't promise you appointments or sales, and I won't. What I can commit to is exactly what gets delivered and how we both check it: test inquiries show up in the view with an arrival time, each one lands with a named person who can change its status, the weekly summary exports for a full week, and nothing sensitive from the form appears anywhere. If any of that fails, that's on me to fix inside the scope."
- **Seeks:** Acknowledgement.
- **Why now:** The certainty frame must never turn into an implied guarantee. The offer's acceptance criteria and support terms are the only certainty Jason can honestly offer, so they are said before the frame.
- **Listen for:** "Okay, that's fair."
- **If unclear → mirror:** "The certainty I can give you is on the deliverables and the tests, not on your sales. Does that make sense?"
- **Tone:** Plain, confident.
- **Then:** The frame.
- **Routes:** p3-fear-certainty.
- **Fidelity:** `apohenia_addition` (offer acceptance criteria and support text).

#### p3-fear-certainty: Frame, the certainty frame (B2B version)

- **Say:** "Well, the interesting thing about certainty, right, is that, like, everybody wants it, but nobody can have it, because there are no guarantees in life except for death and taxes. It's kind of like this. If I've got somebody on a straight salary, right, same deposit every two weeks, no delays, no nothing, they just go in and do the same thing every day: do you think that's somebody who's after adventure and taking a shot, or somebody who's after certainty and safety and security? And on the other end, if I've got somebody who bought a franchise, signed a floor plan, put their name over the door and takes the swing every month: do you think that's somebody who's after certainty and safety, or somebody who's after, like, I want to take a shot on myself?"
- **Seeks:** "The salaried one wants safety; the dealer takes the shot."
- **Why now:** "If I have a McDonald's worker, right, who they make two grand a month ... Do you think that's somebody who's after uncertainty and adventure and happiness or somebody who's just after certainty and safety and security? ... if I have somebody who's an entrepreneur ... Do you think that's somebody who's after certainty and safety and security or maybe a little adventure and actually being like, 'I want to take a shot on myself.'" The two figures are neutral; nobody is demeaned. O23 and O24 are classified study only (classification conflict).
- **Listen for:** "Obviously the second."
- **If unclear → mirror:** None. One frame.
- **Tone:** Casual, storytelling.
- **Then:** Pushback.
- **Routes:** p3-fear-pushback.
- **Fidelity:** `verbatim_adapted`. O23, O24 (classification conflict), O22 adjacent. Source: "everybody wants it, but nobody can have it because there are no guarantees in life except for death and taxes ... Do you think that's somebody who's after uncertainty and adventure".

#### p3-fear-pushback: Pushback, can you see how?

- **Say:** "Yeah. Because can you see how, man, you making your decisions based off seeking certainty could have been what's kept the inquiries handled the way they've been for the past {problem_duration}?"
- **Seeks:** "I guess I can see that."
- **Why now:** "Yeah. Because can you see how, man? You making your decisions based off seeking certainty could have been what put you in this position where you've been working this job for the past seven years not actually enjoying it. Oh, I mean, yeah, I guess I can see that."
- **Listen for:** "Yeah, probably." A no: accept and go to the plain CTA or the exit.
- **If unclear → mirror:** None.
- **Tone:** Skeptical, gentle.
- **Then:** Consequence.
- **Routes:** p3-fear-consequence; no: p3-fear-cta or p3-exit-respectful.
- **Fidelity:** `verbatim_adapted`. O25, O30. Source: "can you see how, man? You making your decisions based off seeking certainty could have been what put you in this position".

#### p3-fear-consequence: Consequence, two days, two weeks, two months, even two years

- **Say:** "So in your eyes, like, what do you think happens if you keep using that same way of making decisions, of seeking certainty in things before doing them, for the next two days, two weeks, two months, even two years, man?"
- **Seeks:** A consequence in their words.
- **Why now:** "So, in your eyes, like what do you think happens if you keep using that same way of making decisions of seeking certainty in things before doing them for the next two days, two weeks, two months, even two years, man? Oh, well, I mean, my life would be terrible."
- **Listen for:** "We'd still be here talking about the same inbox."
- **If unclear → mirror:** "Like, does the inbox change on its own?"
- **Tone:** Concern, downward.
- **Then:** Willing to settle.
- **Routes:** p3-fear-settle.
- **Fidelity:** `verbatim_adapted`. O26. Source: "what do you think happens if you keep using that same way of making decisions of seeking certainty in things before doing them for the next two days, two weeks, two months, even two years, man?"

#### p3-fear-settle: Willing to settle?

- **Say:** "Okay. And is that something you're willing to, like, settle for?"
- **Seeks:** A no.
- **Why now:** "Okay. And is that something you're willing to like like like like settle for? Oh, well, no, obviously not."
- **Listen for:** "No." A yes: accept.
- **If unclear → mirror:** None.
- **Tone:** Confident, slow.
- **Then:** CTA. A yes: the respectful exit.
- **Routes:** p3-fear-cta; yes: p3-exit-respectful.
- **Fidelity:** `verbatim_adapted`. P01 (fear context). Source: "And is that something you're willing to like like like like settle for?"

#### p3-fear-cta: CTA, when your head hits that pillow tonight

- **Say:** "Okay. So what decision do you feel like you need to make, man, out of uncertainty, to put {dealership_name} in the best possible position, so when your head hits that pillow tonight, you know you did everything in your power to get to {stated_goal}?"
- **Seeks:** A decision, in their words.
- **Why now:** "So, what decision do you feel like you need to make, man, out of uncertainty to put you in the best possible position so when your head hits that pillow tonight, you know, you did everything in your power to get to that 50k a month goal ... Now, here they can either go, 'Oh, well, I need to buy it' ... Or they go, 'Yeah, man. And you're right, it it's it's just that more fear'"
- **Listen for:** "I should do it." "I still need to think about it."
- **If unclear → mirror:** "So what do you want to do from here?"
- **Tone:** Confident, slow.
- **Then:** Yes: next steps. More fear: the second frame is named but not worked in the source, so the respectful exit with an agreed follow-up. No: the respectful exit.
- **Routes:** yes: p2-proceed-yes; more fear: p3-fear-riskier (named only) then p3-exit-respectful; no: p3-exit-respectful.
- **Fidelity:** `verbatim_adapted`. O12 (fear context), O31 private training adjacent. Source: "what decision do you feel like you need to make, man, out of uncertainty to put you in the best possible position so when your head hits that pillow tonight, you know, you did everything in your power".

#### p3-fear-riskier: Second frame, "what's riskier" (named, not worked in source)

- **Say:** (no live line)
- **Seeks:** Not applicable.
- **Why now:** The source names it only: "If you're using certainty, you're still going to go into what's riskier. Then the other ones are different. Again, if you want to see the certainty ones, go to the group in the description." No wording exists in the transcript, so no worked B2B version is written here. It is registered in `data/source_missing_resources.json` and stays "named, not worked in source" until a real source arrives.
- **Listen for:** Not applicable.
- **If unclear → mirror:** None.
- **Tone:** Not applicable.
- **Then:** The respectful exit.
- **Routes:** p3-exit-respectful.
- **Fidelity:** `excluded_study_only` (named, missing). Source: "you're still going to go into what's riskier. Then the other ones are different."

### 3.6 The exit

#### p3-exit-respectful: Apohenia respectful exit

- **Say:** "Fair enough, man. I'd rather you make the right call for {dealership_name} than the fast one. I appreciate you giving me the time, and I'm easy to find if it comes back around."
- **Seeks:** Nothing.
- **Why now:** The source exits with an apology ("I failed you ... you're going to suffer") after four frames; that is study only. Apohenia exits after one certainty frame, or at any accepted no, without blame in either direction.
- **Listen for:** Not applicable.
- **If unclear → mirror:** None.
- **Tone:** Casual, warm.
- **Then:** If they are open to it, agree a follow-up; otherwise end and log the outcome.
- **Routes:** p3-exit-followup or end.
- **Fidelity:** `apohenia_addition`.

#### p3-exit-followup: Agreed follow-up

- **Say:** "Would it be useful if I checked back in, say, {reconnect window}? You tell me when, and if the answer's still no then, that's completely fine."
- **Seeks:** A date, or a no.
- **Why now:** "That way you leave the door open and you're leaving it on a good note because the last thing that happens is the thing that they're going to remember the most." The follow-up is theirs to accept; a no is logged and honoured.
- **Listen for:** "Try me after month-end." "No, we're good."
- **If unclear → mirror:** "A date, or leave it? Either's fine."
- **Tone:** Casual.
- **Then:** Log the follow-up with the date and what was agreed. End.
- **Routes:** end.
- **Fidelity:** `apohenia_addition` (purpose from U01/U02 follow-up nodes in v0.1).

#### p3-exit-stop: Opt-out at any point

- **Say:** "Understood. I'm stopping right here and taking you off my list. Sorry for the interruption."
- **Seeks:** Nothing.
- **Why now:** Reachable from every node. Suppression persists across imports and channels.
- **Listen for:** Not applicable.
- **If unclear → mirror:** None.
- **Tone:** Calm.
- **Then:** End. Persist suppression.
- **Routes:** end.
- **Fidelity:** `apohenia_addition`.

### 3.7 Excluded from Part 3 (study only)

- **x-four-frames:** "if you do the four frames and they still have not bought, you do an apology and you leave the call." The four-frame ritual is study only; Apohenia runs one certainty frame, and the second is not worked in the source.
- **x-apology:** "You know what, man? I'm I'm really sorry today. I failed you because I know that it would have been the best thing for you for you to do this, but I wasn't able to get you to overcome that fear and I know you're going to suffer because of it. And so I genuinely I want to apologize for that and in the future I hope I can help you as well." Study only; replaced by the respectful exit.
- **x-savings:** "Not a problem, man. Cash on hand then expenses aside, what do you have saved up? Just to see if I can help." O05 study only; replaced by the budget-fit question.
- **x-perspective-frames:** "Island, what's riskier? fat person $4,000." Named only; no wording in the source; registered as missing, never reconstructed.
- **x-dog-wife-tree:** "Whether it's your dog, your wife, your tree, whoever." Dropped from the fairness question as demeaning.
- **x-man-of-household:** "Oh, no. Well, because like, man, I'm the man of the household. Like, I need to provide. I need to be the guy." A prospect answer Andrés expects; never suggested by Jason.

---

## Part 4: OVERLAYS

### 4.1 Tonality map per stage, with body cues (p4-tone-map)

"body language is the remote control to your tone ... when it comes to mastering tonality, what you actually have to learn is body language because then it'll become natural for you." Four tonalities: casual ("this is where you're going to be the majority of the call ... we are confident, we are casual, we do not need them, we are there to help them like a professional"; shoulders back, vital organs exposed, hands visible), curious ("tilt your head and squint your eyes"), skeptical ("lean back and scrunch your eyebrows"), concern ("lean in and raise your eyebrows"; bonus, not every time: a hand near the chest). Inflection is the variation: upward for positive, downward for negative. All cues are instructor-described text, not audio-verified; on a phone call they are self-cues. Text-only practice marks tone "not assessed".

| Stage | Tone | Body cue (self-cue) | Inflection | Source words |
|---|---|---|---|---|
| Outbound open (Part 0) | Casual first, curious second | Shoulders back, hands visible; head tilt on the relevance question | Flat, unhurried | Apohenia overlay on "all of intent is going to be very curious and casual" |
| Intent | Curious and casual | Head tilt, squint | Neutral | "all of intent is going to be very curious and casual" |
| Logical certainty: process, duration, origin | Curious and casual; the origin question shades skeptical | Head tilt; a beat of silence after "what caused you" | Neutral | "the first part getting the root cause ... Also very curious and casual" |
| Logical certainty: like, change | A little skeptical | Lean back, scrunch the brows | Slightly down on "it doesn't sound like it's going terrible then" | "this is where you have to use a little bit more of a skeptical tone" |
| Logical certainty: probe | Mix of skeptical and curious | Alternate | Neutral | "in the probing section, it's going to be a mix of that skeptical and curious" |
| Logical certainty: impact | Concern | Lean in, raise the eyebrows | Down | "Oh, I'm sorry to hear that, man. You lean in, raise your eyebrows." |
| Setter transition | Curious, then casual | Head tilt on the target; open posture on the ask | Up on the target, flat on the booking | "notice I'm making it very theoretical" |
| Closing entry, rationale, pre-handling | Very casual, then extremely curious | Open posture; head tilt | Neutral | "you're going to be extremely curious for most of the pre-handling" |
| What shifted | A little challenging, skeptical | Lean back | Slightly down | "we need to be a little bit more challenging, a little bit more skeptical to once again make them come to our rescue" |
| Usain Bolt, positive future | Curious with upward inflection | Head tilt, squint | Up, "wispy" | "who would you take on that vacation? ... it's an upward inflection" |
| Consequence | Curious, then concern, with downward inflection | Lean in | Down | "and what would happen then? It's very downwards" |
| Commitment triad | Confident, slow | Still, open | Flat | "Are you willing to settle for that?" |
| Pitch, pillars, fit, price | Extremely casual, extremely confident | Open posture, hands visible; silence after the price | Flat | "when we're going into the pitch, this is all just going to be extremely casual and extremely confident" |
| Objections: aside, why, personally | Casual, curious | Open | Neutral | pattern from money logistics |
| Objections: frame | Casual, storytelling | Open | Neutral | "there's two kinds of people" |
| Objections: pushback | Skeptical, light | Lean back | Slightly down | "And why? Cuz like you don't have to, man." |
| Objections: consequence | Concern | Lean in | Down | "because what do you think happens if you don't man?" |
| Objections: CTA | Confident, slow | Still | Flat | "when your head hits that pillow tonight" |
| Exit, opt-out | Casual, warm; calm | Open | Flat | Apohenia |

### 4.2 Five default verbal cues (p4-fillers)

"Step one, you have to choose five filler words that you're most likely to use. So, for example, for me, it's like, 'Yeah, oh, really?' 'Uh-huh.' Right." Jason's proposed defaults (not yet his confirmed preference): **Yeah.** **Okay.** **Right.** **Gotcha.** **That makes sense.** Jason replaces any of these with words he actually uses; the five stay fixed once chosen so the pacing effect is repeatable.

### 4.3 Verbal cueing rules (p4-cue-rules)

1. **Speed sets speed.** "if I want a prospect that just keeps rambling to start speaking faster, then I'll just be like, 'Yeah, really? Uh-huh. Okay, that makes sense. Uh-huh.' ... do it faster." To draw out more: "I'll do it a lot slower ... 'Yeah, right. Uhhuh. Okay, that makes sense.' So, it's slower and it's more spaced out because that's going to make them tell me more."
2. **Inflection sets emotion.** Positive future: "really? Uh-huh. Jesus, man, that's amazing. I love that ... it's always upward and it's a very wispy sound." Consequence: "'Oh, really? I'm sorry to hear that, man.' Uhhuh. That makes sense. So, it's the same verbal cues for the most part. It just goes downwards."
3. **Match, then amplify.** "if you have two waves coming at the same frequency, when they hit each other, they double in size ... They feel this emotion, you mirror them on that same emotion." Never fake an emotion the prospect has not shown; the cue matches what they gave.
4. **Default is slow and spaced** during tangible, experience, process and probe answers; faster only when they ramble; silence for a full beat after every question.
5. **Cues are not agreement.** "That makes sense" acknowledges that they were heard; it is never used to imply a claim is true or that the offer does something the offer text does not say.

### 4.4 The mirror: call-out plus re-ask for every core question (p4-mirror-*)

"there's two parts of the mirror question. Part one is the call out ... Then, step two is you have to ask the same question in a different way. That way, they feel like you're not treating them like a toddler." Design rule: "figuring out number one, what were the answers I needed for my original question ... then the second step ... I have to create other questions that could give me that same answer and it will not always sound the same." Apohenia bound: one call-out and one re-ask per question, then accept; refusal is an answer. Default call-out, verbatim from the source: "No, no, sorry. That wasn't what I meant to ask. Maybe I wasn't being very clear."

| Id | Question | Call-out | Re-ask (same answer type, different words) |
|---|---|---|---|
| p4-mirror-permission | Permission, silence or a non-answer | "Sorry, I'll be quick about it." | "Is now workable for a quick one, or should I try you another time?" |
| p4-mirror-relevance | Relevance check, "why do you want to know?" | "Fair question, it's honestly the whole reason I called." | "When one comes in through the site, does it land with one person, or does it sort of go wherever?" |
| p4-mirror-gatekeeper | Gatekeeper, "what's this regarding?" | "Sure." | "It's about how website inquiries get picked up at {dealership_name}. Who'd actually know that, the GM or the internet or BDC manager?" |
| p4-mirror-tangible-ego | Tangible, ego or process description | "No, no, sorry, that wasn't what I meant to ask. Maybe I wasn't being very clear." | "Can you give me more specifics on that? Like what in specific about how they're handled would you want tightened up, the speed of the first reply, somebody owning each one, seeing what happened to them, like what for you?" |
| p4-mirror-tangible-looking | Tangible, "just looking, seeing what's out there" | "Okay, and I don't want to assume anything, man." | "If this went the way you'd want it to six months from now, what would actually be different about how {dealership_name} handles website inquiries?" |
| p4-mirror-experience-goal | Experience, the goal repeated | "No, no, sorry. That wasn't what I meant to ask. Maybe I wasn't being very clear." | "What I meant to ask is: you having every inquiry {their_word}, what would that, I guess, really allow the store to do that maybe it can't do now?" |
| p4-mirror-adjective | Experience or problem, a vague adjective | "Okay, and when you say {their_word}, just so I understand," | "give me an example of like an instance where that happened, like one from the last couple weeks." |
| p4-mirror-number | Experience, a number without a problem | "Gotcha, and that's the volume." | "What have you seen happen to those {their_answer} that I guess makes you feel like they're not getting {their_word} the way you'd like?" |
| p4-mirror-process | Current process, vague | "Just so I understand, just the structure of it." | "When one lands, who sees it first, how fast, and what happens after hours?" |
| p4-mirror-duration | Process duration, a career story | "Okay." | "So how long has it been that way, as far as just the way inquiries get picked up?" |
| p4-mirror-origin | Origin, a shrug | "Fair enough." | "Like, why in that fashion? Was that a decision at some point, or just how it landed?" |
| p4-mirror-like | Satisfaction, mixed into results | "Separate from the results for a second." | "Do you like it though? Like the process itself?" |
| p4-mirror-change | Change question, a label only | "Okay, and {their_label}," | "how do you mean? Like, describe that for me." |
| p4-mirror-impact | Impact, a bare yes | "Okay." | "Well, how so, just so I understand?" |
| p4-mirror-count | Count, "a handful" | "A handful." | "Like two, five, ten, how many?" |
| p4-mirror-target | Six-month target, vague | "Okay, and 'better' is fair." | "If it was working the way you'd want by, say, March, what would be true that isn't true now?" |
| p4-mirror-gap | Gap, "pretty far" | "Pretty far." | "Meaning what? Like halfway, or not started?" |
| p4-mirror-rationale | Rationale, "just curious" | "Okay, and I don't want to assume." | "Like, what's the main reason you're looking at something different rather than just having the BDC push harder?" |
| p4-mirror-looked | Looked before, "the company looked" | "Okay, company stuff aside though." | "Did you yourself go looking at anything for it, or not really?" |
| p4-mirror-prevented | What prevented you, "just didn't" | "Fair enough." | "Like what in the past got in the way of actually doing something about it?" |
| p4-mirror-shifted | What shifted, "nothing really" | "Okay." | "Like, if cost stopped it before, what's different about cost now?" |
| p4-mirror-criteria | Ideal criteria, "I don't know" | "That's fair." | "What went wrong last time that you'd want to see handled differently this time?" |
| p4-mirror-future | Positive future, the goal repeated | "No, sorry man, I don't think I was clear. What I meant to ask is:" | "{dealership_name} actually having every inquiry {their_word}, how would that impact, I guess, like other parts of the store, just to see if I could even help?" |
| p4-mirror-consequence | Consequence, "much the same" | "Okay. And 'much the same' is fair. What I meant to ask is:" | "what does much the same actually look like day to day, like six or twelve months down the line?" |
| p4-mirror-settle | Willing to settle, hedged | "Straight question." | "Like {stated_consequence}: is that something you're actually willing to settle for?" |
| p4-mirror-why-now | Why now, "just because" | "Okay." | "Like what's different about now versus three months ago?" |
| p4-mirror-fit | Fit, "maybe" | "Okay, and I'd rather hear it now." | "Does this actually address what you told me, or is something missing?" |
| p4-mirror-key | Key to the castle, "all of it" | "All of it, fair." | "Of the three, which one actually matters to you?" |
| p4-mirror-duffel | Duffel bag, hedged | "Forget the money for one second." | "If it cost nothing, would you put it in?" |
| p4-mirror-agree | Agreeance, hedged | "Let me put it plainer." | "The worry is whether it'll actually work here. Is that fair?" |

Source constructions behind the table: "Can you give me more specifics on this?" (V02); "you making more money, man. Like, what would that, I guess, really allow you to do that that maybe you you you can't do now?" (M02); "you actually losing those 50 pounds how would that impact like like other aspects of your life though just to see if I could even help" (M03); "give me an example of like an instance where you may have" (V14); "What was that mean? Like two, five, 10. How many?" (V11); "Okay. So, how long have you been that for as far as that style of selling?" (V05).

### 4.5 Kudos identity lines per avatar (p4-kudos-*)

Template from the source: "Kudos to you for being XYZ. Most people are bad thing. So, kudos for being why." And the casual seed: "'Oh, that's really smart of you.' You see what I just did? ... And I go right into my next question." Apohenia rules: positive only; earned by something the prospect actually said or did; the "most people" contrast is rephrased as a hypothetical so nothing is asserted about other stores; brief; followed immediately by the next question; never repeated in the same call; never attached to buying.

| Id | Avatar | Trigger (something they actually said) | Line |
|---|---|---|---|
| p4-kudos-principal | Dealer principal / owner | They say they still look at the inquiries themselves | "Kudos to you, man, for actually still looking at those yourself. It'd be easy at your level to never see one." |
| p4-kudos-gm | General manager | They say they tried to fix it in-house | "Kudos to you for actually trying to fix that in-house first. It'd be easy to just live with it." |
| p4-kudos-gsm | GSM / sales manager | They say they chase leads personally on slow days | "Kudos to you, man, for picking those up yourself when the floor's slow. It'd be easy to let them sit." |
| p4-kudos-bdc | Internet / BDC manager | They describe a process they built | "Kudos to you for actually building a process for that. It'd be easy to just let the CRM do whatever it does." |
| p4-kudos-casual | Any | They say they looked at how another store handles it, or they are on this call at all | "That's a smart way to look at it." then straight into the next question. |

### 4.6 Alpha and beta calibration, without deception (p4-alpha-beta)

The source: "On every sales call there is a buying pocket ... An alpha is too confident that they feel like they don't need your help. A beta, on the other hand, is too unconfident that even if they think buying is the right decision to make, they don't even trust themselves ... if they're a beta, you have to build them up into that pocket. And if they are an alpha, you have to tear them down." Apohenia keeps the observation and drops the deception:

- **Beta (under-confident):** build up with earned kudos (4.5), with "that's a smart way to look at it" on real reasoning, and by making their goal real with details (4.8). Never a label they did not earn.
- **Alpha (over-confident):** no number deflation ("a million a week", "Only five? Why so low?" are excluded). Instead: stay casual (Andrés's own reason for casual is "we do not need them"), ask for counts and instances ("In the past month, roughly how many came through? And how many turned into an appointment?"), and let the change question and the doubt question do the work. A skeptical echo of a number is allowed only as a true restatement ("Forty a month, and eight set."), never a false one.
- **Neither is a personality tag.** "Alpha" and "beta" are a source study module; in the app they are, at most, a tentative, evidenced, correctable observation about this call, never a stored trait, never a deception detector, never an emotion score.

### 4.7 "Labels have meaning" (p4-labels)

"Labels are extremely important because it makes it a lot easier to ask sharper questions in the future ... 'You feeling like you don't have that efficiency because you just labeled it as efficiency. Does that have an impact?' and then ask something. Now it's a much more sharp question ... the rule of thumb is labels have meaning." Rules: propose one- or two-word labels only after the problem is concrete; the prospect confirms or corrects; the label is stored with its provenance class (prospect said; seller proposed, prospect confirmed); the label is reused verbatim in the impact question, the pillar Y slot, the key-to-the-castle answer and the objection asides; a correction or retraction visibly invalidates it. This is the same panel system as THEIR WORDS and THEIR REFERENCES, not a separate keyword list.

### 4.8 "Make it real" probing rules (p4-make-it-real)

"as soon as you get a goal of this is what I want, you have to make it real. The way you make it real is by breaking down what it actually means. Somebody says, 'I want a car.' What car do you want? What model? How much you going to cost you? ... Cuz that makes it real for them when there's details." And: "when you put a time frame on something, it goes from being a dream to being a goal." And: "whenever you want to go deeper on a specific feeling or a specific thing that they say the easiest way is pick out one adjective whether it's positive or negative ... and then just probe on it." Rules:

1. Every goal gets a horizon (six months, a date) and at least one detail (what it looks like on a Tuesday; who notices; where it shows up).
2. Every problem gets an instance or a count from the last few weeks.
3. Every impact is stored as one of three kinds, never mixed: a verified count, the prospect's estimate, a feeling.
4. Pick one word the prospect used and probe it ("how do you mean by {their_word}?"); never substitute a synonym.
5. Per-unit values (what an appointment is worth to the store) are asked only if the prospect volunteers them and are recorded as their estimate.
6. Making it real never adds a fact the prospect did not give: "Using your Saturday-floor example" is allowed; "since you're the kind of manager who" is not.
7. Voicing it matters: "when you say it ... it makes it a lot more real and it brings it to the surface." Ask, then wait.

### 4.9 Excluded from Part 4 (study only)

- **x-manipulation-frame:** Andrés's own description of the method ("manipulation, darker psychology", identity as "the foundation and deepest level of manipulation") stays in the Source Library verbatim; the live overlays are calibration and listening rules with accepted refusal.
- **x-status-low:** "all you're teaching the prospect subconsciously is this guy's low status." Study only (see 0.4).
- **x-self-hug:** "This is called a self hug. It's self soothing in psychology." Body-language reading of the prospect is a study note; the app never scores body language, tone or deception.
- **x-deflate-fitness:** "10 10 pounds a week. Jesus, man ... No, no, a month. Oh. Oh, I'm I'm I'm sorry." Deliberate false restatement; never used.

---

## Part 5: FIDELITY TABLE

One row per script line, overlay and exclusion in Parts 0 to 4. "Line" is the opening of the Say text (the full line is in its block). "Source" is a short verbatim quote from `sources/source_a.txt` or the record ids whose purpose the line adapts; for exclusions it is the reason. "Conflict" marks a line whose bank record is `study_only` although the line is live by Jason's instruction; the seed cites the adjacent `adapt` ids as primary and puts the conflicting id in the source note.

| Id | Stage | Line | Fidelity | Source quote or record ids | Note |
|---|---|---|---|---|---|
| p0-identify | outbound open | "Hey, is this {prospect_name}?" | verbatim_adapted | I01: "Hey, hey, is this this John?" | |
| p0-who-why | outbound open | "{prospect_name}, it's just Jason here with Apohenia. I work on what happens after ..." | apohenia_addition (self-intro verbatim_adapted) | I01/I02 register: "It's just Andy here from like XYZ fitness company." | Reason clause replaces the documented lead action. No claimed observation unless true. |
| p0-permission | outbound open | "Did I catch you at a bad time, or have you got like a minute?" | apohenia_addition | S03 principle: "notice I'm making it very theoretical ... That triggers a lot of resistance" | Silence is not permission. |
| p0-relevance | outbound open | "Quick one, man. When an inquiry comes in from your website right now, who picks it up first?" | apohenia_addition | L01 purpose: "What are you doing to get leads now?" | Pre-satisfies the current-process question. |
| p0-confirm | outbound open | "Okay, so it lands with {their_answer} first. Is that, is that about right?" | verbatim_adapted | I02: "Is that is that about right?" | |
| p0-kudos | outbound open | "Kudos to you, man, for actually picking those up yourself ..." | verbatim_adapted | Identity section: "And kudos to you, man, for actually having the courage to do something." | Optional, earned only; "most people" clause made hypothetical. No record id for the template. |
| p0-gatekeeper | outbound route | "Totally fair. Who's the person who'd actually know what happens to a website inquiry ..." | apohenia_addition | none | Routed by role; never pitched. |
| p0-gatekeeper-time | outbound route | "When's usually a decent time to catch {owner_name}? And is it alright if I mention ..." | apohenia_addition | none | |
| p0-transfer-reopen | outbound route | "Hey, is this {owner_name}? It's just Jason here with Apohenia. {gatekeeper_name} just passed me across ..." | apohenia_addition | I01 for the identity check | Permission re-asked after a transfer. |
| p0-voicemail | outbound route | "Hey {prospect_name}, it's Jason with Apohenia. I work on what happens after ..." | apohenia_addition | none | Human-left, once; policy decision pending. |
| p0-bad-time | outbound route | "No problem at all. Would like fifteen minutes at a time you pick be easier? You tell me when." | apohenia_addition | S04/S05 register: "How does that sound? would that be awful?" | |
| p0-bad-time-second | outbound route | "All good. I'll leave it there. Thanks for picking up." | apohenia_addition | none | Never a third push. |
| p0-not-interested | outbound route | "Fair enough. The only reason I called is that when a website inquiry lands in a shared inbox, nobody owns it ..." | apohenia_addition | V14/V15 prospect speech (data): "you say insurance and they say I'm not interested" | One line, then accept. |
| p0-optout | outbound route | "Understood. I'm taking you off my list right now ..." | apohenia_addition | none | Suppression persists. |
| p0-no-fit | outbound route | "Got it. Then this genuinely isn't for you ..." | apohenia_addition | none | "I don't have that problem" is complete. |
| p0i-open | inbound open | "Hey, hey, is this {prospect_name}? ... It looks like you {documented_action} ..." | verbatim_adapted | I01, I02: "it looks like you downloaded I think it was a training about possible help like ... Is that is that about right?" | Action filled only from a real record. |
| p0i-intent | inbound open | "Okay, easy, man. Well, just to see if it would even make sense for you, what was your intent behind ..." | verbatim_adapted | I03, I06: "just to see if it would even make sense for you, man. Like, what was your intent behind even like looking to possibly book that call?" | |
| p0i-price-early | inbound open | "Fair question, and I'll get to exactly that. I'd rather not throw a number at you ..." | apohenia_addition | none | Price null cue applies. |
| p1-intent-tangible | intent | "Well, just to see if it would even make sense for you, man: what do you feel like you'd want different, in specific ..." | verbatim_adapted | I06, I03: "what do you feel like you need help with in specific then?"; option list: "is it more kind of have more energy or like feeling better ... like what for you?" | Default improvement form. "Or is it pretty dialed in?" added. |
| p1-intent-tangible-new | intent | "Well, what's your intent of looking at, I guess, possibly even putting something in place ..." | verbatim_adapted | I07: "what's your intent of looking at, I guess, possibly even starting an SMMA, like what are you, I guess, looking to get out of it" | Only when nothing is in place. |
| p1-intent-experience | intent | "What have you seen that I guess makes you feel like maybe the inquiries aren't getting {their_word} the way you'd like?" | verbatim_adapted | I04: "What have you seen that I guess makes you feel like maybe you haven't been losing as much weight as you'd like?" | |
| p1-intent-check | intent | "Great. Gotcha." | verbatim_adapted | I04: "Great. Check. We move on." | Marks both intent nodes satisfied. |
| p1-lc-process | logical certainty | "So what are you doing now, in terms of like, I guess, how the website inquiries get handled ..." | verbatim_adapted | L01, V04: "What are you doing to get leads now? That I guess has you feeling like you're not really getting enough." | Skipped when the relevance answer supplied it. |
| p1-lc-duration | logical certainty | "And how long have you been doing it like that for?" | verbatim_adapted | L02, V05: "And how long have you been doing like that for, right?" | |
| p1-lc-origin | logical certainty | "And what kind of caused you to, like, use that approach in the first place?" | verbatim_adapted | L03, V06: "And what kind of caused you to like like use that approach in the first place." | The doubt question. |
| p1-lc-like | logical certainty | "Okay, fair enough, man. And do you, do you like it? Like, I guess, besides obviously ..." | verbatim_adapted | L04, V07: "do do you do you like it? Like I I I I guess besides obviously not losing the weight necessarily" | |
| p1-lc-like-what | logical certainty | "Oh, what do you like about it, like in specific?" | verbatim_adapted | L05, V07: "Oh, what do you like about it like in specific?" | |
| p1-lc-like-no | logical certainty | "Fair enough. Is there anything about it that does work, even one thing? And if it's honestly nothing, that's an answer." | apohenia_addition | Purpose of L05/L06 | L06 (forcing) excluded. |
| p1-lc-change | logical certainty | "Okay, it doesn't sound like it's going terrible then. I guess, is there anything you would change ..." | verbatim_adapted | L07, V08: "it doesn't sound like it's terrible then. I guess is there is there anything you would change about either like ... if you if you could though" | |
| p1-lc-probe | logical certainty | "What do you mean by that? Like, describe that for me." | verbatim_adapted | L08, L09, V14: "What do you mean by that? How do you mean meaning?"; "describe that for me" | |
| p1-lc-label | logical certainty | "Okay. So, ownership." | verbatim_adapted | V25: "Okay. So efficiency. >> Efficiency. Yeah." | Provenance recorded. |
| p1-lc-problem-duration | logical certainty | "And how long has that been going on for, to where like {stated_problem}?" | verbatim_adapted | L10: "and how long has that been going on for to like you feel like you're not really losing any weight?" | |
| p1-lc-impact | logical certainty | "And without assuming anything, like, because I want to help you with that ..." | verbatim_adapted | L12, L11, L13: "How is that actually had an impact I guess on your ability to like hire a crew and keep expanding?" | B2B impact object. |
| p1-lc-impact-howso | logical certainty | "Well, how so, just so I understand?" | verbatim_adapted | L14: "well how so just so I understand" | |
| p1-lc-count | logical certainty | "In the past month, man, roughly how many inquiries came through the site? ..." | verbatim_adapted | V09, V10, V11, V17: "how many people have you spoken ... how many sales did you get past month? ... Like two, five, 10. How many?" | Estimates recorded as estimates. |
| p1-st-zoom | setter transition | "Okay, so let's zoom out for a second, man. In an ideal world, where do you want to be in six months ..." | verbatim_adapted | S01, V32: "let's zoom out for a second, man. In an ideal world, where do you want to be in six months in terms of like income, for example?" | Metric is operational; the source worked only the income version. |
| p1-st-gap | setter transition | "Okay. How far are you from that now?" | verbatim_adapted | S02, V20: "Okay, how far are you from that now?" | |
| p1-st-willing | setter transition | "Okay, well, sweet. Let's say there was a way to kind of possibly help you get from ..." | verbatim_adapted | S03: "Let's say there was a way to kind of possibly help you ... would you actually be willing to invest in yourself if that's what it took?" | Only on a low signal; no number implied. |
| p1-st-permission | setter transition | "Okay, well, based on what I've heard, man, obviously you mentioning like {stated_problem} ..." | verbatim_adapted | S04: "What I could do from here, man, is I could connect you with John and he could kind of dive a lot deeper ... How does that sound?" | "connect you with John" becomes "set up a proper call". |
| p1-st-awful | setter transition | "How does that sound? Would that be awful?" | verbatim_adapted | S05, S04: "How does that sound? would that be awful?" | Optional register. |
| p1-st-book | setter transition | "Perfect. What works better for you, later this week or early next? And who else should be on it ..." | apohenia_addition | "you just obviously go to the calendar" | Decision roles from the offer. |
| p1-st-notes | setter transition | (not spoken) setter notes | apohenia_addition | I08 purpose: "just a short summary of the notes that the setter left you" | |
| p2-entry-connect | closing entry | "Hey, hey, {prospect_name}, can you hear me? Can you see me? What's up, man, how's it going?" | verbatim_adapted | I05: "Hey, hey, John, can you can you hear me? can you see me? ... What's up, buddy? How's it going?" | |
| p2-entry-recap | closing entry | "Cool, man. Well, let's get right into it. I've got my notes here from when we spoke ..." | verbatim_adapted | I08: "I have some notes here from John ... Is that is that about right?" | "my colleague" becomes "when we spoke". |
| p2-entry-missing | closing entry | "Okay, then let me get it right from you, so nothing's lost in translation ..." | verbatim_adapted | V01, V02: "I want to get it right from you. Like nothing got lost translation ... How can I help you?" | Asks only the missing piece. |
| p2-rationale | emotional certainty | "Okay, and just so I see kind of your point of view, man: besides obviously ..." | verbatim_adapted | E01, V24, V25: "what's the main reasoning of even looking at I guess like a more advanced system ... rather than just, I don't know, like doubling on the referrals ... Like why not just do that?" | "like the average person" dropped. |
| p2-ph-looked | pre-handling | "Okay, and in regards to that, like before you and I were speaking, were you out there looking ..." | verbatim_adapted | E02, V28: "before you and I were speaking were you out there looking for other ways ... or like what were you actually doing about that" | |
| p2-ph-prevented | pre-handling | "What prevented you, man? Why not?" | verbatim_adapted | E03: "what prevented you man? Why not?" | Valid reasons accepted. |
| p2-ph-shifted | pre-handling | "Well, out of curiosity, like what shifted for you now then? ..." | verbatim_adapted | E04: "what shifted for you now then? Like obviously if the money was what was preventing you in the past" | |
| p2-ph-moved | pre-handling | "Okay, did you actually, like, move forward with anything? Or like, what actually ended up happening?" | verbatim_adapted | E05: "did you actually like like move forward with anything or like what actually ended up happening?" | |
| p2-ph-result | pre-handling | "Okay, did you get like a good result or a bad result?" | verbatim_adapted | E06, V27: "did you get like a like a good result or a bad result?" | |
| p2-ph-criteria | pre-handling | "Well, out of curiosity, man, what would you need to see in something this time ..." | verbatim_adapted | E07, V29, V31: "what would you need to see in something this time to be able to be like, oh, I actually feel like they could get me results" | Criteria plugged into pillars only where genuinely met. |
| p2-ph-bottleneck | pre-handling | "Well, I mean, out of curiosity, man, like if you got a good result last time, what even has you looking ..." | verbatim_adapted | E08: "if you got a good result last time, what even has you looking for, I guess, possible more advanced training this time?" | |
| p2-ph-still-active | pre-handling | "Okay, so the auto-reply's doing the first part. What's it not doing, that you'd want done?" | apohenia_addition | none | Existing provider is a fact to build on. |
| p2-ph-no-authority | pre-handling | "Fair enough. Who would actually make that call at {dealership_name} ..." | apohenia_addition | none | Decision roles; no frame. |
| p2-ph-no-problem | pre-handling | "Okay. Then it sounds like this isn't something you need ..." | apohenia_addition | none | |
| p2-ph-declined | pre-handling | "No problem. We'll leave that one." | apohenia_addition | none | Refusal accepted. |
| p2-bolt-permission | emotional certainty | "Well, can I offer you a perspective, man?" | verbatim_adapted | F01: "Well, can I offer you a perspective, man?" | |
| p2-bolt | emotional certainty | "Have you heard the Usain Bolt analogy? ..." | verbatim_adapted | F02: "Have you heard the Usain Bull analogy? ... a strong enough consequence to failure" | Conflict: F02 is study_only. Opt-in only; never auto-recommended. |
| p2-future | positive future | "Let's say there was a way of possibly helping you with actually getting every inquiry {their_word} ..." | verbatim_adapted | F03, F10: "Let's say there was a way of possibly helping you ... What would tangibly be like different for the business at that point?" | |
| p2-future-meaning | positive future | "Well, how do you mean by {their_word}?" | verbatim_adapted | F04, V43: "Well, how do you mean by free?" | |
| p2-future-where | positive future | "Where would that show up first, like on the floor, in the desk log, in the month-end numbers?" | verbatim_adapted | F06, F07: "Well, where would you want to travel, man? ... where do you want to stay?" | Travel probe re-pointed at the store. |
| p2-future-who | positive future | "And who'd notice first, man, like the desk, the salespeople, the owner?" | verbatim_adapted | F08: "Like who would you want to take with you?" | |
| p2-future-growth | positive future | "Ah, and how do you feel like that would impact, like, the store's growth even?" | verbatim_adapted | F11: "how do you feel like that would impact like the company's growth even?" | |
| p2-future-owner | positive future | "And obviously, like, you being the {owner_role}, what would even be different for you ..." | verbatim_adapted | F12, V34, V42: "obviously like you being the owner what would even be different for you like at that point as the owner." | |
| p2-future-feel | positive future | "And how would that, like, feel, man? Like put yourself in those shoes for a second." | verbatim_adapted | F09: "And how would that like feel, man? ... put yourself in those shoes for a second." | Optional; no word required. |
| p2-consequence | consequence | "And what if you don't, man? What happens if {dealership_name} stays on the exact same trajectory ..." | verbatim_adapted | C01, V45: "And what if you don't, man? ... for the next two days, two weeks, two months, even two years, man. Like what would happen at that point?" | |
| p2-consequence-probe | consequence | "What do you mean by that, just so I understand, so I can kind of help you a little bit better?" | verbatim_adapted | C02, C03: "what sports I guess wouldn't you be able to play just so I understand so I can kind of help you a little bit better" | |
| p2-consequence-owner | consequence | "Oh, that makes sense. And what do you think that might even mean for you, like as the {owner_role}?" | verbatim_adapted | C04: "And what do you think that might even mean for you like as the owner?" | |
| p2-consequence-feel | consequence | "And how would you, like, feel at that point?" | verbatim_adapted | C05: "And how would you like like feel at that point?" | Optional; "regret" never required. |
| p2-consequence-mirror | consequence | "Okay. And 'much the same' is fair. What I meant to ask is: what's the day-to-day of that ..." | verbatim_adapted | V45, V46: "What's like the day-to-day gratification of you seeing exactly where you're at 36 12 months down the line" | Yosh's "I met a lot of people" clause dropped. |
| p2-commit-settle | commitment | "So this will sound like an obvious question, man, but I mean, it's really not. Are you willing to settle for that?" | verbatim_adapted | P01, V47: "So this will sound like an obvious question, man ... Are you willing to settle for that?" | |
| p2-commit-why-now | commitment | "And why now? Because like there's always the new-year-new-me guy ..." | verbatim_adapted | P02, V48: "And why now? Because like there's always a new year, new me guy ... Cuz you haven't for the past couple of months if we're being real about it." | |
| p2-commit-responsibility | commitment | "And whose responsibility do you feel like it is to actually say, I've had enough, and make that change?" | verbatim_adapted | P03, V47: "And whose responsibility do you feel like it is to actually say I've had enough and make that change?" | |
| p2-pitch-permission | pitch | "Well, based on what I've heard, man, obviously you mentioning how {stated_problem} ... Would that be appropriate, or what do you want to do from here?" | verbatim_adapted | P04: "If it would be appropriate from here, we could kind of put a game plan together ... Would that be appropriate or what do you want to do from here?" | "for sure could help you" becomes "could genuinely help with that". |
| p2-pen | pitch | "Do you have a pen?" | verbatim_adapted | P11: "Do you have a pend?" | Optional. |
| p2-pillar-1 | pitch | "So the first pillar, man, is the speed, the same-day response. Because you know how you mentioned ..." | verbatim_adapted | P05, P06, P12: "So the first pillar we have, man, is the targeting. Because, you know, you mentioned earlier ... Does that make sense?" | Z = offer delivery text only. |
| p2-pillar-2 | pitch | "Second pillar is the ownership, man. Because you know how you mentioned ..." | verbatim_adapted | P05, P06: "Do you feel like that'd be helpful for you?" | |
| p2-pillar-3 | pitch | "And the third pillar is the visibility. Because you know how you mentioned ..." | verbatim_adapted | P05, P06, P12: "the pillar is X because you now you mentioned problem problem. So what we do is" | Includes the offer's "counts, not projections" clause. |
| p2-fit | pitch | "Now, based on everything we've covered, man, like, do you actually feel like this would get {dealership_name} to that goal ..." | verbatim_adapted | P07: "do you actually feel like this would get you to that goal" | A no is taken at face value. |
| p2-why | pitch | "Okay, then why though? Like, I guess, what do you think is really like the key to the castle for you? ..." | verbatim_adapted | P08: "what what do you think is really like the the the the key to the castle for you? What do you think is going to help you the most?" | |
| p2-personal | pitch | "Yeah, because you having that {key_pillar}, man, what do you feel like that would do for you? Like, even more personally though?" | verbatim_adapted | P09: "because you having that accountability, man, what do you feel like that would do for you? Like even more personally though" | |
| p2-price | decision | "Okay, cool, man. Well, based on everything I've heard, the total investment ... is going to be {approved_price}. How would you like to proceed?" | verbatim_adapted | P10: "the total investment, man, to actually get you to the point of ... is going to be XYZ ... How would you like to proceed?" | Only from a published, non-fictional offer with a price. |
| p2-price-null | decision | "Okay, cool, man. Here's where I'd normally give you the total. I don't have an approved number for your scope yet ..." | apohenia_addition | P10 purpose with the missing-information cue | Price is null today. |
| p2-proceed-yes | decision | "Perfect. Then here's what happens next: I'll send the scope with the acceptance tests in writing today ..." | apohenia_addition | Offer implementation dependencies | |
| p3-rule | objections | (rule) convert every objection to money logistics first, then time or partner, then fear | verbatim_adapted (rule) | "no matter the objection you get, you're always gonna push it to money logistical" | One certainty frame; second not worked. |
| p3-reframe-structure | objections | (rule) frame, pushback, consequence, CTA | verbatim_adapted (rule) | "Number one is the frame ... Step two is the push back ... Number three is the consequence ... step four is the CTA." | |
| p3-money-duffel | money logistics | "Okay, not a problem, man. Money aside for a second: like, if I handed you a duffel bag with the full {approved_price} ..." | verbatim_adapted | O01: "Money aside for a second, like if I gave you a duffel bag with the full 10,000 for the program, would you actually do it?" | No number while the price is null. |
| p3-money-why | money logistics | "Well, why though? Just so I understand." | verbatim_adapted | O02: "Well, why though? Just so I understand." | |
| p3-money-personal | money logistics | "Yeah, because like you having that {key_pillar}, I guess, and everything else, what do you feel that would do for you, like, like more personally though?" | verbatim_adapted | O03: "What do you feel that would do for you like like more personally though?" | |
| p3-money-split | money logistics | "So is it just the initial investment, or if there was a way to possibly break it up ..." | verbatim_adapted | O04: "if there was a way to possibly break it up, would that make it a bit more digestible like financially for you?" | Only approved structures. |
| p3-money-fit | money logistics | "Not a problem, man. Just so I can put something together that actually fits: is there a number the store's comfortable with ..." | apohenia_addition | Purpose of O05 (excluded) | |
| p3-money-plan | money logistics | "Okay. What I could do for you then is {approved payment structure} ... Would that work within your budgetary constraints?" | verbatim_adapted | O06: "Would that work within your budgetary constraints?" | "Paying for itself" only if the prospect made that link. |
| p3-money-proceed | money logistics | "Okay, so with the understanding that you feel this would actually get {dealership_name} to {stated_goal} ... how would you like to proceed?" | verbatim_adapted | O07: "with the understand that you feel would actually get you to that goal ... and obviously that it worked within budgetary constraints, how would you like to proceed?" | |
| p3-time-aside | time | "Well, time aside, man. Like, if you did have the time, would you actually do it? ..." | verbatim_adapted | O08: "Well, time aside, man. Like, if you did have the time, would you actually do like do you actually feel like it'll get you to that goal" | |
| p3-time-why | time | "Well, why though? Like, what do you feel would really help you the most?" | verbatim_adapted | O02 (time context): "Well, why though? Like, what do you feel would really help you the most?" | |
| p3-time-personal | time | "Yeah, because you having that, like, what do you feel like that would do for you, like, even more personally?" | verbatim_adapted | O03 (time context): "what do you feel like that would do for you like even more personally?" | |
| p3-time-frame | time | "Well, can I make a suggestion, man? Because really, in this world, there's two kinds of people ..." | verbatim_adapted | O09: "there's two kinds of people ... which of those two people do you want to be?" | Conflict: O09 is study_only. Primary citation O12. |
| p3-time-pushback | time | "And why? Because, like, you don't have to be, man." | verbatim_adapted | O10: "And why? Cuz like you don't have to, man." | Conflict: O10 is study_only. |
| p3-time-consequence | time | "Yeah. Because what do you think would happen if you didn't, man? ..." | verbatim_adapted | O11: "Because what do you think would happen if you didn't, man? ... What do you think would happen then?" | Conflict: O11 is study_only. Primary citation C01. |
| p3-time-settle | time | "Are you actually willing to, like, settle for that?" | verbatim_adapted | P01: "Are you actually willing to like like like settle for that?" | |
| p3-time-cta | time | "Okay. So in your eyes, like, what decision do you feel like you need to make ..." | verbatim_adapted | O12: "what decision do you feel like you have to make to put yourself in the best possible position ... because that's all you want at the end of the day." | |
| p3-partner-aside | partner | "Partner aside, man. Like, if {partner_name} was on board ... would you actually do it?" | verbatim_adapted | O13: "if she was on board and she was like, 'Honey, you have to do this' ... would you actually do it?" | |
| p3-partner-why | partner | "Well, why though? Like, just so I understand." | verbatim_adapted | O02 (partner context): "Well, why though? Like, just so I understand." | |
| p3-partner-personal | partner | "Because, like, what would that do for you personally?" | verbatim_adapted | O03 (partner context): "because what would that do for you personally?" | |
| p3-partner-no | partner | "Okay, so out of curiosity, man, what happens if you go to {partner_name} ... and they say no?" | verbatim_adapted | O14: "would you kind of like do it anyways or you just kind of like give up on getting to that 50k a month goal" | Conflict: O14 is study_only. Primary citation O13. |
| p3-partner-why-anyway | partner | "Well, why would you?" | verbatim_adapted | O15: "Well, why would you?" | Conflict: O15 is study_only. |
| p3-partner-crown | partner | "Now, have you heard, man, if I can make a suggestion, the saying, like, heavy is the head that wears the crown? ..." | verbatim_adapted | O16: "heavy is the head that wears the crown. The idea of it, man, is like the weight of the crown isn't the crown itself." | Conflict: O16 is study_only. Only for a decision holder. |
| p3-partner-who-does | partner | "Because for you, for example, man, who's going to be the one actually living with how the inquiries get handled ..." | verbatim_adapted | O17: "who's going to be the one actually going through the training ... Is that going to be you or is it going to be your wife" | Conflict: O17 is study_only. |
| p3-partner-responsibility | partner | "So whose responsibility is it to really put {dealership_name} in the best possible position on that? ..." | verbatim_adapted | O18: "So, whose responsibility is it to really put you in the best possible position to learn that skill?" | Conflict: O18 is study_only. Primary citation P03. |
| p3-partner-fair | partner | "Okay. So then, the same way as the king, do you think it'd actually be fair to ..." | verbatim_adapted | O19: "do you think it'd actually be fair to like put the weight of that responsibility on anybody but yourself?" | Conflict: O19 is study_only. "dog, wife, tree" dropped. |
| p3-partner-why-not | partner | "Well, why not, though?" | verbatim_adapted | O20: "Well, why not, though?" | Conflict: O20 is study_only. |
| p3-partner-consequence | partner | "Because what do you think happens if you take that responsibility ... And so what do you think would happen to {dealership_name} then?" | verbatim_adapted | O21: "what do you think happens if you take that responsibility ... And so what do you think would happen to your career then?" | Conflict: O21 is study_only. Primary citation C04. |
| p3-partner-settle | partner | "And are you actually willing to, like, settle for that?" | verbatim_adapted | P01: "And are you actually willing to like like settle for that?" | |
| p3-partner-cta | partner | "So what decision do you feel like you need to make to put {dealership_name} in the best possible position ..." | verbatim_adapted | O12: "So, what decision do you feel like you need to make to put yourself in the best possible position to get to that 50K a month" | After agreed responsibility, a repeated partner line is fear. |
| p3-partner-authority | partner | "That makes sense, and I'd rather do this properly. Would it make sense to get {partner_name} on a short call ..." | apohenia_addition | none | Decision roles; no crown. |
| p3-fear-agree | fear | "Well, that makes sense, man. Because, like, ultimately what you're seeking is like, like certainty, right? ..." | verbatim_adapted | O22: "that makes sense, man, because like ultimately what you're seeking is like like certainty, right?" | |
| p3-fear-honest | fear | "And I want to be straight with you on that, because I can't promise you appointments or sales ..." | apohenia_addition | Offer acceptance criteria and support text | Prevents an implied guarantee. |
| p3-fear-certainty | fear | "Well, the interesting thing about certainty, right, is that, like, everybody wants it, but nobody can have it ..." | verbatim_adapted | O23, O24: "If I have a McDonald's worker ... Do you think that's somebody who's after uncertainty and adventure ... if I have somebody who's an entrepreneur" | Conflict: O23/O24 are study_only. Primary citation O22. Figures re-pointed to salaried worker vs franchise buyer. |
| p3-fear-pushback | fear | "Yeah. Because can you see how, man, you making your decisions based off seeking certainty ..." | verbatim_adapted | O25, O30: "can you see how, man? You making your decisions based off seeking certainty could have been what put you in this position" | |
| p3-fear-consequence | fear | "So in your eyes, like, what do you think happens if you keep using that same way of making decisions ..." | verbatim_adapted | O26: "what do you think happens if you keep using that same way of making decisions of seeking certainty ... for the next two days, two weeks, two months, even two years, man?" | |
| p3-fear-settle | fear | "Okay. And is that something you're willing to, like, settle for?" | verbatim_adapted | P01: "And is that something you're willing to like like like like settle for?" | |
| p3-fear-cta | fear | "Okay. So what decision do you feel like you need to make, man, out of uncertainty ... when your head hits that pillow tonight ..." | verbatim_adapted | O12: "what decision do you feel like you need to make, man, out of uncertainty ... so when your head hits that pillow tonight, you know, you did everything in your power" | |
| p3-fear-riskier | fear | (no live line) | excluded_study_only | "you're still going to go into what's riskier. Then the other ones are different." | Named, not worked in source; registered as missing. |
| p3-exit-respectful | exit | "Fair enough, man. I'd rather you make the right call for {dealership_name} than the fast one ..." | apohenia_addition | none | Replaces the apology. |
| p3-exit-followup | exit | "Would it be useful if I checked back in, say, {reconnect window}? ..." | apohenia_addition | "That way you leave the door open and you're leaving it on a good note" | |
| p3-exit-stop | exit | "Understood. I'm stopping right here and taking you off my list ..." | apohenia_addition | none | Reachable from every node. |
| p4-tone-map | overlay | Tonality map per stage with body cues | verbatim_adapted (overlay) | "body language is the remote control to your tone"; "all of intent is going to be very curious and casual"; "lean back and scrunch your eyebrows"; "lean in and raise your eyebrows" | Instructor-described; not audio-verified. No record ids exist for the tonality chapter. |
| p4-fillers | overlay | "Yeah. Okay. Right. Gotcha. That makes sense." | apohenia_addition | "choose five filler words that you're most likely to use ... 'Yeah, oh, really?' 'Uh-huh.' Right." | Proposed defaults, not Jason's confirmed preference. |
| p4-cue-rules | overlay | Speed, inflection, match-then-amplify, default slow, cues are not agreement | verbatim_adapted (overlay) | "it's slower and it's more spaced out because that's going to make them tell me more"; "it's always upward and it's a very wispy sound" | Rule 5 is an Apohenia addition. |
| p4-mirror-permission | mirror | "Sorry, I'll be quick about it. Is now workable for a quick one, or should I try you another time?" | apohenia_addition | S05 register optional | |
| p4-mirror-relevance | mirror | "Fair question, it's honestly the whole reason I called. When one comes in through the site, does it land with one person, or does it sort of go wherever?" | apohenia_addition | none | |
| p4-mirror-gatekeeper | mirror | "Sure. It's about how website inquiries get picked up at {dealership_name}. Who'd actually know that ..." | apohenia_addition | none | |
| p4-mirror-tangible-ego | mirror | "No, no, sorry, that wasn't what I meant to ask ... Can you give me more specifics on that? ..." | verbatim_adapted | M01 call-out: "No, no, sorry. That that wasn't what I meant to ask. Maybe I wasn't being very clear."; V02: "Can you give me more specifics on this?" | |
| p4-mirror-tangible-looking | mirror | "Okay, and I don't want to assume anything, man. If this went the way you'd want it to six months from now ..." | verbatim_adapted | V02: "do you know what type of help, you know, your specific in order to do that?"; I07: "what are you, I guess, looking to get out of it" | |
| p4-mirror-experience-goal | mirror | "... you having every inquiry {their_word}, what would that, I guess, really allow the store to do that maybe it can't do now?" | verbatim_adapted | M02: "you making more money, man. Like, what would that, I guess, really allow you to do that that maybe you you you can't do now?" | |
| p4-mirror-adjective | mirror | "Okay, and when you say {their_word}, just so I understand, give me an example of like an instance where that happened ..." | verbatim_adapted | V14: "give me an example of like an instance where you may have"; V43: "pick out one adjective ... and then just probe on it" | |
| p4-mirror-number | mirror | "Gotcha, and that's the volume. What have you seen happen to those {their_answer} ..." | verbatim_adapted | I04 re-plug: "You just plug in whatever answer they give into the X" | |
| p4-mirror-process | mirror | "Just so I understand, just the structure of it. When one lands, who sees it first, how fast, and what happens after hours?" | verbatim_adapted | V04: "as far as the full process like you speak within just your structure" | |
| p4-mirror-duration | mirror | "Okay. So how long has it been that way, as far as just the way inquiries get picked up?" | verbatim_adapted | V05: "Okay. So, how long have you been that for as far as that style of selling?" | |
| p4-mirror-origin | mirror | "Fair enough. Like, why in that fashion? Was that a decision at some point, or just how it landed?" | verbatim_adapted | V06: "Like why in that fashion?" | |
| p4-mirror-like | mirror | "Separate from the results for a second. Do you like it though? Like the process itself?" | verbatim_adapted | V07: "Do you like it though? Like do you like the process of which you take prospects to?" | |
| p4-mirror-change | mirror | "Okay, and {their_label}, how do you mean? Like, describe that for me." | verbatim_adapted | L09: "And how do you mean by that? Like describe that for me." | |
| p4-mirror-impact | mirror | "Okay. Well, how so, just so I understand?" | verbatim_adapted | L14: "well how so just so I understand" | |
| p4-mirror-count | mirror | "A handful. Like two, five, ten, how many?" | verbatim_adapted | V11: "What was that mean? Like two, five, 10. How many?" | |
| p4-mirror-target | mirror | "Okay, and 'better' is fair. If it was working the way you'd want by, say, March, what would be true that isn't true now?" | apohenia_addition | S01 purpose; "when you put a time frame on something, it goes from being a dream to being a goal" | |
| p4-mirror-gap | mirror | "Pretty far. Meaning what? Like halfway, or not started?" | verbatim_adapted | V20/V38: "Pretty far. How far are we talking?" | |
| p4-mirror-rationale | mirror | "Okay, and I don't want to assume. Like, what's the main reason you're looking at something different ..." | verbatim_adapted | V24: "Like why get more skills rather than sprint people you speak with?" | |
| p4-mirror-looked | mirror | "Okay, company stuff aside though. Did you yourself go looking at anything for it, or not really?" | verbatim_adapted | V28: "And besides the company training, have you done anything else?" | |
| p4-mirror-prevented | mirror | "Fair enough. Like what in the past got in the way of actually doing something about it?" | verbatim_adapted | E03; reviewed call: "what in the past is from doing that" | |
| p4-mirror-shifted | mirror | "Okay. Like, if cost stopped it before, what's different about cost now?" | verbatim_adapted | E04: "if the time kind of I guess prevented you in the past" | |
| p4-mirror-criteria | mirror | "That's fair. What went wrong last time that you'd want to see handled differently this time?" | verbatim_adapted | E07 purpose | |
| p4-mirror-future | mirror | "No, sorry man, I don't think I was clear. What I meant to ask is: {dealership_name} actually having every inquiry {their_word}, how would that impact ..." | verbatim_adapted | M03: "no sorry man I don't think you understood what I was saying what I meant to ask is ... how would that impact like like other aspects of your life though just to see if I could even help" | Call-out softened from "you didn't understand" to "I wasn't clear". |
| p4-mirror-consequence | mirror | "Okay. And 'much the same' is fair. What I meant to ask is: what does much the same actually look like day to day ..." | verbatim_adapted | V45: "What's like the day-to-day gratification of you seeing exactly where you're at 36 12 months down the line" | "I met a lot of people" dropped. |
| p4-mirror-settle | mirror | "Straight question. Like {stated_consequence}: is that something you're actually willing to settle for?" | verbatim_adapted | P01 | |
| p4-mirror-why-now | mirror | "Okay. Like what's different about now versus three months ago?" | verbatim_adapted | V48: "Why do you now?" | |
| p4-mirror-fit | mirror | "Okay, and I'd rather hear it now. Does this actually address what you told me, or is something missing?" | apohenia_addition | P07 purpose | |
| p4-mirror-key | mirror | "All of it, fair. Of the three, which one actually matters to you?" | verbatim_adapted | P08: "What do you think is going to help you the most?" | |
| p4-mirror-duffel | mirror | "Forget the money for one second. If it cost nothing, would you put it in?" | verbatim_adapted | O01 purpose | |
| p4-mirror-agree | mirror | "Let me put it plainer. The worry is whether it'll actually work here. Is that fair?" | verbatim_adapted | O22 purpose | |
| p4-kudos-principal | kudos | "Kudos to you, man, for actually still looking at those yourself ..." | verbatim_adapted | Kudos template: "Kudos to you for being XYZ. Most people are bad thing. So, kudos for being why." | Contrast made hypothetical. |
| p4-kudos-gm | kudos | "Kudos to you for actually trying to fix that in-house first ..." | verbatim_adapted | Kudos template | |
| p4-kudos-gsm | kudos | "Kudos to you, man, for picking those up yourself when the floor's slow ..." | verbatim_adapted | Kudos template | |
| p4-kudos-bdc | kudos | "Kudos to you for actually building a process for that ..." | verbatim_adapted | Kudos template | |
| p4-kudos-casual | kudos | "That's a smart way to look at it." | verbatim_adapted | "Oh, that's really smart of you ... And I go right into my next question." | Only on real reasoning. |
| p4-alpha-beta | overlay | Calibration without deception | verbatim_adapted (observation) with apohenia_addition (rules) | "there is a buying pocket ... if they're a beta, you have to build them up ... if they are an alpha, you have to tear them down" | Deflation excluded; no personality tag. |
| p4-labels | overlay | Labels have meaning | verbatim_adapted (overlay) | "the rule of thumb is labels have meaning" | Provenance classes from the brief. |
| p4-make-it-real | overlay | Make it real probing rules | verbatim_adapted (overlay) | "The way you make it real is by breaking down what it actually means"; "pick out one adjective ... and then just probe on it" | Rule 6 is an Apohenia addition. |
| x-support-team | excluded | "I'm just with the customer support team." | excluded_study_only | False identity line in the webinar opener. | |
| x-training-to-send | excluded | "Because I might be able to send you like a bit of a more specific training." | excluded_study_only | No authored resource exists; would be an invented claim. | |
| x-benefit-coordinator | excluded | "introduce yourself as you know their benefit coordinator ..." | excluded_study_only | Prospect speech; misleading identity. | |
| x-never-move-on | excluded | "Never move on without getting the answer ... this guy's low status." | excluded_study_only | Refusal is accepted after one mirror. | |
| x-forced-positive | excluded | "it can't be all terrible ... Tell me one thing. We're going to force them down the yes." | excluded_study_only | L06 study_only; production asks once. | |
| x-only-five | excluded | "Only five? Why? Why so low?" | excluded_study_only | D02 study_only; deflation. | |
| x-million-week | excluded | "A million a week? Jesus, man, you guys are crushing it." | excluded_study_only | D01 study_only; deliberate false restatement. | |
| x-average-person | excluded | "just hoping it grows the business like the average person" | excluded_study_only | Unsupported generalization; clause dropped from the rationale line. | |
| x-father | excluded | "Who do you think that could even make you as a father?" | excluded_study_only | D03 study_only; identity shame. | |
| x-person-label | excluded | "Who do you think that would make you as a person? ... a really lazy person" | excluded_study_only | D04 study_only; negative self-label. | |
| x-not-saying-this-is-you | excluded | "I'm not saying this is you ... Well, this kind of is you." | excluded_study_only | Disclaimer used as implication. | |
| x-regret | excluded | forced "regret" future feeling | excluded_study_only | C06 study_only; no emotional word is required. | |
| x-future-identity | excluded | "who do you feel like that would make you as a person? Like being the guy who actually took the opportunity" | excluded_study_only | D05 study_only; identity attached to buying. | |
| x-family-leverage | excluded | "if they are a father, then you use their family as leverage" | excluded_study_only | No biography or family inference. | |
| x-four-frames | excluded | "if you do the four frames and they still have not bought, you do an apology and you leave the call." | excluded_study_only | One certainty frame; second not worked in source. | |
| x-apology | excluded | "I failed you ... I know you're going to suffer because of it." | excluded_study_only | Replaced by the respectful exit. | |
| x-savings | excluded | "Cash on hand then expenses aside, what do you have saved up?" | excluded_study_only | O05 study_only; replaced by budget fit. | |
| x-perspective-frames | excluded | "Island, what's riskier? fat person $4,000." | excluded_study_only | Named only; registered as missing; never reconstructed. | |
| x-dog-wife-tree | excluded | "Whether it's your dog, your wife, your tree, whoever." | excluded_study_only | Demeaning list dropped. | |
| x-man-of-household | excluded | "I'm the man of the household. Like, I need to provide." | excluded_study_only | Expected prospect answer; never suggested. | |
| x-manipulation-frame | excluded | "manipulation, darker psychology"; identity as "the foundation and deepest level of manipulation" | excluded_study_only | Verbatim in the Source Library; not a live rule. | |
| x-status-low | excluded | "all you're teaching the prospect subconsciously is this guy's low status" | excluded_study_only | See x-never-move-on. | |
| x-self-hug | excluded | "This is called a self hug. It's self soothing in psychology." | excluded_study_only | No body-language, tone or deception scoring. | |
| x-deflate-fitness | excluded | "10 10 pounds a week. Jesus, man ... No, no, a month." | excluded_study_only | Deliberate false restatement. | |

---

## Reviewer notes

### Decisions taken in this synthesis

1. **Jason is setter and closer.** The cold call is the setting call (Parts 0 and 1); the booked deeper call is the closing call (Part 2). The closer starts from the recap of his own notes, not from intent.
2. **Outbound open added in front, nothing else moved.** The relevance question is the honest equivalent of the source's documented lead action; its answer pre-satisfies the current-process question so logical certainty enters at the duration question. Everything from the tangible question onward follows Andrés's order and constructions.
3. **Improvement form by default.** A dealership already has an inquiry channel, so the closer-only rule selects the improvement-form intent question; the new-activity form is kept for a store with nothing in place. Never both.
4. **Classification conflicts are flagged, not hidden.** O09 to O11, O14 to O21, O23, O24 and F02 are `study_only` in the bank but part of the method Jason asked to carry over. Each is live here with a conflict flag; the seed cites adjacent `adapt` ids as primary (O12, O13, O22, C01, C04, P03, F01) and records the conflict in the source note, so the existing "no study_only id in a primary citation list" test still holds. The Usain Bolt node is opt-in and never auto-recommended.
5. **One certainty frame, then exit.** The four-frame ritual and the apology are study only; "what's riskier" is named, not worked in the source, so no worked version was invented.
6. **Honest certainty before the certainty frame.** A new line (p3-fear-honest) states the acceptance criteria and support terms so the frame can never read as a guarantee.
7. **Money logistics without the savings question.** O05 is study only and a store's cash position is not the seller's business; a budget-fit question keeps the purpose. Payment structures come only from the approved schedule ("not set" today).
8. **Crown only for a decision holder.** If the decision genuinely sits elsewhere, the authority route books that person; no frame is applied to someone who does not hold the decision.
9. **Kudos contrast made hypothetical.** "Most people are bad thing" becomes "it'd be easy to", so nothing is asserted about other stores.
10. **Every claim is offer text.** The pillar Z slots and the honest-certainty line quote only `delivery`, deliverables, acceptance criteria and support from `data/offers.json`. "For sure could help you" became "could genuinely help with that".
11. **Screen copy rules applied document-wide.** No em or en dashes anywhere, no middle dots, no developer vocabulary in rendered lines, the title uses a colon. Brace slots are chips, not text.
12. **Mirrors bounded.** One call-out plus one re-ask per question, then accept. Refusal and "I don't have that problem" are complete answers. The M03 call-out ("I don't think you understood") was softened to "I don't think I was clear".
13. **Non-money setter transition.** The source names it and never works it; the same construction is used with an operational metric and this is recorded in Part 5.
14. **Existing seed ids are superseded, not reused.** New stable slugs (p0-, p1-, p2-, p3-, p4-, x-) are used so the v0.1 nodes and the v0.2 nodes can coexist during migration; v0.1 follow-up, referral and upsell nodes stay as they are.

### Open questions for the owner (Jason)

1. **Voicemail permission.** The brief lists voicemail as a separate permission dimension and forbids automated drops. May a human leave a first-touch voicemail on a business line with no prior consent? The line exists; whether it may be used is policy.
2. **Self-description wording.** "I work on what happens after somebody sends an inquiry through a dealership's website" avoids implying customers. Confirm the exact phrase you are comfortable saying; "I help dealerships" would imply proof the offer does not have.
3. **Pre-call observation.** May you submit a test inquiry through a store's own website before calling, to make the reason specific? It is a mystery-shop practice with honesty and policy implications; not assumed here.
4. **Register.** "man", "buddy", "like", "I guess" are kept as Andrés's technique. Decide in your own word track whether "man" stays with a GM or dealer principal; the hedges should stay.
5. **Classification conflicts.** Reclassify O09 to O11, O14 to O21, O23, O24 and F02 (or accept the primary-citation workaround in decision 4). Also consider adding records for the kudos template, the per-stage tonality assignment and the verbal-cueing rules, which have no record ids today.
6. **Payment schedule.** The draft offer's schedule is "not set". What structures, if any, will the reviewed offer allow (staged milestones, setup split, monthly from acceptance)? Until then p3-money-plan can only say the schedule is set in the written scope.
7. **Evidence model.** Confirm the engine marks the current-process question evidence-satisfied from the relevance answer and enters logical certainty at the duration question.
8. **Fillers.** The five verbal cues are proposed defaults, not your confirmed preference.
9. **Two-kinds-of-people wording.** The dealership version names the floor, service and the month to close as the reasons a GM is busy. Replace with the reasons you actually hear.
10. **Certainty frame figures.** The salaried worker versus the franchise buyer replaces the McDonald's worker versus the entrepreneur. Confirm the figures are neutral enough for a dealer principal who may have been either.
11. **Analyst coverage.** This synthesis received the intent and outbound analysis (A) in full and the logical-certainty analysis (B) truncated at its branches; the setter-transition, closing, objection and overlay analyses were not delivered. Parts 1.3 to 4 were synthesized directly from the full transcript and cross-checked against the record bank; the round-2 reviewer should read those parts against `sources/source_a.txt` with that in mind.
