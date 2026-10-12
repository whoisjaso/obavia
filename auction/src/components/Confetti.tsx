/* Confetti in ice and blue, 1.4 s, once, on the win. Honours reduced motion. */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { theme } from '../theme';

const N = 42;

function Piece({ i, width, height }: { i: number; width: number; height: number }) {
  const t = useSharedValue(0);
  const seed = useMemo(() => ({
    x: (i / N) * width + ((i * 97) % 40) - 20, drift: ((i * 53) % 120) - 60, delay: (i * 31) % 220,
    w: 6 + (i % 3) * 3, h: 10 + (i % 4) * 3, spin: ((i * 71) % 720) - 360,
    colour: i % 3 === 0 ? theme.color.blue : i % 3 === 1 ? theme.color.ice : theme.color.cloud,
  }), [i, width]);
  useEffect(() => { t.value = withDelay(seed.delay, withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) })); }, []);
  const st = useAnimatedStyle(() => ({
    transform: [
      { translateX: seed.x + seed.drift * t.value },
      { translateY: -40 + (height * 0.75) * t.value * t.value },
      { rotate: `${seed.spin * t.value}deg` },
    ],
    opacity: t.value < 0.8 ? 1 : 1 - (t.value - 0.8) / 0.2,
  }));
  return <Animated.View style={[{ position: 'absolute', width: seed.w, height: seed.h, borderRadius: 2, backgroundColor: seed.colour }, st]} />;
}

export function Confetti() {
  const { width, height } = useWindowDimensions();
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: N }, (_, i) => <Piece key={i} i={i} width={width} height={height} />)}
    </View>
  );
}
