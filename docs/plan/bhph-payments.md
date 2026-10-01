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
| **Stripe** | General processor. | **Not for notes.** Stripe lists "Loan repayments with credit cards" as **prohibited**, and "Lending services" as **restricted** (approval needed). Obavia's own subscription bills through **Whop** (owner's decision, October 1). |
| **A white-label processor for software platforms (e.g. Finix)** | Lets Obavia run payments under its own brand and earn on each transaction. | **Ruled out for notes.** Finix's own list marks "non-bank lenders: … any consumer financing services" and "loan repayments on a credit card" as **prohibited** for platform sub-merchants. See §6. |

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
- **Do not charge buyers convenience fees until counsel confirms the setup.** The Texas independent dealers' association (TIADA) reads Finance Code §348.108 as **not authorizing** dealer convenience fees. See §6.

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

## 6. Deep dive: which option is best (October 1)

Sources: each company's own site and docs, Finix's and Stripe's published business lists, the PayNearMe partner list, and TIADA's Texas guidance. Read through Firecrawl.

### The verdict

**PayNearMe first. REPAY as the backup. Nothing else is a real option for the notes.**

| Rank | Option | Why |
|---|---|---|
| 1 | **PayNearMe** | **It is the only one whose callback API is public**, so the webhook, ledger and two-sided texts are already built against it. It takes **cash at 7-Eleven and CVS**, which matters most for buyers without bank accounts. It has one-tap text pay links, autopay and every major method. Its partner list shows it already plugs into dealer and loan software: abcoa Deal Pack, AFS Vanguard, Allied Business Systems, AutoMatrix, Credex Systems, DealerSocket IDMS, Emotive and GOLDPoint. Industry maps name it as the subprime and buy here pay here default for cash and text pay. |
| 2 | **REPAY** | **It runs a formal partner program** for software companies ("integrations up and running in as few as 90 days"). It covers card, debit, ACH, IVR, text pay and portals, owns Payix and integrated with Emotive in 2025. **Its API is behind the partner agreement**, so we can't build against it until we sign. |
| — | **Carpay, BlytzPay** | **These are buyer-facing pay apps that sit on top of a dealer's system**, not processors we would build on. Carpay's own comparison page calls the DMS "the system of record" and itself "servicing and payments". To them, the Desk is that system. **Treat them as integrations or competitors, not rails.** |
| — | **Finix and other white-label payments for software platforms** | **Ruled out.** Finix lists consumer financing and credit-card loan repayment as **prohibited** for platform sub-merchants. This is the model that would have let Obavia earn on each payment. |
| — | **Stripe, Square, Helcim and other general processors** | **Ruled out for notes.** Stripe prohibits credit-card loan repayments and restricts lending. General processors either refuse or require special approval for consumer lending. Moov, for example, supports debit-only debt repayment. Obavia's own subscription bills through Whop. |
| — | **Whop** | **Ruled out for notes.** Whop's own rules prohibit "debt and lending services … consumer lending that require state or federal licensing", and a buy here pay here note needs an OCCC ch. 348 licence. It is built for digital products: no cash at retail, cards at 2.7% + $0.30, ACH 1.5% (max $5). **Obavia's own subscription bills through Whop** (owner's decision, October 1). On a $3,000 month, ACH costs $5 against $81.30 by card, so invoices should default to ACH. |
| — | **Building our own** | **Not now.** It would mean money transmission questions, Nacha origination, card-network registration and fraud losses. The specialists already carry all of that. |

### The Texas fee rule that shapes the business model

TIADA (Texas Independent Automobile Dealers Association) reads Finance Code **§348.108**, which lists every charge allowed on a retail installment contract, as follows.
- **Dealers may not charge or keep convenience fees.** This covers "expedited payment" and "processing" fees too. **A dealer may not receive "any incentive from a third party for utilizing a payment processing service."**
- **A processor's fee is allowed only if all of these hold:**
  - the **entire fee goes to the processor**;
  - the dealer gets **no direct or indirect benefit** from it;
  - the fee is **optional**, so another method is free (cash at the counter);
  - the dealer **keeps documentation** of all four.

What that means for us:
- **Obavia must never pass a payment rebate or revenue share to the dealer.** That would be an "incentive".
- **Whether Obavia itself may take a share of a buyer-paid fee is unresolved.** Until counsel clears it, **Obavia earns from the subscription, not from payments.**
- **Default: the dealer absorbs processing.** A buyer fee is possible only as the processor's own optional fee, with cash at the counter always free. The Desk already records cash payments, so the free method exists.


### How access to PayNearMe works (request, not self-serve)

There is **no self-serve sign-up**, so we have to request it. From PayNearMe's developer docs:
- **Sales and an NDA come first.** "Once you've signed your NDA, your Sales representative will invite you to your site's portal". API keys and the full developer docs are in that portal. The sandbox is `api.paynearme-sandbox.com`.
- **Two roles, and Obavia needs both.**
  1. **Triple J as a client.** It signs as a merchant and gets its own "site". Its account rep invites it to the portal.
  2. **Obavia as a Third-Party Proxy Partner (3PPP).** This is a software company that processes payments **on behalf of** PayNearMe clients through the **Proxy Site API**. That API covers `create_payment_method`, `make_payment`, `cancel_payment`, `schedule_auto_pay`, `find_orders`, and `get_smart_token` for text pay links.
- **3PPP steps:**
  1. Request access through Merchant Services or Account Management.
  2. **PayNearMe's Compliance team needs the client's written authorization** for the partner.
  3. Obavia receives API keys.
  4. PayNearMe enables proxy access on the client's site.
  5. Joint testing.
  6. The client schedules go-live.
- **This fits the model for every future dealer.** Each one signs with PayNearMe as a client and authorizes Obavia. Obavia never holds the money, which keeps us clear of money transmission.

### What to get on the calls

**PayNearMe** (Schedule a demo; "Partner with us"):
1. ISV/partner terms: can Obavia hold one platform account and onboard each dealer under it, or must each dealer contract directly?
2. Pricing: fee per method (card, debit, ACH, cash at retail), who pays, any monthly minimums. Can the fee be dealer-paid only?
3. Smart Links API: can we create a pay link for an amount and our note id, and send it in our own text?
4. Autopay: are the mandate and the Nacha authorization handled on their page?
5. Sandbox: the signature header name and an example signed callback.
6. Does a buy here pay here dealer qualify as category 5521, or under the lender debt-repayment rates?

**REPAY** (partner program): API docs, a sandbox, the same fee and onboarding questions, and the integration timeline.

### Order of work

1. **Today:** nothing is processing. Cash and counter payments in the Desk are live in preview.
2. **This week:** request a PayNearMe demo and a REPAY partner call. Send the questions above.
3. **Sandbox:** confirm the header and format, and run our webhook tests against real signed callbacks.
4. **Pilot:** Triple J's own notes, dealer-paid fees, with counsel sign-off on wording, consent and fees. Turn it on only with the owner's go-ahead.


## 7. Money from outside the processor: Zelle, Cash App, Venmo, checks

Buyers will keep paying however they like. **Every payment ends up in one ledger** through four routes:

| Route | What arrives | How the Desk knows whose it is |
|---|---|---|
| Processor (PayNearMe) | Card, debit, ACH, Cash App Pay, PayPal, cash at retail | The callback carries our note id. Exact |
| Bank feed (Plaid, read-only) | Zelle, ACH, checks, cash deposits | Zelle and ACH carry the sender's name; checks and cash don't |
| Receipt emails | Personal Cash App and Venmo | The receipt names the payer. In the bank these arrive only as one lump "cash out", with no names |
| The counter | Cash, money orders | Recorded in the Desk |

**The matching engine** (`desk/src/lib/match.ts`, 9 tests, plus 2 for the Plaid reader):
- **Set aside:** money going out, pending items, processor settlements (already counted from callbacks) and Cash App or Venmo cash-outs (already counted from their receipts). Nothing is counted twice.
- **Same payment seen twice:** a Zelle in both the bank feed and the email is kept once.
- **Score against every open note**, 0 to 1:
  - name: full 1, first initial and last name 0.85, last name only 0.55;
  - amount: exactly what's owed 1, whole installments or the payoff 0.9, anything up to the payoff 0.3;
  - date: near a due date.
- **Verdicts:**
  - **Sure:** 0.85 or higher, well clear of the next note.
  - **Likely:** 0.5 or higher.
  - **Unsure:** below 0.5. A nameless check or cash deposit is never "sure".
- **The dealer confirms with one tap.** It posts to the note, and the buyer and dealer texts go out exactly as for a processor payment.
- **The confirmed sender is remembered**, so next time a cousin's Zelle is sure.

**Desk:** Payments, then To Match. Each page shows one amount and asks one question ("Jordan Rivera?"), with Yes, Someone Else or Not A Car Payment.

**Server:** `server/bank/plaid.ts` pages Plaid `/transactions/sync` and keeps only posted money coming in (Plaid shows inflows as negative amounts).

**To turn on:**
1. A Plaid account; the dealer links the bank read-only.
2. Receipt forwarding: the dealer forwards Cash App and Venmo receipts to a Desk address, or connects the inbox.
3. Confirm the description and subject formats against Triple J's real bank lines and receipts.

**Cost:** Plaid bills Obavia per linked bank account. That's software cost, covered by the subscription. The dealer pays nothing extra for Zelle or Cash App.

## 8. Cash at the counter: one tap, then checked automatically

Counter cash leaves no digital signal, so it can't be detected. The rule: **automate whatever leaves a signal; cut what doesn't to one tap with the answer filled in; then check that tap automatically.**

- **Expected Today** (the Payments home) lists everyone due today or behind, most behind first, with the amount owed.
  - Tap a name, then "Yes, $126.28 Cash". The payment posts, a receipt number is issued, and the buyer and the owner are texted.
  - "Different Amount Or Way" opens the full payment flow.
  - Anyone who already paid today drops off the list.
- **Check 1, the buyer:** every cash payment texts a receipt. Cash taken but not recorded means no receipt, and the buyer calls.
- **Check 2, the drawer:** **Close The Day** shows the day's counter cash (7-Eleven cash and Zelle excluded).
  - If the drawer matches, one tap: "Counted, It's $X".
  - Otherwise "It's Different", then enter the count. The day shows **Short** or **Over** by the exact amount.
- **Check 3, the bank:**
  - A branch, teller or ATM cash deposit in the bank feed that equals a closed day's count marks that day **Banked**. Mobile check deposits don't count.
  - Each deposit banks one day, the oldest that fits, within 10 days.
  - Those deposits never appear in To Match.
  - A closed day not banked within 3 days is flagged, and the Payments home shows "N days to look at".
- **Code:** `desk/src/lib/cashday.ts` (4 tests), `desk/src/Cash.tsx`.
- **Not yet:** one deposit covering several days, and splitting a day across two deposits. The owner resolves those by hand until real Triple J deposits show the pattern.

## 9. Autopay, and can't-pay versus won't-pay

**Autopay on file** (`desk/src/lib/autopay.ts`, 7 tests; `desk/src/Autopay.tsx`). It's set up page by page from the account:
1. Pay Automatically?
2. Debit card or bank account.
3. When do they get paid?
4. They sign.

- **Debit cards and bank accounts only:**
  - **Credit cards are refused.** Processors prohibit loan repayment on them.
  - **Prepaid cards are refused.**
  - **The dealer can block card issuers by name.** Neobank cards can register as debit rather than prepaid.
  - The funding type comes from the processor when the card is saved. The preview uses the processors' published test cards.
- **Card and bank checks:** the card number checksum, the expiry date, and the routing number checksum.
- **Charge day:** the first payday on or after each due date, so a Friday-paid buyer is charged Friday.
- **The signed authorization:**
  - states the amount, the card or account, and when it's charged;
  - allows up to 2 retries;
  - says **autopay is optional and was not required for financing** (Regulation E, 12 CFR 1005.10(e));
  - says how to cancel.

  Counsel reviews the final wording.

**What a failed charge says.** Card decline codes and Nacha return codes map to four readings:

| Reading | Codes | What happens |
|---|---|---|
| **Can't pay right now** | 51, 61, 65, R01, R09 | Retried on their payday, at most 2 more times per payment |
| **Won't pay: on purpose** | R0, R1, R3 (stop or revoke), R02 (account closed), R07, R08, R10, 41, 43, 57, 62, chargeback | No retry; red on the Payments home |
| **Needs a new card** | 54, 14, R03, R04, R16 | No retry; ask for a new card |
| **Unclear** | 05 | One retry; amber |

**Signals the owner sees:**
- **Red:** an on-purpose reading in the last 60 days, or autopay turned off or the card removed without a replacement.
- **Amber:** can't pay, or a card that needs fixing, in the last 30 days.
- **Payday hint:** two short-on-money declines each followed by a payment on the same weekday suggest moving autopay to that day, in one tap.

**Screens:**
- the **Watch** card on the Payments home;
- a flag on the account;
- **History**, a timeline of every payment, failed charge and card change.

**Not yet:**
- the live charging scheduler and retries through the processor;
- reading decline codes from PayNearMe or REPAY callbacks. The field names are confirmed in the sandbox.

## 10. The condition record: "the car broke, so I'm not paying"

That's answered by records made at the sale, not by arguments.

- **At the sale:** a signed **Condition Report** is part of every sale except a tow-away. It sits right after the bill of sale. Each question is its own page:
  - Is the Buyers Guide on the window? (FTC Used Car Rule)
  - Did they drive it first?
  - Any warning lights? Which?
  - Anything not working? What?
  - Photos of the car: up to 6, each shrunk to a small JPEG.
- **The printed sheet** shows:
  - the vehicle, VIN and odometer;
  - as-is or warranty, taken from the bill of sale;
  - the checkboxes, the warning lights and the known issues;
  - the photos;
  - one line in red: "Repairs after today are the buyer's. Payments are due whether or not it needs repairs." Counsel reviews this wording.
- **Into the note:** when an in-house sale opens its note, the condition is copied onto the loan (`desk/src/lib/condition.ts`, 6 tests).
- **After the sale, on the account under Condition** (`desk/src/Condition.tsx`):
  - the heading reads "Sold As-Is." with the signing date and miles at sale;
  - the payment line;
  - what wasn't working at sale, and the photos;
  - every complaint since, as "27 days and 2,140 miles after the sale". A complaint already written down at sale is marked **Known at sale**;
  - **Add A Complaint**: what's wrong, in their words, then miles now.
- **History:** complaints also appear in the timeline, so a complaint, then autopay turned off, then a stopped payment reads as one story.

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
