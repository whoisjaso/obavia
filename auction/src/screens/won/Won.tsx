/* Won. The ring closes to a point; nothing for 200 ms; then the flash, the
   chime, the success haptic, confetti in ice and blue, in one tick (the
   100 ms rule). No thud here: the thud belongs to the bid's ack. Then one page at a
   time, each centered: who it is for; the four steps with the next one lit;
   each step on its own page. */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Confetti, burst } from '../../components/Confetti';
import { Button, Caps, Choice, Label, Page, Serif } from '../../components/Type';
import type { Car } from '../../data/cars';
import { dollars } from '../../engine/money';
import { feel } from '../../feel';
import { nextTile, outOfState, setSale, useSale, type Tile } from '../../sale';
import { EASE_OUT, ms } from '../../motion';
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
  if (!sale) return null;
  const next = nextTile(sale);
  const steps: { key: Tile; label: string; done: boolean }[] = [
    { key: 'id', label: 'ID', done: !!sale.id?.confirmed },
    { key: 'insure', label: 'Insure', done: !!sale.insured },
    { key: 'sign', label: 'Sign', done: !!(sale.signed.guide && sale.signed.bill && sale.signed.title) },
    { key: 'plates', label: outOfState(sale) ? 'Title' : 'Plates', done: next === null },
  ];
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
                <Pressable key={t.key} disabled={locked} onPress={() => { feel.select(); open(t.key); }} style={s.step}
                  accessibilityRole="button" accessibilityState={{ disabled: locked, selected: live }} accessibilityLabel={`${t.label}${t.done ? ', done' : live ? ', next' : ''}`}>
                  <Caps size={live ? 22 : 16} ink={locked ? theme.color.faint : theme.color.ink}>{t.label}</Caps>
                  {t.done && <Tick />}
                  {live && <View style={s.underline} />}
                </Pressable>
              );
            })}
          </View>
          {next === null && outOfState(sale) && <Label style={{ marginTop: theme.space.l }}>Plates come from {sale.id?.state}</Label>}
        </Page>
      )}

      {screen === 'id' && <IdScan onDone={back} />}
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

function Tick() {
  return <Svg width={18} height={18} viewBox="0 0 26 26" style={{ position: 'absolute', right: -28, top: 14 }}><Path d="M5 13.5 L10.5 19 L21 7.5" stroke={theme.color.good} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

const s = StyleSheet.create({
  head: { alignItems: 'center', gap: 2 },
  thumb: { width: 120, height: 150, borderRadius: 14, overflow: 'hidden', backgroundColor: theme.color.well, marginBottom: theme.space.s },
  step: { alignItems: 'center', paddingVertical: 14 },
  underline: { width: 22, height: 2, borderRadius: 1, backgroundColor: theme.color.accent, marginTop: 6 },
});
