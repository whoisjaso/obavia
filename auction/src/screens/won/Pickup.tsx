/* Pickup. The pin at the licensed lot, the window wheel, the after-hours line,
   the pass. At the lot the dealer scans the VIN, the car starts, the pass turns
   green: that is when the sale completes. Demo: hold the pass to stand in for
   the dealer's scan. */
import React, { useEffect } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QR } from '../../components/QR';
import type { Car } from '../../data/cars';
import { feel } from '../../feel';
import { arriveAtLot, setSale, useSale } from '../../sale';
import { theme } from '../../theme';

const SLOTS = ['Today 4–6', 'Tomorrow 10–12', 'Tomorrow 2–4', 'Sat 10–2', 'Mon 9–11'];

export function Pickup({ car, onDone }: { car: Car; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const sale = useSale();
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (sale?.arrived && !sale.pickedUp) pulse.value = withRepeat(withSequence(withTiming(1.03, { duration: 500, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 500 })), -1);
    else pulse.value = withTiming(1, { duration: 200 });
  }, [sale?.arrived, sale?.pickedUp]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  if (!sale) return null;
  const green = !!sale.pickedUp;
  return (
    <ScrollView style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.sky }]} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 22, paddingBottom: 40, gap: 18 }}>
      {/* the pin */}
      <Pressable onPress={() => Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(car.dealer.street)}`)} style={s.map} accessibilityRole="button" accessibilityLabel={`Directions to ${car.dealer.name}`}>
        <Svg width="100%" height="100%" viewBox="0 0 300 140" preserveAspectRatio="none">
          <Path d="M0 40 H300 M0 90 H300 M60 0 V140 M150 0 V140 M240 0 V140" stroke={theme.color.ice} strokeWidth={6} strokeOpacity={0.5} />
          <Path d="M0 65 H300" stroke={theme.color.cloud} strokeWidth={10} />
        </Svg>
        <View style={s.pin}><Svg width={34} height={44} viewBox="0 0 34 44"><Path d="M17 43 C17 43 3 25 3 15 A14 14 0 0 1 31 15 C31 25 17 43 17 43Z" fill={theme.color.accent} /><Circle cx={17} cy={15} r={5.5} fill={theme.color.cloud} /></Svg></View>
        <View style={s.addr}><Text style={s.addrName}>{car.dealer.name}</Text><Text style={s.addrLine}>{car.dealer.street}</Text></View>
      </Pressable>

      {/* the window wheel */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.slots} decelerationRate="fast" snapToInterval={124}>
        {SLOTS.map(sl => (
          <Pressable key={sl} onPress={() => { setSale({ slot: sl }); feel.select(); }} style={[s.slot, sale.slot === sl && s.slotOn]} accessibilityRole="button" accessibilityState={{ selected: sale.slot === sl }}>
            <Text style={[s.slotText, sale.slot === sl && { color: theme.color.accent }]}>{sl}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable onPress={() => Linking.openURL(`tel:${car.dealer.afterHours.replace(/\D/g, '')}`)} style={s.line} accessibilityRole="button" accessibilityLabel={`After hours ${car.dealer.afterHours}`}>
        <Text style={s.lineKey}>After hours</Text><Text style={s.lineVal}>{car.dealer.afterHours}</Text>
      </Pressable>

      {/* the pass */}
      {sale.slot && (
        <Animated.View style={[s.pass, green && s.passGreen, pulseStyle]}>
          <Pressable onLongPress={() => { if (!sale.arrived) arriveAtLot(); }} delayLongPress={600} accessibilityRole="button" accessibilityLabel={green ? 'Car started, sale complete' : 'Pass. At the lot, the dealer scans this.'}>
            <QR value={`obavia:${sale.lotId}:${car.vin}:${sale.wonAt}`} green={green} />
          </Pressable>
          <Text style={[s.passText, green && { color: theme.color.good }]}>{green ? `${car.year} ${car.make} ${car.model} · started` : sale.slot}</Text>
        </Animated.View>
      )}
      {green && (
        <Pressable onPress={onDone} style={s.btn} accessibilityRole="button"><Text style={s.btnText}>Continue</Text></Pressable>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  map: { height: 150, borderRadius: 20, backgroundColor: '#E4ECFB', overflow: 'hidden' },
  pin: { position: 'absolute', left: '50%', top: 34, marginLeft: -17 },
  addr: { position: 'absolute', left: 14, bottom: 12, backgroundColor: theme.color.cloud, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  addrName: { fontFamily: theme.font.sansBold, fontSize: 14, color: theme.color.ink },
  addrLine: { fontFamily: theme.font.sans, fontSize: 12, color: theme.color.muted },
  slots: { gap: 8 },
  slot: { width: 116, height: 56, borderRadius: 16, backgroundColor: theme.color.cloud, borderWidth: 1.5, borderColor: theme.color.line, alignItems: 'center', justifyContent: 'center' },
  slotOn: { borderColor: theme.color.accent, backgroundColor: 'rgba(78,106,168,0.10)' },
  slotText: { fontFamily: theme.font.sansBold, fontSize: 14, color: theme.color.ink, fontVariant: ['tabular-nums'] },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  lineKey: { fontFamily: theme.font.sans, fontSize: 13, color: theme.color.muted },
  lineVal: { fontFamily: theme.font.sansBold, fontSize: 13, color: theme.color.accent },
  pass: { alignSelf: 'center', alignItems: 'center', gap: 12, padding: 18, borderRadius: 24, backgroundColor: theme.color.cloud, borderWidth: 1.5, borderColor: theme.color.line },
  passGreen: { borderColor: theme.color.good },
  passText: { fontFamily: theme.font.sansBold, fontSize: 14, color: theme.color.ink },
  btn: { height: 52, borderRadius: 26, backgroundColor: theme.color.accent, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: theme.font.sansBold, fontSize: 16, color: theme.color.cloud },
});
