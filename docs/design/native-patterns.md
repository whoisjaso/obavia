# Native patterns. What we borrow, where it lands, what is built.

The owner's brief (October 2026): the UI must be "extremely native... Instagram, YouTube, Facebook, Facebook Marketplace, TikTok... iOS and its technologies, haptics, feedbacks", 97 percent visual, with "actual animations and sfx and effects subsequent to hovering, clicking, etc."

This file maps every Obavia screen to the native pattern it borrows. It adds no new decision. It sits under `docs/design/lego.md` §3 (the native stimuli and the tooltip rule), `docs/design/cloud-system.md` §2 and §3 (the press physics and the sound kit), `docs/plan/one-action.md` (one thing per screen) and `docs/plan/obavia-auction-decisions.md` §3 (the screens as settled). Where those documents disagree with each other or with the code, §6 says so and leaves the call to the plan's owner.

Audited against the tree on Tuesday October 13, 2026. Every "implemented" cites a file and a line. "Partial" means some of the row is built and the cell says which part is not. "Missing" means nothing of it is built.

## 0. How to read the tables

**Columns.** The moment (what the user does) · the borrowed pattern and its source app · the gesture · the visible effect after it · the haptic · the sound · the duration · the state in code.

**The §2 numbers**, as built in `auction/src/motion.ts`:

| Name | Numbers | Where |
| --- | --- | --- |
| sink | translateY +2.5 pt, scale 0.985, 100 ms ease-out | `motion.ts:34-35`, `motion.ts:55` |
| rise | spring, damping 0.65, 300 ms | `motion.ts:24` |
| cancel | spring, damping 1.0, 300 ms, silent | `motion.ts:26` |
| wisps | 7 wisps, 12 to 20 pt up, 600 ms, opacity 0.3 | `motion.ts:79`, `CloudButton.tsx:94-102` |
| ring | air ring scale 1.0 to 1.4, opacity peak 0.18 at 120 ms, 600 ms | `motion.ts:80` |
| swell | scale 1 to 1.03 to 1, 420 ms sine in-out | `motion.ts:37`, `motion.ts:56` |
| form | sheet spring, damping 0.75, 420 ms | `motion.ts:29` |
| settle | page child down from 8 pt, 420 ms, 40 ms stagger | `motion.ts:38-39`, `Type.tsx:77-83` |

**Haptics** use expo-haptics names: Light, Medium, Heavy (impactAsync), Selection (selectionAsync), Success, Warning (notificationAsync). The vocabulary lives in `auction/src/feel.ts:81-135`. On the web there is no Taptic API: Android gets `navigator.vibrate`; iPhone Safari gets nothing from `vibrate`, and the public site uses the iOS 18 switch-input tick instead (`obavia-co/shell.js:41-46`). The Desk does not (`desk/src/ui.tsx:46`), so the Desk is silent to the hand on an iPhone.

**Sounds.** App house tones in `auction/assets/sfx/`: `tick`, `select`, `thud`, `air`, `warn`, `chime`, `refill`, `lead`. The cloud kit (cloud-system §3) in `auction/assets/sfx/cloud/`, `desk/public/sfx/cloud/` and `obavia-co/audio/cloud/`: `cloud-touch`, `cloud-rise`, `cloud-settle`, `cloud-drift`, `cloud-landed`, `cloud-hover`. In `feel.ts` the kit is called `puff`, `rise`, `settle`, `swell` and `drift` (`feel.ts:20-23`, `feel.ts:42`).

## 1. The tooltip test (lego §3)

Rule: a gesture that needs a tooltip is not native and is rejected. Every gesture in the code today, judged:

