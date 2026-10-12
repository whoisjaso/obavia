/* The Bid sheet: the bottom 40 %. The bid, the total under it, the increment,
   a second wheel labelled by its value ("up to $5,600"), one button: Bid.
   The drag only arms; the button bids; over 2× asks a 600 ms hold. The thump
   fires on the server's ack, never before. A bid that lands after close is
   the one place a sentence is allowed, and it is the server's sentence. */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, InkBody, PressCloud, Sky, Underside } from '../components/Cloud';
import { driftLevel, useDriftSound } from '../components/Sheet';
import { Price } from '../components/Price';
import { Ring } from '../components/Ring';
import { Label } from '../components/Type';
import type { Car } from '../data/cars';
import { inLastTwoMinutes, increment, needsHold, nextBid, roll } from '../engine/auction';
import { dollars, outTheDoor } from '../engine/money';
import type { Ack, Lot } from '../engine/server';
import { feel } from '../feel';
import { takeDeposit } from '../deposit';
import { registerPush } from '../push';
import { AUCTION_URL, DEPOSIT, ME, getServer, once } from '../store';
import { EASE_OUT, EASE_SHEET, cloud, ms, spring } from '../motion';
import { theme } from '../theme';

const STEP_PT = 28;
type Phase = 'arming' | 'deposit' | 'inflight' | 'landed' | 'rejected';

