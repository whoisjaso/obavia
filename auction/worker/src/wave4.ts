/* Wave 4's plain values, kept out of the entry module: the Workers runtime reads every export of src/index.ts as an entrypoint
   (a handler or a class), so a string or a RegExp exported there stops the Worker from starting (found by the local run, Oct 13). */

/** The arbitration clause (decisions §9 D13), behind ARBITRATION=1. The text is D13's own line, marked draft: the words are counsel's
    (Q14), not ours, and nothing on the glass says otherwise. A new wording is a new version. */
export const CLAUSE_VERSION = 'D13-draft-2026-10-13';
export const CLAUSE_TEXT = 'DRAFT, counsel review pending: Arbitration: FAA-governed clause naming Obavia and the dealer; no DTPA waiver; small-claims carve-out; shown once, scroll-to-end.';
/** A referral code: eight of these, no vowels, no 0, O, 1 or I (nothing a thumb mistypes or a voice mishears). */
export const CODE_ALPHABET = 'BCDFGHJKLMNPQRSTVWXYZ23456789';
export const REFERRAL_CODE = /^[BCDFGHJKLMNPQRSTVWXYZ23456789]{8}$/;
