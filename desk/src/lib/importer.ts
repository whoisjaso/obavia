/* Leaving Frazer in an afternoon.

   Frazer's own export (Miscellaneous → 8 Export Data) writes a .csv or a
   tab-separated .txt, with column headers if the dealer ticks "Include Column
   Headers", from 250+ fields the dealer picks. The header names aren't
   published, so every column is read by meaning: each field below lists the
   names a header may carry. Anything we can't place is asked once, with the
   file's own sample values beside each column.

   Two ways in, per account:
   - history: the original note (amount financed, rate, payments, first due)
     plus every payment from a payments file. The note is rebuilt exactly,
     then checked against Frazer's balance to the penny.
   - balance: only today's balance, rate, payment and next due. The note is
     carried over from today, and marked so. */

import { addDays, installmentCents, openLoan, standing, takePayment, type Frequency, type Loan, type Method } from './loans';
import type { Vehicle } from './sale';

/* ---------- reading the file ---------- */

/** CSV or tab-separated text into rows of cells. Quotes, doubled quotes and newlines inside quotes are honoured. */
export function parseTable(text: string): string[][] {
  const t = text.replace(/^﻿/, ''), firstLine = t.split(/\r?\n/, 1)[0] ?? '';
  const sep = (firstLine.match(/\t/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? '\t' : ',';
  const rows: string[][] = []; let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; }
    if (c === '"' && cell === '') q = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some(x => x.trim() !== '')) rows.push(row); row = []; }
    else cell += c;
  }
  row.push(cell); if (row.some(x => x.trim() !== '')) rows.push(row);
  return rows.map(r => r.map(x => x.trim()));
}

const key = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

/** What each column may be called. Exact names first; a few fields also accept a header that contains a word. */
export const FIELDS = {
  account: { label: 'Account Number', names: ['account', 'accountnumber', 'accountno', 'acct', 'acctno', 'acctnumber', 'customernumber', 'customerno', 'custno', 'custnumber', 'dealnumber', 'dealno'] },
  name: { label: 'Buyer’s Name', names: ['name', 'customername', 'customer', 'buyer', 'buyername', 'fullname', 'customerfullname'] },
  first: { label: 'First Name', names: ['firstname', 'first', 'customerfirstname', 'buyerfirstname'] },
  last: { label: 'Last Name', names: ['lastname', 'last', 'customerlastname', 'buyerlastname'] },
  phone: { label: 'Phone', names: ['phone', 'cellphone', 'cell', 'mobile', 'mobilephone', 'homephone', 'phonenumber', 'customerphone', 'primaryphone'], contains: ['phone'] },
  stock: { label: 'Stock Number', names: ['stock', 'stocknumber', 'stockno', 'stk', 'stknum'] },
  vin: { label: 'VIN', names: ['vin', 'vinnumber', 'vehicleidentificationnumber'] },
  year: { label: 'Year', names: ['year', 'vehicleyear', 'modelyear', 'yr'] },
  make: { label: 'Make', names: ['make', 'vehiclemake'] },
  model: { label: 'Model', names: ['model', 'vehiclemodel'] },
  vehicle: { label: 'Vehicle', names: ['vehicle', 'vehicledescription', 'description', 'car'] },
  saleDate: { label: 'Sale Date', names: ['saledate', 'datesold', 'solddate', 'contractdate', 'dealdate', 'date'] },
  financed: { label: 'Amount Financed', names: ['amountfinanced', 'financed', 'principal', 'originalbalance', 'originalprincipal', 'financeamount', 'amtfinanced'] },
  apr: { label: 'Interest Rate', names: ['apr', 'rate', 'interestrate', 'annualpercentagerate', 'intrate', 'int', 'interest', 'intpct', 'interestpct', 'aprpct', 'apr%'] },
  payment: { label: 'Payment Amount', names: ['payment', 'paymentamount', 'regularpayment', 'pmt', 'pmtamount', 'paymentamt', 'scheduledpayment'] },
  count: { label: 'Number Of Payments', names: ['term', 'numberofpayments', 'numpayments', 'nopayments', 'termpayments', 'payments', 'totalpayments'] },
  frequency: { label: 'How Often They Pay', names: ['frequency', 'paymentfrequency', 'schedule', 'payschedule', 'paymentschedule', 'payperiod', 'paymentterm', 'payfreq', 'pmtfreq', 'freq', 'payfrequency', 'pmtfrequency'] },
  firstDue: { label: 'First Payment Date', names: ['firstpaymentdate', 'firstdue', 'firstpaymentdue', 'firstduedate', 'firstpayment'] },
  nextDue: { label: 'Next Due Date', names: ['nextduedate', 'nextdue', 'duedate', 'nextpaymentdate', 'nextpaymentdue'] },
  balance: { label: 'Current Balance', names: ['balance', 'currentbalance', 'principalbalance', 'payoff', 'payoffamount', 'balancedue', 'currentprincipal'] },
  payDate: { label: 'Payment Date', names: ['paymentdate', 'datepaid', 'paiddate', 'transactiondate', 'trandate', 'receiptdate'] },
  payAmount: { label: 'Amount Paid', names: ['amountpaid', 'paidamount', 'paymentamount', 'amount', 'transactionamount', 'tranamount'] },
  payMethod: { label: 'How They Paid', names: ['method', 'paymentmethod', 'paymenttype', 'paidby', 'tendertype', 'type'] },
  receipt: { label: 'Receipt Number', names: ['receipt', 'receiptnumber', 'receiptno', 'transactionnumber'] },
  price: { label: 'Price', names: ['price', 'askingprice', 'saleprice', 'retailprice', 'listprice', 'internetprice'] },
  miles: { label: 'Miles', names: ['miles', 'mileage', 'odometer', 'odometerreading'] },
  color: { label: 'Color', names: ['color', 'colour', 'exteriorcolor', 'extcolor'] },
} as const;
export type Field = keyof typeof FIELDS;
export type ColumnMap = Partial<Record<Field, number>>;
export type Kind = 'accounts' | 'payments' | 'inventory' | 'unknown';

