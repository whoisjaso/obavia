"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { DeliveryEvent, DocumentKind, Locale, RegistrationEvidence } from "@/lib/domain/types";
import { isLocale } from "@/lib/i18n/dictionaries";
import { isValidVin, decodeVinStub } from "@/lib/vin";
import { currentPersonId, currentStaffId, PERSON_COOKIE } from "@/lib/auth";
import * as store from "@/lib/store/memory";

export type ActionResult = { ok: true } | { ok: false; error: string };

function localeOf(fd: FormData): Locale {
  const l = String(fd.get("locale") ?? "en");
  return isLocale(l) ? l : "en";
}

export async function createWorkspace(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const locale = localeOf(fd);
  const vin = String(fd.get("vin") ?? "").trim().toUpperCase();
  const name = String(fd.get("buyerName") ?? "").trim();
  const phone = String(fd.get("buyerPhone") ?? "").trim() || undefined;
  const email = String(fd.get("buyerEmail") ?? "").trim() || undefined;
  const buyerLocaleRaw = String(fd.get("buyerLocale") ?? "en");
  const preferredLocale: Locale = isLocale(buyerLocaleRaw) ? buyerLocaleRaw : "en";
  if (!isValidVin(vin)) return { ok: false, error: "vin" };
  if (!name) return { ok: false, error: "name" };
  if (!phone && !email) return { ok: false, error: "contact" };
  const staff = await currentStaffId();
  const deal = store.createDeal(staff, {
    vehicle: { vin, ...decodeVinStub(vin) },
    buyer: { name, phone, email, preferredLocale },
  });
  revalidatePath(`/${locale}/dealer`);
  redirect(`/${locale}/dealer/workspaces/${deal.id}`);
}

export async function uploadDocument(fd: FormData): Promise<void> {
  const locale = localeOf(fd);
  const dealId = String(fd.get("dealId"));
  const kind = String(fd.get("kind")) as DocumentKind;
  const fileName = String(fd.get("fileName") ?? "").trim();
  if (!fileName) return;
  const staff = await currentStaffId();
  store.addDocument(staff, dealId, kind, fileName, `${kind}:${fileName}`);
  revalidatePath(`/${locale}/dealer/workspaces/${dealId}`);
}

export async function runPacketCheck(fd: FormData): Promise<void> {
  const locale = localeOf(fd);
  const dealId = String(fd.get("dealId"));
  const staff = await currentStaffId();
  store.runCheck(staff, dealId);
  revalidatePath(`/${locale}/dealer/workspaces/${dealId}`);
}

export async function sendInvite(fd: FormData): Promise<void> {
  const locale = localeOf(fd);
  const dealId = String(fd.get("dealId"));
  const staff = await currentStaffId();
  store.inviteCustomer(staff, dealId);
  revalidatePath(`/${locale}/dealer/workspaces/${dealId}`);
}

export async function recordDeliveryAction(fd: FormData): Promise<void> {
  const locale = localeOf(fd);
  const dealId = String(fd.get("dealId"));
  const evidenceClass = String(fd.get("evidenceClass")) as DeliveryEvent["evidenceClass"];
  const note = String(fd.get("note") ?? "").trim() || undefined;
  if (fd.get("confirm") !== "on") return;
  const staff = await currentStaffId();
  store.recordDelivery(staff, dealId, evidenceClass, note);
  revalidatePath(`/${locale}/dealer/workspaces/${dealId}`);
}

export async function uploadRegistrationEvidence(fd: FormData): Promise<void> {
  const locale = localeOf(fd);
  const dealId = String(fd.get("dealId"));
  const kind = String(fd.get("kind")) as RegistrationEvidence["kind"];
  const fileName = String(fd.get("fileName") ?? "").trim();
  if (!fileName) return;
  const staff = await currentStaffId();
  store.addRegistrationEvidence(staff, dealId, kind, fileName);
  revalidatePath(`/${locale}/dealer/workspaces/${dealId}`);
}

export async function respondToInviteAction(_prev: { error?: string } | null, fd: FormData): Promise<{ error?: string }> {
  const locale = localeOf(fd);
  const token = String(fd.get("token"));
  const contact = String(fd.get("contact") ?? "");
  const decision = fd.get("decision") === "decline" ? "decline" : "accept";
  const outcome = store.respondToInvite(token, contact, decision);
  if (!outcome.ok) {
    if (decision === "decline" && outcome.reason === "expired") return { error: "declined" };
    return { error: outcome.reason };
  }
  const c = await cookies();
  c.set(PERSON_COOKIE, outcome.personId, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect(`/${locale}/me/deals/${outcome.dealId}`);
}

export async function disputeAction(fd: FormData): Promise<void> {
  const locale = localeOf(fd);
  const dealId = String(fd.get("dealId"));
  const personId = await currentPersonId();
  if (!personId) return;
  store.disputeRelationship(personId, dealId);
  revalidatePath(`/${locale}/me/deals/${dealId}`);
}

export async function createInquiryAction(fd: FormData): Promise<{ ok: boolean }> {
  const locale = localeOf(fd);
  const name = String(fd.get("name") ?? "").trim();
  const contact = String(fd.get("contact") ?? "").trim();
  if (!name || !contact) return { ok: false };
  store.createInquiry({
    name,
    contact,
    locale,
    vehicle: String(fd.get("vehicle") ?? ""),
    paymentLow: Number(fd.get("paymentLow") ?? 0),
    paymentHigh: Number(fd.get("paymentHigh") ?? 0),
    downPayment: Number(fd.get("downPayment") ?? 0),
    creditBand: String(fd.get("creditBand") ?? ""),
  });
  revalidatePath(`/${locale}/dealer`);
  return { ok: true };
}
