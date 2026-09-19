import { beforeEach, describe, expect, it } from "vitest";
import * as store from "@/lib/store/memory";

const input = {
  vehicle: { vin: "1HGCM82633A004352", decodeSource: "manual" as const },
  buyer: { name: "Ana", phone: "713-555-0100", preferredLocale: "es" as const },
};

describe("store authorization and journey", () => {
  beforeEach(() => store.resetForTests());

  it("AC-1: staff cannot open another org's deal", () => {
    const d = store.createDeal(store.TENANT_ZERO_STAFF, input);
    expect(() => store.getDealForStaff(store.OTHER_STAFF, d.id)).toThrow(store.AuthzError);
    expect(() => store.getDealForStaff(store.TENANT_ZERO_STAFF, "deal_other_fixture")).toThrow(store.AuthzError);
    expect(() => store.runCheck(store.OTHER_STAFF, d.id)).toThrow(store.AuthzError);
  });

  it("AC-2/AC-7: customer sees only accepted relationships; forwarded or expired link yields nothing", () => {
    const d = store.createDeal(store.TENANT_ZERO_STAFF, input);
    const rel = store.inviteCustomer(store.TENANT_ZERO_STAFF, d.id);
    expect(() => store.requireDealForCustomer(d.buyer.id, d.id)).toThrow(store.AuthzError);
    expect(store.respondToInvite(rel.inviteToken, "wrong@example.com", "accept")).toEqual({
      ok: false,
      reason: "contact_mismatch",
    });
    expect(store.respondToInvite("nope", "713-555-0100", "accept")).toEqual({ ok: false, reason: "invalid" });
    const ok = store.respondToInvite(rel.inviteToken, "(713) 555-0100", "accept");
    expect(ok.ok).toBe(true);
    expect(store.requireDealForCustomer(d.buyer.id, d.id).id).toBe(d.id);
    // token reuse after acceptance is expired
    expect(store.respondToInvite(rel.inviteToken, "713-555-0100", "accept")).toEqual({ ok: false, reason: "expired" });
    // another person cannot read it
    expect(() => store.requireDealForCustomer("person_other_buyer", d.id)).toThrow(store.AuthzError);
  });

  it("decline shares nothing", () => {
    const d = store.createDeal(store.TENANT_ZERO_STAFF, input);
    const rel = store.inviteCustomer(store.TENANT_ZERO_STAFF, d.id);
    store.respondToInvite(rel.inviteToken, "7135550100", "decline");
    expect(store.getRelationshipForDeal(d.id)?.status).toBe("declined");
    expect(() => store.requireDealForCustomer(d.buyer.id, d.id)).toThrow(store.AuthzError);
  });

  it("AC-5: delivery recorded leaves registration visibly pending; AC-8 dispute keeps the record", () => {
    const d = store.createDeal(store.TENANT_ZERO_STAFF, input);
    const rel = store.inviteCustomer(store.TENANT_ZERO_STAFF, d.id);
    store.respondToInvite(rel.inviteToken, "7135550100", "accept");
    store.recordDelivery(store.TENANT_ZERO_STAFF, d.id, "signed_receipt");
    const after = store.getDealForStaff(store.TENANT_ZERO_STAFF, d.id);
    expect(after.states.delivery).toBe("delivered");
    expect(after.states.registration).toBe("ready");
    store.addRegistrationEvidence(store.TENANT_ZERO_STAFF, d.id, "webdealer_receipt", "r.pdf");
    expect(store.getDealForStaff(store.TENANT_ZERO_STAFF, d.id).states.registration).toBe("submitted");
    expect(store.getDealForStaff(store.TENANT_ZERO_STAFF, d.id).reviewEligibleAt).toBeTruthy();
    store.disputeRelationship(d.buyer.id, d.id);
    expect(store.getRelationshipForDeal(d.id)?.status).toBe("disputed");
    expect(store.requireDealForCustomer(d.buyer.id, d.id).id).toBe(d.id); // still readable, nothing deleted
  });

  it("AC-11: every transition writes an audit event; duplicate upload dedupes by hash", () => {
    const d = store.createDeal(store.TENANT_ZERO_STAFF, input);
    const a = store.addDocument(store.TENANT_ZERO_STAFF, d.id, "form_130u", "a.jpg", "bytes");
    const b = store.addDocument(store.TENANT_ZERO_STAFF, d.id, "form_130u", "a.jpg", "bytes");
    expect(b.id).toBe(a.id);
    store.runCheck(store.TENANT_ZERO_STAFF, d.id);
    const actions = store.listAudit(d.id).map((e) => e.action);
    expect(actions).toEqual(expect.arrayContaining(["deal.created", "document.uploaded", "check.ran"]));
  });
});
