// Runs only when TEST_DATABASE_URL points at a disposable Postgres.
// Applies the Supabase migration plus a test-only auth shim, then runs the
// same journey the memory store passes, plus RLS direct-object-access tests.
import { readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createPgStore } from "@/lib/store/pg";
import { AuthzError, OTHER_STAFF, TENANT_ZERO_STAFF } from "@/lib/store/types";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

const input = {
  vehicle: { vin: "1HGCM82633A004352", decodeSource: "manual" as const },
  buyer: { name: "Ana", phone: "713-555-0100", preferredLocale: "es" as const },
};

d("postgres store", () => {
  const sql = postgres(url ?? "postgres://invalid", { prepare: false, max: 2 });
  const store = createPgStore(sql);

  beforeAll(async () => {
    await sql.unsafe(readFileSync(path.resolve("tests/db/auth_shim.sql"), "utf8"));
    await sql.unsafe(readFileSync(path.resolve("supabase/migrations/0001_init.sql"), "utf8"));
    await sql.unsafe("grant select on all tables in schema public to authenticated");
  });
  beforeEach(async () => {
    await sql.unsafe("truncate audit_events, inquiries, registration_evidence, deliveries, relationships, checks, documents, deals, people, memberships, orgs cascade");
    await store.seed();
  });
  afterAll(async () => {
    await sql.end();
  });

  it("AC-1: staff cannot open another org's deal", async () => {
    const deal = await store.createDeal(TENANT_ZERO_STAFF, input);
    await expect(store.getDealForStaff(OTHER_STAFF, deal.id)).rejects.toBeInstanceOf(AuthzError);
    await expect(store.getDealForStaff(TENANT_ZERO_STAFF, "deal_other_fixture")).rejects.toBeInstanceOf(AuthzError);
    await expect(store.runCheck(OTHER_STAFF, deal.id)).rejects.toBeInstanceOf(AuthzError);
  });

  it("AC-2/AC-7: invite → accept with contact match; forwarded or reused token yields nothing", async () => {
    const deal = await store.createDeal(TENANT_ZERO_STAFF, input);
    const rel = await store.inviteCustomer(TENANT_ZERO_STAFF, deal.id);
    await expect(store.requireDealForCustomer(deal.buyer.id, deal.id)).rejects.toBeInstanceOf(AuthzError);
    expect(await store.respondToInvite(rel.inviteToken, "wrong@example.com", "accept")).toEqual({ ok: false, reason: "contact_mismatch" });
    expect(await store.respondToInvite("nope", "713-555-0100", "accept")).toEqual({ ok: false, reason: "invalid" });
    const ok = await store.respondToInvite(rel.inviteToken, "(713) 555-0100", "accept");
    expect(ok.ok).toBe(true);
    expect((await store.requireDealForCustomer(deal.buyer.id, deal.id)).id).toBe(deal.id);
    expect(await store.respondToInvite(rel.inviteToken, "713-555-0100", "accept")).toEqual({ ok: false, reason: "expired" });
    await expect(store.requireDealForCustomer("person_other_buyer", deal.id)).rejects.toBeInstanceOf(AuthzError);
  });

  it("AC-5/AC-8/AC-11: delivery, registration evidence, dispute, audit trail, hash dedupe", async () => {
    const deal = await store.createDeal(TENANT_ZERO_STAFF, input);
    const a = await store.addDocument(TENANT_ZERO_STAFF, deal.id, "form_130u", "a.jpg", "bytes");
    const b = await store.addDocument(TENANT_ZERO_STAFF, deal.id, "form_130u", "a.jpg", "bytes");
    expect(b.id).toBe(a.id);
    await store.runCheck(TENANT_ZERO_STAFF, deal.id);
    const rel = await store.inviteCustomer(TENANT_ZERO_STAFF, deal.id);
    await store.respondToInvite(rel.inviteToken, "7135550100", "accept");
    await store.recordDelivery(TENANT_ZERO_STAFF, deal.id, "signed_receipt");
    let after = await store.getDealForStaff(TENANT_ZERO_STAFF, deal.id);
    expect(after.states.delivery).toBe("delivered");
    expect(after.states.registration).toBe("ready");
    await store.addRegistrationEvidence(TENANT_ZERO_STAFF, deal.id, "webdealer_receipt", "r.pdf");
    after = await store.getDealForStaff(TENANT_ZERO_STAFF, deal.id);
    expect(after.states.registration).toBe("submitted");
    expect(after.reviewEligibleAt).toBeTruthy();
    await store.disputeRelationship(deal.buyer.id, deal.id);
    expect((await store.getRelationshipForDeal(deal.id))?.status).toBe("disputed");
    const actions = (await store.listAudit(deal.id)).map((e) => e.action);
    expect(actions).toEqual(expect.arrayContaining(["deal.created", "document.uploaded", "check.ran", "invite.sent", "delivery.recorded", "registration.evidence_uploaded", "relationship.disputed"]));
    const today = await store.todayForStaff(TENANT_ZERO_STAFF);
    expect(today.find((t) => t.dealId === deal.id)?.reasonKey).toBe("disputed");
  });

  it("inquiries persist and land in Today first", async () => {
    await store.createInquiry({ name: "Test Buyer", contact: "713-555-0100", locale: "en", vehicle: "2019–2023 Tesla Model 3", paymentLow: 521, paymentHigh: 559, downPayment: 1500, creditBand: "prime" });
    const today = await store.todayForStaff(TENANT_ZERO_STAFF);
    expect(today[0].reasonKey).toBe("new_inquiry");
    expect(today[0].inquiry?.name).toBe("Test Buyer");
    expect((await store.todayForStaff(OTHER_STAFF)).find((t) => t.reasonKey === "new_inquiry")).toBeUndefined();
  });

  it("RLS: the authenticated role sees only its own org's rows and its own accepted deals", async () => {
    const deal = await store.createDeal(TENANT_ZERO_STAFF, input);
    const rel = await store.inviteCustomer(TENANT_ZERO_STAFF, deal.id);
    await store.respondToInvite(rel.inviteToken, "7135550100", "accept");
    const as = async (sub: string, q: string) =>
      sql.begin(async (tx) => {
        await tx.unsafe("set local role authenticated");
        await tx.unsafe(`select set_config('request.jwt.claims', '${JSON.stringify({ sub })}', true)`);
        return tx.unsafe(q);
      });
    expect((await as(TENANT_ZERO_STAFF, "select id from deals")).map((r) => r.id)).toEqual([deal.id]);
    expect((await as(OTHER_STAFF, "select id from deals")).map((r) => r.id)).toEqual(["deal_other_fixture"]);
    expect((await as("user_nobody", "select id from deals")).length).toBe(0);
    expect((await as(deal.buyer.id, "select id from deals")).map((r) => r.id)).toEqual([deal.id]);
    expect((await as(deal.buyer.id, "select id from audit_events")).length).toBe(0);
    expect((await as("person_other_buyer", "select id from deals")).length).toBe(0);
    expect((await as(OTHER_STAFF, "select id from inquiries")).length).toBe(0);
  });

  it("executed document versions are immutable", async () => {
    const deal = await store.createDeal(TENANT_ZERO_STAFF, input);
    const doc = await store.addDocument(TENANT_ZERO_STAFF, deal.id, "bill_of_sale", "b.pdf", "x");
    await sql`update documents set executed = true where id = ${doc.id}`;
    await expect(sql`update documents set file_name = 'y.pdf' where id = ${doc.id}`).rejects.toThrow(/immutable/);
    await expect(sql`delete from documents where id = ${doc.id}`).rejects.toThrow(/immutable/);
  });
});
