// Domain records for S001-A. Mirrors docs/architecture/DOMAIN.md and the
// Apohenia packet enums (packet_status / finding_status). Implement only what
// the active slice consumes.

export type Locale = "en" | "es";

export type Role = "owner" | "manager" | "title_clerk" | "employee";

export interface DealerOrganization {
  id: string;
  name: string;
  city: string;
  verifiedByFounderAt: string | null; // pilot: founder verifies manually
}

export interface Membership {
  userId: string;
  orgId: string;
  role: Role;
}

export interface Person {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  preferredLocale: Locale;
}

export interface Vehicle {
  vin: string;
  year?: number;
  make?: string;
  model?: string;
  decodeSource: "vpic" | "manual";
}

// Six independent status dimensions. No `sold` boolean.
export type DocumentationState =
  | "draft"
  | "awaiting_signatures"
  | "signed"
  | "correction_required";
export type FundingState =
  | "n/a"
  | "pending"
  | "authorized"
  | "received"
  | "exception";
export type DeliveryState =
  | "not_scheduled"
  | "scheduled"
  | "ready"
  | "delivered"
  | "disputed";
export type CommercialState =
  | "open"
  | "conditionally_proceeding"
  | "recorded_complete"
  | "cancelled"
  | "disputed";
export type RegistrationState =
  | "not_ready"
  | "ready"
  | "submitted"
  | "returned"
  | "accepted"
  | "completed";
export type ServicingState = "n/a" | "active" | "exception" | "closed";

export interface DealStates {
  documentation: DocumentationState;
  funding: FundingState;
  delivery: DeliveryState;
  commercial: CommercialState;
  registration: RegistrationState;
  servicing: ServicingState;
}

export type DocumentKind =
  | "form_130u"
  | "bill_of_sale"
  | "odometer"
  | "title_front"
  | "title_back"
  | "id_redacted"
  | "other";

export interface DocumentVersion {
  id: string;
  dealId: string;
  kind: DocumentKind;
  version: number;
  fileName: string;
  sha256: string;
  uploadedAt: string;
  uploadedBy: string;
  supersedesId?: string;
  executed: boolean; // executed versions are immutable
}

export type FindingStatus = "pass" | "review" | "blocker" | "informational";

export interface Finding {
  ruleId: string;
  status: FindingStatus;
  evidence: string; // verbatim, sourced
  question?: string; // when unknown: ask, never guess
}

export type CheckVerdict =
  | "NO_KNOWN_BLOCKER"
  | "REVIEW_REQUIRED"
  | "BLOCKING_ISSUE_DETECTED";

export interface CheckResult {
  id: string;
  dealId: string;
  ranAt: string;
  ruleSetVersion: string;
  verdict: CheckVerdict;
  findings: Finding[];
}

export type RelationshipStatus =
  | "invited"
  | "accepted"
  | "declined"
  | "expired"
  | "disputed";

export interface DealerCustomerRelationship {
  id: string;
  orgId: string;
  personId: string;
  dealId: string;
  status: RelationshipStatus;
  inviteToken: string;
  inviteChannel: "email" | "sms";
  invitedAt: string;
  expiresAt: string;
  respondedAt?: string;
}

export interface DeliveryEvent {
  id: string;
  dealId: string;
  at: string;
  evidenceClass: "photo" | "signed_receipt" | "dealer_attestation";
  note?: string;
}

export interface RegistrationEvidence {
  id: string;
  dealId: string;
  at: string;
  kind: "webdealer_receipt" | "county_receipt" | "other";
  fileName: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  actorId: string;
  dealId?: string;
  action: string;
  detail?: Record<string, unknown>;
}

export interface Deal {
  id: string;
  orgId: string;
  vehicle: Vehicle;
  buyer: Person;
  saleType: "cash_retail";
  createdAt: string;
  createdBy: string;
  states: DealStates;
  lastCheckId?: string;
  reviewEligibleAt?: string; // eligibility recorded; no public reviews in S001
}
