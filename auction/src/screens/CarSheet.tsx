/* The Car. Three pages, one idea each: the car and its photos; its condition
   in six words; its papers. Centered, spaced, nothing boxed. Swipe down on the
   grip to return to the Lane. A photo opens out of its own thumbnail
   (components/Lightbox). The condition badge, six dots, one per row, lights
   dot by dot 60 ms apart with a light impact each the first time its page is
   seen; after that it is simply there. */
import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Lightbox, type Rect } from '../components/Lightbox';
import { EASE_OUT } from '../motion';
import { Sheet } from '../components/Sheet';
import { Body, Caps, Hairline, Label, Pager, Serif } from '../components/Type';
import { GRADE_WORDS, isWide, type Car, type Photo } from '../data/cars';
import { pack } from '../engine/grid';
import { feel } from '../feel';
import { theme } from '../theme';
import { Paper } from './Paper';

const WORD = (g: number) => (g >= 1 ? 'good' : g > 0 ? 'fair' : 'poor');

export function CarSheet({ car, onClose }: { car: Car; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const [lit, setLit] = useState<{ p: Photo; from: Rect | null } | null>(null);
  const seen = useRef(false);   // the badge has played once for this car
  const dots = [useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  const onIndex = (i: number) => {
    if (i !== 1 || seen.current) return;
    seen.current = true;
    feel.six(k => { dots[k].value = withTiming(1, { duration: 120, easing: EASE_OUT }); });
  };
  const [guide, setGuide] = useState(false);
  const cols = width < 380 ? 3 : 4, gap = 6, pad = theme.space.m;
  const cell = Math.floor((width - pad * 2 - gap * (cols - 1)) / cols);

  const photos = (
    <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
      <Label>{car.year}</Label>
      <Serif size={`${car.make} ${car.model}`.length > 22 ? theme.size.title + 6 : theme.size.display}>{car.make} {car.model}</Serif>
      <Body ink={theme.color.muted} style={{ marginTop: 2 }}>{car.miles.toLocaleString('en-US')} miles</Body>
      <View style={[s.grid, { gap, marginTop: theme.space.l }]}>
        {pack(car.photos, cols, isWide).map(({ p, i }) => {
          const wide = isWide(p);
          return (
            <Thumb key={i} p={p} w={wide ? cell * 2 + gap : cell} h={cell} label={`Photo ${i + 1} of ${car.photos.length}${wide ? ', wide' : ''}`}
              onOpen={from => { setLit({ p, from }); feel.select(); }} />
          );
        })}
      </View>
    </ScrollView>
  );

  const condition = (
    <View style={[s.page, { flex: 1, justifyContent: 'center' }]}>
      <Label>Condition</Label>
      <View style={s.badge} accessible accessibilityLabel={`${car.grade.filter(g => g >= 1).length} of 6 good`}>
        {car.grade.map((g, i) => <Dot key={i} k={dots[i]} ink={g >= 1 ? theme.color.ink : g > 0 ? theme.color.muted : theme.color.warn} />)}
      </View>
      {car.grade.map((g, i) => (
        <View key={i} style={s.row} accessible accessibilityLabel={`${GRADE_WORDS[i]} ${WORD(g)}`}>
          <Text style={s.rowKey}>{GRADE_WORDS[i]}</Text>
          <Caps size={16} ink={g > 0 ? theme.color.ink : theme.color.warn}>{WORD(g)}</Caps>
        </View>
      ))}
    </View>
  );

  const papers = (
    <View style={[s.page, { flex: 1, justifyContent: 'center' }]}>
      <Label>Title</Label>
      {car.collateral?.title.status === 'hand' ? (
        <Caps size={18}>in hand</Caps>
      ) : car.collateral?.title.status === 'lender' ? (
        <>
          <Caps size={18} ink={theme.color.warn}>at lender</Caps>
          <Body ink={theme.color.muted} style={{ marginTop: 4 }}>{car.collateral.title.lienholder ?? 'lender'} · released {car.collateral.title.releaseDays} days after payoff</Body>
        </>
      ) : (
        <Caps size={18} ink={car.title === 'in hand' ? theme.color.ink : theme.color.warn}>{car.title}</Caps>
      )}
      <Hairline style={{ marginVertical: theme.space.l }} />
      <Pressable onPress={() => { setGuide(true); feel.select(); }} accessibilityRole="button" style={{ alignItems: 'center' }}>
        <Label>Buyers Guide</Label>
        <Caps size={18}>as is</Caps>
        <Body ink={theme.color.faint} style={{ marginTop: 4 }}>read it</Body>
      </Pressable>
      <Hairline style={{ marginVertical: theme.space.l }} />
      <Label>Sold by</Label>
      <Serif size={26}>{car.dealer.name}</Serif>
      <Body ink={theme.color.muted}>{car.dealer.city} · {car.dealer.gdn}</Body>
      <Body ink={theme.color.faint} style={{ marginTop: theme.space.s, fontSize: 13 }}>VIN …{car.vin.slice(-6)}</Body>
    </View>
  );

  return (
    <>
      <Sheet detents={[1]} initial={0} onClose={onClose}>
        <Pager pages={[photos, condition, papers]} onIndex={onIndex} />
      </Sheet>
      {lit && <Lightbox photo={lit.p} from={lit.from} onClose={() => setLit(null)} />}
      {guide && <Paper title="Buyers Guide" subtitle="AS IS - NO DEALER WARRANTY" onClose={() => setGuide(false)} />}
    </>
  );
}

/** A thumbnail that knows where it is on the glass, so the photo can open out of it. */
function Thumb({ p, w, h, label, onOpen }: { p: Photo; w: number; h: number; label: string; onOpen: (from: Rect | null) => void }) {
  const ref = useRef<View>(null);
  const open = () => {
    const v = ref.current;
    if (!v) { onOpen(null); return; }
    v.measureInWindow((x, y, mw, mh) => onOpen(mw > 0 ? { x, y, w: mw, h: mh } : null));
  };
  return (
    <Pressable ref={ref} onPress={open} style={{ width: w, height: h, borderRadius: 8, overflow: 'hidden', backgroundColor: theme.color.well }}
      accessibilityRole="imagebutton" accessibilityLabel={label}>
      <Image source={p.src} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} />
    </Pressable>
  );
}

/** One dot of the badge: a faint ring until its turn, then its grade's ink. */
function Dot({ k, ink }: { k: ReturnType<typeof useSharedValue<number>>; ink: string }) {
  const st = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(k.value, [0, 1], [theme.color.well, ink]) }));
  return <Animated.View style={[s.dot, st]} />;
}

const s = StyleSheet.create({
  badge: { flexDirection: 'row', gap: 8, marginTop: theme.space.s, marginBottom: theme.space.m },
  dot: { width: 8, height: 8, borderRadius: 4 },
  page: { paddingHorizontal: theme.space.m, paddingTop: theme.space.s, paddingBottom: theme.space.xl, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  row: { alignItems: 'center', paddingVertical: 12, gap: 6 },
  rowKey: { ...theme.type.sans, fontSize: theme.size.label, letterSpacing: 1.8, textTransform: 'uppercase', color: theme.color.faint, marginBottom: 2 },
});
