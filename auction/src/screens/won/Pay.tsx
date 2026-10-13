/* Pay the balance. One number, one date, three ways: ACH with its clearing
   day, Wire today, Cash at the lot. The words are the choices. The date is
   the server's pay-by (the lot's sale.deadlineAt, synced by the Lane), in
   Bodoni, in the buyer's own time zone, the same words the push says after
   "Pay by" (DOCTRINE CP9). Until the server's date arrives the line waits. */
import React from 'react';
import { View } from 'react-native';
import { Choice, Hairline, Label, Page, Serif } from '../../components/Type';
import { dollars } from '../../engine/money';
import { payByWords, payDeadline, setSale, useSale } from '../../sale';
import { DEPOSIT } from '../../store';
import { theme } from '../../theme';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function achClears(from: number) {
  const d = new Date(from); let n = 0;
  while (n < 3) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) n++; }   // three business days
  return DAY[d.getDay()];
}

export function Pay({ onDone }: { onDone: () => void }) {
  const sale = useSale();
  if (!sale) return null;
  const due = payDeadline(sale);
  const by = due === null ? null : payByWords(due);
  const pick = (k: 'ach' | 'wire' | 'cash') => { setSale({ pay: k }); setTimeout(onDone, 260); };
  return (
    <Page>
      <Label>Balance</Label>
      <Serif size={theme.size.display + 12}>${dollars(sale.total - DEPOSIT)}</Serif>
      {by && (
        <View accessible accessibilityLabel={`Pay by ${by}`} style={{ marginTop: theme.space.m, alignItems: 'center' }}>
          <Label>Pay by</Label>
          <Serif size={34}>{by}</Serif>
        </View>
      )}
      <Hairline style={{ marginVertical: theme.space.l }} />
      <View>
        <Choice label="Bank" detail={`transfer, clears ${achClears(sale.wonAt)}`} accessibilityLabel={`Bank transfer, clears ${achClears(sale.wonAt)}`} selected={sale.pay === 'ach'} onPress={() => pick('ach')} />
        <Choice label="Wire" detail="today" selected={sale.pay === 'wire'} onPress={() => pick('wire')} />
        <Choice label="Cash" detail="at the lot" selected={sale.pay === 'cash'} onPress={() => pick('cash')} />
      </View>
    </Page>
  );
}
