/* Pure messaging rules. No network, no storage: everything here is tested. */
import type { MessageKind } from './types';

/* ---------- phone numbers ---------- */

/** A US number in E.164 (+1XXXXXXXXXX), or null if it can't be one. */
export function toE164(raw: string): string | null {
  const d = (raw ?? '').replace(/\D/g, '');
  const ten = d.length === 11 && d[0] === '1' ? d.slice(1) : d;
  if (ten.length !== 10) return null;
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(ten)) return null; // NANP: area and exchange can't start with 0 or 1
  return `+1${ten}`;
}

/* ---------- segments: what a text actually costs ---------- */

const GSM = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM_EXT = '^{}\\[~]|€';

/** How many billed parts a message is. GSM-7: 160, then 153 per part. Anything else (an emoji, a curly quote): 70, then 67. */
export function segments(text: string): { parts: number; encoding: 'GSM-7' | 'UCS-2'; units: number } {
  const chars = [...text];
  const gsm = chars.every(c => GSM.includes(c) || GSM_EXT.includes(c));
  if (gsm) {
    const units = chars.reduce((n, c) => n + (GSM_EXT.includes(c) ? 2 : 1), 0);
    return { encoding: 'GSM-7', units, parts: units <= 160 ? 1 : Math.ceil(units / 153) };
  }
  const units = chars.reduce((n, c) => n + (c.codePointAt(0)! > 0xffff ? 2 : 1), 0);
  return { encoding: 'UCS-2', units, parts: units <= 70 ? 1 : Math.ceil(units / 67) };
}

/** Swap characters that silently force the expensive encoding for plain ones. */
export const plainText = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...').replace(/ /g, ' ');

/* ---------- keywords ---------- */

const STOP = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'OPTOUT', 'OPT OUT', 'REVOKE'];
const START = ['START', 'UNSTOP', 'YES', 'SUBSCRIBE'];
const HELP = ['HELP', 'INFO'];
/** The same keywords in Spanish, so a buyer who texts in Spanish can always stop. */
const STOP_ES = ['PARAR', 'PARE', 'ALTO', 'CANCELAR', 'BAJA', 'DETENER'];
const START_ES = ['INICIAR', 'REANUDAR'];
const HELP_ES = ['AYUDA'];
const norm = (text: string) => (text ?? '').trim().toUpperCase().replace(/[.!¡]+/g, '').trim();

/** Carrier keywords, in English or Spanish. Only a message that IS the keyword counts ("stop" yes, "don't stop" no). */
export function keyword(text: string): 'stop' | 'start' | 'help' | null {
  const t = norm(text);
  if (STOP.includes(t) || STOP_ES.includes(t)) return 'stop';
  if (START.includes(t) || START_ES.includes(t)) return 'start';
  if (HELP.includes(t) || HELP_ES.includes(t)) return 'help';
  return null;
}
/** A keyword sent in Spanish gets its reply in Spanish. */
export const keywordLang = (text: string): 'en' | 'es' => [...STOP_ES, ...START_ES, ...HELP_ES].includes(norm(text)) ? 'es' : 'en';

export const stopReply = (dealer: string, lang: 'en' | 'es' = 'en') => lang === 'es'
  ? `${dealer}: Ya no recibirá más mensajes de nosotros. Responda INICIAR para volver a recibirlos.`
  : `${dealer}: You're unsubscribed and won't get more texts from us. Reply START to resubscribe.`;
export const helpReply = (dealer: string, phone: string, lang: 'en' | 'es' = 'en') => lang === 'es'
  ? `${dealer}: Para ayuda llame al ${phone}. Pueden aplicar tarifas de mensajes y datos. Responda PARAR para no recibir más mensajes.`
  : `${dealer}: For help call ${phone}. Msg & data rates may apply. Reply STOP to opt out.`;
export const startReply = (dealer: string, lang: 'en' | 'es' = 'en') => lang === 'es'
  ? `${dealer}: Volverá a recibir nuestros mensajes. Responda PARAR para no recibir más mensajes.`
  : `${dealer}: You're subscribed again. Reply STOP to opt out.`;
export const OPT_OUT_FOOTER = 'Reply STOP to opt out.';

/* ---------- quiet hours (Texas, Tex. Bus. & Com. Code ch. 301, applied to marketing texts) ---------- */

/** Marketing may go 9 am to 9 pm Monday to Saturday, and noon to 9 pm Sunday, in the recipient's time. */
export function inMarketingHours(now: Date, timeZone: string): boolean {
  const p = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(now);
  const day = p.find(x => x.type === 'weekday')!.value, hour = Number(p.find(x => x.type === 'hour')!.value);
  const open = day === 'Sun' ? 12 : 9;
  return hour >= open && hour < 21;
}

/* ---------- the gate: nothing sends without passing it ---------- */

export type GateContext = {
  suppressed: boolean;            // this person said STOP to this dealer
  marketingConsent: boolean;      // express written consent on record for marketing
  now: Date;
  recipientTimeZone: string;      // default the dealer's; Texas lots are America/Chicago
};
export type GateResult = { ok: true; text: string } | { ok: false; reason: 'bad_number' | 'empty' | 'suppressed' | 'no_consent' | 'quiet_hours' | 'too_long' };

const MAX_PARTS = 10;

/** Decide whether a message may go, and the exact text that goes. */
export function gate(kind: MessageKind, to: string, text: string, ctx: GateContext): GateResult {
  if (!toE164(to)) return { ok: false, reason: 'bad_number' };
  let body = plainText(text ?? '').trim();
  if (!body) return { ok: false, reason: 'empty' };
  if (ctx.suppressed) return { ok: false, reason: 'suppressed' };        // STOP ends everything, care included
  if (kind === 'marketing') {
    if (!ctx.marketingConsent) return { ok: false, reason: 'no_consent' };
    if (!inMarketingHours(ctx.now, ctx.recipientTimeZone)) return { ok: false, reason: 'quiet_hours' };
    if (!/reply stop/i.test(body)) body = `${body} ${OPT_OUT_FOOTER}`;
  }
  if (segments(body).parts > MAX_PARTS) return { ok: false, reason: 'too_long' };
  return { ok: true, text: body };
}
