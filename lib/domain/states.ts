import type { DealStates } from "./types";

// Transition table per docs/architecture/DOMAIN.md. Every transition must be
// listed here; the store refuses anything else.
const allowed: { [K in keyof DealStates]: Record<string, string[]> } = {
  documentation: {
    draft: ["awaiting_signatures", "correction_required"],
    awaiting_signatures: ["signed", "correction_required"],
    correction_required: ["draft", "awaiting_signatures"],
    signed: [],
  },
  funding: {
    "n/a": ["pending"],
    pending: ["authorized", "exception"],
    authorized: ["received", "exception"],
    received: [],
    exception: ["pending"],
  },
  delivery: {
    not_scheduled: ["scheduled", "ready"],
    scheduled: ["ready", "not_scheduled"],
    ready: ["delivered"],
    delivered: ["disputed"],
    disputed: ["delivered"],
  },
  commercial: {
    open: ["conditionally_proceeding", "cancelled"],
    conditionally_proceeding: ["recorded_complete", "cancelled", "disputed"],
    recorded_complete: ["disputed"],
    cancelled: [],
    disputed: ["recorded_complete", "cancelled"],
  },
  registration: {
    not_ready: ["ready"],
    ready: ["submitted"],
    submitted: ["returned", "accepted"],
    returned: ["ready"],
    accepted: ["completed"],
    completed: [],
  },
  servicing: {
    "n/a": ["active"],
    active: ["exception", "closed"],
    exception: ["active", "closed"],
    closed: [],
  },
};

export function canTransition<K extends keyof DealStates>(
  dimension: K,
  from: DealStates[K],
  to: DealStates[K],
): boolean {
  return (allowed[dimension][from as string] ?? []).includes(to as string);
}

export function transition<K extends keyof DealStates>(
  states: DealStates,
  dimension: K,
  to: DealStates[K],
): DealStates {
  const from = states[dimension];
  if (!canTransition(dimension, from, to)) {
    throw new Error(
      `Illegal transition ${String(dimension)}: ${String(from)} → ${String(to)}`,
    );
  }
  return { ...states, [dimension]: to };
}

export const initialStates: DealStates = {
  documentation: "draft",
  funding: "n/a",
  delivery: "not_scheduled",
  commercial: "open",
  registration: "not_ready",
  servicing: "n/a",
};
