/* Me, and Watching. Two pages. Me: the name, the standing deposit, the cars
   won as passes, "Sell it back here", sign out. Watching: a column of rings
   with the price under each; tap to go to the car; swipe left to unwatch.
   Returning after a day, the first ring spins in with the heartbeat before
   anything else loads. The neutral screen: nothing fires here but that.
   Under the deposit, the wins left this year (D15), a number that darkens as
   it runs out. A phone whose sign-in was refused says so in one quiet line.
   Under the name, faint, the number the buyer proved with a code: last four only. */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { LinearTransition, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { EASE_OUT, spring } from '../motion';
import { Ring } from '../components/Ring';
import { Sheet } from '../components/Sheet';
import { Body, Button, Caps, Hairline, Label, Page, Pager, Serif } from '../components/Type';
import type { Car } from '../data/cars';
import { inLastTwoMinutes } from '../engine/auction';
import { dollars } from '../engine/money';
import type { Lot } from '../engine/server';
import { feel } from '../feel';
import { releaseDeposit } from '../deposit';
import { useSale } from '../sale';
import { AUCTION_URL, DEPOSIT, ME, WINS_PER_YEAR, localCommitted, me, once, refreshMe, toggleWatch, useBuyer, useCars, useWatched } from '../store';
import { theme } from '../theme';

/** The wins-left number's ink: faint at four, ink at one (and none); between, the steps of the theme's greys. */
const winsInk = (n: number) => (n >= 4 ? theme.color.faint : n === 3 ? theme.color.muted : n === 2 ? theme.color.inkSoft : theme.color.ink);

function remaining(lot: Lot, now: number) {
  const left = Math.max(0, lot.closesAt - now);
  if (inLastTwoMinutes(lot.closesAt, now)) return left / 120_000;
  return Math.min(1, left / Math.max(1, lot.closesAt - lot.opensAt));
}

/** One watched car: a ring, the price, the name; swipe left to let it go. */
function Watch({ car, id, lot, now, first, onOpen }: { car: Car; id: string; lot: Lot; now: number; first: boolean; onOpen: () => void }) {
  const { width } = useWindowDimensions();
  const reduce = useReducedMotion();
  const x = useSharedValue(0), from = useSharedValue(0);
  // the welcome back: the first ring turns in a quarter and settles on the first thump of the heartbeat.
  // Rare (once after a day away), so it may spin; it starts at 0.85, never from nothing.
  const spin = useSharedValue(first ? 0 : 1);
  useEffect(() => { if (first) { spin.value = reduce ? withTiming(1, { duration: 200, easing: EASE_OUT }) : withSpring(1, spring.snap); feel.heartbeat(); } }, []);
  const unwatch = () => toggleWatch(id);
  // a swipe that ends on the row is not a tap: a press that arrives while the row is off its rest is ignored
  // swipe left to let it go: grabbed mid-return it takes over from where it is; right is rubber-banded;
  // a flick or a third of the width commits, and the row leaves at the finger's speed. Silent: neutral.
  const pan = Gesture.Pan().activeOffsetX([-12, 12]).failOffsetY([-10, 10])
    .onBegin(() => { from.value = x.value; })
    .onUpdate(e => { const n = from.value + e.translationX; x.value = n > 0 ? n * 0.15 : n; })
    .onEnd(e => {
      if (x.value < -width / 3 || e.velocityX < -600) x.value = withSpring(-width, { ...spring.sheet, velocity: e.velocityX }, f => { if (f) scheduleOnRN(unwatch); });
      else x.value = withSpring(0, { ...spring.snap, velocity: e.velocityX });
    });
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], opacity: interpolate(x.value, [-width, -width / 3, 0], [0, 0.6, 1], 'clamp') }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: spin.value,
    transform: reduce ? [] : [{ scale: 0.85 + 0.15 * spin.value }, { rotate: `${(1 - spin.value) * -90}deg` }],
  }));
  const mine = lot.leader === ME && !lot.closed;
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[s.watch, style]} layout={LinearTransition.duration(200).easing(EASE_OUT)}>
        <Pressable onPress={() => { if (Math.abs(x.value) > 4) return; feel.select(); onOpen(); }} style={s.watchHit} accessibilityRole="button" accessibilityLabel={`${car.year} ${car.make} ${car.model}, ${dollars(lot.high)} dollars${mine ? ', you lead' : ''}`} accessibilityHint="Swipe left to stop watching">
          <Animated.View style={ringStyle}>
            <Ring size={64} stroke={4} progress={remaining(lot, now)} blue={inLastTwoMinutes(lot.closesAt, now)} grey={!!lot.closed || lot.closesAt <= now} />
          </Animated.View>
          <View style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Serif size={28}>${dollars(lot.high)}</Serif>
              {mine && <View style={s.lead} />}
            </View>
            <Label style={{ paddingHorizontal: theme.space.m }}>{car.year} {car.make} {car.model}</Label>
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

