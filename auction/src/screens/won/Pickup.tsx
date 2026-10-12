/* Pickup. Three pages: where; when; the pass. At the lot the dealer scans the
   VIN, the car starts, the pass turns green: that is when the sale completes.
   Locally, hold the pass to stand in for the dealer's scan; on the server the
   scan sets the lot's sale.startedAt and the pass turns green from that. */
import React, { useEffect } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { BREATH, EASE_OUT, ms } from '../../motion';
import Svg, { Circle, Path } from 'react-native-svg';
import { QR } from '../../components/QR';
import { PressCloud } from '../../components/Cloud';
import { Body, Button, Caps, Choice, Label, Page, Pager, Serif } from '../../components/Type';
import type { Car } from '../../data/cars';
import { arriveAtLot, setSale, useSale } from '../../sale';
import { AUCTION_URL } from '../../store';
import { theme } from '../../theme';

const SLOTS = ['Today 4-6', 'Tomorrow 10-12', 'Tomorrow 2-4', 'Sat 10-2', 'Mon 9-11'];   // hyphens: no en dash on the glass

export function Pickup({ car, onDone }: { car: Car; onDone: () => void }) {
  const sale = useSale();
  const reduce = useReducedMotion();
  const pulse = useSharedValue(1), green = useSharedValue(sale?.pickedUp ? 1 : 0);
  // waiting for the dealer's scan: the pass breathes (sine, both legs, 1 s a breath). Decoration, so
  // reduced motion keeps it still. The scan: the breath stops where it is and settles, and the green pass
  // crossfades over the ink one in 240 ms, on the same frame as the chime (sale.ts fires feel.done).
  useEffect(() => {
    if (sale?.arrived && !sale.pickedUp && !reduce) pulse.value = withRepeat(withSequence(withTiming(1.03, { duration: 500, easing: BREATH }), withTiming(1, { duration: 500, easing: BREATH })), -1);
    else pulse.value = withTiming(1, { duration: ms.green, easing: EASE_OUT });
    if (sale?.pickedUp) green.value = withTiming(1, { duration: ms.green, easing: EASE_OUT });
  }, [sale?.arrived, sale?.pickedUp]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const greenStyle = useAnimatedStyle(() => ({ opacity: green.value }));
  if (!sale) return null;
  const started = !!sale.pickedUp;
  const slots = car.hours?.length ? car.hours : SLOTS;

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
        {slots.map(sl => <Choice key={sl} label={sl} selected={sale.slot === sl} onPress={() => setSale({ slot: sl })} />)}
      </View>
    </Page>
  );

  const pass = (
    <Page foot={started ? <Button label="Continue" onPress={onDone} /> : undefined}>
      <Label>{started ? 'Started' : sale.slot ?? 'Pick a time'}</Label>
      {sale.slot && (
        <Animated.View style={[{ marginTop: theme.space.m, alignItems: 'center' }, pulseStyle]}>
          {/* the pass is a cloud: it sinks under the thumb, and breathes once when the dealer's scan
              completes the sale (feel.done, from sale.ts or the server), whoever pressed */}
          <PressCloud holdMs={600} swell="any" sound={!started} onPress={AUCTION_URL || started ? undefined : () => { if (!sale.arrived) arriveAtLot(); }} accessibilityLabel={started ? 'Car started, sale complete' : 'Pass. At the lot, the dealer scans this.'}>
            <View>
              <QR value={`obavia:${sale.lotId}:${car.vin}:${sale.wonAt}`} size={200} />
              {started && (
                <Animated.View style={[StyleSheet.absoluteFill, greenStyle]} pointerEvents="none">
                  <QR value={`obavia:${sale.lotId}:${car.vin}:${sale.wonAt}`} green size={200} />
                </Animated.View>
              )}
            </View>
          </PressCloud>
        </Animated.View>
      )}
      <Caps size={14} ink={started ? theme.color.good : theme.color.muted} style={{ marginTop: theme.space.m }}>{car.year} {car.make} {car.model}</Caps>
    </Page>
  );

  return <Pager pages={[where, when, pass]} initial={sale.slot ? 2 : 0} />;
}

const s = StyleSheet.create({
  pin: { marginTop: theme.space.l, alignItems: 'center' },
});
