# Frazer DMS: what it does, where it breaks, where Obavia wins

Researched October 1, 2026 from these sources:
- frazer.com: home, pricing, FrazerPay and Hosted pages;
- the Frazer help manual;
- reviews on Capterra (4.6, 152 reviews) and G2 (3.9, 12 reviews);
- DealerSignals' 2026 comparison;
- PlugRoute's "why users leave" roundup, which quotes Reddit;
- a DealerRefresh forum thread.

Quotes are what dealers wrote. Nothing here comes from inside Frazer.

## What Frazer is

- **The company:** Frazer Computing has served independent dealers since 1985. Its own site says 17,000+ dealers; DealerSignals counts 19,000+. It is strongest in the Southeast and in rural markets.
- **Price:**
  - Desktop costs $129 a month, $387 a quarter or $1,299 a year.
  - "Hosted" (cloud) starts at $199 a month.
  - There are no setup fees, and support is free and unlimited.
  - FrazerPay costs extra; one reviewer pays about $35 a month.
- **What's in the box:**
  - inventory with VIN decoding, photos and syndication to hundreds of sites;
  - desking;
  - lender portals: RouteOne, Dealertrack, CUDL and 700Credit;
  - a form library ("70,000 forms", including attorney-reviewed installment contracts and free custom form programming);
  - a full general ledger, with a QuickBooks transfer;
  - 200+ integrations.
- **Buy here pay here:**
  - FrazerPay takes card and ACH payments and runs recurring charges across the whole portfolio.
  - PayMyCar is the buyer payment portal.
  - It integrates with GPS and starter-interrupt devices (PassTime, GoldStar, SVR, Advantage).
  - Collateral protection insurance and recurring fees can be synced to the payment schedule.
  - Texting runs through partners (Solutions by Text, Textmaxx).
  - Collections tools:
    - promise dates (collections work from the promise, not the due date);
    - pause payments;
    - repair balances;
    - a projected collections report.

## Where it breaks (what dealers say)

- **It's old.** "Antiquated as hell … not the same for other people in the office." It started as Windows desktop software, and "Hosted" is the same program run remotely.
- **It's hard for staff.** It works for the owner who learned it. New hires struggle.
- **It's slow and errors are vague.** Dealers report "unspecified error messages", slow printing, and workstations dropping off the main computer.
- **The payment portal can't model real accounts.** When a buyer has other balances (repairs, recurring fees) on a biweekly or monthly schedule, the online portal can't apply rules to them.
- **Its newer products lag.** "Payment processing or mobile companion app still feel like they're catching up."
- **Support is slipping.** Support was its moat. Recent reviews describe longer waits, and one says it went "hands down the worst" after an ownership change.
- **The price keeps rising.** DealerSignals reports yearly increases that undercut its budget positioning.
- **There's no real CRM follow-up.** "The only thing it's really lacking."
- **Moving data in is painful.** One dealer picked AutoManager because 5 years of history would have had to be "hand punched" into Frazer.

## What the Desk already does that Frazer doesn't

Each item below is built in the Desk today (see `bhph-payments.md`). None of them shows up anywhere in Frazer's public material.

| Obavia Desk | Frazer |
| --- | --- |
| **Money outside the processor gets matched to the right note.** The bank feed and receipt emails cover Zelle, personal Cash App and Venmo, checks and cash deposits. Sure matches post on their own, and each can be undone. | Payments through FrazerPay post themselves. Everything else is keyed in by hand. |
| **Can't pay versus won't pay.** Decline and return codes are read. Won't-pay is never retried, and a red flag goes to the owner. | Recurring charges run, but nothing interprets why one failed. |
| **The condition record from the sale is on the account,** and every later complaint is shown in days and miles since the sale. | Not offered. |
| **Cash at the counter has a person's name on it.** The drawer count is checked against the record, a short day shows who took what, and the bank deposit has to match. | General-ledger deposits only. |
| **The owner gets one text each evening:** money in by channel, and at most 3 things that need them. | Reports you have to go and run. |
| **Buyers get texts in Spanish,** including Spanish opt-out words. Texting is built in. | Texting through third parties. No Spanish shows up in their material. |
| **One question per screen,** so a new hire can run a sale on day one. | A dense desktop screen. |

## Gaps to close, in order of what wins a Frazer dealer

1. **Built (bhph-payments.md §16): a one-afternoon move off Frazer.** Import their customer, note, payment-history and inventory reports, so nothing is "hand punched". Switching cost is Frazer's real moat; if we remove it, the comparison is decided on product.
2. **Built (§15): promise to pay.** Record "I'll pay Friday". The account then works from the promise, and a broken promise moves to the top of the needs list. Frazer has this, and collectors live in it.
3. **Built (bhph-payments.md §17), except pausing payments: other balances on the note:** repair balances, recurring fees (insurance coverage the dealer adds, GPS fees), and pause or deferment, all handled by autopay and the payment link. This is exactly where reviewers say Frazer's portal fails.
4. **GPS and starter-interrupt partners** (PassTime, GoldStar, SVR): see the device on the account. Any disabling must follow Texas rules and the contract, so this needs counsel.
5. **Credit bureau reporting** (Metro 2), which many buy here pay here dealers offer as "builds your credit".
6. **Accounting export:** QuickBooks first. A full general ledger comes later, if ever.
7. **Lender and credit integrations** (700Credit, RouteOne, Dealertrack) for dealers who sell both ways.
8. **Inventory syndication** to the listing sites (Reach covers part of this).

## The edge, in one line

**Frazer records the money you collect. Obavia finds the money you're missing:**
- every Zelle, Cash App and cash payment tied to its note;
- every failed charge read as can't or won't;
- every complaint answered by the signed condition record;
- a drawer that can't quietly come up short.

Frazer wins on being cheap. We win on money recovered and on staff who need no training. The pitch is never "cheaper than $129". It is "here's what slipped through last month".
