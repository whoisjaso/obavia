/* The sky (cloud-system §1, §4, §8). Three layers behind every light surface of the phone (Won, the Car, Me,
   Paper, the Bid sheet): far, mid and near, each a static image drifting on its own sine timeline (far 120 s,
   mid 80 s, near 50 s; 6, 10 and 14 pt of travel) and following the sheet's drag at 0.2, 0.5 and 1.0 of it.
   The layers come from the Blender contract (assets/cloud-3d/sky, through scripts/cloud3d.mjs) when it has
   been rendered, and from the cloud-layers set otherwise. Transform only; nothing re-lays out. Reduced
   motion: no drift, no parallax; the sky is still there. The Lane stays photographic (LaneClouds). */
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { interpolate, useAnimatedStyle, useReducedMotion, type SharedValue } from 'react-native-reanimated';
import { Grain, cloudInk, useDrift } from './Cloud';
import { SKY_3D, type SkyLayer3D } from './cloud3d';
import { drift, parallax } from '../motion';

const LIGHT = {
  far: require('../../assets/clouds/light-far.png'),
  mid: require('../../assets/clouds/light-mid.png'),
  near: require('../../assets/clouds/light-near.png'),
};
const LIGHT_RATIO = 1200 / 700;

/** Reduced motion: Reanimated's reading of the system setting for the first frame, then the live value from
    AccessibilityInfo, so turning it on mid-session stops the drift without a relaunch. */
export function useReduceMotion() {
  const first = useReducedMotion();
  const [reduce, setReduce] = useState(first);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (live) setReduce(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', v => setReduce(v));
    return () => { live = false; sub?.remove?.(); };
  }, []);
  return reduce;
}

type Depth = 'far' | 'mid' | 'near';

/** One layer: a static image, translated by its drift clock and by its share of the drag. */
function Layer({ source, t, depth, opacity, box, fit = 'fill', drag, reduce, dir = 1, mirror }: {
  source: number; t: SharedValue<number>; depth: Depth; opacity: number; box: StyleProp<ViewStyle>;
  fit?: 'fill' | 'cover'; drag?: SharedValue<number>; reduce: boolean; dir?: 1 | -1; mirror?: boolean;
}) {
  const px = drift[depth].px, share = parallax[depth];
  const st = useAnimatedStyle(() => {
    // the content moves 1.0 with the drag; this layer should move `share` of it, so it gives back the rest
    const d = reduce || !drag ? 0 : drag.value;
    const p = interpolate(-(1 - share) * d, [-parallax.clamp, parallax.clamp], [-parallax.clamp, parallax.clamp], 'clamp');
    return { transform: [{ translateX: dir * (t.value - 0.5) * px }, { translateY: (0.5 - t.value) * px * 0.2 + p }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute' }, box, st]}>
      <Image source={source} style={{ width: '100%', height: '100%', opacity, transform: mirror ? [{ scaleX: -1 }] : undefined }} contentFit={fit} cachePolicy="memory" />
    </Animated.View>
  );
}

/** The sky behind a surface: body, the three layers at their depths, grain, the feathered top light. Absolute,
    behind everything, never touched. `low`: a short sheet (the Bid sheet, the scan's facts) keeps only the
    near bank along its bottom, so no cloud ever sits behind the money. `drag`: the sheet's offset from rest in
    pt (down positive), for the parallax. */
export function Sky({ radius = 0, layers = true, low = false, drag }: { radius?: number; layers?: boolean; low?: boolean; drag?: SharedValue<number> }) {
  const reduce = useReduceMotion();
  const far = useDrift(drift.far.period), mid = useDrift(drift.mid.period), near = useDrift(drift.near.period);
  const three = SKY_3D.light;
  const O = parallax.clamp + 8;   // overscan: the parallax and the drift never show an edge
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderTopLeftRadius: radius, borderTopRightRadius: radius, overflow: 'hidden' }]}>
      <LinearGradient colors={cloudInk.body} style={StyleSheet.absoluteFill} />
      {layers && three && (
        // the rendered sky: 2:1 tileable layers. Full surfaces cover the box; a short sheet keeps the near
        // bank at the full width along its bottom.
        <>
          {!low && <Layer source={three.far.src} t={far} depth="far" opacity={1} fit="cover" box={{ left: -O, right: -O, top: -O, bottom: -O }} drag={drag} reduce={reduce} />}
          {!low && <Layer source={three.mid.src} t={mid} depth="mid" opacity={1} fit="cover" box={{ left: -O, right: -O, top: -O, bottom: -O }} drag={drag} reduce={reduce} dir={-1} />}
          <Layer source={three.near.src} t={near} depth="near" opacity={1} fit={low ? 'fill' : 'cover'}
            box={low ? { left: -O, right: -O, bottom: -O, aspectRatio: ratio(three.near) } : { left: -O, right: -O, top: -O, bottom: -O }} drag={drag} reduce={reduce} />
        </>
      )}
      {layers && !three && (
        // the cloud-layers set: far rides high, mid crosses the lower middle, near banks along the bottom
        <>
          {!low && <Layer source={LIGHT.far} t={far} depth="far" opacity={0.38} box={{ left: -O, right: -O, top: -12, aspectRatio: LIGHT_RATIO }} drag={drag} reduce={reduce} />}
          {!low && <Layer source={LIGHT.mid} t={mid} depth="mid" opacity={0.26} box={{ left: -O, right: -O, top: '46%', aspectRatio: LIGHT_RATIO }} drag={drag} reduce={reduce} dir={-1} mirror />}
          <Layer source={LIGHT.near} t={near} depth="near" opacity={low ? 0.5 : 0.6} box={{ left: -O, right: -O, bottom: low ? -40 : -6, aspectRatio: LIGHT_RATIO }} drag={drag} reduce={reduce} />
        </>
      )}
      <Grain />
      <LinearGradient colors={[cloudInk.top, cloudInk.topClear]} style={s.topLight} />
    </View>
  );
}

const ratio = (l: SkyLayer3D) => l.w / l.h;

const s = StyleSheet.create({
  topLight: { position: 'absolute', left: 0, right: 0, top: 0, height: 18 },
});
