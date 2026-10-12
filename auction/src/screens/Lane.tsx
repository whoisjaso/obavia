/* The Lane. One car per screen. Swipe up: next car. Tap: next angle. Hold: the
   engine. Drag the price up: arms a bid and hands off to the Bid sheet. Long-
   press the ring: the time, spoken once. No reading: two bars are the copy. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions, type ViewToken } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { spring } from '../motion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bars } from '../components/Bars';
import { LanePhoto } from '../components/LanePhoto';
import { Price } from '../components/Price';
import { Ring } from '../components/Ring';
import { carFromLot, type Car } from '../data/cars';
import { inLastTwoMinutes, roll } from '../engine/auction';
import { outTheDoor } from '../engine/money';
import type { Lot } from '../engine/server';
import { feel } from '../feel';
import { theme } from '../theme';
import { BidSheet } from './BidSheet';
import { CarSheet } from './CarSheet';
import { Won } from './won/Won';
import { AUCTION_URL, ME, isWatched, toggleWatch, useCars, useLots, useWatched } from '../store';
import { Me } from './Me';
import { Label } from '../components/Type';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { clearSale, openSale, peekSale, setSale, useSale } from '../sale';
import { clearIntent, useIntent } from '../nav';

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

function CarPage({ car, lot, now, width, height, active, onArm, onOpen, onMe, refillKey }: {
  car: Car; lot: Lot; now: number; width: number; height: number; active: boolean;
  onArm: (steps: number) => void; onOpen: () => void; onMe: () => void; refillKey: number;
}) {
  const watched = useWatched();
  const watching = watched.includes(car.id);
  const insets = useSafeAreaInsets();
  const [angle, setAngle] = useState(0);
  const [armed, setArmed] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const blue = inLastTwoMinutes(lot.closesAt, now);
  const closed = !!lot.closed || lot.closesAt <= now;
  const opened = lot.bids > 0;
  const preview = armed > 0 ? roll(lot.high, opened, armed - 1) : lot.high;
  const total = outTheDoor(preview, car.dealer.fees).total;
  const photoScale = useSharedValue(1);
  const reduce = useReducedMotion();
  const photos = car.photos.length;
  const photo = photos ? car.photos[angle % photos] : undefined;

  // Tap: next angle. Stories' tap-to-advance. Double-tap: watch, Instagram's heart without the heart.
  const nextAngle = () => { if (photos > 1) { setAngle(a => (a + 1) % photos); feel.select(); } };
  const tap = Gesture.Tap().maxDuration(220).onEnd(() => { scheduleOnRN(nextAngle); });
  // a watch is a selection, not a win: the chime is kept for the high-bidder moment and the hammer
  const watch = () => { const on = toggleWatch(car.id); if (on) feel.select(); };
  const doubleTap = Gesture.Tap().numberOfTaps(2).maxDuration(260).onEnd(() => { scheduleOnRN(watch); });
  // Hold: the engine (no recording seeded yet: the photo settles in, a soft pulse). Reduced motion: the pulse only.
  const hold = Gesture.LongPress().minDuration(350).onStart(() => {
    if (!reduce) photoScale.value = withSpring(1.03, spring.settle);
    scheduleOnRN(feel.touch);
  }).onFinalize(() => { photoScale.value = withSpring(1, spring.settle); });
  const photoStyle = useAnimatedStyle(() => ({ transform: [{ scale: photoScale.value }] }));
  // Swipe left: the Car. Instagram's edge. A flick counts as much as a distance.
  const open = Gesture.Pan().activeOffsetX(-14).failOffsetY([-10, 10]).onEnd(e => { if (e.translationX < -40 || e.velocityX < -500) scheduleOnRN(onOpen); });

  // Drag the price up: arms a bid, one increment per 28 pt, a tick per step. The price lifts 2 pt on
  // touch-down and follows the thumb up to 12 pt more (rubber-banded), all on the UI thread; React
  // only hears about whole steps, never frames.
  const steps = useSharedValue(0);
  const lift = useSharedValue(0);
  const drag = Gesture.Pan().activeOffsetY([-6, 6]).failOffsetX([-12, 12]).enabled(!closed)
    .onBegin(() => { lift.value = withSpring(-2, spring.settle); scheduleOnRN(feel.touch); })
    .onUpdate(e => {
      lift.value = -2 - (reduce ? 0 : 12 * (1 - Math.exp(Math.min(0, e.translationY) / 120)));
      const n = Math.max(0, Math.floor(-e.translationY / STEP_PT) + (e.translationY < -4 ? 1 : 0));
      if (n !== steps.value) { steps.value = n; scheduleOnRN(setArmed, n); if (n > 0) scheduleOnRN(feel.tick); }
    })
    .onFinalize(e => {
      const n = steps.value; steps.value = 0;
      lift.value = withSpring(0, { ...spring.snap, velocity: e.velocityY });
      scheduleOnRN(setArmed, 0);
      if (n > 0) scheduleOnRN(onArm, n - 1);
    });

  // Long-press the ring: the time, spoken.
  const say = () => { const t = spoken(lot.closesAt - now); setToast(t); AccessibilityInfo.announceForAccessibility(`${t} left`); };
  const hush = () => setToast(null);
  const ringPress = Gesture.LongPress().minDuration(300).onStart(() => { scheduleOnRN(say); }).onFinalize(() => { scheduleOnRN(hush); });

  return (
    <View style={{ height, width: '100%', backgroundColor: theme.color.ink, overflow: 'hidden' }}
      accessible accessibilityLabel={`${car.year} ${car.make} ${car.model}, ${preview.toLocaleString()} dollars, ${spoken(lot.closesAt - now)} left, retail ${lot.retail.toLocaleString()}`}>
      <GestureDetector gesture={Gesture.Race(open, Gesture.Exclusive(hold, doubleTap, tap))}>
        <Animated.View style={[StyleSheet.absoluteFill, photoStyle]}>
          {photo ? <LanePhoto photo={photo} width={width} height={height} transition={active ? 180 : 0} /> : <View style={s.nophoto} />}
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
        <View style={{ alignItems: 'flex-end', gap: 10 }}>
          <Pressable onPress={() => { feel.select(); onMe(); }} hitSlop={12} accessibilityRole="button" accessibilityLabel="Me">
            <Mark size={30} />
          </Pressable>
          <View style={s.eye} accessibilityLabel={`${lot.watching + (watching ? 1 : 0)} watching${watching ? ', you too' : ''}`}>
            <View style={[s.eyeDot, watching && { backgroundColor: theme.color.blue, opacity: 1 }]} /><Text style={s.eyeText}>{lot.watching + (watching ? 1 : 0)}</Text>
          </View>
        </View>
      </View>

      {/* bottom: the two numbers, the bars, the dealer */}
      <View style={[s.bottom, { paddingBottom: insets.bottom + 22 }]} pointerEvents="box-none">
        <GestureDetector gesture={drag}>
          <Animated.View style={s.priceHit}>
            <Price hammer={preview} total={total} lift={lift} struck={closed} leading={lot.leader === ME && armed === 0} />
          </Animated.View>
        </GestureDetector>
        <Bars bid={lot.high} retail={lot.retail} />
        <View style={s.foot}>
          <Text style={s.dealer} numberOfLines={1}>{car.dealer.name} · {car.dealer.city}</Text>
          <Pressable onPress={onOpen} style={s.pill} hitSlop={10} accessibilityRole="button" accessibilityLabel={`${photos} photos, open the car`}>
            <View style={s.pillGrid}>{[0, 1, 2, 3].map(i => <View key={i} style={s.pillCell} />)}</View>
            <Text style={s.pillText}>{photos}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Zero lots: the line, and the mark so Me (deposit, watching, sign out) is still one tap away. */
