/* A made-up export, shaped like the files a dealer gets from Frazer's Export
   Data, for trying the move without a real file. Names, cars and figures are
   examples; dates are set from today so the notes look current. */
import { addDays, openLoan, standing, takePayment, type Loan } from './loans';

const usd = (c: number) => (c / 100).toFixed(2);
const us = (d: string) => `${d.slice(5, 7)}/${d.slice(8, 10)}/${d.slice(0, 4)}`;

export function sampleExport(asOf: string): { accounts: string; payments: string } {
  const mk = (acct: string, name: string, car: string, stock: string, principal: number, apr: number, count: number, f: 'weekly' | 'biweekly' | 'monthly', firstDue: string, paid: number[]) => {
    let l: Loan = openLoan({ id: acct, buyer: { name, phone: '(555) 010-' + acct.slice(-4) }, vehicle: car, principalCents: principal, apr, count, frequency: f, firstDue, openedOn: addDays(firstDue, -7) });
    paid.forEach((d, i) => { l = takePayment(l, { on: addDays(firstDue, d), cents: l.paymentCents, method: i % 2 ? 'cash' : 'card' }, 7000 + Number(acct.slice(-3)) * 10 + i); });
    return { l, acct, name, car, stock, f };
  };
  const rows = [
    mk('10412', 'MORALES, ANDRE', '2015 Honda Civic LX', '204', 720000, 19.9, 104, 'weekly', addDays(asOf, -35), [0, 7, 14, 21, 28]),
    mk('10418', 'NGUYEN, TAMMY', '2014 Ford F-150 XLT', '209', 1150000, 21, 52, 'biweekly', addDays(asOf, -44), [0, 14]),
    mk('10433', 'BROOKS, KEISHA', '2016 Hyundai Sonata SE', '213', 840000, 18, 36, 'monthly', addDays(asOf, -70), [0, 31]),
  ];
  const head = 'Account Number,Customer Name,Cell Phone,Stock Number,Vehicle Description,Sale Date,Amount Financed,APR,Payment Amount,Term,Payment Frequency,First Payment Date,Next Due Date,Current Balance';
  const acc = rows.map(({ l, acct, name, car, stock, f }, i) => {
    const s = standing(l, asOf), bal = s.payoffCents + (i === 2 ? 1450 : 0);   // the third is $14.50 off, to show a note that needs a look
    return [acct, `"${name}"`, l.buyer.phone, stock, car, us(l.openedOn), usd(l.principalCents), l.apr, usd(l.paymentCents), l.count, f === 'weekly' ? 'W' : f === 'biweekly' ? 'B' : 'M', us(l.firstDue), us(s.next?.due ?? asOf), usd(bal)].join(',');
  });
  // one more, with only today's balance: no history in the payments file
  acc.push(['10440', '"PATEL, RAVI"', '(555) 010-0440', '218', '2013 Toyota Camry LE', us(addDays(asOf, -90)), '', '17.5', '81.75', '', 'W', '', us(addDays(asOf, 3)), '4210.55'].join(','));
  const pays = rows.flatMap(({ l, acct }) => l.payments.map(p => [acct, us(p.on), usd(p.cents), p.method === 'cash' ? 'CASH' : 'DEBIT CARD', p.receipt].join(',')));
  return { accounts: [head, ...acc].join('\n'), payments: ['Account Number,Payment Date,Payment Amount,Payment Type,Receipt Number', ...pays].join('\n') };
}
