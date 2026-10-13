/* Me, and Watching. Two pages. Me: the name, the standing deposit, the cars
   won as passes, sign out. No name yet (no licence read): the name's place is
   the field, in the name's own Bodoni, and Save appears once there is a name
   in it; a saved name taps open to correct it. Watching: a column of rings
   with the price under each; tap to go to the car; swipe left to unwatch.
   Returning after a day, the first ring spins in with the heartbeat before
   anything else loads. The neutral screen: nothing fires here but that.
   Under the deposit, the wins left this year (D15), a number that darkens as
   it runs out. A phone whose sign-in was refused says so in one quiet line
   that is also the one phone number (ops-runbook.md Rule 1); a tap calls it.
   Under the name, faint, the number the buyer proved with a code: last four only.
   Under wins left, until the first car is paid (sim 03): the one bid open, with the
   car's name in Bodoni touching it as on the Bid sheet's stamp; the row is the tap
   and goes to that car through the nav bus. Hidden at zero open or once a car is paid.
   Under the $250, where it stands in the Worker's word (depositLine.ts): held, or it went to the car once the
   engine started (the car's name in Bodoni touching the words, the row opens that car's Won to read), sent
   back, forfeited with the car, disputed. "Get it back" only while held. A won car's row under Cars opens
   its Won the same way (Lane's onOpenCar reads a won lot). */
import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
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
import { go } from '../nav';
import { releaseDeposit } from '../deposit';
import { depositLine, type DepositStanding } from '../depositLine';
import { useSale } from '../sale';
import { AUCTION_URL, DEPOSIT, ME, WINS_PER_YEAR, backAfterADay, heldLot, localCommitted, localOpen, lotName, markOpened, once, refreshMe, saveName, supportPhone, toggleWatch, useBuyer, useCars, useWatched } from '../store';
import { theme } from '../theme';

const WEB_FIELD = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

/** The name, or its field. Bodoni either way: the name owns the top of Me. Save is the one verb and shows
    only once there is a name to save; Return saves too. A saved name taps open to correct it. */