export function Me({ lots, now, onClose, onOpenCar }: { lots: Record<string, Lot>; now: number; onClose: () => void; onOpenCar: (id: string) => void }) {
  const watched = useWatched();
  const sale = useSale();
  const cars = useCars(lots);
  const back = useRef(Date.now() - me.lastOpened > 24 * 3_600_000).current;
  useEffect(() => { me.lastOpened = Date.now(); void refreshMe(); }, []);
  const buyer = useBuyer();
  const winsLeft = AUCTION_URL ? buyer.winsLeft : Math.max(0, WINS_PER_YEAR - localCommitted(Object.values(lots)));
  const won = sale ? [sale] : [];
  // the deposit comes back only when the buyer leads nothing and owes nothing
  const [released, setReleased] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const busy = useRef(false);
  const all = Object.values(lots);
  const leads = all.some(l => !l.closed && l.leader === ME);
  const owes = (!!sale && !sale.pickedUp) || all.some(l => l.sale?.buyer === ME && !l.sale.voidedAt && !l.sale.forfeitedAt && !l.sale.startedAt);
  const canRelease = once.deposit && !leads && !owes;
  const release = async () => {
    if (busy.current) return;
    busy.current = true; setRefused(null);
    const r = await releaseDeposit();
    busy.current = false;
    if (r.ok) { setReleased(true); feel.done(); } else setRefused(r.reason);
  };

  const mePage = (
    <Page foot={<Button label="Sign out" onPress={() => { feel.silence(); onClose(); }} ghost />}>
      <Label>Me</Label>
      <View style={{ alignItems: 'center' }}>
        <Serif size={36} style={{ paddingHorizontal: theme.space.s }}>{me.name}</Serif>
        {/* the proved number, last four only, faint and touching the name it belongs to */}
        {buyer.phone ? <Body ink={theme.color.faint} style={{ fontVariant: ['tabular-nums'] }}>{buyer.phone}</Body> : null}
      </View>
      {buyer.lost && <Body ink={theme.color.faint} style={{ marginTop: 4 }}>This phone lost its sign-in. Write to us.</Body>}
      <Hairline style={{ marginVertical: theme.space.l }} />
      <Label>Deposit</Label>
      <Serif size={34}>${DEPOSIT}</Serif>
      <Body ink={theme.color.faint} style={{ marginTop: 2 }}>{released && !once.deposit ? 'back to your card' : once.deposit ? 'held · back if you lose' : 'held at your first bid'}</Body>
      {winsLeft !== undefined && (
        <Body ink={winsInk(winsLeft)} style={{ marginTop: 2, fontVariant: ['tabular-nums'] }}>{`Wins left this year: ${winsLeft}`}</Body>
      )}
      {canRelease && (
        <Pressable onPress={release} style={{ marginTop: theme.space.m, alignItems: 'center' }} accessibilityRole="button" accessibilityLabel={`Get the ${DEPOSIT} dollar deposit back`}>
          <Caps>Get it back</Caps>
        </Pressable>
      )}
      {refused && <Body ink={theme.color.warn} style={{ marginTop: 4 }}>{refused}</Body>}
      <Hairline style={{ marginVertical: theme.space.l }} />
      <Label>Cars</Label>
      {won.length === 0 ? (
        <Body ink={theme.color.faint} style={{ marginTop: 4 }}>none yet</Body>
      ) : won.map(w => {
        const car = cars.find(c => c.id === w.lotId);
        if (!car) return null;
        return (
          <View key={w.lotId} style={s.pass} accessible accessibilityLabel={`${car.year} ${car.make} ${car.model}, ${dollars(w.hammer)} dollars`}>
            <View style={s.passThumb}>{car.photos[0] && <Image source={car.photos[0].src} style={StyleSheet.absoluteFill} contentFit="cover" />}</View>
            <View style={{ flexShrink: 1 }}>
              <Serif size={24}>${dollars(w.hammer)}</Serif>
              <Label style={{ textAlign: 'left' }}>{car.year} {car.make} {car.model}</Label>
            </View>
          </View>
        );
      })}
      {won.length > 0 && (   // not relevant until there is a car to sell back
        <Pressable onPress={() => feel.select()} style={{ marginTop: theme.space.l, alignItems: 'center' }} accessibilityRole="button">
          <Label>When it is time</Label>
          <Caps>Sell it back here</Caps>
        </Pressable>
      )}
    </Page>
  );

  const watching = (
    <View style={{ flex: 1, paddingTop: theme.space.xl }}>
      <Label style={{ marginBottom: theme.space.m }}>Watching</Label>
      {watched.length === 0 ? (   // the empty ring alone: the double tap's bloom on the Lane teaches the gesture
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.space.s }}>
          <Ring size={64} stroke={4} progress={0} blue={false} grey />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ gap: theme.space.m, paddingBottom: theme.space.xl }} showsVerticalScrollIndicator={false}>
          {watched.map((id, i) => { const car = cars.find(c => c.id === id); return lots[id] && car && <Watch key={id} car={car} id={id} lot={lots[id]} now={now} first={back && i === 0} onOpen={() => onOpenCar(id)} />; })}
        </ScrollView>
      )}
    </View>
  );

  return (
    <Sheet detents={[1]} initial={0} onClose={onClose}>
      <Pager pages={[mePage, watching]} initial={watched.length ? 1 : 0} />
    </Sheet>
  );
}

const s = StyleSheet.create({
  watch: { alignSelf: 'stretch' },
  watchHit: { alignItems: 'center', gap: 10, paddingVertical: theme.space.xs },
  lead: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.color.ink, opacity: 0.9 },
  pass: { flexDirection: 'row', alignItems: 'center', gap: theme.space.s, marginTop: theme.space.s },
  passThumb: { width: 56, height: 70, borderRadius: 10, overflow: 'hidden', backgroundColor: theme.color.well },
});
