# Apohenia — Design System v2 ("Arena")

**Status:** authoritative for every user-facing screen from this point on. Supersedes the "calm desktop operating console" styling of Increment 1. The brief's *rules* (honesty of state, exact script stability, THEIR WORDS prominence, consent/permission gates, no fake dialing, keyboard operability) all still apply; only the *form* changes.

**One sentence:** Apohenia feels like a game you open to make calls — dark stage, one glowing action, big numbers, rings, cards, sheets — not a dashboard you read.

## 0. The doctrine in six rules

1. **One screen, one hero.** Every screen has exactly one primary control. On the front door it is the Call button. Nothing competes with it.
2. **97 / 3.** Ninety-seven percent of what is on screen is visual (shape, number, icon, motion, color); three percent is words. A visible label is at most three words. Explanations live behind an ⓘ sheet. Full sentences exist only in accessible names, sheets, and the script line itself.
3. **Stage, not page.** No page titles as headings you read. No sidebars. No tables. Content sits on a dark stage inside a phone-width column (max 520px) on any device; the in-call screen is the one exception that spreads to two columns on wide screens.
4. **Progress is a ring, detail is a sheet, choice is a tile.** Never a progress bar with a caption, never a modal with paragraphs, never a dropdown when 3–9 tiles will do.
5. **Motion rewards, never nags.** Springy, purposeful, ≤560ms. Halos breathe, rings fill, sheets slide. Nothing flashes, nothing bounces forever, nothing moves the line the rep is reading. `prefers-reduced-motion` turns every animation into a fade or a static state.
6. **Honesty stays, shrinks to a pill.** Demo mode is a small `Demo` pill (a half-circle icon from the kit set, never a unicode glyph) with a full accessible name. Fictional is a `Fictional` pill with the spark icon. "Not assessed", "Not set" and "None yet" are caption-size words with an accessible name, never a dash. No em or en dash ever appears on the stage. Nothing claims to be live.

## 1. Tokens (`apps/web/src/styles/tokens.css` — replace the v1 palette)

```css
:root {
  /* stage */
  --bg: #0B0B0F;            /* stage */
  --bg-1: #15151C;          /* card */
  --bg-2: #1E1E27;          /* raised card / chip */
  --bg-3: #2A2A35;          /* pressed */
  --glass: rgba(21, 21, 28, 0.72);   /* tab bar, headers — with backdrop-filter: blur(20px) saturate(140%) */
  --line: rgba(255, 255, 255, 0.08);
  --line-strong: rgba(255, 255, 255, 0.16);

  /* ink */
  --ink: #F5F5F7;
  --ink-2: #A1A1AA;
  --ink-3: #8A8A94;          /* captions and kickers: 5.3:1 on --bg-1; never lower */

  /* signal (iOS system colors) */
  --green: #30D158;   /* call, success, connected */
  --red: #FF453A;     /* end, do-not-call */
  --gold: #FFD60A;    /* THEIR WORDS */
  --purple: #BF5AF2;  /* THEIR REFERENCES */
  --blue: #0A84FF;    /* selection, links, focus ring */
  --orange: #FF9F0A;  /* attention, requires review */
  --teal: #64D2FF;    /* mirrors / clarify */

  /* type */
  --font: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, Inter, system-ui, sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --fs-micro: 11px;  --fs-caption: 13px;  --fs-body: 17px;  --fs-title: 22px;  --fs-large: 28px;
  --fs-display: clamp(34px, 3.6vw, 44px);        /* the script line */
  --fs-their-words: clamp(28px, 3vw, 40px);      /* THEIR WORDS / REFERENCES labels */
  --fs-number: clamp(40px, 6vw, 64px);           /* hero numbers, session timer */
  --lh-tight: 1.1;  --lh-body: 1.4;

  /* shape */
  --r-card: 24px;  --r-sheet: 28px;  --r-tile: 20px;  --r-chip: 999px;  --r-hero: 50%;

  /* space (8pt grid) */
  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 24px; --s-6: 32px; --s-7: 48px; --s-8: 64px;

  /* motion */
  --ease: cubic-bezier(0.2, 0.8, 0.2, 1);
  --dur-fast: 180ms;  --dur: 320ms;  --dur-slow: 560ms;

  /* focus */
  --focus: 0 0 0 3px rgba(10, 132, 255, 0.55);

  /* layout */
  --col: 520px;            /* phone-width column */
  --rail: 380px;           /* THEIR WORDS rail on wide in-call */
  --tabbar-h: 84px;
}
@media (prefers-reduced-motion: reduce) {
  :root { --dur-fast: 0ms; --dur: 0ms; --dur-slow: 0ms; }
}
```

