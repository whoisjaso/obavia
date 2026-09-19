// Postgres-backed store (Supabase). Same authorization rules as the memory
// store, enforced here before any row is returned or written; RLS in
// supabase/migrations is the second wall. Uses the service role connection.
import { randomUUID, createHash } from "node:crypto";
import postgres, { type Sql } from "postgres";
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
  Person,
  RegistrationEvidence,
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
  type Store,
  type TodayItem,
} from "./types";

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v == null ? undefined : String(v));
const now = () => new Date().toISOString();

function rowToDeal(r: Row): Deal {
  return {
    id: r.id as string,
    orgId: r.org_id as string,
    vehicle: { vin: r.vin as string, year: (r.year as number | null) ?? undefined, make: (r.make as string | null) ?? undefined, model: (r.model as string | null) ?? undefined, decodeSource: r.decode_source as "vpic" | "manual" },
    buyer: { id: r.buyer_id as string, name: r.buyer_name as string, phone: (r.buyer_phone as string | null) ?? undefined, email: (r.buyer_email as string | null) ?? undefined, preferredLocale: r.buyer_locale as "en" | "es" },
    saleType: "cash_retail",
    createdAt: iso(r.created_at)!,
    createdBy: r.created_by as string,
    states: r.states as DealStates,
    lastCheckId: (r.last_check_id as string | null) ?? undefined,
    reviewEligibleAt: iso(r.review_eligible_at),
  };
}
const rowToDoc = (r: Row): DocumentVersion => ({
  id: r.id as string, dealId: r.deal_id as string, kind: r.kind as DocumentKind, version: r.version as number, fileName: r.file_name as string,
  sha256: r.sha256 as string, uploadedAt: iso(r.uploaded_at)!, uploadedBy: r.uploaded_by as string, supersedesId: (r.supersedes_id as string | null) ?? undefined, executed: r.executed as boolean,
});
const rowToCheck = (r: Row): CheckResult => ({
  id: r.id as string, dealId: r.deal_id as string, ranAt: iso(r.ran_at)!, ruleSetVersion: r.rule_set_version as string, verdict: r.verdict as CheckResult["verdict"], findings: r.findings as CheckResult["findings"],
});
const rowToRel = (r: Row): DealerCustomerRelationship => ({
  id: r.id as string, orgId: r.org_id as string, personId: r.person_id as string, dealId: r.deal_id as string, status: r.status as DealerCustomerRelationship["status"],
  inviteToken: r.invite_token as string, inviteChannel: r.invite_channel as "email" | "sms", invitedAt: iso(r.invited_at)!, expiresAt: iso(r.expires_at)!, respondedAt: iso(r.responded_at),
});
const rowToInquiry = (r: Row): Inquiry => ({
  id: r.id as string, orgId: r.org_id as string, createdAt: iso(r.created_at)!, name: r.name as string, contact: r.contact as string, locale: r.locale as "en" | "es",
  vehicle: r.vehicle as string, paymentLow: r.payment_low as number, paymentHigh: r.payment_high as number, downPayment: r.down_payment as number, creditBand: r.credit_band as string, status: r.status as Inquiry["status"],
});
const rowToPerson = (r: Row): Person => ({ id: r.id as string, name: r.name as string, phone: (r.phone as string | null) ?? undefined, email: (r.email as string | null) ?? undefined, preferredLocale: r.preferred_locale as "en" | "es" });

const DEAL_SELECT = `select d.*, p.name as buyer_name, p.phone as buyer_phone, p.email as buyer_email, p.preferred_locale as buyer_locale from deals d join people p on p.id = d.buyer_id`;

