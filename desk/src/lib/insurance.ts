/* Insurance on the car under the note. An uninsured car the dealer still holds
   the lien on is the dealer's own risk, so the Desk keeps the policy's end date,
   texts the buyer before it ends and on the day it does, and shows the owner
   anyone without proof. The buyer can send the new card from their own page.
   Force-placed coverage (CPI) is a different product with its own disclosures
   and is not done here. */
import { addDays, daysBetween, type Loan } from './loans';

export type Insurance = { company: string; policy?: string; expires: string; updated: string; by: 'desk' | 'buyer'; photo?: string };
export type InsuranceState = { state: 'none' | 'ok' | 'soon' | 'lapsed'; days?: number };
export const SOON_DAYS = 14, TEXT_BEFORE = 10;

export function insuranceState(l: Loan, asOf: string): InsuranceState {
  const i = l.insurance;
  if (!i) return { state: 'none' };
  const days = daysBetween(asOf, i.expires);
  return { state: days < 0 ? 'lapsed' : days <= SOON_DAYS ? 'soon' : 'ok', days };
}

const day = (d: string, lang: 'en' | 'es') => new Date(d + 'T12:00:00Z').toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' });

/** Two texts at most for each policy: ten days before it ends, and the day after it ended. */
export function insuranceTexts(l: Loan, dealerName: string): { on: string; text: string }[] {
  const i = l.insurance; if (!i) return [];
  const first = l.buyer.name.split(' ')[0], car = l.vehicle.split(' · ')[0], es = l.language === 'es';
  return [
    { on: addDays(i.expires, -TEXT_BEFORE), text: es
      ? `Hola ${first}, ${dealerName} le recuerda: el seguro de su ${car} vence el ${day(i.expires, 'es')}. Envíenos su nueva tarjeta de seguro respondiendo con una foto o desde la página de su cuenta.`
      : `Hi ${first}, a reminder from ${dealerName}: the insurance on your ${car} ends ${day(i.expires, 'en')}. Please send us your new insurance card by replying with a photo or from your account page.` },
    { on: addDays(i.expires, 1), text: es
      ? `Hola ${first}, según nuestros registros el seguro de su ${car} venció. Envíenos su comprobante de seguro vigente respondiendo con una foto o desde la página de su cuenta.`
      : `Hi ${first}, our records show the insurance on your ${car} has ended. Please send us proof of your current insurance by replying with a photo or from your account page.` },
  ];
}
