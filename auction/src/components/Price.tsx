/* The two numbers, stacked 2:1, same typeface. The hammer rolls like a picker
   when it changes and punches 1.06× when the server acks. The finger's lift
   arrives as a shared value so it moves on the UI thread with the touch. */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { dollars } from '../engine/money';
import { EASE_OUT, ms, spring } from '../motion';
import { theme } from '../theme';

export function Price({ hammer, total, size = theme.size.price, punchKey, ink = theme.color.cloud, lift, struck, centered, leading }: {
  hammer: number; total?: number; size?: number;
  punchKey?: number;          // changes on every server ack
  ink?: string;
  lift?: SharedValue<number>; // thumb on the price: written by the gesture, read here, never by React
  struck?: boolean;           // offline: the price is not live
  centered?: boolean;
  leading?: boolean;          // you are the high bidder: a small mark beside the hammer
}) {
  const roll = useSharedValue(0), scale = useSharedValue(1), still = useSharedValue(0);
  const mark = useSharedValue(leading ? 1 : 0);
  const reduce = useReducedMotion();
  const last = useRef(hammer);
  const y = lift ?? still;
  useEffect(() => {
    if (last.current !== hammer) {
      const up = hammer > last.current; last.current = hammer;
      if (!reduce) { roll.value = up ? 10 : -10; roll.value = withSpring(0, spring.settle); }
    }
  }, [hammer]);
  useEffect(() => {
    if (punchKey === undefined || reduce) return;
    // the thud: up in 90 ms, down in 180 ms, both strong ease-out; a timing, no finger is on it
    scale.value = withSequence(withTiming(1.06, { duration: ms.punch, easing: EASE_OUT }), withTiming(1, { duration: ms.settle, easing: EASE_OUT }));
  }, [punchKey]);
  // the mark is state: it always lands; under reduced motion it fades without the scale
  useEffect(() => { mark.value = withTiming(leading ? 1 : 0, { duration: leading ? 150 : 200, easing: EASE_OUT }); }, [leading]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: roll.value + y.value }, { scale: scale.value }] }));
  const markStyle = useAnimatedStyle(() => ({ opacity: 0.9 * mark.value, transform: [{ scale: reduce ? 1 : 0.6 + 0.4 * mark.value }] }));
  return (
    <View style={centered ? { alignItems: 'center' } : undefined}>
      <Animated.View style={style}>
        <Text style={[s.hammer, { fontSize: size, color: ink, textDecorationLine: struck ? 'line-through' : 'none', textAlign: centered ? 'center' : 'left' }]}
          accessibilityRole="adjustable" accessibilityLabel={`${dollars(hammer)} dollars`} maxFontSizeMultiplier={theme.size.priceMax / theme.size.price}>
          ${dollars(hammer)}
        </Text>
        <Animated.View style={[s.lead, { backgroundColor: ink }, markStyle]} accessibilityElementsHidden={!leading} accessibilityLabel={leading ? 'You are the high bidder' : undefined} />
      </Animated.View>
      {total !== undefined && (
        <Text style={[s.total, { fontSize: size / 2, color: ink, textAlign: centered ? 'center' : 'left' }]} accessibilityLabel={`${dollars(total)} dollars total`}>
          ${dollars(total)}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  hammer: { fontFamily: theme.font.price, letterSpacing: 0, lineHeight: undefined, textShadowColor: 'rgba(8,14,30,0.35)', textShadowRadius: 10 },
  total: { fontFamily: theme.font.price, opacity: 0.78, marginTop: -4, textShadowColor: 'rgba(8,14,30,0.35)', textShadowRadius: 10 },
  lead: { position: 'absolute', right: -18, top: '50%', marginTop: -4, width: 8, height: 8, borderRadius: 4 },   // outside the flow: a centered price stays centered
});
