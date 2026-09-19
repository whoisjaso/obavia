// The one store the app talks to. Postgres when DATABASE_URL is set
// (Supabase service-role connection string), memory otherwise. Every call
// site awaits; the memory store wraps its synchronous functions.
import * as mem from "./memory";
import { pgStore } from "./pg";
import type { Store } from "./types";

export * from "./types";

const memoryStore: Store = {
  orgForStaff: async (u) => mem.orgForStaff(u),
  getOrg: async (o) => mem.getOrg(o),
  getPerson: async (p) => mem.getPerson(p),
  listDealsForStaff: async (u) => mem.listDealsForStaff(u),
  getDealForStaff: async (u, d) => mem.getDealForStaff(u, d),
  requireDealForCustomer: async (p, d) => mem.requireDealForCustomer(p, d),
  customerDeals: async (p) => mem.customerDeals(p),
  listDocuments: async (d) => mem.listDocuments(d),
  getCheck: async (c) => mem.getCheck(c),
  getRelationshipForDeal: async (d) => mem.getRelationshipForDeal(d),
  getRelationshipByToken: async (t) => mem.getRelationshipByToken(t),
  listDeliveries: async (d) => mem.listDeliveries(d),
  listRegEvidence: async (d) => mem.listRegEvidence(d),
  listAudit: async (d) => mem.listAudit(d),
  listInquiries: async (u) => mem.listInquiries(u),
  todayForStaff: async (u) => mem.todayForStaff(u),
  createInquiry: async (i) => mem.createInquiry(i),
  createDeal: async (u, i) => mem.createDeal(u, i),
  addDocument: async (u, d, k, f, b) => mem.addDocument(u, d, k, f, b),
  runCheck: async (u, d) => mem.runCheck(u, d),
  inviteCustomer: async (u, d) => mem.inviteCustomer(u, d),
  respondToInvite: async (t, c, dec) => mem.respondToInvite(t, c, dec),
  recordDelivery: async (u, d, e, n) => mem.recordDelivery(u, d, e, n),
  addRegistrationEvidence: async (u, d, k, f) => mem.addRegistrationEvidence(u, d, k, f),
  disputeRelationship: async (p, d) => mem.disputeRelationship(p, d),
};

const url = process.env.DATABASE_URL;
export const store: Store = url ? pgStore(url) : memoryStore;
export const storeKind: "postgres" | "memory" = url ? "postgres" : "memory";
