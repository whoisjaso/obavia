/* The Bid sheet: the bottom 40 %. The bid, the total under it, the increment,
   a second wheel labelled by its value ("up to $5,600"), one button: Bid.
   The drag only arms; the button bids; over 2× asks a 600 ms hold. The thump
   fires on the server's ack, never before. A bid that lands after close is
   the one place a sentence is allowed, and it is the server's sentence. */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Price } from '../components/Price';
import { Ring } from '../components/Ring';
import { Label } from '../components/Type';
import type { Car } from '../data/cars';
import { inLastTwoMinutes, increment, needsHold, nextBid, roll } from '../engine/auction';
import { dollars, outTheDoor } from '../engine/money';
import type { Ack, Lot } from '../engine/server';
import { feel } from '../feel';
import { DEPOSIT, ME, getServer, once } from '../store';
import { theme } from '../theme';

const STEP_PT = 28;
type Phase = 'arming' | 'deposit' | 'inflight' | 'landed' | 'rejected';

export function BidSheet({ car, lot, now, steps, onClose }: { car: Car; lot: Lot; now: number; steps: number; onClose: () => void }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const open = height * 0.46 + insets.bottom;
  const y = useSharedValue(open);
  const [phase, setPhase] = useState<Phase>(once.deposit ? 'arming' : 'arming');
  const [stepsNow, setSteps] = useState(steps);
  const [ceilSteps, setCeil] = useState(0);        // 0 = no ceiling (bid is the ceiling)
  const [punch, setPunch] = useState<number>();
  const [landKey, setLand] = useState<number | undefined>(once.deposit ? 0 : undefined);   // the deposit line appears once it exists
  const [stamp, setStamp] = useState<string | null>(null);
  const [teach, setTeach] = useState(false);
  const opened = lot.bids > 0;
  const closed = !!lot.closed || lot.closesAt <= now;
  const amount = phase === 'rejected' || phase === 'landed' ? lot.high : roll(lot.high, opened, stepsNow);
  const ceiling = ceilSteps > 0 ? roll(amount, true, ceilSteps - 1) : amount;
  const total = outTheDoor(amount, car.dealer.fees).total;
  const hold = needsHold(amount, lot.high);

  useEffect(() => { y.value = withSpring(0, theme.spring.sheet); }, []);
  const close = () => { y.value = withTiming(open, { duration: 200, easing: Easing.in(Easing.quad) }, f => { if (f) runOnJS(onClose)(); }); };

  // swipe down = cancel; nothing fires (silence is the neutral channel)
  const dismiss = Gesture.Pan().activeOffsetY(12).onUpdate(e => { y.value = Math.max(0, e.translationY); })
    .onEnd(e => { if (e.translationY > 90 || e.velocityY > 800) runOnJS(close)(); else y.value = withSpring(0, theme.spring.sheet); });
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  // the wheel: drag the price to roll by increments; a tick per step
  const dragSteps = useSharedValue(stepsNow);
  const wheel = Gesture.Pan().activeOffsetY([-6, 6]).enabled(phase === 'arming' && !closed)
    .onBegin(() => { dragSteps.value = stepsNow; runOnJS(feel.touch)(); })
    .onUpdate(e => {
      const n = Math.max(0, stepsNow + Math.round(-e.translationY / STEP_PT));
      if (n !== dragSteps.value) { dragSteps.value = n; runOnJS(setSteps)(n); runOnJS(feel.tick)(); }
    });

  const place = async () => {
    if (!once.deposit) { setPhase('deposit'); return; }
    setPhase('inflight'); setStamp(null);
    const key = `${ME}-${car.id}-${Date.now()}`;
    const ack: Ack = await getServer().bid({ lotId: car.id, bidder: ME, amount, max: ceiling, key });
    if (ack.ok) {
      setPhase('landed'); setPunch(Date.now()); feel.landed();
      setTimeout(feel.lead, 150);   // you are the high bidder
      const blue = inLastTwoMinutes(ack.lot.closesAt, Date.now());
      if (blue && !once.sawRefill) { once.sawRefill = true; setTeach(true); setTimeout(() => setTeach(false), theme.ms.overlay); }
      setTimeout(close, blue ? theme.ms.overlay + 300 : 900);
    } else if (ack.reason === 'closed') {
      setPhase('rejected'); feel.rejected();
      setStamp(`Closed ${(ack.lateByMs / 1000).toFixed(1)} s before your bid`);
    } else {
      // outbid during flight, or under the ask: the price rolls to the new number, warning haptic, no sentence
      setPhase('arming'); setSteps(0); setCeil(0); feel.rejected();
    }
  };

  const confirmDeposit = () => { once.deposit = true; setLand(Date.now()); feel.touch(); setPhase('arming'); setTimeout(place, 200); };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={phase === 'inflight' ? undefined : close} accessibilityLabel="Close" />
      <GestureDetector gesture={dismiss}>
        <Animated.View style={[s.sheet, { height: open, paddingBottom: insets.bottom + 12 }, sheetStyle]}>
          <View style={s.grab} />
          {phase === 'deposit' ? (
            <Deposit onConfirm={confirmDeposit} onCancel={() => setPhase('arming')} />
          ) : (
            <>
              <View style={s.ringRow}>
                <Ring size={30} stroke={2.5} progress={Math.max(0, Math.min(1, (lot.closesAt - now) / (inLastTwoMinutes(lot.closesAt, now) ? 120_000 : lot.closesAt - lot.opensAt)))} blue={inLastTwoMinutes(lot.closesAt, now)} grey={closed} />
              </View>
              <GestureDetector gesture={wheel}>
                <Animated.View style={s.wheel}>
                  <Price hammer={amount} total={total} ink={theme.color.ink} size={60} punchKey={punch} centered />
                </Animated.View>
              </GestureDetector>
              <Label style={{ marginTop: 6 }}>{stamp ?? `+ $${dollars(increment(amount))}`}</Label>

              {/* the second wheel: its value is its label, nothing boxed */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.ceil} decelerationRate="fast" style={{ flexGrow: 0, alignSelf: 'stretch' }}>
                {Array.from({ length: 7 }, (_, i) => i).map(i => {
                  const v = i === 0 ? amount : roll(amount, true, i - 1);
                  const on = i === ceilSteps;
                  return (
                    <Pressable key={i} onPress={() => { setCeil(i); feel.select(); }} style={s.ceilItem} hitSlop={8} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={i === 0 ? 'No ceiling' : `up to ${dollars(v)} dollars`}>
                      <Text style={[s.ceilText, on && s.ceilTextOn]}>{i === 0 ? 'no ceiling' : `up to $${dollars(v)}`}</Text>
                      {on && <View style={s.ceilMark} />}
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={s.foot}>
                <BidButton phase={phase} hold={hold} disabled={closed || phase === 'rejected'} onBid={place} />
                {landKey !== undefined && <Label style={{ marginTop: theme.space.s, alignSelf: 'center' }}>${DEPOSIT} held · back if you lose</Label>}
              </View>
            </>
          )}
        </Animated.View>
      </GestureDetector>
      {teach && <Teach />}
    </View>
  );
}

/** One button. Tap bids; over 2× it needs a 600 ms hold that fills it; in flight it is a ring. */
function BidButton({ phase, hold, disabled, onBid }: { phase: Phase; hold: boolean; disabled: boolean; onBid: () => void }) {
  const fill = useSharedValue(0), sink = useSharedValue(0);
  const start = () => { fill.value = withTiming(1, { duration: theme.ms.hold, easing: Easing.linear }, f => { if (f) { runOnJS(feel.holdDone)(); runOnJS(onBid)(); } }); };
  const stop = () => { cancelAnimation(fill); fill.value = withTiming(0, { duration: 120 }); };
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const sinkStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sink.value }] }));
  const busy = phase === 'inflight';
  const landed = phase === 'landed';
  const g = hold
    ? Gesture.LongPress().minDuration(theme.ms.hold + 50).onBegin(() => { runOnJS(start)(); }).onFinalize(() => { runOnJS(stop)(); })
    : Gesture.Tap().onBegin(() => { sink.value = withSpring(2, theme.spring.lift); }).onFinalize(() => { sink.value = withSpring(0, theme.spring.lift); }).onEnd(() => { runOnJS(onBid)(); });
  return (
    <GestureDetector gesture={g.enabled(!disabled && !busy && !landed)}>
      <Animated.View style={[s.btn, (disabled || landed) && s.btnOff, sinkStyle]} accessibilityRole="button" accessibilityLabel={hold ? 'Bid, double tap and hold' : 'Bid'} accessibilityState={{ disabled: disabled || busy }}>
        {hold && <Animated.View style={[s.btnFill, fillStyle]} />}
        {busy ? <Spinner /> : landed ? <Tick /> : <Text style={s.btnText}>Bid</Text>}
      </Animated.View>
    </GestureDetector>
  );
}

