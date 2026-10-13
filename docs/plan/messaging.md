# Texting, calling, signing: which providers, and why

Decision date: September 30, 2026. Prices are the providers' published US list prices, read that day with Firecrawl. **Estimate** means our arithmetic.

## What needs a provider

| Feature | Where | What it sends |
|---|---|---|
| Dealer verification code at onboarding | Desk | 1 text to the phone on the TxDMV licence |
| "Text the buyer the paperwork to sign" | Desk | A signing link, reminders, then the signed copy |
| Receipts and "your title is filed" updates | Desk | Transactional texts |
| Speed to lead, follow-up, re-engage | Reach | Two-way conversations, some with photos (MMS) |
| AI phone agent (later) | Reach | Voice minutes |
| Email: signing links, receipts, the owner's morning report | Both | Transactional email |

## Telnyx vs Twilio (US list prices)

| | **Telnyx** | **Twilio** |
|---|---|---|
| SMS out or in, per segment | **$0.004** + carrier fee | $0.0083 + carrier fee |
| MMS out | **$0.015** + carrier fee | $0.022 + carrier fee |
| MMS in | **$0.005** | $0.0165 |
| Local number | **$1.00/month** | $1.15/month |
| Toll-free number | n/a | $2.15/month |
| Carrier registration (10DLC: the carriers' sign-up for business texting) | Passed through **at cost, no markup** | Same carrier fees |
| Verification codes | $0.03 per success + SMS (their page says "from $0.05") | $0.05 per success + $0.0083 per SMS |
| Voice, outbound local | **$0.002/min** + SIP trunk fee | $0.014/min |
| Voice, inbound local | **$0.002/min** + SIP trunk fee | $0.0085/min |
| Registering many businesses (the ISV model) | Yes, a brand and campaign API for each customer | Yes |
| Network | Owns its own carrier network | Rents from carriers |
| Ecosystem, docs, third-party integrations | Good | **Largest in the industry** |

The carrier sign-up (10DLC) costs the same either way, charged by the carriers:
- **$4.50 one time** to register each dealer's business, plus an optional **$41.50** vetting for higher daily volume.
- **$15** per campaign (the declared message type) submitted for review.
- **$10 a month** per standard campaign; $1.50 for low volume.

## Decision: Telnyx first, behind our own interface, with Twilio as the backup

1. **Cost.** Texting is about **half the price** and voice about **a seventh**, and Telnyx doesn't mark up carrier registration. At dealer volume this is the difference between messaging being a rounding error and a real line on the bill.
2. **You already use it.** Your account, numbers and registrations carry over.
3. **Built for platforms like us.** We register each dealer as its own brand through the API. This keeps one lot's texting reputation from hurting another's, which is the same isolation TryGTM uses for its client spaces.
4. **The trade-off is ecosystem.** Twilio has more integrations, more examples and more vendors that plug in (several AI voice products assume Twilio). We cover that by writing a single `messaging` interface (send, receive, status, register brand, register campaign) with **Telnyx as the first implementation**. Twilio is a second implementation we can switch to per dealer if a carrier issue, an outage or an integration needs it. **No product code talks to a provider directly.**

### What it costs per dealer (estimate)
A lot that sends and receives about **2,000 text segments a month**. The carrier fee averages about $0.003 a segment (T-Mobile $0.0045, AT&T $0.0035).

| | Telnyx | Twilio |
|---|---|---|
| Messages (2,000 × rate + carrier fee) | about $14 | about $23 |
| Number | $1 | $1.15 |
| Campaigns (see below) | $10 to $20 | $10 to $20 |
| **Monthly total** | **about $25 to $35** | **about $34 to $44** |

Plus about **$35 once** per dealer: brand $4.50 plus two campaign reviews at $15. This goes into the Reach and Desk cost model in `dealer-gtm.md`, and it's why onboarding is non-refundable.

### Two campaigns per dealer, because the law treats them differently
- **Customer care (transactional):** signing links, receipts, title updates, appointment confirmations. The buyer asked for these as part of the deal.
- **Marketing:** Reach follow-ups, re-engagement, aged-inventory offers. These need **the buyer's express written consent** under the Telephone Consumer Protection Act (TCPA). The consent is recorded with the time, the wording shown and how it was given.

Declaring a false use case to get cheaper or faster sending carries carrier fines. We never do it.

## Signing by text (the Desk feature)

We already built the signing ceremony. A provider only **delivers the link**. We don't need DocuSign.

1. **Send:** the Desk texts and emails the buyer a one-time link. It is a signed token, bound to that sale and that buyer's phone, and it expires.
2. **Open:** the buyer reads each document to the end before the pad unlocks (already built). Reusing a signature needs explicit consent (already built).
3. **The record:** for every signature we store the time, IP address, device and the **hash of the exact document version** signed, plus the consent to sign electronically. This satisfies the federal ESIGN Act and the Texas Uniform Electronic Transactions Act (Tex. Bus. & Com. Code ch. 322). Have the dealer's lawyer confirm the exact consent wording before the first live sale.
4. **After:** the buyer gets the signed copy by text and email to keep.
5. **Stays ink:** documents the state requires signed in ink (the POA's odometer disclosure, for example) stay ink-only. The Desk already enforces this.

Cost per deal (estimate): about 4 texts plus 2 emails, **under $0.05**.

## Email: Resend
Transactional email (signing links, receipts, the morning report) goes through **Resend**. You already have it connected, and it's what TryGTM uses for its own service email. It sends from the dealer's own domain when their website is on Obavia.

## Build order
1. **Built (Oct 1).** The `messaging` interface and the Telnyx implementation: `desk/server/messaging/`. Send (SMS and MMS), Ed25519 webhook checks with a 5-minute replay window, Verify, and 10DLC brand, campaign and number calls. A compliance gate runs before every send: STOP blocks everything, marketing needs consent and Texas hours, and the opt-out line is added. STOP, START and HELP are answered by us.
2. **Built (Oct 1), not deployed.** Verification codes at onboarding: `desk/server/worker.ts` (Cloudflare Worker, D1, R2 contacts). After the code checks, the dealer's own phone, email and street come back from the licence record and fill their paperwork. Deploy steps are in `desk/server/wrangler.toml`. The app uses it when `VITE_API_BASE` is set; without it, it stays in preview. Still to confirm against the Telnyx sandbox: the `phone_number_campaigns` body.
3. Brand and campaign registration during onboarding, as one page-by-page step: "Let's register your texting". About $35, taking 1 to 5 days for carrier approval. **Tell the dealer the wait up front.**
4. Signing by text in the Desk.
5. Reach conversations.
6. The Twilio fallback implementation.