function Name({ name }: { name?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const field = useRef<TextInput>(null);
  if (name && !editing) {
    return (
      <Pressable onPress={() => { feel.select(); setDraft(name); setEditing(true); }} hitSlop={8} accessibilityRole="button" accessibilityLabel={name} accessibilityHint="Change the name">
        <Serif size={36} style={{ paddingHorizontal: theme.space.s }}>{name}</Serif>
      </Pressable>
    );
  }
  const ready = draft.trim().length > 0;
  const save = () => {
    if (!saveName(draft)) return;
    Keyboard.dismiss(); feel.done(); setEditing(false);
  };
  return (
    <View style={{ alignItems: 'center', alignSelf: 'stretch' }}>
      <TextInput ref={field} value={draft} onChangeText={setDraft} onSubmitEditing={save} placeholder="Your name" placeholderTextColor={theme.color.faint}
        autoCapitalize="words" autoComplete="name" textContentType="name" autoCorrect={false} returnKeyType="done" autoFocus={editing} maxLength={60}
        accessibilityLabel="Your name" style={[s.name, WEB_FIELD]} selectionColor={theme.color.accent} />
      <View style={[s.mark, ready && s.markOn]} />
      <View style={s.saveRoom}>
        {ready && (
          <Pressable onPress={save} hitSlop={12} accessibilityRole="button" accessibilityLabel="Save the name">
            <Caps>Save</Caps>
          </Pressable>
        )}
      </View>
    </View>
  );
}

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
  const back = useRef(backAfterADay()).current;
  useEffect(() => { markOpened('me'); void refreshMe(); }, []);
  const buyer = useBuyer();
  const winsLeft = AUCTION_URL ? buyer.winsLeft : Math.max(0, WINS_PER_YEAR - localCommitted(Object.values(lots)));
  const won = sale ? [sale] : [];
  const call = supportPhone(cars);
  // the deposit comes back only when the buyer leads nothing and owes nothing
  const [released, setReleased] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const busy = useRef(false);
  const all = Object.values(lots);
  const leads = all.some(l => !l.closed && l.leader === ME);
  const owes = (!!sale && !sale.pickedUp) || all.some(l => l.sale?.buyer === ME && !l.sale.voidedAt && !l.sale.forfeitedAt && !l.sale.startedAt);
  // where the $250 stands: the Worker's word when it has said one; the local stand-in (and the moment before the
  // first GET /me) reads the phone: applied once the car started here, held once the deposit was taken, none before
  const standing: DepositStanding = released ? 'released'
    : buyer.deposit && buyer.deposit !== 'none' ? buyer.deposit
    : sale?.pickedUp ? 'applied' : once.deposit ? 'held' : 'none';
  // the car the $250 went to (or with): the lot whose sale says so, else the sale this phone holds
  const depositLot = standing === 'applied' ? (all.find(l => l.sale?.buyer === ME && (l.sale.deposit === 'applied' || !!l.sale.startedAt)) ?? (sale ? lots[sale.lotId] : undefined))
    : standing === 'forfeited' ? all.find(l => l.sale?.buyer === ME && (l.sale.deposit === 'to_dealer' || !!l.sale.forfeitedAt)) : undefined;
  const line = depositLine(standing, depositLot ? lotName(depositLot) : undefined);
  const canRelease = line.back && !leads && !owes;
  // applied: the row is the tap and opens that car's Won to read, as the Cars row does
  const openDeposit = standing === 'applied' && depositLot ? () => { feel.select(); onOpenCar(depositLot.id); } : undefined;
  // the one bid open (sim 03): the Worker's count from GET /me, the local stand-in's from the lots I lead;
  // the car it is on comes from the lane when the lane knows it. Gone for good once a car is paid.
  const openBids = AUCTION_URL ? buyer.openBids : localOpen(all);
  const held = openBids === 1 && (buyer.paidCars ?? 0) < 1 ? heldLot(all, ME) : null;
  const heldName = held ? lotName(held.lot) : undefined;
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
        {/* a lost phone cannot send a name: the field waits until the sign-in is back */}
        {buyer.name || !buyer.lost ? <Name name={buyer.name} /> : null}
        {/* the proved number, last four only, faint and touching the name it belongs to */}
        {buyer.phone ? <Body ink={theme.color.faint} style={{ fontVariant: ['tabular-nums'] }}>{buyer.phone}</Body> : null}
      </View>
      {buyer.lost && (call ? (
        <Pressable onPress={() => { feel.select(); void Linking.openURL(`tel:${call.replace(/[^\d+]/g, '')}`).catch(() => {}); }} hitSlop={8} accessibilityRole="link" accessibilityLabel={`This phone lost its sign-in. Call ${call}`}>
          <Body ink={theme.color.inkSoft} style={{ marginTop: 4, textAlign: 'center' }}>This phone lost its sign-in.</Body>
          <Body ink={theme.color.ink} style={{ textAlign: 'center', fontVariant: ['tabular-nums'] }}>{`Call ${call}`}</Body>
        </Pressable>
      ) : <Body ink={theme.color.inkSoft} style={{ marginTop: 4 }}>This phone lost its sign-in.</Body>)}
      <Hairline style={{ marginVertical: theme.space.l }} />
      <Label>Deposit</Label>
      <Serif size={34}>${DEPOSIT}</Serif>
      {line.name === undefined ? (
        <Body ink={theme.color.faint} style={{ marginTop: 2 }}>{line.words}</Body>
      ) : openDeposit ? (
        <Pressable onPress={openDeposit} hitSlop={12} style={s.openRow} accessibilityRole="button" accessibilityLabel={`${DEPOSIT} dollars ${line.words} ${line.name}. Open the ${line.name}`}>
          <Body ink={theme.color.faint}>{line.words}</Body>
          <Serif size={22} style={s.openName}>{line.name}</Serif>
        </Pressable>
      ) : (
        <View style={s.openRow} accessible accessibilityLabel={`${DEPOSIT} dollars ${line.words} ${line.name}`}>
          <Body ink={theme.color.faint}>{line.words}</Body>
          <Serif size={22} style={s.openName}>{line.name}</Serif>
        </View>
      )}
      {winsLeft !== undefined && (
        <Body ink={winsInk(winsLeft)} style={{ marginTop: 2, fontVariant: ['tabular-nums'] }}>{`Wins left this year: ${winsLeft}`}</Body>
      )}
      {held && (
        <Pressable onPress={() => { feel.select(); go({ screen: held.screen, lotId: held.lot.id }); }} hitSlop={12} style={s.openRow}
          accessibilityRole="button" accessibilityLabel={heldName ? `One bid open. Open the ${heldName}` : 'One bid open'}>
          <Body ink={theme.color.faint}>One bid open</Body>
          {heldName !== undefined && <Serif size={22} style={s.openName}>{heldName}</Serif>}
        </Pressable>
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
          <Pressable key={w.lotId} onPress={() => { feel.select(); onOpenCar(w.lotId); }} hitSlop={8} style={s.pass}
            accessibilityRole="button" accessibilityLabel={`${car.year} ${car.make} ${car.model}, ${dollars(w.hammer)} dollars`} accessibilityHint="Open the car">
            <View style={s.passThumb}>{car.photos[0] && <Image source={car.photos[0].src} style={StyleSheet.absoluteFill} contentFit="cover" />}</View>
            <View style={{ flexShrink: 1 }}>
              <Serif size={24}>${dollars(w.hammer)}</Serif>
              <Label style={{ textAlign: 'left' }}>{car.year} {car.make} {car.model}</Label>
            </View>
          </Pressable>
        );
      })}
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
  // the name's own face and size, so the field reads as the name not yet written
  name: { fontFamily: theme.font.price, fontSize: 36, color: theme.color.ink, textAlign: 'center', alignSelf: 'stretch', paddingVertical: 0, paddingHorizontal: theme.space.s, minHeight: 48 },
  mark: { width: 18, height: 2, borderRadius: 1, backgroundColor: theme.color.accent, marginTop: 2 },
  markOn: { backgroundColor: theme.color.good },
  saveRoom: { height: 40, justifyContent: 'center' },
  // the Bid sheet's stamp row: words and the car's name on one baseline; a long name drops under, still touching
  openRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'center', columnGap: 10, rowGap: 2, marginTop: 2, paddingHorizontal: theme.space.s },
  openName: { letterSpacing: 0, flexShrink: 1 },
  passThumb: { width: 56, height: 70, borderRadius: 10, overflow: 'hidden', backgroundColor: theme.color.well },
});
