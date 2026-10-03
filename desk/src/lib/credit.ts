/* Credit reporting: each note's month, in Metro 2 terms (the format the credit
   bureaus take from lenders). The Desk prepares the account data; a bureau or a
   reporting partner signs the dealer up as a furnisher and takes the file.
   Identity (Social Security number, date of birth) lives on the credit
   application, never in the Desk, and is joined by the partner.
   Furnishing makes the dealer responsible for accuracy and for answering
   disputes within 30 days (FCRA §623, Regulation V): turn it on deliberately. */
import { addDays, standing, type Frequency, type Loan } from './loans';
import type { Sale } from './sale';

export const STATUS_WORDS: Record<string, string> = { '11': 'Current', '71': '30 to 59 days past due', '78': '60 to 89 days past due', '80': '90 to 119 days past due', '82': '120 to 149 days past due', '83': '150 to 179 days past due', '84': '180 days or more past due', '13': 'Paid or closed', '96': 'Repossessed' };
const FREQ: Record<Frequency, string> = { weekly: 'W', biweekly: 'B', semimonthly: 'E', monthly: 'M' };
const PER_MONTH: Record<Frequency, number> = { weekly: 52 / 12, biweekly: 26 / 12, semimonthly: 2, monthly: 1 };

/** Metro 2 account status from days past due. */
export function statusCode(daysLate: number) {
  return daysLate < 30 ? '11' : daysLate < 60 ? '71' : daysLate < 90 ? '78' : daysLate < 120 ? '80' : daysLate < 150 ? '82' : daysLate < 180 ? '83' : '84';
}
const histChar = (daysLate: number) => daysLate < 30 ? '0' : String(Math.min(6, Math.floor(daysLate / 30)));
const prevMonthEnd = (d: string) => addDays(`${d.slice(0, 7)}-01`, -1);
const ymd = (d: string) => d.slice(5, 7) + d.slice(8, 10) + d.slice(0, 4);   // Metro 2 dates are MMDDYYYY
const dollars = (c: number) => Math.max(0, Math.round(c / 100));

export type CreditRow = {
  account: string; name: string; status: string; words: string;
  fields: Record<string, string | number>;
  missing: string[];
};

/** One note as of the end of a month (or a day inside it). */
export function creditRow(l: Loan, asOf: string, sale?: Sale): CreditRow {
  const s = standing(l, asOf), repo = l.tax?.repossessed && l.tax.repossessed <= asOf;
  const status = repo ? '96' : s.status === 'paid_off' ? '13' : statusCode(s.daysLate);
  // the last 24 months, most recent first: 0 = current, 1 = 30 days late … 6 = 180+, B = before the account opened, E = paid, zero balance
  let hist = '', m = prevMonthEnd(asOf);
  for (let k = 0; k < 24; k++, m = prevMonthEnd(m)) {
    if (m < l.openedOn) { hist += 'B'; continue; }
    const x = standing(l, m); hist += x.status === 'paid_off' ? 'E' : histChar(x.daysLate);
  }
  const oldestLate = s.installments.find(i => i.paidCents < i.cents && i.due < asOf);
  const last = [...l.payments].filter(p => p.on <= asOf).map(p => p.on).sort().pop();
  const parts = l.buyer.name.trim().split(/\s+/), b = sale?.buyer;
  const missing = ['Social Security number', 'Date of birth', ...(b?.address ? [] : ['Address'])];
  return {
    account: l.id, name: l.buyer.name, status, words: STATUS_WORDS[status],
    fields: {
      'Consumer Account Number': l.id,
      'Portfolio Type': 'I', 'Account Type': '00', 'ECOA Code': '1',
      'Date Opened': ymd(l.openedOn),
      'Highest Credit or Original Loan Amount': dollars(l.principalCents),
      'Terms Duration': l.count, 'Terms Frequency': FREQ[l.frequency],
      'Scheduled Monthly Payment Amount': dollars(l.paymentCents * PER_MONTH[l.frequency]),
      'Actual Payment Amount': dollars(l.payments.filter(p => p.on.slice(0, 7) === asOf.slice(0, 7)).reduce((t, p) => t + p.cents, 0)),
      'Account Status': status,
      'Payment Rating': status === '13' || status === '96' ? histChar(s.daysLate) : '',
      'Payment History Profile': hist,
      'Current Balance': status === '13' ? 0 : dollars(s.principalCents + s.feesOwedCents),
      'Amount Past Due': status === '13' ? 0 : dollars(s.pastDueCents + s.feesOwedCents),
      'Date of Account Information': ymd(asOf),
      'Date of First Delinquency': status !== '11' && status !== '13' && oldestLate ? ymd(addDays(oldestLate.due, 30)) : '',
      'Date Closed': status === '13' && last ? ymd(last) : '',
      'Date of Last Payment': last ? ymd(last) : '',
      'Surname': parts.length > 1 ? parts[parts.length - 1] : parts[0], 'First Name': parts[0],
      'Address': b?.address ?? '', 'City': b?.city ?? '', 'State': b?.state ?? '', 'Postal Code': b?.zip ?? '',
      'Telephone Number': l.buyer.phone.replace(/\D/g, ''),
    },
    missing,
  };
}

/** The file for a month: every note open during it. */
export function creditFile(loans: Loan[], asOf: string, sales: Sale[] = []) {
  const rows = loans.filter(l => l.openedOn <= asOf).map(l => creditRow(l, asOf, sales.find(x => x.id === l.saleId)));
  const cols = rows[0] ? Object.keys(rows[0].fields) : [];
  const cell = (v: string | number) => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  const csv = [cols.join(','), ...rows.map(r => cols.map(c => cell(r.fields[c])).join(','))].join('\n');
  return { rows, csv };
}
