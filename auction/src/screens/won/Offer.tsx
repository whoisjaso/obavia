/* The second chance (decisions §2 row 9): the winner never paid, the deposit forfeited, and the under-bidder has
   twelve hours at their max. The "Second chance · <car> · $X · 12 h" push lands here (nav screen `offer`).
   One page, one verb. The car's photo with its name under it; the amount in Bodoni with the coin touching it
   (one number: the total is Pay's, simplicity-audit change 11)
   (lego §4.1; DOCTRINE §5: the coin is the money piece, and this money is the buyer's own number coming back to
   them); the clock touching what is left of the twelve hours, its arc sweeping once to its mark as the page settles
   (the Pay page's moment); then the one cloud: "Take it". The tap asks the Worker (POST /lots/:id/offer/accept);
   the answer is the new sale, and Won opens with its hammer, which is the body proof. Silence on the negative
   paths: a refused offer stamps four words at most; an offer that runs out while the page is open closes it.
   "Not now" sits faint, top left, last in the reading order. Reduced motion: the resting clock, no sweep. */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CloudButton } from '../../components/CloudButton';
import { Moment, useMoment } from '../../components/Moment';
import { Object3D } from '../../components/Object3D';
import { MOMENT_3D } from '../../components/scene3d';
import { Sky } from '../../components/Sky';
import { Caps, Label, Page, Serif } from '../../components/Type';
import type { Car } from '../../data/cars';
import { dollars } from '../../engine/money';
import type { Lot } from '../../engine/server';
import { feel } from '../../feel';
import { EASE_OUT, cloud, ms } from '../../motion';
import { offerLeft } from '../../sale';
import { acceptOffer } from '../../store';
import { theme } from '../../theme';

/** The clock, light, as Pay draws it; null when no render ships. */
const CLOCK = MOMENT_3D.clock?.light ?? null;
const CLOCK_H = 60;
/** The coin's canvas beside the amount (the coin fills 86 percent of it), the resting coin Me shows. */
const COIN = 64;
/** The page settles child by child (Type.tsx Settle): the clock row is the fourth; the sweep begins when it is
    mostly in. */
const SETTLE_LEAD = 3 * cloud.stagger + ms.page / 2;

/** The Worker's refusal as the stamp says it, four words at most. */
function stampFor(code: string): string {
  if (code === 'offer_expired' || code === 'expired') return 'It ran out';
  if (code === 'not_yours') return 'Not yours';
  if (code === 'deposit_first' || code === 'deposit') return 'Deposit first';   // the $250 went back meanwhile: Me takes it again
  if (code === 'win_cap') return 'Four wins a year';
  return 'Not sent';
}

