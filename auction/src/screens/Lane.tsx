/* The Lane. One car per screen. Swipe up: next car. Tap: next angle. Hold: the
   engine (W4-B: the recording the Desk made on Show It, streamed from the Worker;
   the small rendered car at the foot is the only hint, and only when there is one).
   Drag the price up: arms a bid and hands off to the Bid sheet. Long-press the
   ring: the time, spoken once. No reading: two bars are the copy. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, Platform, Pressable, Share, StyleSheet, Text, View, useWindowDimensions, type ViewToken } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { BREATH, EASE_OUT, cloud, drift, ms, spring } from '../motion';
import { LaneClouds, PressCloud, useDrift } from '../components/Cloud';
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
import { AUCTION_URL, ME, acceptClause, isWatched, shareLink, toggleWatch, useCars, useLots, useWatched } from '../store';
import { clauseDue, useClause } from '../clause';
import { ClausePage } from './Clause';
import { useEngine } from '../engine/hear';
import { Offer } from './won/Offer';
import { Me } from './Me';
import { Label } from '../components/Type';
import { Object3D } from '../components/Object3D';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { clearSale, followServer, openSale, peekSale, useSale, wonOpensItself } from '../sale';
import { clearIntent, useIntent } from '../nav';

const STEP_PT = 28;   // one increment per 28 pt of drag
const BLOOM = 88;     // the watch mark under the thumb, pt

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

/** A screen reader is on (VoiceOver, TalkBack): the lane then speaks each car as it arrives and the price takes its
    adjustable actions (decisions §3.5 item 4). Read once and followed. */
function useScreenReader(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isScreenReaderEnabled().then(v => { if (live) setOn(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setOn);
    return () => { live = false; sub.remove(); };
  }, []);
  return on;
}

/** The share sheet (phases.md Phase 2 Marketing: "the Lane's share sheet"): the platform's own sheet with the lot's
    lane link, the car's name as the words. Nothing of ours in it; a browser with no sheet does nothing, silently. */
function share(car: Car) {
  const name = `${car.year} ${car.make} ${car.model}`, url = shareLink(car.id);   // the buyer's own ?r= on it when the Worker gave one
  feel.select();
  // Android's sheet carries the message only, so the link rides in it there; iOS takes both pieces
  void Share.share(Platform.OS === 'android' ? { message: `${name} ${url}` } : { message: name, url }, { dialogTitle: name, subject: name }).catch(() => {});
}

