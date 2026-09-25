# Obavia positioning

## The question every buyer will ask

An agency doing $100K to $1M a month already has its numbers. GoHighLevel, HubSpot or a Looker Studio board will show leads, bookings, shows, closes and cash. An ops hire or a freelancer can build that in a few weeks.

So why pay Obavia $3,000 a month?

## The answer: the dashboard was never the product

What an agency can build cheaply is **where**: the stage counts and the conversion rates. That part is a commodity, and we should say so out loud.

What it cannot build or keep running cheaply is everything that comes after the number:

1. **Why.** The reason a deal was lost lives in the conversation, not the CRM. A manager can review a sample of calls, but once a team runs more than about 50 calls a week, manual review covers under 10% of them. Obavia hears every call. It tags why each person dropped out, using the words they actually said.
2. **Data you can trust.** Reps don't update the CRM, because the CRM asks them for work that helps everyone except them. The research is blunt: most opportunity data never reaches the CRM, and a large share of reps admit to making entries up to get past validation. A dashboard built on rep-entered data is guessing. Obavia reads the phone system, calendar and payments directly, so reps type nothing.
3. **The fix, owned and checked.** Knowing the show rate is 50% doesn't change it. Obavia:
   - turns the biggest leak into one fix;
   - assigns it to the rep who leaks most;
   - checks it on Friday against that rep's own calls;
   - reports the result in dollars.
   That closes the loop. Dashboards don't.
4. **The person on the other end.** How a lead speaks predicts what they need to hear:
   - "I" instead of "we", and "my team" instead of "our team";
   - the one name they reach for, out of every name they could have used.
   Obavia makes that read before the next call, suggests the line to use, and pairs the lead with the right rep. No internal build does this.
5. **Adoption.** Tools that add work get abandoned. Obavia is built like a good consumer app:
   - one next action;
   - one tap, with instant feedback (sound, haptics);
   - nothing to type;
   - the rep's own commission per call, visible on their screen.
   It works for the rep, so the rep uses it. That is the difference between data that exists and data that is true.
6. **It keeps working.** No developer, no maintenance, and nothing to rebuild when the tools change. It goes live in days, not a quarter.

## How an owner does the math

These comparisons are our own estimates; they need validating in interviews.

| Option | What it costs | What they get |
|---|---|---|
| A custom dashboard | Weeks of a developer or ops hire, then upkeep | Where. Not why, not who, not what to say. |
| A sales manager | A full salary | Reviews a sample of calls, when there's time |
| Obavia | $3,000 a month | Every call heard, the leak in dollars, one fix per rep, checked weekly, and a read on every lead |

The honest anchor: **if it saves one deal a month, it has paid for itself.** Most agencies at this level lose more than one deal a month at a single step.

## One line

> Know why deals are lost, and fix it by Friday.

Supporting line: *Obavia hears every sales call, shows you the one step costing you the most, and gives each rep the fix. Nothing for your team to type.*

## The page, in the order a buyer understands it

1. **Promise.** Say what it is in one sentence, and show the product in the first screen. No loader and no context-free quote.
2. **Recognition.** "You already have the numbers." Agree with their objection before they raise it. The number says where; it doesn't say why, and it can't make anyone fix it.
3. **Why.** Every call heard. Show the reasons, with the exact words that give them away.
4. **The fix.** One rep, one fix, checked on Friday, with the result in dollars.
5. **The person.** Show the word-choice read: I instead of we, and Babe Ruth out of every other name. This is the edge nobody else explains this clearly.
6. **The team.** Reps actually use it. Make it a phone the visitor can tap: call, logged, done, with a haptic tap and a soft sound.
7. **Build versus buy.** An honest comparison, then the price.
8. **Ask.** The waitlist.

## Design rules

- One idea per screen. If a screen needs a caption to be understood, redesign the screen.
- No decorative pills, chips or badges. Use one primary button, text links with a chevron, and big type.
- The sky stays: soft clouds, calm blues, and warm amber only where money leaks.
- Motion explains something or it doesn't ship. It is slow and eased, and it respects reduced motion.
- Sound is soft sine chimes, and only after the visitor first taps.
- Haptics fire on taps only. The page uses `navigator.vibrate` where it exists, and the iOS 18 switch tick on iPhone.

## Still to feed in

Transcripts from agency-owner YouTube channels, where they break down funnels and complain about their systems. Mine them for their exact words (the problems, the objections, the metrics they quote) and swap them into the copy. The page should sound like them.

## Sources

- Why reps don't update the CRM: https://b2bsalesguru.medium.com/the-real-reason-your-reps-dont-update-the-crm-692c316d5e77 and https://www.markempa.com/why-sales-teams-dont-update-crm/
- CRM data never entered, reps fabricating data, CRM project failure rates: https://www.gtmengine.ai/blog/why-crm-adoption-fails-human-etl and https://www.backstory.ai/sales-activity-capture-cluster-pages/crm-adoption-why-it-fails-and-what-actually-fixes-it
- Manual call review covers under 10% of calls above about 50 calls a week: https://www.terret.ai/resources/blog/new-how-do-sales-managers-coach-reps-without-sitting-in-on-every-call
- Speed to lead (the MIT / InsideSales study): https://www.leadsixty.com/guides/speed-to-lead/
- iOS 18 Safari haptics through `<input type="checkbox" switch>`: https://webkit.org/blog/15865/webkit-features-in-safari-18-0/ and https://github.com/tijnjh/ios-haptics
