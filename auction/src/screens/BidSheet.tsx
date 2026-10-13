/* The Bid sheet: the bottom 40 %. The bid, the total under it, the increment,
   a second wheel labelled by its value ("up to $5,600"), one button: Bid.
   The drag only arms; the button bids; over 2× asks a 600 ms hold. The thump
   fires on the server's ack, never before. A bid that lands after close is
   the one place a sentence is allowed, and it is the server's sentence.
   The first Bid ever runs the phone (PhoneSignIn, the number and its code:
   Phase 2 sign-in), the licence (IdScan, full screen) and then the deposit,
   three screens, once (decisions §3.1, first bid). A 409 phone_required on
   a bid reopens the phone. The deposit back
   from Whop lands its held line with the success haptic and the air swell,
   one event, 200 ms before the bid goes; the thud is the bid's own ack.
   The first bid ever states the auction terms once (decisions §9 D10): four
   short lines under the price, and that Bid carries the terms version. */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '../components/Cloud';
import { Moment, useMoment } from '../components/Moment';
import { MOMENT_3D } from '../components/scene3d';
import { clock as momentClock } from '../components/hammer';
import { CloudButton } from '../components/CloudButton';
import { Sky } from '../components/Sky';
import { driftLevel, useDriftSound } from '../components/Sheet';
import { Price } from '../components/Price';
import { Ring } from '../components/Ring';
import { Label, Serif } from '../components/Type';
import type { Car } from '../data/cars';
import { inLastTwoMinutes, increment, needsHold, nextBid, roll } from '../engine/auction';
import { dollars, outTheDoor } from '../engine/money';
import type { Ack, Lot } from '../engine/server';
import { feel } from '../feel';
import { takeDeposit } from '../deposit';
import { registerPush } from '../push';
import { AUCTION_URL, DEPOSIT, ME, getServer, heldLot, lotName, once, peekBuyer, setBuyer } from '../store';
import { Refused, SAID, TERMS, TERMS_VERSION, retryUntil, said, secondsLeft } from '../engine/client';
import { go } from '../nav';
import { EASE_OUT, EASE_SHEET, cloud, ms, spring } from '../motion';
import { theme } from '../theme';
import { IdScan } from './won/Scan';
import { PhoneSignIn } from './won/Phone';

const STEP_PT = 28;
/** The coin moment, light on the sheet's sky (DOCTRINE §5: "the deposit coin coming back"); null when no render ships. */
const COIN = MOMENT_3D.coin?.light ?? null;
/** The coin's cell beside the 64 pt $250: the coin fills its middle 74 percent. */
const COIN_H = 88;
/** How long the glass holds on the captured deposit: the coin's turn (400 ms) and one landing's worth of rest
    on its face, then the held line lands and the bid goes. No coin shipped: no hold. */
const COIN_HOLD = COIN ? momentClock(COIN).totalMs + ms.land : 0;
const TERMS_ROOM = 96;   // the four terms at 17 pt, read at arm's length (DOCTRINE §4.3): five lines on a 393 phone
const AIR = 64;          // the 17 pt words, the held line and the air above the cloud's crowns: everything fits at rest, nothing touches
type Phase = 'arming' | 'phone' | 'id' | 'deposit' | 'inflight' | 'landed' | 'rejected';

