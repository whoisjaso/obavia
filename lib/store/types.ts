// The store interface. Two implementations: memory (tests, no-database
// fallback) and Postgres (Supabase). Authorization is enforced inside the
// store on every read/write that names a principal; RLS is the second wall.
import type {
  AuditEvent,
  CheckResult,
  Deal,
  DealerCustomerRelationship,
  DealerOrganization,
  DeliveryEvent,
  DocumentKind,
  DocumentVersion,
  Locale,
  Person,
  RegistrationEvidence,
  Vehicle,
} from "@/lib/domain/types";

export interface Inquiry {
  id: string;
  orgId: string;
  createdAt: string;
  name: string;
  contact: string;
  locale: Locale;
  vehicle: string;
  paymentLow: number;
  paymentHigh: number;
  downPayment: number;
  creditBand: string;
  status: "new" | "contacted";
}

export interface TodayItem {
  dealId: string;
  title: string;
  reasonKey: "no_check" | "review_required" | "blocker" | "invite_pending" | "not_invited" | "registration_ready" | "disputed" | "new_inquiry";
  inquiry?: Inquiry;
}

export interface NewDealInput {
  vehicle: Vehicle;
  buyer: { name: string; phone?: string; email?: string; preferredLocale: Locale };
}

export type AcceptOutcome = { ok: true; personId: string; dealId: string } | { ok: false; reason: "invalid" | "expired" | "contact_mismatch" };

export class AuthzError extends Error {
  constructor(msg = "unauthorized") {
    super(msg);
    this.name = "AuthzError";
  }
}

export const TENANT_ZERO_ORG = "org_triplej";
export const TENANT_ZERO_STAFF = "user_jason";
export const OTHER_ORG = "org_other";
export const OTHER_STAFF = "user_other";

export interface Store {
  orgForStaff(userId: string): Promise<string | null>;
  getOrg(orgId: string): Promise<DealerOrganization | null>;
  getPerson(personId: string): Promise<Person | null>;
  listDealsForStaff(userId: string): Promise<Deal[]>;
  getDealForStaff(userId: string, dealId: string): Promise<Deal>;
  requireDealForCustomer(personId: string, dealId: string): Promise<Deal>;
  customerDeals(personId: string): Promise<Deal[]>;
  listDocuments(dealId: string): Promise<DocumentVersion[]>;
  getCheck(checkId: string | undefined): Promise<CheckResult | null>;
  getRelationshipForDeal(dealId: string): Promise<DealerCustomerRelationship | null>;
  getRelationshipByToken(token: string): Promise<DealerCustomerRelationship | null>;
  listDeliveries(dealId: string): Promise<DeliveryEvent[]>;
  listRegEvidence(dealId: string): Promise<RegistrationEvidence[]>;
  listAudit(dealId: string): Promise<AuditEvent[]>;
  listInquiries(userId: string): Promise<Inquiry[]>;
  todayForStaff(userId: string): Promise<TodayItem[]>;
  createInquiry(input: Omit<Inquiry, "id" | "orgId" | "createdAt" | "status">): Promise<Inquiry>;
  createDeal(userId: string, input: NewDealInput): Promise<Deal>;
  addDocument(userId: string, dealId: string, kind: DocumentKind, fileName: string, bytesForHash: string): Promise<DocumentVersion>;
  runCheck(userId: string, dealId: string): Promise<CheckResult>;
  inviteCustomer(userId: string, dealId: string): Promise<DealerCustomerRelationship>;
  respondToInvite(token: string, contact: string, decision: "accept" | "decline"): Promise<AcceptOutcome>;
  recordDelivery(userId: string, dealId: string, evidenceClass: DeliveryEvent["evidenceClass"], note?: string): Promise<DeliveryEvent>;
  addRegistrationEvidence(userId: string, dealId: string, kind: RegistrationEvidence["kind"], fileName: string): Promise<RegistrationEvidence>;
  disputeRelationship(personId: string, dealId: string): Promise<void>;
}

// Today mode derivation shared by both stores: the things that need a human.
export function deriveToday(
  inquiries: Inquiry[],
  deals: Deal[],
  checkOf: (id: string | undefined) => CheckResult | null,
  relOf: (dealId: string) => DealerCustomerRelationship | null,
): TodayItem[] {
  const items: TodayItem[] = [];
  for (const inq of inquiries) {
    if (inq.status !== "new") continue;
    items.push({ dealId: "", title: `${inq.name} · ${inq.vehicle}`, reasonKey: "new_inquiry", inquiry: inq });
    if (items.length >= 5) return items;
  }
  for (const deal of deals) {
    const vehicleLabel = [deal.vehicle.year, deal.vehicle.make, deal.vehicle.model].filter(Boolean).join(" ") || deal.vehicle.vin;
    const title = `${deal.buyer.name} · ${vehicleLabel}`;
    const check = checkOf(deal.lastCheckId);
    const rel = relOf(deal.id);
    if (rel?.status === "disputed") items.push({ dealId: deal.id, title, reasonKey: "disputed" });
    else if (!check) items.push({ dealId: deal.id, title, reasonKey: "no_check" });
    else if (check.verdict === "BLOCKING_ISSUE_DETECTED") items.push({ dealId: deal.id, title, reasonKey: "blocker" });
    else if (check.verdict === "REVIEW_REQUIRED") items.push({ dealId: deal.id, title, reasonKey: "review_required" });
    else if (!rel) items.push({ dealId: deal.id, title, reasonKey: "not_invited" });
    else if (rel.status === "invited") items.push({ dealId: deal.id, title, reasonKey: "invite_pending" });
    else if (deal.states.delivery === "delivered" && deal.states.registration === "not_ready")
      items.push({ dealId: deal.id, title, reasonKey: "registration_ready" });
    if (items.length >= 5) break;
  }
  return items;
}

export function contactMatches(contact: string, person: Person | null): boolean {
  const norm = (s?: string) => (s ?? "").replace(/\D/g, "").toLowerCase() || (s ?? "").trim().toLowerCase();
  return norm(contact) !== "" && (norm(contact) === norm(person?.phone) || contact.trim().toLowerCase() === (person?.email ?? "").toLowerCase());
}
