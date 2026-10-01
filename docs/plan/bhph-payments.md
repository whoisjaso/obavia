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

# How payments get received, and how everyone knows

Research date: October 1, 2026, read from each company's own pages and developer docs. Lines marked **to confirm** need a call, a sandbox test or counsel before launch.

## 1. Which processor

| Option | What it is | Fit for our notes |
|---|---|---|
| **PayNearMe** | Built for buy here pay here and auto lenders. Takes **cash at 7-Eleven and CVS** (by barcode), card, ACH, Cash App, PayPal and Apple Pay. Offers **one-tap pay links by text** (no login), autopay and reminders. | **Best fit.** Its developer docs spell out callbacks for every payment, decline, refund, chargeback and ACH return (details in §2). Cash at retail matters for buyers without bank accounts. |
| **REPAY** | Auto-finance specialist. Card, debit and ACH, text-to-pay, phone payments (IVR), a pay portal and autopay. Payments "automatically post back to your DMS". Has a partner program for software companies like us. | **Strong second.** We need its API docs through the partner program. |
| **Carpay** | A customer app for buy here pay here payers. Pay by app, by texting PAY, by phone or on the web. Reminders, autopay, and "real-time" sync with the dealer's system. Says "$0 additional out-of-pocket" for the dealer. | A partner to integrate with when a dealer already uses it, not our main processor. |
| **FrazerPay / PayMyCar** | Frazer's own processor and pay site. | Only for Frazer dealers. Shows what dealers expect: recurring payments on the due date, automatic posting and emailed receipts. |
| **Stripe** | General processor. | **Not for notes.** Stripe lists "Loan repayments with credit cards" as **prohibited**, and "Lending services" as **restricted** (approval needed). Fine for Obavia's own subscription billing. |
| **A white-label processor for software platforms (e.g. Finix)** | Lets Obavia run payments under its own brand and earn on each transaction. | Later, once volume justifies it. **To confirm:** that it underwrites auto lending and debt repayment. |

**Card rules that shape the choice.**
- Visa and Mastercard have lower-fee **debt repayment programs**, but only for **debit and prepaid cards**, and only for lenders registered under financial-institution category codes (**6012 or 6051**). Fees run about **0.65% + $0.15, capped at $2.00** on exempt Visa debit.
- A dealer usually processes as a car dealer (category 5521), so whether a buy here pay here dealer qualifies is **to confirm** with the processor.
- Credit-card loan payments are where processors draw lines: Stripe bans them, while auto specialists take cards.

**Bank (ACH) rules** (Nacha, the network that runs US bank transfers):
- before the first online debit from a bank account, it must be **validated** (open and able to take debits);
- recurring debits need a **signed or similarly authenticated authorization**, and the buyer must be sent a copy (Regulation E).

PayNearMe and REPAY handle both.

**Recommendation:** start with **PayNearMe**, with **REPAY** as the alternative. Keep cash at the counter in the Desk as it is today.
- **No payment processing turns on without the owner's go-ahead.**
- **Do not charge buyers convenience fees until the OCCC or counsel confirms they're allowed** under Finance Code ch. 348. We didn't find a published OCCC answer.

## 2. How the Desk knows where every payment stands

Every payment has a status. The ledger counts a payment while it is cleared or clearing, and stops counting it if it comes back:

| Status | When | Counts toward the note? |
|---|---|---|
| **Cleared** | Cash at the counter; a card or debit payment the processor approved | Yes |
| **Clearing** | A bank (ACH) payment. Stripe's docs say ACH takes **up to 4 business days** to confirm, and consumers can dispute for **60 days** | Yes, marked as clearing |
| **Returned** | The bank sent it back (e.g. **R01 Insufficient Funds**) | No. The installment is due or late again |
| **Charged back** | The cardholder disputed it | No |
| **Refunded** | The dealer refunded it | No |

**PayNearMe callbacks** (from its developer docs):
- **Confirmation callback,** sent for each payment or decline. Its fields:
  - `pnm_order_identifier`: PayNearMe's payment id;
  - `site_customer_identifier`: **our note id**;
  - `payment_amount`;
  - `payment_type`: ach, cash, cash_app, credit, debit or paypal;
  - `pnm_processing_fee`;
  - `status`: payment or decline;
  - `payment_timestamp`.