export function BidSheet({ car, lot, now, steps, onClose }: { car: Car; lot: Lot; now: number; steps: number; onClose: () => void }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const open = height * 0.46 + insets.bottom;
  const reduce = useReducedMotion();
  const y = useSharedValue(reduce ? 0 : open);
  const fade = useSharedValue(reduce ? 0 : 1);   // reduced motion: the sheet fades where it rests
  const air = useDriftSound();
  const [phase, setPhase] = useState<Phase>(once.deposit ? 'arming' : 'arming');
  const [stepsNow, setSteps] = useState(steps);
  const [ceilSteps, setCeil] = useState(0);        // 0 = no ceiling (bid is the ceiling)
  const [ceilOpen, setCeilOpen] = useState(false); // Hick: the wheel is hidden until the buyer asks for it
  const [punch, setPunch] = useState<number>();
  const [landKey, setLand] = useState<number | undefined>(once.deposit ? 0 : undefined);   // the deposit line appears once it exists
  const [stamp, setStamp] = useState<string | null>(null);
  const [teach, setTeach] = useState(false);
  const [lead, setLead] = useState(false);          // the leading mark, on the frame the lead chime plays
  const opened = lot.bids > 0;
  const closed = !!lot.closed || lot.closesAt <= now;
  const amount = phase === 'rejected' || phase === 'landed' ? lot.high : roll(lot.high, opened, stepsNow);
  const ceiling = ceilSteps > 0 ? roll(amount, true, ceilSteps - 1) : amount;
  const total = outTheDoor(amount, car.dealer.fees).total;
  const hold = needsHold(amount, lot.high);

  // the rise continues the drag that armed it: a cloud forming (0.75), its little over-rise kept inside the
  // 40 pt the sheet holds below the glass; the air leaves as it lands
  useEffect(() => {
    feel.settle();
    if (reduce) fade.value = withTiming(1, { duration: ms.sheetFade, easing: EASE_OUT });
    else y.value = withSpring(0, spring.form);
  }, []);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (f: () => void, t: number) => { timers.current.push(setTimeout(f, t)); };
  const done = () => onClose();
  // no finger: the iOS sheet curve, 200 ms (never ease-in: it delays the moment the eye is on)
  const close = () => {
    if (reduce) { fade.value = withTiming(0, { duration: ms.exit, easing: EASE_OUT }, f => { if (f) scheduleOnRN(done); }); return; }
    y.value = withTiming(open, { duration: ms.exit, easing: EASE_SHEET }, f => { if (f) scheduleOnRN(done); });
  };

  // swipe down = cancel; nothing fires (silence is the neutral channel). Grabbed mid-rise, it takes over
  // from where it is; up is rubber-banded; a flick or 90 pt closes, carrying the flick's speed.
  const from = useSharedValue(0);
  const dismiss = Gesture.Pan().activeOffsetY(12)
    .onBegin(() => { from.value = y.value; })
    .onUpdate(e => { const n = from.value + e.translationY; y.value = n < 0 ? n * 0.2 : n; air.value = driftLevel(e.velocityY); })
    .onFinalize(() => { air.value = -1; })
    .onEnd(e => {
      if (y.value > 90 || e.velocityY > 800) y.value = withSpring(open, { ...spring.sheet, velocity: e.velocityY }, f => { if (f) scheduleOnRN(done); });
      else y.value = withSpring(0, { ...spring.sheet, velocity: e.velocityY });   // clamped: never lifts off the bottom edge
    });
  const sheetStyle = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ translateY: y.value }] }));

  // the wheel: drag the price to roll by increments; a tick per step
  // The base is read once at touch-down into a shared value: React re-renders on every step and hands the
  // gesture a new closure, which must not move the base mid-drag (it compounded, two steps per step).
  const dragSteps = useSharedValue(stepsNow), base = useSharedValue(stepsNow);
  const lift = useSharedValue(0);
  const wheel = Gesture.Pan().activeOffsetY([-6, 6]).enabled(phase === 'arming' && !closed)
    .onBegin(() => { base.value = dragSteps.value; lift.value = withSpring(-2, spring.settle); scheduleOnRN(feel.touch); })
    .onUpdate(e => {
      const n = Math.max(0, base.value + Math.round(-e.translationY / STEP_PT));
      if (n !== dragSteps.value) { dragSteps.value = n; scheduleOnRN(setSteps, n); scheduleOnRN(feel.tick); }   // per step, not per frame
    })
    .onFinalize(() => { lift.value = withSpring(0, spring.settle); });
  useEffect(() => { dragSteps.value = stepsNow; if (phase === 'arming') setStamp(null); }, [stepsNow]);   // a reset moves the base too; a new number clears an old line

  const place = async () => {
    if (!once.deposit) { setPhase('deposit'); return; }
    setPhase('inflight'); setStamp(null);
    const key = `${ME}-${car.id}-${Date.now()}`;
    let ack: Ack;
    try { ack = await getServer().bid({ lotId: car.id, bidder: ME, amount, max: ceiling, key }); }
    catch { setPhase('arming'); setStamp('Not sent'); return; }   // negative path: silent; the line says what happened
    if (ack.ok) {
      // the high-bidder moment, all inside 100 ms: the thud, the heavy impact and the punch on the ack;
      // 90 ms later the lead chime, the success haptic and the leading mark on one frame
      feel.landed(); setPhase('landed'); setPunch(Date.now());
      later(() => { feel.lead(); setLead(true); }, ms.lead);
      if (AUCTION_URL) void registerPush();   // the first accepted bid asks for push; once registered this is a no-op
      const blue = inLastTwoMinutes(ack.lot.closesAt, Date.now());
      if (blue && !once.sawRefill) { once.sawRefill = true; setTeach(true); later(() => setTeach(false), theme.ms.overlay); }
      later(close, blue ? theme.ms.overlay + 300 : 900);
    } else if (ack.reason === 'closed') {
      // the one rejection the doctrine keeps (decisions, Bid sheet row): price back, warning haptic, one stamp
      setPhase('rejected'); feel.rejected();
      setStamp(`Closed ${(ack.lateByMs / 1000).toFixed(1)} s before your bid`);
    } else {
      // outbid during flight, or under the ask: the price rolls to the new number. Silence is the punishment.
      setPhase('arming'); setSteps(0); setCeil(0);
    }
  };

  const confirmDeposit = async () => {
    const r = await takeDeposit();
    if (r === 'cancelled') { setPhase('arming'); return; }              // silence is the punishment
    if (r === 'failed') { setPhase('arming'); return; }                   // silent too: the button is still there
    setLand(Date.now()); feel.touch(); setPhase('arming'); later(place, ms.land);   // the line lands, then the bid goes
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={phase === 'inflight' ? undefined : close} accessibilityLabel="Close" />
      <GestureDetector gesture={dismiss}>
        <Animated.View style={[s.sheet, { height: open + 40, bottom: -40, paddingBottom: insets.bottom + 12 + 40 }, sheetStyle]}>
          <Feather />
          <Sky radius={28} low />
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
                  <Price hammer={amount} total={total} ink={theme.color.ink} size={60} punchKey={punch} lift={lift} leading={lead} centered />
                </Animated.View>
              </GestureDetector>
              {stamp ? <Stamp key={stamp} text={stamp} /> : <Label style={{ marginTop: 6 }}>{`+ $${dollars(increment(amount))}`}</Label>}

              {/* the second wheel: an advanced option, one faint word until it is wanted */}
              {!ceilOpen ? (
                <Pressable onPress={() => { setCeilOpen(true); feel.select(); }} hitSlop={10} style={{ paddingVertical: theme.space.s }} accessibilityRole="button" accessibilityLabel={ceilSteps ? `Ceiling up to ${dollars(ceiling)} dollars` : 'Set a ceiling'}>
                  <Label ink={ceilSteps ? theme.color.ink : theme.color.faint}>{ceilSteps ? `up to $${dollars(ceiling)}` : 'ceiling'}</Label>
                </Pressable>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.ceil} decelerationRate="fast" style={{ flexGrow: 0, alignSelf: 'stretch' }}>
                  {Array.from({ length: 7 }, (_, i) => i).map(i => {
                    const v = i === 0 ? amount : roll(amount, true, i - 1);
                    const on = i === ceilSteps;
                    return (
                      <Pressable key={i} onPress={() => { setCeil(i); feel.select(); setCeilOpen(false); }} style={s.ceilItem} hitSlop={8} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={i === 0 ? 'No ceiling' : `up to ${dollars(v)} dollars`}>
                        <Text style={[s.ceilText, on && s.ceilTextOn]}>{i === 0 ? 'no ceiling' : `up to $${dollars(v)}`}</Text>
                        {on && <View style={s.ceilMark} />}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              <View style={s.foot}>
                <BidButton phase={phase} hold={hold} disabled={closed || phase === 'rejected'} onBid={place} />
                {/* the line's room is always kept, so the button never moves under the thumb when it lands */}
                <View style={s.depositRoom}>
                  {landKey !== undefined && <Landing animate={landKey > 0}><Label style={{ alignSelf: 'center' }}>${DEPOSIT} held · back if you lose</Label></Landing>}
                </View>
              </View>
            </>
          )}
        </Animated.View>
      </GestureDetector>
      {teach && <Teach />}
    </View>
  );
}

/** One button. Tap bids; over 2× it needs a 600 ms hold that fills it; in flight it is a ring. An ink cloud:
    it sinks 2.5 pt into the sheet on touch-down (UI thread), its shade shortening, and rises on the 0.65
    spring when the press completes, without overshoot when the thumb slides off. The puff on touch-down,
    the breath on release; the thud, the lead and the mark stay the ack's, untouched. Disabled: no sink. */
function BidButton({ phase, hold, disabled, onBid }: { phase: Phase; hold: boolean; disabled: boolean; onBid: () => void }) {
  const reduce = useReducedMotion();
  const fill = useSharedValue(0), k = useSharedValue(0);
  const fire = () => { feel.holdDone(); onBid(); };
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const sinkStyle = useAnimatedStyle(() => reduce
    ? { opacity: 1 - 0.18 * Math.max(0, k.value) }
    : { transform: [{ translateY: cloud.sinkY * k.value }, { scale: 1 - (1 - cloud.sinkScale) * k.value }] });
  const busy = phase === 'inflight';
  const landed = phase === 'landed';
  const live = !disabled && !busy && !landed;
  const sink = () => { 'worklet'; k.value = withTiming(1, { duration: ms.sink, easing: EASE_OUT }); scheduleOnRN(feel.puff); };
  const rise = (ok: boolean) => { 'worklet'; k.value = withSpring(0, ok ? spring.rise : spring.cancel); if (ok) scheduleOnRN(feel.rise); };
  const g = hold
    // the hold fills on the UI thread from touch-down (linear: it is a progress); letting go drains it fast
    ? Gesture.LongPress().minDuration(theme.ms.hold + 50)
      .onBegin(() => { sink(); fill.value = withTiming(1, { duration: theme.ms.hold, easing: Easing.linear }, f => { if (f) scheduleOnRN(fire); }); })
      .onFinalize((_e, ok) => { rise(ok); cancelAnimation(fill); fill.value = withTiming(0, { duration: ms.press, easing: EASE_OUT }); })
    // feedback on press-in, commit on release
    : Gesture.Tap().maxDuration(60_000).maxDistance(24).onBegin(() => { sink(); }).onFinalize((_e, ok) => { rise(ok); }).onEnd(() => { scheduleOnRN(onBid); });
  return (
    <View>
      {live && <Underside k={k} reduce={reduce} />}
      <GestureDetector gesture={g.enabled(live)}>
        <Animated.View style={[s.btn, (disabled || landed) && s.btnOff, sinkStyle]} accessible accessibilityRole="button" accessibilityLabel={hold ? 'Bid, double tap and hold' : 'Bid'} accessibilityState={{ disabled: disabled || busy }}
          accessibilityActions={live ? [{ name: 'activate' }] : undefined} onAccessibilityAction={e => { if (e.nativeEvent.actionName === 'activate') onBid(); }}>
          <InkBody />
          {hold && <Animated.View style={[s.btnFill, fillStyle]} />}
          {busy ? <Spinner /> : landed ? <Tick /> : <Text style={s.btnText}>Bid</Text>}
        </Animated.View>
      </GestureDetector>
    </View>
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
      <PressCloud onPress={onConfirm} shade style={{ alignSelf: 'stretch', marginTop: theme.space.s }} bodyStyle={s.pay} accessibilityLabel={`Pay ${DEPOSIT} dollars with Apple Pay`}>
        <InkBody />
        <Text style={s.payText}>Pay</Text>
      </PressCloud>
      <Pressable onPress={onCancel} hitSlop={12}><Text style={s.cancel}>Not now</Text></Pressable>
    </View>
  );
}

/** The server's sentence lands like a stamp: pressed down from 1.08× in 160 ms. Silent; the warning
    haptic is the caller's, and only for a bid after close. Reduced motion: it fades in, no scale. */
function Stamp({ text }: { text: string }) {
  const reduce = useReducedMotion();
  const k = useSharedValue(0);
  useEffect(() => { k.value = withTiming(1, { duration: ms.stamp, easing: EASE_OUT }); }, []);
  const st = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ scale: reduce ? 1 : 1.08 - 0.08 * k.value }] }));
  return <Animated.View style={[{ marginTop: 6 }, st]} accessibilityLiveRegion="polite"><Label ink={theme.color.warn}>{text}</Label></Animated.View>;
}