Shadows: none on dark. Depth comes from `--bg-1/2/3` steps and a 1px `--line` border. Glow only on the hero: `box-shadow: 0 0 0 12px rgba(48,209,88,.12), 0 0 60px rgba(48,209,88,.25)`.

`color-scheme: dark` on `:root`. `body { background: var(--bg); color: var(--ink); font-family: var(--font); -webkit-font-smoothing: antialiased; }`.

## 2. Components (`apps/web/src/components/ui/` — v2 kit; delete v1 primitives that no screen uses after the redesign)

| Component | What it is | Notes |
|---|---|---|
| `Stage` | full-height dark stage with a centered `--col` column and bottom padding for the tab bar | every tab screen |
| `TabBar` | fixed bottom, glass, 4 tabs: Dial ☏ · Train ◎ · Script ≡ · Me ◯ ; icon 26px + 11px label; `aria-current="page"`; safe-area padding | `<nav aria-label="Primary">` |
| `TopBar` | 44px translucent row: left glyph pill(s) (`◐ Demo`), center title (one word, optional), right icon buttons | never more than 2 icon buttons |
| `HeroButton` | 200px circle (160px < 480px wide), green, phone glyph 72px, breathing halo, pressed scale .96, states: idle / arming (countdown ring overlay) / dialing (pulse) / active (red, phone-off glyph) | `aria-label` carries the full state, `aria-live` announces state changes |
| `Ring` | SVG ring, 3–12px stroke, value 0–1, optional center slot; conic countdown variant | progress, countdowns, stats |
| `Stat` | big number + small icon, optional 1-word label | never a sentence |
| `Tile` | icon 32px + ≤2-word label, `--r-tile`, `--bg-1`, pressed `--bg-3`; selected = blue ring + check glyph | grids of 2–3 columns |
| `Chip` | pill, ≤3 words, optional leading glyph; selected state blue | branches, filters |
| `Card` | `--bg-1`, `--r-card`, 20px padding, optional tap affordance chevron | lists of things |
| `Sheet` | bottom sheet (`<dialog>`), `--r-sheet` top corners, grabber, slides up `--dur`, backdrop blur, Esc closes, focus trapped; wide screens: centered 560px | all detail/explanations |
| `Avatar` | initials in a colored circle (hash of name → hue) | prospects |
| `LineCard` | the script line: stage chip, primary line at `--fs-display` weight 700, a subtle ⓘ, bridge line at `--fs-body --ink-2` below | tap = next; never re-flows while visible |
| `WordCard` | THEIR WORDS: word at `--fs-their-words` gold, provenance glyph + 1 word (`● said`, `◐ confirmed`, `○ yours`), correction line if any | tap → Sheet |
| `RefCard` | THEIR REFERENCES: label at `--fs-their-words` purple, one meaning line (`--fs-body`), meaning-status glyph (`◉ observed`, `◌ inferred`, `✓ confirmed`, `? unknown`), invalidated state strikes through with `⊘` | tap → Sheet with Keep · Use · Clarify |
| `Icon` | inline SVG set, 1.75px stroke, 24 grid: phone, phone-off, pause, play, next, target, script, person, list, clock, check, x, info, bookmark, spark, mic, wave, arrow-up, chevron, search, plus, flag, ban, calendar, star, refresh, gear | no icon fonts, no emoji as UI |
| `Toast` | 1-line, bottom above tab bar, auto-hide 2.5s, `role="status"` | rare |