export function BidSheet({ car, lot, now, steps, onClose }: { car: Car; lot: Lot; now: number; steps: number; onClose: () => void }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // the terms read: shown when the Worker has not stamped the terms on this buyer (or has not said yet), and
  // again on a 409. Read once at open so the lines do not leave while the bid lands. Its Bid sends the version.
  const [terms, setTerms] = useState<number | undefined>(() => (peekBuyer().termsCurrent === true ? undefined : 0));
  // the four lines take more room than the max-bid word they replace: the sheet stands taller while they show
  const open = height * 0.46 + AIR + insets.bottom + (terms !== undefined ? TERMS_ROOM : 0);
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
  const [captured, setCaptured] = useState(false);   // the deposit just captured: the coin turns beside the $250 before the line lands
  const [stamp, setStamp] = useState<string | null>(null);
  // too_many_bids: when the Worker's Retry-After lifts; the seconds left count down beside the stamp and Bid
  // stays off until they reach 0. one_open_bid: the car the buyer already holds, the stamp's tap
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const [left, setLeft] = useState(0);
  const [held, setHeld] = useState<{ lotId: string; screen: 'lane' | 'won'; name?: string } | null>(null);
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
  // the countdown: whole seconds, read off the clock four times a second so the number never skips; at 0 the
  // stamp leaves and Bid comes back on its own (no sentence, the verb is the proof)
  useEffect(() => {
    if (retryAt === null) return;
    const tick = () => {
      const n = secondsLeft(retryAt, Date.now());
      setLeft(n);
      if (n === 0) { setRetryAt(null); setStamp(null); setPhase('arming'); }
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [retryAt]);
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
    if (peekBuyer().phoneVerified !== true) { setPhase('phone'); return; }   // the chain's first link: Bid, Phone, ID, Pay
    if (!once.deposit) { setPhase(once.licence ? 'deposit' : 'id'); return; }
    setPhase('inflight'); setStamp(null);
    const key = `${ME}-${car.id}-${Date.now()}`;
    let ack: Ack;
    try { ack = await getServer().bid({ lotId: car.id, bidder: ME, amount, max: ceiling, key, ...(terms !== undefined ? { terms: TERMS_VERSION } : {}) }); }
    catch (e) {
      // negative paths: silent; at most one line says what happened
      const code = e instanceof Refused ? e.code : '';
      if (code === 'phone_required') { setBuyer({ phoneVerified: false }); setPhase('phone'); return; }   // the number again, nothing else
      if (code === 'terms_required') { setBuyer({ termsCurrent: false }); setTerms(Date.now()); setPhase('arming'); return; }   // the read again, nothing else
      if (code === 'win_cap') { setBuyer({ winsLeft: 0 }); setPhase('rejected'); setStamp(SAID.win_cap); return; }
      if (code === 'too_many_bids') {
        // the Worker's 429: the words, the seconds beside them counting down, Bid off until they pass
        const r = e as Refused;
        setPhase('rejected'); feel.rejected(); setStamp(said(code)); setRetryAt(retryUntil(r.retryAfter, Date.now()));
        return;
      }
      if (code === 'one_open_bid') {
        // sim 03: one car until the first is paid. The car already held sits beside the words and is the tap
        const r = e as Refused;
        if (typeof r.open === 'number') setBuyer({ openBids: r.open });
        const h = heldLot(getServer().all(), ME, car.id);
        setHeld(h ? { lotId: h.lot.id, screen: h.screen, name: lotName(h.lot) } : null);
        setPhase('rejected'); feel.rejected(); setStamp(said(code));
        return;
      }
      if (code === 'deposit') { once.deposit = false; setPhase('deposit'); return; }
      setPhase('arming'); setStamp(SAID.not_sent); return;
    }
    setBuyer({ termsCurrent: true });   // the lot answered: the Worker stamped the terms with this bid
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

  // the number proved: the chain goes on where it left off (the licence and the deposit the first time; the bid itself after)
  const phoned = () => {
    if (!once.deposit) { setPhase(once.licence ? 'deposit' : 'id'); return; }
    setPhase('arming'); later(place, ms.land);
  };

  const confirmDeposit = async () => {
    const r = await takeDeposit();
    if (r === 'cancelled') { setPhase('arming'); return; }              // silence is the punishment
    if (r === 'failed') { setPhase('arming'); return; }                   // silent too: the button is still there
    // the capture lands: the coin turns once beside the $250 (the Deposit's moment); then the line lands
    // (feel.held on its first frame), then the bid goes
    setCaptured(true);
    later(() => { setLand(Date.now()); setPhase('arming'); later(place, ms.land); }, COIN_HOLD);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={phase === 'inflight' ? undefined : close} accessibilityLabel="Close" />
      <GestureDetector gesture={dismiss}>
        <Animated.View style={[s.sheet, { height: open + 40, bottom: -40, paddingBottom: insets.bottom + 12 + 40 }, sheetStyle]}>
          <Feather />
          <Sky radius={28} low drag={y} />
          <View style={s.grab} />
          {phase === 'deposit' ? (
            <Deposit captured={captured} onConfirm={confirmDeposit} onCancel={() => setPhase('arming')} />
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
              {stamp ? (
                <Stamp key={stamp} text={stamp} number={retryAt !== null ? `${left} s` : undefined} name={held?.name}
                  onPress={held ? () => { go({ screen: held.screen, lotId: held.lotId }); close(); } : undefined} />
              ) : <Label style={{ marginTop: 6 }}>{`+ $${dollars(increment(amount))}`}</Label>}

              {/* the first bid ever: the four terms in the ceiling's place (the ceiling is not relevant yet) */}
              {terms !== undefined ? (
                <Landing key={terms} animate={terms > 0}><Terms /></Landing>
              ) : /* the second wheel: an advanced option, one faint word until it is wanted */ !ceilOpen ? (
                <Pressable onPress={() => { setCeilOpen(true); feel.select(); }} hitSlop={10} style={{ paddingVertical: theme.space.xs }} accessibilityRole="button" accessibilityLabel={ceilSteps ? `Max bid up to ${dollars(ceiling)} dollars` : 'Set a max bid'}>
                  {/* "max bid": the buyer's own word for it (eBay's); "ceiling" was the engine's */}
                  <Label ink={ceilSteps ? theme.color.ink : theme.color.faint}>{ceilSteps ? `up to $${dollars(ceiling)}` : 'max bid'}</Label>
                </Pressable>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.ceil} decelerationRate="fast" style={{ flexGrow: 0, flexShrink: 0, alignSelf: 'stretch' }}>
                  {Array.from({ length: 7 }, (_, i) => i).map(i => {
                    const v = i === 0 ? amount : roll(amount, true, i - 1);
                    const on = i === ceilSteps;
                    return (
                      <Pressable key={i} onPress={() => { setCeil(i); feel.select(); setCeilOpen(false); }} style={s.ceilItem} hitSlop={8} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={i === 0 ? 'No max bid' : `up to ${dollars(v)} dollars`}>
                        <Text style={[s.ceilText, on && s.ceilTextOn]}>{i === 0 ? 'no max' : `up to $${dollars(v)}`}</Text>
                        {on && <View style={s.ceilMark} />}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              <View style={s.foot}>
                <BidButton phase={phase} hold={hold} disabled={closed || phase === 'rejected'} onBid={place} landedKey={punch} />
                {/* the line's room is always kept, so the button never moves under the thumb when it lands */}
                <View style={s.depositRoom}>
                  {landKey !== undefined && <Landing animate={landKey > 0} onLand={feel.held}><Label style={{ alignSelf: 'center', letterSpacing: 1 }}>${DEPOSIT} held · back if you lose</Label></Landing>}
                </View>
              </View>
            </>
          )}
        </Animated.View>
      </GestureDetector>
      {teach && <Teach />}
      {/* the first bid: the phone, then the licence, then the deposit; the sheet waits under them */}
      {phase === 'phone' && <PhoneSignIn onDone={phoned} onCancel={() => setPhase('arming')} />}
      {phase === 'id' && <IdScan onDone={id => { once.licence = id; setPhase('deposit'); }} onCancel={() => setPhase('arming')} />}
    </View>
  );
}

/** One button: the 3D cloud (components/CloudButton). Tap bids; over 2x it needs a 600 ms hold that fills a
    quiet rule under the word; in flight the word becomes a ring, on the ack a tick. The ack's thud and heavy
    impact are the bid's own (feel.landed); the cloud adds the swell, the air ring and the air (cloud-landed)
    on that same frame. Disabled: no sink. */
function BidButton({ phase, hold, disabled, onBid, landedKey }: { phase: Phase; hold: boolean; disabled: boolean; onBid: () => void; landedKey?: number }) {
  const busy = phase === 'inflight';
  const landed = phase === 'landed';
  const live = !disabled && !busy && !landed;
  return (
    <CloudButton label="Bid" onPress={live ? onBid : undefined} disabled={disabled} holdMs={hold ? theme.ms.hold : undefined}
      content={busy ? <Spinner /> : landed ? <Tick /> : undefined} landedKey={landedKey} landedFeel="sound" swellOnDone={false}
      accessibilityLabel={hold ? 'Bid, double tap and hold' : 'Bid'} />
  );
}

function Spinner() {
  const r = useSharedValue(0);
  useEffect(() => { r.value = withRepeat(withTiming(360, { duration: 800, easing: Easing.linear }), -1); return () => cancelAnimation(r); }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return (
    <Animated.View style={st}>
      <Svg width={26} height={26}><Circle cx={13} cy={13} r={10} stroke={theme.color.ink} strokeWidth={2.5} fill="none" strokeDasharray="44 20" strokeLinecap="round" /></Svg>
    </Animated.View>
  );
}
function Tick() {
  return <Svg width={26} height={26} viewBox="0 0 26 26"><Path d="M5 13.5 L10.5 19 L21 7.5" stroke={theme.color.ink} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

/** The one slow moment, Apple's shape: $250 · refunded if you lose. Once, ever. The coin is not on the glass
    until the deposit exists (lego §4.7, absence); as the capture lands it comes back and settles face up touching
    the $250 (§4.1), one turn of 400 ms, and rests there while the Pay verb leaves (its room kept, so the number
    never moves). Reduced motion: the resting coin appears at once. No new sound: the held line's feel.held is
    the moment's body proof, as before. */
function Deposit({ captured, onConfirm, onCancel }: { captured: boolean; onConfirm: () => void; onCancel: () => void }) {
  const reduce = useReducedMotion();
  const { f, onReady, begin } = useMoment(COIN, reduce, 'hidden');   // not on the glass until the deposit exists
  useEffect(() => { if (captured) return begin(); }, [captured]);
  return (
    <View style={s.deposit}>
      <Label>Deposit</Label>
      <View style={s.depositRow}>
        <Moment m={COIN} f={f} height={COIN_H} onReady={onReady} style={s.coin} testID="coin-sheet" />
        <Text style={s.depositAmt}>${DEPOSIT}</Text>
        <View style={{ width: COIN_H * 0.5 }} />
      </View>
      <Text style={s.depositLine}>refunded if you lose</Text>
      <View style={captured ? s.gone : null} pointerEvents={captured ? 'none' : 'auto'} importantForAccessibility={captured ? 'no-hide-descendants' : 'auto'} accessibilityElementsHidden={captured}>
        <CloudButton label="Pay" onPress={captured ? undefined : onConfirm} style={{ marginTop: theme.space.s }} accessibilityLabel={`Pay ${DEPOSIT} dollars with Apple Pay`} />
        <Pressable onPress={onCancel} hitSlop={12} accessibilityRole="button" accessibilityLabel="Not now" style={{ alignSelf: 'center' }}><Text style={s.cancel}>Not now</Text></Pressable>
      </View>
    </View>
  );
}

/** D10's four terms, once: four short lines, sans (no money in them, so no Bodoni), no explanation. */
function Terms() {
  return (
    <View style={s.terms} accessible accessibilityLabel={`Terms. ${TERMS.join('. ')}.`}>
      {TERMS.map(t => <Text key={t} style={s.termsLine}>{t}</Text>)}
    </View>
  );
}

/** The server's sentence lands like a stamp: pressed down from 1.08× in 160 ms. Silent; the warning
    haptic is the caller's. Reduced motion: it fades in, no scale. Two pieces may touch the words (Lego §4.1):
    `number`, the seconds left on a 429, counting down in the same ink; `name`, the car already held on a
    one_open_bid, in Bodoni (a name), and then the whole row is the tap that goes to that car. */
function Stamp({ text, number, name, onPress }: { text: string; number?: string; name?: string; onPress?: () => void }) {
  const reduce = useReducedMotion();
  const k = useSharedValue(0);
  useEffect(() => { k.value = withTiming(1, { duration: ms.stamp, easing: EASE_OUT }); }, []);
  const st = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ scale: reduce ? 1 : 1.08 - 0.08 * k.value }] }));
  const row = (
    <View style={s.stampRow}>
      <Label ink={theme.color.warn}>{text}</Label>
      {number !== undefined && <Label ink={theme.color.warn} style={s.stampNumber}>{number}</Label>}
      {name !== undefined && <Serif size={22} ink={theme.color.ink} style={s.stampName}>{name}</Serif>}
    </View>
  );
  return (
    <Animated.View style={[{ marginTop: 6 }, st]} accessibilityLiveRegion="polite">
      {onPress ? (
        <Pressable onPress={() => { feel.select(); onPress(); }} hitSlop={12} accessibilityRole="button" accessibilityLabel={name ? `${text}. Open the ${name}` : text}>{row}</Pressable>
      ) : row}
    </Animated.View>
  );
}

/** A line that arrives because something just happened (the deposit, held): up 6 pt and in, 200 ms.
    `onLand` fires on the frame it starts, so the body hears it with the eye. */
function Landing({ animate, onLand, children }: { animate: boolean; onLand?: () => void; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const k = useSharedValue(animate ? 0 : 1);
  useEffect(() => { if (animate) { k.value = withTiming(1, { duration: ms.land, easing: EASE_OUT }); onLand?.(); } }, []);
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
  ceil: { gap: theme.space.m, paddingVertical: theme.space.xs, paddingHorizontal: theme.space.s },
  ceilItem: { alignItems: 'center', justifyContent: 'center' },
  ceilText: { ...theme.type.sans, fontSize: 17, color: theme.color.faint, fontVariant: ['tabular-nums'] },
  ceilTextOn: { color: theme.color.ink, ...theme.type.sansBold },
  ceilMark: { width: 16, height: 2, borderRadius: 1, backgroundColor: theme.color.accent, marginTop: 5 },
  stampRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'center', columnGap: 10, rowGap: 2, minHeight: 28, paddingHorizontal: theme.space.s },   // a long name drops under the words, still touching
  stampNumber: { ...theme.type.sansBold, fontVariant: ['tabular-nums'], minWidth: 40, textAlign: 'left' },   // the digits hold their place as they fall
  stampName: { letterSpacing: 0, flexShrink: 1 },
  terms: { alignItems: 'center', gap: 4, paddingTop: theme.space.xs },
  termsLine: { ...theme.type.sans, fontSize: 17, lineHeight: 22, color: theme.color.inkSoft, textAlign: 'center' },   // arm's length: 17 pt, 8.6:1
  depositRoom: { height: 34, justifyContent: 'flex-end' },
  foot: { marginTop: 'auto', paddingTop: theme.space.m, alignSelf: 'stretch', alignItems: 'stretch' },   // the crowns rise into this, never into the words above
  deposit: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: 6 },
  depositRow: { flexDirection: 'row', alignItems: 'center' },   // the coin touching the $250; a spacer half its width keeps the number centred
  coin: { marginRight: -6 },   // the cell's transparent edge overlaps the gap, so the coin's rim touches the figure
  depositAmt: { fontFamily: theme.font.price, fontSize: 64, color: theme.color.ink, marginTop: 4 },
  gone: { opacity: 0 },   // the verb has been pressed and the money taken: it leaves, its room stays
  depositLine: { ...theme.type.sans, fontSize: 17, color: theme.color.muted, marginBottom: 14 },
  cancel: { ...theme.type.sans, fontSize: 17, color: theme.color.faint, marginTop: 8, paddingVertical: 6 },
  teach: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,14,30,0.35)' },
  teachRing: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(8,14,30,0.75)', alignItems: 'center', justifyContent: 'center' },
});
