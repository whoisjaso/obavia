// In-memory data layer for the front-end-first build (ADR-0009).
// Interface mirrors what the Supabase repository will implement. Everything
// here lives in the server process only; it resets on restart. Never treat
// it as production storage.
import { randomUUID, createHash } from "node:crypto";
import type {
  AuditEvent,
  CheckResult,
  Deal,
  DealStates,
  DealerCustomerRelationship,
  DealerOrganization,
  DeliveryEvent,
  DocumentKind,
  DocumentVersion,
  Locale,
  Membership,
  Person,
  RegistrationEvidence,
  Vehicle,
} from "@/lib/domain/types";
import { initialStates, transition } from "@/lib/domain/states";
import { RULE_SET_VERSION, runPresenceCheck, verdictFrom } from "@/lib/domain/check";
import {
  AuthzError,
  OTHER_ORG,
  OTHER_STAFF,
  TENANT_ZERO_ORG,
  TENANT_ZERO_STAFF,
  contactMatches,
  deriveToday,
  type AcceptOutcome,
  type Inquiry,
  type NewDealInput,
  type TodayItem,
} from "./types";

export { AuthzError, OTHER_ORG, OTHER_STAFF, TENANT_ZERO_ORG, TENANT_ZERO_STAFF };
export type { AcceptOutcome, Inquiry, NewDealInput, TodayItem };

interface Db {
  orgs: Map<string, DealerOrganization>;
  memberships: Membership[];
  people: Map<string, Person>;
  deals: Map<string, Deal>;
  documents: Map<string, DocumentVersion>;
  checks: Map<string, CheckResult>;
  relationships: Map<string, DealerCustomerRelationship>;
  deliveries: Map<string, DeliveryEvent>;
  regEvidence: Map<string, RegistrationEvidence>;
  audit: AuditEvent[];
  inquiries: Map<string, Inquiry>;
}

declare global {
  // eslint-disable-next-line no-var
  var __obaviaDb: Db | undefined;
}

function seed(): Db {
  const db: Db = {
    orgs: new Map(),
    memberships: [],
    people: new Map(),
    deals: new Map(),
    documents: new Map(),
    checks: new Map(),
    relationships: new Map(),
    deliveries: new Map(),
    regEvidence: new Map(),
    audit: [],
    inquiries: new Map(),
  };
  db.orgs.set(TENANT_ZERO_ORG, {
    id: TENANT_ZERO_ORG,
    name: "Triple J Auto Investment",
    city: "Houston, TX",
    verifiedByFounderAt: "2026-09-18T00:00:00Z",
  });
  db.orgs.set(OTHER_ORG, {
    id: OTHER_ORG,
    name: "Other Dealer (isolation fixture)",
    city: "Houston, TX",
    verifiedByFounderAt: "2026-09-18T00:00:00Z",
  });
  db.memberships.push({ userId: TENANT_ZERO_STAFF, orgId: TENANT_ZERO_ORG, role: "owner" });
  db.memberships.push({ userId: OTHER_STAFF, orgId: OTHER_ORG, role: "owner" });
  // One seeded deal for the other org so cross-tenant DOA tests have a target.
  const otherBuyer: Person = { id: "person_other_buyer", name: "Fixture Buyer", preferredLocale: "en" };
  db.people.set(otherBuyer.id, otherBuyer);
  const otherDeal: Deal = {
    id: "deal_other_fixture",
    orgId: OTHER_ORG,
    vehicle: { vin: "1HGCM82633A004352", year: 2003, make: "Honda", model: "Accord", decodeSource: "manual" },
    buyer: otherBuyer,
    saleType: "cash_retail",
    createdAt: new Date().toISOString(),
    createdBy: OTHER_STAFF,
    states: { ...initialStates },
  };
  db.deals.set(otherDeal.id, otherDeal);
  return db;
}

function db(): Db {
  if (!globalThis.__obaviaDb) globalThis.__obaviaDb = seed();
  return globalThis.__obaviaDb;
}

export function resetForTests() {
  globalThis.__obaviaDb = seed();
}

function now() {
  return new Date().toISOString();
}

function audit(actorId: string, action: string, dealId?: string, detail?: Record<string, unknown>) {
  db().audit.push({ id: randomUUID(), at: now(), actorId, action, dealId, detail });
}

// ---------- authorization helpers (server-enforced; RLS later) ----------
export function orgForStaff(userId: string): string | null {
  return db().memberships.find((m) => m.userId === userId)?.orgId ?? null;
}

function requireDealForStaff(userId: string, dealId: string): Deal {
  const orgId = orgForStaff(userId);
  const deal = db().deals.get(dealId);
  if (!orgId || !deal || deal.orgId !== orgId) throw new AuthzError();
  return deal;
}

