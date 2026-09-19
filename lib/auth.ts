// Session stub for the front-end-first build. A cookie names the acting
// principal. Supabase Auth replaces this; the store's authorization checks
// stay exactly where they are.
import { cookies } from "next/headers";
import { TENANT_ZERO_STAFF } from "@/lib/store/memory";

export const STAFF_COOKIE = "obavia_staff";
export const PERSON_COOKIE = "obavia_person";

export async function currentStaffId(): Promise<string> {
  const c = await cookies();
  return c.get(STAFF_COOKIE)?.value ?? TENANT_ZERO_STAFF;
}

export async function currentPersonId(): Promise<string | null> {
  const c = await cookies();
  return c.get(PERSON_COOKIE)?.value ?? null;
}
