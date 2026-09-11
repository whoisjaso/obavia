# Run Apohenia on your own machine

Everything in this document works with **no accounts, no API keys, no cloud services, and no
per-minute charges**. The application has seven dependencies and all of them run on your laptop.

## One-time setup (about five minutes)

```bash
# 1. Install Node 22 if you do not have it (macOS)
brew install node@22

# 2. Get the code
git clone https://github.com/whoisjaso/obavia.git
cd obavia
git checkout claude/admiring-cray-v05pza

# 3. Install dependencies (one network call, then never again)
npm install
```

## Every day after that

```bash
npm run dev
```

Open `http://localhost:3000`. That is the whole thing. Works offline, on a plane, with the
Wi-Fi off.

To run the faster, production version instead:

```bash
npm run build && npm start
```

## What you can do right now, today

| Screen | What it does | Needs anything? |
|---|---|---|
| **Dial** | Tap the hero, a three-second countdown arms, then the session works a queue of prospects record after record. Each connect opens the in-call screen. | No |
| **In-call** | The script line at full size, never re-flowing. Branch chips for what they actually said. THEIR WORDS and THEIR REFERENCES panels beside it. | No |
| **Outcome** | Nine dispositions after each call, one pre-lit as the suggestion. Writes to history and follow-ups. | No |
| **Train** | Recall, Reveal, Order, Lookup, Branches, Mirror, Meaning, Delivery, Mock and Moment drills. | No |
| **Script** | Every node with Say this / Why this now / What to listen for / Mirror if unclear / Tone cue / Next branches. Your own word track is editable and versioned separately from the source. | No |
| **Sources** | All 207 curated records, searchable, with provenance and classification. | No |
| **Me** | The identity interview, your profile, evidence, insights. | No |
| **Queue / History / Follow-ups** | Prospect queue, call history with transcript review, follow-up lanes. | No |

The prospects in Dial are **synthetic** and the app says so with the ◐ Demo glyph on every screen.
The simulator cannot place a real phone call, by design.

## Where your data lives

In your browser, under the namespace `apohenia.v1.*`. It never leaves your machine and it is
never sent anywhere. Clearing your browser data clears your progress, so treat it as a practice
log rather than a system of record until real persistence lands.

## The honest limits

- **It does not dial a real phone.** See `docs/09-local-first-plan.md` for the two ways to change
  that and what each one actually costs.
- **There is no AI in it.** The script engine, the branch logic and the word extraction are plain
  deterministic code, which is why it needs no keys. Where an AI would help (a roleplay partner, a
  post-call coach), the local-first plan covers running one on your own machine for free.
- **Your practice log is browser-local.** Real persistence is a later increment.
