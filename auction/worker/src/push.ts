/* Push, through Expo's service. The app registers its token at /me/push; the
   object sends on outbid (with the time left), won, and started. Silence in
   the app, words in the push: that is the doctrine. */
import type { Env } from './env';

export async function push(env: Env, buyerId: string, title: string, body: string, data: Record<string, string>) {
  try {
    const row = await env.DB.prepare('SELECT push_token FROM buyers WHERE id = ?1').bind(buyerId).first<{ push_token: string | null }>();
    const to = row?.push_token; if (!to) return;
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', ...(env.EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {}) },
      body: JSON.stringify({ to, title, body, data, sound: 'default', priority: 'high' }),
    });
  } catch { /* a missed push is a missed push; the socket still carries the state */ }
}
