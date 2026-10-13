/* The hammer moment (DOCTRINE §5: "the hammer moment (Sold, Won)"; cloud-system §2, landed: "a single soft swell
   and settle in the same frame as the sound and the haptic"). The gavel falls into the house cumulus and the cloud
   puffs, rendered in Cycles (tools/scene-3d, assets/scene-3d/hammer) and shipped as a 24-frame sheet through
   scripts/scene3d.mjs, light on the sky. Played the way the cloud button plays its sheet: one image clipped to a
   cell-sized window and moved to the frame's rect by a shared value on the UI thread, one transform per frame, no
   JS, no decode. Frames 0 to 5 the fall (100 ms), 6 the strike, 6 to 23 the puff opening and freezing (300 ms); 23
   is the still and holds. The strike is the frame's own callback: the chime and the haptic fire when the head
   meets the cloud, not on a timer beside it, so the three channels land in one frame. Reduced motion: nothing,
   then the still on the strike, with the sound and the haptic (cloud-system §4: reduced motion is about motion,
   not silence). Silent to a screen reader: the chime and the haptic say it. No render shipped: the box keeps its
   size and the strike still fires. */
import React, { useMemo } from 'react';
import { PixelRatio, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { HIDDEN, UNDER, clock, frameOf, offsets, sheetFor } from './hammer';
import { MOMENT_3D } from './scene3d';

/** The light set, the one Won draws on the sky; null when no render ships. */
export const HAMMER = MOMENT_3D.hammer?.light ?? null;

/** Where the cloud's shade ends in the cell (the content sits in the middle 74 percent): what is placed under the
    hammer starts here, touching the shade, not the cell's transparent foot. */
export const HAMMER_FOOT = 0.86;

/** The frame clock's rest value: a hammer that has not begun shows its first frame (raised); reduced motion and
    the absence of a render show nothing until the strike. */
export const startFrame = (reduce: boolean) => (HAMMER && !reduce ? 0 : HIDDEN);

/** Begin the fall: the frames to the contact, `strike` on that frame, then the puff to the still. Reduced motion
    or no render: the still (or nothing) and the strike at once. */
export function fall(f: SharedValue<number>, reduce: boolean, strike: () => void) {
  if (!HAMMER || reduce) { f.value = HAMMER ? HAMMER.rest : HIDDEN; strike(); return; }
  const c = clock(HAMMER);
  f.value = 0;
  f.value = withSequence(
    withTiming(HAMMER.contact, { duration: c.contactMs, easing: Easing.linear, reduceMotion: ReduceMotion.Never }, done => { if (done) scheduleOnRN(strike); }),
    withTiming(HAMMER.rest + UNDER, { duration: c.puffMs, easing: Easing.linear, reduceMotion: ReduceMotion.Never }),
  );
}

export function Hammer({ f, height, onReady, style }: {
  f: SharedValue<number>;
  /** the cell's height in points; the cell is square */
  height: number;
  /** the sheet is on the glass (or failed): the fall may begin */
  onReady?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const pr = PixelRatio.get();
  const sh = HAMMER ? sheetFor(HAMMER, pr) : null;
  const geo = useMemo(() => (sh ? offsets(sh, height, pr) : null), [sh, height, pr]);
  const rest = HAMMER?.rest ?? 0;
  const xs = geo?.xs ?? [0], ys = geo?.ys ?? [0];
  const st = useAnimatedStyle(() => {
    const i = frameOf(f.value, rest);
    if (i < 0) return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }] };
    return { opacity: 1, transform: [{ translateX: xs[Math.min(i, xs.length - 1)] }, { translateY: ys[Math.min(i, ys.length - 1)] }] };
  });
  return (
    <View style={[{ width: height, height, overflow: 'hidden' }, style]} pointerEvents="none"
      aria-hidden importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {sh && geo && (
        <Animated.View testID="hammer-sheet" style={[{ width: geo.sheetW, height: geo.sheetH }, st]}>
          <Image source={sh.src} style={StyleSheet.absoluteFill} contentFit="fill" cachePolicy="memory" transition={0} onLoad={onReady} onError={onReady} />
        </Animated.View>
      )}
    </View>
  );
}
