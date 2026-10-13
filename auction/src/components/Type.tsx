/* The quiet vocabulary. Centered, spaced, no boxes: a small spaced label, a
   serif word or number that owns the page, a choice that is only its words,
   a hairline, a page that centers its content, a pager with dots. */
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { feel } from '../feel';
import { CLOUD_OUT, cloud, ms } from '../motion';
import { theme } from '../theme';
import { PressCloud } from './Cloud';
import { CloudButton } from './CloudButton';

export function Label({ children, style, ink }: { children: React.ReactNode; style?: TextStyle; ink?: string }) {
  return <Text style={[s.label, ink ? { color: ink } : null, style]}>{children}</Text>;
}

export function Serif({ children, size = theme.size.display, ink = theme.color.ink, style, italic }: { children: React.ReactNode; size?: number; ink?: string; style?: TextStyle; italic?: boolean }) {
  return <Text style={[s.serif, { fontSize: size, color: ink, fontFamily: italic ? theme.font.priceItalic : theme.font.price }, style]}>{hyphens(children)}</Text>;
}

/* Bodoni Moda's display cut draws its hyphen as a hairline (6 units of 2000 tall): at any size it
   vanishes, so "Mercedes-Benz" read "Mercedes Benz" and a double-barrelled name lost its join. The
   hyphen alone is set in the platform face, light, so the name keeps it. */
function hyphens(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, c => {
    if (typeof c !== 'string' || !c.includes('-')) return c;
    return c.split('-').flatMap((part, i) => (i === 0 ? [part] : [<Text key={i} style={s.hyphen}>-</Text>, part]));
  });
}

/** A word in spaced capitals, upright, the way a crown or a crest sets its name. */
export function Caps({ children, size = 15, ink = theme.color.ink, style }: { children: React.ReactNode; size?: number; ink?: string; style?: TextStyle }) {
  return <Text style={[s.caps, { fontSize: size, color: ink, letterSpacing: size * 0.18 }, style]}>{children}</Text>;
}

export function Body({ children, ink = theme.color.inkSoft, style }: { children: React.ReactNode; ink?: string; style?: TextStyle }) {
  return <Text style={[s.body, { color: ink }, style]}>{children}</Text>;
}

export function Hairline({ style }: { style?: ViewStyle }) {
  return <View style={[s.hair, style]} />;
}

/** A choice is its words. Selected: ink. Others: faint. A tap is a selection tick. The words are a cloud:
    they sink under the thumb and rise back; no surface, so no shade. */
export function Choice({ label, detail, selected, dim, onPress, size = 22, accessibilityLabel }: {
  label: string; detail?: string; selected?: boolean; dim?: boolean; onPress?: () => void; size?: number; accessibilityLabel?: string;
}) {
  const ink = selected ? theme.color.ink : dim ? theme.color.faint : theme.color.inkSoft;
  return (
    <PressCloud onPress={onPress ? () => { feel.select(); onPress(); } : undefined} style={{ alignSelf: 'stretch' }} bodyStyle={s.choice}
      accessibilityState={{ selected: !!selected }} accessibilityLabel={accessibilityLabel ?? (detail ? `${label}, ${detail}` : label)}>
      <Text style={[s.choiceLabel, { fontSize: Math.round(size * 0.68), letterSpacing: size * 0.12, color: ink, fontWeight: selected ? '600' : '500', fontFamily: 'System', textTransform: 'uppercase' }]}>{label}</Text>
      {detail ? <Text style={[s.choiceDetail, { color: selected ? theme.color.inkSoft : theme.color.faint }]}>{detail}</Text> : null}
      {selected && <View style={s.choiceMark} />}
    </PressCloud>
  );
}

/** The one verb on a page: the 3D cloud (CloudButton). It sinks under the thumb on the UI thread, rises on
    the 0.65 spring shedding its wisps, and breathes once when the press completes something (feel.done).
    `ghost` is a secondary action (Back, Later, Sign out): a flatter cloud, its words only, never the sprite,
    so a page never shows two clouds of equal rank (one-action.md; cloud-system §8, secondary surfaces). */
export function Button({ label, onPress, disabled, ghost }: { label: string; onPress: () => void; disabled?: boolean; ghost?: boolean }) {
  if (!ghost) return <CloudButton label={label} onPress={onPress} disabled={disabled} />;
  return (
    <PressCloud onPress={onPress} disabled={disabled} style={{ alignSelf: 'stretch' }}
      bodyStyle={[s.btn, s.btnGhost, disabled && s.btnOff]} accessibilityLabel={label}>
      <Text style={[s.btnText, { color: theme.color.accent }]}>{label}</Text>
    </PressCloud>
  );
}

/** A page's child settling into place: down from 8 pt above and in, 420 ms on the house out-curve, after
    its turn in the stagger. Reduced motion: the fade only. */
