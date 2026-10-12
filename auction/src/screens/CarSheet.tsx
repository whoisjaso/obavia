/* The Car. Three pages, one idea each: the car and its photos; its condition
   in six words; its papers. Centered, spaced, nothing boxed. Swipe down on the
   grip to return to the Lane. */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
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
  const [lit, setLit] = useState<Photo | null>(null);
  const [guide, setGuide] = useState(false);
  const cols = width < 380 ? 3 : 4, gap = 6, pad = theme.space.m;
  const cell = Math.floor((width - pad * 2 - gap * (cols - 1)) / cols);

  const photos = (
    <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
      <Label>{car.year}</Label>
      <Serif size={theme.size.display}>{car.make} {car.model}</Serif>
      <Body ink={theme.color.muted} style={{ marginTop: 2 }}>{car.miles.toLocaleString('en-US')} miles</Body>
      <View style={[s.grid, { gap, marginTop: theme.space.l }]}>
        {pack(car.photos, cols, isWide).map(({ p, i }) => {
          const wide = isWide(p);
          return (
            <Pressable key={i} onPress={() => { setLit(p); feel.select(); }} style={{ width: wide ? cell * 2 + gap : cell, height: cell, borderRadius: 8, overflow: 'hidden', backgroundColor: theme.color.well }}
              accessibilityRole="imagebutton" accessibilityLabel={`Photo ${i + 1} of ${car.photos.length}${wide ? ', wide' : ''}`}>
              <Image source={p.src} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} />
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );

  const condition = (
    <View style={[s.page, { flex: 1, justifyContent: 'center' }]}>
      <Label style={{ marginBottom: theme.space.m }}>Condition</Label>
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
        <Pager pages={[photos, condition, papers]} />
      </Sheet>
      {lit && (
        <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)} style={s.light}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLit(null)} accessibilityLabel="Close photo">
            <Image source={lit.src} style={StyleSheet.absoluteFill} contentFit="contain" />
          </Pressable>
        </Animated.View>
      )}
      {guide && <Paper title="Buyers Guide" subtitle="AS IS – NO DEALER WARRANTY" onClose={() => setGuide(false)} />}
    </>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: theme.space.m, paddingTop: theme.space.s, paddingBottom: theme.space.xl, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  row: { alignItems: 'center', paddingVertical: 12, gap: 6 },
  rowKey: { ...theme.type.sans, fontSize: theme.size.label, letterSpacing: 1.8, textTransform: 'uppercase', color: theme.color.faint, marginBottom: 2 },
  light: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: theme.color.ink },
});