| Gesture | Where | Verdict | Why |
| --- | --- | --- | --- |
| Swipe up to the next car | `Lane.tsx:293-297` | passes | TikTok paging; one car per glass |
| Tap the photo: next angle | `Lane.tsx:69-70` | passes | Instagram Stories tap-to-advance. It waits up to 260 ms for a double tap (`Lane.tsx:73`); Instagram pays the same delay |
| Swipe left: the Car | `Lane.tsx:81` | passes | TikTok swipe left to the profile. The photo count is also a visible door (`Lane.tsx:148-151`) |
| **Drag the price up to arm a bid** | `Lane.tsx:88-100` | **fails as built** | The Lane's one action (one-action.md) has no visible handle, and a tap on the price does nothing: the price sits in a detector with only a Pan (`Lane.tsx:140`). YouTube's scrubber is learned because the track and the thumb are on the glass. A first-time user taps the number, and nothing happens |
| **Double tap to watch** | `Lane.tsx:72-73` | **fails as built** | Instagram's double tap is learned because the heart blooms under the thumb. Here the only proof is an 8 pt dot turning blue in the top corner (`Lane.tsx:133`), and the app ships the tooltip itself: "double-tap a car to watch it" (`Me.tsx:148`) |
| **Long-press the ring: the time** | `Lane.tsx:102-105`, toast `Lane.tsx:125` | **fails** | No app trains a long-press on a countdown, and the answer arrives as a text toast. VoiceOver already hears the time from the page label (`Lane.tsx:109`) |
| **Hold the photo** | `Lane.tsx:75-78` | **fails today** | A dead gesture: the photo scales 1.03 and a Light impact fires, but there is no engine recording, so the user learns nothing. TikTok's hold pauses media; there is no media yet |
| Swipe a sheet down by its grabber | `Sheet.tsx:56-73`, `Sheet.tsx:89-93`; `BidSheet.tsx:78-85` | passes | iOS sheet grabber |
| Swipe a watched car left | `Me.tsx:45-51` | passes, partial | iOS Mail swipe. Mail reveals the action under the row and ticks at the commit point; ours reveals nothing and is silent |
| Swipe between pages, dots below | `Type.tsx:104-124` | passes | iOS page control |
| Hold Bid over 2x the bid | `CloudButton.tsx:228-232` | passes | The fill starts under the thumb at touch-down, so the gesture teaches itself (apple-design §8, hint in the direction of the gesture) |
| Scroll to the end to unlock the pad | `Paper.tsx:43-52`, `Paper.tsx:88` | passes | Terms-of-service scroll; the pad sits at 35 percent until then |
| Draw a signature | `Paper.tsx:64-66` | passes | iOS Markup, DocuSign |
| Pull to refresh | `Plates.tsx:26` | passes | iOS RefreshControl |
| **Long-press State to cycle it** | `Scan.tsx:75`, `Scan.tsx:87` | **fails** | Nothing trains a long-press to cycle a value. iOS uses a tap that opens a wheel |
| Hold the pass | `Pickup.tsx:70` | n/a in production | A demo stand-in for the dealer's scan; with a Worker the pass takes no gesture (`onPress` is undefined when `AUCTION_URL` is set), which is right: a Wallet pass is presented, not pressed |
| **Desk: tap a photo to remove it** | `desk/src/Auction.tsx:217` | **fails** | Inverts the most learned tap there is. In iOS Photos a tap opens; removal sits behind a long-press menu or a trash control |
| Desk: "Long-press the floor to lower it" | decided in `obavia-auction-decisions.md` §3.2 and phases Phase 1; not built | **would fail** | On mobile Safari a long-press on text opens the selection callout. The built "Lower The Floor" button (`Auction.tsx:334`) passes |
| Site: SMS code fills and moves on | `obavia-co/index.html:152`, `lane-apply.js:168-174` | passes | iOS one-time-code AutoFill |

## 2. The phone app (`auction/`)

### Lane

| Moment | Pattern (source) | Gesture | Visible effect | Haptic | Sound | Duration | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Next car | TikTok vertical paging | swipe up | full-bleed snap to the next car; clouds keep one clock (`Lane.tsx:203`) | Selection at rest | `air` | platform paging, sound on momentum end | implemented `Lane.tsx:293-297`, `feel.ts:87` |
| Next angle | Instagram Stories tap-to-advance | tap | photo crossfades to the next angle | Selection | `select` | 180 ms crossfade | implemented `Lane.tsx:69-70`, `Lane.tsx:112` |
| Watch a car | Instagram double tap heart | double tap | lego §3: the mark swells under the thumb. Built: the 8 pt dot turns blue, top right | lego: Light. Built: Selection | lego: `cloud-touch`. Built: `select` | swell 420 ms (not built) | partial `Lane.tsx:72-73`, `Lane.tsx:133`; no swell at the tap point |
| Hold the car | TikTok hold to pause (media) | long-press 350 ms | photo scales 1.03 on spring.settle | Light | none (engine audio not recorded) | 200 ms | partial `Lane.tsx:75-79`; fails the tooltip test until audio exists |
| Open the Car | TikTok swipe left to profile | swipe left 40 pt or 500 pt/s | Car sheet forms from below | Selection | `select`, then `cloud-settle` | form 420 ms | implemented `Lane.tsx:81`, `Lane.tsx:288`, `Sheet.tsx:45-49` |
| Arm a bid | YouTube scrubber | drag the price up, 28 pt a step | price lifts 2 pt at touch-down, follows up to 12 pt more, rubber-banded; the number rolls per step | Light at touch-down; Light per step | `tick` per step | per step | implemented `Lane.tsx:86-100`, `Price.tsx:24-29`, `feel.ts:83`, `feel.ts:89`; fails the tooltip test (§1) |
| Hand off to Bid | Apple Maps sheet from a gesture | release after one or more steps | Bid sheet forms from below, continuing the drag | none | `cloud-settle` | form 420 ms | implemented `Lane.tsx:99`, `BidSheet.tsx:60-64` |
| Time left | iOS Lock Screen Live Activity glance | long-press the ring | text toast with the time | none | none | while held | implemented `Lane.tsx:102-105`, `Lane.tsx:125`; fails the tooltip test (§1) |
| Last two minutes | Apple Watch Activity ring | none (a rival bids) | ring turns blue and refills to full on each bid | Medium | `refill` | 220 ms fill | implemented `Ring.tsx:27-31`, `Lane.tsx:222-227`, `feel.ts:100` |
| Lead comes back | iOS notification success | none | leading mark fades in beside the price | Success | `lead` | 150 ms | implemented `Lane.tsx:231`, `Price.tsx:37`, `feel.ts:95-98` |
| Outbid | (house silence) | none | price rolls to the new number | none | none | spring.settle 200 ms | implemented `Price.tsx:24-29`; silence is the punishment (`feel.ts:1-4`) |
| Bid vs Retail | Marketplace card: price, photo, nothing else | none | two bars, Bid springs to its new width | none | none | spring.value 400 ms | implemented `Bars.tsx:13` |
| Open Me | iOS avatar in the corner | tap the mark | Me sheet forms | Selection | `select` | form 420 ms | implemented `Lane.tsx:129` |

