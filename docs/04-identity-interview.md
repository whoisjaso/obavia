# 04 — Identity interview (seed catalogue and principles)

Owner: M-interview. Seed: `data/identity_interview.json` (`InterviewVersion`, id `identity-interview`, version 1).
Engine: `packages/domain/src/interview/index.ts`. Flow and state machine: `INTERVIEW_FLOW.md`.
Brief authority: `docs/00-codex-master-v2.md` §2, §4, §13–§14, §21 (scenarios 30, 37); framework §7, §11, §12, §15.

## Principles (load-bearing)

1. **No typing.** Every screen is answered by clicking one or more large option cards. Skip is always
   available. The only free text in the module is the optional evidence journal on Today, which is
   not part of the interview.
2. **One question per screen, 3–7 options each,** every option with a short description where it
   helps. Every screen carries an uncertainty option ("I'm not sure yet") and, where sensible, a none
   option ("None of these"). The two are mutually exclusive with each other and with substantive
   options. Multi-select screens state their limit in the help text and again in the UI.
3. **30 base screens + 3 conditional screens = 33.** Conditional screens are declared, not computed:
   `condition: { screen_id, any_of }`. They are visible only while the trigger screen is *answered*
   (not skipped, not invalidated) with one of the listed option ids.
4. **Answered, skipped and not-applicable are persisted separately.** Pressing Next with a valid
   selection records `answered`; Skip records `skipped` with an empty selection; a conditional whose
   condition stops holding becomes `not_applicable`. Progress never counts a skipped screen as
   answered.
5. **Self-described context, not inferred diagnosis.** Faith, ambition and the six human needs are
   things the person says about himself. The six-needs screens are labelled "optional lens, not a
   validated test", and *current* needs and *desired* priorities are two separate screens. Choosing
   "certainty" is not treated as fear; wanting success is not treated as wanting praise (framework §12,
   scenario 37). No option label attaches worth to an answer.
6. **Ordinary progress language.** "Question 12 of 31 visible", "answered / skipped / remaining".
   No readiness percentages, shame scores, streaks or moral labels anywhere in the seed, the profile
   or the UI (tested).
7. **Endorse before use.** The profile is reviewable and unendorsed by default; the training plan and
   Today read only an endorsed profile. Revising answers after endorsement makes the stored
   endorsement stale until endorsed again.
8. **Private.** Answers never enter a prospect's context (`exportForProspectContext` always throws).
   Export and delete are scoped to `interview.*` keys.
9. **Offer honesty.** The dealership inquiry follow-through appears only as a *hypothesis* (draft,
   unapproved). Options exist for "a different offer" and "not decided"; nothing infers a live offer.

## Profile field map

| `profile_field` | Section label | Screens |
|---|---|---|
| `success_definitions` | Definitions of success | goal_meaning, success_business, success_personal, faith_context |
| `beliefs` | Current beliefs about selling | beliefs_selling, beliefs_self |
| `identity` | Chosen identity | identity_primary |
| `chosen_standards` | Chosen standards | identity_statements, standards_evidence, faith_practice_standard (conditional) |
| `current_friction` | Current friction | friction_current, friction_biggest, friction_when |
| `desired_behavior` | Desired behavior | desired_behavior, desired_first_change |
| `preferred_phrases` | Preferred phrases | phrases_ack, phrases_bridge |
| `learning_style` | Learning style | learning_style, repetition_block_length (conditional), learning_feedback |
| `next_drill` | Next drill | next_drill |
| `practice_duration` | Practice duration and rhythm | practice_duration, practice_frequency, practice_cue |
| `difficult_day_minimum` | Difficult-day minimum | difficult_day_minimum |
| `recovery_rule` | Recovery rule | recovery_rule |
| `offer_hypothesis` | Offer hypothesis | offer_hypothesis, offer_materials |
| `delivery_dependencies` | Delivery dependencies | delivery_dependencies, offer_least_control (conditional) |
| `needs_current` | Current needs (optional lens) | needs_current |
| `needs_desired` | Desired priorities (optional lens) | needs_desired |
| `unknowns` | Explicit unknowns | unknowns |

