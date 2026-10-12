/* Pay the balance. Three chips with dates: ACH (clears Thu) · Wire (today) ·
   Cash at the lot. Apple Pay was for the deposit only; the balance moves by
   rails that settle. The deadline is the dealer's: 48 h from the hammer. */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Price } from '../../components/Price';
import { feel } from '../../feel';
import { setSale, useSale } from '../../sale';
import { theme } from '../../theme';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function achClears(from: number) {
  const d = new Date(from); let n = 0;
  while (n < 3) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) n++; }   // three business days
  return DAY[d.getDay()];
}

export function Pay({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const sale = useSale();
  if (!sale) return null;
  const options: { key: 'ach' | 'wire' | 'cash'; label: string; when: string }[] = [
    { key: 'ach', label: 'ACH', when: `clears ${achClears(sale.wonAt)}` },
    { key: 'wire', label: 'Wire', when: 'today' },
    { key: 'cash', label: 'Cash', when: 'at the lot' },
  ];
  const deadline = new Date(sale.wonAt + 48 * 3_600_000);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.sky, paddingTop: insets.top + 12, paddingHorizontal: 22 }]}>
      <Price hammer={sale.total - 250} size={56} ink={theme.color.ink} />
      <Text style={s.by}>by {DAY[deadline.getDay()]} {deadline.getHours() % 12 || 12}{deadline.getHours() >= 12 ? ' pm' : ' am'}</Text>
      <View style={s.chips}>
        {options.map(o => (
          <Pressable key={o.key} onPress={() => { setSale({ pay: o.key }); feel.select(); setTimeout(onDone, 250); }}
            style={[s.chip, sale.pay === o.key && s.chipOn]} accessibilityRole="button" accessibilityLabel={`${o.label}, ${o.when}`} accessibilityState={{ selected: sale.pay === o.key }}>
            <Text style={s.chipLabel}>{o.label}</Text>
            <Text style={s.chipWhen}>{o.when}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  by: { fontFamily: theme.font.sans, fontSize: 14, color: theme.color.muted, marginTop: 4 },
  chips: { marginTop: 28, gap: 10 },
  chip: { height: 64, borderRadius: 18, backgroundColor: theme.color.cloud, borderWidth: 1.5, borderColor: theme.color.line, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipOn: { borderColor: theme.color.accent, backgroundColor: 'rgba(78,106,168,0.10)' },
  chipLabel: { fontFamily: theme.font.sansBold, fontSize: 17, color: theme.color.ink },
  chipWhen: { fontFamily: theme.font.sans, fontSize: 14, color: theme.color.muted },
});