### Bid sheet

| Moment | Pattern (source) | Gesture | Visible effect | Haptic | Sound | Duration | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sheet arrives | iOS sheet, cloud forming | (the arming drag) | rises on the form spring; 40 pt kept below the glass so the overshoot never lifts an edge | none | `cloud-settle` | 420 ms | implemented `BidSheet.tsx:58-64` |
| Roll the bid | iOS picker wheel detent | drag the number, 28 pt a step | lifts 2 pt; number rolls; increment line under it | Light at touch-down; Light per step | `tick` per step | per step | implemented `BidSheet.tsx:91-99` |
| Set a ceiling | iOS picker wheel, Taptic selection ticks | tap the faint word, then pick | horizontal row of values, the chosen one in ink with a rule | Selection on tap only | `select` | none | partial `BidSheet.tsx:157-175`; a tap list, no wheel, no tick per detent while scrolling |
| Press Bid | Apple Pay single button, cloud press | tap | sink, then rise; 7 wisps leave the top edge; label dips 1 pt; shadow lengthens then settles | Light on touch-down | `cloud-touch` down, `cloud-rise` up | sink 100 ms, rise 300 ms, wisps 600 ms | implemented `CloudButton.tsx:186-210`, `feel.ts:115`, `feel.ts:120` |
| Hold to bid over 2x | Emil hold-to-confirm | hold 600 ms | a quiet ink rule fills under the word; drains fast on release | Medium at full | `cloud-drift` at low gain once held past 400 ms | 600 ms | implemented `CloudButton.tsx:211-232`, `feel.ts:130` |
| In flight | iOS activity indicator | none | the word becomes a turning ring | none | none | until the ack | implemented `BidSheet.tsx:208-217` |
| Server ack | Apple Pay done tick | none | price punches 1.06; tick replaces the ring; swell and air ring on the button; 90 ms later the leading mark | Heavy, then Success at 90 ms | `thud`, `cloud-landed`, then `lead` | punch 90 + 180 ms; swell 420 ms; ring 600 ms | implemented `BidSheet.tsx:109-117`, `Price.tsx:32-35`, `CloudButton.tsx:168-179` |
| Rejected after close | iOS stamp, one warning | none | price rolls back; a server line stamps down from 1.08 | Warning | `warn` | 160 ms | implemented `BidSheet.tsx:118-121`, `BidSheet.tsx:237-243` |
| First refill seen | Apple Watch ring teach | none | 1.2 s ring overlay, once ever | none | none | 1.2 s | implemented `BidSheet.tsx:116`, `BidSheet.tsx:255-266` |
| Dismiss | iOS sheet grabber | swipe down 90 pt or 800 pt/s | follows the finger, rubber-band upward, carries the flick | none | `cloud-drift` gain follows speed | spring.sheet 300 ms | implemented `BidSheet.tsx:75-85`, `Sheet.tsx:23-29` |

### Deposit confirmation (first bid)

| Moment | Pattern (source) | Gesture | Visible effect | Haptic | Sound | Duration | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ID before the first bid | iOS Wallet add-a-card camera | point, tap | decisions §3.1: silhouette, five chips, "That's me", then the deposit | Light per confirm | none | none | missing from the first bid: `BidSheet.tsx:103` goes straight to the deposit; `IdScan` only runs after a win (`Won.tsx:107`) |
| The ask | Apple Pay sheet | tap Pay | $250, "refunded if you lose", one cloud button, "Not now" faint | Light on touch-down | `cloud-touch`, `cloud-rise` | sink and rise as above | implemented `BidSheet.tsx:222-233` |
| Pay | Apple Pay double press tick | Whop hosted checkout in an in-app browser | Whop's page, not ours | Whop's | Whop's | Whop's | implemented as Whop checkout `deposit.ts:43-65`; whether Apple Pay appears inside it is UNVERIFIED |
| Back with the deposit held | Apple Pay done tick, Wallet chip lands | none | the line "$250 held · back if you lose" rises 6 pt into place; then the bid fires | lego §7: Success. Built: Light | lego §7: `cloud-landed`. Built: none | 200 ms | partial `BidSheet.tsx:128-133`, `BidSheet.tsx:180-182`, `BidSheet.tsx:246-252` |

### Car

| Moment | Pattern (source) | Gesture | Visible effect | Haptic | Sound | Duration | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Open | Apple Maps sheet, three detents | swipe left on the Lane | decisions §3.1: three detents. Built: one full-height detent | none | `cloud-settle` | form 420 ms | partial `CarSheet.tsx:85` (`detents={[1]}`) |
| Between pages | iOS page control | swipe sideways | three pages, dots | Selection at rest | `air` | paging | implemented `Type.tsx:104-124` |
| A photo | iOS Photos grid, zoom from thumbnail | tap | built: a full-screen fade. iOS: zooms from the thumbnail, pinch to zoom, swipe down to dismiss | Selection | `select` | 140 ms fade | partial `CarSheet.tsx:34`, `CarSheet.tsx:88-94` |
| Condition | (decisions §3.1) six dots become six words | tap the badge | built: six words always shown, no dots | decisions: six Light, 60 ms stagger. Built: none | none | none | missing `CarSheet.tsx:44-54` |
| Buyers Guide | iOS Quick Look | tap | Paper sheet rises | Selection | `select` | form 420 ms | implemented `CarSheet.tsx:70`, `CarSheet.tsx:95` |

