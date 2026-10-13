/* Referral (W4-B, phases.md Phase 5 Marketing behind its flag). The lane link a buyer shares carries their own
   code (?r=CODE); a phone that opens such a link keeps the code until its number is proved, then claims it once
   (POST /me/referral/claim). The Worker counts; Me shows the count as one faint line when it is above zero.
   Nothing here or anywhere on the glass speaks of a reward: the Worker waives nothing. Pure functions and the
   pending code's storage; the claim itself is the store's (it needs the token). */
import { kv } from './kv';

/** Where the code a link carried waits for the first sign-in. Plain storage: it is not a credential. */
export const REFERRAL_KEY = 'obavia.referral';
/** The codes the Worker mints: letters and digits, 4 to 16 of them. Anything else on a link is ignored. */
const CODE = /^[A-Za-z0-9]{4,16}$/;

/** The code on a cold-open URL (web: location.search; native: the deep link), or null. `r` only. */
export function codeFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const q = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '';
  for (const part of q.split('&')) {
    const [k, v = ''] = part.split('=');
    if (k !== 'r') continue;
    let code = '';
    try { code = decodeURIComponent(v); } catch { return null; }
    return CODE.test(code) ? code.toUpperCase() : null;
  }
  return null;
}

/** Keep a link's code for the claim; a code already waiting is kept (the first link wins). */
export function rememberReferral(code: string | null): void {
  if (!code || !CODE.test(code)) return;
  if (kv.get(REFERRAL_KEY)) return;
  kv.set(REFERRAL_KEY, code.toUpperCase());
}
export const pendingReferral = (): string | null => { const v = kv.get(REFERRAL_KEY); return v && CODE.test(v) ? v : null; };
export const forgetReferral = (): void => kv.remove(REFERRAL_KEY);

/** The Worker's answers that end the claim for good: taken (409) or no such code (404). The network keeps it. */
export const claimSettled = (code: string): boolean => code === 'already_claimed' || code === 'no_such_code';

/** The lane link with the buyer's code on it when they have one. The site's lane page (W4-E) reads ?r and passes it
    to the store links; a phone that opens the app from it lands in codeFromUrl above. */
export function withReferral(link: string, code: string | undefined | null): string {
  if (!code || !CODE.test(code)) return link;
  return `${link}${link.includes('?') ? '&' : '?'}r=${encodeURIComponent(code.toUpperCase())}`;
}
