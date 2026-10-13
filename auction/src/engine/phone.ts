/* The number on the Phone page (screens/won/Phone.tsx), without React: what was typed as at most ten
   digits, how it reads while it fills, and whether the Worker will take it (worker/src/phone.ts usE164). */

/** What was typed, as at most ten digits (a leading country 1 dropped). */
export function usDigits(typed: string): string {
  let d = typed.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return d.slice(0, 10);
}

/** Ten digits as a US number reads, (214) 555-0142, built up as they are typed. `sep` joins the last four:
    a space where the number is set in Bodoni, whose hyphen is a hairline that vanishes (components/Type.tsx). */
export function formatUS(d: string, sep = '-'): string {
  if (d.length <= 3) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}${sep}${d.slice(6, 10)}`;
}

/** A NANP number the Worker accepts: area code and exchange never start with 0 or 1. */
export const validUS = (d: string) => /^[2-9]\d{2}[2-9]\d{6}$/.test(d);