### Watching

| Moment | Pattern (source) | Gesture | Visible effect | Haptic | Sound | Duration | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Back after 24 h | Apple Watch ring fill on wake | open Me | first ring turns in a quarter from 0.85 and settles | Medium then Light, 200 ms apart (heartbeat) | none | spring.snap 400 ms | implemented `Me.tsx:39-40`, `feel.ts:132` |
| Go to a car | iOS list row | tap | row sinks; Lane scrolls to the car | Selection | `select` | spring | implemented `Me.tsx:61`, `Lane.tsx:303` |
| Stop watching | iOS Mail swipe | swipe left a third or 600 pt/s | row follows, fades, leaves at the finger's speed | none (Mail ticks at the threshold) | none | spring.sheet 300 ms | partial `Me.tsx:45-52`; no action revealed under the row, no tick at the commit point |
| Empty | (none) | none | grey ring and the line "double-tap a car to watch it" | none | none | none | implemented `Me.tsx:146-149`; the line is an instruction banned by lego §2 and goes when the double tap passes §1 |

### Won steps

| Moment | Pattern (source) | Gesture | Visible effect | Haptic | Sound | Duration | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| The hammer | Apple Pay success, then confetti | none | 200 ms of nothing; flash 60 ms up, 300 ms down; confetti in ice and blue | Success | `chime`, `cloud-landed` | 200 ms pause, 360 ms flash | implemented `Won.tsx:35-49`, `feel.ts:105-109` |
| Who is it for | iOS action sheet choices | tap | the choice sinks and rises; steps page settles in | Selection | `select`, `cloud-touch`, `cloud-rise`, then `cloud-settle` | settle 420 ms, 40 ms stagger | implemented `Won.tsx:76-85`, `Type.tsx:47-58` |
| The next step | iOS Wallet card fan, the front card lifted | tap the lit tile | live tile larger with a rule under it; decisions §3.1: the next lifts 4 pt | Selection | `select` | none | partial `Won.tsx:92-99`; no 4 pt lift |
| A step done | Apple Pay check, drawn | (return from the step) | decisions §3.1: check draws on. Built: a static check | decisions: Light. Built: each step fires Success | decisions: a ding. Built: `chime` plus `cloud-landed` | none | partial `Won.tsx:97`, `Won.tsx:120`; `feel.done` fires on ID, Insure and each of three signatures (`Scan.tsx:76`, `Scan.tsx:105`, `Paper.tsx:67`), five win chimes after the win |

### ID

| Moment | Pattern (source) | Gesture | Visible effect | Haptic | Sound | Duration | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Shutter | iOS Camera shutter | tap | the read sheet fades up after 500 ms; frame turns green. iOS also blinks the frame on capture | Light, then Selection on the read | none | 500 ms, 200 ms fade | partial `Scan.tsx:56-58`, `Scan.tsx:73`; no capture blink, no live glare or tilt from decisions §3.4 |
| Confirm each fact | Wallet add-a-card confirm rows | tap each line | facts fall in 60 ms apart; a green rule lights under the confirmed one | Light per confirm | none | 180 ms each | implemented `Scan.tsx:74`, `Scan.tsx:85-93` |
| Change the state | iOS picker wheel | long-press State | cycles TX, OK, LA, NM | Selection | `select` | none | implemented `Scan.tsx:75`, `Scan.tsx:87`; fails the tooltip test (§1) |
| That's me | Apple Pay single button | tap | cloud press, swell | Success | `chime`, `cloud-landed` | as above | implemented `Scan.tsx:76`, `Scan.tsx:95` |

### Insure

| Moment | Pattern (source) | Gesture | Visible effect | Haptic | Sound | Duration | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Shutter | iOS Camera shutter | tap | VIN shown above the frame; frame reads green; back to the steps after 700 ms | Light, then Success | `chime`, `cloud-landed` | 500 + 700 ms | implemented `Scan.tsx:102-113`; the Success here should be the lighter step tick (Won steps row) |

### Sign

| Moment | Pattern (source) | Gesture | Visible effect | Haptic | Sound | Duration | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Open the live document | iOS Quick Look sheet | tap the lit title | Paper sheet forms at full height, two detents | Selection | `select`, `cloud-settle` | form 420 ms | implemented `SignDocs.tsx:30`, `Paper.tsx:70` |
| Read to the end | terms scroll gate | scroll | pad goes from 35 percent to full, with no transition | Medium | none | instant | partial `Paper.tsx:43-52`, `Paper.tsx:88`; the unlock does not animate and has no sound |
| Sign | iOS Markup pen | draw, then tap Sign | ink follows the finger | none while drawing | none | live | implemented `Paper.tsx:64-66`, `Paper.tsx:96-102` |
| Reuse the signature | iOS AutoFill signature | tap | the earlier signature files | Success | `chime`, `cloud-landed` | none | implemented `Paper.tsx:89-93`, `Paper.tsx:67` |

### Pay

| Moment | Pattern (source) | Gesture | Visible effect | Haptic | Sound | Duration | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Pick how | iOS Settings choice list | tap one of three words | chosen word in ink with its date; page moves on | Selection | `select`, `cloud-touch`, `cloud-rise` | 260 ms then the next page | implemented `Pay.tsx:23`, `Pay.tsx:31-33`, `Type.tsx:52`. No money moves here; the Success belongs to the server's `paidAt`, not this tap (§6) |