## Screens

Every screen: `allow_skip: true`; uncertainty option id `<screen_id>.unsure`; none option id
`<screen_id>.none` (omitted on `offer_hypothesis`, where "not decided" is a substantive option).
Option ids are globally unique. Order below is presentation order (`order` 0–32).

### 1. `goal_meaning` — base

- **Prompt:** What is the billion-dollar ambition for?
- **Help:** Your own words for the purpose behind the number. This is context you describe, not something the app infers. Choose up to 3.
- **Kind / limit:** multi (max 3)
- **Profile field:** `success_definitions`
- **Options:**
  - `goal_durable` — Building something that outlasts me *(A company that keeps working without my hands on it.)*
  - `goal_provide` — Providing for the people I am responsible for *(Family, team, community.)*
  - `goal_freedom` — Freedom to choose how I spend my time *(Ownership of my calendar and my attention.)*
  - `goal_proof` — Proof of what is possible *(Showing what can be built from where I started.)*
  - `goal_purpose` — Serving a purpose larger than the business *(The number is a means, not the point.)*
  - `goal_fund` — Funding work I believe in *(Capital for causes, people or projects that matter to me.)*
  - `goal_meaning.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `goal_meaning.none` — None of these (none; exclusive)
- **Skip:** allowed

### 2. `success_business` — base

- **Prompt:** This year, business success looks like which of these?
- **Help:** Pick the one that would most clearly tell you the year worked.
- **Kind / limit:** single
- **Profile field:** `success_definitions`
- **Options:**
  - `biz_repeatable_conversation` — A repeatable sales conversation I can run from memory *(The script is internalized, transitions are smooth.)*
  - `biz_first_approved_sale` — A first approved offer sold to a real dealership *(Real scope, real terms, delivered as promised.)*
  - `biz_pipeline` — A steady pipeline of real conversations *(Enough at-bats to learn from, every week.)*
  - `biz_revenue_figure` — A specific revenue figure I have set for myself *(A number you already know; the app does not need it.)*
  - `biz_team_sells` — A team that can sell without me *(The process works in other hands.)*
  - `success_business.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `success_business.none` — None of these (none; exclusive)
- **Skip:** allowed

### 3. `success_personal` — base

- **Prompt:** Personal success this year looks like which of these?
- **Help:** Choose up to 2.
- **Kind / limit:** multi (max 2)
- **Profile field:** `success_definitions`
- **Options:**
  - `pers_presence` — Being present with the people I love *(Work stays in its lane.)*
  - `pers_health` — Health and energy that hold up *(Sustainable pace, ordinary rest.)*
  - `pers_integrity` — Doing what I said I would do *(Word and action match.)*
  - `pers_growth` — Learning a skill I did not have before *(Selling, specifically.)*
  - `pers_peace` — A calmer mind *(Fewer open loops, clearer days.)*
  - `success_personal.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `success_personal.none` — None of these (none; exclusive)
- **Skip:** allowed

### 4. `faith_context` — base

- **Prompt:** How does your faith relate to this work?
- **Help:** Self-described context only. Nothing here is interpreted or scored.
- **Kind / limit:** single
- **Profile field:** `success_definitions`
- **Options:**
  - `faith_reason` — It is the reason behind the goal *(The purpose comes first; the business serves it.)*
  - `faith_people` — It shapes how I treat people *(Including prospects who say no.)*
  - `faith_identity` — It is part of who I am and hard to separate from work *(It shows up whether I plan it or not.)*
  - `faith_private` — It is a private practice, separate from work *(Important to me, kept apart from the business.)*
  - `faith_context.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `faith_context.none` — None of these (none; exclusive)
- **Skip:** allowed

### 5. `faith_practice_standard` — conditional

