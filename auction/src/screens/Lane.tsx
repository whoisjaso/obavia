/* The Lane. One car per screen. Swipe up: next car. Tap: next angle. Hold: the
   engine. Drag the price up: arms a bid and hands off to the Bid sheet. Long-
   press the ring: the time, spoken once. No reading: two bars are the copy. */
import React, { useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions, type ViewToken } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bars } from '../components/Bars';
import { LanePhoto } from '../components/LanePhoto';
import { Price } from '../components/Price';
import { Ring } from '../components/Ring';
import { cars, type Car } from '../data/cars';
import { inLastTwoMinutes, roll } from '../engine/auction';
import { outTheDoor } from '../engine/money';
import type { Lot } from '../engine/server';
import { feel } from '../feel';
import { theme } from '../theme';
import { BidSheet } from './BidSheet';
import { CarSheet } from './CarSheet';
import { Won } from './won/Won';
import { ME, useLots } from '../store';
import { openSale, useSale } from '../sale';

const STEP_PT = 28;   // one increment per 28 pt of drag

function remaining(lot: Lot, now: number) {
  const left = Math.max(0, lot.closesAt - now);
  if (inLastTwoMinutes(lot.closesAt, now)) return left / 120_000;
  return Math.min(1, left / Math.max(1, lot.closesAt - lot.opensAt));
}
function spoken(ms: number) {
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return `${h} h ${m} m`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function CarPage({ car, lot, now, width, height, active, onArm, onOpen, refillKey }: {
  car: Car; lot: Lot; now: number; width: number; height: number; active: boolean;
  onArm: (steps: number) => void; onOpen: () => void; refillKey: number;
}) {
  const insets = useSafeAreaInsets();
  const [angle, setAngle] = useState(0);
  const [lifted, setLifted] = useState(false);
  const [armed, setArmed] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const blue = inLastTwoMinutes(lot.closesAt, now);
  const closed = !!lot.closed || lot.closesAt <= now;
  const opened = lot.bids > 0;
  const preview = armed > 0 ? roll(lot.high, opened, armed - 1) : lot.high;
  const total = outTheDoor(preview, car.dealer.fees).total;
  const photoScale = useSharedValue(1);

  // Tap: next angle. Stories' tap-to-advance.
  const tap = Gesture.Tap().maxDuration(220).onEnd(() => {
    runOnJS(setAngle)((angle + 1) % car.photos.length);
    runOnJS(feel.select)();
  });
  // Hold: the engine (no recording seeded yet: the photo settles in, a soft pulse).
  const hold = Gesture.LongPress().minDuration(350).onStart(() => {
    photoScale.value = withSpring(1.03, theme.spring.lift);
    runOnJS(feel.touch)();
  }).onEnd(() => { photoScale.value = withSpring(1, theme.spring.lift); });
  const photoStyle = useAnimatedStyle(() => ({ transform: [{ scale: photoScale.value }] }));
  // Swipe left: the Car. Instagram's edge.
  const open = Gesture.Pan().activeOffsetX(-14).failOffsetY([-10, 10]).onEnd(e => { if (e.translationX < -40) runOnJS(onOpen)(); });

  // Drag the price up: arms a bid, one increment per 28 pt, a tick per step.
  const steps = useSharedValue(0);
  const drag = Gesture.Pan().activeOffsetY([-6, 6]).failOffsetX([-12, 12]).enabled(!closed)
    .onBegin(() => { runOnJS(setLifted)(true); runOnJS(feel.touch)(); })
    .onUpdate(e => {
      const n = Math.max(0, Math.floor(-e.translationY / STEP_PT) + (e.translationY < -4 ? 1 : 0));
      if (n !== steps.value) { steps.value = n; runOnJS(setArmed)(n); if (n > 0) runOnJS(feel.tick)(); }
    })
    .onFinalize(() => {
      const n = steps.value; steps.value = 0;
      runOnJS(setLifted)(false);
      runOnJS(setArmed)(0);
      if (n > 0) runOnJS(onArm)(n - 1);
    });

  // Long-press the ring: the time, spoken.
  const ringPress = Gesture.LongPress().minDuration(300).onStart(() => {
    const t = spoken(lot.closesAt - now);
    runOnJS(setToast)(t);
    runOnJS(AccessibilityInfo.announceForAccessibility)(`${t} left`);
  }).onEnd(() => { runOnJS(setToast)(null); });

  return (
    <View style={{ height, width: '100%', backgroundColor: theme.color.ink }}
      accessible accessibilityLabel={`${car.year} ${car.make} ${car.model}, ${preview.toLocaleString()} dollars, ${spoken(lot.closesAt - now)} left, retail ${lot.retail.toLocaleString()}`}>
      <GestureDetector gesture={Gesture.Race(open, Gesture.Exclusive(hold, tap))}>
        <Animated.View style={[StyleSheet.absoluteFill, photoStyle]}>
          <LanePhoto photo={car.photos[angle]} width={width} height={height} transition={active ? 180 : 0} />
        </Animated.View>
      </GestureDetector>
      <LinearGradient pointerEvents="none" colors={['rgba(8,14,30,0)', 'rgba(8,14,30,0.15)', theme.color.scrim]} locations={[0.3, 0.55, 0.82]} style={StyleSheet.absoluteFill} />

      {/* top: the ring and the watchers */}
      <View style={[s.top, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
        <GestureDetector gesture={ringPress}>
          <View style={s.ringWrap}>
            <Ring progress={remaining(lot, now)} blue={blue} refillKey={blue ? refillKey : undefined} grey={closed} />
            {toast && <View style={s.toast}><Text style={s.toastText}>{toast}</Text></View>}
          </View>
        </GestureDetector>
        <View style={s.eye} accessibilityLabel={`${lot.watching} watching`}>
          <View style={s.eyeDot} /><Text style={s.eyeText}>{lot.watching}</Text>
        </View>
      </View>

      {/* bottom: the two numbers, the bars, the dealer */}
      <View style={[s.bottom, { paddingBottom: insets.bottom + 22 }]} pointerEvents="box-none">
        <GestureDetector gesture={drag}>
          <Animated.View style={s.priceHit}>
            <Price hammer={preview} total={total} lifted={lifted} struck={closed} />
          </Animated.View>
        </GestureDetector>
        <Bars bid={lot.high} retail={lot.retail} />
        <View style={s.foot}>
          <Text style={s.dealer}>{car.dealer.name} · {car.dealer.city}</Text>
          <Pressable onPress={onOpen} style={s.pill} hitSlop={10} accessibilityRole="button" accessibilityLabel={`${car.photos.length} photos, open the car`}>
            <View style={s.pillGrid}>{[0, 1, 2, 3].map(i => <View key={i} style={s.pillCell} />)}</View>
            <Text style={s.pillText}>{car.photos.length}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function Lane() {
  const { width, height } = useWindowDimensions();
  const { lots, now } = useLots();
  const sale = useSale();
  const [index, setIndex] = useState(0);
  const [sheet, setSheet] = useState<{ car: Car; steps: number; key: number } | null>(null);
  const [open, setOpen] = useState<Car | null>(null);
  const [won, setWon] = useState<Car | null>(null);
  // the hammer: a lot closes with me leading
  const closedSeen = useRef<Record<string, boolean>>({});
  for (const l of Object.values(lots)) {
    if (l.closed && !closedSeen.current[l.id]) {
      closedSeen.current[l.id] = true;
      const car = cars.find(c => c.id === l.id);
      if (car && l.leader === ME && l.closed.sold) {
        openSale({ lotId: l.id, hammer: l.high, total: outTheDoor(l.high, car.dealer.fees).total });
        setSheet(null); setWon(car);
      }
    }
  }
  const refills = useRef<Record<string, number>>({});
  const bidsSeen = useRef<Record<string, number>>({});
  // every bid in the last two minutes is a refill: medium impact, the same every time
  for (const l of Object.values(lots)) {
    const seen = bidsSeen.current[l.id];
    if (seen !== undefined && l.bids > seen && inLastTwoMinutes(l.closesAt, now)) {
      refills.current[l.id] = (refills.current[l.id] ?? 0) + 1;
      if (cars[index]?.id === l.id) feel.refill();
    }
    bidsSeen.current[l.id] = l.bids;
  }

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const i = viewableItems[0]?.index; if (typeof i === 'number') setIndex(i);
  }).current;
  const cfg = useMemo(() => ({ itemVisiblePercentThreshold: 60 }), []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.ink }}>
      <FlatList
        data={cars}
        keyExtractor={c => c.id}
        renderItem={({ item, index: i }) => (
          <CarPage car={item} lot={lots[item.id]} now={now} width={width} height={height} active={i === index}
            refillKey={refills.current[item.id] ?? 0}
            onOpen={() => { feel.select(); setOpen(item); }}
            onArm={steps => setSheet({ car: item, steps, key: Date.now() })} />
        )}
        pagingEnabled
        snapToInterval={height}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={() => feel.snap()}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={cfg}
        getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
        scrollEnabled={!sheet && !open}
      />
      {sheet && <BidSheet key={sheet.key} car={sheet.car} lot={lots[sheet.car.id]} now={now} steps={sheet.steps} onClose={() => setSheet(null)} />}
      {open && <CarSheet car={open} onClose={() => setOpen(null)} />}
      {won && sale && <Won car={won} onDone={() => setWon(null)} />}
    </View>
  );
}

const s = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ringWrap: { padding: 6, marginLeft: -6, borderRadius: 28, backgroundColor: 'rgba(8,14,30,0.28)' },
  toast: { position: 'absolute', left: 60, top: 14, backgroundColor: 'rgba(8,14,30,0.7)', paddingHorizontal: 10, height: 28, borderRadius: 14, justifyContent: 'center' },
  toastText: { color: theme.color.cloud, fontFamily: theme.font.sansBold, fontSize: 13, fontVariant: ['tabular-nums'] },
  eye: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 28, marginTop: 14, borderRadius: 14, backgroundColor: 'rgba(8,14,30,0.28)' },
  eyeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.color.cloud, opacity: 0.8 },
  eyeText: { color: theme.color.cloud, opacity: 0.8, fontFamily: theme.font.sans, fontSize: 12, fontVariant: ['tabular-nums'] },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 22 },
  priceHit: { alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 40 },
  foot: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dealer: { color: theme.color.cloud, opacity: 0.7, fontFamily: theme.font.sans, fontSize: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: 'rgba(8,14,30,0.28)' },
  pillGrid: { width: 12, height: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  pillCell: { width: 5, height: 5, borderRadius: 1, backgroundColor: theme.color.cloud, opacity: 0.85 },
  pillText: { color: theme.color.cloud, opacity: 0.85, fontFamily: theme.font.sans, fontSize: 12, fontVariant: ['tabular-nums'] },
});