### Pickup: where, when, pass

| Moment | Pattern (source) | Gesture | Visible effect | Haptic | Sound | Duration | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Where | Apple Maps pin card | tap the pin | opens Apple Maps | none | none | none | partial `Pickup.tsx:43-46`; `maps.apple.com` on Android opens a browser, not Google Maps |
| After hours | iOS phone link | tap | dials | none | none | none | implemented `Pickup.tsx:47-50` |
| When | iOS Calendar time list | tap a slot | chosen slot in ink | Selection | `select` | none | implemented `Pickup.tsx:54-61` |
| The pass | iOS Wallet pass, brightness up for the barcode | show it | QR; breathes 1.03 on a 1 s sine once arrived | none | none | 1 s loop | partial `Pickup.tsx:27-33`, `Pickup.tsx:70-79`; no brightness boost, no Add to Apple Wallet or Google Wallet |
| Arrival | Wallet pass surfaces at the location | geofence | decisions §3.1: heartbeat | Medium then Light | none | 200 ms apart | partial `sale.ts:55-56`; demo timer only, no geofence |
| The car started | Wallet pass turns valid | the dealer's scan | ink pass crossfades to green; the pass swells; Continue appears | Success | `chime`, `cloud-landed` | 240 ms crossfade, swell 420 ms | implemented `Pickup.tsx:30`, `Pickup.tsx:73-77`, `sale.ts:58`, `Cloud.tsx:125-129` |

### Plates

| Moment | Pattern (source) | Gesture | Visible effect | Haptic | Sound | Duration | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Check | iOS pull to refresh | pull down | native spinner | Light | none | 700 ms | partial `Plates.tsx:23`, `Plates.tsx:26`; the refresh is a timer and fetches nothing |
| Filed, Approved | Find My progress ring | none | ring steps to a third, two thirds; the word lights | Light | `tick` | 260 ms | implemented `sale.ts:66-71`, `Ring.tsx:32-33`; demo cadence |
| Mailed | Find My item found | none | ring full | heartbeat twice | none | 1 s apart | implemented `sale.ts:69` |
| County kickback | iOS amber state | none | ring amber, "Dealer fixing" | none | none | none | implemented `Plates.tsx:13`, `Plates.tsx:29` |

### Me

| Moment | Pattern (source) | Gesture | Visible effect | Haptic | Sound | Duration | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Look | iOS Settings, the neutral screen | none | name, the $250, cars as passes | none | `cloud-settle` on arrival | settle 420 ms | implemented `Me.tsx:101-140`, `Type.tsx:88-90` |
| Deposit back | Apple Pay refund tick | tap "Release it" | line changes to "back to your card" | Success | `chime`, `cloud-landed` | none | implemented `Me.tsx:93-99`, `Me.tsx:109-114` |
| Sign out | iOS Settings destructive row | tap | sheet closes | none | none (silence by design) | exit 200 ms | implemented `Me.tsx:102` |

## 3. The Desk (`desk/`)

Every Desk control sinks and rises through one delegated listener (`desk/src/motion.ts:188-213`, wired at `desk/src/main.tsx:18`): sink 2.5 px, 0.985, 100 ms; rise on a 0.65 spring held to 3 percent over; cancel without overshoot. Every page settles in through `watchEnter` (`motion.ts:75-91`, `main.tsx:14`) after a View Transition (`ui.tsx:179-184`). Sounds: synthesized house tones plus the cloud kit (`ui.tsx:7-62`). Haptic: `navigator.vibrate(6)` only (`ui.tsx:46`), so an iPhone feels nothing. There are no wisps and no air ring on the Desk: `landed` is the swell alone (`motion.ts:154-161`).

### Let It Go

| Moment | Pattern (source) | Gesture | Visible effect | Haptic | Sound | Duration | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Start | Apple Pay single button | tap "Let A Car Go" | sink, rise, page slides | vibrate (Android) | two-note tone, `cloud-touch`, `cloud-rise`, `cloud-settle` | sink 100 ms, rise 300 ms, settle 420 ms | implemented `Auction.tsx:54`, `ui.tsx:51` |
| The days ring unwinds | (decisions §3.4) Activity ring | the same tap | decisions: days-on-lot ring unwinds with a whoosh | none | decisions: a whoosh | 600 ms | missing; no days-on-lot ring on the Lane list or the first page |
| One question per page | iOS Settings drill-in | tap a choice | choice sinks; next page settles in | vibrate | two-note tone | 420 ms, 40 ms stagger | implemented `Auction.tsx:130-133`, `motion.ts:51-60` |
| Show It | iOS Camera | tap "Take photos" | the system camera; thumbnails fill a grid | vibrate | one-note tone | none | implemented `Auction.tsx:218` (`capture="environment"`) |
| Remove a photo | iOS Photos long-press menu | built: tap | the photo disappears | vibrate | one-note tone | none | implemented `Auction.tsx:217`; fails the tooltip test (§1) |

### Floor