export function requireDealForCustomer(personId: string, dealId: string): Deal {
  const rel = [...db().relationships.values()].find(
    (r) => r.dealId === dealId && r.personId === personId && (r.status === "accepted" || r.status === "disputed"),
  );
  const deal = db().deals.get(dealId);
  if (!rel || !deal) throw new AuthzError();
  return deal;
}

// ---------- reads ----------
export function getOrg(orgId: string) {
  return db().orgs.get(orgId) ?? null;
}
export function listDealsForStaff(userId: string): Deal[] {
  const orgId = orgForStaff(userId);
  if (!orgId) return [];
  return [...db().deals.values()]
    .filter((d) => d.orgId === orgId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function getDealForStaff(userId: string, dealId: string): Deal {
  return requireDealForStaff(userId, dealId);
}
export function listDocuments(dealId: string): DocumentVersion[] {
  return [...db().documents.values()]
    .filter((d) => d.dealId === dealId)
    .sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));
}
export function getCheck(checkId: string | undefined): CheckResult | null {
  return checkId ? db().checks.get(checkId) ?? null : null;
}
export function getRelationshipForDeal(dealId: string): DealerCustomerRelationship | null {
  const rels = [...db().relationships.values()].filter((r) => r.dealId === dealId);
  return rels.sort((a, b) => b.invitedAt.localeCompare(a.invitedAt))[0] ?? null;
}
export function getRelationshipByToken(token: string): DealerCustomerRelationship | null {
  return [...db().relationships.values()].find((r) => r.inviteToken === token) ?? null;
}
export function listDeliveries(dealId: string) {
  return [...db().deliveries.values()].filter((d) => d.dealId === dealId);
}
export function listRegEvidence(dealId: string) {
  return [...db().regEvidence.values()].filter((d) => d.dealId === dealId);
}
export function listAudit(dealId: string): AuditEvent[] {
  return db().audit.filter((a) => a.dealId === dealId).slice().reverse();
}
export function getPerson(personId: string) {
  return db().people.get(personId) ?? null;
}

