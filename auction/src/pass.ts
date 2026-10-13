/* The pass: one source for what the QR says and what is printed under it. The Desk reads the QR as
   `obavia:<lot>:<vin>:<wonAt>` and keeps the VIN's last six (desk/src/lib/scan.ts, passSix); a Desk
   with no scanner types the six the buyer shows. Both are the VIN's last six, letters and digits
   only, upper case, so the typed six and the scanned six are the same six. */

/** What the pass's QR encodes. */
export const passValue = (lotId: string, vin: string, wonAt: number) => `obavia:${lotId}:${vin}:${wonAt}`;

/** The six printed under the QR: the VIN's last six, upper case. */
export const passSix = (vin: string) => vin.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-6);
