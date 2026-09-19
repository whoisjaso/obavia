import { describe, expect, it } from "vitest";
import { containsBannedLanguage, runPresenceCheck, verdictFrom } from "@/lib/domain/check";
import type { DocumentVersion } from "@/lib/domain/types";

const doc = (kind: DocumentVersion["kind"], v = 1): DocumentVersion => ({
  id: `d_${kind}_${v}`,
  dealId: "deal",
  kind,
  version: v,
  fileName: `${kind}.jpg`,
  sha256: "x",
  uploadedAt: "",
  uploadedBy: "u",
  executed: false,
});

describe("packet check", () => {
  it("unknown facts produce questions, not values (AC-4)", () => {
    const f = runPresenceCheck([]);
    expect(f.filter((x) => x.status === "review").every((x) => x.question)).toBe(true);
    expect(verdictFrom(f)).toBe("REVIEW_REQUIRED");
  });
  it("complete packet → NO_KNOWN_BLOCKER", () => {
    const f = runPresenceCheck([
      doc("form_130u"),
      doc("bill_of_sale"),
      doc("odometer"),
      doc("title_front"),
      doc("title_back"),
      doc("id_redacted"),
    ]);
    expect(verdictFrom(f)).toBe("NO_KNOWN_BLOCKER");
  });
  it("never emits approval-implying language (AC-3)", () => {
    const f = runPresenceCheck([doc("form_130u")]);
    for (const x of f) expect(containsBannedLanguage(x.evidence + " " + (x.question ?? ""))).toBeNull();
  });
  it("banned phrase detector catches bare Verified and No hidden fees", () => {
    expect(containsBannedLanguage("Status: Verified")).toBe("verified");
    expect(containsBannedLanguage("No hidden fees, ever")).toBe("no hidden fees");
    expect(containsBannedLanguage("Registration submitted")).toBeNull();
  });
});