function Empty({ height, onMe }: { height: number; onMe: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.empty, { height }]}>
      <View style={[s.top, { paddingTop: insets.top + 10, justifyContent: 'flex-end' }]} pointerEvents="box-none">
        <Pressable onPress={() => { feel.select(); onMe(); }} hitSlop={12} accessibilityRole="button" accessibilityLabel="Me"><Mark size={30} /></Pressable>
      </View>
      <Label ink={theme.color.cloud}>Nothing on the lane yet</Label>
    </View>
  );
}

/** The Obavia mark: its own gradient, drawn small. */
function Mark({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs><SvgGradient id="m" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#E9EFFE" /><Stop offset="0.55" stopColor="#B8C8F1" /><Stop offset="1" stopColor="#869FD6" /></SvgGradient></Defs>
      <Circle cx={32} cy={32} r={30} fill="url(#m)" />
    </Svg>
  );
}

/** A sale the server holds for me: open it here if it is not the one already open. */
function ensureSale(lot: Lot, car: Car) {
  const sale = lot.sale!;
  const cur = peekSale();
  if (!cur || cur.lotId !== lot.id) openSale({ lotId: lot.id, hammer: sale.hammer, total: outTheDoor(sale.hammer, car.dealer.fees).total, wonAt: sale.wonAt });
  else if (cur.wonAt !== sale.wonAt) setSale({ wonAt: sale.wonAt });   // the server's hammer time, so the pass matches the Desk's
  if (sale.startedAt && !peekSale()?.pickedUp) setSale({ pickedUp: true });   // the dealer's VIN scan, from the server; plates untouched
}
const live = (l: Lot) => l.sale?.buyer === ME && !l.sale.voidedAt && !l.sale.forfeitedAt;