function CarPage({ car, lot, now, width, height, active, near, clouds, onArm, onOpen, onMe, onWon, refillKey, spoken: reader }: {
  car: Car; lot: Lot; now: number; width: number; height: number; active: boolean; near: boolean;
  clouds: { far: SharedValue<number>; mid: SharedValue<number> };
  onArm: (steps: number) => void; onOpen: () => void; onMe: () => void; onWon?: () => void; refillKey: number;
  spoken: boolean;   // a screen reader is on: the page announces itself when it becomes the one on the glass
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

  // Tap: next angle. Stories' tap-to-advance. Double-tap: watch, Instagram's heart as the Obavia mark.
  const nextAngle = () => { if (photos > 1) { setAngle(a => (a + 1) % photos); feel.select(); } };
  const tap = Gesture.Tap().maxDuration(220).onEnd(() => { scheduleOnRN(nextAngle); });
  // The watch: the mark blooms under the thumb, where the second tap landed, on the UI thread in the same
  // frame as the gesture; it fades in over 90 ms, swells 1.03 and settles over 420 ms (the one landed swell),
  // then leaves in 240 ms. A watch is a want, not a win: the puff and a light impact, no chime. Unwatching
  // by double tap blooms nothing and is silent.
  const watchingNow = useSharedValue(watching);
  useEffect(() => { watchingNow.value = watching; }, [watching]);
  const bx = useSharedValue(0), by = useSharedValue(0), bo = useSharedValue(0), bs = useSharedValue(1);
  const watch = () => { if (toggleWatch(car.id)) feel.watch(); };
  const doubleTap = Gesture.Tap().numberOfTaps(2).maxDuration(260).onEnd(e => {
    if (!watchingNow.value) {
      bx.value = e.x; by.value = e.y;
      // opacity is not motion: under reduced motion the mark still fades in and out where the thumb was
      bo.value = withSequence(ReduceMotion.Never, withTiming(1, { duration: 90, easing: EASE_OUT, reduceMotion: ReduceMotion.Never }), withDelay(ms.swell - 90, withTiming(0, { duration: 240, easing: EASE_OUT, reduceMotion: ReduceMotion.Never }), ReduceMotion.Never));
      bs.value = 1;
      if (!reduce) bs.value = withSequence(withTiming(cloud.swell, { duration: ms.swell / 2, easing: BREATH }), withTiming(1, { duration: ms.swell / 2, easing: BREATH }));
    }
    scheduleOnRN(watch);
  });
  const bloomStyle = useAnimatedStyle(() => ({ opacity: bo.value, transform: [{ translateX: bx.value - BLOOM / 2 }, { translateY: by.value - BLOOM / 2 }, { scale: bs.value }] }));
  // Hold: the engine. With a recording (car.engine, W4-B) it plays from the first frame of the hold with the medium
  // impact, and fades out as the thumb lifts; without one the photo settles in with a light touch, as before.
  // Reduced motion: the photo keeps still either way; the sound and the haptic are not motion.
  const engine = useEngine(car.engine);
  const hold = Gesture.LongPress().minDuration(350).onStart(() => {
    if (!reduce) photoScale.value = withSpring(1.03, spring.settle);
    scheduleOnRN(engine.start);
  }).onFinalize(() => { photoScale.value = withSpring(1, spring.settle); scheduleOnRN(engine.stop); });
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

  // a screen reader: the car arriving under three fingers is announced once, as the page it is; the price's swipe
  // up arms one increment and hands off to the Bid sheet, the same roll the drag makes (down: nothing, the ask is the floor)
  const pageLabel = `${car.year} ${car.make} ${car.model}, ${preview.toLocaleString()} dollars, ${spoken(lot.closesAt - now)} left, retail ${lot.retail.toLocaleString()}`;
  useEffect(() => { if (reader && active) AccessibilityInfo.announceForAccessibility(pageLabel); }, [reader, active]);
  const adjust = closed ? undefined : (d: 1 | -1) => { if (d === 1) { feel.tick(); onArm(0); } };
  // Long-press the ring: the time, spoken.
  const say = () => { const t = spoken(lot.closesAt - now); setToast(t); AccessibilityInfo.announceForAccessibility(`${t} left`); };
  const hush = () => setToast(null);
  const ringPress = Gesture.LongPress().minDuration(300).onStart(() => { scheduleOnRN(say); }).onFinalize(() => { scheduleOnRN(hush); });

  return (
    <View style={{ height, width: '100%', backgroundColor: theme.color.ink, overflow: 'hidden' }}
      accessible accessibilityLabel={pageLabel} accessibilityHint={reader ? 'Three fingers up for the next car' : undefined}>
      <GestureDetector gesture={Gesture.Race(open, Gesture.Exclusive(hold, doubleTap, tap))}>
        <Animated.View style={[StyleSheet.absoluteFill, photoStyle]}>
          {photo ? <LanePhoto photo={photo} width={width} height={height} transition={active ? 180 : 0} /> : <View style={s.nophoto} />}
        </Animated.View>
      </GestureDetector>
      <LinearGradient pointerEvents="none" colors={['rgba(8,14,30,0)', 'rgba(8,14,30,0.15)', theme.color.scrim]} locations={[0.3, 0.55, 0.82]} style={StyleSheet.absoluteFill} />
      {/* a breath of ink under the top row, so the white count and the Share word under it read on a pale sky
          (DOCTRINE §4.3, measured: Share at 2.8:1 past the shade's end on October 13, so the shade now runs under both rows) */}
      <LinearGradient pointerEvents="none" colors={['rgba(8,14,30,0.72)', 'rgba(8,14,30,0.55)', 'rgba(8,14,30,0)']} locations={[0, 0.55, 1]} style={[s.topShade, { height: insets.top + 180 }]} />
      {/* the cloud scrim: ice behind the ring and behind the price, never across the car (only on this page
          and its neighbours: the pages further down the list draw nothing) */}
      {near && <LaneClouds width={width} height={height} far={clouds.far} mid={clouds.mid} />}
      <Animated.View pointerEvents="none" style={[s.bloom, bloomStyle]}><Mark size={BLOOM} id="bloom" /></Animated.View>

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
          {/* the count and its plain word: a dot beside a number was a pictogram to decode (DOCTRINE §4.5) */}
          <View style={s.eye} accessibilityLabel={`${lot.watching + (watching ? 1 : 0)} watching${watching ? ', you too' : ''}`}>
            <Text style={[s.eyeText, watching && s.eyeOn]}>{(lot.watching + (watching ? 1 : 0)).toLocaleString('en-US')} watching</Text>
          </View>
          {/* the share verb under the count, the same plain word, the same column: a secondary (one-action.md, Lane row) */}
          {!closed && (
            <PressCloud onPress={() => share(car)} hitSlop={12} sound={false} accessibilityLabel="Share" accessibilityHint="The lane link, in the share sheet">
              <Text style={s.eyeText}>Share</Text>
            </PressCloud>
          )}
        </View>
      </View>

      {/* bottom: the two numbers, the bars, the dealer */}
      <View style={[s.bottom, { paddingBottom: insets.bottom + 22 }]} pointerEvents="box-none">
        {/* the car is mine and has started: the struck price is the way back into the sale, to read it */}
        {closed && onWon ? (
          <Pressable onPress={() => { feel.select(); onWon(); }} style={s.priceHit} hitSlop={8} accessibilityRole="button" accessibilityLabel="Yours, open the sale">
            <Price hammer={preview} total={total} lift={lift} struck={closed} leading={lot.leader === ME && armed === 0} />
          </Pressable>
        ) : (
          <GestureDetector gesture={drag}>
            <Animated.View style={s.priceHit}>
              <Price hammer={preview} total={total} lift={lift} struck={closed} leading={lot.leader === ME && armed === 0} onAdjust={adjust} />
            </Animated.View>
          </GestureDetector>
        )}
        <Bars bid={lot.high} retail={lot.retail} />
        <View style={s.foot}>
          {/* the engine recorded: the rendered car (DOCTRINE §5) touching the dealer's line, the one hint that the
              photo can be held; it swells with the photo under the hold. No word. */}
          {car.engine ? <Animated.View style={[s.engineCar, photoStyle]}><Object3D name="car" tone="dark" width={56} appear={false} /></Animated.View> : null}
          <Text style={s.dealer} numberOfLines={1}>{car.dealer.name} · {car.dealer.city}</Text>
          {/* the car's next photo, small, with its count: the object, not a grid glyph to decode */}
          <Pressable onPress={onOpen} style={s.pill} hitSlop={10} accessibilityRole="button" accessibilityLabel={`${photos} photos, open the car`}>
            {photos > 1 && <View style={s.thumb}><Image source={car.photos[(angle + 1) % photos].src} style={StyleSheet.absoluteFill} contentFit="cover" /></View>}
            <Text style={s.pillText}>{photos}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Zero lots: the car on the ink lane, the line touching its shade (lego §4.1), and the mark so Me
    (deposit, watching, sign out) is still one tap away. The car is the rendered object (DOCTRINE §5), the
    lane's own empty lot; it lands once with the swell. */
function Empty({ height, width, onMe }: { height: number; width: number; onMe: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.empty, { height }]}>
      <View style={[s.top, { paddingTop: insets.top + 10, justifyContent: 'flex-end' }]} pointerEvents="box-none">
        <Pressable onPress={() => { feel.select(); onMe(); }} hitSlop={12} accessibilityRole="button" accessibilityLabel="Me"><Mark size={30} /></Pressable>
      </View>
      <Object3D name="car" tone="dark" width={Math.min(340, width - 48)} style={s.emptyCar} />
      <Label ink={theme.color.cloud}>Nothing on the lane yet</Label>
    </View>
  );
}

/** The Obavia mark: its own gradient, drawn small. */
function Mark({ size, id = 'm' }: { size: number; id?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs><SvgGradient id={id} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#E9EFFE" /><Stop offset="0.55" stopColor="#B8C8F1" /><Stop offset="1" stopColor="#869FD6" /></SvgGradient></Defs>
      <Circle cx={32} cy={32} r={30} fill={`url(#${id})`} />
    </Svg>
  );
}

/** A sale the server holds for me: open it here if it is not the one already open. */
function ensureSale(lot: Lot, car: Car) {
  const sale = lot.sale!;
  const cur = peekSale();
  if (!cur || cur.lotId !== lot.id) openSale({ lotId: lot.id, hammer: sale.hammer, total: outTheDoor(sale.hammer, car.dealer.fees).total, wonAt: sale.wonAt, deadlineAt: sale.deadlineAt });
  followServer(sale);   // the server's hammer time (the pass matches the Desk's), its pay-by for Pay, the dealer's VIN scan, the plates states it carries
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
  const [wonAt, setWonInitial] = useState<'pickup' | 'steps' | undefined>(undefined);
  const [meOpen, setMe] = useState(false);
  const [offer, setOffer] = useState<Car | null>(null);   // the second chance, opened by its push
  const [clauseOpen, setClauseOpen] = useState(false);   // the clause page on its own (nav 'clause'), outside a bid
  const clause = useClause();
  const reader = useScreenReader();
  const listRef = useRef<FlatList<Car>>(null);
  const cloudFar = useDrift(drift.far.period), cloudMid = useDrift(drift.mid.period);   // one clock per lane: a swipe never restarts the drift
  const clouds = useMemo(() => ({ far: cloudFar, mid: cloudMid }), []);
  const settled = useRef(0);   // the page the lane last came to rest on: a snap back to it is silent
  // the hammer: a lot closes with me leading. On a launch the lot arrives already closed: Won opens itself
  // only while the sale is still mine to finish (not started, voided or forfeited); after the start the lane
  // and Me are the glass and the struck price opens Won to read it
  const closedSeen = useRef<Record<string, boolean>>({});
  for (const l of Object.values(lots)) {
    if (l.closed && !closedSeen.current[l.id]) {
      closedSeen.current[l.id] = true;
      const car = cars.find(c => c.id === l.id) ?? (AUCTION_URL ? carFromLot(l, AUCTION_URL) ?? undefined : undefined);
      if (car && l.leader === ME && l.closed.sold && wonOpensItself(l.sale)) {
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
  // a tap on a car I won (from its page on the lane, or from Me): the sale opens to read, no celebration
  const readWon = (l: Lot) => { const car = carFor(l); if (!car) return false; ensureSale(l, car); setMe(false); setOpen(null); setSheet(null); setWonInitial('steps'); setWon(car); return true; };

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
    if (intent.screen === 'clause') { setSheet(null); setClauseOpen(true); clearIntent(); return; }
    if (intent.screen === 'lane') {
      if (intent.lotId) {
        if (cars.length === 0) return;   // the lane has not loaded yet; the intent waits
        const i = cars.findIndex(c => c.id === intent.lotId);
        if (i >= 0) { setMe(false); setOpen(null); listRef.current?.scrollToIndex({ index: i, animated: false }); }
      }
      clearIntent(); return;
    }
    const lot = intent.lotId ? lots[intent.lotId] : undefined;
    if (intent.lotId && !lot) return;    // the lot has not arrived yet; the intent waits
    if (intent.screen === 'offer') {
      // the second chance: mine and still open, else the push was late and the lane is the glass
      const o = lot?.sale?.offer;
      const car = lot && o && o.buyer === ME && o.expiresAt > Date.now() ? carFor(lot) : undefined;
      if (car) { setMe(false); setOpen(null); setSheet(null); setOffer(car); }
      clearIntent(); return;
    }
    // 'won' | 'pickup'
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
          <CarPage car={item} lot={lots[item.id]} now={now} width={width} height={height} active={i === index} near={Math.abs(i - index) <= 1} clouds={clouds} spoken={reader}
            refillKey={refills.current[item.id] ?? 0}
            onOpen={() => { feel.select(); setOpen(item); }}
            onMe={() => setMe(true)}
            onWon={lots[item.id].closed && live(lots[item.id]) ? () => readWon(lots[item.id]) : undefined}
            onArm={steps => setSheet({ car: item, steps, key: Date.now() })} />
        ) : null}
        ListEmptyComponent={<Empty height={height} width={width} onMe={() => setMe(true)} />}
        pagingEnabled
        snapToInterval={height}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={e => { const i = Math.round(e.nativeEvent.contentOffset.y / height); if (i !== settled.current) { settled.current = i; feel.snap(); } }}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={cfg}
        getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
        scrollEnabled={!sheet && !open && !meOpen && !offer && !clauseOpen}
      />
      {/* the clause on its own, where nav 'clause' lands: due, it shows; agreed or not now, the lane is the glass */}
      {clauseOpen && (clauseDue(clause)
        ? <ClausePage clause={clauseDue(clause)!} onAgree={async v => { const ok = await acceptClause(v); if (ok) setClauseOpen(false); return ok; }} onCancel={() => setClauseOpen(false)} />
        : null)}
      {meOpen && <Me lots={lots} now={now} onClose={() => setMe(false)} onOpenCar={id => { const l = lots[id]; if (l?.closed && live(l) && readWon(l)) return; setMe(false); const i = cars.findIndex(c => c.id === id); if (i >= 0) listRef.current?.scrollToIndex({ index: i, animated: true }); }} />}
      {sheet && <BidSheet key={sheet.key} car={sheet.car} lot={lots[sheet.car.id]} now={now} steps={sheet.steps} onClose={() => setSheet(null)} />}
      {open && <CarSheet car={open} onClose={() => setOpen(null)} />}
      {/* the second chance: Take it writes the new sale, and Won opens on it with the hammer, the body proof */}
      {offer && lots[offer.id] && (
        <Offer car={offer} lot={lots[offer.id]} now={now} onClose={() => setOffer(null)}
          onTaken={l => { const car = carFor(l) ?? offer; if (l.sale) { const cur = peekSale(); if (cur && cur.lotId !== l.id) clearSale(); ensureSale(l, car); } setOffer(null); setWonInitial(undefined); setWon(car); }} />
      )}
      {won && sale && <Won key={`${won.id}-${wonAt ?? 'won'}`} car={won} initial={wonAt} onDone={() => { setWon(null); setWonInitial(undefined); }} />}
    </View>
  );
}

const s = StyleSheet.create({
  bloom: { position: 'absolute', left: 0, top: 0, width: BLOOM, height: BLOOM, borderRadius: BLOOM / 2, shadowColor: '#080E1E', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ringWrap: { padding: 6, marginLeft: -6 },
  toast: { position: 'absolute', left: 60, top: 12, backgroundColor: 'rgba(8,14,30,0.7)', paddingHorizontal: 10, height: 32, borderRadius: 4, justifyContent: 'center' },   // squared: no pills
  toastText: { color: theme.color.cloud, ...theme.type.sansBold, fontSize: 17, fontVariant: ['tabular-nums'] },
  topShade: { position: 'absolute', left: 0, right: 0, top: 0 },
  eye: { flexDirection: 'row', alignItems: 'center' },
  eyeOn: { ...theme.type.sansBold },
  eyeText: { color: theme.color.cloud, ...theme.type.sans, fontSize: 17, fontVariant: ['tabular-nums'], textShadowColor: 'rgba(8,14,30,0.75)', textShadowRadius: 8 },
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyCar: { marginBottom: -18 },   // the canvas keeps a margin under the shade: the line sits in it, touching the car
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 22 },
  priceHit: { alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 40 },
  foot: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  engineCar: { marginRight: 2, marginLeft: -4, marginVertical: -8 },   // the car's canvas keeps a margin: the rendered body touches the dealer's words
  nophoto: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: theme.color.inkSoft },
  dealer: { flexShrink: 1, marginRight: 12, color: theme.color.cloud, ...theme.type.sans, fontSize: 17, textShadowColor: 'rgba(8,14,30,0.5)', textShadowRadius: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40 },
  thumb: { width: 40, height: 40, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' },   // squared, a photo's corner
  pillText: { color: theme.color.cloud, ...theme.type.sans, fontSize: 17, fontVariant: ['tabular-nums'], textShadowColor: 'rgba(8,14,30,0.5)', textShadowRadius: 6 },
});