export function Offer({ car, lot, now, onTaken, onClose }: { car: Car; lot: Lot; now: number; onTaken: (lot: Lot) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const offer = lot.sale?.offer;
  const [busy, setBusy] = useState(false);
  const [stamp, setStamp] = useState<{ text: string; at: number } | null>(null);
  const { f, onReady, begin } = useMoment(CLOCK, reduce);
  // the clock sweeps once as the page settles in; reduced motion: the still at once
  useEffect(() => {
    const lead = reduce ? 0 : SETTLE_LEAD;
    let stop: (() => void) | undefined;
    const t = setTimeout(() => { stop = begin(); }, lead);
    return () => { clearTimeout(t); stop?.(); };
  }, []);
  // the twelve hours ran out, or the offer was taken elsewhere: the page leaves, silently
  const gone = !offer || offer.expiresAt <= now;
  const taken = useRef(false);
  useEffect(() => { if (gone && !taken.current && !busy) onClose(); }, [gone, busy]);
  if (!offer) return null;
  const take = async () => {
    if (busy || gone) return;
    setBusy(true); setStamp(null);
    const r = await acceptOffer(lot.id);
    setBusy(false);
    if (r.ok) { taken.current = true; onTaken(r.lot); return; }
    setStamp({ text: stampFor(r.code), at: Date.now() });
  };
  return (
    <Arrive>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.sky }]}>
        <Sky />
        <Page foot={<CloudButton label="Take it" onPress={busy || gone ? undefined : take} disabled={gone} accessibilityLabel={`Take it, ${dollars(offer.amount)} dollars`} accessibilityHint="Takes the car at this price" />}>
          <View style={s.thumb}>{car.photos[0] && <Image source={car.photos[0].src} style={StyleSheet.absoluteFill} contentFit="cover" />}</View>
          <Caps size={17} ink={theme.color.muted}>{car.year} {car.make} {car.model}</Caps>
          {/* the label over the amount, the coin touching it; a spacer half the coin's width keeps the number centred */}
          <View accessible accessibilityLabel={`Second chance, ${dollars(offer.amount)} dollars`} style={{ alignItems: 'center', marginTop: theme.space.m }}>
            <Label>Second chance</Label>
            <View style={s.row}>
              <Object3D name="coin" height={COIN} delay={120} style={s.coin} />
              <Serif size={56}>${dollars(offer.amount)}</Serif>
              <View style={{ width: COIN * 0.5 }} />
            </View>
          </View>
          {/* the clock touching what is left of its twelve hours */}
          <View accessible accessibilityLabel={`${offerLeft(offer.expiresAt, now)} left`} style={s.row}>
            <Moment m={CLOCK} f={f} height={CLOCK_H} onReady={onReady} style={s.clock} testID="clock-offer" />
            <Serif size={34}>{offerLeft(offer.expiresAt, now)}</Serif>
            <View style={{ width: CLOCK_H * 0.5 }} />
          </View>
          <View style={s.stampRoom}>{stamp && <Stamp key={stamp.at} text={stamp.text} />}</View>
        </Page>
        {/* "Not now": top left on the glass, last in the reading order (the one action comes first) */}
        <Pressable onPress={() => { feel.silence(); onClose(); }} hitSlop={12} style={[s.later, { top: insets.top + theme.space.s }]} accessibilityRole="button" accessibilityLabel="Not now">
          <Text style={s.laterText}>Not now</Text>
        </Pressable>
      </View>
    </Arrive>
  );
}

/** The stamp: pressed down from 1.08x in 160 ms, in the warn ink. Silent. Reduced motion: it fades in. */
function Stamp({ text }: { text: string }) {
  const reduce = useReducedMotion();
  const k = useSharedValue(0);
  useEffect(() => { k.value = withTiming(1, { duration: ms.stamp, easing: EASE_OUT }); }, []);
  const st = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ scale: reduce ? 1 : 1.08 - 0.08 * k.value }] }));
  return <Animated.View style={st} accessibilityLiveRegion="polite"><Label ink={theme.color.warn}>{text}</Label></Animated.View>;
}

/** The page arriving over the lane: in, 200 ms. */
function Arrive({ children }: { children: React.ReactNode }) {
  const k = useSharedValue(0);
  useEffect(() => { k.value = withTiming(1, { duration: ms.sheetFade, easing: EASE_OUT }); }, []);
  const st = useAnimatedStyle(() => ({ opacity: k.value }));
  return <Animated.View style={[StyleSheet.absoluteFill, st]}>{children}</Animated.View>;
}

const s = StyleSheet.create({
  thumb: { width: 120, height: 150, borderRadius: 14, overflow: 'hidden', backgroundColor: theme.color.well, marginBottom: theme.space.xs },
  row: { flexDirection: 'row', alignItems: 'center' },
  coin: { marginRight: -4 },    // the canvas's transparent edge overlaps the gap, so the rim touches the figure
  clock: { marginRight: -4 },
  stampRoom: { height: 28, justifyContent: 'center' },
  later: { position: 'absolute', left: theme.space.m, zIndex: 2 },
  laterText: { ...theme.type.sans, fontSize: 17, color: theme.color.faint },
});
