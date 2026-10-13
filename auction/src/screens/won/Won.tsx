/* Won. The ring closes to a point; the hammer hangs raised over its cloud for 100 ms; it falls for 100 ms and
   strikes: the chime, the success haptic, the puff opening under the head and the page settling in beneath it,
   all on the contact frame (the 100 ms rule; the strike is the frame's own callback, Hammer.tsx). No thud here:
   the thud belongs to the bid's ack. No flash: the puff is the white. No confetti: the rectangles crossed the
   hammer at 0.8 to 1.2 s in the captures (October 13), a second celebration in a material that is not cloud; the
   puff is the one body proof (lego §1.2). The strike is the chest pattern (DOCTRINE §4 rule 14): the hammer hangs
   raised while the eye arrives (ms.build), holds still (ms.pause), falls and strikes; feel.win fires on the
   contact frame, once per car. Then the four steps settle in under the hammer resting in its cloud, the next one
   lit, centered; each step on its own page. "Me" is assumed (simplicity-audit change 6, October 13, 2026): the
   licence the first bid confirmed comes back lit; "Someone else" is the one faint word under the steps while the
   ID step is the live one, and opens the same facts page empty. Back from a step: its check draws on in 240 ms
   (feel.step already rang as the step completed), then the next tile lifts 4 pt, the front card of a Wallet fan.
   The last tile reads what it opens with its object (sale.ts tileWord): Pay with the coin, Keys with the key,
   Plates with the plate; the second number (the total) is Pay's and is not on this glass. */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HAMMER, HAMMER_FOOT, Hammer, fall, startFrame } from '../../components/Hammer';
import { clock as hammerClock } from '../../components/hammer';
import { FAINT, Object3D } from '../../components/Object3D';
import type { SceneName } from '../../components/scene3d';
import { PressCloud } from '../../components/Cloud';
import { Sky } from '../../components/Sky';
import { Button, Caps, Label, Page, Serif } from '../../components/Type';
import type { Car } from '../../data/cars';
import { dollars } from '../../engine/money';
import { feel } from '../../feel';
import { nextTile, outOfState, platesWords, setSale, signedAll, tileWord, useSale, type Tile } from '../../sale';
import { CLOUD_OUT, EASE_OUT, ms } from '../../motion';
import { once } from '../../store';
import { theme } from '../../theme';
import { IdScan, InsureScan } from './Scan';
import { SignDocs } from './SignDocs';
import { Pay } from './Pay';
import { Pickup } from './Pickup';
import { Plates } from './Plates';

type Screen = 'steps' | Tile | 'pay' | 'pickup';

/** `initial`: 'pickup' lands on the pass (a push); 'steps' opens the finished sale to read (a tap on the car from
    the lane or Me after the start). Both skip the celebration: the buyer has been here before. */
