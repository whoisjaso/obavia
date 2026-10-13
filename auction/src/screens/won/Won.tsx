/* Won. The ring closes to a point; nothing for 200 ms; then the flash, the
   chime, the success haptic, confetti in ice and blue, in one tick (the
   100 ms rule). No thud here: the thud belongs to the bid's ack. Then one page at a
   time, each centered: who it is for; the four steps with the next one lit;
   each step on its own page. Back from a step: its check draws on in 240 ms
   (feel.step already rang as the step completed), then the next tile lifts
   4 pt, the front card of a Wallet fan. */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Confetti, burst } from '../../components/Confetti';
import { FAINT, Object3D } from '../../components/Object3D';
import type { SceneName } from '../../components/scene3d';
import { PressCloud } from '../../components/Cloud';
import { Sky } from '../../components/Sky';
import { Button, Caps, Choice, Label, Page, Serif } from '../../components/Type';
import type { Car } from '../../data/cars';
import { dollars } from '../../engine/money';
import { feel } from '../../feel';
import { nextTile, outOfState, platesWords, setSale, signedAll, useSale, type Tile } from '../../sale';
import { CLOUD_OUT, EASE_OUT, ms } from '../../motion';
import { once } from '../../store';
import { theme } from '../../theme';
import { IdScan, InsureScan } from './Scan';
import { SignDocs } from './SignDocs';
import { Pay } from './Pay';
import { Pickup } from './Pickup';
import { Plates } from './Plates';

type Screen = 'who' | 'steps' | Tile | 'pay' | 'pickup';

/** `initial`: 'pickup' lands on the pass (a push); 'steps' opens the finished sale to read (a tap on the car from
    the lane or Me after the start). Both skip the celebration: the buyer has been here before. */
export function Won({ car, onDone, initial }: { car: Car; onDone: () => void; initial?: 'pickup' | 'steps' }) {
  const sale = useSale();
  const [screen, setScreen] = useState<Screen>(initial ?? 'who');
  const [lit, setLit] = useState(false);
  const flash = useSharedValue(0), confetti = useSharedValue(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (initial) {   // straight to the pass or the steps: no celebration, the buyer has been here before
      if (sale && !sale.forWhom) setSale({ forWhom: 'me' });
      return;
    }
    // the ring has closed to a point; nothing for 200 ms; then all four in one tick: the chime and the
    // success haptic, the flash, the confetti (already mounted, released by its clock), and the page
    const t = setTimeout(() => {
      feel.done();
      if (!reduce) flash.value = withSequence(withTiming(1, { duration: 60, easing: EASE_OUT }), withTiming(0, { duration: 300, easing: EASE_OUT }));
      burst(confetti);
      setLit(true);
    }, ms.pause);
    return () => clearTimeout(t);
  }, []);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
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
    if (t === 'plates') setScreen(!sale.pay ? 'pay' : !sale.pickedUp ? 'pickup' : 'plates');
    else setScreen(t);
  };
  const back = () => setScreen('steps');

  const head = (
    <View style={s.head}>
      <View style={s.thumb}>{car.photos[0] && <Image source={car.photos[0].src} style={StyleSheet.absoluteFill} contentFit="cover" />}</View>
      <Serif size={40}>${dollars(sale.hammer)}</Serif>
      <Serif size={20} ink={theme.color.muted}>${dollars(sale.total)}</Serif>
    </View>
  );

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.sky }]}>
      <Sky />
      {screen === 'who' && lit && (
        <Page>
          {head}
          <Label style={{ marginTop: theme.space.xl }}>Who is it for?</Label>
          <View style={{ marginTop: theme.space.s }}>
            <Choice label="Me" onPress={() => { setSale({ forWhom: 'me' }); setScreen('steps'); }} size={30} />
            <Choice label="Someone else" onPress={() => { setSale({ forWhom: 'other' }); setScreen('steps'); }} size={30} />
          </View>
        </Page>
      )}

      {screen === 'steps' && (
        <Page foot={next === null ? <Button label="To the lane" onPress={onDone} /> : undefined}>
          {head}
          <View style={{ marginTop: theme.space.xl, alignItems: 'center', gap: theme.space.xs }}>
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
                      <View style={s.obj}><Object3D name={objectFor(t.key, sale)} height={live ? 52 : 40} strength={live ? 1 : FAINT} /></View>
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
        </Page>
      )}

      {/* the car is for the buyer: the licence the first bid confirmed comes back lit, one tap to "That's me" */}
      {screen === 'id' && <IdScan initial={sale.id ?? (sale.forWhom === 'me' ? once.licence ?? undefined : undefined)} onDone={id => { setSale({ id }); back(); }} />}
      {screen === 'insure' && <InsureScan vin={car.vin} onDone={back} />}
      {screen === 'sign' && <SignDocs docs={car.documents} onDone={back} onClose={back} />}
      {screen === 'pay' && <Pay onDone={() => setScreen('pickup')} />}
      {screen === 'pickup' && <Pickup car={car} onDone={() => setScreen(outOfState(sale) ? 'steps' : 'plates')} />}
      {screen === 'plates' && <Plates onBack={back} />}

      {!initial && <Confetti t={confetti} />}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.cloud }, flashStyle]} />
    </View>
  );
}

/* Each tile's object is the thing that tile opens: the licence for ID, the insurance card, the title for the
   documents. The last tile opens Pay, then Pickup, then Plates (or the title out of state), so its object
   follows: the coin until paid, the key until the car starts, then the plate (or the title). */
function objectFor(t: Tile, sale: NonNullable<ReturnType<typeof useSale>>): SceneName {
  if (t === 'id') return 'licence';
  if (t === 'insure') return 'insurance';
  if (t === 'sign') return 'title';
  if (sale.pickedUp) return outOfState(sale) ? 'title' : 'plate';   // started: the plate, whatever this phone remembers of Pay
  if (!sale.pay) return 'coin';
  return 'key';
}

function steps0(sale: NonNullable<ReturnType<typeof useSale>>, next: Tile | null): { key: Tile; label: string; done: boolean }[] {
  const over = !!sale.pickedUp;   // the car started at the lot: the sale is complete and every step is behind the buyer
  return [
    { key: 'id', label: 'ID', done: over || !!sale.id?.confirmed },
    { key: 'insure', label: 'Insure', done: over || !!sale.insured },
    { key: 'sign', label: 'Sign', done: over || signedAll(sale) },
    { key: 'plates', label: outOfState(sale) ? 'Title' : 'Plates', done: next === null },
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

const s = StyleSheet.create({
  head: { alignItems: 'center', gap: 2 },
  thumb: { width: 120, height: 150, borderRadius: 14, overflow: 'hidden', backgroundColor: theme.color.well, marginBottom: theme.space.s },
  step: { width: 248, paddingVertical: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  noun: { flex: 1, alignItems: 'flex-start' },
  nounRow: { flexDirection: 'row', alignItems: 'center' },   // the check touches the noun it ticks
  obj: { width: 84, height: 52, alignItems: 'flex-end', justifyContent: 'center' },   // one column for every object, so the nouns share a left edge
  underline: { width: 22, height: 2, borderRadius: 1, backgroundColor: theme.color.accent, marginTop: 6 },
  clock: { textAlign: 'left', marginTop: 4, lineHeight: 22 },   // the county's clock touching the noun it measures (lego §4.1); the date whole on its own line
});