- **Prompt:** How does your faith show up as a practice standard?
- **Help:** A standard you choose for yourself. It becomes part of your training plan only if you endorse it.
- **Kind / limit:** single
- **Profile field:** `chosen_standards`
- **Condition:** shown when `faith_context` is answered with any of `faith_reason`, `faith_people`, `faith_identity`
- **Options:**
  - `faithstd_keep_word` — I keep my word: the drill I said I would do is the drill I do *(Faithfulness in small, repeated things.)*
  - `faithstd_dignity` — I treat every prospect with dignity, including when the answer is no *(A no-fit case is handled with the same respect.)*
  - `faithstd_truth` — I tell the truth about what I can deliver *(No claim goes out that I cannot back.)*
  - `faithstd_rest` — I rest one day a week *(Practice pauses without erasing anything.)*
  - `faithstd_quiet` — I start each session with a moment of quiet *(A short pause before the first line.)*
  - `faith_practice_standard.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `faith_practice_standard.none` — None of these (none; exclusive)
- **Skip:** allowed

### 6. `beliefs_selling` — base

- **Prompt:** What do you currently believe about selling?
- **Help:** Current beliefs, not the beliefs you think you should have. Choose up to 3.
- **Kind / limit:** multi (max 3)
- **Profile field:** `beliefs`
- **Options:**
  - `bel_helping_decide` — It is helping someone decide *(Questions that bring the real situation into view.)*
  - `bel_numbers` — It is mostly a numbers game *(Enough attempts and the results follow.)*
  - `bel_right_order` — It is asking the right questions in the right order *(Sequence matters as much as words.)*
  - `bel_still_learning_trust` — It is something I am still learning to trust *(The process works for others; I am proving it for myself.)*
  - `bel_performance` — It is a performance I put on *(A role that is not quite me yet.)*
  - `bel_repetition_skill` — It is a skill built by repetition *(Like call-center work: reps first, fluency after.)*
  - `beliefs_selling.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `beliefs_selling.none` — None of these (none; exclusive)
- **Skip:** allowed

### 7. `beliefs_self` — base

- **Prompt:** What do you believe about yourself as a seller right now?
- **Kind / limit:** single
- **Profile field:** `beliefs`
- **Options:**
  - `self_learn_like_before` — I can learn this the way I learned call-center work *(Repetition got me fluent before; it will again.)*
  - `self_know_freeze` — I know the material but freeze at transitions *(The words are there; the bridge is not yet.)*
  - `self_strong_live_underprepared` — I am strong live but under-prepared *(Good in the moment, thin on rehearsal.)*
  - `self_builder` — I am better at building than talking *(The tool gets built before the call gets made.)*
  - `self_steady` — I am steady and just need the reps *(No drama; the work is the work.)*
  - `beliefs_self.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `beliefs_self.none` — None of these (none; exclusive)
- **Skip:** allowed

### 8. `identity_statements` — base

- **Prompt:** Which of these statements do you choose as yours?
- **Help:** These are standards you set for yourself. Each one you endorse later becomes a training-plan item. Choose up to 4.
- **Kind / limit:** multi (max 4)
- **Profile field:** `chosen_standards`
- **Options:**
  - `std_prepare` — I prepare *(I rehearse the approved opening and one branch before I talk to anyone.)*
  - `std_one_question` — I ask one clear question at a time *(One question, then I stop and wait.)*
  - `std_listen_first` — I listen before I answer *(I let the answer finish before the next line.)*
  - `std_follow_script` — I follow the script until I have earned the right to vary it *(Exact words first; variation later.)*
  - `std_respect_no_fit` — I respect a no-fit case *(Ending politely is a good outcome when there is no gap.)*
  - `std_call_before_build` — I make the call before I build the tool *(Conversations first; software after.)*
  - `std_keep_word` — I keep my word to myself *(The drill I said I would do is the drill I do.)*
  - `identity_statements.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `identity_statements.none` — None of these (none; exclusive)
- **Skip:** allowed

### 9. `identity_primary` — base

