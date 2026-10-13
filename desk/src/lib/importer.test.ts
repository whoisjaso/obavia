import { describe, expect, it } from 'vitest';
import { frequencyOf, isoDate, kindOf, mapColumns, methodOf, missing, parseTable, planImport, readTable } from './importer';
import { sampleExport } from './frazer-sample';

const asOf = '2026-10-01';

describe('reading a Frazer export', () => {
  it('reads CSV with quotes and tab-separated text', () => {
    expect(parseTable('A,B\r\n"Rivera, Jordan","say ""hi"""\n\n1,2')).toEqual([['A', 'B'], ['Rivera, Jordan', 'say "hi"'], ['1', '2']]);
    expect(parseTable('Acct\tName\n10412\tJORDAN RIVERA')).toEqual([['Acct', 'Name'], ['10412', 'JORDAN RIVERA']]);
  });

  it('knows each column by meaning, and what kind of file it is', () => {
    const m = mapColumns(['Account Number', 'Customer Name', 'Cell Phone', 'Amount Financed', 'APR', 'Term', 'Payment Frequency', 'First Payment Date', 'Current Balance']);
    expect(m).toMatchObject({ account: 0, name: 1, phone: 2, financed: 3, apr: 4, count: 5, frequency: 6, firstDue: 7, balance: 8 });
    expect(kindOf(m)).toBe('accounts');
    expect(readTable('p.csv', 'Acct #,Date Paid,Payment Amount,Payment Type\n1,10/01/2026,81.75,CASH').kind).toBe('payments');
    expect(readTable('p.csv', 'Acct #,Date Paid,Payment Amount\n1,10/01/2026,81.75').map.payAmount).toBe(2);
    expect(kindOf(mapColumns(['Stock No', 'VIN', 'Year', 'Make', 'Model', 'Asking Price']))).toBe('inventory');
  });

  it('asks only for what the file is missing', () => {
    expect(missing('accounts', mapColumns(['Account', 'Name', 'Amount Financed', 'Term', 'Frequency', 'First Due']))).toEqual(['apr']);
    expect(missing('accounts', mapColumns(['Account', 'Name', 'Balance', 'Rate', 'Payment', 'Frequency', 'Next Due Date']))).toEqual([]);
    expect(mapColumns(['Acct #', 'Int %', 'Pay Freq'])).toMatchObject({ account: 0, apr: 1, frequency: 2 });
  });

  it('reads dates, schedules and payment types the ways they get written', () => {
    expect([isoDate('10/9/26'), isoDate('10/09/2026'), isoDate('2026-10-09'), isoDate('Oct 9')]).toEqual(['2026-10-09', '2026-10-09', '2026-10-09', null]);
    expect(['W', 'Bi-Weekly', 'semi monthly', 'Monthly', '?'].map(frequencyOf)).toEqual(['weekly', 'biweekly', 'semimonthly', 'monthly', null]);
    expect(['CASH', 'Cash App', 'DEBIT CARD', 'Money Order', 'ACH', 'Zelle'].map(methodOf)).toEqual(['cash', 'cash_app', 'card', 'money_order', 'ach', 'zelle']);
  });
});

describe('bringing the notes over', () => {
  const s = sampleExport(asOf), tables = [readTable('accounts.csv', s.accounts), readTable('payments.csv', s.payments)];
  const plan = planImport(tables, asOf);

  it('rebuilds each note from its history and checks it against Frazer to the penny', () => {
    expect(plan.loans).toHaveLength(4);
    expect(plan.payments).toBe(9);
    const by = Object.fromEntries(plan.checks.map(c => [c.account, c.result]));
    expect(by).toEqual({ '10412': 'match', '10418': 'match', '10433': 'off', '10440': 'carried' });
    const jordan = plan.loans.find(l => l.imported?.account === '10412')!;
    expect(jordan).toMatchObject({ id: 'fz-10412', buyer: { name: 'Andre Morales' }, vehicle: '2015 Honda Civic LX · Stock 204', frequency: 'weekly', imported: { mode: 'history' } });
    expect(jordan.payments.every(p => p.via === 'imported')).toBe(true);
  });

  it('carries a balance-only account over from today', () => {
    const alex = plan.loans.find(l => l.imported?.account === '10440')!;
    expect(alex.principalCents).toBe(421055);
    expect(alex.paymentCents).toBeLessThanOrEqual(8175 + 1);
    expect(alex.imported?.mode).toBe('balance');
  });

  it('never brings the same account in twice, and says why a row stayed behind', () => {
    const again = planImport(tables, asOf, plan.loans);
    expect(again.loans).toHaveLength(0);
    expect(again.skipped.every(x => x.why === 'Already in the Desk')).toBe(true);
    const bad = planImport([readTable('a.csv', 'Account,Name,Balance\n1,ANN ROW,500.00')], asOf);
    expect(bad.skipped).toEqual([{ account: '1', name: 'Ann Row', why: 'Missing the rate, schedule or dates' }]);
    const noBalance = planImport([readTable('a.csv', 'Acct #,Customer Name,Amount Financed,Pct,Term,Pay Freq,First Payment Date\n55,"LOPEZ, ANA",5000.00,18,52,W,09/04/2026')], asOf, [], );
    expect(noBalance.checks).toEqual([]);   // Pct is not a rate name: the rate must be asked for first
  });
});