| Moment | Pattern (source) | Gesture | Visible effect | Haptic | Sound | Duration | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Type the floor | Apple Cash amount entry | numeric keypad | grouped digits; band, holding cost and keep or bring rows beside it | none | none (the Desk's keystroke tick `ui.tsx:55` is not wired here) | none | partial `Auction.tsx:239-248`; the rows jump instead of counting (`countTo`, `motion.ts:98-105`, is unused here) |
| Floor under payoff | iOS alert as a page | tap "OK, I'll bring" | own page with the figure in the heading | vibrate | two-note tone | settle 420 ms | implemented `Auction.tsx:250-254` |

### Go

| Moment | Pattern (source) | Gesture | Visible effect | Haptic | Sound | Duration | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Go | Apple Pay done tick | tap Go | progress words while photos send; then the button swells and reads "On The Lane" with a check | vibrate | four-note chime, `cloud-landed` | swell 420 ms, page change at 420 ms | implemented `Auction.tsx:168-171`, `Auction.tsx:273`, `ui.tsx:53` |

### Live

| Moment | Pattern (source) | Gesture | Visible effect | Haptic | Sound | Duration | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A bid lands | TikTok LIVE counter tick | none | high bid counts up; ring sweeps | none | none | count 450 ms, ring 600 ms | partial `Auction.tsx:316-317`, `motion.ts:98-105`, `motion.ts:134-138`; no pulse, no sound, no haptic on a positive event |
| Lower the floor | (decisions: long-press the floor line) | tap "Lower The Floor" | field opens at the foot | vibrate | one-note tone | settle | implemented as a button `Auction.tsx:334-336`; the long-press version would fail §1 |
| Sell it now | iOS action sheet, destructive row | tap | browser `confirm()` dialog | none | none | none | implemented `Auction.tsx:333`; a browser modal, not a sheet |

### Sold

| Moment | Pattern (source) | Gesture | Visible effect | Haptic | Sound | Duration | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| The hammer lands | Apple Pay success | none (the lot closes while watched) | decisions §3.2: the hammer lands. Built: the Sold page appears with the plain settle | none | none | settle 420 ms | missing `Auction.tsx:304`; no landed moment when `lot.sale` arrives |
| Buyer's clock | Apple Watch ring | none | ring of the 48 h deadline with hours and minutes | none | none | ring 600 ms | implemented `Auction.tsx:360` |
| Paid at the lot | Apple Pay done tick | tap | swell | vibrate | four-note chime, `cloud-landed` | 420 ms | implemented `Auction.tsx:355`, `Auction.tsx:386` |

### Pickup scan

| Moment | Pattern (source) | Gesture | Visible effect | Haptic | Sound | Duration | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Scan the pass or VIN | iOS Camera code scanner | built: type six characters | a field; the button says "Scan The VIN" but opens a text field | none | keystroke none | none | partial `Auction.tsx:374-378`, `Auction.tsx:387`; the label claims a scan the screen does not do |
| It started | Wallet pass turns valid | tap "It Started" | swell; the phone's pass turns green over the socket | vibrate | four-note chime, `cloud-landed` | 420 ms | implemented `Auction.tsx:390`, `Auction.tsx:355` |

### Admin

| Moment | Pattern (source) | Gesture | Visible effect | Haptic | Sound | Duration | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Read the week | iOS Settings grouped rows | none | every figure counts to its new value and pulses 1.06 | none | none | 450 ms count, 320 ms pulse | implemented `AuctionAdmin.tsx:70-90`, `motion.ts:108-129` |
| Suspend a dealer | iOS action sheet, destructive row | tap | browser `confirm()` dialog | none | none | none | implemented `AuctionAdmin.tsx:51-56`; a browser modal |
| Copy a key | iOS "Copied" HUD | tap Copy | label to "Done"; swell | vibrate | four-note chime, `cloud-landed` | 420 ms | implemented `AuctionAdmin.tsx:129`, `AuctionAdmin.tsx:153` |

## 4. The site (`obavia-co/`)

Press physics for every `.btn`, `.cloud` and card: `obavia-co/site.js:138-170` (sink 2.5 px and 0.985 in 110 ms, rise on a 0.65 spring, cancel flat, `cloud-touch` down and `cloud-rise` up; landed is a swell plus `cloud-landed`, `site.js:149-150`). On top of that, buttons with the class `.cloud` or the attribute `data-cloud3d` are handed to the 3D cloud engine (`obavia-co/cloud3d.js:57-70`): hover for fine pointers with `cloud-hover` (`cloud3d-engine.js:636-640`, `cloud3d-engine.js:673-685`), a breath over `cloud-drift` past 400 ms (`cloud3d-engine.js:703-707`), and on release the swell, shed wisps, the air ring at 0.18 and the 1 px label dip (`cloud3d-engine.js:709-724`). That engine is uncommitted work in progress at the time of this audit; the rows below cite it as it stands. Haptic: `shell.js:41-46` (vibrate on Android, the iOS 18 switch tick on iPhone), but it fires only on `<a class="btn">` (`shell.js:61-63`); the hero button and every application choice are `<button>` elements, so they press without a haptic.

### First viewport (`index.html`)

| Moment | Pattern (source) | Gesture | Visible effect | Haptic | Sound | Duration | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Land on the page | iOS app launch, the mark resolving | none | the mark draws, the veil lifts, the hero settles, the sky drifts | none | `cloud-settle` | intro, then drift 48 to 120 s | implemented `index.html:21`, `index.html:31-51`, `site.js:159-160`, `cloud-atmosphere.js:46-78` |
| The pair | lego §7: the lane photograph beside the cloud button | none | built: a sentence and an empty film frame captioned "Film in the works, December 4" | none | none | none | partial `index.html:64-76`; no lane photograph |
| Get on the lane | Apple Pay single button, cloud press | tap | sink, rise, wisps, air ring, label dip; glide to the application; the cloud lands when the scroll ends | none (a `<button>`) | `cloud-touch`, `cloud-rise`, `cloud-landed` | sink 100 ms, rise 600 ms tween on the 0.65 curve, landed 420 ms | partial `index.html:69`, `cloud3d.js:57-70`, `cloud3d-engine.js:709-733`; no haptic |
| Hover the button | macOS hover lift, the sun catching it | pointer enters (fine pointer only) | lifts 2 px, brightens; label tracking widens a hair | n/a | `cloud-hover` once on enter | 180 ms | implemented `cloud3d-engine.js:636-640`, `cloud3d-engine.js:673-685` (uncommitted) |

### The application pages (`index.html` §apply, `lane-apply.js`)

| Moment | Pattern (source) | Gesture | Visible effect | Haptic | Sound | Duration | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Answer a choice | iOS Settings choice, one per page | tap | choice sinks and rises (no wisps: `.ap-choice` is not a `.cloud`); next page settles up 10 px; progress line grows | none (a `<button>`) | `cloud-touch`, `cloud-rise`, `cloud-settle` | 420 ms expo.out | partial `lane-apply.js:51-71`, `lane-apply.js:78-84`, `site.js:155-165`; no haptic |
| Progress | Safari load bar | none | a 2 px line scales to the share done | none | none | 420 ms | implemented `lane.css:119-121`, `lane-apply.js:56` |
| GDN matched | iOS contact card found | type | the dealer's name and city appear under the field; the button reads "That's us" | none | none | 350 ms debounce | implemented `lane-apply.js:122-138` |
| The code | iOS one-time-code AutoFill | tap the suggestion | the field fills and moves on by itself | none | `cloud-settle` | none | implemented `index.html:152`, `lane-apply.js:168-174` |
| Submit | Apple Pay done tick | tap Apply | the Apply cloud sheds wisps on release; the form swells; the key page settles in | none | `cloud-landed` | swell 420 ms | partial `lane-apply.js:213-223`, `site.js:149-150`; no haptic |
| Copy the key | iOS "Copied" HUD | tap | label reads "Copied" for 2.4 s | none | none | 2.4 s | partial `lane-apply.js:234-239`; no haptic, no swell |
| Back | iOS back chevron | tap | page settles down 10 px | none | `cloud-settle` | 420 ms | implemented `lane-apply.js:73` |

### The buyer page (`waitlist.html`)

| Moment | Pattern (source) | Gesture | Visible effect | Haptic | Sound | Duration | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| The pair | Instagram post: the image is the claim | none | the Lane as built on a phone beside one card with one field | none | `cloud-settle` | settle | implemented `waitlist.html:70-97` |
| Get early access | Apple Pay done tick | tap | the button sheds wisps on release; the card swells; a check and the typed address land where the field was | switch tick or vibrate | `cloud-touch`, `cloud-rise`, `cloud-landed` | swell 420 ms | implemented `waitlist.html:81`, `waitlist.html:178-184`, `waitlist.html:203` |
| A wrong address | (house silence) | tap | one short line; no sound | none | none | none | implemented `waitlist.html:192-194` |

## 5. Hover, and what the phone carries instead

Hover exists only where `(hover: hover) and (pointer: fine)` is true (mobile-native §1; cloud-system §2). Built on the web:

- Site: every `.cloud` button lifts 2 px, brightens and plays `cloud-hover` once on enter (`obavia-co/cloud3d-engine.js:636-640`, `cloud3d-engine.js:673-685`, uncommitted; the CSS-only lift remains as the no-script fallback, `cloud.css:51-53`); cards lift 3 px (`cloud.css:41`); links, back and choices (`lane.css:21`, `lane.css:117`, `lane.css:136`).
- Desk: the primary button's lobes and glow (`desk/src/styles.css:115-117`), state tiles (`styles.css:268-275`), rows (`styles.css:394-395`), text links (`styles.css:401`), choice chevrons (`styles.css:481`), every cloud surface's shade (`styles.css:669-670`).
- Missing on the Desk: `cloud-hover` on enter (the file ships in `desk/public/sfx/cloud/`; `desk/src/ui.tsx:25` does not load it) and the sun term (+8 percent brightness) from cloud-system §2.

A phone has no hover, so the after-effect the owner asked for ("subsequent to hovering, clicking") must happen on press and after it, in one frame:

| Surface | What the phone carries | State |
| --- | --- | --- |
| App (`auction/`) | sink, rise, 7 wisps, air ring, label dip, shadow lengthening, swell, puff, breath, Light at touch-down, Heavy on landed | implemented `CloudButton.tsx:186-210`, `CloudButton.tsx:168-174`; `PressCloud` has sink, rise and swell but no wisps or ring (`Cloud.tsx:113-157`) |
| Desk on a phone | sink, rise, swell, the kit, a vibrate | partial; no wisps, no air ring (`motion.ts:154-161`), no haptic on iPhone (`ui.tsx:46`) |
| Site on a phone | sink, rise, wisps, air ring, label dip and swell on `.cloud` buttons; sink, rise and swell on other `.btn` and cards; the kit; a haptic on links | partial; wisps and ring only through the uncommitted engine (`cloud3d-engine.js:709-724`), none on `.ap-choice`; no haptic on `<button>` (`shell.js:61-63`) |

The app never loads `cloud-hover` (`feel.ts:9-24`). That is correct: a touch screen has nothing to hover.

## 6. Conflicts found while mapping (reported, not resolved)

1. **The Lane hold.** `lego.md` §3 says hold freezes the countdown ring (TikTok). `obavia-auction-decisions.md` §3.1 says hold plays the engine. The code does neither (`Lane.tsx:75-78`). A ring that freezes under the thumb shows a clock the server is not keeping, which breaks "claims match verified capability". TikTok's hold pauses media; the engine recording is that media.
2. **Two decided gestures fail lego §3.** Long-press the ring for the time (decisions §3.1) and long-press the floor to lower it (decisions §3.2, phases Phase 1 Live). Both need a tooltip.
3. **The Lane's primary action fails lego §3 as built** (§1). Making a tap on the price open the Bid sheet at one increment changes the decisions §3.1 Lane row and the first-bid script (§3.4); it needs a dated amendment before it is built.
4. **Pay.** `lego.md` §7 gives the Pay row "Apple Pay's gesture, Success haptic". The balance does not move in the app (`Pay.tsx:23` records the choice), so a Success there would confirm a payment that has not happened. The deposit's Apple Pay gesture belongs to Whop's hosted checkout, which Obavia does not control.
5. **Reduced motion and sound.** The app keeps sound and haptics under reduced motion (`CloudButton.tsx:21-22`), and the site now does too, citing the owner on October 13: "sounds stay" (`site.js:120-125`). The Desk still mutes every sound under reduced motion (`ui.tsx:8`, `ui.tsx:13`, `ui.tsx:40`). cloud-system §4 does not carry the owner's line yet.
6. **Step completion chimes.** `feel.ts:103-104` keeps `done` for "Won, or a hold completed"; the Won steps fire it five more times (ID, Insure, three signatures). decisions §3.1 gives each tile "ding + light". The win chime loses its meaning by the fifth repeat (apple-design §13, utility).

## 7. Missing, in phase order

Phase 1 first (pilot, weeks 1 to 3, exit test Mon Nov 2, 2026), then Phase 2. Each line is a brief a frontend agent can take.

1. Phase 1. Watch: the Obavia mark blooms at the double-tap point and swells 1.03 over 420 ms with Light and `cloud-touch` (a new `feel.watch`); then delete the "double-tap a car to watch it" line. `auction/src/screens/Lane.tsx`, `auction/src/feel.ts`, `auction/src/screens/Me.tsx`.
2. Phase 1, after a dated decisions.md amendment (§6 items 2 and 3): a tap on the price opens the Bid sheet at one increment; remove the ring's long-press toast. `auction/src/screens/Lane.tsx`.
3. Phase 1. Won steps: a `feel.step` (a ding plus Light) replaces `feel.done` on ID, Insure and each signature; the check draws on in 240 ms; the next tile lifts 4 pt. `auction/src/feel.ts`, `auction/src/screens/won/Won.tsx`, `won/Scan.tsx`, `screens/Paper.tsx`.
4. Phase 1. Deposit back from Whop: Success and `cloud-landed` with the held line, as one event, before the bid's thud. `auction/src/screens/BidSheet.tsx`.
5. Phase 1. First bid runs the ID frame before the deposit (decisions §3.1, phases Phase 1 Customers). `auction/src/screens/BidSheet.tsx`, `auction/src/screens/won/Scan.tsx`.
6. Phase 1. ID: tap State opens a wheel with Selection per detent; the long-press goes. `auction/src/screens/won/Scan.tsx`.
7. Phase 1. Pickup pass: screen brightness to full while the QR shows (Wallet behavior; adds `expo-brightness`). `auction/src/screens/won/Pickup.tsx`.
8. Phase 1. Desk Live: a bid landing pulses the figure and plays the one-note tone with a haptic; Sold: when the sale arrives on an open page, `feel.done` and `landed` on the hammer figure. `desk/src/Auction.tsx`.
9. Phase 1. Desk pickup: a camera scan of the buyer's pass, with the typed six as the fallback; until then the button says what the screen does. `desk/src/Auction.tsx`.
10. Phase 1. Desk photos: a tap opens the photo; removal moves to a visible remove control on the opened photo. `desk/src/Auction.tsx`.
11. Phase 1. Desk haptics on iPhone: port the iOS 18 switch tick from `obavia-co/shell.js:41-46` into `desk/src/ui.tsx` `haptic`.
12. Phase 1. Replace `confirm()` with a bottom action sheet (iOS destructive row) for Sell It Now and Suspend. `desk/src/Auction.tsx`, `desk/src/AuctionAdmin.tsx`, `desk/src/Sheet.tsx`.
13. Phase 1. Car: photos zoom from their thumbnail with pinch and swipe-down dismiss; condition badge with six Light impacts 60 ms apart. `auction/src/screens/CarSheet.tsx`.
14. Phase 2. Site and application haptics: fire `OSHELL.haptic` on `<button class="btn">` presses and on submit; commit the 3D cloud engine so the wisps and ring this file cites are in the tree. `obavia-co/shell.js`, `obavia-co/lane-apply.js`, `obavia-co/cloud3d.js`.
15. Phase 2. Desk after-effects: wisps and the air ring on release, `cloud-hover` once on enter for fine pointers, and the kit kept under reduced motion as the site and app do. `desk/src/motion.ts`, `desk/src/ui.tsx`.
