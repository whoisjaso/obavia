/* Push, through Expo's service. The app registers its token at /me/push; the
   object sends on outbid (with the time left), won (with the pay-by line),
   the two pay-by reminders, started and forfeited. The Desk's token lives on
   dealers.push_token (migration 0011); a forfeiture reaches the dealer too.
   Silence in the app, words in the push: that is the doctrine. */
import type { Env } from './env';

async function send(env: Env, to: string | null | undefined, title: string, body: string, data: Record<string, string>) {
  if (!to) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', ...(env.EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {}) },
    body: JSON.stringify({ to, title, body, data, sound: 'default', priority: 'high' }),
  });
}

export async function push(env: Env, buyerId: string, title: string, body: string, data: Record<string, string>) {
  try {
    const row = await env.DB.prepare('SELECT push_token FROM buyers WHERE id = ?1').bind(buyerId).first<{ push_token: string | null }>();
    await send(env, row?.push_token, title, body, data);
  } catch { /* a missed push is a missed push; the socket still carries the state */ }
}

/** The dealer's Desk, by GDN. No token registered: nothing is sent. */
export async function pushDealer(env: Env, gdn: string, title: string, body: string, data: Record<string, string>) {
  try {
    const row = await env.DB.prepare('SELECT push_token FROM dealers WHERE gdn = ?1').bind(gdn).first<{ push_token: string | null }>();
    await send(env, row?.push_token, title, body, data);
  } catch { /* as above */ }
}

/** The deadline in the words every surface uses (CP9): "Thu 4 pm", "Thu 4:37 pm", Central time. The engine's one formatter. */
export { payByWords as payBy } from '../../src/engine/time';