export function Lane() {
  const { width, height } = useWindowDimensions();
  const { lots, now } = useLots();
  const cars = useCars(lots);
  const sale = useSale();
  const [index, setIndex] = useState(0);
  const [sheet, setSheet] = useState<{ car: Car; steps: number; key: number } | null>(null);
  const [open, setOpen] = useState<Car | null>(null);
  const [won, setWon] = useState<Car | null>(null);
  const [wonAt, setWonInitial] = useState<'pickup' | undefined>(undefined);
  const [meOpen, setMe] = useState(false);
  const listRef = useRef<FlatList<Car>>(null);
  const settled = useRef(0);   // the page the lane last came to rest on: a snap back to it is silent
  // the hammer: a lot closes with me leading
  const closedSeen = useRef<Record<string, boolean>>({});
  for (const l of Object.values(lots)) {
    if (l.closed && !closedSeen.current[l.id]) {
      closedSeen.current[l.id] = true;
      const car = cars.find(c => c.id === l.id) ?? (AUCTION_URL ? carFromLot(l, AUCTION_URL) ?? undefined : undefined);
      if (car && l.leader === ME && l.closed.sold) {
        openSale({ lotId: l.id, hammer: l.high, total: outTheDoor(l.high, car.dealer.fees).total });
        setSheet(null); setWonInitial(undefined); setWon(car);
      }
    }
  }
  const refills = useRef<Record<string, number>>({});
  const bidsSeen = useRef<Record<string, number>>({});
  const leadSeen = useRef<Record<string, string | undefined>>({});
  // every bid in the last two minutes is a refill: medium impact, the same every time
  for (const l of Object.values(lots)) {
    const seen = bidsSeen.current[l.id];
    if (seen !== undefined && l.bids > seen && inLastTwoMinutes(l.closesAt, now)) {
      refills.current[l.id] = (refills.current[l.id] ?? 0) + 1;
      if (cars[index]?.id === l.id && sheet?.car.id !== l.id) feel.refill();   // the open Bid sheet owns this lot's feel: no third impact on my own ack
    }
    bidsSeen.current[l.id] = l.bids;
    // the lead changed hands: mine now (a rival's ceiling fell) gets the chime; lost gets nothing here, the push carries it
    const prev = leadSeen.current[l.id];
    if (prev !== undefined && prev !== l.leader && l.leader === ME && cars[index]?.id === l.id && !l.closed) feel.lead();
    leadSeen.current[l.id] = l.leader;
  }

  const carFor = (l: Lot) => cars.find(c => c.id === l.id) ?? (AUCTION_URL ? carFromLot(l, AUCTION_URL) ?? undefined : undefined);

  // the server's sale states: the one sale I hold opens here; void or forfeit clears it. One sale at a time:
  // the open one while it lives, else the most recent win.
  useEffect(() => {
    const cur = peekSale();
    const all = Object.values(lots);
    const gone = cur && all.find(l => l.id === cur.lotId && l.sale?.buyer === ME && (l.sale.voidedAt || l.sale.forfeitedAt));
    if (gone) { clearSale(); setWon(w => (w?.id === gone.id ? null : w)); }
    const mine = all.filter(live);
    const target = (cur && !gone && mine.find(l => l.id === cur.lotId)) || mine.sort((a, b) => b.sale!.wonAt - a.sale!.wonAt)[0];
    if (!target) return;
    const car = carFor(target);
    if (car) ensureSale(target, car);
  }, [lots]);

  // where a push (or anything outside the screens) says to land: act once, then clear
  const intent = useIntent();
  useEffect(() => {
    if (!intent) return;
    if (intent.screen === 'me') { setOpen(null); setMe(true); clearIntent(); return; }
    if (intent.screen === 'lane') {
      if (intent.lotId) {
        if (cars.length === 0) return;   // the lane has not loaded yet; the intent waits
        const i = cars.findIndex(c => c.id === intent.lotId);
        if (i >= 0) { setMe(false); setOpen(null); listRef.current?.scrollToIndex({ index: i, animated: false }); }
      }
      clearIntent(); return;
    }
    // 'won' | 'pickup'
    const lot = intent.lotId ? lots[intent.lotId] : undefined;
    if (intent.lotId && !lot) return;    // the lot has not arrived yet; the intent waits
    if (lot && live(lot)) {
      const car = carFor(lot);
      if (car) { ensureSale(lot, car); setMe(false); setOpen(null); setSheet(null); setWonInitial(intent.screen === 'pickup' ? 'pickup' : undefined); setWon(car); }
    }
    clearIntent();
  }, [intent, lots, cars]);

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const i = viewableItems[0]?.index; if (typeof i === 'number') setIndex(i);
  }).current;
  const cfg = useMemo(() => ({ itemVisiblePercentThreshold: 60 }), []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.ink }}>
      <FlatList
        ref={listRef}
        data={cars}
        keyExtractor={c => c.id}
        renderItem={({ item, index: i }) => lots[item.id] ? (
          <CarPage car={item} lot={lots[item.id]} now={now} width={width} height={height} active={i === index}
            refillKey={refills.current[item.id] ?? 0}
            onOpen={() => { feel.select(); setOpen(item); }}
            onMe={() => setMe(true)}
            onArm={steps => setSheet({ car: item, steps, key: Date.now() })} />
        ) : null}
        ListEmptyComponent={<Empty height={height} onMe={() => setMe(true)} />}
        pagingEnabled
        snapToInterval={height}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={e => { const i = Math.round(e.nativeEvent.contentOffset.y / height); if (i !== settled.current) { settled.current = i; feel.snap(); } }}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={cfg}
        getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
        scrollEnabled={!sheet && !open && !meOpen}
      />
      {meOpen && <Me lots={lots} now={now} onClose={() => setMe(false)} onOpenCar={id => { setMe(false); const i = cars.findIndex(c => c.id === id); if (i >= 0) listRef.current?.scrollToIndex({ index: i, animated: true }); }} />}
      {sheet && <BidSheet key={sheet.key} car={sheet.car} lot={lots[sheet.car.id]} now={now} steps={sheet.steps} onClose={() => setSheet(null)} />}
      {open && <CarSheet car={open} onClose={() => setOpen(null)} />}
      {won && sale && <Won key={`${won.id}-${wonAt ?? 'won'}`} car={won} initial={wonAt} onDone={() => { setWon(null); setWonInitial(undefined); }} />}
    </View>
  );
}

