/* The Desk API (desk/server/worker.ts). With no VITE_API_BASE the app runs
   in preview: no code is sent and any six digits pass. */

import type { Loan } from './loans';
import type { SyncBody } from './sync';

export type Profile = { phone?: string; email?: string; street?: string; city?: string; zip?: string };
export type Channel = 'sms' | 'email';
export type StartResult = { ok: true; sentTo: string } | { ok: false; reason: string };
export type CheckResult = { ok: true; token: string; profile: Profile } | { ok: false; reason: string };

const BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, '') ?? '';
export const live = !!BASE;

async function post<T>(path: string, body: unknown): Promise<T> {
  try {
    const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await r.json() as T;
  } catch { return { ok: false, reason: 'offline' } as T; }
}

/* ---------- the signed-in device ---------- */
const SESSION = 'obavia.desk.session';
export const session = { get: () => { try { return localStorage.getItem(SESSION); } catch { return null; } }, set: (t: string) => { try { localStorage.setItem(SESSION, t); } catch { /* private mode */ } } };

export type SyncResult = { ok: true; notes: Loan[]; refused: string[] } | { ok: false; reason: string };
export async function syncDesk(body: SyncBody): Promise<SyncResult> {
  const token = session.get(); if (!live || !token) return { ok: false, reason: 'offline' };
  try {
    const r = await fetch(`${BASE}/api/desk/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    return await r.json() as SyncResult;
  } catch { return { ok: false, reason: 'offline' }; }
}

export const startVerify = (licence: string, channel: Channel) => post<StartResult>('/api/verify/start', { licence, channel });
export const checkVerify = (licence: string, channel: Channel, code: string) => post<CheckResult>('/api/verify/check', { licence, channel, code });

/** What to tell the dealer, in plain words. */
export const SAY: Record<string, string> = {
  rejected: 'That code didn’t match. Try again.',
  expired: 'That code ran out. Send a new one.',
  too_many_attempts: 'Too many tries. Wait ten minutes, then send a new code.',
  rate_limited: 'We’ve sent a few codes already. Wait a bit, then try again.',
  no_contact: 'Your licence has no contact on file for that. Show your licence instead.',
  unknown_licence: 'We couldn’t find that licence. Show your licence instead.',
  offline: 'We couldn’t reach Obavia. Check your connection and try again.',
};

/** Reach: hand one post to the posting agent. Offline (no API), nothing is posted. */
export type PostRun = { ok: true; post: import('./post').Post; steps: { at: string; channel?: string; text: string }[] } | { ok: false; reason: string };
export async function postCar(post: import('./post').Post, vehicle: import('./sale').Vehicle): Promise<PostRun> {
  const token = session.get(); if (!live || !token) return { ok: false, reason: 'offline' };
  try {
    const r = await fetch(`${BASE}/api/posts`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ post, vehicle }) });
    return (await r.json()) as PostRun;
  } catch { return { ok: false, reason: 'offline' }; }
}