- **Prompt:** Which one statement comes first this month?
- **Help:** The one you would keep if you could keep only one.
- **Kind / limit:** single
- **Profile field:** `identity`
- **Options:**
  - `primary_prepare` — I prepare *(First this month.)*
  - `primary_one_question` — I ask one clear question at a time *(First this month.)*
  - `primary_listen_first` — I listen before I answer *(First this month.)*
  - `primary_follow_script` — I follow the script until I have earned the right to vary it *(First this month.)*
  - `primary_respect_no_fit` — I respect a no-fit case *(First this month.)*
  - `primary_call_before_build` — I make the call before I build the tool *(First this month.)*
  - `primary_keep_word` — I keep my word to myself *(First this month.)*
  - `identity_primary.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `identity_primary.none` — None of these (none; exclusive)
- **Skip:** allowed

### 10. `standards_evidence` — base

- **Prompt:** What counts as evidence that you kept your standard today?
- **Help:** Observable things, not feelings about the day. Choose up to 3.
- **Kind / limit:** multi (max 3)
- **Profile field:** `chosen_standards`
- **Options:**
  - `ev_completed_drill` — A completed drill *(Finished, not just opened.)*
  - `ev_transition_no_pause` — A transition I made without a pause *(Answer ended, next question followed.)*
  - `ev_clarified_vague` — A vague answer I clarified without assuming *(I asked instead of guessing.)*
  - `ev_respected_no_fit` — A no-fit case I respected *(I ended it politely and cleanly.)*
  - `ev_call_made` — A real conversation I had *(Later increment; still counts when it happens.)*
  - `ev_one_change` — One behavior I changed on purpose *(Named before, done after.)*
  - `standards_evidence.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `standards_evidence.none` — None of these (none; exclusive)
- **Skip:** allowed

### 11. `friction_current` — base

- **Prompt:** What gets in the way right now?
- **Help:** Choose up to 3.
- **Kind / limit:** multi (max 3)
- **Profile field:** `current_friction`
- **Options:**
  - `fr_no_script` — No script I own yet *(Nothing internalized, nothing to fall back on.)*
  - `fr_transitions` — Unclear answer-to-next-question transitions *(I know the questions, not the bridges.)*
  - `fr_unapproved_offer` — No approved offer *(Price, scope and evidence are not settled.)*
  - `fr_few_reps` — Too few focused repetitions *(I study more than I drill.)*
  - `fr_building` — Building software instead of having conversations *(Preparation that replaces the call.)*
  - `fr_vocab` — Vocabulary reminders are not at hand when I need them *(The words are somewhere else.)*
  - `friction_current.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `friction_current.none` — None of these (none; exclusive)
- **Skip:** allowed

### 12. `friction_biggest` — base

- **Prompt:** Which one blocks you the most today?
- **Kind / limit:** single
- **Profile field:** `current_friction`
- **Options:**
  - `big_no_script` — No script I own yet
  - `big_transitions` — Unclear transitions
  - `big_unapproved_offer` — No approved offer
  - `big_few_reps` — Too few focused repetitions
  - `big_building` — Building instead of calling
  - `friction_biggest.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `friction_biggest.none` — None of these (none; exclusive)
- **Skip:** allowed

### 13. `friction_when` — base

- **Prompt:** When does the friction show up most?
- **Kind / limit:** single
- **Profile field:** `current_friction`
- **Options:**
  - `when_before_start` — Before I start *(I delay the session or the call.)*
  - `when_after_answer` — Right after a prospect answers *(The pause before the next question.)*
  - `when_price` — When a price question comes early *(Nothing approved to say.)*
  - `when_off_script` — When I am asked something the script does not cover *(I lose the thread.)*
  - `when_after_no` — After a declined call *(I want to change the process instead of repeating it.)*
  - `friction_when.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `friction_when.none` — None of these (none; exclusive)
- **Skip:** allowed

### 14. `desired_behavior` — base

- **Prompt:** What do you want to be doing instead, most days?
- **Help:** Choose up to 3.
- **Kind / limit:** multi (max 3)
- **Profile field:** `desired_behavior`
- **Options:**
  - `want_opening_memory` — Running the exact opening from memory *(No screen, no notes.)*
  - `want_transition_flow` — Moving from an answer to the next question without a pause *(Acknowledge, refer back, ask.)*
  - `want_reps_before_build` — Completing focused reps before building anything *(Drill first, tool second.)*
  - `want_review_change` — Reviewing one conversation and changing one thing *(One correction at a time.)*
  - `want_permission` — Asking permission before presenting *(Earning the pitch instead of forcing it.)*
  - `want_calling_block` — Running an approved calling block on schedule *(Not available until a later increment; still a goal.)*
  - `desired_behavior.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `desired_behavior.none` — None of these (none; exclusive)