export function Won({ car, onDone, initial }: { car: Car; onDone: () => void; initial?: 'pickup' | 'steps' }) {
  const sale = useSale();
  const [screen, setScreen] = useState<Screen>(initial ?? 'steps');
  const [lit, setLit] = useState(!!initial);   // the steps are on the glass: at once when read, else on the strike
  const celebrate = !initial;                  // the hammer, once: a buyer who has been here before gets the steps
  const [hammerOn, setHammerOn] = useState(celebrate);   // the hammer rests over the first steps page only; a step opened puts it away
  const reduce = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const hammerH = screenH >= 900 ? HAMMER_H : HAMMER_H_SHORT;
  const hammer = useSharedValue(startFrame(reduce));   // the frame clock: raised at 0, the still at 23
  const ready = useRef(false), waiting = useRef<null | (() => void)>(null);
  const onReady = () => { ready.current = true; const go = waiting.current; waiting.current = null; go?.(); };
  useEffect(() => {
    if (sale && !sale.forWhom) setSale({ forWhom: 'me' });   // "Me" is assumed; "Someone else" is the faint word under the steps
    if (!celebrate) return;   // straight to the pass or the steps: no celebration, the buyer has been here before
    // the ring has closed to a point. The chest pattern: the hammer hangs raised for the build, holds still for
    // the pause, then falls, and the strike (frame 6, the sheet's own callback) is the one tick: the chime, the
    // air, the heavy impact, the success haptic 90 ms behind (feel.win), and the steps settling in under the
    // puff. Reduced motion: the still, the sound and the haptic at build plus pause.
    // The fall waits for the sheet to be on the glass, at most HAMMER_WAIT more, so the strike is never a sound
    // over an empty sky; with no render shipped the strike alone fires at build plus pause.
    let begun = false;
    const strike = () => { feel.win(); setLit(true); };
    const begin = () => { if (begun) return; begun = true; fall(hammer, reduce, strike); };
    const lead = ms.build + (HAMMER && !reduce ? ms.pause - hammerClock(HAMMER).contactMs : ms.pause);
    const t = setTimeout(() => { if (ready.current || !HAMMER) begin(); else waiting.current = begin; }, lead);
    const cap = setTimeout(begin, lead + HAMMER_WAIT);
    return () => { clearTimeout(t); clearTimeout(cap); waiting.current = null; };
  }, []);
  // the checks already on the glass the last time the steps showed: only a newly done step draws its check
  const shownDone = useRef<Set<Tile> | null>(null);
  const doneNow = (sl: NonNullable<typeof sale>) => new Set<Tile>(steps0(sl, nextTile(sl)).filter(t => t.done).map(t => t.key));
  if (shownDone.current === null && sale) shownDone.current = initial ? doneNow(sale) : new Set();
  useEffect(() => { if (screen === 'steps' && sale) shownDone.current = doneNow(sale); }, [screen, sale]);
  if (!sale) return null;
  const next = nextTile(sale);
  const reading = initial === 'steps';   // the finished sale, opened to read: nothing to do but go back to the lane
  const drew = steps0(sale, next).some(t => t.done && !shownDone.current!.has(t.key));
  const steps = steps0(sale, next);
  const open = (t: Tile) => {
    setHammerOn(false);
    if (t === 'plates') setScreen(!sale.pay ? 'pay' : !sale.pickedUp ? 'pickup' : 'plates');
    else setScreen(t);
  };
  const back = () => setScreen('steps');

  // the struck price on the car it struck (lego §4.1); one number: the total is Pay's
  const head = (
    <View style={s.head}>
      <View style={s.thumb}>{car.photos[0] && <Image source={car.photos[0].src} style={StyleSheet.absoluteFill} contentFit="cover" />}</View>
      <Serif size={40}>${dollars(sale.hammer)}</Serif>
    </View>
  );
  // someone else's car: the facts page opens empty (no licence of theirs on this phone yet)
  const other = () => { feel.select(); setSale({ forWhom: 'other', id: undefined }); setHammerOn(false); setScreen('id'); };

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.sky }]}>
      <Sky />
      {/* the hammer over its cloud, above where the car and the struck price will settle in (lego §4.1, touching:
          the hammer lands on the car it sold; §4.6, sequence: the page appears under the strike) */}
      {screen === 'steps' && hammerOn && (
        <View pointerEvents="none" style={[s.hammerBox, { top: insets.top + theme.space.m }]}>
          <Hammer f={hammer} height={hammerH} onReady={onReady} />
        </View>
      )}
      {screen === 'steps' && lit && (
        <Page align={hammerOn ? 'flex-start' : 'center'} top={hammerOn ? <View style={{ height: Math.round(hammerH * HAMMER_FOOT) }} /> : undefined}
          foot={next === null ? <Button label="To the lane" onPress={onDone} /> : undefined}>
          {head}
          <View style={{ marginTop: hammerOn ? theme.space.m : theme.space.xl, alignItems: 'center', gap: theme.space.xs }}>
            {steps.map(t => {
              const live = t.key === next, locked = !t.done && !live;
              // a done step is finished: it keeps its look (the tick) but is not a control and is not read, so
              // the lit step (or To the lane) is the first thing a thumb or a screen reader meets. Opened to
              // read after the start, the Plates tile carries the ring's word (the county's clock) under its noun
              const clock = reading && t.done && t.key === 'plates' && !outOfState(sale) ? platesWords(sale) : null;
              return (
                <Lift key={t.key} on={live} after={drew ? TICK_AFTER + ms.green : 0} hidden={t.done && !clock}>
                  <PressCloud disabled={locked || t.done} onPress={() => { feel.select(); open(t.key); }} bodyStyle={s.step}
                    accessibilityState={{ selected: live }} accessibilityLabel={`${t.label}${t.done ? ', done' : live ? ', next' : ''}${clock ? `, ${clock}` : ''}`}>
                    {/* the step's object touching its one noun (lego §4.1): the lit one full strength, the rest faint */}
                    <View style={s.stepRow}>
                      {/* keyed by the object: when the money lands the coin leaves and the key arrives with its landed swell */}
                      <View style={s.obj}><Object3D key={objectFor(t.key, sale)} name={objectFor(t.key, sale)} height={live ? 52 : 40} strength={live ? 1 : FAINT} /></View>
                      <View style={s.noun}>
                        <View style={s.nounRow}>
                          <Caps size={live ? 22 : 17} ink={locked ? theme.color.faint : theme.color.ink}>{t.label}</Caps>
                          {t.done && <Tick draw={!shownDone.current!.has(t.key)} />}
                        </View>
                        {live && <View style={s.underline} />}
                        {clock && <Label style={s.clock}>{clock.replace(/^(\S+ \S+) /, '$1\n')}</Label>}
                      </View>
                    </View>
                  </PressCloud>
                </Lift>
              );
            })}
          </View>
          {next === null && outOfState(sale) && <Label style={{ marginTop: theme.space.l }}>Plates come from {sale.id?.state}</Label>}
          {/* the one faint word (one-action: hidden advanced), under the steps, while the ID step is the live one */}
          {next === 'id' && !reading && (
            <Pressable onPress={other} hitSlop={12} style={{ marginTop: theme.space.s }} accessibilityRole="button" accessibilityLabel="Someone else">
              <Text style={s.other}>Someone else</Text>
            </Pressable>
          )}
        </Page>
      )}

      {/* the car is for the buyer: the licence the first bid confirmed comes back lit, one tap to "That's me" */}
      {screen === 'id' && <IdScan initial={sale.id ?? (sale.forWhom === 'me' ? once.licence ?? undefined : undefined)} onDone={id => { setSale({ id }); back(); }} />}
      {screen === 'insure' && <InsureScan vin={car.vin} onDone={back} />}
      {screen === 'sign' && <SignDocs docs={car.documents} onDone={back} onClose={back} />}
      {screen === 'pay' && <Pay onDone={() => setScreen('pickup')} />}
      {screen === 'pickup' && <Pickup car={car} onDone={() => setScreen(outOfState(sale) ? 'steps' : 'plates')} />}
      {screen === 'plates' && <Plates onBack={back} />}

    </View>
  );
}