/** Places each header under the field it means. A column is used once; exact names win over "contains". */
export function mapColumns(headers: string[], kindHint?: Kind): ColumnMap {
  const k = headers.map(key), map: ColumnMap = {}, used = new Set<number>();
  const order = (Object.keys(FIELDS) as Field[]).sort((a, b) => (kindHint === 'payments' && a === 'payAmount' ? -1 : kindHint === 'payments' && b === 'payAmount' ? 1 : 0));
  for (const f of order) {
    const i = k.findIndex((h, j) => !used.has(j) && (FIELDS[f].names as readonly string[]).includes(h));
    if (i >= 0) { map[f] = i; used.add(i); }
  }
  for (const f of order) {
    const c = (FIELDS[f] as { contains?: readonly string[] }).contains; if (map[f] !== undefined || !c) continue;
    const i = k.findIndex((h, j) => !used.has(j) && c.some(w => h.includes(w)));
    if (i >= 0) { map[f] = i; used.add(i); }
  }
  return map;
}

/** What a file holds, from the columns it has. */
export function kindOf(map: ColumnMap): Kind {
  const has = (f: Field) => map[f] !== undefined;
  if (has('account') && has('payDate') && (has('payAmount') || has('payment')) && !has('financed') && !has('count')) return 'payments';
  if ((has('name') || has('last')) && (has('financed') || has('balance') || has('count'))) return 'accounts';
  if (has('vin') && (has('price') || has('stock')) && !has('name') && !has('last')) return 'inventory';
  return 'unknown';
}

/** The fields an accounts file still needs, for whichever way in it can get closest to. */
export function missing(kind: Kind, map: ColumnMap): Field[] {
  const need = (fs: Field[]) => fs.filter(f => map[f] === undefined);
  if (kind === 'payments') return need(['account', 'payDate', map.payAmount === undefined && map.payment !== undefined ? 'payment' : 'payAmount']);
  if (kind === 'inventory') return need(['vin', 'year', 'make', 'model']);
  if (kind !== 'accounts') return [];
  const who = map.name !== undefined || map.last !== undefined ? [] : ['name' as Field];
  const history = need(['account', 'financed', 'apr', 'count', 'frequency', 'firstDue']), carried = need(['account', 'balance', 'apr', 'payment', 'frequency', 'nextDue']);
  return [...who, ...(history.length <= carried.length ? history : carried)];
}

