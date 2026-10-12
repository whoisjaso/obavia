/* The quiet vocabulary. Centered, spaced, no boxes: a small spaced label, a
   serif word or number that owns the page, a choice that is only its words,
   a hairline, a page that centers its content, a pager with dots. */
import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { feel } from '../feel';
import { theme } from '../theme';

export function Label({ children, style, ink }: { children: React.ReactNode; style?: TextStyle; ink?: string }) {
  return <Text style={[s.label, ink ? { color: ink } : null, style]}>{children}</Text>;
}

export function Serif({ children, size = theme.size.display, ink = theme.color.ink, style }: { children: React.ReactNode; size?: number; ink?: string; style?: TextStyle }) {
  return <Text style={[s.serif, { fontSize: size, color: ink }, style]}>{children}</Text>;
}

export function Body({ children, ink = theme.color.inkSoft, style }: { children: React.ReactNode; ink?: string; style?: TextStyle }) {
  return <Text style={[s.body, { color: ink }, style]}>{children}</Text>;
}

export function Hairline({ style }: { style?: ViewStyle }) {
  return <View style={[s.hair, style]} />;
}

/** A choice is its words. Selected: ink. Others: faint. A tap is a selection tick. */
export function Choice({ label, detail, selected, dim, onPress, size = 22, accessibilityLabel }: {
  label: string; detail?: string; selected?: boolean; dim?: boolean; onPress?: () => void; size?: number; accessibilityLabel?: string;
}) {
  const ink = selected ? theme.color.ink : dim ? theme.color.faint : theme.color.inkSoft;
  return (
    <Pressable onPress={onPress ? () => { feel.select(); onPress(); } : undefined} disabled={!onPress} hitSlop={8}
      style={s.choice} accessibilityRole="button" accessibilityState={{ selected: !!selected, disabled: !onPress }} accessibilityLabel={accessibilityLabel ?? (detail ? `${label}, ${detail}` : label)}>
      <Text style={[s.choiceLabel, { fontSize: size, color: ink, fontFamily: selected ? theme.font.sansBold : theme.font.sans }]}>{label}</Text>
      {detail ? <Text style={[s.choiceDetail, { color: selected ? theme.color.inkSoft : theme.color.faint }]}>{detail}</Text> : null}
      {selected && <View style={s.choiceMark} />}
    </Pressable>
  );
}

/** The one verb on a page. */
export function Button({ label, onPress, disabled, ghost }: { label: string; onPress: () => void; disabled?: boolean; ghost?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[s.btn, ghost && s.btnGhost, disabled && s.btnOff]} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }}>
      <Text style={[s.btnText, ghost && { color: theme.color.accent }]}>{label}</Text>
    </Pressable>
  );
}

/** A page: its content centered, with room above and below, one action at the foot. */
export function Page({ children, foot, top, bg = theme.color.sky, align = 'center' }: { children: React.ReactNode; foot?: React.ReactNode; top?: React.ReactNode; bg?: string; align?: 'center' | 'flex-start' }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: bg, paddingTop: insets.top + theme.space.m, paddingBottom: insets.bottom + theme.space.m, paddingHorizontal: theme.space.m }]}>
      {top}
      <Animated.View entering={FadeIn.duration(220)} style={{ flex: 1, justifyContent: align === 'center' ? 'center' : 'flex-start', alignItems: 'center', gap: theme.space.s }}>
        {children}
      </Animated.View>
      {foot && <View style={{ gap: theme.space.s }}>{foot}</View>}
    </View>
  );
}

/** Horizontal pages with dots. One idea per page; the dots say where you are. */
export function Pager({ pages, initial = 0, onIndex }: { pages: React.ReactNode[]; initial?: number; onIndex?: (i: number) => void }) {
  const { width } = useWindowDimensions();
  const [i, setI] = useState(initial);
  const ref = useRef<ScrollView>(null);
  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentOffset={{ x: initial * width, y: 0 }} scrollEventThrottle={32}
        onScroll={e => { const n = Math.round(e.nativeEvent.contentOffset.x / width); if (n !== i) { setI(n); onIndex?.(n); feel.snap(); } }}>
        {pages.map((p, k) => <View key={k} style={{ width, flex: 1 }}>{p}</View>)}
      </ScrollView>
      <View style={s.dots} pointerEvents="none">
        {pages.map((_, k) => <View key={k} style={[s.dot, k === i && s.dotOn]} />)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontFamily: theme.font.sans, fontSize: theme.size.label, letterSpacing: 1.8, textTransform: 'uppercase', color: theme.color.faint, textAlign: 'center' },
  serif: { fontFamily: theme.font.price, textAlign: 'center', letterSpacing: -0.5 },
  body: { fontFamily: theme.font.sans, fontSize: theme.size.body, textAlign: 'center', lineHeight: 24 },
  hair: { height: StyleSheet.hairlineWidth, backgroundColor: theme.color.line, alignSelf: 'center', width: 48 },
  choice: { alignItems: 'center', paddingVertical: theme.space.s, alignSelf: 'stretch' },
  choiceLabel: { textAlign: 'center' },
  choiceDetail: { fontFamily: theme.font.sans, fontSize: 13, marginTop: 4, textAlign: 'center' },
  choiceMark: { width: 18, height: 2, borderRadius: 1, backgroundColor: theme.color.accent, marginTop: 8 },
  btn: { height: 54, borderRadius: 27, backgroundColor: theme.color.ink, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  btnGhost: { backgroundColor: 'transparent' },
  btnOff: { opacity: 0.3 },
  btnText: { fontFamily: theme.font.sansBold, fontSize: 16, color: theme.color.cloud, letterSpacing: 0.2 },
  dots: { position: 'absolute', bottom: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: theme.color.ink, opacity: 0.18 },
  dotOn: { opacity: 0.7 },
});