/* Each tile's object is the thing that tile opens: the licence for ID, the insurance card, the title for the
   documents. The last tile opens Pay, then Pickup, then Plates (or the title out of state), so its word and its
   object follow together (sale.ts tileWord): Pay with the coin until the money lands, Keys with the key until the
   car starts, then Plates with the plate (or Title with the title). */
function objectFor(t: Tile, sale: NonNullable<ReturnType<typeof useSale>>): SceneName {
  if (t === 'id') return 'licence';
  if (t === 'insure') return 'insurance';
  if (t === 'sign') return 'title';
  return tileWord(sale).object;
}

function steps0(sale: NonNullable<ReturnType<typeof useSale>>, next: Tile | null): { key: Tile; label: string; done: boolean }[] {
  const over = !!sale.pickedUp;   // the car started at the lot: the sale is complete and every step is behind the buyer
  return [
    { key: 'id', label: 'ID', done: over || !!sale.id?.confirmed },
    { key: 'insure', label: 'Insure', done: over || !!sale.insured },
    { key: 'sign', label: 'Sign', done: over || signedAll(sale) },
    { key: 'plates', label: tileWord(sale).word, done: next === null },
  ];
}

/* The check, drawn: the stroke runs from the short leg to the tip in 240 ms on the house out-curve (gentler
   than EASE_OUT, so the stroke is seen travelling), the way Apple
   Pay's tick writes itself. Already on the glass: drawn whole. Reduced motion: it fades in instead. */
