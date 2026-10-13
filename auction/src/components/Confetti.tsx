/* Confetti in ice and blue, 1.4 s, once, on the win. Mounted before the
   moment, parked above the glass, and released by one shared clock so it
   leaves on the same frame as the flash, the chime and the haptic (mounting
   42 views at the moment itself would land it a few frames late on a slow
   phone). Decoration: reduced motion removes it, the win still lands. */
import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, type SharedValue, useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';
import { theme } from '../theme';

const N = 42, SPAN = 1400, STAGGER = 220;

function Piece({ i, t, width, height }: { i: number; t: SharedValue<number>; width: number; height: number }) {
  const seed = useMemo(() => ({
    x: (i / N) * width + ((i * 97) % 40) - 20, drift: ((i * 53) % 120) - 60, lag: ((i * 31) % STAGGER) / (SPAN + STAGGER),
    w: 6 + (i % 3) * 3, h: 10 + (i % 4) * 3, spin: ((i * 71) % 720) - 360,
    colour: i % 3 === 0 ? theme.color.blue : i % 3 === 1 ? theme.color.ice : theme.color.cloud,
  }), [i, width]);
  const st = useAnimatedStyle(() => {
    // each piece starts a little later on the one clock; falling is gravity, so it accelerates (t²)
    const k = Math.max(0, Math.min(1, (t.value - seed.lag) / (1 - seed.lag)));
    return {
      transform: [
        { translateX: seed.x + seed.drift * k },
        { translateY: -40 + (height * 0.75) * k * k },
        { rotate: `${seed.spin * k}deg` },
      ],
      opacity: k < 0.8 ? 1 : 1 - (k - 0.8) / 0.2,
    };
  });
  return <Animated.View style={[{ position: 'absolute', width: seed.w, height: seed.h, borderRadius: 2, backgroundColor: seed.colour }, st]} />;
}

/** Release it: call in the same tick as the flash and the chime. */
export const burst = (t: SharedValue<number>) => { t.value = withTiming(1, { duration: SPAN + STAGGER, easing: Easing.linear }); };

export function Confetti({ t }: { t: SharedValue<number> }) {
  const { width, height } = useWindowDimensions();
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: N }, (_, i) => <Piece key={i} i={i} t={t} width={width} height={height} />)}
    </View>
  );
}
