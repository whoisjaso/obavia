/* Pickup. Three pages: where; when; the pass. When is the dealer's own hours
   from the lot (car.hours, set on the Desk), each a choice, with the
   after-hours line under them to call; a lot with no hours shows one line,
   "Call to set a time", and the number, and the pass is ready without a slot. At the lot the dealer scans the
   VIN, the car starts, the pass turns green: that is when the sale completes.
   Locally, hold the pass to stand in for the dealer's scan; on the server the
   scan sets the lot's sale.startedAt and the pass turns green from that.
   While the pass is on the glass the screen goes to full brightness, as a
   Wallet pass does for its barcode; leaving the page, the app or Pickup puts
   it back where the buyer had it. Under the QR, touching it, the VIN's last six in Bodoni: a Desk with no
   scanner types what the buyer shows (Type The Pass). One source for both, ../../pass. */
import React, { useEffect, useRef, useState } from 'react';
import * as Brightness from 'expo-brightness';
import { AppState, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { BREATH, EASE_OUT, ms } from '../../motion';
import Svg, { Circle, Path } from 'react-native-svg';
import { QR } from '../../components/QR';
import { Object3D } from '../../components/Object3D';
import { PressCloud } from '../../components/Cloud';
import { Body, Button, Caps, Choice, Label, Page, Pager, Serif } from '../../components/Type';
import type { Car } from '../../data/cars';
import { passSix, passValue } from '../../pass';
import { arriveAtLot, pickupWhen, setSale, useSale } from '../../sale';
import { AUCTION_URL } from '../../store';
import { theme } from '../../theme';

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
  const [page, setPage] = useState(sale?.slot ? 2 : 0);
  const times = pickupWhen(car);
  const ready = !!sale?.slot || times.kind === 'call';   // the pass shows once a time is picked, or at once when the time is set by phone
  useFullBrightness(page === 2 && ready);
  const greenStyle = useAnimatedStyle(() => ({ opacity: green.value }));
  if (!sale) return null;
  const started = !!sale.pickedUp;
  const call = (n: string) => Linking.openURL(`tel:${n.replace(/\D/g, '')}`);
  const code = passValue(sale.lotId, car.vin, sale.wonAt), six = passSix(car.vin);

  const where = (
    <Page>
      <Label>Where</Label>
      <Serif size={34}>{car.dealer.name}</Serif>
      <Body ink={theme.color.muted}>{car.dealer.street}</Body>
      <Pressable onPress={() => Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(car.dealer.street)}`)} style={s.pin} accessibilityRole="button" accessibilityLabel={`Directions to ${car.dealer.name}`}>
        <Svg width={40} height={52} viewBox="0 0 34 44"><Path d="M17 43 C17 43 3 25 3 15 A14 14 0 0 1 31 15 C31 25 17 43 17 43Z" fill={theme.color.accent} /><Circle cx={17} cy={15} r={5.5} fill={theme.color.cloud} /></Svg>
        <Label style={{ marginTop: 6 }}>Directions</Label>
      </Pressable>
    </Page>
  );

  const when = times.kind === 'slots' ? (
    <Page>
      <Label style={{ marginBottom: theme.space.s }}>When</Label>
      <View style={{ alignSelf: 'stretch' }}>
        {times.slots.map(sl => <Choice key={sl} label={sl} selected={sale.slot === sl} onPress={() => setSale({ slot: sl })} />)}
      </View>
      {/* the after-hours line sits under the hours it is the fallback for */}
      {!!times.call && (
        <Pressable onPress={() => call(times.call)} style={s.call} accessibilityRole="button" accessibilityLabel={`After hours, call ${times.call}`}>
          <Label>After hours</Label>
          <Body ink={theme.color.accent}>{times.call}</Body>
        </Pressable>
      )}
    </Page>
  ) : (
    <Page>
      {times.call ? (
        <Pressable onPress={() => call(times.call)} style={{ alignItems: 'center' }} accessibilityRole="button" accessibilityLabel={`Call to set a time, ${times.call}`}>
          <Label>Call to set a time</Label>
          <Body ink={theme.color.accent} style={{ marginTop: theme.space.xs }}>{times.call}</Body>
        </Pressable>
      ) : <Label>Call to set a time</Label>}
    </Page>
  );

  const pass = (
    <Page foot={started ? <Button label="Done" onPress={onDone} /> : undefined}>
      {(started || times.kind === 'slots') && <Label>{started ? 'Started' : sale.slot ?? 'Pick a time'}</Label>}
      {ready && (
        <Animated.View style={[{ marginTop: theme.space.m, alignItems: 'center' }, pulseStyle]}>
          {/* the pass is a cloud: it sinks under the thumb, and breathes once when the dealer's scan
              completes the sale (feel.done, from sale.ts or the server), whoever pressed */}
          <PressCloud holdMs={600} swell="any" sound={!started} onPress={AUCTION_URL || started ? undefined : () => { if (!sale.arrived) arriveAtLot(); }} accessibilityLabel={started ? 'Car started, sale complete' : `Pass, ${six.split('').join(' ')}. At the lot, the dealer scans this.`}>
            <View style={{ alignItems: 'center' }}>
              <View>
                <QR value={code} size={200} />
                {started && (
                  <Animated.View style={[StyleSheet.absoluteFill, greenStyle]} pointerEvents="none">
                    <QR value={code} green size={200} />
                  </Animated.View>
                )}
              </View>
              {/* the six, touching the QR: one piece, no caption. The key touches the six (lego §4.1): the code
                  is what hands the buyer the keys. A spacer the key's width on the other side keeps the six
                  centred under the QR. The pass tile object does not go behind the QR: a second code under the
                  real one fights it (judged on the capture), so the real QR stands alone. */}
              <View style={s.sixRow}>
                <Object3D name="key" height={KEY} delay={120} style={s.key} />
                <Serif size={theme.size.price * 0.625} style={s.six}>{six}</Serif>
                <View style={{ width: KEY * 0.5 }} />
              </View>
            </View>
          </PressCloud>
        </Animated.View>
      )}
      <Caps size={17} ink={started ? theme.color.good : theme.color.muted} style={{ marginTop: theme.space.m }}>{car.year} {car.make} {car.model}</Caps>
    </Page>
  );

  return <Pager pages={[where, when, pass]} initial={sale.slot ? 2 : 0} onIndex={setPage} />;
}

/* Full brightness while `on`, the buyer's own level back the moment it is not (the page changes, Pickup
   closes, the app goes to the background). iOS keeps a brightness an app set after the app leaves, so the
   restore is not optional. Phones only; a refusal leaves the screen as it was. */
function useFullBrightness(on: boolean) {
  const saved = useRef<number | null>(null);
  useEffect(() => {
    if (Platform.OS === 'web' || !on) return;
    let live = true;
    const up = async () => {
      try {
        if (saved.current === null) saved.current = await Brightness.getBrightnessAsync();
        if (live) await Brightness.setBrightnessAsync(1);
      } catch { /* not allowed: the pass shows at the buyer's level */ }
    };
    const down = () => {
      const v = saved.current; saved.current = null;
      if (v !== null) Brightness.setBrightnessAsync(v).catch(() => {});
    };
    void up();
    const sub = AppState.addEventListener('change', st => { if (st === 'active') void up(); else down(); });
    return () => { live = false; sub.remove(); down(); };
  }, [on]);
}

const KEY = 56;   // the key's canvas height in pt; the fob fills its middle half

const s = StyleSheet.create({
  sixRow: { flexDirection: 'row', alignItems: 'center' },
  key: { width: KEY * 0.5, marginRight: 4, overflow: 'visible', alignItems: 'center', justifyContent: 'center' },
  pin: { marginTop: theme.space.l, alignItems: 'center' },
  call: { marginTop: theme.space.l, alignItems: 'center' },
  six: { letterSpacing: theme.size.price * 0.075, marginRight: -theme.size.price * 0.075 },   // spaced; the last letter's tracking taken back so the six centre under the QR
});
