/* The two numbers, stacked 2:1, same typeface. The hammer rolls like a picker
   when it changes and punches 1.06× when the server acks. */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { dollars } from '../engine/money';
import { theme } from '../theme';

export function Price({ hammer, total, size = theme.size.price, punchKey, ink = theme.color.cloud, lifted, struck }: {
  hammer: number; total?: number; size?: number;
  punchKey?: number;          // changes on every server ack
  ink?: string;
  lifted?: boolean;           // thumb on the price: lifts 2 pt
  struck?: boolean;           // offline: the price is not live
}) {
  const roll = useSharedValue(0), scale = useSharedValue(1), lift = useSharedValue(0);
  const reduce = useReducedMotion();
  const last = useRef(hammer);
  useEffect(() => {
    if (last.current !== hammer) {
      const up = hammer > last.current; last.current = hammer;
      if (!reduce) { roll.value = up ? 10 : -10; roll.value = withSpring(0, theme.spring.lift); }
    }
  }, [hammer]);
  useEffect(() => {
    if (punchKey === undefined || reduce) return;
    scale.value = withSequence(withTiming(1.06, { duration: theme.ms.punch, easing: Easing.out(Easing.quad) }), withSpring(1, theme.spring.punch));
  }, [punchKey]);
  useEffect(() => { lift.value = withSpring(lifted ? -2 : 0, theme.spring.lift); }, [lifted]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: roll.value + lift.value }, { scale: scale.value }] }));
  return (
    <View>
      <Animated.View style={style}>
        <Text style={[s.hammer, { fontSize: size, color: ink, textDecorationLine: struck ? 'line-through' : 'none' }]}
          accessibilityRole="adjustable" accessibilityLabel={`${dollars(hammer)} dollars`} maxFontSizeMultiplier={theme.size.priceMax / theme.size.price}>
          ${dollars(hammer)}
        </Text>
      </Animated.View>
      {total !== undefined && (
        <Text style={[s.total, { fontSize: size / 2, color: ink }]} accessibilityLabel={`${dollars(total)} dollars total`}>
          ${dollars(total)}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  hammer: { fontFamily: theme.font.price, letterSpacing: -1, lineHeight: undefined },
  total: { fontFamily: theme.font.price, opacity: 0.78, marginTop: -4 },
});
