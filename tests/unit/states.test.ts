import { describe, expect, it } from "vitest";
import { canTransition, initialStates, transition } from "@/lib/domain/states";

describe("state dimensions", () => {
  it("has no sold boolean; six independent dimensions", () => {
    expect(Object.keys(initialStates).sort()).toEqual([
      "commercial",
      "delivery",
      "documentation",
      "funding",
      "registration",
      "servicing",
    ]);
  });
  it("delivered and registration pending can both be true (AC-5)", () => {
    let s = transition(initialStates, "delivery", "ready");
    s = transition(s, "delivery", "delivered");
    s = transition(s, "registration", "ready");
    expect(s.delivery).toBe("delivered");
    expect(s.registration).toBe("ready");
    expect(s.documentation).toBe("draft");
  });
  it("refuses illegal transitions", () => {
    expect(canTransition("registration", "not_ready", "submitted")).toBe(false);
    expect(() => transition(initialStates, "registration", "submitted")).toThrow(/Illegal/);
  });
});