/** A line that arrives because something just happened (the deposit, held): up 6 pt and in, 200 ms. */
function Landing({ animate, children }: { animate: boolean; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const k = useSharedValue(animate ? 0 : 1);
  useEffect(() => { if (animate) k.value = withTiming(1, { duration: ms.land, easing: EASE_OUT }); }, []);
  const st = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ translateY: reduce ? 0 : 6 * (1 - k.value) }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

/** The soft-close teach: a bid lands, the ring refills. 1.2 s, animated, once, ever. */
function Teach() {
  const [k, setK] = useState(0);
  useEffect(() => { const t = setTimeout(() => setK(1), 450); return () => clearTimeout(t); }, []);
  const o = useSharedValue(0);
  useEffect(() => { o.value = withTiming(1, { duration: 150, easing: EASE_OUT }); }, []);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View pointerEvents="none" style={[s.teach, st]}>
      <View style={s.teachRing}><Ring size={96} stroke={6} progress={k ? 1 : 0.35} blue refillKey={k} /></View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: theme.space.m, paddingTop: 10, alignItems: 'center' },
  grab: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: theme.color.line, marginBottom: theme.space.s },
  ringRow: { alignItems: 'center', marginBottom: 4 },
  wheel: { paddingVertical: 4, alignSelf: 'stretch', alignItems: 'center' },
  ceil: { gap: theme.space.m, paddingVertical: theme.space.s, paddingHorizontal: theme.space.s },
  ceilItem: { alignItems: 'center', justifyContent: 'center' },
  ceilText: { ...theme.type.sans, fontSize: 15, color: theme.color.faint, fontVariant: ['tabular-nums'] },
  ceilTextOn: { color: theme.color.ink, ...theme.type.sansBold },
  ceilMark: { width: 16, height: 2, borderRadius: 1, backgroundColor: theme.color.accent, marginTop: 5 },
  depositRoom: { height: 30, justifyContent: 'flex-end' },
  foot: { marginTop: 'auto', alignSelf: 'stretch', alignItems: 'stretch' },
  btn: { alignSelf: 'stretch', height: 56, borderRadius: 4, backgroundColor: theme.color.ink, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  btnOff: { opacity: 0.4 },
  btnFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: theme.color.cloud, opacity: 0.18 },
  btnText: { ...theme.type.sansBold, fontSize: 13, color: theme.color.cloud, letterSpacing: 2.4, textTransform: 'uppercase' },
  deposit: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: 6 },
  depositAmt: { fontFamily: theme.font.price, fontSize: 64, color: theme.color.ink, marginTop: 4 },
  depositLine: { ...theme.type.sans, fontSize: 15, color: theme.color.muted, marginBottom: 14 },
  pay: { alignSelf: 'stretch', height: 54, borderRadius: 4, backgroundColor: theme.color.ink, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  payText: { ...theme.type.sansBold, fontSize: 13, color: theme.color.cloud, letterSpacing: 2.4, textTransform: 'uppercase' },
  cancel: { ...theme.type.sans, fontSize: 14, color: theme.color.faint, marginTop: 8 },
  teach: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,14,30,0.35)' },
  teachRing: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(8,14,30,0.75)', alignItems: 'center', justifyContent: 'center' },
});