/* ---------- reading values ---------- */

const money = (v?: string) => { const n = Number((v ?? '').replace(/[$,\s]/g, '').replace(/^\((.*)\)$/, '-$1')); return Number.isFinite(n) && v?.trim() ? Math.round(n * 100) : null; };
const num = (v?: string) => { const n = Number((v ?? '').replace(/[%,\s]/g, '')); return Number.isFinite(n) && v?.trim() ? n : null; };
/** 10/09/2026, 10/9/26, 2026-10-09 → 2026-10-09. */
export function isoDate(v?: string): string | null {
  const s = (v ?? '').trim(); let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  if ((m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/))) { const y = m[3].length === 2 ? (Number(m[3]) > 70 ? '19' : '20') + m[3] : m[3]; return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`; }
  return null;
}
export function frequencyOf(v?: string): Frequency | null {
  const s = key(v ?? '');
  if (/^(w|wk|wkly|weekly|week|52)$/.test(s)) return 'weekly';
  if (/^(b|bw|biweekly|everyotherweek|every2weeks|biwk|26)$/.test(s)) return 'biweekly';
  if (/^(s|sm|semimonthly|twiceamonth|semimo|24)$/.test(s)) return 'semimonthly';
  if (/^(m|mo|mthly|monthly|month|12)$/.test(s)) return 'monthly';
  return null;
}
export function methodOf(v?: string): Method {
  const s = key(v ?? '');
  if (/cash/.test(s) && !/cashapp/.test(s)) return 'cash';
  if (/cashapp/.test(s)) return 'cash_app';
  if (/zelle/.test(s)) return 'zelle';
  if (/venmo/.test(s)) return 'venmo';
  if (/paypal/.test(s)) return 'paypal';
  if (/moneyorder|mo$/.test(s)) return 'money_order';
  if (/check|chk/.test(s)) return 'check';
  if (/ach|bank|eft/.test(s)) return 'ach';
  if (/card|visa|mastercard|debit|credit|amex|discover/.test(s)) return 'card';
  return 'other';
}
const PERIOD: Record<Frequency, number> = { weekly: 7, biweekly: 14, semimonthly: 15, monthly: 30 };

/* ---------- building the notes ---------- */

export type Table = { name: string; headers: string[]; rows: string[][]; map: ColumnMap; kind: Kind };
export function readTable(name: string, text: string, override: ColumnMap = {}): Table {
  const [headers = [], ...rows] = parseTable(text);
  const auto = mapColumns(headers), kind = kindOf({ ...auto, ...override });
  return { name, headers, rows, map: { ...mapColumns(headers, kind), ...override }, kind };
}

export type Check = { account: string; name: string; result: 'match' | 'off' | 'carried' | 'unchecked'; ours: number; theirs?: number };
export type Skipped = { account: string; name: string; why: string };
export type Plan = { loans: Loan[]; cars: Vehicle[]; checks: Check[]; skipped: Skipped[]; payments: number };

/** Turns the files into notes and cars, checks every note against Frazer's balance, and lists what couldn't come over and why. */
export function planImport(tables: Table[], asOf: string, existing: Loan[] = []): Plan {
  const cell = (t: Table, r: string[], f: Field) => (t.map[f] !== undefined ? r[t.map[f]!] : undefined);
  const pays = new Map<string, { on: string; cents: number; method: Method; receipt?: number }[]>();
  let payments = 0;
  for (const t of tables.filter(x => x.kind === 'payments')) for (const r of t.rows) {
    const acct = cell(t, r, 'account'), on = isoDate(cell(t, r, 'payDate')), cents = money(cell(t, r, 'payAmount') ?? cell(t, r, 'payment'));
    if (!acct || !on || !cents || cents <= 0) continue;
    const list = pays.get(acct) ?? []; list.push({ on, cents, method: methodOf(cell(t, r, 'payMethod')), receipt: num(cell(t, r, 'receipt')) ?? undefined }); pays.set(acct, list);
  }
  const loans: Loan[] = [], checks: Check[] = [], skipped: Skipped[] = [], have = new Set(existing.map(l => l.id));
  let r0 = 900000;
  for (const t of tables.filter(x => x.kind === 'accounts')) for (const r of t.rows) {
    const acct = cell(t, r, 'account') ?? '', name = (cell(t, r, 'name') || [cell(t, r, 'first'), cell(t, r, 'last')].filter(Boolean).join(' ')).replace(/\s+/g, ' ').trim();
    const nice = name.includes(',') ? name.split(',').map(s => s.trim()).reverse().join(' ') : name;   // "RIVERA, JORDAN" → "JORDAN RIVERA"
    const buyer = nice.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
    const id = 'fz-' + key(acct);
    if (!acct || !buyer) { skipped.push({ account: acct || '?', name: buyer || '?', why: 'No account number or name' }); continue; }
    if (have.has(id)) { skipped.push({ account: acct, name: buyer, why: 'Already in the Desk' }); continue; }
    const car = cell(t, r, 'vehicle') || [cell(t, r, 'year'), cell(t, r, 'make'), cell(t, r, 'model')].filter(Boolean).join(' ');
    const stock = cell(t, r, 'stock'), vehicle = `${car || 'Vehicle'}${stock ? ` · Stock ${stock}` : ''}`;
    const apr = num(cell(t, r, 'apr')), f = frequencyOf(cell(t, r, 'frequency')), theirs = money(cell(t, r, 'balance')) ?? undefined;
    const financed = money(cell(t, r, 'financed')), count = num(cell(t, r, 'count')), firstDue = isoDate(cell(t, r, 'firstDue'));
    const sold = isoDate(cell(t, r, 'saleDate')), list = pays.get(acct) ?? [];
    const common = { buyer: { name: buyer, phone: cell(t, r, 'phone') ?? '' }, vehicle };

    if (financed && apr !== null && count && f && firstDue) {
      let l = openLoan({ id, ...common, principalCents: financed, apr, count, frequency: f, firstDue, openedOn: sold ?? addDays(firstDue, -PERIOD[f]) });
      for (const p of [...list].sort((a, b) => a.on.localeCompare(b.on))) l = takePayment(l, { on: p.on, cents: p.cents, method: p.method, via: 'imported' }, p.receipt ?? ++r0);
      l = { ...l, imported: { from: 'frazer', on: asOf, account: acct, theirBalanceCents: theirs, mode: 'history' } };
      const ours = standing(l, asOf).payoffCents;
      loans.push(l); payments += list.length;
      checks.push({ account: acct, name: buyer, ours, theirs, result: theirs === undefined ? 'unchecked' : Math.abs(ours - theirs) <= 100 ? 'match' : 'off' });
      continue;
    }
    const pay = money(cell(t, r, 'payment')), nextDue = isoDate(cell(t, r, 'nextDue'));
    if (theirs && apr !== null && pay && f && nextDue) {
      let n = 1; while (n < 600 && installmentCents(theirs, apr, n, f) > pay + 1) n++;
      const l: Loan = { ...openLoan({ id, ...common, principalCents: theirs, apr, count: n, frequency: f, firstDue: nextDue, openedOn: addDays(nextDue, -PERIOD[f]) }),
        imported: { from: 'frazer', on: asOf, account: acct, theirBalanceCents: theirs, mode: 'balance' } };
      loans.push(l);
      checks.push({ account: acct, name: buyer, ours: standing(l, asOf).payoffCents, theirs, result: 'carried' });
      continue;
    }
    skipped.push({ account: acct, name: buyer, why: theirs !== undefined && theirs <= 0 ? 'Paid off' : 'Missing the rate, schedule or dates' });
  }

  const cars: Vehicle[] = [];
  for (const t of tables.filter(x => x.kind === 'inventory')) for (const r of t.rows) {
    const vin = (cell(t, r, 'vin') ?? '').toUpperCase(), year = num(cell(t, r, 'year'));
    if (!vin || !year) continue;
    cars.push({ id: 'fz-' + vin, stock: cell(t, r, 'stock') ?? vin.slice(-6), vin, year, make: cell(t, r, 'make') ?? '', model: cell(t, r, 'model') ?? '', bodyStyle: 'Sedan',
      price: (money(cell(t, r, 'price')) ?? 0) / 100, mileage: num(cell(t, r, 'miles')), emptyWeight: null, color: '#9AA6BF', titleStatus: 'unknown' });
  }
  return { loans, cars, checks, skipped, payments };
}
