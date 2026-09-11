# Local-first plan: mock calls, live calls, and what a subscription can and cannot do

**Status:** proposal for owner decision. Nothing here is built yet except where marked *shipped*.
**Purpose:** record how Jason wants to run this on his own machine, so the next increments serve
that instead of the cloud-first order in the brief.

---

## 1. The correction that shapes everything else

A ChatGPT subscription cannot be wired into this or any other application. Plus and Pro are
licences to use the chat product through its own interface. Programmatic access is a separate
product, billed per token, with its own key. There is no setting, no export, no bridge. Anything
claiming to turn a chat subscription into an API key is either violating the terms or scraping the
session, and both get the account banned.

So the goal is not "reach the subscription from the app". The goal is **not needing a hosted model
at all**, which is achievable here for three reasons:

1. The core loop is deterministic. The script engine, the branch router, the word and reference
   extractors and the drill scoring are ordinary code. They are already written and tested. They
   would not be improved by a language model.
2. Where a model genuinely helps (a prospect to rehearse against, a post-call read of what was
   missed), a model running on Jason's own machine is enough, free, and private.
3. The one thing that truly costs money is carrying voice over the phone network, and no
   subscription of any kind covers that.

---

## 2. What is already shipped

**Mock calls, end to end, zero cost.** Tap the hero on Dial, the countdown arms, the session works
the queue record after record. The simulator plays a synthetic prospect from `data/synthetic_transcripts.json`,
the in-call screen drives the script line, THEIR WORDS fills from the transcript with provenance,
and the outcome sheet writes a disposition. Ten drills on Train. Everything offline.

This is the practice loop Jason asked for and it is usable today. See `RUN_LOCALLY.md`.

---

## 3. Live calls: the two honest paths

### Path A. Self-dialed live calls (recommended, free, small build)

Jason dials on his own cell phone. The app is the cockpit, not the carrier.

| Step | What happens |
|---|---|
| Import | Drop a CSV of real prospects into Queue. Parsed and validated locally, never uploaded. |
| Arm | Tap the hero. The app shows the record, the number, and a `tel:` link. Jason presses call on his phone. |
| In call | The same in-call screen he already practices on. Script line, branches, THEIR WORDS he taps or types as he hears them. |
| End | The same outcome sheet. Disposition, follow-up lane, evidence. |

**Cost: nothing.** No carrier, no key, no per-minute charge. **Build size: small.** The dialer
reducer already models the session states; this adds a third mode alongside demo and live-telephony
that is explicit about the human placing the call.

**What it does not do:** it cannot dial the next record automatically. Jason presses call each time.
That is the trade for it being free, and for a first-time caller it is arguably better, since the
gap between records is where the last call gets logged honestly.

**Policy gate:** the brief forbids live mode without reviewed contact policy and an explicit flag.
Self-dialed calling still touches real people, so it still needs Jason's reviewed policy: consent
posture, do-not-call suppression, calling hours, and what gets recorded. The suppression list and
the policy fields already exist in the schemas. This is an owner decision, not a code decision,
which is why it is written here rather than built.

### Path B. Auto-dialing through a carrier (costs real money, larger build)

For the "dials and dials and dials" session to place calls by itself, something has to be a phone.
That is a telephony provider. US outbound runs roughly one to two cents a minute, billed as you go.
It is not a subscription and no subscription includes it.

It also brings the obligations that come with machine-assisted outbound calling: consent records,
do-not-call scrubbing, calling-hour windows, per-state rules, and recording disclosure. The brief
already anticipates all of this, which is why live mode is gated behind reviewed policy.

**Recommendation: do not build this yet.** Run Path A for a few weeks of real calls first. If the
volume genuinely justifies automation, Path B becomes a clear, scoped increment instead of an
expensive guess.

---

## 4. Local AI, if and when it earns its place

Both of these run on Jason's machine, cost nothing, and send no data anywhere.

| Want | Local tool | What it gives |
|---|---|---|
| A prospect to rehearse against out loud | Ollama with a local model | Mock calls where the other side actually talks back and objects, instead of a scripted transcript |
| Transcription of real calls | whisper.cpp | THEIR WORDS fills itself during live calls instead of Jason typing |
| A post-call read | Ollama, same model | What was missed, which branch was skipped, which reference went unused |

Both speak plain HTTP on localhost. The app would point at `http://localhost:11434` instead of a
vendor, with the same adapter shape the brief already specifies. If the local model is not running,
the feature is simply off and says so. Nothing silently degrades.

The house rules still hold: tone is never scored from audio, no personality labels, coaching never
sees hidden scenario facts, and every model output is marked as a hypothesis rather than a fact
about the prospect.

---

## 5. Suggested order

| Step | What | Cost | Why this order |
|---|---|---|---|
| 0 | Practice on what is shipped | none | The script has to be internalized before real numbers are worth burning |
| 1 | CSV import and self-dialed live mode, with reviewed contact policy | none | Real calls, real outcomes, no spend |
| 2 | Local transcription | none | THEIR WORDS stops being manual |
| 3 | Local roleplay partner and post-call read | none | Practice gets an opponent |
| 4 | Durable storage beyond the browser | none, runs locally | The practice log becomes a record |
| 5 | Carrier auto-dialing, only if volume justifies it | per minute | The only step that ever costs money |

Steps 1 through 4 need no account anywhere. That covers everything Jason described wanting, except
the app pressing the call button for him.
