/* A horizontal picker wheel in the ceiling's register: values in a row, the one over the centre in ink with
   the accent rule under it, the rest faint. The rule stays put and the values roll over it, the way an iOS
   picker's band stays put. A selection tick (feel.select) per detent, fired from the UI thread only when the
   centred index changes, never per frame. A tap on a value picks it. */
import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, scrollTo, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { feel } from '../feel';
import { theme } from '../theme';

export function Wheel({ items, value, width, itemW = 64, onChange, onPick, label }: {
  items: string[]; value: string; width: number; itemW?: number;
  onChange: (v: string) => void;   // the centred value, once per detent
  onPick: (v: string) => void;     // a tap on a value
  label: string;                   // what the wheel sets, for VoiceOver
}) {
  const ref = useAnimatedRef<Animated.ScrollView>();
  const x = useSharedValue(Math.max(0, items.indexOf(value)) * itemW);
  const last = useSharedValue(Math.max(0, items.indexOf(value)));
  const placed = useRef(false);
  const picked = useRef(false);   // after a pick the wheel is leaving: a detent still in flight changes nothing
  const change = (i: number) => { if (picked.current) return; feel.select(); onChange(items[i]); };
  const onScroll = useAnimatedScrollHandler(e => {
    x.value = e.contentOffset.x;
    const i = Math.max(0, Math.min(items.length - 1, Math.round(e.contentOffset.x / itemW)));
    if (i !== last.value) { last.value = i; scheduleOnRN(change, i); }
  });
  const go = (i: number, animated: boolean) => scheduleOnUI(() => { 'worklet'; scrollTo(ref, i * itemW, 0, animated); });
  const pad = (width - itemW) / 2;
  const pick = (i: number) => { picked.current = true; onPick(items[i]); };
  const step = (d: number) => { const i = Math.max(0, Math.min(items.length - 1, last.value + d)); go(i, true); };

  return (
    <View style={{ width, height: 44 }} accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={e => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}>
      <View pointerEvents="none" style={[s.rule, { left: (width - 18) / 2 }]} />
      <Animated.ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}
        snapToInterval={itemW} decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: pad }}
        onLayout={() => { if (!placed.current) { placed.current = true; go(Math.max(0, items.indexOf(value)), false); } }}>
        {items.map((v, i) => (
          <Pressable key={v} onPress={() => pick(i)} style={{ width: itemW, height: 44, alignItems: 'center', justifyContent: 'center' }} accessible={false}>
            <Item text={v} i={i} x={x} itemW={itemW} />
          </Pressable>
        ))}
      </Animated.ScrollView>
    </View>
  );
}

/** One value: faint, with an ink copy over it whose opacity follows the distance from the centre. */
function Item({ text, i, x, itemW }: { text: string; i: number; x: SharedValue<number>; itemW: number }) {
  const ink = useAnimatedStyle(() => ({ opacity: interpolate(Math.abs(x.value / itemW - i), [0, 0.6], [1, 0], 'clamp') }));
  // the two copies share the cut and the box, so the crossfade changes the ink and nothing else
  return (
    <View style={{ width: itemW, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={s.text} numberOfLines={1}>{text}</Text>
      <Animated.Text style={[s.text, s.on, StyleSheet.absoluteFill, ink]} numberOfLines={1}>{text}</Animated.Text>
    </View>
  );
}

const s = StyleSheet.create({
  text: { ...theme.type.sansBold, fontSize: 18, letterSpacing: 1.8, color: theme.color.faint, textAlign: 'center' },
  on: { color: theme.color.ink },
  rule: { position: 'absolute', bottom: 4, width: 18, height: 2, borderRadius: 1, backgroundColor: theme.color.accent },
});
