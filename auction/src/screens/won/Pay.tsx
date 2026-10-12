/* Pay the balance. One number, one date, three ways: ACH with its clearing
   day, Wire today, Cash at the lot. The words are the choices. */
import React from 'react';
import { View } from 'react-native';
import { Choice, Hairline, Label, Page, Serif } from '../../components/Type';
import { dollars } from '../../engine/money';
import { setSale, useSale } from '../../sale';
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
  const deadline = new Date(sale.wonAt + 48 * 3_600_000);
  const by = `${DAY[deadline.getDay()]} ${deadline.getHours() % 12 || 12} ${deadline.getHours() >= 12 ? 'pm' : 'am'}`;
  const pick = (k: 'ach' | 'wire' | 'cash') => { setSale({ pay: k }); setTimeout(onDone, 260); };
  return (
    <Page>
      <Label>Balance</Label>
      <Serif size={theme.size.display + 12}>${dollars(sale.total - DEPOSIT)}</Serif>
      <Label style={{ marginTop: 2 }}>by {by}</Label>
      <Hairline style={{ marginVertical: theme.space.l }} />
      <View>
        <Choice label="ACH" detail={`clears ${achClears(sale.wonAt)}`} selected={sale.pay === 'ach'} onPress={() => pick('ach')} />
        <Choice label="Wire" detail="today" selected={sale.pay === 'wire'} onPress={() => pick('wire')} />
        <Choice label="Cash" detail="at the lot" selected={sale.pay === 'cash'} onPress={() => pick('cash')} />
      </View>
    </Page>
  );
}
