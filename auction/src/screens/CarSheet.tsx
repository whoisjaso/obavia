/* The Car. Twelve photos as a grid (sideways shots take two cells), the grade
   badge (six dots that become six words on a tap), odometer, VIN last six, the
   title chip, the Buyers Guide chip, the dealer's name and city. Three detents.
   Swipe down: back to the Lane. */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { Sheet } from '../components/Sheet';
import { GRADE_WORDS, isWide, type Car, type Photo } from '../data/cars';
import { pack } from '../engine/grid';
import { feel } from '../feel';
import { theme } from '../theme';
import { Paper } from './Paper';

export function CarSheet({ car, onClose }: { car: Car; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const [words, setWords] = useState(false);
  const [lit, setLit] = useState<Photo | null>(null);
  const [guide, setGuide] = useState(false);
  const cols = width < 380 ? 3 : 4, gap = 4, pad = 18;
  const cell = Math.floor((width - pad * 2 - gap * (cols - 1)) / cols);

  const expand = () => {
    const next = !words; setWords(next);
    if (next) for (let i = 0; i < 6; i++) setTimeout(feel.touch, i * 60);   // six light impacts, 60 ms stagger
  };

  const header = (
    <View style={s.head}>
      <Text style={s.title}>{car.year} {car.make} {car.model}</Text>
      <View style={s.facts}>
        <Text style={s.fact}>{car.miles.toLocaleString('en-US')} mi</Text>
        <Text style={s.dot}>·</Text>
        <Text style={s.fact}>VIN …{car.vin.slice(-6)}</Text>
        <Text style={s.dot}>·</Text>
        <Text style={s.fact}>{car.dealer.name}, {car.dealer.city}</Text>
      </View>
    </View>
  );

  return (
    <>
      <Sheet detents={[0.3, 0.62, 1]} initial={1} onClose={onClose} header={header}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: pad, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={s.chips}>
            <Pressable onPress={expand} style={[s.badge, words && s.badgeOpen]} accessibilityRole="button"
              accessibilityLabel={`Condition: ${car.grade.map((g, i) => `${GRADE_WORDS[i]} ${g >= 1 ? 'good' : g > 0 ? 'fair' : 'poor'}`).join(', ')}`}>
              {car.grade.map((g, i) => (
                <View key={i} style={s.dotWrap}>
                  <View style={[s.gdot, { opacity: g >= 1 ? 1 : g > 0 ? 0.45 : 0.15, backgroundColor: g > 0 ? theme.color.accent : theme.color.ink }]} />
                  {words && <Animated.Text entering={FadeInDown.delay(i * 60).duration(160)} exiting={FadeOut.duration(80)} style={s.word}>{GRADE_WORDS[i]}</Animated.Text>}
                </View>
              ))}
            </Pressable>
            <View style={[s.chip, car.title === 'in hand' ? s.chipOn : s.chipWait]}>
              <Text style={[s.chipText, car.title === 'in hand' ? { color: theme.color.good } : { color: theme.color.warn }]}>Title {car.title}</Text>
            </View>
            <Pressable onPress={() => { setGuide(true); feel.select(); }} style={s.chip} accessibilityRole="button">
              <Text style={s.chipText}>Buyers Guide</Text>
            </Pressable>
          </View>

          <View style={[s.grid, { gap }]}>
            {pack(car.photos, cols, isWide).map(({ p, i }) => {
              const wide = isWide(p);
              return (
                <Pressable key={i} onPress={() => { setLit(p); feel.select(); }} style={{ width: wide ? cell * 2 + gap : cell, height: cell, borderRadius: 10, overflow: 'hidden', backgroundColor: theme.color.ice }}
                  accessibilityRole="imagebutton" accessibilityLabel={`Photo ${i + 1} of ${car.photos.length}${wide ? ', wide' : ''}`}>
                  <Image source={p.src} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} />
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
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
  head: { paddingHorizontal: 18, paddingBottom: 10 },
  title: { fontFamily: theme.font.sansBold, fontSize: 20, color: theme.color.ink },
  facts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 2 },
  fact: { fontFamily: theme.font.sans, fontSize: 13, color: theme.color.muted, fontVariant: ['tabular-nums'] },
  dot: { color: theme.color.faint, marginHorizontal: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 14 },
  badge: { flexDirection: 'row', gap: 8, height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: theme.color.cloud, borderWidth: 1.5, borderColor: theme.color.line, alignItems: 'center' },
  badgeOpen: { height: 'auto', paddingVertical: 8, borderColor: theme.color.accent },
  dotWrap: { alignItems: 'center', gap: 4 },
  gdot: { width: 8, height: 8, borderRadius: 4 },
  word: { fontFamily: theme.font.sans, fontSize: 10, color: theme.color.inkSoft },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: theme.color.cloud, borderWidth: 1.5, borderColor: theme.color.line, justifyContent: 'center' },
  chipOn: { backgroundColor: theme.color.good + '14', borderColor: theme.color.good + '55' },
  chipWait: { backgroundColor: theme.color.warn + '14', borderColor: theme.color.warn + '55' },
  chipText: { fontFamily: theme.font.sansBold, fontSize: 13, color: theme.color.inkSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  light: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: theme.color.ink },
});