function Settle({ i, children }: { i: number; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const k = useSharedValue(0);
  useEffect(() => { k.value = withDelay(i * cloud.stagger, withTiming(1, { duration: ms.page, easing: CLOUD_OUT })); }, []);
  const st = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ translateY: reduce ? 0 : cloud.settleY * (1 - k.value) }] }));
  return <Animated.View style={[s.settle, st]}>{children}</Animated.View>;
}

/** A page: its content centered, with room above and below, one action at the foot. Transparent: the
    sky behind it (the sheet's or Won's) is the cloud. It arrives by settling, child by child, 40 ms
    apart, the foot last, with the air leaving (cloud-settle) as it lands. */
export function Page({ children, foot, top, bg = 'transparent', align = 'center' }: { children: React.ReactNode; foot?: React.ReactNode; top?: React.ReactNode; bg?: string; align?: 'center' | 'flex-start' }) {
  const insets = useSafeAreaInsets();
  useEffect(() => { feel.settle(); }, []);
  const kids = React.Children.toArray(children);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: bg, paddingTop: insets.top + theme.space.m, paddingBottom: insets.bottom + theme.space.m, paddingHorizontal: theme.space.m }]}>
      {top}
      <View style={{ flex: 1, justifyContent: align === 'center' ? 'center' : 'flex-start', alignItems: 'center', gap: theme.space.s }}>
        {kids.map((c, i) => <Settle key={(c as { key?: React.Key }).key ?? i} i={i}>{c}</Settle>)}
      </View>
      {foot && <Settle i={kids.length}><View style={{ gap: theme.space.s, alignSelf: 'stretch' }}>{foot}</View></Settle>}
    </View>
  );
}

/** Horizontal pages with dots. One idea per page; the dots say where you are. */
export function Pager({ pages, initial = 0, onIndex }: { pages: React.ReactNode[]; initial?: number; onIndex?: (i: number) => void }) {
  const { width } = useWindowDimensions();
  const [i, setI] = useState(initial);
  const ref = useRef<ScrollView>(null);
  const rest = useRef(initial);
  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentOffset={{ x: initial * width, y: 0 }} scrollEventThrottle={32}
        onLayout={() => { if (initial > 0) ref.current?.scrollTo({ x: initial * width, animated: false }); }}
        onScroll={e => { const n = Math.round(e.nativeEvent.contentOffset.x / width); if (n !== i) setI(n); }}
        onMomentumScrollEnd={e => {   // the air and the tick at rest, as the lane does, not at the halfway mark
          const n = Math.round(e.nativeEvent.contentOffset.x / width);
          if (n !== rest.current) { rest.current = n; setI(n); onIndex?.(n); feel.snap(); }
        }}>
        {pages.map((p, k) => <View key={k} style={{ width, flex: 1 }}>{p}</View>)}
      </ScrollView>
      <View style={s.dots} pointerEvents="none">
        {pages.map((_, k) => <View key={k} style={[s.dot, k === i && s.dotOn]} />)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  label: { ...theme.type.sans, fontSize: theme.size.label, letterSpacing: 2.6, textTransform: 'uppercase', color: theme.color.faint, textAlign: 'center' },
  serif: { fontFamily: theme.font.price, textAlign: 'center', letterSpacing: 0 },
  hyphen: { fontFamily: 'System', fontWeight: '300' },
  caps: { ...theme.type.sansBold, textTransform: 'uppercase', textAlign: 'center' },
  body: { ...theme.type.sans, fontSize: theme.size.body, textAlign: 'center', lineHeight: 24 },
  hair: { height: StyleSheet.hairlineWidth, backgroundColor: theme.color.line, alignSelf: 'center', width: 48 },
  choice: { alignItems: 'center', paddingVertical: theme.space.s, alignSelf: 'stretch' },
  settle: { alignSelf: 'stretch', alignItems: 'center' },
  choiceLabel: { textAlign: 'center' },
  choiceDetail: { ...theme.type.sans, fontSize: 13, marginTop: 4, textAlign: 'center' },
  choiceMark: { width: 18, height: 2, borderRadius: 1, backgroundColor: theme.color.accent, marginTop: 8 },
  btn: { height: 54, borderRadius: 4, backgroundColor: theme.color.ink, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', overflow: 'hidden' },
  btnGhost: { backgroundColor: 'transparent' },
  btnOff: { opacity: 0.3 },
  btnText: { ...theme.type.sansBold, fontSize: 13, color: theme.color.cloud, letterSpacing: 2.4, textTransform: 'uppercase' },
  dots: { position: 'absolute', bottom: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: theme.color.ink, opacity: 0.18 },
  dotOn: { opacity: 0.7 },
});
