/* Who is at the desk. One device, several people: each picks their name and
   types a four-digit PIN, and everything they do carries their name. Cash is
   where it matters most: when the drawer is short, the Desk shows who took
   each payment that day.

   The device itself stays signed in to the dealership (the 30-day session).
   The PIN only says which person is using it, so it is a lock on the screen,
   not a password: it is salted and hashed, wrong tries are slowed down, and
   the screen locks itself after LOCK_AFTER_MIN idle minutes.

   With nobody added, there is no lock: the owner is the only user. */

export type Role = 'owner' | 'desk';
export type Staff = { id: string; name: string; role: Role; salt: string; pinHash: string; added: string };
export type Action = 'staff' | 'settings' | 'undo' | 'recount';

export const PIN_LENGTH = 4;
export const LOCK_AFTER_MIN = 10;
export const MAX_TRIES = 5;
export const WAIT_S = 30;

/** What only an owner may do: manage people, change what runs on its own, undo an automatic post, recount a closed drawer. */
const OWNER_ONLY: Action[] = ['staff', 'settings', 'undo', 'recount'];
export const can = (who: Staff | undefined, a: Action) => !who || who.role === 'owner' || !OWNER_ONLY.includes(a);

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
export const newSalt = () => hex(crypto.getRandomValues(new Uint8Array(12)).buffer);
export async function hashPin(pin: string, salt: string) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pin}`)));
}
export const checkPin = async (s: Staff, pin: string) => (await hashPin(pin, s.salt)) === s.pinHash;

/** PINs that anyone would guess first. */
export function weakPin(pin: string) {
  if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) return true;
  const d = [...pin].map(Number), step = d[1] - d[0];
  return d.every(x => x === d[0]) || ((step === 1 || step === -1) && d.every((x, i) => i === 0 || x - d[i - 1] === step));
}

export async function makeStaff(name: string, role: Role, pin: string, on: string, id = 'u' + Date.now().toString(36)): Promise<Staff> {
  const salt = newSalt();
  return { id, name: name.trim(), role, salt, pinHash: await hashPin(pin, salt), added: on };
}

/** Wrong tries: after MAX_TRIES, wait WAIT_S seconds before the next one. Returns the seconds left to wait, or 0. */
export function waitLeft(fails: number[], now: number) {
  const recent = fails.filter(t => now - t < WAIT_S * 1000);
  return recent.length >= MAX_TRIES ? Math.ceil((recent[recent.length - MAX_TRIES] + WAIT_S * 1000 - now) / 1000) : 0;
}

export const idleTooLong = (lastActive: number, now: number) => now - lastActive > LOCK_AFTER_MIN * 60_000;

/** The day's counter cash, by who took it, largest first. Payments from before staff sign-in have no name. */
export function cashBy<T extends { by?: string; cents: number }>(items: T[], staff: Staff[]) {
  const sums = new Map<string, number>();
  for (const p of items) sums.set(p.by ?? '', (sums.get(p.by ?? '') ?? 0) + p.cents);
  return [...sums].map(([id, cents]) => ({ id, name: staff.find(s => s.id === id)?.name ?? (id ? 'Someone removed' : 'No name'), cents }))
    .sort((a, b) => b.cents - a.cents);
}