- **Reverse callback,** sent for cancellations, refunds, chargebacks and bank returns. Its fields:
  - `reverse_type`, e.g. "Chargeback" or "Bank Return";
  - `reverse_code`, e.g. "refunded" or "R01";
  - `reverse_reason`, e.g. "Insufficient Funds".
- **Our acknowledgement** must come back **within 10 seconds**. Otherwise PayNearMe resends every minute for 30 minutes, then pauses callbacks until someone resumes them in its portal.
- **Callbacks are signed with HMAC-SHA256.** Which header carries the signature is **to confirm** in the sandbox. It's a single constant in our code.

## 3. Texting both the buyer and the dealership

| Event | Buyer gets | Dealership gets |
|---|---|---|
| Payment received | "Triple J Auto: we received your $126.28 payment (receipt #1001). Balance $5,894.43. Next payment $126.28 due Friday, October 16." | "Payment in: $126.28 from Maria Example, 2016 Honda Accord LX. Balance $5,894.43." |
| Bank payment started | "…your $126.28 bank payment is on its way and usually clears in 3 to 4 business days…" | "Bank payment started: … Clearing." |
| Bank payment returned | "…came back from your bank (insufficient funds). Please call us or reply to pay another way." | "Payment returned: … Their account is $X past due." |
| Card declined | "…didn't go through. Please try another card or reply and we'll help." | "Payment declined: …" |
| Chargeback | (nothing) | "Chargeback: … Respond in your processor's portal." |
| Refund | "We refunded $X to you. Balance $Y." | "Refunded $X to …" |

**Is it allowed?**
- **Carriers prohibit third-party debt collection texts.** Twilio's error 30943 says carriers reject those campaigns.
- **First-party messages,** where the creditor texts its own customers about their own balances, "may be permissible under a different campaign use case". Our texts are first-party: the dealer about its own note. They go out under the dealer's own texting campaign, registered as **account notifications / customer care**.
- **Every text goes through the messaging gate.** STOP is honoured, every send is logged, and the compliance gate applies.
- **Consent to text** the number on the contract is captured at signing.
- **Dealership alerts** go only to the numbers the owner chooses.
- **Texas Finance Code ch. 392** (debt collection) bars harassment, so payment texts stay factual and few.
- **Counsel review** is required for the wording and the consent.

**Licensing:** OCCC says sellers and holders of retail installment contracts need a **Chapter 348 Motor Vehicle Sales Finance licence**. A buy here pay here dealer that carries its own notes needs one.

## 4. What is built (October 1)

- **`src/lib/loans.ts`:**
  - payment statuses, so returned, refunded and charged-back payments stop counting;
  - `updatePayment()`;
  - `paymentTexts()`, which writes the buyer and dealership text for every event.
- **`server/payments/paynearme.ts`:** reads PayNearMe confirmation and reverse callbacks (JSON or form fields), checks the HMAC signature, and builds the exact acknowledgement.
- **`server/payments/desk.ts` (`PaymentDesk`):**
  - applies a payment to the note, and ignores the same payment if it arrives twice;
  - moves bank payments from clearing to cleared or returned;
  - texts the buyer and every dealership alert number through the Messenger. A buyer who sent STOP is never texted; the dealership still is.
- **`POST /webhooks/paynearme`** on the Worker. Notes and receipt numbers are stored in D1 (`server/schema.sql`).
- **Tests:** 16 for the loan engine, 9 for payments, plus the webhook route.
- **Desk:** after a payment, "Receipt #1001 · texted to Chris and you", with **See The Texts** showing both messages.

## 5. To turn on

1. Apply with PayNearMe (and ask REPAY for partner API docs).
2. Confirm in the PayNearMe sandbox:
   - the signature header;
   - the callback format;
   - pay links by text, so we can send our own "Pay Now" link in reminders;
   - autopay;
   - the fee model.
3. Move notes from the browser into D1 (or Supabase).
4. Deploy the Worker with `PAYNEARME_CALLBACK_SECRET`, and have the owner set the dealership alert numbers.
5. Get counsel review of the wording and consent, OCCC confirmation on fees, and the dealer's ch. 348 licence.

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
