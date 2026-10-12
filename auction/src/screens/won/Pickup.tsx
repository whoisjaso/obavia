/* Pickup. Three pages: where; when; the pass. At the lot the dealer scans the
   VIN, the car starts, the pass turns green: that is when the sale completes.
   Demo: hold the pass to stand in for the dealer's scan. */
import React, { useEffect } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { QR } from '../../components/QR';
import { Body, Button, Choice, Label, Page, Pager, Serif } from '../../components/Type';
import type { Car } from '../../data/cars';
import { arriveAtLot, setSale, useSale } from '../../sale';
import { theme } from '../../theme';

const SLOTS = ['Today 4–6', 'Tomorrow 10–12', 'Tomorrow 2–4', 'Sat 10–2', 'Mon 9–11'];

export function Pickup({ car, onDone }: { car: Car; onDone: () => void }) {
  const sale = useSale();
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (sale?.arrived && !sale.pickedUp) pulse.value = withRepeat(withSequence(withTiming(1.03, { duration: 500, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 500 })), -1);
    else pulse.value = withTiming(1, { duration: 200 });
  }, [sale?.arrived, sale?.pickedUp]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  if (!sale) return null;
  const green = !!sale.pickedUp;

  const where = (
    <Page>
      <Label>Where</Label>
      <Serif size={34}>{car.dealer.name}</Serif>
      <Body ink={theme.color.muted}>{car.dealer.street}</Body>
      <Pressable onPress={() => Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(car.dealer.street)}`)} style={s.pin} accessibilityRole="button" accessibilityLabel={`Directions to ${car.dealer.name}`}>
        <Svg width={40} height={52} viewBox="0 0 34 44"><Path d="M17 43 C17 43 3 25 3 15 A14 14 0 0 1 31 15 C31 25 17 43 17 43Z" fill={theme.color.accent} /><Circle cx={17} cy={15} r={5.5} fill={theme.color.cloud} /></Svg>
        <Label style={{ marginTop: 6 }}>Directions</Label>
      </Pressable>
      <Pressable onPress={() => Linking.openURL(`tel:${car.dealer.afterHours.replace(/\D/g, '')}`)} style={{ marginTop: theme.space.l, alignItems: 'center' }} accessibilityRole="button" accessibilityLabel={`After hours ${car.dealer.afterHours}`}>
        <Label>After hours</Label>
        <Body ink={theme.color.accent}>{car.dealer.afterHours}</Body>
      </Pressable>
    </Page>
  );

  const when = (
    <Page>
      <Label style={{ marginBottom: theme.space.s }}>When</Label>
      <View>
        {SLOTS.map(sl => <Choice key={sl} label={sl} selected={sale.slot === sl} onPress={() => setSale({ slot: sl })} />)}
      </View>
    </Page>
  );

  const pass = (
    <Page foot={green ? <Button label="Continue" onPress={onDone} /> : undefined}>
      <Label>{green ? 'Started' : sale.slot ?? 'Pick a time'}</Label>
      {sale.slot && (
        <Animated.View style={[{ marginTop: theme.space.m, alignItems: 'center' }, pulseStyle]}>
          <Pressable onLongPress={() => { if (!sale.arrived) arriveAtLot(); }} delayLongPress={600} accessibilityRole="button" accessibilityLabel={green ? 'Car started, sale complete' : 'Pass. At the lot, the dealer scans this.'}>
            <QR value={`obavia:${sale.lotId}:${car.vin}:${sale.wonAt}`} green={green} size={200} />
          </Pressable>
        </Animated.View>
      )}
      <Serif size={24} ink={green ? theme.color.good : theme.color.muted} style={{ marginTop: theme.space.m }}>{car.year} {car.make} {car.model}</Serif>
    </Page>
  );

  return <Pager pages={[where, when, pass]} initial={sale.slot ? 2 : 0} />;
}

const s = StyleSheet.create({
  pin: { marginTop: theme.space.l, alignItems: 'center' },
});
