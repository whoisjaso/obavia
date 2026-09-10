/**
 * Offer Studio (brief §5). A blank price is `null`, never 0 and never an invented default.
 * `fictional: true` offers must always render `fictional_banner` and never populate a live offer.
 *
 * Owning module agent: M-script.
 */
import { z } from 'zod';
import { ApprovalStatus } from './scripts';

export const OfferPillar = z.object({
  name: z.string(),
  connects_to_problem: z.string(),
  delivery: z.string(),
});
export type OfferPillar = z.infer<typeof OfferPillar>;

export const OfferPrice = z.object({
  /** Minor units (e.g. cents). null = not set. NEVER default to 0. */
  setup_minor_units: z.number().int().nonnegative().nullable(),
  recurring_minor_units: z.number().int().nonnegative().nullable(),
  /** ISO-4217 code, e.g. "USD". */
  currency: z.string().length(3),
  payment_schedule: z.string(),
});
export type OfferPrice = z.infer<typeof OfferPrice>;

/** Estimated and committed timing are distinct; do not collapse one into the other. */
export const OfferTiming = z.object({
  estimated: z.string().optional(),
  committed: z.string().optional(),
});
export type OfferTiming = z.infer<typeof OfferTiming>;

export const OfferVersion = z
  .object({
    id: z.string(),
    offer_id: z.string(),
    version: z.number().int().nonnegative(),
    name: z.string(),
    buyer_type: z.string(),
    problem: z.string(),
    prerequisites: z.array(z.string()),
    deliverables: z.array(z.string()),
    exclusions: z.array(z.string()),
    implementation_dependencies: z.array(z.string()),
    supported_proof: z.array(z.string()),
    approved_claims: z.array(z.string()),
    /** Exactly three genuine pillars. */
    pillars: z.array(OfferPillar).length(3),
    price: OfferPrice,
    timing: OfferTiming,
    acceptance_criteria: z.array(z.string()),
    support: z.string(),
    cancellation_exit_handoff: z.string(),
    decision_roles: z.array(z.string()),
    status: ApprovalStatus,
    fictional: z.boolean(),
    /** Required when fictional, e.g. "FICTIONAL TRAINING OFFER — NOT A REAL QUOTE". */
    fictional_banner: z.string().optional(),
    /**
     * Additive (M-script): true = practice fixture. Structurally excluded from the live offer list
     * (see offers/liveOffers) even if `fictional` were ever false.
     */
    practice_only: z.boolean().optional(),
    /** Additive (M-script): free-text note beside supported_proof, e.g. "none yet". */
    supported_proof_note: z.string().optional(),
    /** Additive (M-script): free-text note beside approved_claims. */
    approved_claims_note: z.string().optional(),
  })
  .refine((o) => !o.fictional || (o.fictional_banner ?? '').length > 0, {
    message: 'fictional offers must carry a fictional_banner',
    path: ['fictional_banner'],
  });
export type OfferVersion = z.infer<typeof OfferVersion>;
