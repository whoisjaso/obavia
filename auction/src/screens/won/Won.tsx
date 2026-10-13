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
import { PressCloud } from '../../components/Cloud';
import { Sky } from '../../components/Sky';
import { Button, Caps, Choice, Label, Page, Serif } from '../../components/Type';
import type { Car } from '../../data/cars';
import { dollars } from '../../engine/money';
import { feel } from '../../feel';
import { nextTile, outOfState, setSale, signedAll, useSale, type Tile } from '../../sale';
import { CLOUD_OUT, EASE_OUT, ms } from '../../motion';
import { once } from '../../store';
import { theme } from '../../theme';
import { IdScan, InsureScan } from './Scan';
import { SignDocs } from './SignDocs';
import { Pay } from './Pay';
import { Pickup } from './Pickup';
import { Plates } from './Plates';

type Screen = 'who' | 'steps' | Tile | 'pay' | 'pickup';

export function Won({ car, onDone, initial }: { car: Car; onDone: () => void; initial?: 'pickup' }) {
  const sale = useSale();
  const [screen, setScreen] = useState<Screen>(initial ?? 'who');
  const [lit, setLit] = useState(false);
  const flash = useSharedValue(0), confetti = useSharedValue(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (initial === 'pickup') {   // straight to the pass: no celebration, the buyer has been here before
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
  const doneNow = (sl: NonNullable<typeof sale>) => new Set<Tile>([
    ...(sl.id?.confirmed ? ['id' as const] : []), ...(sl.insured ? ['insure' as const] : []), ...(signedAll(sl) ? ['sign' as const] : []),
  ]);
  if (shownDone.current === null && sale) shownDone.current = initial === 'pickup' ? doneNow(sale) : new Set();
  useEffect(() => { if (screen === 'steps' && sale) shownDone.current = doneNow(sale); }, [screen, sale]);
  if (!sale) return null;
  const next = nextTile(sale);
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
        <Page foot={next === null ? <Button label="Back to the lane" onPress={onDone} /> : undefined}>
          {head}
          <View style={{ marginTop: theme.space.xl, alignItems: 'center', gap: theme.space.xs }}>
            {steps.map(t => {
              const live = t.key === next, locked = !t.done && !live;
              return (
                <Lift key={t.key} on={live} after={drew ? TICK_AFTER + ms.green : 0}>
                  <PressCloud disabled={locked} onPress={() => { feel.select(); open(t.key); }} bodyStyle={s.step}
                    accessibilityState={{ selected: live }} accessibilityLabel={`${t.label}${t.done ? ', done' : live ? ', next' : ''}`}>
                    <Caps size={live ? 22 : 16} ink={locked ? theme.color.faint : theme.color.ink}>{t.label}</Caps>
                    {t.done && <Tick draw={!shownDone.current!.has(t.key)} />}
                    {live && <View style={s.underline} />}
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

      {initial !== 'pickup' && <Confetti t={confetti} />}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.cloud }, flashStyle]} />
    </View>
  );
}

function steps0(sale: NonNullable<ReturnType<typeof useSale>>, next: Tile | null): { key: Tile; label: string; done: boolean }[] {
  return [
    { key: 'id', label: 'ID', done: !!sale.id?.confirmed },
    { key: 'insure', label: 'Insure', done: !!sale.insured },
    { key: 'sign', label: 'Sign', done: signedAll(sale) },
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
    <Svg width={18} height={18} viewBox="0 0 26 26" style={{ position: 'absolute', right: -28, top: 14 }}>
      <APath d="M5 13.5 L10.5 19 L21 7.5" stroke={theme.color.good} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${TICK_LEN} ${TICK_LEN}`} animatedProps={props} />
    </Svg>
  );
}

/* The next tile lifts 4 pt once the check before it has drawn: Sequence (lego §4.6), the lit card at the
   front of the fan. Reduced motion: it stays level; the ink and the rule already say which one. */
function Lift({ on, after, children }: { on: boolean; after: number; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => { y.value = on && !reduce ? withDelay(after, withTiming(-4, { duration: ms.land, easing: EASE_OUT })) : withTiming(0, { duration: ms.land, easing: EASE_OUT }); }, [on, reduce]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

const s = StyleSheet.create({
  head: { alignItems: 'center', gap: 2 },
  thumb: { width: 120, height: 150, borderRadius: 14, overflow: 'hidden', backgroundColor: theme.color.well, marginBottom: theme.space.s },
  step: { alignItems: 'center', paddingVertical: 14 },
  underline: { width: 22, height: 2, borderRadius: 1, backgroundColor: theme.color.accent, marginTop: 6 },
});