const s = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ringWrap: { padding: 6, marginLeft: -6 },
  toast: { position: 'absolute', left: 60, top: 14, backgroundColor: 'rgba(8,14,30,0.7)', paddingHorizontal: 10, height: 28, borderRadius: 4, justifyContent: 'center' },   // squared: no pills
  toastText: { color: theme.color.cloud, ...theme.type.sansBold, fontSize: 13, fontVariant: ['tabular-nums'] },
  eye: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eyeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.color.cloud, opacity: 0.8 },
  eyeText: { color: theme.color.cloud, opacity: 0.9, ...theme.type.sans, fontSize: 12, fontVariant: ['tabular-nums'], textShadowColor: 'rgba(8,14,30,0.5)', textShadowRadius: 6 },
  empty: { alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 22 },
  priceHit: { alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 40 },
  foot: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nophoto: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: theme.color.inkSoft },
  dealer: { flexShrink: 1, marginRight: 12, color: theme.color.cloud, opacity: 0.8, ...theme.type.sans, fontSize: 12, textShadowColor: 'rgba(8,14,30,0.5)', textShadowRadius: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28 },
  pillGrid: { width: 12, height: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  pillCell: { width: 5, height: 5, borderRadius: 1, backgroundColor: theme.color.cloud, opacity: 0.85 },
  pillText: { color: theme.color.cloud, opacity: 0.9, ...theme.type.sans, fontSize: 12, fontVariant: ['tabular-nums'], textShadowColor: 'rgba(8,14,30,0.5)', textShadowRadius: 6 },
});