- **Skip:** allowed

### 15. `desired_first_change` — base

- **Prompt:** Which one behavior do you want to change first?
- **Kind / limit:** single
- **Profile field:** `desired_behavior`
- **Options:**
  - `first_opening` — Say the opening from memory *(Exact words, out loud.)*
  - `first_transition` — Bridge one answer to the next question *(The transition that trips me.)*
  - `first_drill_before_build` — Do the drill before I open the editor *(Order of operations.)*
  - `first_review` — Review one conversation before the next *(When there is one to review.)*
  - `first_one_question` — Ask one question and stop *(No stacking questions.)*
  - `desired_first_change.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `desired_first_change.none` — None of these (none; exclusive)
- **Skip:** allowed

### 16. `phrases_ack` — base

- **Prompt:** Which acknowledgment phrases sound like you?
- **Help:** The first five are proposed defaults from the framework, not your selections until you pick them. Choose up to 5.
- **Kind / limit:** multi (max 5)
- **Profile field:** `preferred_phrases`
- **Options:**
  - `ack_right` — Right *(Proposed default.)*
  - `ack_okay` — Okay *(Proposed default.)*
  - `ack_i_see` — I see *(Proposed default.)*
  - `ack_makes_sense` — That makes sense *(Proposed default.)*
  - `ack_go_on` — Go on *(Proposed default.)*
  - `ack_got_it` — Got it *(Alternative.)*
  - `ack_understood` — Understood *(Alternative.)*
  - `phrases_ack.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `phrases_ack.none` — None of these (none; exclusive)
- **Skip:** allowed

### 17. `phrases_bridge` — base

- **Prompt:** How do you prefer to bridge from their answer to your next question?
- **Kind / limit:** single
- **Profile field:** `preferred_phrases`
- **Options:**
  - `bridge_ack_refer_ask` — Acknowledge, refer to what they said, then ask *(The framework interjection bridge.)*
  - `bridge_ack_ask` — Acknowledge, then ask directly *(Short and quick.)*
  - `bridge_echo_ask` — Repeat their key word, then ask *(A one-word mirror before the question.)*
  - `bridge_summary_ask` — Give a brief summary, then ask *(Two sentences at most.)*
  - `phrases_bridge.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `phrases_bridge.none` — None of these (none; exclusive)
- **Skip:** allowed

### 18. `learning_style` — base

- **Prompt:** How have you learned best before?
- **Help:** Your call-center and AutoZone experience counts here. Choose up to 3.
- **Kind / limit:** multi (max 3)
- **Profile field:** `learning_style`
- **Options:**
  - `repetition_blocks` — Repetition blocks *(The call-center / AutoZone model: the same lines, many times, until they are automatic.)*
  - `learn_whole_then_parts` — Reading the whole script first, then drilling parts *(See the map, then walk the roads.)*
  - `learn_one_correction` — Being corrected on one thing at a time *(A single focus per drill.)*
  - `learn_hear_then_say` — Hearing it out loud, then saying it *(Ear first, mouth second.)*
  - `learn_write_out` — Writing it out by hand *(Slow, but it sticks.)*
  - `learn_live_pressure` — Learning live under pressure *(Real stakes teach fastest.)*
  - `learning_style.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `learning_style.none` — None of these (none; exclusive)
- **Skip:** allowed

### 19. `repetition_block_length` — conditional

