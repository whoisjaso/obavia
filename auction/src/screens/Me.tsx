/* Me, and Watching. Two pages. Me: the name, the standing deposit, the cars
   won as passes, "Sell it back here", sign out. Watching: a column of rings
   with the price under each; tap to go to the car; swipe left to unwatch.
   Returning after a day, the first ring spins in with the heartbeat before
   anything else loads. The neutral screen: nothing fires here but that. */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeInDown, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Ring } from '../components/Ring';
import { Sheet } from '../components/Sheet';
import { Body, Button, Hairline, Label, Page, Pager, Serif } from '../components/Type';
import { cars } from '../data/cars';
import { inLastTwoMinutes } from '../engine/auction';
import { dollars } from '../engine/money';
import type { Lot } from '../engine/server';
import { feel } from '../feel';
import { useSale } from '../sale';
import { DEPOSIT, ME, me, once, toggleWatch, useWatched } from '../store';
import { theme } from '../theme';

function remaining(lot: Lot, now: number) {
  const left = Math.max(0, lot.closesAt - now);
  if (inLastTwoMinutes(lot.closesAt, now)) return left / 120_000;
  return Math.min(1, left / Math.max(1, lot.closesAt - lot.opensAt));
}

/** One watched car: a ring, the price, the name; swipe left to let it go. */
function Watch({ id, lot, now, first, onOpen }: { id: string; lot: Lot; now: number; first: boolean; onOpen: () => void }) {
  const car = cars.find(c => c.id === id)!;
  const x = useSharedValue(0);
  const spin = useSharedValue(first ? 0.2 : 1);
  useEffect(() => { if (first) { spin.value = withSpring(1, { damping: 14, stiffness: 120 }); feel.heartbeat(); } }, []);
  const pan = Gesture.Pan().activeOffsetX([-12, 12]).failOffsetY([-10, 10])
    .onUpdate(e => { x.value = Math.min(0, e.translationX); })
    .onEnd(e => {
      if (e.translationX < -110) { x.value = withTiming(-400, { duration: 180 }, f => { if (f) runOnJS(toggleWatch)(id); }); }
      else x.value = withSpring(0, theme.spring.lift);
    });
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: spin.value }, { rotate: `${(1 - spin.value) * 180}deg` }], opacity: spin.value }));
  const mine = lot.leader === ME && !lot.closed;
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[s.watch, style]}>
        <Pressable onPress={() => { feel.select(); onOpen(); }} style={s.watchHit} accessibilityRole="button" accessibilityLabel={`${car.year} ${car.make} ${car.model}, ${dollars(lot.high)} dollars${mine ? ', you lead' : ''}`} accessibilityHint="Swipe left to stop watching">
          <Animated.View style={ringStyle}>
            <Ring size={64} stroke={4} progress={remaining(lot, now)} blue={inLastTwoMinutes(lot.closesAt, now)} grey={!!lot.closed || lot.closesAt <= now} />
          </Animated.View>
          <View style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Serif size={28}>${dollars(lot.high)}</Serif>
              {mine && <View style={s.lead} />}
            </View>
            <Label>{car.year} {car.make} {car.model}</Label>
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

export function Me({ lots, now, onClose, onOpenCar }: { lots: Record<string, Lot>; now: number; onClose: () => void; onOpenCar: (id: string) => void }) {
  const watched = useWatched();
  const sale = useSale();
  const back = useRef(Date.now() - me.lastOpened > 24 * 3_600_000).current;
  useEffect(() => { me.lastOpened = Date.now(); }, []);
  const won = sale ? [sale] : [];

  const mePage = (
    <Page foot={<Button label="Sign out" onPress={() => { feel.silence(); onClose(); }} ghost />}>
      <Label>Me</Label>
      <Serif size={36} italic>{me.name}</Serif>
      <Hairline style={{ marginVertical: theme.space.l }} />
      <Label>Deposit</Label>
      <Serif size={34}>${DEPOSIT}</Serif>
      <Body ink={theme.color.faint} style={{ fontSize: 13, marginTop: 2 }}>{once.deposit ? 'held · back if you lose' : 'held at your first bid'}</Body>
      <Hairline style={{ marginVertical: theme.space.l }} />
      <Label>Cars</Label>
      {won.length === 0 ? (
        <Body ink={theme.color.faint} style={{ marginTop: 4 }}>none yet</Body>
      ) : won.map(w => {
        const car = cars.find(c => c.id === w.lotId)!;
        return (
          <View key={w.lotId} style={s.pass} accessible accessibilityLabel={`${car.year} ${car.make} ${car.model}, ${dollars(w.hammer)} dollars`}>
            <View style={s.passThumb}><Image source={car.photos[0].src} style={StyleSheet.absoluteFill} contentFit="cover" /></View>
            <View>
              <Serif size={24}>${dollars(w.hammer)}</Serif>
              <Label style={{ textAlign: 'left' }}>{car.year} {car.make} {car.model}</Label>
            </View>
          </View>
        );
      })}
      <Pressable onPress={() => feel.select()} style={{ marginTop: theme.space.l, alignItems: 'center' }} accessibilityRole="button">
        <Label>When it is time</Label>
        <Serif size={26} italic>Sell it back here</Serif>
      </Pressable>
    </Page>
  );

  const watching = (
    <View style={{ flex: 1, paddingTop: theme.space.xl }}>
      <Label style={{ marginBottom: theme.space.m }}>Watching</Label>
      {watched.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.space.s }}>
          <Ring size={64} stroke={4} progress={0} blue={false} grey />
          <Body ink={theme.color.faint}>double-tap a car to watch it</Body>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ gap: theme.space.m, paddingBottom: theme.space.xl }} showsVerticalScrollIndicator={false}>
          {watched.map((id, i) => lots[id] && <Watch key={id} id={id} lot={lots[id]} now={now} first={back && i === 0} onOpen={() => onOpenCar(id)} />)}
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
