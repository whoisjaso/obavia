/* One of the car objects (tools/scene-3d, DOCTRINE §5): the real thing a dealer and a buyer already know,
   rendered in the house material, placed touching the number or the verb it means (lego.md §4.1). Never a
   caption; to a screen reader it is silent unless `label` is given, because the word beside it already says it.
   It lands once when it appears: a fade in and the one landed swell (0.97 to 1.03 to 1 over 420 ms, the
   cloud-system's breath). Reduced motion: the fade only. `strength` is its ink: 1 for the lit thing, faint for
   the rest; a change of strength crossfades in 200 ms, which reduced motion keeps (opacity is not motion).
   With no render shipped (scripts/scene3d.mjs --none) it keeps its box and draws nothing, so no layout moves. */
import React, { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { BREATH, EASE_OUT, cloud, ms } from '../motion';
import { useReduceMotion } from './Sky';
import { SCENE_3D, type SceneName, type SceneTone } from './scene3d';

/** The faint ink: an object that is not the one lit thing on its page. */
export const FAINT = 0.38;

export function Object3D({ name, tone = 'light', width, height, strength = 1, appear = true, delay = 0, label, style }: {
  name: SceneName; tone?: SceneTone;
  /** the canvas width in pt; the height follows the render's canvas (or give `height` and the width follows) */
  width?: number; height?: number;
  strength?: number; appear?: boolean; delay?: number; label?: string; style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReduceMotion();
  const it = SCENE_3D[name];
  const ratio = it ? it.w / it.h : 1.6;
  const w = width ?? (height ? height * ratio : 64), h = height ?? w / ratio;
  const o = useSharedValue(appear ? 0 : strength), k = useSharedValue(appear && !reduce ? 0.97 : 1);
  useEffect(() => {
    if (!appear) return;
    const t = setTimeout(() => {
      o.value = withTiming(strength, { duration: ms.land, easing: EASE_OUT });
      if (!reduce) k.value = withSequence(withTiming(cloud.swell, { duration: ms.swell / 2, easing: BREATH }), withTiming(1, { duration: ms.swell / 2, easing: BREATH }));
    }, delay);
    return () => clearTimeout(t);
  }, []);
  // the lit thing moved: the ink follows, never the scale
  const first = React.useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } o.value = withTiming(strength, { duration: ms.land, easing: EASE_OUT }); }, [strength]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: k.value }] }));
  const src = it?.[tone];
  return (
    <View style={[{ width: w, height: h }, style]} pointerEvents="none"
      accessible={!!label} accessibilityRole={label ? 'image' : undefined} accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'} accessibilityElementsHidden={!label}>
      {src != null && (
        <Animated.View style={[{ width: w, height: h }, st]}>
          <Image source={src} style={{ width: w, height: h }} contentFit="contain" cachePolicy="memory" transition={0} />
        </Animated.View>
      )}
    </View>
  );
}
