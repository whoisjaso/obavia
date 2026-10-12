/* Won. The ring closes to a point; nothing for 200 ms; then the flash, the
   chime, the success haptic, confetti in ice and blue. The card flips: the photo
   shrinks to a thumbnail, "Who is it for?", then four tiles slide in with a
   60 ms stagger: ID · Insure · Sign · Plates (Title for an out-of-state
   licence). The next tile lifts 4 pt. Bid and total above, 2:1. */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeInRight, FadeOut, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Confetti } from '../../components/Confetti';
import { Price } from '../../components/Price';
import type { Car } from '../../data/cars';
import { feel } from '../../feel';
import { nextTile, outOfState, setSale, useSale, type Tile } from '../../sale';
import { theme } from '../../theme';
import { IdScan, InsureScan } from './Scan';
import { SignDocs } from './SignDocs';
import { Pay } from './Pay';
import { Pickup } from './Pickup';
import { Plates } from './Plates';

type Screen = 'who' | 'tiles' | Tile | 'pay' | 'pickup';

export function Won({ car, onDone }: { car: Car; onDone: () => void }) {
  const sale = useSale();
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>('who');
  const [lit, setLit] = useState(false);
  const flash = useSharedValue(0);
  useEffect(() => {
    const t = setTimeout(() => {
      flash.value = withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: 300 }));
      feel.done(); setLit(true);
      setTimeout(feel.landed, 150);   // one heavy, 0.35 s in
    }, 200);
    return () => clearTimeout(t);
  }, []);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  if (!sale) return null;
  const next = nextTile(sale);
  const tiles: { key: Tile; label: string; done: boolean }[] = [
    { key: 'id', label: 'ID', done: !!sale.id?.confirmed },
    { key: 'insure', label: 'Insure', done: !!sale.insured },
    { key: 'sign', label: 'Sign', done: !!(sale.signed.guide && sale.signed.bill && sale.signed.title) },
    { key: 'plates', label: outOfState(sale) ? 'Title' : 'Plates', done: next === null },
  ];
  const openTile = (t: Tile) => {
    feel.select();
    if (t === 'plates') setScreen(!sale.pay ? 'pay' : !sale.pickedUp ? 'pickup' : 'plates');
    else setScreen(t);
  };
  const back = () => setScreen('tiles');

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.sky }]}>
      {/* the header: thumbnail, the two numbers */}
      <Animated.View entering={FadeIn.delay(600).duration(300)} style={[s.head, { paddingTop: insets.top + 12 }]}>
        <View style={s.thumb}><Image source={car.photos[0].src} style={StyleSheet.absoluteFill} contentFit="cover" /></View>
        <Price hammer={sale.hammer} total={sale.total} size={40} ink={theme.color.ink} />
      </Animated.View>

      {screen === 'who' && lit && (
        <Animated.View entering={FadeIn.delay(900).duration(260)} style={s.who}>
          <Text style={s.q}>Who is it for?</Text>
          <View style={s.whoRow}>
            {(['me', 'other'] as const).map(w => (
              <Pressable key={w} onPress={() => { setSale({ forWhom: w }); feel.select(); setScreen('tiles'); }} style={s.whoBtn} accessibilityRole="button">
                <Text style={s.whoText}>{w === 'me' ? 'Me' : 'Someone else'}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      )}

      {screen === 'tiles' && (
        <View style={s.tiles}>
          {tiles.map((t, i) => {
            const live = t.key === next, locked = !t.done && !live;
            return (
              <Animated.View key={t.key} entering={FadeInRight.delay(i * 60).duration(220)} style={{ flex: 1 }}>
                <Pressable disabled={locked} onPress={() => openTile(t.key)}
                  style={[s.tile, live && s.tileLive, locked && s.tileLocked]} accessibilityRole="button" accessibilityState={{ disabled: locked, selected: live }} accessibilityLabel={`${t.label}${t.done ? ', done' : live ? ', next' : ''}`}>
                  {t.done ? <Tick /> : <View style={[s.tileDot, live && { backgroundColor: theme.color.accent }]} />}
                  <Text style={[s.tileText, locked && { color: theme.color.faint }]}>{t.label}</Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      )}
      {screen === 'tiles' && next === null && (
        <Animated.View entering={FadeIn.delay(300)} style={s.doneWrap}>
          {outOfState(sale) && <Text style={s.doneLine}>Plates come from {sale.id?.state}</Text>}
          <Pressable onPress={onDone} style={s.doneBtn} accessibilityRole="button"><Text style={s.doneText}>Back to the lane</Text></Pressable>
        </Animated.View>
      )}

      {screen === 'id' && <IdScan onDone={back} />}
      {screen === 'insure' && <InsureScan vin={car.vin} onDone={back} />}
      {screen === 'sign' && <SignDocs onDone={back} onClose={back} />}
      {screen === 'pay' && <Pay onDone={() => setScreen('pickup')} />}
      {screen === 'pickup' && <Pickup car={car} onDone={() => setScreen(outOfState(sale) ? 'tiles' : 'plates')} />}
      {screen === 'plates' && <Plates onBack={back} />}

      {lit && <Confetti />}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.cloud }, flashStyle]} />
    </View>
  );
}

function Tick() {
  return <Svg width={22} height={22} viewBox="0 0 26 26"><Path d="M5 13.5 L10.5 19 L21 7.5" stroke={theme.color.good} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22 },
  thumb: { width: 72, height: 96, borderRadius: 12, overflow: 'hidden', backgroundColor: theme.color.ice },
  who: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 22 },
  q: { fontFamily: theme.font.price, fontSize: 36, color: theme.color.ink },
  whoRow: { flexDirection: 'row', gap: 10 },
  whoBtn: { height: 52, paddingHorizontal: 24, borderRadius: 26, backgroundColor: theme.color.cloud, borderWidth: 1.5, borderColor: theme.color.line, justifyContent: 'center' },
  whoText: { fontFamily: theme.font.sansBold, fontSize: 16, color: theme.color.ink },
  tiles: { flexDirection: 'row', gap: 8, paddingHorizontal: 22, marginTop: 36 },
  tile: { height: 108, borderRadius: 18, backgroundColor: theme.color.cloud, borderWidth: 1.5, borderColor: theme.color.line, alignItems: 'center', justifyContent: 'center', gap: 8 },
  tileLive: { borderColor: theme.color.accent, transform: [{ translateY: -4 }], shadowColor: theme.color.ink, shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  tileLocked: { opacity: 0.6 },
  tileDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.color.line },
  tileText: { fontFamily: theme.font.sansBold, fontSize: 14, color: theme.color.ink },
  doneWrap: { marginTop: 'auto', padding: 22, gap: 12, alignItems: 'center' },
  doneLine: { fontFamily: theme.font.sans, fontSize: 14, color: theme.color.muted },
  doneBtn: { alignSelf: 'stretch', height: 52, borderRadius: 26, backgroundColor: theme.color.accent, alignItems: 'center', justifyContent: 'center' },
  doneText: { fontFamily: theme.font.sansBold, fontSize: 16, color: theme.color.cloud },
});