export function createPgStore(sql: Sql): Store & { seed(): Promise<void>; sql: Sql } {
  async function audit(actorId: string, action: string, dealId?: string, detail?: Record<string, unknown>) {
    await sql`insert into audit_events (id, at, actor_id, deal_id, action, detail) values (${randomUUID()}, now(), ${actorId}, ${dealId ?? null}, ${action}, ${detail ? sql.json(detail as never) : null})`;
  }
  async function orgForStaff(userId: string) {
    const rows = await sql`select org_id from memberships where user_id = ${userId} limit 1`;
    return (rows[0]?.org_id as string | undefined) ?? null;
  }
  async function dealById(dealId: string): Promise<Deal | null> {
    const rows = await sql.unsafe(`${DEAL_SELECT} where d.id = $1`, [dealId]);
    return rows[0] ? rowToDeal(rows[0] as Row) : null;
  }
  async function requireDealForStaff(userId: string, dealId: string): Promise<Deal> {
    const orgId = await orgForStaff(userId);
    const deal = await dealById(dealId);
    if (!orgId || !deal || deal.orgId !== orgId) throw new AuthzError();
    return deal;
  }
  async function setStates(dealId: string, states: DealStates) {
    await sql`update deals set states = ${sql.json(states as never)} where id = ${dealId}`;
  }
  async function getCheck(checkId: string | undefined) {
    if (!checkId) return null;
    const rows = await sql`select * from checks where id = ${checkId}`;
    return rows[0] ? rowToCheck(rows[0] as Row) : null;
  }
  async function getRelationshipForDeal(dealId: string) {
    const rows = await sql`select * from relationships where deal_id = ${dealId} order by invited_at desc limit 1`;
    return rows[0] ? rowToRel(rows[0] as Row) : null;
  }
  async function listDocuments(dealId: string) {
    const rows = await sql`select * from documents where deal_id = ${dealId} order by uploaded_at asc, version asc`;
    return rows.map((r) => rowToDoc(r as Row));
  }
  async function listDealsForStaff(userId: string) {
    const orgId = await orgForStaff(userId);
    if (!orgId) return [];
    const rows = await sql.unsafe(`${DEAL_SELECT} where d.org_id = $1 order by d.created_at desc`, [orgId]);
    return rows.map((r) => rowToDeal(r as Row));
  }
  async function listInquiries(userId: string) {
    const orgId = await orgForStaff(userId);
    if (!orgId) return [];
    const rows = await sql`select * from inquiries where org_id = ${orgId} order by created_at desc`;
    return rows.map((r) => rowToInquiry(r as Row));
  }

  const store: Store & { seed(): Promise<void>; sql: Sql } = {
    sql,
    async seed() {
      await sql`insert into orgs (id, name, city, verified_by_founder_at) values (${TENANT_ZERO_ORG}, 'Triple J Auto Investment', 'Houston, TX', '2026-09-18T00:00:00Z'), (${OTHER_ORG}, 'Other Dealer (isolation fixture)', 'Houston, TX', '2026-09-18T00:00:00Z') on conflict (id) do nothing`;
      await sql`insert into memberships (user_id, org_id, role) values (${TENANT_ZERO_STAFF}, ${TENANT_ZERO_ORG}, 'owner'), (${OTHER_STAFF}, ${OTHER_ORG}, 'owner') on conflict do nothing`;
      await sql`insert into people (id, name, preferred_locale) values ('person_other_buyer', 'Fixture Buyer', 'en') on conflict (id) do nothing`;
      await sql`insert into deals (id, org_id, vin, year, make, model, decode_source, buyer_id, created_by, states) values ('deal_other_fixture', ${OTHER_ORG}, '1HGCM82633A004352', 2003, 'Honda', 'Accord', 'manual', 'person_other_buyer', ${OTHER_STAFF}, ${sql.json(initialStates as never)}) on conflict (id) do nothing`;
    },
    orgForStaff,
    async getOrg(orgId) {
      const rows = await sql`select * from orgs where id = ${orgId}`;
      const r = rows[0] as Row | undefined;
      return r ? ({ id: r.id, name: r.name, city: r.city, verifiedByFounderAt: iso(r.verified_by_founder_at) ?? null } as DealerOrganization) : null;
    },
    async getPerson(personId) {
      const rows = await sql`select * from people where id = ${personId}`;
      return rows[0] ? rowToPerson(rows[0] as Row) : null;
    },
    listDealsForStaff,
    getDealForStaff: requireDealForStaff,
    async requireDealForCustomer(personId, dealId) {
      const rows = await sql`select 1 from relationships where deal_id = ${dealId} and person_id = ${personId} and status in ('accepted','disputed') limit 1`;
      const deal = rows.length ? await dealById(dealId) : null;
      if (!deal) throw new AuthzError();
      return deal;
    },
    async customerDeals(personId) {
      const rows = await sql.unsafe(`${DEAL_SELECT} where d.id in (select deal_id from relationships where person_id = $1 and status in ('accepted','disputed')) order by d.created_at desc`, [personId]);
      return rows.map((r) => rowToDeal(r as Row));
    },
    listDocuments,
    getCheck,
    getRelationshipForDeal,
    async getRelationshipByToken(token) {
      const rows = await sql`select * from relationships where invite_token = ${token}`;
      return rows[0] ? rowToRel(rows[0] as Row) : null;
    },
    async listDeliveries(dealId) {
      const rows = await sql`select * from deliveries where deal_id = ${dealId} order by at asc`;
      return rows.map((r) => ({ id: r.id, dealId: r.deal_id, at: iso(r.at)!, evidenceClass: r.evidence_class, note: r.note ?? undefined }) as DeliveryEvent);
    },
    async listRegEvidence(dealId) {
      const rows = await sql`select * from registration_evidence where deal_id = ${dealId} order by at asc`;
      return rows.map((r) => ({ id: r.id, dealId: r.deal_id, at: iso(r.at)!, kind: r.kind, fileName: r.file_name }) as RegistrationEvidence);
    },
    async listAudit(dealId) {
      const rows = await sql`select * from audit_events where deal_id = ${dealId} order by at desc`;
      return rows.map((r) => ({ id: r.id, at: iso(r.at)!, actorId: r.actor_id, dealId: r.deal_id ?? undefined, action: r.action, detail: r.detail ?? undefined }) as AuditEvent);
    },
    listInquiries,
    async todayForStaff(userId): Promise<TodayItem[]> {
      const [inquiries, deals] = await Promise.all([listInquiries(userId), listDealsForStaff(userId)]);
      const checkIds = deals.map((d) => d.lastCheckId).filter((x): x is string => !!x);
      const dealIds = deals.map((d) => d.id);
      const [checks, rels] = await Promise.all([
        checkIds.length ? sql`select * from checks where id in ${sql(checkIds)}` : Promise.resolve([] as Row[]),
        dealIds.length ? sql`select distinct on (deal_id) * from relationships where deal_id in ${sql(dealIds)} order by deal_id, invited_at desc` : Promise.resolve([] as Row[]),
      ]);
      const checkMap = new Map((checks as Row[]).map((r) => [r.id as string, rowToCheck(r)]));
      const relMap = new Map((rels as Row[]).map((r) => [r.deal_id as string, rowToRel(r)]));
      return deriveToday(inquiries, deals, (id) => (id ? checkMap.get(id) ?? null : null), (id) => relMap.get(id) ?? null);
    },
    async createInquiry(input) {
      const inq: Inquiry = { id: `inq_${randomUUID()}`, orgId: TENANT_ZERO_ORG, createdAt: now(), status: "new", ...input };
      await sql`insert into inquiries (id, org_id, created_at, name, contact, locale, vehicle, payment_low, payment_high, down_payment, credit_band, status)
        values (${inq.id}, ${inq.orgId}, ${inq.createdAt}, ${inq.name}, ${inq.contact}, ${inq.locale}, ${inq.vehicle}, ${inq.paymentLow}, ${inq.paymentHigh}, ${inq.downPayment}, ${inq.creditBand}, 'new')`;
      await audit("buyer", "inquiry.created", undefined, { vehicle: input.vehicle });
      return inq;
    },
    async createDeal(userId, input: NewDealInput) {
      const orgId = await orgForStaff(userId);
      if (!orgId) throw new AuthzError();
      const personId = `person_${randomUUID()}`;
      const dealId = `deal_${randomUUID()}`;
      await sql.begin(async (tx) => {
        await tx`insert into people (id, name, phone, email, preferred_locale) values (${personId}, ${input.buyer.name}, ${input.buyer.phone ?? null}, ${input.buyer.email ?? null}, ${input.buyer.preferredLocale})`;
        await tx`insert into deals (id, org_id, vin, year, make, model, decode_source, buyer_id, created_by, states)
          values (${dealId}, ${orgId}, ${input.vehicle.vin}, ${input.vehicle.year ?? null}, ${input.vehicle.make ?? null}, ${input.vehicle.model ?? null}, ${input.vehicle.decodeSource}, ${personId}, ${userId}, ${tx.json(initialStates as never)})`;
      });
      await audit(userId, "deal.created", dealId, { vin: input.vehicle.vin });
      return (await dealById(dealId))!;
    },
    async addDocument(userId, dealId, kind, fileName, bytesForHash) {
      await requireDealForStaff(userId, dealId);
      const sha256 = createHash("sha256").update(bytesForHash).digest("hex");
      const existing = (await listDocuments(dealId)).filter((d) => d.kind === kind);
      const dup = existing.find((d) => d.sha256 === sha256);
      if (dup) return dup;
      const latest = [...existing].sort((a, b) => b.version - a.version)[0];
      const doc: DocumentVersion = { id: `doc_${randomUUID()}`, dealId, kind, version: (latest?.version ?? 0) + 1, fileName, sha256, uploadedAt: now(), uploadedBy: userId, supersedesId: latest?.id, executed: false };
      await sql`insert into documents (id, deal_id, kind, version, file_name, sha256, uploaded_at, uploaded_by, supersedes_id, executed)
        values (${doc.id}, ${dealId}, ${kind}, ${doc.version}, ${fileName}, ${sha256}, ${doc.uploadedAt}, ${userId}, ${doc.supersedesId ?? null}, false)`;
      await audit(userId, "document.uploaded", dealId, { kind, version: doc.version });
      return doc;
    },
    async runCheck(userId, dealId) {
      const deal = await requireDealForStaff(userId, dealId);
      const findings = runPresenceCheck(await listDocuments(dealId));
      const result: CheckResult = { id: `chk_${randomUUID()}`, dealId, ranAt: now(), ruleSetVersion: RULE_SET_VERSION, verdict: verdictFrom(findings), findings };
      let states = deal.states;
      if (states.documentation === "draft" && result.verdict !== "BLOCKING_ISSUE_DETECTED") states = transition(states, "documentation", "awaiting_signatures");
      await sql.begin(async (tx) => {
        await tx`insert into checks (id, deal_id, ran_at, rule_set_version, verdict, findings) values (${result.id}, ${dealId}, ${result.ranAt}, ${result.ruleSetVersion}, ${result.verdict}, ${tx.json(findings as never)})`;
        await tx`update deals set last_check_id = ${result.id}, states = ${tx.json(states as never)} where id = ${dealId}`;
      });
      await audit(userId, "check.ran", dealId, { verdict: result.verdict });
      return result;
    },
    async inviteCustomer(userId, dealId) {
      const deal = await requireDealForStaff(userId, dealId);
      const channel = deal.buyer.email ? "email" : "sms";
      const rel: DealerCustomerRelationship = {
        id: `rel_${randomUUID()}`, orgId: deal.orgId, personId: deal.buyer.id, dealId, status: "invited",
        inviteToken: randomUUID().replace(/-/g, ""), inviteChannel: channel, invitedAt: now(), expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      };
      await sql.begin(async (tx) => {
        await tx`update relationships set status = 'expired' where deal_id = ${dealId} and status = 'invited'`;
        await tx`insert into relationships (id, org_id, person_id, deal_id, status, invite_token, invite_channel, invited_at, expires_at)
          values (${rel.id}, ${rel.orgId}, ${rel.personId}, ${dealId}, 'invited', ${rel.inviteToken}, ${channel}, ${rel.invitedAt}, ${rel.expiresAt})`;
      });
      await audit(userId, "invite.sent", dealId, { channel });
      return rel;
    },
    async respondToInvite(token, contact, decision): Promise<AcceptOutcome> {
      const rel = await store.getRelationshipByToken(token);
      if (!rel) return { ok: false, reason: "invalid" };
      if (rel.status !== "invited" || rel.expiresAt < now()) return { ok: false, reason: "expired" };
      const person = await store.getPerson(rel.personId);
      if (!contactMatches(contact, person)) return { ok: false, reason: "contact_mismatch" };
      const status = decision === "accept" ? "accepted" : "declined";
      await sql`update relationships set status = ${status}, responded_at = now() where id = ${rel.id}`;
      await audit(rel.personId, `invite.${status}`, rel.dealId);
      if (decision === "decline") return { ok: false, reason: "expired" };
      return { ok: true, personId: rel.personId, dealId: rel.dealId };
    },
    async recordDelivery(userId, dealId, evidenceClass, note) {
      const deal = await requireDealForStaff(userId, dealId);
      const ev: DeliveryEvent = { id: `dlv_${randomUUID()}`, dealId, at: now(), evidenceClass, note };
      let s: DealStates = deal.states;
      if (s.delivery === "not_scheduled" || s.delivery === "scheduled") s = transition(s, "delivery", "ready");
      s = transition(s, "delivery", "delivered");
      if (s.registration === "not_ready") s = transition(s, "registration", "ready");
      if (s.commercial === "open") s = transition(s, "commercial", "conditionally_proceeding");
      await sql.begin(async (tx) => {
        await tx`insert into deliveries (id, deal_id, at, evidence_class, note) values (${ev.id}, ${dealId}, ${ev.at}, ${evidenceClass}, ${note ?? null})`;
        await tx`update deals set states = ${tx.json(s as never)} where id = ${dealId}`;
      });
      await audit(userId, "delivery.recorded", dealId, { evidenceClass });
      return ev;
    },
    async addRegistrationEvidence(userId, dealId, kind, fileName) {
      const deal = await requireDealForStaff(userId, dealId);
      const ev: RegistrationEvidence = { id: `reg_${randomUUID()}`, dealId, at: now(), kind, fileName };
      let s = deal.states;
      if (s.registration === "ready") s = transition(s, "registration", "submitted");
      const firstEligibility = !deal.reviewEligibleAt;
      await sql.begin(async (tx) => {
        await tx`insert into registration_evidence (id, deal_id, at, kind, file_name) values (${ev.id}, ${dealId}, ${ev.at}, ${kind}, ${fileName})`;
        await tx`update deals set states = ${tx.json(s as never)}, review_eligible_at = coalesce(review_eligible_at, now()) where id = ${dealId}`;
      });
      if (firstEligibility) await audit(userId, "review.eligibility_recorded", dealId);
      await audit(userId, "registration.evidence_uploaded", dealId, { kind });
      return ev;
    },
    async disputeRelationship(personId, dealId) {
      await store.requireDealForCustomer(personId, dealId);
      const rel = await getRelationshipForDeal(dealId);
      if (rel && rel.personId === personId) {
        await sql`update relationships set status = 'disputed' where id = ${rel.id}`;
        await audit(personId, "relationship.disputed", dealId);
      }
    },
  };
  void setStates;
  return store;
}

let cached: Store | null = null;
export function pgStore(url: string): Store {
  if (!cached) {
    // Supabase pooler (transaction mode) does not support prepared statements.
    const inner = createPgStore(postgres(url, { prepare: false, max: 4, idle_timeout: 20, connect_timeout: 10 }));
    // Pilot fixtures (tenant zero) are idempotent; every call waits for them once.
    const ready = inner.seed().catch((err) => { console.error("store seed failed", err); });
    cached = new Proxy(inner, {
      get(target, prop) {
        const v = Reflect.get(target, prop);
        if (typeof v !== "function" || prop === "seed") return v;
        return async (...args: unknown[]) => { await ready; return (v as (...a: unknown[]) => unknown).apply(target, args); };
      },
    }) as Store;
  }
  return cached;
}