- **Prompt:** How long is one repetition block for you?
- **Help:** A block is one uninterrupted run at the same material.
- **Kind / limit:** single
- **Profile field:** `learning_style`
- **Condition:** shown when `learning_style` is answered with any of `repetition_blocks`
- **Options:**
  - `block_5` — About 5 minutes *(Short bursts, several a day.)*
  - `block_10` — About 10 minutes *(One focused run.)*
  - `block_20` — About 20 minutes *(Long enough to get warm.)*
  - `block_30` — 30 minutes or more *(A full sitting.)*
  - `block_until_done` — However long the drill takes *(Count drills, not minutes.)*
  - `repetition_block_length.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `repetition_block_length.none` — None of these (none; exclusive)
- **Skip:** allowed

### 20. `learning_feedback` — base

- **Prompt:** How do you want feedback during practice?
- **Kind / limit:** single
- **Profile field:** `learning_style`
- **Options:**
  - `fb_one_at_a_time` — One correction at a time *(Fix one thing, then the next.)*
  - `fb_short_list` — A short list after each drill *(Two or three notes, no more.)*
  - `fb_on_request` — Only when I ask *(Let me finish the run first.)*
  - `fb_demo_then_copy` — Show me, then I copy *(Demonstration first.)*
  - `learning_feedback.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `learning_feedback.none` — None of these (none; exclusive)
- **Skip:** allowed

### 21. `next_drill` — base

- **Prompt:** Which drill do you want to run first?
- **Kind / limit:** single
- **Profile field:** `next_drill`
- **Options:**
  - `drill_opening_recall` — Exact opening recall *(Say the approved opening word for word.)*
  - `drill_transition` — One answer-to-question transition *(Acknowledge, refer back, ask the next one.)*
  - `drill_random_node` — Random node lookup *(Any node, exact line, no hesitation.)*
  - `drill_mirror_duel` — Mirror duel *(Different questions seeking the same answer type.)*
  - `drill_answer_category` — Answer-category recognition *(Hear the answer, name the category, choose the branch.)*
  - `next_drill.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `next_drill.none` — None of these (none; exclusive)
- **Skip:** allowed

### 22. `practice_duration` — base

- **Prompt:** How long is a normal practice session for you?
- **Help:** You choose the duration; it becomes the plan’s duration. It can be changed later.
- **Kind / limit:** single
- **Profile field:** `practice_duration`
- **Options:**
  - `dur_10` — 10 minutes
  - `dur_15` — 15 minutes
  - `dur_20` — 20 minutes
  - `dur_30` — 30 minutes
  - `dur_45` — 45 minutes
  - `practice_duration.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `practice_duration.none` — None of these (none; exclusive)
- **Skip:** allowed

### 23. `practice_frequency` — base

- **Prompt:** How often do you intend to practice?
- **Kind / limit:** single
- **Profile field:** `practice_duration`
- **Options:**
  - `freq_daily` — Every day
  - `freq_weekdays` — Weekdays
  - `freq_five_chosen` — Five sessions a week, days I choose
  - `freq_three` — Three sessions a week
  - `freq_twice_daily_short` — Twice a day, short sessions
  - `practice_frequency.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `practice_frequency.none` — None of these (none; exclusive)
- **Skip:** allowed

### 24. `practice_cue` — base

- **Prompt:** What starts a practice session?
- **Help:** The cue that tells you it is time. The plan attaches each standard to it.
- **Kind / limit:** single
- **Profile field:** `practice_duration`
- **Options:**
  - `cue_first_thing` — First thing in the morning *(Before anything else opens.)*
  - `cue_before_build` — Before I open the code editor *(Drill, then build.)*
  - `cue_after_lunch` — After lunch *(A fixed midday slot.)*
  - `cue_end_of_day` — End of the workday *(Close the day with reps.)*
  - `cue_calendar_block` — A calendar block I set *(Whatever time I put on the calendar.)*
  - `practice_cue.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `practice_cue.none` — None of these (none; exclusive)
- **Skip:** allowed

### 25. `difficult_day_minimum` — base

