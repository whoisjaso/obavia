---
name: obavia-ux-standards
description: UX standards for every Obavia screen and flow. Use when designing, implementing, or reviewing any user interface, copy, state, notification, or bilingual path. Turns UX into testable requirements — states per screen, mobile-first web, WCAG 2.2 AA, English/Spanish parity, Dealer "Today" mode, and the buyer clarity promise.
---

# Obavia UX standards

## The two promises
Buyer: *"You shouldn't need to become a car-deal expert just to know what is happening."* Every buyer screen answers: what is confirmed, what is estimated, what is pending, what changed, what happens next.
Dealer: *"You don't need another dashboard. You need another pair of hands."* Dealer home is **Today mode**: the five things that need a human, and what Obavia already handled. Not 72 modules.

## Every screen/action specifies (and tests) these states
entry · happy path · loading · empty · validation error · partial data · stale data · unauthorized · offline/retry · conflict (two staff, two buyers) · recovery. "The page renders" is not done if the main action cannot work.

## Platform
Mobile-first responsive web is the reference client. Opening a listing, inquiry, or document must never require an app-store install. Native later shares validated domain contracts, not necessarily components. Install prompt only once a buyer has an active deal ("Install Obavia to get instant updates").

## Interaction rules
- Borrow recognizable patterns (inventory cards, conversation inbox, progress timeline). Do not imitate social-media mechanics that hide commitments or encourage accidental actions.
- Progressive disclosure. Reuse known information with confirmation. Preserve drafts and selected context.
- Explain the next action in plain language; no dealership jargon on buyer screens.
- Labels come from the claims registry. Never a bare "Verified"; never "Sold" as the only status.
- Destructive or consequential actions (allocate vehicle, mark delivered, send to signing) require explicit confirm with what it means and what it does not mean.

## Bilingual (EN/ES)
Both languages are first-class: layout, dates, currency, validation errors, notifications, key CRM interactions, support path. Consequential wording (financial, legal) gets native-speaker review. Machine translation is not legal equivalence. Never run a Spanish ad into an English-only flow.

## Accessibility
WCAG 2.2 AA: keyboard and screen-reader tested, visible focus, ≥24×24 targets, meaningful errors, no color-only states, no redundant re-entry. Conformance is assessed, not asserted.

## Motion & haptics
Respect reduced-motion. Haptics optional on supported clients, paired with visible state, never as proof of backend completion.

## Acceptance
Founder UX acceptance is a walkthrough with a representative user: task completion, wrong turns, repeated questions, recovery. Not "do you like it."
