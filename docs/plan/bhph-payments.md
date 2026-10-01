# Buy here pay here: tracking every payment

Research date: October 1, 2026, from each company's own pages and the Texas statutes. Anything marked **to confirm** must be checked before a customer relies on it. Legal points need attorney review before launch.

## What the incumbents do

| System | How payments work |
|---|---|
| **Frazer** | **FrazerPay**, its own processor, takes card, debit and ACH inside Frazer. It supports recurring payments that run the whole portfolio on each due date. Accounts update automatically and receipts go to the customer by email. **PayMyCar** is a dealer-branded pay site that imports payments into Frazer. Texting runs through Solutions by Text and Textmaxx Pro. |
| **FEX DMS (Finance Express)** | Its "Electronic Payment System" takes online ACH and card payments, and it reports to Equifax and TransUnion. |
| **DealerCenter** | A BHPH module with integrated accounting, QuickBooks sync and a customer "My Account" portal. |
| **Carpay** | A separate app that plugs into "every major BHPH DMS". Customers pay by app, by texting PAY, by phone (IVR) or on the web. It sends reminders by text, email and push, offers autopay, and syncs payments both ways in real time. |
| **PayNearMe** | Lets customers pay in cash at retail stores (7-Eleven and similar). It integrates with Auto Master Systems and Emotive. This matters for unbanked buyers. |

**The pattern:** the DMS owns the ledger, and a processor (its own or a partner) moves the money. Reminders and receipts come out of the ledger. We follow the same shape.

## Texas rules the ledger enforces (Finance Code ch. 348)

- **§348.107, late charge.** Only after the installment is unpaid past the 15th day. The cap is **5% of the installment, or interest at the contract rate**, and only one charge per installment. The Desk assesses 5% on the 16th day, once.
- **§348.406.** A **written receipt for every cash payment.** The Desk numbers every payment and writes the receipt text.
- **§348.405.** On written request, a **statement of payment dates and amounts and the unpaid total.** The account screen is that statement.
- **§348.114.** Deferment charges, used when a payment is pushed back. **Not built yet.**
- **Rate ceilings (§348.104).** The owner confirms the ceiling. The Desk never encodes one.
- **Licensing, to confirm:** a dealer who holds its own retail installment contracts needs a Motor Vehicle Sales Finance licence from the OCCC.

## Reminders, and the rules around them

- Reminders are transactional texts about the buyer's own account. They go through the same messaging gate as everything else, so STOP blocks every later text and the gate logs every send.
- **The schedule:**
  - three days before the due date;
  - on the due date;
  - three days late;
  - just before the late charge would apply;
  - then **once a week** while the account stays late.
- Texas Finance Code ch. 392 (debt collection) applies to creditors collecting their own debts and bars harassment, so reminders stay few, polite and inside daytime hours. Consent to text the number on the contract is recorded at signing. Both points need attorney review.
- The owner gets one **morning text**: what's due today, what's late, and what's been collected so far.

## What is built (in `desk/`)

- **`src/lib/loans.ts`, with 15 tests:**
  - level installments, and due dates for weekly, every-two-weeks, twice-monthly and monthly plans;
  - simple interest counted by the day (actual/365). Each payment pays late charges, then interest, then principal. Interest is never charged on interest;
  - account standing: current, due today, late (with days late), paid off; past-due amount, late charges owed, payoff today, and each installment marked paid, paid late, part paid, due, late or upcoming;
  - the reminder plan, receipt text, owner digest and owner morning text.
- **Payments screens:**
  - **list:** due today, late and collected today; the owner's morning text; and the accounts grouped late, due today, current and paid off;
  - **account:** what to ask for, payoff, the reminder switch and the texts that will go out, the schedule, and the payments received;
  - **Take A Payment:** the amount, with one-tap "what's due", "one payment" and "pay it off"; then the method (cash, card, ACH, Zelle, Cash App, check, money order); then a numbered receipt.
- **A note opens automatically** when an in-house sale is completed, from the financing answers already asked at the desk.

## What comes next

1. **Send the reminders and receipts** through the Telnyx layer once it's deployed and the dealer's texting campaign is approved.
2. **A pay link by text.** The buyer pays by card or ACH from the text, and the payment posts to the ledger. Processor options:
   - Stripe: card plus ACH, with ACH requiring a signed mandate;
   - Repay: auto-finance specialist;
   - PayNearMe: cash at retail;
   - Carpay: app plus autopay, if dealers already use it. We would integrate rather than compete.

   **No payment processing turns on without the owner's go-ahead.**
3. **Autopay** on the due date, with the buyer's authorization recorded.
4. **Promise to pay,** **deferments** (§348.114) and a **collections notes** log.
5. **Credit reporting** (Metro 2) and GPS/starter-interrupt integrations, as Frazer and FEX offer. Both need attorney review.

---

# Reach: every channel, and how each really connects

Facebook ended dealer vehicle listings on Marketplace from Pages and feeds on **January 30, 2023**. Feed-based Marketplace listings stopped in 2021. Marketplace is therefore posted **from the dealer's own phone, signed in as them, after they accept our terms**.

| Channel | How | Cost to the dealer |
|---|---|---|
| Facebook Marketplace | From the dealer's phone; terms signed | Free |
| OfferUp | From the dealer's phone; terms like Marketplace's | Free; optional promotion |
| Craigslist | From the dealer's phone ("cars & trucks by dealer") | About $5 a car |
| Facebook Page | Meta official API | Free |
| Instagram | Meta official API (business account) | Free |
| TikTok | TikTok Content Posting API | Free |
| YouTube | YouTube Data API (Shorts) | Free |
| Google | Vehicle listings feed (Merchant Center) | Free listings; ads are paid by click |
| CarGurus, Cars.com, Autotrader, Carsforsale.com | Nightly inventory feed | The site's own packages |
| Your website | Built by Obavia from the Desk | Part of Reach |

The Desk's Reach screen lists all of these with each company's own logo. A dealer taps "I Want This" for the channels they want; that choice is recorded, and nothing is posted yet. Logo sources: our existing set; Simple Icons (CC0) for Instagram, TikTok, Google and YouTube; offerup.com's own SVG; and the public-domain Craigslist wordmark from Wikimedia Commons.