- **Prompt:** On a difficult day, what is the minimum that still counts?
- **Help:** A minimum-action day keeps your progress. Nothing is deleted for missing more.
- **Kind / limit:** single
- **Profile field:** `difficult_day_minimum`
- **Options:**
  - `min_opening_once` — Say the opening once, out loud
  - `min_one_transition` — One transition drill, about three minutes
  - `min_read_primary` — Read the primary line of one node
  - `min_open_cue` — Open Today and read the cue
  - `min_one_evidence` — Write one line of evidence
  - `difficult_day_minimum.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `difficult_day_minimum.none` — None of these (none; exclusive)
- **Skip:** allowed

### 26. `recovery_rule` — base

- **Prompt:** When a practice is missed, what is your recovery rule?
- **Help:** A missed practice does not erase previous work.
- **Kind / limit:** single
- **Profile field:** `recovery_rule`
- **Options:**
  - `rec_resume_next` — Resume the next day with the normal plan, no make-up
  - `rec_minimum_then_resume` — Do the difficult-day minimum, then resume
  - `rec_shorten` — Shorten the next session and resume
  - `rec_review_adjust` — Review the plan and adjust duration or frequency
  - `recovery_rule.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `recovery_rule.none` — None of these (none; exclusive)
- **Skip:** allowed

### 27. `offer_hypothesis` — base

- **Prompt:** Which offer are you working from right now?
- **Help:** No offer is approved yet. The dealership follow-through script is a draft research hypothesis, not a live offer.
- **Kind / limit:** single
- **Profile field:** `offer_hypothesis`
- **Options:**
  - `dealership_follow_through` — Dealership inquiry follow-through (hypothesis) *(Draft, unapproved. Used for practice only.)*
  - `offer_different` — I have a different offer in mind *(Not in the app yet; to be written in Offer Studio.)*
  - `offer_not_decided` — Not decided; I want conversations first *(Discovery before commitment.)*
  - `offer_hypothesis.unsure` — I'm not sure yet (uncertainty; exclusive)
- **Skip:** allowed

### 28. `offer_least_control` — conditional

- **Prompt:** For dealership follow-through, which dependency is least in your control?
- **Kind / limit:** single
- **Profile field:** `delivery_dependencies`
- **Condition:** shown when `offer_hypothesis` is answered with any of `dealership_follow_through`
- **Options:**
  - `lc_crm_access` — Dealership CRM access *(Permissions and integrations on their side.)*
  - `lc_lead_quality` — Lead data quality *(What arrives in the inbox.)*
  - `lc_staff_follow_up` — Dealership staff following up *(Human behavior after the handoff.)*
  - `lc_decision_timeline` — The dealership decision timeline *(Owners, partners, budget cycles.)*
  - `lc_my_build_time` — My own build time *(Closest to my control, still finite.)*
  - `offer_least_control.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `offer_least_control.none` — None of these (none; exclusive)
- **Skip:** allowed

### 29. `offer_materials` — base

- **Prompt:** What do you have for the offer today?
- **Help:** Unapproved drafts count as drafts, not as evidence. Choose up to 3.
- **Kind / limit:** multi (max 3)
- **Profile field:** `offer_hypothesis`
- **Options:**
  - `mat_problem_statement` — A problem statement *(What the offer is supposed to fix.)*
  - `mat_draft_price` — A draft price (unapproved) *(A number you are testing, not quoting.)*
  - `mat_capability_list` — A draft capability list *(What it could do, not what is promised.)*
  - `mat_past_evidence` — Evidence from past work, not verified for this offer *(Usable as study, not as a claim.)*
  - `mat_delivery_plan` — A rough delivery plan *(Who does what after a yes.)*
  - `offer_materials.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `offer_materials.none` — None of these (none; exclusive)
- **Skip:** allowed

### 30. `delivery_dependencies` — base