const TICK_AFTER = 140;   // the steps page is still settling in: the stroke waits until the row is mostly opaque
const TICK_LEN = 24;   // the path's length in its own units (7.8 + 15.6, rounded up so the cap is covered)
const APath = Animated.createAnimatedComponent(Path);
function Tick({ draw }: { draw: boolean }) {
  const reduce = useReducedMotion();
  const k = useSharedValue(draw ? 0 : 1);
  useEffect(() => { if (draw) k.value = withDelay(TICK_AFTER, withTiming(1, { duration: ms.green, easing: CLOUD_OUT })); }, []);
  const props = useAnimatedProps(() => ({ strokeDashoffset: reduce ? 0 : TICK_LEN * (1 - k.value), strokeOpacity: reduce ? k.value : 1 }));
  return (
    <Svg width={18} height={18} viewBox="0 0 26 26" style={{ marginLeft: 10 }}>
      <APath d="M5 13.5 L10.5 19 L21 7.5" stroke={theme.color.good} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${TICK_LEN} ${TICK_LEN}`} animatedProps={props} />
    </Svg>
  );
}

/* The next tile lifts 4 pt once the check before it has drawn: Sequence (lego §4.6), the lit card at the
   front of the fan. Reduced motion: it stays level; the ink and the rule already say which one. */
function Lift({ on, after, hidden, children }: { on: boolean; after: number; hidden?: boolean; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => { y.value = on && !reduce ? withDelay(after, withTiming(-4, { duration: ms.land, easing: EASE_OUT })) : withTiming(0, { duration: ms.land, easing: EASE_OUT }); }, [on, reduce]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={st} aria-hidden={hidden || undefined} accessibilityElementsHidden={hidden} importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}>{children}</Animated.View>;
}

/* The hammer's cell on the glass: 150 pt on a tablet-tall screen, 110 on a phone, so the car, the price, the four
   steps and the one faint word fit under it on an 852 pt screen. The fall waits for the sheet at most this long. */
const HAMMER_H = 150, HAMMER_H_SHORT = 110, HAMMER_WAIT = 400;

const s = StyleSheet.create({
  hammerBox: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  head: { alignItems: 'center', gap: 2 },
  thumb: { width: 120, height: 150, borderRadius: 14, overflow: 'hidden', backgroundColor: theme.color.well, marginBottom: theme.space.s },
  step: { width: 248, paddingVertical: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  noun: { flex: 1, alignItems: 'flex-start' },
  nounRow: { flexDirection: 'row', alignItems: 'center' },   // the check touches the noun it ticks
  obj: { width: 84, height: 52, alignItems: 'flex-end', justifyContent: 'center' },   // one column for every object, so the nouns share a left edge
  underline: { width: 22, height: 2, borderRadius: 1, backgroundColor: theme.color.accent, marginTop: 6 },
  clock: { textAlign: 'left', marginTop: 4, lineHeight: 22 },   // the county's clock touching the noun it measures (lego §4.1); the date whole on its own line
  other: { ...theme.type.sans, fontSize: 17, color: theme.color.faint, textAlign: 'center', paddingVertical: 6 },
});