function Spinner() {
  const r = useSharedValue(0);
  useEffect(() => { r.value = withRepeat(withTiming(360, { duration: 800, easing: Easing.linear }), -1); return () => cancelAnimation(r); }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return (
    <Animated.View style={st}>
      <Svg width={26} height={26}><Circle cx={13} cy={13} r={10} stroke={theme.color.cloud} strokeWidth={3} fill="none" strokeDasharray="44 20" strokeLinecap="round" /></Svg>
    </Animated.View>
  );
}
function Tick() {
  return <Svg width={26} height={26} viewBox="0 0 26 26"><Path d="M5 13.5 L10.5 19 L21 7.5" stroke={theme.color.cloud} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

/** The one slow moment, Apple's shape: $250 · refunded if you lose. Once, ever. */
function Deposit({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <View style={s.deposit}>
      <Label>Deposit</Label>
      <Text style={s.depositAmt}>${DEPOSIT}</Text>
      <Text style={s.depositLine}>refunded if you lose</Text>
      <Pressable onPress={onConfirm} style={s.pay} accessibilityRole="button" accessibilityLabel="Pay 250 dollars with Apple Pay">
        <Text style={s.payText}>Pay</Text>
      </Pressable>
      <Pressable onPress={onCancel} hitSlop={12}><Text style={s.cancel}>Not now</Text></Pressable>
    </View>
  );
}

/** The soft-close teach: a bid lands, the ring refills. 1.2 s, animated, once, ever. */
function Teach() {
  const [k, setK] = useState(0);
  useEffect(() => { const t = setTimeout(() => setK(1), 450); return () => clearTimeout(t); }, []);
  const o = useSharedValue(0);
  useEffect(() => { o.value = withTiming(1, { duration: 150 }); }, []);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View pointerEvents="none" style={[s.teach, st]}>
      <View style={s.teachRing}><Ring size={96} stroke={6} progress={k ? 1 : 0.35} blue refillKey={k} /></View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: theme.color.sky, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: theme.space.m, paddingTop: 10, alignItems: 'center' },
  grab: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: theme.color.line, marginBottom: theme.space.s },
  ringRow: { alignItems: 'center', marginBottom: 4 },
  wheel: { paddingVertical: 4, alignSelf: 'stretch', alignItems: 'center' },
  ceil: { gap: theme.space.m, paddingVertical: theme.space.s, paddingHorizontal: theme.space.s },
  ceilItem: { alignItems: 'center', justifyContent: 'center' },
  ceilText: { ...theme.type.sans, fontSize: 15, color: theme.color.faint, fontVariant: ['tabular-nums'] },
  ceilTextOn: { color: theme.color.ink, ...theme.type.sansBold },
  ceilMark: { width: 16, height: 2, borderRadius: 1, backgroundColor: theme.color.accent, marginTop: 5 },
  foot: { marginTop: 'auto', alignSelf: 'stretch', alignItems: 'stretch' },
  btn: { alignSelf: 'stretch', height: 56, borderRadius: 28, backgroundColor: theme.color.ink, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  btnOff: { opacity: 0.4 },
  btnFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: theme.color.cloud, opacity: 0.18 },
  btnText: { ...theme.type.sansBold, fontSize: 18, color: theme.color.cloud },
  deposit: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: 6 },
  depositAmt: { fontFamily: theme.font.price, fontSize: 64, color: theme.color.ink, marginTop: 4 },
  depositLine: { ...theme.type.sans, fontSize: 15, color: theme.color.muted, marginBottom: 14 },
  pay: { alignSelf: 'stretch', height: 54, borderRadius: 27, backgroundColor: theme.color.ink, alignItems: 'center', justifyContent: 'center', marginTop: theme.space.s },
  payText: { ...theme.type.sansBold, fontSize: 18, color: theme.color.cloud },
  cancel: { ...theme.type.sans, fontSize: 14, color: theme.color.faint, marginTop: 8 },
  teach: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,14,30,0.35)' },
  teachRing: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(8,14,30,0.75)', alignItems: 'center', justifyContent: 'center' },
});