- **Prompt:** What does delivering the offer depend on?
- **Help:** Choose up to 4.
- **Kind / limit:** multi (max 4)
- **Profile field:** `delivery_dependencies`
- **Options:**
  - `dep_crm_access` — Dealership CRM or system access
  - `dep_lead_quality` — Lead data quality
  - `dep_staff_follow_up` — Dealership staff following the process
  - `dep_build_time` — My own build time
  - `dep_partner` — A partner or contractor
  - `dep_telephony_compliance` — Telephony and compliance setup
  - `delivery_dependencies.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `delivery_dependencies.none` — None of these (none; exclusive)
- **Skip:** allowed

### 31. `needs_current` — base

- **Prompt:** Optional lens: which of these needs most drive you right now?
- **Help:** Optional lens, not a validated test. The six human needs are one instructor’s framework; picking one proves nothing about you. Choose up to 2.
- **Kind / limit:** multi (max 2)
- **Profile field:** `needs_current`
- **Options:**
  - `now_certainty` — Certainty *(Stability, predictability, knowing what comes next.)*
  - `now_variety` — Uncertainty / variety *(Change, novelty, surprise.)*
  - `now_connection` — Love / connection *(Closeness with people.)*
  - `now_growth` — Growth *(Getting better at something.)*
  - `now_significance` — Significance *(Mattering, being seen as capable.)*
  - `now_contribution` — Contribution *(Giving beyond yourself.)*
  - `needs_current.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `needs_current.none` — None of these (none; exclusive)
- **Skip:** allowed

### 32. `needs_desired` — base

- **Prompt:** Optional lens: which needs would you like to lead in the coming year?
- **Help:** Optional lens, not a validated test. Desired priorities are kept separate from current needs. Choose up to 2.
- **Kind / limit:** multi (max 2)
- **Profile field:** `needs_desired`
- **Options:**
  - `want_certainty` — Certainty *(Stability, predictability, knowing what comes next.)*
  - `want_variety` — Uncertainty / variety *(Change, novelty, surprise.)*
  - `want_connection` — Love / connection *(Closeness with people.)*
  - `want_growth` — Growth *(Getting better at something.)*
  - `want_significance` — Significance *(Mattering, being seen as capable.)*
  - `want_contribution` — Contribution *(Giving beyond yourself.)*
  - `needs_desired.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `needs_desired.none` — None of these (none; exclusive)
- **Skip:** allowed

### 33. `unknowns` — base

- **Prompt:** What do you not know yet?
- **Help:** Naming an unknown is progress; it becomes an explicit item on your profile. Choose up to 4.
- **Kind / limit:** multi (max 4)
- **Profile field:** `unknowns`
- **Options:**
  - `unk_offer_right` — Whether the offer hypothesis is right
  - `unk_price` — What the price should be
  - `unk_who_first` — Which dealerships to talk to first
  - `unk_how_long` — How long internalizing the script will take
  - `unk_keep_routine` — Whether I will keep the routine
  - `unk_opening_reaction` — How prospects will react to the opening
  - `unknowns.unsure` — I'm not sure yet (uncertainty; exclusive)
  - `unknowns.none` — None of these (none; exclusive)
- **Skip:** allowed

## Training-plan translation (from endorsed standards)

Each option chosen on `identity_statements` (and `faith_practice_standard`) maps to a template in
`STANDARD_TEMPLATES`. Duration comes from `practice_duration`, frequency from `practice_frequency`,
the cue from `practice_cue`, the recovery rule from `recovery_rule`. Example (brief §4):

| Standard | Cue | Exact action | Frequency / duration | Completion evidence | Review | Recovery |
|---|---|---|---|---|---|---|
| I prepare | Start-of-session cue: *chosen cue* | Rehearse the approved opening and one branch, out loud, exact words. | *chosen frequency* · *chosen minutes* | A completed drill: the opening said in full and one branch completed. Not time on page. | Note the one line that hesitated; it is tomorrow's first repetition. | *chosen recovery rule* — a missed practice does not erase previous work. |

## Wording review checklist

- No "readiness", "shame", "lazy", "failure" framing (unit test `uses no shame or readiness language`).
- Faith options are descriptive; the conditional asks for a *practice standard the person chooses*.
- Six-needs screens carry the "optional lens, not a validated test" help text (unit-tested).
- Offer options never imply approval; the hypothesis is labelled draft/unapproved in the description.