Removed from the UI vocabulary: tables, sidebars, `<h1>` blocks as page titles (keep one visually-hidden `<h1>` per route for a11y), paragraphs of instructions, badges with sentences, "EmptyState" prose boxes (replace with a single glyph + 2 words + one action tile).

## 3. Screens

### 3.1 Dial — `/` (front door, the hero)
```
┌──────────────────────────────┐
│ ◐ Demo        00:00     ≡  ◷ │  TopBar: demo pill · session timer · Queue · History
│                              │
│         12  ·  3  ·  1       │  Stats row: dials · talks · next steps (icons under numbers)
│                              │
│          ╭────────╮          │
│          │   ☏    │          │  HeroButton (halo breathing)
│          ╰────────╯          │
│                              │
│  ┌──────────────────────┐    │  Next-up card: Avatar · name · company · city · local-time glyph
│  │ RM  Riverbend Motors │    │  (tap = peek sheet with the record; no dial from here)
│  └──────────────────────┘    │
│                              │
│  ☏ Dial   ◎ Train  ≡ Script ◯ Me │  TabBar
└──────────────────────────────┘
```
- Tap hero → **arming**: a conic ring counts 3 → 2 → 1 around the button (cancel = tap again or Esc). Then **dialing** (button pulses, "Dialing" is the *only* word, inside the button's accessible name and a 1-word caption) → **ringing** → **connected** → the screen crossfades to In-call.
- After a call is dispositioned, **cooldown** ring (5s, pausable with the ⏸ that appears where the hero was) → next record arms automatically. This is "dials and dials and dials". A tap on ⏸ pauses the session; a long-press / the ✕ ends it.
- Queue empty → hero dims, one glyph `∅` + "Queue empty" and a tile "Add prospects" → `/prospects`.
- **Live gate:** `mode: demo` unless telephony + reviewed policy + sequential-session flag are configured (Increment 3/6). In demo the simulator drives outcomes and plays synthetic transcripts; the `◐ Demo` pill is always visible.

### 3.2 In-call — same route, state `connected`
Wide (≥1024px): two columns — center column `--col`+ for the line, right rail `--rail` for words/references. Narrow: single column, words strip above the line, horizontally scrollable cards.
```
┌──────────────────────────────┬──────────────┐
│ RM Dana Whitlock · 02:14  ●●○ │ THEIR WORDS  │  header: avatar, name, timer, 3 state dots (call/transcribe/coach)
│                              │ PROFIT  ●said│
│  ┌────────────────────────┐  │ NET     ●said│  WordCards (gold)
│  │ intent                 │  │──────────────│
│  │ What were you hoping   │  │ THEIR REFS   │
│  │ would change when the  │  │ JAZZ BAND /  │  RefCards (purple), one meaning line
│  │ inquiry form went in?  │  │ EVERYBODY    │
│  │                     ⓘ │  │ WANTS A SOLO │
│  └────────────────────────┘  │ ◌ inferred   │
│   [Yes]  [Vague → mirror]    │              │
│   [No problem]  [Decline]    │              │  branch Chips (≤4 visible, "more" chip opens a sheet)
│                              │              │
│  ┌ Suggested (optional) ───┐ │              │  suggestion overlay: purple-tinted card, separate from the line
│  │ Using your jazz example… │ │              │  [Use] [Not now] [Never]
│  └─────────────────────────┘ │              │
│              ⏺ End           │              │  red round End button; ⌃ swipe-up = transcript sheet
└──────────────────────────────┴──────────────┘
```
- The **line never moves** while the rep reads it. Next line = tap the card, Space, or a branch chip. New words/references slide into the rail without reordering pinned cards.
- Keyboard: Space/→ next line · ← previous · 1–9 branch chips · W focus the words rail · P pin/unpin focused card · K keep · U use · C clarify · Esc End.
- Screen reader: `aria-live="polite"` region announces call state changes and new pinned words; nothing else chatters.

### 3.3 Outcome sheet (after End)
3×3 tiles with icons: **No answer · Voicemail · Gatekeeper · Callback · Talked · Meeting · Qualified · No fit · Do not call**. One tap records the disposition (brief §9 statuses) and starts the cooldown to the next record. `Do not call` also writes suppression. `Callback` opens a second sheet with 4 time tiles (Later today · Tomorrow · Next week · Pick) — dates are shown as tiles, not typed.

### 3.4 Train — `/practice`
Tile grid (2 columns): Recall · Reveal · Order · Lookup · Branches · Mirror · Meaning · Delivery · Mock · Moment. Each tile carries a small ring (assisted) and a second dot-ring (unassisted) — two rings, no words. Drill screens: one item per screen, big choice tiles or one textarea (exact recall only), a Check hero button, results as two rings (Memory / Conversation) and a `—` glyph for tone with accessible name "Tone not assessed (text-only)". Assistance mode = a segmented control of 5 glyphs at the top (full · reveal · mirror · cue · none) with accessible names.

### 3.5 Script — `/scripts`
Horizontal stage rail of chips (entry · intent · logic · … · exit). Below: the node cards for that stage as swipeable/scrollable `LineCard`s; tap a card → Sheet with Why now · Listen for · Mirrors · Tone · Branches (chips) · Sources (chips that open the record sheet) · **Your words** (textarea; primary line shown locked above it with a lock glyph). Publish = hero-style tile with a confirm sheet (2 tiles: Publish · Cancel) — it freezes wording. Sources library `/sources` = search field + list of cards (id chip · title · classification glyph); record = full-screen card with the excerpt as the hero text. Offers `/offers` = cards; price shows `—` with accessible name "Price not set"; fictional offer card carries `✦ Fictional` pill.

### 3.6 Me — `/today`
Top: three rings (Rehearse · Mock · Review) for today; a `min` toggle chip for minimum-action day. Cards: Next drill (tap → Train), Interview (tap → `/onboarding/identity`, or Profile when endorsed), Evidence (chips you tap to log), Settings (gear). Interview screens: full-bleed option tiles (large, one question per screen, prompt at `--fs-large`), Next/Back as hero chips, progress as a ring in the top bar. Profile: cards per section, endorse = hero tile. Insights `/insights` = rings + numbers with denominators shown as `n/N` only; empty = `∅`.

### 3.7 Queue `/prospects`, History `/calls`, Follow-ups `/pipeline`
Reached from Dial's top-right icons. Cards with Avatar + 2 lines; status as a glyph chip (`◔ review`, `✓ ok`, `⊘ DNC`). No table. Call detail = the in-call layout replayed read-only with the review block as four cards (Strength · Fix · Ask instead · Drill) and a `—` tone glyph.

## 4. Copy rules (the 3%)
- Labels ≤3 words, Title Case for tiles, sentence case elsewhere. Numbers never have units spelled out when a glyph works (⏱ 02:14).
- No instructions on screen ("Click here to…"). No explanatory paragraphs outside ⓘ sheets.
- Every glyph has an accessible name that says the whole truth ("Demo mode: synthetic prospects, no real calls are placed").
- The script line and THEIR WORDS are exempt: they are the content.

## 5. Accessibility floor (non-negotiable)
Keyboard reaches everything in a sane order; visible focus (`--focus`); one `<h1>` per route (visually hidden is fine); tiles/chips are `<button>`s with `aria-pressed` where they toggle; sheets are `<dialog>` with focus trap and return; live regions for call state, pins, and drill results; contrast ≥ 4.5:1 for text (gold/purple on `--bg` pass at the large sizes used); reduced motion honored; zoom 200% keeps the column readable (no horizontal scroll).

## 6. What "done" looks like (visual acceptance)
Screenshots at **430×932** (phone) and **1440×900** (desktop) for: Dial idle · Dial arming · In-call with ≥3 words and ≥1 reference · Outcome sheet · Train · Script · Me · Interview screen. A reviewer counting visible words on Dial idle should find fewer than 15. The hero must be the largest object on the Dial screen. No sidebar, no table, no paragraph appears on any of those screenshots.