export function createInquiry(input: Omit<Inquiry, "id" | "orgId" | "createdAt" | "status">): Inquiry {
  // Pilot: every buyer inquiry routes to tenant zero. Real routing needs
  // dealer inventory and consent records.
  const inq: Inquiry = { id: `inq_${randomUUID()}`, orgId: TENANT_ZERO_ORG, createdAt: now(), status: "new", ...input };
  db().inquiries.set(inq.id, inq);
  audit("buyer", "inquiry.created", undefined, { vehicle: input.vehicle });
  return inq;
}
export function listInquiries(userId: string): Inquiry[] {
  const orgId = orgForStaff(userId);
  return [...db().inquiries.values()].filter((i) => i.orgId === orgId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function todayForStaff(userId: string): TodayItem[] {
  return deriveToday(listInquiries(userId), listDealsForStaff(userId), getCheck, getRelationshipForDeal);
}

// ---------- writes ----------
export function createDeal(userId: string, input: NewDealInput): Deal {
  const orgId = orgForStaff(userId);
  if (!orgId) throw new AuthzError();
  const person: Person = { id: `person_${randomUUID()}`, ...input.buyer };
  db().people.set(person.id, person);
  const deal: Deal = {
    id: `deal_${randomUUID()}`,
    orgId,
    vehicle: input.vehicle,
    buyer: person,
    saleType: "cash_retail",
    createdAt: now(),
    createdBy: userId,
    states: { ...initialStates },
  };
  db().deals.set(deal.id, deal);
  audit(userId, "deal.created", deal.id, { vin: input.vehicle.vin });
  return deal;
}

export function addDocument(userId: string, dealId: string, kind: DocumentKind, fileName: string, bytesForHash: string): DocumentVersion {
  requireDealForStaff(userId, dealId);
  const sha256 = createHash("sha256").update(bytesForHash).digest("hex");
  const existing = listDocuments(dealId).filter((d) => d.kind === kind);
  const dup = existing.find((d) => d.sha256 === sha256);
  if (dup) return dup; // dedupe by hash
  const latest = existing.sort((a, b) => b.version - a.version)[0];
  const doc: DocumentVersion = {
    id: `doc_${randomUUID()}`,
    dealId,
    kind,
    version: (latest?.version ?? 0) + 1,
    fileName,
    sha256,
    uploadedAt: now(),
    uploadedBy: userId,
    supersedesId: latest?.id,
    executed: false,
  };
  db().documents.set(doc.id, doc);
  audit(userId, "document.uploaded", dealId, { kind, version: doc.version });
  return doc;
}

export function runCheck(userId: string, dealId: string): CheckResult {
  const deal = requireDealForStaff(userId, dealId);
  const findings = runPresenceCheck(listDocuments(dealId));
  const result: CheckResult = {
    id: `chk_${randomUUID()}`,
    dealId,
    ranAt: now(),
    ruleSetVersion: RULE_SET_VERSION,
    verdict: verdictFrom(findings),
    findings,
  };
  db().checks.set(result.id, result);
  deal.lastCheckId = result.id;
  if (deal.states.documentation === "draft" && result.verdict !== "BLOCKING_ISSUE_DETECTED") {
    deal.states = transition(deal.states, "documentation", "awaiting_signatures");
  }
  audit(userId, "check.ran", dealId, { verdict: result.verdict });
  return result;
}

export function inviteCustomer(userId: string, dealId: string): DealerCustomerRelationship {
  const deal = requireDealForStaff(userId, dealId);
  const channel = deal.buyer.email ? "email" : "sms";
  const rel: DealerCustomerRelationship = {
    id: `rel_${randomUUID()}`,
    orgId: deal.orgId,
    personId: deal.buyer.id,
    dealId,
    status: "invited",
    inviteToken: randomUUID().replace(/-/g, ""),
    inviteChannel: channel,
    invitedAt: now(),
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  };
  // A new invite supersedes any earlier open invite for this deal.
  for (const r of db().relationships.values()) {
    if (r.dealId === dealId && r.status === "invited") r.status = "expired";
  }
  db().relationships.set(rel.id, rel);
  audit(userId, "invite.sent", dealId, { channel });
  return rel;
}

export function respondToInvite(token: string, contact: string, decision: "accept" | "decline"): AcceptOutcome {
  const rel = getRelationshipByToken(token);
  if (!rel) return { ok: false, reason: "invalid" };
  if (rel.status !== "invited" || rel.expiresAt < now()) return { ok: false, reason: "expired" };
  const person = db().people.get(rel.personId);
  if (!contactMatches(contact, person ?? null)) return { ok: false, reason: "contact_mismatch" };
  rel.status = decision === "accept" ? "accepted" : "declined";
  rel.respondedAt = now();
  audit(rel.personId, `invite.${rel.status}`, rel.dealId);
  if (decision === "decline") return { ok: false, reason: "expired" };
  return { ok: true, personId: rel.personId, dealId: rel.dealId };
}

export function recordDelivery(userId: string, dealId: string, evidenceClass: DeliveryEvent["evidenceClass"], note?: string): DeliveryEvent {
  const deal = requireDealForStaff(userId, dealId);
  const ev: DeliveryEvent = { id: `dlv_${randomUUID()}`, dealId, at: now(), evidenceClass, note };
  db().deliveries.set(ev.id, ev);
  let s: DealStates = deal.states;
  if (s.delivery === "not_scheduled" || s.delivery === "scheduled") s = transition(s, "delivery", "ready");
  s = transition(s, "delivery", "delivered");
  if (s.registration === "not_ready") s = transition(s, "registration", "ready");
  if (s.commercial === "open") s = transition(s, "commercial", "conditionally_proceeding");
  deal.states = s;
  audit(userId, "delivery.recorded", dealId, { evidenceClass });
  return ev;
}

export function addRegistrationEvidence(userId: string, dealId: string, kind: RegistrationEvidence["kind"], fileName: string): RegistrationEvidence {
  const deal = requireDealForStaff(userId, dealId);
  const ev: RegistrationEvidence = { id: `reg_${randomUUID()}`, dealId, at: now(), kind, fileName };
  db().regEvidence.set(ev.id, ev);
  if (deal.states.registration === "ready") deal.states = transition(deal.states, "registration", "submitted");
  if (!deal.reviewEligibleAt) {
    deal.reviewEligibleAt = now(); // eligibility recorded; no public reviews in S001
    audit(userId, "review.eligibility_recorded", dealId);
  }
  audit(userId, "registration.evidence_uploaded", dealId, { kind });
  return ev;
}

export function disputeRelationship(personId: string, dealId: string) {
  requireDealForCustomer(personId, dealId);
  const rel = getRelationshipForDeal(dealId);
  if (rel && rel.personId === personId) {
    rel.status = "disputed";
    audit(personId, "relationship.disputed", dealId);
  }
}

export function customerDeals(personId: string): Deal[] {
  return [...db().relationships.values()]
    .filter((r) => r.personId === personId && (r.status === "accepted" || r.status === "disputed"))
    .map((r) => db().deals.get(r.dealId))
    .filter((d): d is Deal => !!d);
}
